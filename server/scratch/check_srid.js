const { query } = require('../config/database');

async function main() {
  console.log('=== Checking geometry SRIDs ===');
  try {
    const sridPredios = await query(`
      SELECT f_table_name, f_geometry_column, srid, type 
      FROM geometry_columns 
      WHERE f_table_schema = 'public' AND f_table_name IN ('predios', 'predios_xtf', 'terrenos_xtf', 'construcciones_xtf')
    `);
    console.log(sridPredios.rows);
  } catch (e) {
    console.error('Error querying geometry_columns:', e.message);
  }
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
