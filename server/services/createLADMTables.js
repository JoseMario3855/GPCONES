// Servicio para crear tablas básicas del modelo LADM-COL cuando ili2pg no está disponible
const { query } = require('../config/database');

/**
 * Crea las tablas básicas del modelo LADM-COL en un schema
 * Esta es una implementación básica cuando ili2pg no está disponible
 */
async function createBasicLADMTables(schemaName) {
  try {
    console.log(`Creando tablas básicas LADM-COL en schema: ${schemaName}`);

    // Tablas principales del modelo LADM-COL
    const tables = [
      // Tabla de Predios (BAUNIT)
      `CREATE TABLE IF NOT EXISTS "${schemaName}".lc_predio (
        t_id BIGSERIAL PRIMARY KEY,
        t_ili_tid VARCHAR(200) UNIQUE,
        t_seq BIGINT,
        tipo VARCHAR(50),
        nombre VARCHAR(255),
        comienzo_vida_util_version VARCHAR(50),
        fin_vida_util_version VARCHAR(50),
        espacio_de_nombres VARCHAR(255),
        local_id VARCHAR(255)
      )`,

      // Tabla de Terrenos (LC_PLOT)
      `CREATE TABLE IF NOT EXISTS "${schemaName}".lc_terreno (
        t_id BIGSERIAL PRIMARY KEY,
        t_ili_tid VARCHAR(200) UNIQUE,
        t_seq BIGINT,
        dimension INTEGER,
        etiqueta VARCHAR(255),
        relacion_superficie VARCHAR(50),
        area_calculada DECIMAL(15,2),
        area_geometria DECIMAL(15,2),
        area_texto DECIMAL(15,2),
        comienzo_vida_util_version VARCHAR(50),
        fin_vida_util_version VARCHAR(50),
        espacio_de_nombres VARCHAR(255),
        local_id VARCHAR(255),
        geometria GEOMETRY(MULTIPOLYGON, 3116)
      )`,

      // Tabla de Construcciones (LC_BUILDING)
      `CREATE TABLE IF NOT EXISTS "${schemaName}".lc_construccion (
        t_id BIGSERIAL PRIMARY KEY,
        t_ili_tid VARCHAR(200) UNIQUE,
        t_seq BIGINT,
        unidad_construccion VARCHAR(50),
        planta_o_nivel VARCHAR(255),
        comienzo_vida_util_version VARCHAR(50),
        fin_vida_util_version VARCHAR(50),
        espacio_de_nombres VARCHAR(255),
        local_id VARCHAR(255),
        geometria GEOMETRY(MULTIPOLYGON, 3116)
      )`,

      // Tabla de Personas (LC_PARTY)
      `CREATE TABLE IF NOT EXISTS "${schemaName}".lc_persona (
        t_id BIGSERIAL PRIMARY KEY,
        t_ili_tid VARCHAR(200) UNIQUE,
        t_seq BIGINT,
        tipo VARCHAR(50),
        genero VARCHAR(50),
        etnia VARCHAR(50),
        nombre VARCHAR(255),
        primer_apellido VARCHAR(255),
        segundo_apellido VARCHAR(255),
        razon_social VARCHAR(255),
        documento_identidad VARCHAR(50),
        comienzo_vida_util_version VARCHAR(50),
        fin_vida_util_version VARCHAR(50),
        espacio_de_nombres VARCHAR(255),
        local_id VARCHAR(255)
      )`,

      // Tabla de Derechos (LC_RIGHT)
      `CREATE TABLE IF NOT EXISTS "${schemaName}".lc_derecho (
        t_id BIGSERIAL PRIMARY KEY,
        t_ili_tid VARCHAR(200) UNIQUE,
        t_seq BIGINT,
        tipo VARCHAR(50),
        fraccion_derecho VARCHAR(50),
        comienzo_vida_util_version VARCHAR(50),
        fin_vida_util_version VARCHAR(50),
        espacio_de_nombres VARCHAR(255),
        local_id VARCHAR(255)
      )`,

      // Tabla de Restricciones (LC_RESTRICTION)
      `CREATE TABLE IF NOT EXISTS "${schemaName}".lc_restriccion (
        t_id BIGSERIAL PRIMARY KEY,
        t_ili_tid VARCHAR(200) UNIQUE,
        t_seq BIGINT,
        tipo VARCHAR(50),
        descripcion TEXT,
        comienzo_vida_util_version VARCHAR(50),
        fin_vida_util_version VARCHAR(50),
        espacio_de_nombres VARCHAR(255),
        local_id VARCHAR(255),
        geometria GEOMETRY(MULTIPOLYGON, 3116)
      )`
    ];

    // Crear tablas
    let tablesCreated = 0;
    for (const tableSQL of tables) {
      try {
        await query(tableSQL);
        tablesCreated++;
        console.log(`Tabla creada: ${tableSQL.match(/CREATE TABLE.*?"(\w+)"/i)?.[1] || 'desconocida'}`);
      } catch (error) {
        console.error(`Error creando tabla: ${error.message}`);
        // Continuar con las demás tablas
      }
    }

    // Crear índices espaciales
    const spatialIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_lc_terreno_geometria ON "${schemaName}".lc_terreno USING GIST(geometria)`,
      `CREATE INDEX IF NOT EXISTS idx_lc_construccion_geometria ON "${schemaName}".lc_construccion USING GIST(geometria)`,
      `CREATE INDEX IF NOT EXISTS idx_lc_restriccion_geometria ON "${schemaName}".lc_restriccion USING GIST(geometria)`
    ];

    for (const indexSQL of spatialIndexes) {
      try {
        await query(indexSQL);
      } catch (error) {
        console.warn(`Error creando índice espacial: ${error.message}`);
      }
    }

    console.log(`Tablas básicas LADM-COL creadas: ${tablesCreated} tablas`);

    return {
      success: true,
      tablesCreated: tablesCreated,
      message: `Se crearon ${tablesCreated} tablas básicas del modelo LADM-COL`
    };

  } catch (error) {
    console.error('Error creando tablas básicas LADM-COL:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  createBasicLADMTables
};

