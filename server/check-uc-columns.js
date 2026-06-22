const { query } = require('./config/database');

async function main() {
  const r1 = await query(
    `SELECT column_name, data_type, is_nullable 
     FROM information_schema.columns 
     WHERE table_schema = 'modelointerno' AND table_name = 'cr_unidadconstruccion' 
     ORDER BY ordinal_position`
  );
  console.log('\n=== cr_unidadconstruccion ===');
  r1.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}) ${r.is_nullable === 'NO' ? 'NOT NULL' : 'nullable'}`));

  const r2 = await query(
    `SELECT column_name, data_type, is_nullable 
     FROM information_schema.columns 
     WHERE table_schema = 'modelointerno' AND table_name = 'ilc_caracteristicasunidadconstruccion' 
     ORDER BY ordinal_position`
  );
  console.log('\n=== ilc_caracteristicasunidadconstruccion ===');
  r2.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}) ${r.is_nullable === 'NO' ? 'NOT NULL' : 'nullable'}`));

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });