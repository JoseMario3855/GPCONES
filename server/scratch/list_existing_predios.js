const { query } = require('../config/database');

async function main() {
  const schema = 'modelo_interno_import';
  try {
    const res = await query(`
      SELECT t_id, t_ili_tid, espacio_de_nombres, local_id, nombre, numero_predial_nacional, tipo, condicion_predio, destinacion_economica
      FROM ${schema}.ilc_predio
      LIMIT 10
    `);
    console.log(`=== Sample predios in ${schema} ===`);
    console.log(res.rows);
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

main();
