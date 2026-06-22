const { query } = require('../config/database');

async function main() {
  const schema = 'xtf_1781275955487';
  console.log(`=== Inspecting geometries in schema ${schema} ===`);
  
  try {
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 AND table_name IN ('ilc_predio', 'lc_predio', 'ilc_terreno', 'lc_terreno', 'cr_terreno', 'col_uebaunit')
    `, [schema]);
    console.log('Tables found:', tables.rows.map(r => r.table_name));
  } catch (e) {
    console.error(e);
  }

  // Check terrain count and geometry presence in schema
  try {
    const terrainCount = await query(`
      SELECT COUNT(*) as total, COUNT(geometria) as with_geom 
      FROM "xtf_1781275955487"."cr_terreno"
    `);
    console.log('cr_terreno counts:', terrainCount.rows);
  } catch (e) {
    console.error('Error counting cr_terreno:', e.message);
  }

  // Check col_uebaunit links
  try {
    const uebaCount = await query(`
      SELECT COUNT(*) as total, COUNT(ue_cr_terreno) as with_terrain, COUNT(baunit) as with_baunit 
      FROM "xtf_1781275955487"."col_uebaunit"
    `);
    console.log('col_uebaunit counts:', uebaCount.rows);
  } catch (e) {
    console.error('Error counting col_uebaunit:', e.message);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
