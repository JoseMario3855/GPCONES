const { query } = require('../config/database');

async function main() {
  const schema = 'modelo_interno_import';
  const tables = [
    'ilc_predio',
    'cr_terreno',
    'col_uebaunit',
    'ilc_interesado',
    'ilc_derecho',
    'cr_unidadconstruccion'
  ];

  console.log('=== Checking t_type values ===');
  for (const table of tables) {
    try {
      const res = await query(`
        SELECT t_type, count(*) as count
        FROM ${schema}.${table}
        GROUP BY t_type
      `);
      console.log(`\nTable: ${table}`);
      res.rows.forEach(r => console.log(`  t_type: "${r.t_type}" -> ${r.count} rows`));
    } catch (e) {
      console.error(e.message);
    }
  }
  process.exit(0);
}

main();
