const iliService = require('../services/iliService');
const igacExcelImporterService = require('../services/igacExcelImporterService');
const xtfIntegrationService = require('../services/xtfIntegrationService');
const { query } = require('../config/database');
const path = require('path');

async function main() {
  console.log('=== Starting IGAC Excel Importer Integration Test ===');
  
  // 1. Get a valid municipality
  const muniResult = await query('SELECT id, nombre FROM municipios LIMIT 1');
  if (muniResult.rows.length === 0) {
    console.error('❌ No municipality found in database. Please seed municipios first.');
    process.exit(1);
  }
  const muni = muniResult.rows[0];
  console.log(`📍 Using municipality: ${muni.nombre} (ID: ${muni.id})`);

  // 2. Generate schema name
  const schemaName = `excel_test_${Date.now()}`;
  console.log(`🏢 Target schema name: ${schemaName}`);

  // 3. Create schema from model
  console.log('🔨 Creating LADM-COL schema tables...');
  const schemaRes = await iliService.createSchemaFromModel('modelo-interno', schemaName);
  if (!schemaRes.success) {
    console.error('❌ Failed to create schema:', schemaRes.error);
    process.exit(1);
  }
  console.log('✅ Schema tables successfully created!');

  // 4. Import the actual Excel file
  const excelPath = 'C:/VictorManuel/GPCONES1/IGAC_R1_R2_Belen_de_los_Andaquies_18094 (1).xlsx';
  console.log(`📂 Importing Excel from: ${excelPath}`);
  
  try {
    const importRes = await igacExcelImporterService.importExcel(excelPath, schemaName);
    console.log('✅ Import process completed successfully!');
    console.log('📊 Import stats:', importRes);

    // 5. Query LADM-COL tables in target schema to verify row counts
    const tables = [
      'ilc_predio',
      'cr_terreno',
      'col_uebaunit',
      'ilc_interesado',
      'ilc_derecho',
      'col_rrrinteresado',
      'ilc_caracteristicasunidadconstruccion',
      'cr_unidadconstruccion'
    ];

    console.log('\n=== Verifying table counts in imported schema ===');
    for (const table of tables) {
      const countRes = await query(`SELECT COUNT(*) as count FROM "${schemaName}"."${table}"`);
      console.log(`  Table: ${table} -> ${countRes.rows[0].count} rows`);
    }

    // 6. Verify sample values
    console.log('\n=== Checking sample predio values ===');
    const samplePredios = await query(`
      SELECT t_id, local_id, numero_predial_nacional, departamento, municipio, area_catastral_terreno, matricula_inmobiliaria, codigo_orip
      FROM "${schemaName}".ilc_predio
      LIMIT 3
    `);
    console.log(samplePredios.rows);

    console.log('\n=== Checking sample interesado names ===');
    const sampleInteresados = await query(`
      SELECT t_id, documento_identidad, nombre, primer_nombre, primer_apellido, razon_social, tipo
      FROM "${schemaName}".ilc_interesado
      LIMIT 3
    `);
    console.log(sampleInteresados.rows);

    // 7. Test integration into main tables
    console.log('\n🔄 Testing integration into main unified tables...');
    const integrationRes = await xtfIntegrationService.integrateXTFToMainSchema(schemaName, {
      userId: '00000000-0000-0000-0000-000000000000',
      filename: 'IGAC_R1_R2_Belen_de_los_Andaquies_18094 (1).xlsx'
    });
    console.log('✅ Integration finished!', integrationRes);

    // 8. Clean up test schema
    console.log('\n🗑️ Cleaning up test schema...');
    await query(`DROP SCHEMA "${schemaName}" CASCADE`);
    await query('DELETE FROM construcciones_xtf WHERE xtf_schema = $1', [schemaName]);
    await query('DELETE FROM terrenos_xtf WHERE xtf_schema = $1', [schemaName]);
    await query('DELETE FROM predios_xtf WHERE xtf_schema = $1', [schemaName]);
    await query('DELETE FROM xtf_integration_metadata WHERE xtf_schema = $1', [schemaName]);
    console.log('✅ Cleanup complete! Test passed!');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
    try {
      await query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    } catch (dropErr) {}
    process.exit(1);
  }

  process.exit(0);
}

main();
