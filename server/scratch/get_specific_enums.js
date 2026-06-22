const { query } = require('../config/database');

async function main() {
  const schema = 'modelo_interno_import';
  const tables = [
    'col_interesadodocumentotipo',
    'col_interesadotipo',
    'ilc_prediotipo',
    'ilc_condicionprediotipo',
    'col_estadociviltipo',
    'col_sexotipo',
    'ilc_destinaciontipo',
    'ilc_interesadotipo',
    'ilc_interesadodocumentotipo',
    'ilc_prediocondicion',
    'ilc_prediodestinacion'
  ];

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
      // ignore table not found
    }
  }

  process.exit(0);
}

main();
