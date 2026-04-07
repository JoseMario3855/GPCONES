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
      
      const { query } = db;
      
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

    // Obtener información de columnas para tablas principales
    const mainTables = ['LC_Predio', 'LC_Terreno', 'LC_Construccion', 'LC_Servidumbre'];
    
    for (const tableName of mainTables) {
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
        
        info[tableName.toLowerCase()] = {
          exists: true,
          columns: columnsResult.rows
        };
      } else {
        info[tableName.toLowerCase()] = { exists: false, columns: [] };
      }
    }

    return info;
  }

  // Mapear tablas XTF a tablas de aplicación
  async mapXTFToApplicationTables(xtfSchemaName, xtfInfo) {
    const mapping = {
      'LC_Predio': 'predios',
      'LC_Terreno': 'terrenos',
      'LC_Construccion': 'construcciones',
      'LC_Servidumbre': 'servidumbres'
    };

    const result = {};
    
    for (const [xtfTable, appTable] of Object.entries(mapping)) {
      const xtfTableInfo = xtfInfo[xtfTable.toLowerCase()];
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
        xtf_id VARCHAR(255) UNIQUE,
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de integración de terrenos
    await query(`
      CREATE TABLE IF NOT EXISTS terrenos_xtf (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        xtf_id VARCHAR(255) UNIQUE,
        predio_id UUID REFERENCES predios_xtf(id),
        area_hectareas DECIMAL(15,2),
        tipo_terreno VARCHAR(50),
        uso_terreno VARCHAR(50),
        geometry GEOMETRY(POLYGON, 3116),
        xtf_schema VARCHAR(100),
        xtf_original_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de integración de construcciones
    await query(`
      CREATE TABLE IF NOT EXISTS construcciones_xtf (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        xtf_id VARCHAR(255) UNIQUE,
        predio_id UUID REFERENCES predios_xtf(id),
        area_construida DECIMAL(15,2),
        tipo_construccion VARCHAR(50),
        uso_construccion VARCHAR(50),
        numero_pisos INTEGER,
        geometry GEOMETRY(POLYGON, 3116),
        xtf_schema VARCHAR(100),
        xtf_original_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
      // Verificar si existe la tabla LC_Predio en el schema XTF
      const tableExists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'LC_Predio'
        )
      `, [xtfSchemaName]);

      if (!tableExists.rows[0].exists) {
        return { imported: 0, skipped: 0, errors: 0 };
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
          COALESCE(tid, 'xtf_' || row_number() OVER()) as xtf_id,
          COALESCE(npn, 'NPN_' || row_number() OVER()) as npn,
          COALESCE(municipio, 'Sin Municipio') as municipio,
          zona,
          sector,
          numero_ficha,
          COALESCE(area_hectareas, 0) as area_hectareas,
          COALESCE(tipo_predio, 'NO_ESPECIFICADO') as tipo_predio,
          COALESCE(uso_predio, 'NO_ESPECIFICADO') as uso_predio,
          propietario_nombre,
          propietario_documento,
          COALESCE(propietario_tipo_documento, 'CC') as propietario_tipo_documento,
          geometry,
          $1 as xtf_schema,
          to_jsonb(t.*) as xtf_original_data
        FROM "${xtfSchemaName}".LC_Predio t
        WHERE NOT EXISTS (
          SELECT 1 FROM predios_xtf p 
          WHERE p.xtf_id = COALESCE(t.tid, 'xtf_' || row_number() OVER())
        )
        ON CONFLICT (xtf_id) DO NOTHING
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
      const tableExists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'LC_Terreno'
        )
      `, [xtfSchemaName]);

      if (!tableExists.rows[0].exists) {
        return { imported: 0, skipped: 0, errors: 0 };
      }

      const importQuery = `
        INSERT INTO terrenos_xtf (
          xtf_id, predio_id, area_hectareas, tipo_terreno, uso_terreno,
          geometry, xtf_schema, xtf_original_data
        )
        SELECT 
          COALESCE(t.tid, 'terreno_' || row_number() OVER()) as xtf_id,
          p.id as predio_id,
          COALESCE(t.area_hectareas, 0) as area_hectareas,
          COALESCE(t.tipo_terreno, 'NO_ESPECIFICADO') as tipo_terreno,
          COALESCE(t.uso_terreno, 'NO_ESPECIFICADO') as uso_terreno,
          t.geometry,
          $1 as xtf_schema,
          to_jsonb(t.*) as xtf_original_data
        FROM "${xtfSchemaName}".LC_Terreno t
        LEFT JOIN predios_xtf p ON p.xtf_schema = $1
        WHERE NOT EXISTS (
          SELECT 1 FROM terrenos_xtf tr 
          WHERE tr.xtf_id = COALESCE(t.tid, 'terreno_' || row_number() OVER())
        )
        ON CONFLICT (xtf_id) DO NOTHING
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
      const tableExists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'LC_Construccion'
        )
      `, [xtfSchemaName]);

      if (!tableExists.rows[0].exists) {
        return { imported: 0, skipped: 0, errors: 0 };
      }

      const importQuery = `
        INSERT INTO construcciones_xtf (
          xtf_id, predio_id, area_construida, tipo_construccion, uso_construccion,
          numero_pisos, geometry, xtf_schema, xtf_original_data
        )
        SELECT 
          COALESCE(t.tid, 'construccion_' || row_number() OVER()) as xtf_id,
          p.id as predio_id,
          COALESCE(t.area_construida, 0) as area_construida,
          COALESCE(t.tipo_construccion, 'NO_ESPECIFICADO') as tipo_construccion,
          COALESCE(t.uso_construccion, 'NO_ESPECIFICADO') as uso_construccion,
          COALESCE(t.numero_pisos, 1) as numero_pisos,
          t.geometry,
          $1 as xtf_schema,
          to_jsonb(t.*) as xtf_original_data
        FROM "${xtfSchemaName}".LC_Construccion t
        LEFT JOIN predios_xtf p ON p.xtf_schema = $1
        WHERE NOT EXISTS (
          SELECT 1 FROM construcciones_xtf c 
          WHERE c.xtf_id = COALESCE(t.tid, 'construccion_' || row_number() OVER())
        )
        ON CONFLICT (xtf_id) DO NOTHING
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
      WHERE xtf_schema = $1
    `, [xtfSchemaName]);

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
      WHERE xtf_schema = $1
      UNION ALL
      SELECT 
        'Total Unificado' as categoria,
        COUNT(*) as cantidad,
        SUM(area_hectareas) as area_total,
        AVG(area_hectareas) as area_promedio
      FROM predios_unified
    `, [xtfSchemaName]);
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
      
      // Eliminar vistas unificadas
      await query('DROP VIEW IF EXISTS predios_unified');
      await query('DROP VIEW IF EXISTS predios_stats_unified');
      
      return { success: true, message: 'Integración limpiada exitosamente' };
      
    } catch (error) {
      throw new Error(`Error limpiando integración: ${error.message}`);
    }
  }
}

module.exports = new XTFIntegrationService();
