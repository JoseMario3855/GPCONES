const { query } = require('../config/database');

async function main() {
  const schema = 'modelo_interno_import';
  try {
    const res = await query(`
      SELECT t_id, ilicode, dispname
      FROM ${schema}.cr_unidadconstrucciontipo
      ORDER BY t_id
    `);
    console.log('=== cr_unidadconstrucciontipo (Residencial) ===');
    res.rows.forEach(r => console.log(`  t_id: ${r.t_id}, ilicode: "${r.ilicode}", dispname: "${r.dispname}"`));
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

main();
