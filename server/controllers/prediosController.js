const { query } = require('../config/database');
const { validationResult } = require('express-validator');

// Controlador de gestión catastral para el sistema GPCONES
class PrediosController {
  
  // Historia 3: Registro de predios
  // Como técnico catastral, quiero registrar un nuevo predio, para que se mantenga
  // actualizado el inventario catastral conforme a IGAC.
  async createPredio(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos inválidos',
          details: errors.array() 
        });
      }

      const {
        npn,                    // Número de Predio Nacional (único según documento)
        municipio,              // Municipio del predio
        zona,                   // Zona del predio
        sector,                 // Sector del predio
        numero_ficha,           // Número de ficha
        area_hectareas,         // Área en hectáreas
        tipo_predio,            // Tipo de predio (URBANO, RURAL, MIXTO)
        uso_predio,             // Uso del predio (RESIDENCIAL, COMERCIAL, etc.)
        propietario_nombre,     // Nombre del propietario
        propietario_documento,  // Documento del propietario
        propietario_tipo_documento, // Tipo de documento
        geometry                // Geometría del predio (PostGIS)
      } = req.body;

      // Validar que el NPN sea único según especificaciones IGAC
      const existingPredio = await query(
        'SELECT id, npn FROM predios WHERE npn = $1',
        [npn]
      );

      if (existingPredio.rows.length > 0) {
        return res.status(400).json({ 
          error: 'NPN duplicado',
          message: 'El Número de Predio Nacional (NPN) ya existe en el sistema',
          existing_npn: npn
        });
      }

      // Validar formato del NPN (puede agregarse validación específica según IGAC)
      if (!npn || npn.trim().length === 0) {
        return res.status(400).json({ 
          error: 'NPN requerido',
          message: 'El Número de Predio Nacional (NPN) es obligatorio'
        });
      }

      // Validar que el municipio sea obligatorio
      if (!municipio || municipio.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Municipio requerido',
          message: 'El municipio del predio es obligatorio'
        });
      }

      // Insertar el nuevo predio
      const result = await query(
        `INSERT INTO predios (
          npn, municipio, zona, sector, numero_ficha, area_hectareas, 
          tipo_predio, uso_predio, propietario_nombre, propietario_documento, 
          propietario_tipo_documento, geometry, created_by, estado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ST_GeomFromGeoJSON($12), $13, $14)
        RETURNING id, npn, municipio, estado, created_at`,
        [
          npn, municipio, zona, sector, numero_ficha, area_hectareas,
          tipo_predio, uso_predio, propietario_nombre, propietario_documento,
          propietario_tipo_documento, JSON.stringify(geometry), req.user.id, 'Borrador'
        ]
      );

      const newPredio = result.rows[0];

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical, new_state) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          req.user.id, 
          'CREACION_PREDIO', 
          'GESTION_CATASTRAL', 
          `Nuevo predio creado: NPN ${npn} en ${municipio}`,
          false,
          JSON.stringify(newPredio)
        ]
      );

      res.status(201).json({
        message: 'Predio registrado exitosamente',
        success: true,
        predio: newPredio,
        estado: 'El predio ha sido creado en estado "Borrador" y requiere revisión'
      });

    } catch (error) {
      console.error('Error en createPredio:', error);
      
      // Manejo específico de errores de geometría PostGIS
      if (error.message.includes('geometry')) {
        return res.status(400).json({ 
          error: 'Geometría inválida',
          message: 'La geometría del predio no es válida. Verifique el formato GeoJSON.',
          details: 'El sistema espera un objeto GeoJSON válido con coordenadas en EPSG:4326'
        });
      }

      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: 'No se pudo registrar el predio'
      });
    }
  }

  // Obtener predio por ID
  async getPredioById(req, res) {
    try {
      const { id } = req.params;

      const result = await query(
        `SELECT 
          p.*,
          u.username as created_by_username,
          u.full_name as created_by_name,
          u2.username as updated_by_username,
          u2.full_name as updated_by_name,
          ST_AsGeoJSON(p.geometry) as geometry_geojson
        FROM predios p
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN users u2 ON p.updated_by = u2.id
        WHERE p.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Predio no encontrado',
          message: 'El predio especificado no existe'
        });
      }

      const predio = result.rows[0];
      
      // Convertir geometría a GeoJSON
      if (predio.geometry_geojson) {
        predio.geometry = JSON.parse(predio.geometry_geojson);
        delete predio.geometry_geojson;
      }

      res.json({
        success: true,
        data: predio
      });

    } catch (error) {
      console.error('Error en getPredioById:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo obtener el predio'
      });
    }
  }

  // Actualizar predio
  async updatePredio(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos inválidos',
          details: errors.array() 
        });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Verificar que el predio existe
      const existingPredio = await query(
        'SELECT * FROM predios WHERE id = $1',
        [id]
      );

      if (existingPredio.rows.length === 0) {
        return res.status(404).json({
          error: 'Predio no encontrado',
          message: 'El predio especificado no existe'
        });
      }

      const oldPredio = existingPredio.rows[0];

      // Verificar NPN único si se está cambiando
      if (updateData.npn && updateData.npn !== oldPredio.npn) {
        const existingNPN = await query(
          'SELECT id FROM predios WHERE npn = $1 AND id != $2',
          [updateData.npn, id]
        );

        if (existingNPN.rows.length > 0) {
          return res.status(400).json({
            error: 'NPN duplicado',
            message: 'El Número de Predio Nacional (NPN) ya existe en el sistema'
          });
        }
      }

      // Construir query de actualización dinámico
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      const allowedFields = [
        'npn', 'municipio', 'zona', 'sector', 'numero_ficha',
        'area_hectareas', 'tipo_predio', 'uso_predio',
        'propietario_nombre', 'propietario_documento', 'propietario_tipo_documento',
        'observaciones', 'estado'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(updateData[field]);
          paramIndex++;
        }
      });

      // Manejar geometría si está presente
      if (updateData.geometry) {
        updateFields.push(`geometry = ST_GeomFromGeoJSON($${paramIndex})`);
        updateValues.push(JSON.stringify(updateData.geometry));
        paramIndex++;
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateFields.push(`updated_by = $${paramIndex}`);
      updateValues.push(req.user.id);
      paramIndex++;

      updateValues.push(id);

      const result = await query(
        `UPDATE predios SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        updateValues
      );

      const updatedPredio = result.rows[0];

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical, previous_state, new_state) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          req.user.id,
          'ACTUALIZACION_PREDIO',
          'GESTION_CATASTRAL',
          `Predio actualizado: NPN ${updatedPredio.npn}`,
          false,
          JSON.stringify(oldPredio),
          JSON.stringify(updatedPredio)
        ]
      );

      res.json({
        success: true,
        message: 'Predio actualizado exitosamente',
        data: updatedPredio
      });

    } catch (error) {
      console.error('Error en updatePredio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo actualizar el predio'
      });
    }
  }

  // Cambiar estado del predio
  async changePredioStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos inválidos',
          details: errors.array() 
        });
      }

      const { id } = req.params;
      const { estado, observaciones } = req.body;

      // Verificar que el predio existe
      const existingPredio = await query(
        'SELECT * FROM predios WHERE id = $1',
        [id]
      );

      if (existingPredio.rows.length === 0) {
        return res.status(404).json({
          error: 'Predio no encontrado',
          message: 'El predio especificado no existe'
        });
      }

      const oldPredio = existingPredio.rows[0];

      // Actualizar estado
      const result = await query(
        'UPDATE predios SET estado = $1, observaciones = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3 WHERE id = $4 RETURNING *',
        [estado, observaciones, req.user.id, id]
      );

      const updatedPredio = result.rows[0];

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical, previous_state, new_state) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          req.user.id,
          'CAMBIO_ESTADO_PREDIO',
          'GESTION_CATASTRAL',
          `Estado cambiado de "${oldPredio.estado}" a "${estado}" para NPN ${updatedPredio.npn}`,
          true,
          JSON.stringify({ estado: oldPredio.estado }),
          JSON.stringify({ estado: estado, observaciones: observaciones })
        ]
      );

      res.json({
        success: true,
        message: 'Estado del predio actualizado exitosamente',
        data: updatedPredio
      });

    } catch (error) {
      console.error('Error en changePredioStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo cambiar el estado del predio'
      });
    }
  }

  // Obtener estadísticas de predios
  async getPrediosStats(req, res) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN estado = 'Borrador' THEN 1 END) as borrador,
          COUNT(CASE WHEN estado = 'En Revisión' THEN 1 END) as en_revision,
          COUNT(CASE WHEN estado = 'Aprobado' THEN 1 END) as aprobado,
          COUNT(CASE WHEN estado = 'Rechazado' THEN 1 END) as rechazado,
          COUNT(CASE WHEN tipo_predio = 'URBANO' THEN 1 END) as urbano,
          COUNT(CASE WHEN tipo_predio = 'RURAL' THEN 1 END) as rural,
          COUNT(CASE WHEN tipo_predio = 'MIXTO' THEN 1 END) as mixto,
          SUM(area_hectareas) as area_total,
          AVG(area_hectareas) as area_promedio,
          municipio,
          COUNT(*) as count_by_municipio
        FROM predios
        GROUP BY municipio
        ORDER BY count_by_municipio DESC
      `;

      const result = await query(statsQuery);
      
      // Estadísticas generales
      const generalStats = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN estado = 'Borrador' THEN 1 END) as borrador,
          COUNT(CASE WHEN estado = 'En Revisión' THEN 1 END) as en_revision,
          COUNT(CASE WHEN estado = 'Aprobado' THEN 1 END) as aprobado,
          COUNT(CASE WHEN estado = 'Rechazado' THEN 1 END) as rechazado,
          COUNT(CASE WHEN tipo_predio = 'URBANO' THEN 1 END) as urbano,
          COUNT(CASE WHEN tipo_predio = 'RURAL' THEN 1 END) as rural,
          COUNT(CASE WHEN tipo_predio = 'MIXTO' THEN 1 END) as mixto,
          COALESCE(SUM(area_hectareas), 0) as area_total,
          COALESCE(AVG(area_hectareas), 0) as area_promedio
        FROM predios
      `);

      const stats = {
        general: generalStats.rows[0],
        byMunicipio: result.rows
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error en getPrediosStats:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudieron obtener las estadísticas'
      });
    }
  }

  // Historia 4: Consulta de predios
  // Como usuario, quiero buscar predios por filtros (NPN, municipio, Numero de ficha etc.), 
  // para que pueda consultar su información fácilmente.
  // Consultar predios desde un schema específico (XTF/ILI)
  async getPrediosFromSchema(req, res, schemaName) {
    try {
      const { query } = require('../config/database');
      
      const {
        npn,
        municipio,
        zona,
        sector,
        numero_ficha,
        page = 1,
        limit = 50,
        sort_by = 't_id',
        sort_order = 'DESC'
      } = req.query;

      // Verificar que el schema existe
      const schemaCheck = await query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = $1
      `, [schemaName]);

      if (schemaCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Schema ${schemaName} no encontrado`
        });
      }

      // Buscar tabla de predios en el schema (priorizar lc_predio, luego LC_Predio, luego otras)
      const tablesResult = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 
          AND table_type = 'BASE TABLE'
          AND (
            table_name = 'lc_predio' 
            OR table_name = 'LC_Predio'
            OR table_name ILIKE '%predio%'
          )
        ORDER BY 
          CASE 
            WHEN table_name = 'lc_predio' THEN 1
            WHEN table_name = 'LC_Predio' THEN 2
            ELSE 3
          END,
          table_name
        LIMIT 1
      `, [schemaName]);

      if (tablesResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `No se encontró tabla de predios en el schema ${schemaName}`,
          message: `El schema ${schemaName} existe pero no contiene una tabla de predios. Buscando tablas que contengan 'predio' en el nombre.`
        });
      }

      const tableName = tablesResult.rows[0].table_name;
      const fullTableName = `"${schemaName}"."${tableName}"`;
      
      console.log(`Tabla encontrada: ${fullTableName}`);
      console.log(`Nombre de tabla: ${tableName}`);

      // Obtener columnas de la tabla con sus tipos de dato
      const columnsResult = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [schemaName, tableName]);

      const columns = columnsResult.rows.map(c => c.column_name);
      // Crear un mapa de tipos de dato para cada columna
      const columnTypes = {};
      columnsResult.rows.forEach(row => {
        columnTypes[row.column_name] = row.data_type;
      });
      
      console.log(`\n📋 Columnas encontradas en ${fullTableName} (${columns.length}):`, columns.join(', '));
      console.log(`📊 Tipos de dato:`, Object.entries(columnTypes).slice(0, 10).map(([name, type]) => `${name}:${type}`).join(', '));
      
      // Construir WHERE clause con filtros
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // Mapear campos comunes de LADM-COL
      const fieldMapping = {
        npn: ['numero_predial', 'numero_predial_nacional', 'npn', 't_id', 'matricula_inmobiliaria', 'codigo_homologado'],
        municipio: ['municipio', 'nombre_municipio'],
        zona: ['zona', 'codigo_zona'],
        sector: ['sector', 'codigo_sector'],
        numero_ficha: ['numero_ficha', 'ficha', 'n_ficha'],
        numero_predial: ['numero_predial', 'numero_predial_nacional', 'matricula_inmobiliaria', 'codigo_homologado'], // Filtro específico para número predial
        n_ficha: ['n_ficha', 'numero_ficha', 'ficha'], // Filtro específico para número de ficha
        search: ['numero_predial', 'numero_predial_nacional', 'npn', 'matricula_inmobiliaria', 'n_ficha', 'numero_ficha', 'ficha', 'codigo_homologado', 'nombre'] // Búsqueda general
      };
      
      // Mapeo de columnas LADM-COL a nombres más amigables para el frontend
      const columnMapping = {
        't_id': 't_id',
        't_ili_tid': 't_ili_tid',
        'departamento': 'departamento',
        'municipio': 'municipio',
        'id_operacion': 'id_operacion',
        'codigo_orip': 'codigo_orip',
        'matricula_inmobiliaria': 'matricula_inmobiliaria',
        'numero_predial': 'numero_predial',
        'codigo_homologado': 'codigo_homologado',
        'avaluo_catastral': 'avaluo_catastral',
        'tipo': 'tipo',
        'condicion_predio': 'condicion_predio',
        'destinacion_economica': 'destinacion_economica',
        'n_ficha': 'n_ficha',
        'nombre': 'nombre',
        'comienzo_vida_util_version': 'comienzo_vida_util_version',
        'fin_vida_util_version': 'fin_vida_util_version',
        'espacio_de_nombres': 'espacio_de_nombres',
        'local_id': 'local_id'
      };

      console.log(`\n🔍 Procesando filtros para schema: ${schemaName}`);
      console.log(`📋 Query params recibidos:`, req.query);
      console.log(`📋 Columnas disponibles en la tabla (${columns.length}):`, columns);
      
      Object.keys(fieldMapping).forEach(filterKey => {
        const value = req.query[filterKey];
        if (value && value.toString().trim() !== '') {
          console.log(`\n🔎 Procesando filtro: ${filterKey} = "${value}"`);
          // Buscar columnas que coincidan (case-insensitive)
          const possibleFields = fieldMapping[filterKey].filter(f => {
            const found = columns.find(col => col.toLowerCase() === f.toLowerCase());
            return found !== undefined;
          }).map(f => {
            // Retornar el nombre exacto de la columna en la tabla
            return columns.find(col => col.toLowerCase() === f.toLowerCase()) || f;
          });
          console.log(`   Campos posibles: ${fieldMapping[filterKey].join(', ')}`);
          console.log(`   Campos encontrados en tabla: ${possibleFields.join(', ') || 'NINGUNO'}`);
          
          if (possibleFields.length > 0) {
            // Usar el nombre de columna tal como está en la tabla (puede tener mayúsculas)
            const conditions = possibleFields.map(field => {
              // Siempre usar comillas dobles para nombres de columnas en PostgreSQL
              const quotedField = `"${field}"`;
              const fieldType = columnTypes[field];
              
              console.log(`   🔍 Campo: ${field}, Tipo: ${fieldType || 'NO ENCONTRADO'}`);
              
              // Si la columna es numérica, convertir a texto antes de usar ILIKE
              if (fieldType && ['integer', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision'].includes(fieldType)) {
                const condition = `CAST(${quotedField} AS TEXT) ILIKE $${paramIndex}`;
                console.log(`   ✅ Columna numérica convertida: ${condition}`);
                return condition;
              } else {
                // Para columnas de texto, usar ILIKE directamente
                const condition = `${quotedField} ILIKE $${paramIndex}`;
                console.log(`   ✅ Columna de texto: ${condition}`);
                return condition;
              }
            });
            whereConditions.push(`(${conditions.join(' OR ')})`);
            queryParams.push(`%${value}%`);
            console.log(`   ✅ Filtro agregado: (${conditions.join(' OR ')})`);
            paramIndex++;
          } else {
            // Si no se encontraron campos, log para debugging
            console.log(`   ⚠️ No se encontraron columnas para el filtro: ${filterKey}`);
            console.log(`      Columnas disponibles: ${columns.join(', ')}`);
            console.log(`      Campos buscados: ${fieldMapping[filterKey].join(', ')}`);
          }
        }
      });
      
      // Log de filtros aplicados
      if (whereConditions.length > 0) {
        console.log(`\n✅ Filtros aplicados (${whereConditions.length}):`, whereConditions);
        console.log(`   Parámetros:`, queryParams);
      } else {
        console.log(`\n⚠️ No se aplicaron filtros`);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Contar total
      let countResult;
      try {
        console.log(`\n📊 Contando registros en: ${fullTableName}`);
        console.log(`WHERE clause: ${whereClause || 'NINGUNO'}`);
        console.log(`Count params (${queryParams.length}):`, queryParams);
        
        const countQuery = `
          SELECT COUNT(*) as total 
          FROM ${fullTableName}
          ${whereClause}
        `;
        
        console.log(`\n📝 Count SQL completo:`);
        console.log(countQuery);
        console.log(`\n📦 Parámetros para COUNT:`, queryParams);
        
        countResult = await query(countQuery, queryParams);
        const totalCount = parseInt(countResult.rows[0].total);
        console.log(`✅ Total de registros: ${totalCount}`);
      } catch (countError) {
        console.error('\n❌ Error contando registros:', countError);
        console.error('Error message:', countError.message);
        console.error('Error code:', countError.code);
        console.error('Error detail:', countError.detail);
        console.error('Error hint:', countError.hint);
        console.error('Error position:', countError.position);
        console.error('Tabla:', fullTableName);
        console.error('WHERE clause:', whereClause);
        console.error('Query params:', queryParams);
        console.error('Error stack:', countError.stack);
        return res.status(500).json({
          success: false,
          error: 'Error contando registros',
          message: countError.message || 'Error desconocido al contar registros',
          details: {
            table: fullTableName,
            whereClause: whereClause,
            error: countError.message,
            code: countError.code,
            detail: countError.detail,
            hint: countError.hint
          }
        });
      }
      
      const total = parseInt(countResult.rows[0].total);

      // Obtener datos paginados
      const offset = (page - 1) * limit;
      // Buscar una columna segura para ordenar
      let safeSortBy = 't_id';
      if (columns.includes(sort_by)) {
        safeSortBy = sort_by;
      } else if (columns.includes('t_id')) {
        safeSortBy = 't_id';
      } else if (columns.length > 0) {
        safeSortBy = columns[0];
      }
      
      const safeSortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      let dataResult;
      try {
        // Usar el nombre de columna con comillas para evitar problemas con nombres reservados
        const sortColumn = `"${safeSortBy}"`;
        
        console.log(`\n🔍 Consultando tabla: ${fullTableName}`);
        console.log(`📋 Ordenando por: ${sortColumn} ${safeSortOrder}`);
        console.log(`🔎 WHERE clause: ${whereClause || 'NINGUNO'}`);
        console.log(`📦 Parámetros WHERE (${queryParams.length}):`, queryParams);
        console.log(`📄 Paginación: LIMIT ${limit} OFFSET ${offset}`);
        console.log(`🔢 paramIndex actual: ${paramIndex}`);
        
        // Construir la consulta SQL
        // IMPORTANTE: Usar parámetros preparados para LIMIT y OFFSET también
        const finalParams = [...queryParams];
        const limitParamIndex = paramIndex;
        const offsetParamIndex = paramIndex + 1;
        finalParams.push(parseInt(limit), parseInt(offset));
        
        const sqlQuery = `
          SELECT * 
          FROM ${fullTableName}
          ${whereClause}
          ORDER BY ${sortColumn} ${safeSortOrder}
          LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `;
        
        console.log(`\n📝 SQL Query completo:`);
        console.log(sqlQuery);
        console.log(`\n📊 Query params (${finalParams.length}):`, finalParams);
        console.log(`   - Parámetros WHERE: [${queryParams.join(', ')}]`);
        console.log(`   - LIMIT ($${limitParamIndex}): ${limit}`);
        console.log(`   - OFFSET ($${offsetParamIndex}): ${offset}`);
        
        dataResult = await query(sqlQuery, finalParams);
        
        console.log(`\n✅ Registros obtenidos: ${dataResult.rows.length}`);
        if (dataResult.rows.length > 0) {
          console.log(`   Primer registro:`, Object.keys(dataResult.rows[0]).slice(0, 5).join(', '));
        }
      } catch (dataError) {
        console.error('\n❌ Error obteniendo datos:', dataError);
        console.error('Error message:', dataError.message);
        console.error('Error code:', dataError.code);
        console.error('Error stack:', dataError.stack);
        console.error('Query intentada:', `SELECT * FROM ${fullTableName} ${whereClause} ORDER BY "${safeSortBy}" ${safeSortOrder}`);
        console.error('Columnas disponibles:', columns);
        return res.status(500).json({
          success: false,
          error: 'Error obteniendo datos de la tabla',
          message: dataError.message,
          details: `Tabla: ${fullTableName}, Columna orden: ${safeSortBy}, Columnas disponibles: ${columns.join(', ')}`
        });
      }

      // Mapear los datos para incluir todas las columnas de lc_predio
      // El SELECT * ya trae todas las columnas, solo necesitamos asegurar compatibilidad
      const mappedPredios = dataResult.rows.map(row => {
        const mapped = { ...row };
        
        // Mapear campos adicionales para compatibilidad con el frontend
        if (row.numero_predial && !mapped.npn) {
          mapped.npn = row.numero_predial;
        }
        if (row.n_ficha && !mapped.numero_ficha) {
          mapped.numero_ficha = row.n_ficha;
        }
        if (row.tipo && !mapped.tipo_predio) {
          mapped.tipo_predio = row.tipo;
        }
        if (row.destinacion_economica && !mapped.uso_predio) {
          mapped.uso_predio = row.destinacion_economica;
        }
        if (row.condicion_predio && !mapped.estado) {
          mapped.estado = row.condicion_predio;
        }
        
        return mapped;
      });

      // Obtener todas las columnas únicas de todos los registros
      const allColumnNames = new Set();
      if (dataResult.rows.length > 0) {
        dataResult.rows.forEach(row => {
          Object.keys(row).forEach(key => allColumnNames.add(key));
        });
      }
      // También agregar las columnas de la tabla
      columns.forEach(col => allColumnNames.add(col));
      
      const allColumns = Array.from(allColumnNames).sort();
      
      console.log(`\n📋 Columnas disponibles en los datos (${allColumns.length}):`, allColumns.join(', '));
      console.log(`📋 Columnas de la tabla (${columns.length}):`, columns.join(', '));

      res.json({
        success: true,
        data: {
          predios: mappedPredios,
          schema_name: schemaName,
          table_name: tableName,
          columns: columns, // Columnas de la tabla desde information_schema
          available_columns: allColumns, // TODAS las columnas encontradas en los datos
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Error en getPrediosFromSchema:', error);
      console.error('Stack:', error.stack);
      console.error('Schema:', schemaName);
      console.error('Query params:', req.query);
      console.error('Error completo:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Enviar mensaje de error más descriptivo
      const errorMessage = error.message || 'Error desconocido';
      const errorDetails = {
        schema: schemaName,
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      };
      
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: `Error al consultar predios del schema ${schemaName}: ${errorMessage}`,
        details: errorDetails
      });
    }
  }

  async getPredios(req, res) {
    try {
      const { schema_name } = req.query;
      
      // Si se especifica un schema, consultar desde ese schema
      if (schema_name) {
        // Llamar directamente al método usando this (el contexto se preserva)
        return await this.getPrediosFromSchema(req, res, schema_name);
      }
      const {
        npn,           // Filtro por NPN
        municipio,     // Filtro por municipio
        zona,          // Filtro por zona
        sector,        // Filtro por sector
        numero_ficha,  // Filtro por número de ficha
        estado,        // Filtro por estado del predio
        tipo_predio,   // Filtro por tipo de predio
        uso_predio,    // Filtro por uso del predio
        page = 1,      // Paginación
        limit = 20,    // Límite de resultados por página
        sort_by = 'created_at', // Campo para ordenar
        sort_order = 'DESC'     // Orden ascendente o descendente
      } = req.query;

      // Construir query dinámico con filtros
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // Agregar filtros si están presentes
      if (npn) {
        whereConditions.push(`npn ILIKE $${paramIndex}`);
        queryParams.push(`%${npn}%`);
        paramIndex++;
      }

      if (municipio) {
        whereConditions.push(`municipio ILIKE $${paramIndex}`);
        queryParams.push(`%${municipio}%`);
        paramIndex++;
      }

      if (zona) {
        whereConditions.push(`zona ILIKE $${paramIndex}`);
        queryParams.push(`%${zona}%`);
        paramIndex++;
      }

      if (sector) {
        whereConditions.push(`sector ILIKE $${paramIndex}`);
        queryParams.push(`%${sector}%`);
        paramIndex++;
      }

      if (numero_ficha) {
        whereConditions.push(`numero_ficha ILIKE $${paramIndex}`);
        queryParams.push(`%${numero_ficha}%`);
        paramIndex++;
      }

      if (estado) {
        whereConditions.push(`estado = $${paramIndex}`);
        queryParams.push(estado);
        paramIndex++;
      }

      if (tipo_predio) {
        whereConditions.push(`tipo_predio = $${paramIndex}`);
        queryParams.push(tipo_predio);
        paramIndex++;
      }

      if (uso_predio) {
        whereConditions.push(`uso_predio = $${paramIndex}`);
        queryParams.push(uso_predio);
        paramIndex++;
      }

      // Construir WHERE clause
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Validar campos de ordenamiento
      const allowedSortFields = ['npn', 'municipio', 'created_at', 'estado', 'area_hectareas'];
      const allowedSortOrders = ['ASC', 'DESC'];
      
      if (!allowedSortFields.includes(sort_by)) {
        sort_by = 'created_at';
      }
      
      if (!allowedSortOrders.includes(sort_order.toUpperCase())) {
        sort_order = 'DESC';
      }

      // Query para contar total de registros
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM predios 
        ${whereClause}
      `;

      const countResult = await query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Calcular paginación
      const offset = (page - 1) * limit;

      // Query principal con paginación
      const mainQuery = `
        SELECT 
          p.*,
          u.username as created_by_username,
          u.full_name as created_by_name,
          u2.username as updated_by_username,
          u2.full_name as updated_by_name,
          ST_AsGeoJSON(p.geometry) as geometry_geojson
        FROM predios p
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN users u2 ON p.updated_by = u2.id
        ${whereClause}
        ORDER BY p.${sort_by} ${sort_order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await query(mainQuery, queryParams);
      const predios = result.rows.map(predio => {
        // Convertir geometría a GeoJSON si existe
        if (predio.geometry_geojson) {
          predio.geometry = JSON.parse(predio.geometry_geojson);
          delete predio.geometry_geojson;
        }
        return predio;
      });

      res.json({
        success: true,
        data: {
          predios,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          filters: {
            npn,
            municipio,
            zona,
            sector,
            numero_ficha,
            estado,
            tipo_predio,
            uso_predio
          }
        }
      });

    } catch (error) {
      console.error('Error en getPredios:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudieron obtener los predios'
      });
    }
  }
}

module.exports = new PrediosController();
