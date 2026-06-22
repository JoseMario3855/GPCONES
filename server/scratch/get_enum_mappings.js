const { query } = require('../config/database');

async function main() {
  const schema = 'modelo_interno_import';
  const tables = [
    'ilc_prediotipo',
    'ilc_condicionprediotipo',
    'ilc_destinacioneconomicatipo',
    'cr_documentotipo',
    'cr_sexotipo',
    'cr_interesadotipo',
    'ilc_derechocatastraltipo'
  ];

  console.log('=== Lookup Table Contents ===');
  for (const table of tables) {
    try {
      const res = await query(`
        SELECT t_id, dispname, ilicode, itfcode
        FROM ${schema}.${table}
        ORDER BY t_id
      `);
      console.log(`\nTable: ${table}`);
      res.rows.forEach(r => console.log(`  t_id: ${r.t_id}, ilicode: ${r.ilicode}, dispname: ${r.dispname}, itfcode: ${r.itfcode}`));
    } catch (e) {
      console.error(`Error table ${table}:`, e.message);
    }
  }

  process.exit(0);
}

main();
