const { query } = require('../config/database');

class MunicipiosController {
  // Obtener todos los municipios
  async getMunicipios(req, res) {
    try {
      console.log('\n🔍 getMunicipios - Query params:', req.query);
      
      const { departamento, search, activo = 'true' } = req.query;
      
      // Convertir activo a booleano correctamente
      const activoBool = activo === 'true' || activo === true || activo === undefined;
      
      let whereConditions = ['m.activo = $1'];
      let queryParams = [activoBool];
      let paramIndex = 2;

      if (departamento) {
        whereConditions.push(`m.departamento ILIKE $${paramIndex}`);
        queryParams.push(`%${departamento}%`);
        paramIndex++;
      }

      if (search) {
        whereConditions.push(`(m.nombre ILIKE $${paramIndex} OR m.codigo_dane ILIKE $${paramIndex})`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      const sqlQuery = `
        SELECT 
          m.*,
          COUNT(ms.id) as total_schemas,
          MAX(ms.schema_name) as schema_name
        FROM municipios m
        LEFT JOIN municipio_schemas ms ON m.id = ms.municipio_id AND ms.activo = true
        ${whereClause}
        GROUP BY m.id
        ORDER BY m.departamento, m.nombre
      `;

      console.log('📝 SQL Query:', sqlQuery);
      console.log('📦 Query params:', queryParams);

      const result = await query(sqlQuery, queryParams);

      console.log(`✅ Municipios encontrados: ${result.rows.length}`);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('\n❌ Error obteniendo municipios:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error detail:', error.detail);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          detail: error.detail,
          hint: error.hint
        } : undefined
      });
    }
  }

  // Obtener un municipio por ID
  async getMunicipioById(req, res) {
    try {
      const { id } = req.params;

      const result = await query(`
        SELECT 
          m.*,
          json_agg(
            json_build_object(
              'id', ms.id,
              'schema_name', ms.schema_name,
              'descripcion', ms.descripcion,
              'activo', ms.activo,
              'created_at', ms.created_at
            ) ORDER BY ms.created_at DESC
          ) FILTER (WHERE ms.id IS NOT NULL) as schemas
        FROM municipios m
        LEFT JOIN municipio_schemas ms ON m.id = ms.municipio_id
        WHERE m.id = $1
        GROUP BY m.id
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Municipio no encontrado'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error obteniendo municipio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  // Obtener departamentos únicos
  async getDepartamentos(req, res) {
    try {
      const result = await query(`
        SELECT DISTINCT 
          codigo_departamento,
          departamento
        FROM municipios
        WHERE activo = true
        ORDER BY departamento
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error obteniendo departamentos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  // Asociar un schema a un municipio
  async asociarSchema(req, res) {
    try {
      const { municipio_id, schema_name, descripcion } = req.body;

      if (!municipio_id || !schema_name) {
        return res.status(400).json({
          success: false,
          error: 'municipio_id y schema_name son requeridos'
        });
      }

      // Verificar que el municipio existe
      const municipioCheck = await query(
        'SELECT id FROM municipios WHERE id = $1',
        [municipio_id]
      );

      if (municipioCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Municipio no encontrado'
        });
      }

      // Verificar que el schema existe en la base de datos
      const schemaCheck = await query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = $1
      `, [schema_name]);

      if (schemaCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Schema ${schema_name} no existe en la base de datos`
        });
      }

      // Insertar o actualizar la asociación
      const result = await query(`
        INSERT INTO municipio_schemas (municipio_id, schema_name, descripcion, created_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (municipio_id, schema_name) 
        DO UPDATE SET 
          descripcion = EXCLUDED.descripcion,
          activo = true,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [municipio_id, schema_name, descripcion || null, req.user?.id || null]);

      res.json({
        success: true,
        message: 'Schema asociado al municipio exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error asociando schema:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  // Desasociar un schema de un municipio
  async desasociarSchema(req, res) {
    try {
      const { id } = req.params;

      const result = await query(`
        UPDATE municipio_schemas 
        SET activo = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Asociación no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Schema desasociado del municipio exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error desasociando schema:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  // Obtener schemas disponibles (no asociados a ningún municipio o todos)
  async getSchemasDisponibles(req, res) {
    try {
      const { municipio_id } = req.query;

      let queryText = `
        SELECT 
          schema_name,
          COUNT(*) as total_tables
        FROM information_schema.schemata s
        LEFT JOIN information_schema.tables t 
          ON s.schema_name = t.table_schema 
          AND t.table_type = 'BASE TABLE'
        WHERE s.schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
        GROUP BY schema_name
        ORDER BY schema_name
      `;

      const result = await query(queryText);

      // Si se especifica un municipio_id, marcar cuáles ya están asociados
      let schemas = result.rows;
      if (municipio_id) {
        const asociados = await query(`
          SELECT schema_name 
          FROM municipio_schemas 
          WHERE municipio_id = $1 AND activo = true
        `, [municipio_id]);

        const schemasAsociados = asociados.rows.map(r => r.schema_name);
        schemas = result.rows.map(s => ({
          ...s,
          asociado: schemasAsociados.includes(s.schema_name)
        }));
      }

      res.json({
        success: true,
        data: schemas
      });
    } catch (error) {
      console.error('Error obteniendo schemas disponibles:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  // Crear un nuevo municipio
  async createMunicipio(req, res) {
    try {
      const { codigo_dane, nombre, departamento, codigo_departamento } = req.body;

      // Validaciones
      if (!codigo_dane || !nombre || !departamento || !codigo_departamento) {
        return res.status(400).json({
          success: false,
          error: 'Datos incompletos',
          message: 'Todos los campos son requeridos: codigo_dane, nombre, departamento, codigo_departamento'
        });
      }

      // Validar formato del código DANE (5 dígitos)
      if (!/^\d{5}$/.test(codigo_dane)) {
        return res.status(400).json({
          success: false,
          error: 'Código DANE inválido',
          message: 'El código DANE debe tener 5 dígitos'
        });
      }

      // Validar formato del código de departamento (2 dígitos)
      if (!/^\d{2}$/.test(codigo_departamento)) {
        return res.status(400).json({
          success: false,
          error: 'Código de departamento inválido',
          message: 'El código de departamento debe tener 2 dígitos'
        });
      }

      // Verificar si ya existe un municipio con ese código DANE
      const existente = await query(
        'SELECT id FROM municipios WHERE codigo_dane = $1',
        [codigo_dane]
      );

      if (existente.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Municipio ya existe',
          message: `Ya existe un municipio con el código DANE ${codigo_dane}`
        });
      }

      // Insertar el nuevo municipio
      const result = await query(`
        INSERT INTO municipios (codigo_dane, nombre, departamento, codigo_departamento)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [codigo_dane, nombre, departamento, codigo_departamento]);

      res.status(201).json({
        success: true,
        message: 'Municipio creado exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error creando municipio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  // Importar municipios desde CSV
  async importarDesdeCSV(req, res) {
    try {
      const { municipios } = req.body; // Array de municipios desde el frontend

      if (!Array.isArray(municipios) || municipios.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          message: 'Se requiere un array de municipios'
        });
      }

      let inserted = 0;
      let updated = 0;
      let errors = 0;
      const errorsList = [];

      for (const municipio of municipios) {
        try {
          const { codigo_dane, nombre, departamento, codigo_departamento } = municipio;

          // Validaciones
          if (!codigo_dane || !nombre || !departamento || !codigo_departamento) {
            errorsList.push(`Municipio con datos incompletos: ${nombre || 'N/A'}`);
            errors++;
            continue;
          }

          if (!/^\d{5}$/.test(codigo_dane)) {
            errorsList.push(`Código DANE inválido: ${codigo_dane} para ${nombre}`);
            errors++;
            continue;
          }

          if (!/^\d{2}$/.test(codigo_departamento)) {
            errorsList.push(`Código departamento inválido: ${codigo_departamento} para ${nombre}`);
            errors++;
            continue;
          }

          // Verificar si existe
          const existente = await query(
            'SELECT id FROM municipios WHERE codigo_dane = $1',
            [codigo_dane]
          );

          if (existente.rows.length > 0) {
            // Actualizar
            await query(`
              UPDATE municipios 
              SET nombre = $1, 
                  departamento = $2, 
                  codigo_departamento = $3,
                  updated_at = CURRENT_TIMESTAMP
              WHERE codigo_dane = $4
            `, [nombre, departamento, codigo_departamento, codigo_dane]);
            updated++;
          } else {
            // Insertar
            await query(`
              INSERT INTO municipios (codigo_dane, nombre, departamento, codigo_departamento)
              VALUES ($1, $2, $3, $4)
            `, [codigo_dane, nombre, departamento, codigo_departamento]);
            inserted++;
          }

        } catch (error) {
          console.error(`Error procesando ${municipio.nombre || 'N/A'}:`, error.message);
          errorsList.push(`Error en ${municipio.nombre || 'N/A'}: ${error.message}`);
          errors++;
        }
      }

      // Contar total
      const countResult = await query('SELECT COUNT(*) as total FROM municipios');
      const total = countResult.rows[0].total;

      res.json({
        success: true,
        message: 'Importación completada',
        data: {
          total_municipios: total,
          insertados: inserted,
          actualizados: updated,
          errores: errors,
          errores_detalle: errorsList.slice(0, 10) // Primeros 10 errores
        }
      });

    } catch (error) {
      console.error('Error importando municipios:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  // Exportar consolidado catastral del municipio en un archivo Excel (Multi-hoja)
  async exportarConsolidado(req, res) {
    try {
      const { id } = req.params;
      const ExcelJS = require('exceljs');
      const consultaAlfanumericoService = require('../services/consultaAlfanumericoService');

      // 1. Obtener información del municipio
      const muniResult = await query(
        'SELECT nombre, departamento FROM municipios WHERE id = $1',
        [id]
      );
      if (muniResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Municipio no encontrado'
        });
      }
      const municipio = muniResult.rows[0];

      // 2. Obtener esquemas activos para este municipio
      const schemasResult = await query(
        'SELECT schema_name FROM municipio_schemas WHERE municipio_id = $1 AND activo = true',
        [id]
      );

      if (schemasResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No hay esquemas activos asociados',
          message: `El municipio ${municipio.nombre} no tiene esquemas XTF activos asociados`
        });
      }

      const activeSchemas = schemasResult.rows.map(r => r.schema_name);
      console.log(`📊 Exportando consolidado para ${municipio.nombre}. Esquemas activos:`, activeSchemas);

      // 3. Definir las hojas y sus respectivas consultas
      const worksheetsDef = [
        { name: 'Fichas', method: 'consultarFichas' },
        { name: 'Propietarios', method: 'consultarPropietarios' },
        { name: 'Construcciones', method: 'consultarConstrucciones' },
        { name: 'Calificaciones Resumen', method: 'consultarCalificacionesConstrucciones' },
        { name: 'Calificaciones Detalle', method: 'consultarCalificacionesDetalle' },
        { name: 'Construcciones Generales', method: 'consultarConstruccionesGenerales' },
        { name: 'Colindantes', method: 'consultarColindantes' },
        { name: 'Cartografía', method: 'consultarCartografia' }
      ];

      // Inicializar el libro de Excel
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GPCONES';
      workbook.created = new Date();

      // 4. Cargar y consolidar datos para cada hoja
      for (const def of worksheetsDef) {
        let consolidatedData = [];

        for (const schemaName of activeSchemas) {
          try {
            // Llamar al servicio correspondiente (con un límite alto para consolidación)
            const result = await consultaAlfanumericoService[def.method](schemaName, { limit: 100000 });
            if (result && result.success && result.data && result.data.length > 0) {
              // Añadir la columna de esquema a cada registro
              const mappedData = result.data.map(item => ({
                'Esquema XTF': schemaName,
                ...item
              }));
              consolidatedData = consolidatedData.concat(mappedData);
            }
          } catch (queryErr) {
            console.error(`Error consultando ${def.name} en schema ${schemaName}:`, queryErr.message);
            // Continuar con los demás esquemas/consultas para no abortar todo el reporte
          }
        }

        // 5. Crear la hoja y escribir los datos
        const worksheet = workbook.addWorksheet(def.name);
        
        if (consolidatedData.length === 0) {
          worksheet.addRow(['No se encontraron registros para esta consulta en los esquemas activos del municipio.']);
          continue;
        }

        // Obtener las llaves (columnas) dinámicamente desde el primer elemento
        const keys = Object.keys(consolidatedData[0]);

        // Configurar las columnas de Excel
        worksheet.columns = keys.map(k => ({
          header: k,
          key: k,
          width: Math.max(k.length + 5, 12)
        }));

        // Escribir los registros
        consolidatedData.forEach(item => {
          const rowValue = {};
          keys.forEach(k => {
            const val = item[k];
            if (val !== null && typeof val === 'object') {
              rowValue[k] = JSON.stringify(val);
            } else {
              rowValue[k] = val;
            }
          });
          worksheet.addRow(rowValue);
        });

        // Configurar estilos básicos para los encabezados
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1F497D' } // Azul corporativo
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 24;

        // Auto-ajustar el ancho de las columnas según su contenido
        worksheet.columns.forEach(column => {
          let maxLen = column.header.length;
          worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
            if (rowNumber > 1) {
              const val = row.getCell(column.key).value;
              if (val) {
                maxLen = Math.max(maxLen, val.toString().length);
              }
            }
          });
          column.width = Math.min(maxLen + 4, 50); // Límite de ancho para que no se extienda demasiado
        });
      }

      // 6. Configurar cabeceras de respuesta y transmitir el archivo
      const fileName = `consolidado_${municipio.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_')}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error generando consolidado Excel:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }
}

module.exports = new MunicipiosController();

