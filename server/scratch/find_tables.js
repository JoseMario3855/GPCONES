const { query } = require('../config/database');

async function main() {
  const r = await query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name ILIKE '%grupocalificacion%' 
       OR table_name ILIKE '%grupo_calificacion%'
       OR table_name ILIKE '%calificacion%'
    ORDER BY table_schema, table_name
  `);
  console.log('Matching tables:', r.rows);
  process.exit(0);
}

main();
