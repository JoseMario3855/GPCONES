const { query } = require('../config/database');

async function main() {
  const schema = 'modelo_interno_import';
  try {
    const res = await query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = 'ilc_caracteristicasunidadconstruccion'
      ORDER BY column_name
    `, [schema]);
    console.log('=== ilc_caracteristicasunidadconstruccion ===');
    res.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (${r.character_maximum_length})`));
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

main();
