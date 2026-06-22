const { query } = require('../config/database');

async function main() {
  const r = await query(`
    SELECT t_id, local_id FROM modelo_interno_import.cr_terreno
    ORDER BY local_id
  `);
  console.log('=== All 56 Terrains in cr_terreno ===');
  r.rows.forEach((row, i) => console.log(`${i+1}. t_id: ${row.t_id}, local_id: ${row.local_id}`));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
