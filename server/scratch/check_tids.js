const { query } = require('../config/database');

async function main() {
  try {
    const s1 = 'modelo_interno_import';
    const s2 = 'xtf_1781275955487';
    
    const r1 = await query(`SELECT t_ili_tid FROM "${s1}".ilc_predio LIMIT 10`);
    const r2 = await query(`SELECT t_ili_tid FROM "${s2}".ilc_predio LIMIT 10`);
    
    console.log(`TIDs in ${s1}:`, r1.rows.map(r => r.t_ili_tid));
    console.log(`TIDs in ${s2}:`, r2.rows.map(r => r.t_ili_tid));
    
    const intersect = await query(`
      SELECT t_ili_tid FROM "${s1}".ilc_predio
      INTERSECT
      SELECT t_ili_tid FROM "${s2}".ilc_predio
    `);
    console.log('Intersection count:', intersect.rows.length);
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
