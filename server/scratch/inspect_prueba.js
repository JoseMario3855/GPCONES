const { query } = require('../config/database');

async function main() {
  // Find the schema name in the database
  const rSchemas = await query(`
    SELECT schema_name FROM information_schema.schemata 
    WHERE schema_name LIKE 'test_schema_%'
    ORDER BY schema_name DESC LIMIT 1
  `);
  
  if (rSchemas.rows.length === 0) {
    console.log('No test schema found');
    process.exit(0);
  }
  
  const schema = rSchemas.rows[0].schema_name;
  console.log('Inspecting schema:', schema);
  
  const tables = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = $1
    ORDER BY table_name
  `, [schema]);
  console.log(`=== Tables in ${schema} ===`);
  console.log(tables.rows.map(x=>x.table_name));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
