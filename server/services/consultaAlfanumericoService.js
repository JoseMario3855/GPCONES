const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Servicio para ejecutar consultas alfanuméricas basadas en el archivo CONSULTASALFANUMERICO.txt
 * Las consultas están diseñadas para trabajar con schemas LADM-COL
 */

// Cargar consultas procesadas
let consultasProcesadas = {};
try {
  const consultasPath = path.join(__dirname, '../../database/consultas_alfanumerico.json');
  console.log(`📂 Buscando consultas en: ${consultasPath}`);
  if (fs.existsSync(consultasPath)) {
    consultasProcesadas = JSON.parse(fs.readFileSync(consultasPath, 'utf8'));
    console.log(`✅ Consultas cargadas: ${Object.keys(consultasProcesadas).length} consultas disponibles`);
    console.log(`📋 Consultas disponibles: ${Object.keys(consultasProcesadas).join(', ')}`);
  } else {
    console.error(`❌ Archivo de consultas no encontrado en: ${consultasPath}`);
  }
} catch (error) {
  console.error('❌ Error cargando las consultas procesadas:', error.message);
  console.error('📋 Stack:', error.stack);
}

class ConsultaAlfanumericoService {
  /**
   * Ejecuta la consulta de Fichas (Predios)
   * @param {string} schemaName - Nombre del schema a consultar
   * @param {object} filters - Filtros opcionales (nroFicha, npn, municipio, etc.)
   */
  async consultarFichas(schemaName, filters = {}) {
    try {
      // Validar que el schema existe
      const schemaExists = await query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = $1
      `, [schemaName]);

      if (schemaExists.rows.length === 0) {
        throw new Error(`Schema ${schemaName} no existe`);
      }

      // Llamar al procedimiento almacenado - especificar todas las 49 columnas
      const result = await query(`
        SELECT * FROM consulta_fichas(
          $1::TEXT,  -- schema_name
          $2::TEXT,  -- nro_ficha
          $3::TEXT,  -- npn
          $4::TEXT,  -- matricula_inmobiliaria
          $5::INTEGER,  -- limit
          $6::INTEGER   -- offset
        ) AS t(
          t_id BIGINT,
          id_terreno BIGINT,
          "NroFicha" TEXT,
          "NumCedulaCatastral" TEXT,
          "DepartamentoPredio" TEXT,
          "MunicipioPredio" TEXT,
          "MatriculaInmobiliaria" TEXT,
          circulo TEXT,
          "Libro" TEXT,
          "Tomo" TEXT,
          "Pagina" TEXT,
          "ModoAdquisicion" TEXT,
          "PredioLcTipo" TEXT,
          "CaracteristicaPredio" TEXT,
          "TipoDireccion" TEXT,
          "DireccionReal" TEXT,
          "DireccionNombre" TEXT,
          "DestinoEcconomico" TEXT,
          "AreaTotalTerreno" NUMERIC,
          "AreaTotalConstruida" NUMERIC,
          "AreaTotalUnidad" NUMERIC,
          "NpnTerreno" TEXT,
          "Npn" TEXT,
          "Zona" TEXT,
          "Sector" TEXT,
          "Comuna" TEXT,
          "Barrio" TEXT,
          "Manzana o Vereda" TEXT,
          "Terreno" TEXT,
          "Condicion" TEXT,
          "Edificio" TEXT,
          "Piso" TEXT,
          "Unidad Predial" TEXT,
          "AreaTotalLote" TEXT,
          "AreaLoteComun" TEXT,
          "AreaLotePrivada" TEXT,
          "TotalEdificios" TEXT,
          "UnidadesEnRPH" TEXT,
          "ApartamentosOCasas" TEXT,
          locales TEXT,
          "GarajesCubiertos" TEXT,
          "GarajesDescubiertos" TEXT,
          "CuartosUtiles" TEXT,
          "Radicado" TEXT,
          "PorcentajeLitigio" TEXT,
          "CoeficienteCopropiedad" TEXT,
          "UnidadPredial" TEXT,
          "Departamento" TEXT,
          "Municipio" TEXT
        )
      `, [
        schemaName,
        filters.nroFicha || null,
        filters.npn || null,
        filters.matriculaInmobiliaria || null,
        filters.limit || 1000,
        filters.offset || 0
      ]);

      return {
        success: true,
        data: result.rows,
        total: result.rows.length
      };
    } catch (error) {
      console.error(`❌ Error en consultarFichas:`, error);
      throw error;
    }
  }

  /**
   * Ejecuta una consulta genérica desde el archivo procesado
   */
  async ejecutarConsulta(nombreConsulta, schemaName, filters = {}) {
    try {
      if (!consultasProcesadas[nombreConsulta]) {
        throw new Error(`Consulta "${nombreConsulta}" no encontrada`);
      }

      // Validar que el schema existe
      const schemaExists = await query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = $1
      `, [schemaName]);

      if (schemaExists.rows.length === 0) {
        throw new Error(`Schema ${schemaName} no existe`);
      }

      // Obtener la consulta y reemplazar el placeholder del schema
      let sqlQuery = consultasProcesadas[nombreConsulta];
      if (!sqlQuery) {
        throw new Error(`Consulta "${nombreConsulta}" no encontrada. Consultas disponibles: ${Object.keys(consultasProcesadas).join(', ')}`);
      }
      
      // Reemplazar el placeholder del schema (tanto ${schemaName} como {esquema})
      sqlQuery = sqlQuery.replace(/\$\{schemaName\}/g, this.quoteIdentifier(schemaName));
      sqlQuery = sqlQuery.replace(/\{esquema\}/g, this.quoteIdentifier(schemaName));

      // Contar parámetros existentes en la consulta original
      const existingParamsMatch = sqlQuery.match(/\$(\d+)/g);
      let maxParamIndex = 0;
      if (existingParamsMatch && existingParamsMatch.length > 0) {
        existingParamsMatch.forEach(match => {
          const paramNum = parseInt(match.replace('$', ''));
          if (paramNum > maxParamIndex) {
            maxParamIndex = paramNum;
          }
        });
        console.log(`📊 Parámetros existentes encontrados: ${maxParamIndex}`);
      } else {
        console.log(`📊 No se encontraron parámetros existentes en la consulta`);
      }
      
      // Limpiar la consulta (eliminar punto y coma al final si existe)
      sqlQuery = sqlQuery.trim().replace(/;\s*$/, '');
      
      // Eliminar comentarios SQL (-- comentario) antes de envolver en subconsulta
      // Esto evita problemas de sintaxis cuando se envuelve la consulta
      sqlQuery = sqlQuery.replace(/--[^\r\n]*/g, '').trim();
      
      // Inicializar queryParams (array de parámetros para la consulta final)
      const queryParams = [];
      
      // Verificar si hay filtros o paginación para aplicar
      const hasFilters = filters.nroFicha || filters.npn || filters.matriculaInmobiliaria || filters.documento;
      const hasPagination = filters.limit || filters.offset;
      
      console.log(`📊 Filtros recibidos para ${nombreConsulta}:`, filters);
      console.log(`📊 ¿Tiene filtros?: ${hasFilters}, ¿Tiene paginación?: ${hasPagination}`);
      
      // Si hay filtros o paginación, envolver la consulta en una subconsulta
      // Esto evita problemas con parámetros existentes en la consulta original
      if (hasFilters || hasPagination) {
        // Primero, obtener las columnas disponibles ejecutando la consulta con LIMIT 1
        // Esto nos permite saber qué columnas existen antes de construir los filtros
        let testQuery = sqlQuery.trim().replace(/;\s*$/, '');
        testQuery = testQuery.replace(/--[^\r\n]*/g, '').trim();
        
        let availableColumns = new Set();
        try {
          // Ejecutar la consulta con LIMIT 1 para obtener una fila de muestra
          // Nota: Para consultas con GROUP BY, esto puede no devolver resultados, pero aún podemos obtener los metadatos
          const testResult = await query(`${testQuery} LIMIT 1`, []);
          
          // Intentar obtener las columnas de los metadatos primero (más confiable)
          if (testResult.fields && testResult.fields.length > 0) {
            availableColumns = new Set(testResult.fields.map(f => f.name));
            console.log(`📋 Columnas obtenidas de metadatos en ${nombreConsulta}:`, Array.from(availableColumns).join(', '));
          } else if (testResult.rows.length > 0) {
            // Si no hay metadatos, usar las claves del primer resultado
            availableColumns = new Set(Object.keys(testResult.rows[0]));
            console.log(`📋 Columnas disponibles en ${nombreConsulta}:`, Array.from(availableColumns).join(', '));
          } else {
            // Si no hay filas pero la consulta se ejecutó, intentar obtener columnas de otra manera
            console.log(`⚠️  La consulta de prueba no devolvió filas para ${nombreConsulta}, pero se ejecutó correctamente`);
          }
        } catch (testError) {
          // Si hay un error al obtener las columnas, usar información específica de la consulta
          console.log(`⚠️  No se pudieron obtener columnas de prueba para ${nombreConsulta}: ${testError.message}`);
          console.log(`⚠️  Usando enfoque basado en el nombre de la consulta`);
        }
        
        // Envolver la consulta original en una subconsulta
        sqlQuery = `SELECT * FROM (${sqlQuery}) AS consulta_base`;
        
        // Preparar parámetros para los filtros (empezando desde $1)
        const newWhereConditions = [];
        let newParamIndex = 1;
        
        // Reconstruir condiciones WHERE con parámetros desde $1
        // Usar múltiples variaciones de nombres de columnas para mayor compatibilidad
        if (filters.nroFicha) {
          // Intentar múltiples nombres de columna posibles
          newWhereConditions.push(`(
            TRIM(consulta_base."NroFicha"::TEXT) = $${newParamIndex} OR 
            consulta_base."NroFicha" = $${newParamIndex} OR 
            consulta_base."nroFicha" = $${newParamIndex} OR 
            consulta_base."Nro_Ficha" = $${newParamIndex} OR
            consulta_base."NumCedulaCatastral" = $${newParamIndex}
          )`);
          queryParams.push(filters.nroFicha);
          newParamIndex++;
        }
        
        if (filters.npn) {
          // Construir la condición basada en el nombre de la consulta
          // Usamos información del archivo CONSULTASALFANUMERICO.txt
          const npnConditions = [];
          
          // Para consultas conocidas, usar directamente la información del archivo
          // sin depender de la detección de columnas (más confiable)
          if (nombreConsulta === 'Propietarios') {
            // Propietarios: usa "Npn " (con espacio al final) según el archivo
            npnConditions.push(`TRIM(consulta_base."Npn ") LIKE $${newParamIndex}`);
          } else if (nombreConsulta === 'Construcciones') {
            // Construcciones: línea 484 - max(predio.numero_predial) as "Npn"
            // La columna SIEMPRE existe porque está explícitamente en el SELECT
            // Usar directamente sin verificar detección
            npnConditions.push(`consulta_base."Npn" LIKE $${newParamIndex}`);
          } else if (nombreConsulta === 'CalificacionesConstrucciones') {
            // CalificacionesConstrucciones: tiene tanto "Npn" (línea 662) como "Npn " (línea 665)
            npnConditions.push(`consulta_base."Npn" LIKE $${newParamIndex}`);
            npnConditions.push(`TRIM(consulta_base."Npn ") LIKE $${newParamIndex}`);
          } else {
            // Para otras consultas desconocidas, usar detección de columnas si está disponible
            if (availableColumns.has('Npn')) {
              npnConditions.push(`consulta_base."Npn" LIKE $${newParamIndex}`);
            }
            if (availableColumns.has('Npn ')) {
              npnConditions.push(`TRIM(consulta_base."Npn ") LIKE $${newParamIndex}`);
            }
            // Si no tenemos información, intentar "Npn" sin espacio (más común)
            if (npnConditions.length === 0) {
              npnConditions.push(`consulta_base."Npn" LIKE $${newParamIndex}`);
            }
          }
          
          if (npnConditions.length > 0) {
            newWhereConditions.push(`(${npnConditions.join(' OR ')})`);
            queryParams.push(`%${filters.npn}%`);
            newParamIndex++;
            console.log(`✅ Filtro de npn aplicado para ${nombreConsulta} usando: ${npnConditions.join(' OR ')}`);
          } else {
            console.log(`⚠️  No se pudo construir filtro de npn para ${nombreConsulta}`);
          }
        }
        
        if (filters.matriculaInmobiliaria) {
          newWhereConditions.push(`(
            consulta_base."MatriculaInmobiliaria" = $${newParamIndex} OR 
            consulta_base."matriculaInmobiliaria" = $${newParamIndex} OR 
            consulta_base."Matricula_Inmobiliaria" = $${newParamIndex}
          )`);
          queryParams.push(filters.matriculaInmobiliaria);
          newParamIndex++;
        }
        
        if (filters.documento) {
          newWhereConditions.push(`(
            TRIM(consulta_base."Documento"::TEXT) = $${newParamIndex} OR 
            consulta_base."Documento" = $${newParamIndex} OR 
            consulta_base."documento" = $${newParamIndex} OR 
            consulta_base."NumCedulaCatastral" = $${newParamIndex}
          )`);
          queryParams.push(filters.documento);
          newParamIndex++;
        }
        
        // Agregar WHERE si hay condiciones
        if (newWhereConditions.length > 0) {
          sqlQuery += ` WHERE ${newWhereConditions.join(' AND ')}`;
        }
        
        // Agregar paginación
        if (filters.limit) {
          sqlQuery += ` LIMIT $${newParamIndex}`;
          queryParams.push(filters.limit);
          newParamIndex++;
        }

        if (filters.offset) {
          sqlQuery += ` OFFSET $${newParamIndex}`;
          queryParams.push(filters.offset);
          newParamIndex++;
        }
      } else {
        // Si no hay filtros, solo limpiar la consulta
        queryParams.length = 0;
      }

      console.log(`📝 Ejecutando consulta: ${nombreConsulta} en schema: ${schemaName}`);
      
      // Contar parámetros finales en la consulta SQL
      // Contar parámetros ÚNICOS, no todas las ocurrencias
      const finalParamsMatch = sqlQuery.match(/\$(\d+)/g);
      
      // Extraer números únicos de parámetros y ordenarlos
      const paramNumbers = finalParamsMatch 
        ? [...new Set(finalParamsMatch.map(m => parseInt(m.replace('$', ''))))].sort((a, b) => a - b)
        : [];
      const totalParamsInQuery = paramNumbers.length; // Contar únicos, no todas las ocurrencias
      
      console.log(`📋 SQL Query (longitud: ${sqlQuery.length} caracteres)`);
      console.log(`📋 Primeros 1000 caracteres:`);
      console.log(sqlQuery.substring(0, 1000));
      console.log(`📋 Últimos 500 caracteres:`);
      console.log(sqlQuery.substring(Math.max(0, sqlQuery.length - 500)));
      // Si hay un error de sintaxis, mostrar el área alrededor de la posición del error
      if (sqlQuery.length > 10000) {
        console.log(`📋 Área alrededor de posición 10984 (si hay error):`);
        const startPos = Math.max(0, 10984 - 200);
        const endPos = Math.min(sqlQuery.length, 10984 + 200);
        console.log(sqlQuery.substring(startPos, endPos));
      }
      // Guardar SQL completo en un archivo temporal para debugging
      const fs = require('fs');
      const debugPath = path.join(__dirname, '../../debug_sql_query.sql');
      fs.writeFileSync(debugPath, sqlQuery, 'utf8');
      console.log(`📋 SQL completo guardado en: ${debugPath}`);
      console.log(`\n📋 Parámetros detectados en SQL (${totalParamsInQuery}):`, finalParamsMatch || []);
      console.log(`📋 Números únicos de parámetros:`, paramNumbers);
      console.log(`📋 Parámetros a enviar (${queryParams.length}):`, queryParams);
      console.log(`📋 Parámetros existentes detectados inicialmente: ${maxParamIndex}`);
      
      // Verificar que los parámetros estén numerados secuencialmente desde 1
      const expectedParamCount = paramNumbers.length > 0 ? Math.max(...paramNumbers) : 0;
      const isSequential = paramNumbers.length === 0 || 
        (paramNumbers.length === expectedParamCount && 
         paramNumbers.every((val, idx) => val === idx + 1));
      
      if (!isSequential && paramNumbers.length > 0) {
        console.error(`❌ ERROR: Los parámetros no están numerados secuencialmente!`);
        console.error(`   Parámetros encontrados:`, paramNumbers);
        console.error(`   Se esperaba:`, Array.from({length: expectedParamCount}, (_, i) => i + 1));
        
        // Renumerar parámetros para que sean secuenciales
        let newParamIndex = 1;
        let newSqlQuery = sqlQuery;
        const newQueryParams = [];
        
        // Ordenar los parámetros por su número original
        const sortedParams = paramNumbers.map((originalNum, idx) => {
          // Encontrar qué parámetro corresponde a este número
          const paramValue = queryParams[idx] || null;
          return { originalNum, newNum: newParamIndex++, value: paramValue };
        });
        
        // Reemplazar los parámetros en el SQL
        sortedParams.forEach(({ originalNum, newNum }) => {
          newSqlQuery = newSqlQuery.replace(new RegExp(`\\$${originalNum}\\b`, 'g'), `$${newNum}`);
        });
        
        // Reordenar los parámetros
        sortedParams.forEach(({ value }) => {
          newQueryParams.push(value);
        });
        
        console.log(`📝 SQL renumerado (primeros 500 caracteres):`);
        console.log(newSqlQuery.substring(0, 500));
        console.log(`📋 Nuevos parámetros (${newQueryParams.length}):`, newQueryParams);
        
        sqlQuery = newSqlQuery;
        queryParams.length = 0;
        queryParams.push(...newQueryParams);
      }
      
      // Verificar que el número de parámetros coincida
      // Contar parámetros ÚNICOS, no todas las ocurrencias
      const finalCheck = sqlQuery.match(/\$(\d+)/g);
      const uniqueParamNumbers = finalCheck 
        ? [...new Set(finalCheck.map(m => parseInt(m.replace('$', ''))))].sort((a, b) => a - b)
        : [];
      const finalParamCount = uniqueParamNumbers.length;
      
      if (finalParamCount !== queryParams.length) {
        console.error(`❌ ERROR: Número de parámetros no coincide después de renumerar!`);
        console.error(`   SQL tiene ${finalParamCount} parámetros únicos:`, uniqueParamNumbers);
        console.error(`   Pero estamos enviando ${queryParams.length} parámetros:`, queryParams);
        throw new Error(`Número de parámetros no coincide: SQL tiene ${finalParamCount} parámetros únicos, pero se están enviando ${queryParams.length} parámetros`);
      }
      
      console.log(`✅ Parámetros validados: ${finalParamCount} parámetros únicos en SQL, ${queryParams.length} valores a enviar`);
      
      const result = await query(sqlQuery, queryParams);
      
      console.log(`✅ Consulta ${nombreConsulta} ejecutada exitosamente. Filas devueltas: ${result.rows.length}`);
      if (result.rows.length === 0) {
        console.log(`⚠️  La consulta ${nombreConsulta} no devolvió resultados. Esto puede ser normal si no hay datos que coincidan con los filtros.`);
        console.log(`📋 Filtros aplicados:`, filters);
        console.log(`📋 SQL Query final (primeros 500 caracteres):`, sqlQuery.substring(0, Math.min(500, sqlQuery.length)));
      } else {
        console.log(`✅ Primeras columnas del resultado:`, Object.keys(result.rows[0] || {}).slice(0, 10));
      }

      return {
        success: true,
        data: result.rows,
        total: result.rows.length
      };

    } catch (error) {
      // Si el error es sobre una columna que no existe, intentar ejecutar sin ese filtro
      if (error.code === '42703' && error.message.includes('no existe la columna')) {
        console.error(`❌ Error: Columna no existe en ${nombreConsulta}`);
        console.error(`📋 Mensaje:`, error.message);
        console.error(`📋 Intentando ejecutar consulta sin filtros problemáticos...`);
        
        // Si el error es sobre npn, intentar ejecutar sin ese filtro
        if (filters.npn && error.message.includes('Npn')) {
          console.log(`⚠️  Reintentando consulta sin filtro de npn...`);
          const filtersWithoutNpn = { ...filters };
          delete filtersWithoutNpn.npn;
          return await this.ejecutarConsulta(nombreConsulta, schemaName, filtersWithoutNpn);
        }
      }
      
      console.error(`❌ Error en ejecutarConsulta (${nombreConsulta}):`, error);
      console.error(`📋 Schema: ${schemaName}`);
      console.error(`📋 Filtros:`, filters);
      console.error(`📋 Mensaje de error:`, error.message);
      console.error(`📋 Stack:`, error.stack);
      throw error;
    }
  }

  /**
   * Ejecuta la consulta de Propietarios
   */
  async consultarPropietarios(schemaName, filters = {}) {
    return await this.ejecutarConsulta('Propietarios', schemaName, filters);
  }

  /**
   * Ejecuta la consulta de Construcciones
   */
  async consultarConstrucciones(schemaName, filters = {}) {
    return await this.ejecutarConsulta('Construcciones', schemaName, filters);
  }

  /**
   * Ejecuta la consulta de CalificacionesConstrucciones
   */
  async consultarCalificacionesConstrucciones(schemaName, filters = {}) {
    return await this.ejecutarConsulta('CalificacionesConstrucciones', schemaName, filters);
  }

  /**
   * Ejecuta la consulta de ConstruccionesGenerales
   */
  async consultarConstruccionesGenerales(schemaName, filters = {}) {
    return await this.ejecutarConsulta('ConstruccionesGenerales', schemaName, filters);
  }

  /**
   * Ejecuta la consulta de Colindantes
   */
  async consultarColindantes(schemaName, filters = {}) {
    return await this.ejecutarConsulta('Colindantes', schemaName, filters);
  }

  /**
   * Ejecuta la consulta de CartografiaInformacionGrafica
   */
  async consultarCartografia(schemaName, filters = {}) {
    return await this.ejecutarConsulta('CartografiaInformacionGrafica', schemaName, filters);
  }

  /**
   * Helper para citar identificadores SQL
   */
  quoteIdentifier(identifier) {
    return `"${identifier}"`;
  }
}

module.exports = new ConsultaAlfanumericoService();

