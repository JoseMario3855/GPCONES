const { query } = require('../config/database');

async function main() {
  console.log('=== Inspecting constraints on integration tables ===');
  try {
    const res = await query(`
      SELECT 
        conname AS constraint_name, 
        conrelid::regclass AS table_name, 
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' 
        AND conrelid::regclass::text IN ('predios_xtf', 'terrenos_xtf', 'construcciones_xtf')
      ORDER BY table_name, constraint_name
    `);
    
    res.rows.forEach(r => {
      console.log(`Table: ${r.table_name} | Name: ${r.constraint_name} | Definition: ${r.constraint_definition}`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
