const { query } = require('../config/database');

async function main() {
  try {
    const s1 = 'modelo_interno_import';
    const s2 = 'xtf_1781275955487';
    
    const r1 = await query(`SELECT xtf_id, predio_id FROM terrenos_xtf WHERE xtf_schema = $1 LIMIT 5`, [s1]);
    const r2 = await query(`SELECT t_id, local_id FROM "${s2}".cr_terreno LIMIT 5`);
    
    console.log(`Integrated terrains in ${s1}:`, r1.rows);
    console.log(`Source terrains in ${s2}:`, r2.rows);

    const checkNull = await query(`SELECT count(*) as total, count(predio_id) as with_predio FROM terrenos_xtf WHERE xtf_schema = $1`, [s2]);
    console.log(`Integrated terrains in ${s2} stats:`, checkNull.rows[0]);
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
