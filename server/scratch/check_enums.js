const { query } = require('../config/database');

async function main() {
  const schema = 'modelo_interno_import';
  console.log(`=== Inspecting enum/lookup tables in ${schema} ===`);

  const tablesRes = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = $1
      AND (table_name LIKE '%tipo%' 
        OR table_name LIKE '%condicion%' 
        OR table_name LIKE '%destinacion%' 
        OR table_name LIKE '%documento%' 
        OR table_name LIKE '%sexo%'
        OR table_name LIKE '%clase%'
        OR table_name LIKE '%uso%'
        OR table_name LIKE '%interesado%')
    ORDER BY table_name
  `, [schema]);

  console.log('Lookup tables found:', tablesRes.rows.map(r => r.table_name));

  for (const row of tablesRes.rows) {
    const table = row.table_name;
    try {
      const dataRes = await query(`SELECT * FROM ${schema}.${table} LIMIT 10`);
      console.log(`\nTable: ${table} (Total rows: ${dataRes.rows.length})`);
      if (dataRes.rows.length > 0) {
        console.log(dataRes.rows);
      }
    } catch (err) {
      console.error(`Error reading ${table}:`, err.message);
    }
  }

  process.exit(0);
}

main();
