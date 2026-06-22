const db = require('../config/database');
const { logAuditEvent } = require('../controllers/auditController');

// Servicio para integración automática de datos XTF al schema principal
class XTFIntegrationService {
  
  constructor() {
    this.mainSchema = 'public';
    this.xtfSchemaPrefix = 'xtf_';
  }

  // Integrar datos XTF al schema principal
  async integrateXTFToMainSchema(xtfSchemaName, options = {}) {
    try {
      console.log(`Integrando datos XTF del schema ${xtfSchemaName} al schema principal`);
      
      const query = (text, params) => {
        console.log('🔍 [SQL INTEGRATION] Executing:', text.substring(0, 150) + (text.length > 150 ? '...' : ''), 'with params:', params);
        return db.query(text, params);
      };
      
      // Verificar que el schema XTF existe
      const schemaExists = await this.checkSchemaExists(xtfSchemaName);
      if (!schemaExists) {
        throw new Error(`Schema XTF ${xtfSchemaName} no existe`);
      }

      // Obtener información del schema XTF
      const xtfInfo = await this.getXTFSchemaInfo(xtfSchemaName);
      
      // Mapear tablas XTF a tablas de aplicación
      const mappingResult = await this.mapXTFToApplicationTables(xtfSchemaName, xtfInfo);
      
      // Crear tablas de integración si no existen
      await this.createIntegrationTables();

      // Limpiar datos previos de este schema en las tablas de integración (sin tocar vistas)
      await query('DELETE FROM construcciones_xtf WHERE xtf_schema = $1', [xtfSchemaName]);
      await query('DELETE FROM terrenos_xtf WHERE xtf_schema = $1', [xtfSchemaName]);
      await query('DELETE FROM predios_xtf WHERE xtf_schema = $1', [xtfSchemaName]);
      await query('DELETE FROM xtf_integration_metadata WHERE xtf_schema = $1', [xtfSchemaName]);
      
      // Importar datos de predios
      const prediosResult = await this.importPredios(xtfSchemaName, options);
      
      // Importar datos de terrenos
      const terrenosResult = await this.importTerrenos(xtfSchemaName, options);
      
      // Importar datos de construcciones
      const construccionesResult = await this.importConstrucciones(xtfSchemaName, options);
      
      // Crear índices de integración
      await this.createIntegrationIndexes();
      
      // Crear vistas unificadas
      await this.createUnifiedViews(xtfSchemaName);
      
      // Registrar integración en auditoría
      await logAuditEvent(
        options.userId || 'system',
        'INTEGRACION_XTF_AUTOMATICA',
        'XTF_INTEGRATION',
        {
          xtf_schema: xtfSchemaName,
          predios_importados: prediosResult.imported,
          terrenos_importados: terrenosResult.imported,
          construcciones_importadas: construccionesResult.imported,
          total_entidades: prediosResult.imported + terrenosResult.imported + construccionesResult.imported
        }
      );

      return {
        success: true,
        xtf_schema: xtfSchemaName,
        integration: {
          predios: prediosResult,
          terrenos: terrenosResult,
          construcciones: construccionesResult
        },
        total_imported: prediosResult.imported + terrenosResult.imported + construccionesResult.imported
      };

    } catch (error) {
      console.error('Error en integración XTF:', error);
      throw new Error(`Error en integración XTF: ${error.message}`);
    }
  }

  // Verificar que un schema existe
  async checkSchemaExists(schemaName) {
    const { query } = db;
    const result = await query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = $1
    `, [schemaName]);
    
    return result.rows.length > 0;
  }

  // Obtener información del schema XTF
  async getXTFSchemaInfo(schemaName) {
    const { query } = db;
    
    const tablesResult = await query(`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables 
      WHERE table_schema = $1
      ORDER BY table_name
    `, [schemaName]);

    const info = {
      schema_name: schemaName,
      tables: tablesResult.rows,
      total_tables: tablesResult.rows.length
    };

    // Mapeo dinámico de tablas principales para soportar prefijos LC_ e ILC_/CR_
    const tableMapping = {
      predio: tablesResult.rows.find(t => t.table_name.toLowerCase() === 'ilc_predio' || t.table_name.toLowerCase() === 'lc_predio')?.table_name || tablesResult.rows.find(t => t.table_name.toLowerCase().endsWith('predio'))?.table_name || 'LC_Predio',
      terreno: tablesResult.rows.find(t => t.table_name.toLowerCase() === 'cr_terreno' || t.table_name.toLowerCase() === 'lc_terreno')?.table_name || tablesResult.rows.find(t => t.table_name.toLowerCase().endsWith('terreno'))?.table_name || 'LC_Terreno',
      construccion: tablesResult.rows.find(t => t.table_name.toLowerCase() === 'cr_construccion' || t.table_name.toLowerCase() === 'lc_construccion' || t.table_name.toLowerCase() === 'cr_unidadconstruccion')?.table_name || tablesResult.rows.find(t => t.table_name.toLowerCase().endsWith('construccion') || t.table_name.toLowerCase().endsWith('unidadconstruccion'))?.table_name || 'LC_Construccion',
      servidumbre: tablesResult.rows.find(t => t.table_name.toLowerCase() === 'cr_servidumbre' || t.table_name.toLowerCase() === 'lc_servidumbre')?.table_name || tablesResult.rows.find(t => t.table_name.toLowerCase().endsWith('servidumbre'))?.table_name || 'LC_Servidumbre'
    };
    
    info.tableMapping = tableMapping;
    
    for (const [key, tableName] of Object.entries(tableMapping)) {
      const tableExists = info.tables.find(t => t.table_name === tableName);
      if (tableExists) {
        const columnsResult = await query(`
          SELECT 
            column_name,
            data_type,
            udt_name,
            is_nullable
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
        `, [schemaName, tableName]);
        
        info[key] = {
          exists: true,
          columns: columnsResult.rows
        };
      } else {
        info[key] = { exists: false, columns: [] };
      }
    }

    return info;
  }

  // Mapear tablas XTF a tablas de aplicación
  async mapXTFToApplicationTables(xtfSchemaName, xtfInfo) {
    const mapping = {
      [xtfInfo.tableMapping.predio]: 'predios',
      [xtfInfo.tableMapping.terreno]: 'terrenos',
      [xtfInfo.tableMapping.construccion]: 'construcciones',
      [xtfInfo.tableMapping.servidumbre]: 'servidumbres'
    };

    const result = {};
    
    for (const [xtfTable, appTable] of Object.entries(mapping)) {
      const key = Object.keys(xtfInfo.tableMapping).find(k => xtfInfo.tableMapping[k] === xtfTable);
      const xtfTableInfo = xtfInfo[key];
      if (xtfTableInfo && xtfTableInfo.exists) {
        result[xtfTable] = {
          app_table: appTable,
          xtf_table: xtfTable,
          columns: xtfTableInfo.columns,
          exists: true
        };
      } else {
        result[xtfTable] = {
          app_table: appTable,
          xtf_table: xtfTable,
          exists: false
        };
      }
    }

    return result;
  }

  // Crear tablas de integración
  async createIntegrationTables() {
    const { query } = db;
    
    // Crear tabla de integración de predios si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS predios_xtf (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        xtf_id VARCHAR(255),
        npn VARCHAR(50),
        municipio VARCHAR(100),
        zona VARCHAR(100),
        sector VARCHAR(100),
        numero_ficha VARCHAR(50),
        area_hectareas DECIMAL(15,2),
        tipo_predio VARCHAR(50),
        uso_predio VARCHAR(50),
        propietario_nombre VARCHAR(200),
        propietario_documento VARCHAR(50),
        propietario_tipo_documento VARCHAR(20),
        estado VARCHAR(50) DEFAULT 'Importado',
        geometry GEOMETRY(POLYGON, 3116),
        xtf_schema VARCHAR(100),
        xtf_original_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (xtf_schema, xtf_id)
      )
    `);

    // Crear tabla de integración de terrenos
    await query(`
      CREATE TABLE IF NOT EXISTS terrenos_xtf (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        xtf_id VARCHAR(255),
        predio_id UUID REFERENCES predios_xtf(id),
        area_hectareas DECIMAL(15,2),
        tipo_terreno VARCHAR(50),
        uso_terreno VARCHAR(50),
        geometry GEOMETRY(POLYGON, 3116),
        xtf_schema VARCHAR(100),
        xtf_original_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (xtf_schema, xtf_id)
      )
    `);

    // Crear tabla de integración de construcciones
    await query(`
      CREATE TABLE IF NOT EXISTS construcciones_xtf (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        xtf_id VARCHAR(255),
        predio_id UUID REFERENCES predios_xtf(id),
        area_construida DECIMAL(15,2),
        tipo_construccion VARCHAR(50),
        uso_construccion VARCHAR(50),
        numero_pisos INTEGER,
        geometry GEOMETRY(POLYGON, 3116),
        xtf_schema VARCHAR(100),
        xtf_original_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (xtf_schema, xtf_id)
      )
    `);

    // Crear tabla de metadatos de integración
    await query(`
      CREATE TABLE IF NOT EXISTS xtf_integration_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        xtf_schema VARCHAR(100) UNIQUE,
        integration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_predios INTEGER DEFAULT 0,
        total_terrenos INTEGER DEFAULT 0,
        total_construcciones INTEGER DEFAULT 0,
        integration_status VARCHAR(50) DEFAULT 'COMPLETED',
        integration_details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Importar predios desde XTF
  async importPredios(xtfSchemaName, options = {}) {
    const { query } = db;
    
    try {
      const schemaInfo = await this.getXTFSchemaInfo(xtfSchemaName);
      const tableName = schemaInfo.tableMapping.predio;
      const terrainTableName = schemaInfo.tableMapping.terreno;
      
      // Verificar si existe la tabla en el schema XTF
      const tableExists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = $2
        )
      `, [xtfSchemaName, tableName]);

      if (!tableExists.rows[0].exists) {
        return { imported: 0, skipped: 0, errors: 0 };
      }

      // Check column names of the table in the schema
      const columnsResult = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
      `, [xtfSchemaName, tableName]);
      const cols = columnsResult.rows.map(r => r.column_name.toLowerCase());
      
      const nonGeomCols = columnsResult.rows
        .map(r => r.column_name)
        .filter(name => {
          const lower = name.toLowerCase();
          return lower !== 'geometria' && lower !== 'geometry';
        });
      const originalDataExpr = nonGeomCols.length > 0
        ? `jsonb_build_object(${nonGeomCols.map(name => `'${name}', t."${name}"`).join(', ')})`
        : `'{}'::jsonb`;
      
      const xtfIdCol = cols.includes('t_ili_tid') ? 't_ili_tid' : (cols.includes('tid') ? 'tid' : (cols.includes('t_id') ? 't_id' : null));
      const xtfIdExpr = xtfIdCol ? `t.${xtfIdCol}::varchar` : `'xtf_' || row_number() OVER()`;
      const npnCol = cols.includes('numero_predial_nacional') ? 'numero_predial_nacional' : (cols.includes('numero_predial') ? 'numero_predial' : (cols.includes('npn') ? 'npn' : null));
      const npnExpr = npnCol ? `t.${npnCol}` : `'NPN_' || row_number() OVER()`;
      const municipioExpr = cols.includes('municipio') ? 'municipio' : `'Sin Municipio'`;
      const zonaExpr = cols.includes('zona') ? 'zona' : 'NULL';
      const sectorExpr = cols.includes('sector') ? 'sector' : 'NULL';
      const numeroFichaExpr = cols.includes('numero_ficha') ? 'numero_ficha' : (cols.includes('n_ficha') ? 'n_ficha::varchar' : 'NULL');
      const areaHectareasExpr = cols.includes('area_hectareas') ? 'area_hectareas' : (cols.includes('area_catastral_terreno') ? 'area_catastral_terreno' : '0');
      const tipoPredioExpr = cols.includes('tipo_predio') ? 'tipo_predio' : (cols.includes('tipo') ? 'tipo::varchar' : `'NO_ESPECIFICADO'`);
      const usoPredioExpr = cols.includes('uso_predio') ? 'uso_predio' : (cols.includes('destinacion_economica') ? 'destinacion_economica::varchar' : `'NO_ESPECIFICADO'`);
      const propietarioNombreExpr = cols.includes('propietario_nombre') ? 'propietario_nombre' : 'NULL';
      const propietarioDocumentoExpr = cols.includes('propietario_documento') ? 'propietario_documento' : 'NULL';
      const propietarioTipoDocumentoExpr = cols.includes('propietario_tipo_documento') ? 'propietario_tipo_documento' : `'CC'`;

      // Resolve geometry through col_uebaunit, copropiedad, constructions, or local_id prefix mapping
      const colUebaunitExists = schemaInfo.tables.some(t => t.table_name === 'col_uebaunit');
      const copropiedadTableName = schemaInfo.tables.find(t => t.table_name.toLowerCase() === 'cr_predio_copropiedad' || t.table_name.toLowerCase() === 'lc_predio_copropiedad')?.table_name;
      const constructionTableName = schemaInfo.tableMapping.construccion;

      let geometryExpr = 'NULL::geometry';
      if (colUebaunitExists) {
        const colUebaunitColsResult = await query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = 'col_uebaunit'
        `, [xtfSchemaName]);
        const colUebaunitCols = colUebaunitColsResult.rows.map(r => r.column_name.toLowerCase());
        const terrainCol = colUebaunitCols.find(c => c.startsWith('ue_') && c.includes('terreno')) || 'ue_cr_terreno';
        const constrCol = colUebaunitCols.find(c => c.startsWith('ue_') && (c.includes('construccion') || c.includes('unidadconstruccion'))) || 'ue_cr_unidadconstruccion';

        const terrainColsResult = await query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2
        `, [xtfSchemaName, terrainTableName]);
        const terrainCols = terrainColsResult.rows.map(r => r.column_name.toLowerCase());
        const geometryCol = terrainCols.find(c => c === 'geometria' || c === 'geometry') || 'geometria';

        let constGeomCol = 'geometria';
        if (constructionTableName) {
          const constColsResult = await query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = $1 AND table_name = $2
          `, [xtfSchemaName, constructionTableName]);
          const constCols = constColsResult.rows.map(r => r.column_name.toLowerCase());
          constGeomCol = constCols.find(c => c === 'geometria' || c === 'geometry') || 'geometria';
        }

        // Build robust selection with multiple fallbacks
        const selectTerrainGeomDirect = `(SELECT "${geometryCol}" FROM "${xtfSchemaName}"."${terrainTableName}" WHERE t_id = (SELECT "${terrainCol}" FROM "${xtfSchemaName}".col_uebaunit WHERE baunit = t.t_id LIMIT 1) LIMIT 1)`;
        
        let selectTerrainGeomMatrix = 'NULL::geometry';
        if (copropiedadTableName) {
          selectTerrainGeomMatrix = `(SELECT "${geometryCol}" FROM "${xtfSchemaName}"."${terrainTableName}" WHERE t_id = (SELECT "${terrainCol}" FROM "${xtfSchemaName}".col_uebaunit WHERE baunit = (SELECT matriz FROM "${xtfSchemaName}"."${copropiedadTableName}" WHERE unidad_predial = t.t_id LIMIT 1) LIMIT 1) LIMIT 1)`;
        }

        let selectTerrainGeomPrefix = 'NULL::geometry';
        if (npnCol) {
          selectTerrainGeomPrefix = `(SELECT "${geometryCol}" FROM "${xtfSchemaName}"."${terrainTableName}" WHERE SUBSTRING(local_id, 1, 21) = SUBSTRING(t.${npnCol}, 1, 21) ORDER BY t_id LIMIT 1)`;
        } else {
          selectTerrainGeomPrefix = `(SELECT "${geometryCol}" FROM "${xtfSchemaName}"."${terrainTableName}" WHERE SUBSTRING(local_id, 1, 21) = SUBSTRING(t.local_id, 1, 21) ORDER BY t_id LIMIT 1)`;
        }

        let selectConstructionGeom = 'NULL::geometry';
        if (constructionTableName) {
          selectConstructionGeom = `(SELECT "${constGeomCol}" FROM "${xtfSchemaName}"."${constructionTableName}" WHERE t_id = (SELECT "${constrCol}" FROM "${xtfSchemaName}".col_uebaunit WHERE baunit = t.t_id LIMIT 1) LIMIT 1)`;
        }

        geometryExpr = `ST_GeometryN(ST_CollectionExtract(ST_CurveToLine(ST_Force2D(COALESCE(
          ${selectTerrainGeomDirect},
          ${selectTerrainGeomMatrix},
          ${selectTerrainGeomPrefix},
          ${selectConstructionGeom}
        ))), 3), 1)`;
      } else if (cols.includes('geometry')) {
        geometryExpr = "ST_GeometryN(ST_CollectionExtract(ST_CurveToLine(ST_Force2D(geometry)), 3), 1)";
      } else if (cols.includes('geometria')) {
        geometryExpr = "ST_GeometryN(ST_CollectionExtract(ST_CurveToLine(ST_Force2D(geometria)), 3), 1)";
      }


      // Importar predios con mapeo de campos
      const importQuery = `
        INSERT INTO predios_xtf (
          xtf_id, npn, municipio, zona, sector, numero_ficha,
          area_hectareas, tipo_predio, uso_predio,
          propietario_nombre, propietario_documento, propietario_tipo_documento,
          geometry, xtf_schema, xtf_original_data
        )
        SELECT 
          ${xtfIdExpr} as xtf_id,
          ${npnExpr} as npn,
          COALESCE(${municipioExpr}, 'Sin Municipio') as municipio,
          ${zonaExpr},
          ${sectorExpr},
          ${numeroFichaExpr},
          COALESCE(${areaHectareasExpr}, 0) as area_hectareas,
          COALESCE(${tipoPredioExpr}, 'NO_ESPECIFICADO') as tipo_predio,
          COALESCE(${usoPredioExpr}, 'NO_ESPECIFICADO') as uso_predio,
          ${propietarioNombreExpr},
          ${propietarioDocumentoExpr},
          COALESCE(${propietarioTipoDocumentoExpr}, 'CC') as propietario_tipo_documento,
          ${geometryExpr},
          $1::varchar as xtf_schema,
          ${originalDataExpr} as xtf_original_data
        FROM "${xtfSchemaName}"."${tableName}" t
        ${xtfIdCol ? `WHERE NOT EXISTS (
          SELECT 1 FROM predios_xtf p 
          WHERE p.xtf_id = t.${xtfIdCol}::varchar AND p.xtf_schema = $1::varchar
        )` : ''}
        ON CONFLICT (xtf_schema, xtf_id) DO NOTHING
      `;

      const result = await query(importQuery, [xtfSchemaName]);
      
      // Obtener conteo de registros importados
      const countResult = await query(`
        SELECT COUNT(*) as total 
        FROM predios_xtf 
        WHERE xtf_schema = $1
      `, [xtfSchemaName]);

      return {
        imported: parseInt(countResult.rows[0].total),
        skipped: 0,
        errors: 0
      };

    } catch (error) {
      console.error('Error importando predios:', error);
      return {
        imported: 0,
        skipped: 0,
        errors: 1,
        error_message: error.message
      };
    }
  }

  // Importar terrenos desde XTF
  async importTerrenos(xtfSchemaName, options = {}) {
    const { query } = db;
    
    try {
      const schemaInfo = await this.getXTFSchemaInfo(xtfSchemaName);
      const tableName = schemaInfo.tableMapping.terreno;
      
      const tableExists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = $2
        )
      `, [xtfSchemaName, tableName]);

      if (!tableExists.rows[0].exists) {
        return { imported: 0, skipped: 0, errors: 0 };
      }

      const terrainColsResult = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
      `, [xtfSchemaName, tableName]);
      const terrainCols = terrainColsResult.rows.map(r => r.column_name.toLowerCase());

      const nonGeomTerrainCols = terrainColsResult.rows
        .map(r => r.column_name)
        .filter(name => {
          const lower = name.toLowerCase();
          return lower !== 'geometria' && lower !== 'geometry';
        });
      const originalDataExpr = nonGeomTerrainCols.length > 0
        ? `jsonb_build_object(${nonGeomTerrainCols.map(name => `'${name}', t."${name}"`).join(', ')})`
        : `'{}'::jsonb`;
      
      const terrainXtfIdCol = terrainCols.includes('t_ili_tid') ? 't_ili_tid' : (terrainCols.includes('tid') ? 'tid' : (terrainCols.includes('t_id') ? 't_id' : null));
      const terrainXtfId = terrainXtfIdCol ? `t.${terrainXtfIdCol}::varchar` : `'terreno_' || row_number() OVER()`;
      const terrainGeometry = terrainCols.includes('geometria') ? 'geometria' : (terrainCols.includes('geometry') ? 'geometry' : 'NULL');
      const terrainArea = terrainCols.includes('area_hectareas') ? 'area_hectareas' : '0';
      const terrainTipo = terrainCols.includes('tipo_terreno') ? 'tipo_terreno' : `'NO_ESPECIFICADO'`;
      const terrainUso = terrainCols.includes('uso_terreno') ? 'uso_terreno' : `'NO_ESPECIFICADO'`;

      const colUebaunitExists = schemaInfo.tables.some(t => t.table_name === 'col_uebaunit');
      let joinQuery = '';
      if (colUebaunitExists) {
        const colUebaunitColsResult = await query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = 'col_uebaunit'
        `, [xtfSchemaName]);
        const colUebaunitCols = colUebaunitColsResult.rows.map(r => r.column_name.toLowerCase());
        const terrainCol = colUebaunitCols.find(c => c.startsWith('ue_') && c.includes('terreno')) || 'ue_cr_terreno';
        
        const predioColsResult = await query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2
        `, [xtfSchemaName, schemaInfo.tableMapping.predio]);
        const predioCols = predioColsResult.rows.map(r => r.column_name.toLowerCase());

        const predioXtfIdParts = [];
        if (predioCols.includes('t_ili_tid')) predioXtfIdParts.push('pr.t_ili_tid::varchar');
        if (predioCols.includes('tid')) predioXtfIdParts.push('pr.tid');
        if (predioCols.includes('t_id')) predioXtfIdParts.push('pr.t_id::varchar');
        const predioXtfIdExpr = predioXtfIdParts.length > 0 ? `COALESCE(${predioXtfIdParts.join(', ')})` : 'NULL';

        joinQuery = `
          LEFT JOIN "${xtfSchemaName}".col_uebaunit rel ON rel."${terrainCol}" = t.t_id
          LEFT JOIN "${xtfSchemaName}"."${schemaInfo.tableMapping.predio}" pr ON rel.baunit = pr.t_id
          LEFT JOIN predios_xtf p ON p.xtf_id = ${predioXtfIdExpr} AND p.xtf_schema = $1::varchar
        `;
      } else {
        joinQuery = `
          LEFT JOIN predios_xtf p ON p.xtf_schema = $1::varchar
        `;
      }

      const importQuery = `
        INSERT INTO terrenos_xtf (
          xtf_id, predio_id, area_hectareas, tipo_terreno, uso_terreno,
          geometry, xtf_schema, xtf_original_data
        )
        SELECT 
          ${terrainXtfId} as xtf_id,
          p.id as predio_id,
          COALESCE(${terrainArea}, 0) as area_hectareas,
          ${terrainTipo} as tipo_terreno,
          ${terrainUso} as uso_terreno,
          ${terrainGeometry !== 'NULL' ? `ST_GeometryN(ST_CollectionExtract(ST_CurveToLine(ST_Force2D(t."${terrainGeometry}")), 3), 1)` : 'NULL::geometry'} as geometry,
          $1::varchar as xtf_schema,
          ${originalDataExpr} as xtf_original_data
        FROM "${xtfSchemaName}"."${tableName}" t
        ${joinQuery}
        ${terrainXtfIdCol ? `WHERE NOT EXISTS (
          SELECT 1 FROM terrenos_xtf tr 
          WHERE tr.xtf_id = t.${terrainXtfIdCol}::varchar AND tr.xtf_schema = $1::varchar
        )` : ''}
        ON CONFLICT (xtf_schema, xtf_id) DO NOTHING
      `;

      await query(importQuery, [xtfSchemaName]);
      
      const countResult = await query(`
        SELECT COUNT(*) as total 
        FROM terrenos_xtf 
        WHERE xtf_schema = $1
      `, [xtfSchemaName]);

      return {
        imported: parseInt(countResult.rows[0].total),
        skipped: 0,
        errors: 0
      };

    } catch (error) {
      console.error('Error importando terrenos:', error);
      return {
        imported: 0,
        skipped: 0,
        errors: 1,
        error_message: error.message
      };
    }
  }

  // Importar construcciones desde XTF
  async importConstrucciones(xtfSchemaName, options = {}) {
    const { query } = db;
    
    try {
      const schemaInfo = await this.getXTFSchemaInfo(xtfSchemaName);
      const tableName = schemaInfo.tableMapping.construccion;
      
      const tableExists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = $2
        )
      `, [xtfSchemaName, tableName]);

      if (!tableExists.rows[0].exists) {
        return { imported: 0, skipped: 0, errors: 0 };
      }

      const constrColsResult = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
      `, [xtfSchemaName, tableName]);
      const constrCols = constrColsResult.rows.map(r => r.column_name.toLowerCase());

      const nonGeomConstrCols = constrColsResult.rows
        .map(r => r.column_name)
        .filter(name => {
          const lower = name.toLowerCase();
          return lower !== 'geometria' && lower !== 'geometry';
        });
      const originalDataExpr = nonGeomConstrCols.length > 0
        ? `jsonb_build_object(${nonGeomConstrCols.map(name => `'${name}', t."${name}"`).join(', ')})`
        : `'{}'::jsonb`;
      
      const constrXtfIdCol = constrCols.includes('t_ili_tid') ? 't_ili_tid' : (constrCols.includes('tid') ? 'tid' : (constrCols.includes('t_id') ? 't_id' : null));
      const constrXtfId = constrXtfIdCol ? `t.${constrXtfIdCol}::varchar` : `'construccion_' || row_number() OVER()`;
      const constrGeometry = constrCols.includes('geometria') ? 'geometria' : (constrCols.includes('geometry') ? 'geometry' : 'NULL');
      const constrArea = constrCols.includes('area_construida') ? 'area_construida' : '0';
      const constrTipo = constrCols.includes('tipo_construccion') ? 'tipo_construccion' : `'NO_ESPECIFICADO'`;
      const constrUso = constrCols.includes('uso_construccion') ? 'uso_construccion' : `'NO_ESPECIFICADO'`;
      const constrPisos = constrCols.includes('numero_pisos') ? 'numero_pisos' : '1';

      const colUebaunitExists = schemaInfo.tables.some(t => t.table_name === 'col_uebaunit');
      let joinQuery = '';
      if (colUebaunitExists) {
        const colUebaunitColsResult = await query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = 'col_uebaunit'
        `, [xtfSchemaName]);
        const colUebaunitCols = colUebaunitColsResult.rows.map(r => r.column_name.toLowerCase());
        const constrCol = colUebaunitCols.find(c => c.startsWith('ue_') && (c.includes('construccion') || c.includes('unidadconstruccion'))) || 'ue_cr_unidadconstruccion';
        
        const predioColsResult = await query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2
        `, [xtfSchemaName, schemaInfo.tableMapping.predio]);
        const predioCols = predioColsResult.rows.map(r => r.column_name.toLowerCase());

        const predioXtfIdParts = [];
        if (predioCols.includes('t_ili_tid')) predioXtfIdParts.push('pr.t_ili_tid::varchar');
        if (predioCols.includes('tid')) predioXtfIdParts.push('pr.tid');
        if (predioCols.includes('t_id')) predioXtfIdParts.push('pr.t_id::varchar');
        const predioXtfIdExpr = predioXtfIdParts.length > 0 ? `COALESCE(${predioXtfIdParts.join(', ')})` : 'NULL';

        joinQuery = `
          LEFT JOIN "${xtfSchemaName}".col_uebaunit rel ON rel."${constrCol}" = t.t_id
          LEFT JOIN "${xtfSchemaName}"."${schemaInfo.tableMapping.predio}" pr ON rel.baunit = pr.t_id
          LEFT JOIN predios_xtf p ON p.xtf_id = ${predioXtfIdExpr} AND p.xtf_schema = $1::varchar
        `;
      } else {
        joinQuery = `
          LEFT JOIN predios_xtf p ON p.xtf_schema = $1::varchar
        `;
      }

      const importQuery = `
        INSERT INTO construcciones_xtf (
          xtf_id, predio_id, area_construida, tipo_construccion, uso_construccion,
          numero_pisos, geometry, xtf_schema, xtf_original_data
        )
        SELECT 
          ${constrXtfId} as xtf_id,
          p.id as predio_id,
          COALESCE(${constrArea}, 0) as area_construida,
          ${constrTipo} as tipo_construccion,
          ${constrUso} as uso_construccion,
          COALESCE(${constrPisos}, 1) as numero_pisos,
          ${constrGeometry !== 'NULL' ? `ST_GeometryN(ST_CollectionExtract(ST_CurveToLine(ST_Force2D(t."${constrGeometry}")), 3), 1)` : 'NULL::geometry'} as geometry,
          $1::varchar as xtf_schema,
          ${originalDataExpr} as xtf_original_data
        FROM "${xtfSchemaName}"."${tableName}" t
        ${joinQuery}
        ${constrXtfIdCol ? `WHERE NOT EXISTS (
          SELECT 1 FROM construcciones_xtf c 
          WHERE c.xtf_id = t.${constrXtfIdCol}::varchar AND c.xtf_schema = $1::varchar
        )` : ''}
        ON CONFLICT (xtf_schema, xtf_id) DO NOTHING
      `;

      await query(importQuery, [xtfSchemaName]);
      
      const countResult = await query(`
        SELECT COUNT(*) as total 
        FROM construcciones_xtf 
        WHERE xtf_schema = $1
      `, [xtfSchemaName]);

      return {
        imported: parseInt(countResult.rows[0].total),
        skipped: 0,
        errors: 0
      };

    } catch (error) {
      console.error('Error importando construcciones:', error);
      return {
        imported: 0,
        skipped: 0,
        errors: 1,
        error_message: error.message
      };
    }
  }

  // Crear índices de integración
  async createIntegrationIndexes() {
    const { query } = db;
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_predios_xtf_xtf_id ON predios_xtf(xtf_id)',
      'CREATE INDEX IF NOT EXISTS idx_predios_xtf_npn ON predios_xtf(npn)',
      'CREATE INDEX IF NOT EXISTS idx_predios_xtf_municipio ON predios_xtf(municipio)',
      'CREATE INDEX IF NOT EXISTS idx_predios_xtf_geometry ON predios_xtf USING GIST(geometry)',
      'CREATE INDEX IF NOT EXISTS idx_terrenos_xtf_predio_id ON terrenos_xtf(predio_id)',
      'CREATE INDEX IF NOT EXISTS idx_construcciones_xtf_predio_id ON construcciones_xtf(predio_id)',
      'CREATE INDEX IF NOT EXISTS idx_xtf_integration_metadata_schema ON xtf_integration_metadata(xtf_schema)'
    ];

    for (const indexQuery of indexes) {
      try {
        await query(indexQuery);
      } catch (error) {
        console.warn('Error creando índice:', error.message);
      }
    }
  }

  // Crear vistas unificadas
  async createUnifiedViews(xtfSchemaName) {
    const { query } = db;
    
    // Vista unificada de predios (aplicación + XTF)
    await query(`
      CREATE OR REPLACE VIEW predios_unified AS
      SELECT 
        'app' as source,
        id,
        npn,
        municipio,
        zona,
        sector,
        numero_ficha,
        area_hectareas,
        tipo_predio,
        uso_predio,
        propietario_nombre,
        propietario_documento,
        propietario_tipo_documento,
        estado,
        geometry,
        created_at,
        updated_at
      FROM predios
      UNION ALL
      SELECT 
        'xtf' as source,
        id,
        npn,
        municipio,
        zona,
        sector,
        numero_ficha,
        area_hectareas,
        tipo_predio,
        uso_predio,
        propietario_nombre,
        propietario_documento,
        propietario_tipo_documento,
        estado,
        geometry,
        created_at,
        updated_at
      FROM predios_xtf
      WHERE xtf_schema = '${xtfSchemaName}'
    `);

    // Vista de estadísticas unificadas
    await query(`
      CREATE OR REPLACE VIEW predios_stats_unified AS
      SELECT 
        'Total Aplicación' as categoria,
        COUNT(*) as cantidad,
        SUM(area_hectareas) as area_total,
        AVG(area_hectareas) as area_promedio
      FROM predios
      UNION ALL
      SELECT 
        'Total XTF' as categoria,
        COUNT(*) as cantidad,
        SUM(area_hectareas) as area_total,
        AVG(area_hectareas) as area_promedio
      FROM predios_xtf
      WHERE xtf_schema = '${xtfSchemaName}'
      UNION ALL
      SELECT 
        'Total Unificado' as categoria,
        COUNT(*) as cantidad,
        SUM(area_hectareas) as area_total,
        AVG(area_hectareas) as area_promedio
      FROM predios_unified
    `);
  }

  // Obtener estadísticas de integración
  async getIntegrationStats(xtfSchemaName) {
    const { query } = db;
    
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM predios_xtf WHERE xtf_schema = $1) as predios_xtf,
        (SELECT COUNT(*) FROM terrenos_xtf WHERE xtf_schema = $1) as terrenos_xtf,
        (SELECT COUNT(*) FROM construcciones_xtf WHERE xtf_schema = $1) as construcciones_xtf,
        (SELECT COUNT(*) FROM predios) as predios_app,
        (SELECT COUNT(*) FROM predios_unified) as predios_total
    `, [xtfSchemaName]);

    return stats.rows[0];
  }

  // Limpiar integración (eliminar datos XTF del schema principal)
  async cleanIntegration(xtfSchemaName) {
    const { query } = db;
    
    try {
      // Eliminar datos XTF del schema principal
      await query('DELETE FROM construcciones_xtf WHERE xtf_schema = $1', [xtfSchemaName]);
      await query('DELETE FROM terrenos_xtf WHERE xtf_schema = $1', [xtfSchemaName]);
      await query('DELETE FROM predios_xtf WHERE xtf_schema = $1', [xtfSchemaName]);
      await query('DELETE FROM xtf_integration_metadata WHERE xtf_schema = $1', [xtfSchemaName]);
      
      return { success: true, message: 'Integración limpiada exitosamente' };
      
    } catch (error) {
      throw new Error(`Error limpiando integración: ${error.message}`);
    }
  }
}

module.exports = new XTFIntegrationService();
