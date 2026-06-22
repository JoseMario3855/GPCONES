const { query } = require('../config/database');

async function main() {
  const schema = 'modelo_interno_import';
  const tables = [
    'ilc_predio',
    'cr_terreno',
    'col_uebaunit',
    'ilc_interesado',
    'ilc_derecho',
    'cr_unidadconstruccion'
  ];

  for (const table of tables) {
    try {
      const res = await query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2 AND data_type LIKE '%char%'
        ORDER BY column_name
      `, [schema, table]);
      console.log(`\nTable: ${table}`);
      res.rows.forEach(r => console.log(`  ${r.column_name}: ${r.character_maximum_length}`));
    } catch (e) {
      console.error(e.message);
    }
  }
  process.exit(0);
}

main();
