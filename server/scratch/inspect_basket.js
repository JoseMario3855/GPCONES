const { query } = require('../config/database');

async function main() {
  const schema = 'modelo_interno_import';
  try {
    const baskets = await query(`SELECT * FROM ${schema}.t_ili2db_basket`);
    console.log('=== Baskets ===');
    console.log(baskets.rows);
  } catch (e) {
    console.error('Error baskets:', e.message);
  }

  try {
    const datasets = await query(`SELECT * FROM ${schema}.t_ili2db_dataset`);
    console.log('\n=== Datasets ===');
    console.log(datasets.rows);
  } catch (e) {
    console.error('Error datasets:', e.message);
  }

  process.exit(0);
}

main();
