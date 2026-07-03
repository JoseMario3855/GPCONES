const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from both workspace root and server folders
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const { query } = require('../server/config/database');

async function getGeometryColumn(schemaName, tableName) {
  const result = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = $1 AND table_name = $2 
      AND (udt_name = 'geometry' OR data_type = 'USER-DEFINED')
    LIMIT 1
  `, [schemaName, tableName]);

  return result.rows[0]?.column_name || null;
}

async function tableExists(schemaName, tableName) {
  const result = await query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = $1 AND table_name = $2
    )
  `, [schemaName, tableName]);
  return result.rows[0].exists;
}

async function run() {
  const args = process.argv.slice(2);
  const schemaName = args[0];

  if (!schemaName) {
    console.error('❌ Error: Debes especificar el nombre del esquema catastral como argumento.');
    console.log('Ejemplo: node database/update_geometries_gdb.js excel_8fadeac8_d9f1_4b4a_8366_76df6fc53a1e_1782502004430');
    process.exit(1);
  }

  console.log(`🚀 [GDB GEOMETRY UPDATE] Iniciando actualización para el esquema: ${schemaName}`);

  try {
    // 1. Validar existencia del esquema
    const schemaExists = await query(`
      SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1
    `, [schemaName]);

    if (schemaExists.rows.length === 0) {
      console.error(`❌ Error: El esquema "${schemaName}" no existe en la base de datos.`);
      process.exit(1);
    }

    // Detectar si el esquema es estándar (lc_) o intercambio (ilc_)
    const isStandard = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = 'lc_predio'
      )
    `, [schemaName]).then(res => res.rows[0].exists);

    const tableTerreno = isStandard ? 'lc_terreno' : 'cr_terreno';
    const tablePredio = isStandard ? 'lc_predio' : 'ilc_predio';
    const npnColumn = isStandard ? 'numero_predial' : 'numero_predial_nacional';
    const linkCol = isStandard ? 'ue_lc_terreno' : 'ue_cr_terreno';

    console.log(`📊 Esquema identificado como LADM-COL Estándar: ${isStandard}`);

    const layers = [
      { name: 'u_terreno', desc: 'Urbana (U_TERRENO)' },
      { name: 'r_terreno', desc: 'Rural (R_TERRENO)' }
    ];

    let totalUpdated = 0;

    for (const layer of layers) {
      const { name: tableName, desc } = layer;
      const exists = await tableExists(schemaName, tableName);

      if (!exists) {
        console.log(`⚠️ Capa ${desc} [${tableName}] no encontrada en el esquema. Se omitirá.`);
        continue;
      }

      const geomCol = await getGeometryColumn(schemaName, tableName);
      if (!geomCol) {
        console.error(`❌ Error: No se pudo identificar una columna de geometría en la tabla "${tableName}".`);
        continue;
      }

      console.log(`🔍 Capa ${desc} encontrada. Columna de geometría identificada: "${geomCol}"`);

      // Ejecutar la actualización de geometrías
      // Nota: Hacemos cast a la geometría temporal ST_Transform(ST_CurveToLine(geom), SRID_INTERNO)
      // El SRID por defecto para modelo interno es 3116 o 9377. 
      // Si la geometría de la GDB importada ya está en el SRID destino, la copiamos directamente.
      // Si requiere transformación espacial, el usuario puede ajustarlo, pero aquí usaremos ST_Force3D y ST_Transform al SRID del terreno.
      
      // Obtener el SRID de la columna geométrica destino
      const sridRes = await query(`
        SELECT Find_SRID($1, $2, 'geometria')
      `, [schemaName, tableTerreno]);
      const targetSrid = sridRes.rows[0]?.find_srid || 3116;
      console.log(`🎯 SRID destino para el esquema catastral: ${targetSrid}`);

      const updateQuery = `
        UPDATE "${schemaName}"."${tableTerreno}" t
        SET geometria = ST_Force3D(ST_Transform(ST_CurveToLine(gdb."${geomCol}"), $1))
        FROM "${schemaName}"."${tableName}" gdb
        JOIN "${schemaName}"."${tablePredio}" p ON p."${npnColumn}" = gdb."CODIGO"
        JOIN "${schemaName}".col_uebaunit u ON u.baunit = p.t_id
        WHERE u."${linkCol}" = t.t_id AND gdb."${geomCol}" IS NOT NULL
      `;

      const updateResult = await query(updateQuery, [targetSrid]);
      console.log(`✅ Capa ${desc}: Se actualizaron las geometrías de ${updateResult.rowCount} terrenos.`);
      totalUpdated += updateResult.rowCount;
    }

    console.log(`\n🎉 [GDB GEOMETRY UPDATE] Proceso finalizado. Total de terrenos actualizados con geometría real: ${totalUpdated}`);

  } catch (error) {
    console.error('❌ Error ejecutando la actualización de geometrías:', error);
  } finally {
    process.exit();
  }
}

run();
