const iliService = require('../services/iliService');
const { query } = require('../config/database');

async function main() {
  const schemaName = `temp_schema_${Date.now()}`;
  console.log('Creating schema:', schemaName);
  
  try {
    const res = await iliService.createSchemaFromModel('modelo-interno', schemaName);
    console.log('Schema created:', res);

    const baskets = await query(`SELECT * FROM ${schemaName}.t_ili2db_basket`);
    console.log('=== Baskets ===');
    console.log(baskets.rows);

    const datasets = await query(`SELECT * FROM ${schemaName}.t_ili2db_dataset`);
    console.log('=== Datasets ===');
    console.log(datasets.rows);

    // Drop temp schema
    await query(`DROP SCHEMA ${schemaName} CASCADE`);
    console.log('Temp schema dropped');
  } catch (err) {
    console.error('Error:', err.message);
  }

  process.exit(0);
}

main();
