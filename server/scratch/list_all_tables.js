const { query } = require('../config/database');

async function main() {
  const schema = 'modelo_interno_import';
  const res = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = $1
    ORDER BY table_name
  `, [schema]);

  console.log(`=== Tables in ${schema} ===`);
  console.log(res.rows.map(r => r.table_name).join('\n'));
  process.exit(0);
}

main();
