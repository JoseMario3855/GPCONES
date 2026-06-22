const { query } = require('../config/database');
const xtfIntegrationService = require('../services/xtfIntegrationService');

async function main() {
  console.log('=== Verifying XTF integration service geometry fallbacks ===');
  
  // 1. Clean previous imported rows for modelo_interno_import
  console.log('Cleaning previously integrated data...');
  await query("DELETE FROM construcciones_xtf WHERE xtf_schema = 'modelo_interno_import'");
  await query("DELETE FROM terrenos_xtf WHERE xtf_schema = 'modelo_interno_import'");
  await query("DELETE FROM predios_xtf WHERE xtf_schema = 'modelo_interno_import'");

  // 2. Re-run importPredios
  console.log('Running importPredios...');
  const result = await xtfIntegrationService.importPredios('modelo_interno_import');
  console.log('Import result:', result);

  // 3. Count rows and geometries
  const stats = await query(`
    SELECT COUNT(*) as total_rows, COUNT(geometry) as with_geometry 
    FROM predios_xtf 
    WHERE xtf_schema = 'modelo_interno_import'
  `);
  console.log('Integrated stats in database:', stats.rows[0]);

  if (parseInt(stats.rows[0].with_geometry) === 63) {
    console.log('✅ Success! Integrated geometries increased from 53 to 63.');
  } else {
    console.error('❌ Verification failed. Geometries count is:', stats.rows[0].with_geometry);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
