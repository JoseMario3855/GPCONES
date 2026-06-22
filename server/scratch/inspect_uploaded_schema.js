const { query } = require('../config/database');

async function main() {
  const schema = 'xtf_1781275955487';
  console.log(`=== Inspecting schema: ${schema} ===`);
  
  try {
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1
      ORDER BY table_name
    `, [schema]);
    console.log('Tables:', tables.rows.map(x => x.table_name));

    for (const table of tables.rows.map(x => x.table_name)) {
      const countRes = await query(`SELECT COUNT(*) as cnt FROM "${schema}"."${table}"`);
      console.log(`Table: ${table} - Count: ${countRes.rows[0].cnt}`);
    }
  } catch (e) {
    console.error('Error inspecting schema:', e.message);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
