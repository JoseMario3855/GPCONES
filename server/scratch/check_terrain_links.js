const { query } = require('../config/database');

async function main() {
  const schema = 'xtf_1781275955487';
  try {
    // Total terrains in schema
    const totTerrenos = await query(`SELECT count(*) as count FROM "${schema}".cr_terreno`);
    
    // Terrains referenced in col_uebaunit
    const linkedTerrenos = await query(`
      SELECT count(distinct ue_cr_terreno) as count 
      FROM "${schema}".col_uebaunit 
      WHERE ue_cr_terreno IS NOT NULL
    `);
    
    // Terrains that are linked to a predio that actually exists in ilc_predio
    const linkedToExistingPredio = await query(`
      SELECT count(distinct u.ue_cr_terreno) as count 
      FROM "${schema}".col_uebaunit u
      JOIN "${schema}".ilc_predio p ON u.baunit = p.t_id
      WHERE u.ue_cr_terreno IS NOT NULL
    `);

    console.log('Source schema terrains statistics:');
    console.log('- Total terrains in cr_terreno:', totTerrenos.rows[0].count);
    console.log('- Terrains referenced in col_uebaunit:', linkedTerrenos.rows[0].count);
    console.log('- Terrains linked to an existing predio in ilc_predio:', linkedToExistingPredio.rows[0].count);
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
