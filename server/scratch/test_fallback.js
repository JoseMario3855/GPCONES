const { query } = require('../config/database');

async function main() {
  const xtfSchemaName = 'modelo_interno_import';
  const terrainTableName = 'cr_terreno';
  const constructionTableName = 'cr_unidadconstruccion';
  const copropiedadTableName = 'cr_predio_copropiedad';
  
  const npnCol = 'numero_predial_nacional';
  const terrainCol = 'ue_cr_terreno';
  const constrCol = 'ue_cr_unidadconstruccion';
  
  const geometryCol = 'geometria';
  const constGeomCol = 'geometria';

  // Build the fallback select query
  const testQuery = `
    SELECT 
      t.t_id, 
      t.local_id, 
      t.numero_predial_nacional,
      -- direct
      (SELECT "${geometryCol}" FROM "${xtfSchemaName}"."${terrainTableName}" WHERE t_id = (SELECT "${terrainCol}" FROM "${xtfSchemaName}".col_uebaunit WHERE baunit = t.t_id LIMIT 1) LIMIT 1) IS NOT NULL as has_direct,
      -- matrix
      (SELECT "${geometryCol}" FROM "${xtfSchemaName}"."${terrainTableName}" WHERE t_id = (SELECT "${terrainCol}" FROM "${xtfSchemaName}".col_uebaunit WHERE baunit = (SELECT matriz FROM "${xtfSchemaName}"."${copropiedadTableName}" WHERE unidad_predial = t.t_id LIMIT 1) LIMIT 1) LIMIT 1) IS NOT NULL as has_matrix,
      -- prefix
      (SELECT "${geometryCol}" FROM "${xtfSchemaName}"."${terrainTableName}" WHERE SUBSTRING(local_id, 1, 21) = SUBSTRING(t.${npnCol}, 1, 21) ORDER BY t_id LIMIT 1) IS NOT NULL as has_prefix,
      -- construction
      (SELECT "${constGeomCol}" FROM "${xtfSchemaName}"."${constructionTableName}" WHERE t_id = (SELECT "${constrCol}" FROM "${xtfSchemaName}".col_uebaunit WHERE baunit = t.t_id LIMIT 1) LIMIT 1) IS NOT NULL as has_const,
      
      -- combined geometry
      ST_AsText(ST_GeometryN(ST_CollectionExtract(ST_CurveToLine(ST_Force2D(COALESCE(
        (SELECT "${geometryCol}" FROM "${xtfSchemaName}"."${terrainTableName}" WHERE t_id = (SELECT "${terrainCol}" FROM "${xtfSchemaName}".col_uebaunit WHERE baunit = t.t_id LIMIT 1) LIMIT 1),
        (SELECT "${geometryCol}" FROM "${xtfSchemaName}"."${terrainTableName}" WHERE t_id = (SELECT "${terrainCol}" FROM "${xtfSchemaName}".col_uebaunit WHERE baunit = (SELECT matriz FROM "${xtfSchemaName}"."${copropiedadTableName}" WHERE unidad_predial = t.t_id LIMIT 1) LIMIT 1) LIMIT 1),
        (SELECT "${geometryCol}" FROM "${xtfSchemaName}"."${terrainTableName}" WHERE SUBSTRING(local_id, 1, 21) = SUBSTRING(t.${npnCol}, 1, 21) ORDER BY t_id LIMIT 1),
        (SELECT "${constGeomCol}" FROM "${xtfSchemaName}"."${constructionTableName}" WHERE t_id = (SELECT "${constrCol}" FROM "${xtfSchemaName}".col_uebaunit WHERE baunit = t.t_id LIMIT 1) LIMIT 1)
      ))), 3), 1)) as final_geom
    FROM "${xtfSchemaName}".ilc_predio t
  `;

  const r = await query(testQuery);
  console.log(`=== Test Results for ${r.rows.length} Predios ===`);
  
  let withGeomCount = 0;
  let directCount = 0;
  let matrixCount = 0;
  let prefixCount = 0;
  let constCount = 0;

  r.rows.forEach(row => {
    if (row.final_geom) withGeomCount++;
    if (row.has_direct) directCount++;
    if (row.has_matrix) matrixCount++;
    if (row.has_prefix) prefixCount++;
    if (row.has_const) constCount++;
  });

  console.log('Total predios with direct geom:', directCount);
  console.log('Total predios with matrix geom:', matrixCount);
  console.log('Total predios with prefix geom:', prefixCount);
  console.log('Total predios with const geom:', constCount);
  console.log('Total predios with final geom (after COALESCE):', withGeomCount);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
