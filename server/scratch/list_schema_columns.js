const { query } = require('../config/database');

async function main() {
  const tables = [
    'ilc_predio',
    'ilc_derecho',
    'ilc_interesado',
    'cr_terreno',
    'col_uebaunit',
    'cr_unidadconstruccion',
    'col_rrrinteresado'
  ];

  console.log('=== Checking columns for tables in modelo_interno_import ===');
  for (const table of tables) {
    try {
      const res = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'modelo_interno_import' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      console.log(`\nTable: ${table} (${res.rows.length} columns)`);
      console.log(res.rows.map(r => `${r.column_name} (${r.data_type}, ${r.is_nullable})`).join(', '));
    } catch (e) {
      console.error(`Error table ${table}:`, e.message);
    }
  }

  process.exit(0);
}

main();
