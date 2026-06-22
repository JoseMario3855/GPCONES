const { query } = require('../config/database');

async function main() {
  const schema = 'modelointerno';
  console.log(`=== Inspecting tables in schema: ${schema} ===`);
  
  try {
    const res = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 
      ORDER BY table_name
    `, [schema]);
    
    console.log(`Total tables: ${res.rows.length}`);
    res.rows.forEach((r, i) => {
      console.log(`${i + 1}. ${r.table_name}`);
    });
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

main();
