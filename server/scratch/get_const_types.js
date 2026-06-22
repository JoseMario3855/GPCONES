const { query } = require('../config/database');

async function main() {
  const schema = 'modelo_interno_import';
  const tables = ['cr_unidadconstrucciontipo', 'cr_usouconstipo'];
  
  for (const table of tables) {
    try {
      const res = await query(`SELECT t_id, dispname, ilicode FROM ${schema}.${table} ORDER BY t_id`);
      console.log(`\nTable: ${table}`);
      res.rows.forEach(r => console.log(`  t_id: ${r.t_id}, ilicode: ${r.ilicode}, dispname: ${r.dispname}`));
    } catch (e) {
      console.error(e.message);
    }
  }
  process.exit(0);
}

main();
