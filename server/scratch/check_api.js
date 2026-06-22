const consultaAlfanumericoService = require('../services/consultaAlfanumericoService');

async function main() {
  const schema = 'xtf_1781275955487';
  console.log(`=== Querying alfanumerico service for schema ${schema} ===`);
  
  try {
    const { query } = require('../config/database');
    const predios = await query(`SELECT t_id, numero_predial_nacional FROM "${schema}".ilc_predio LIMIT 10`);
    console.log('Predios in schema:', predios.rows);
    
    for (const p of predios.rows) {
      const predioId = p.t_id;
      const result = await consultaAlfanumericoService.consultarFichas(schema, { predio_id: predioId });
      if (result.data && result.data.length > 0) {
        const row = result.data[0];
        console.log(`Predio ${predioId} (${p.numero_predial_nacional}) geometry:`, row.geometry ? 'FOUND' : 'NOT FOUND');
      }
    }
  } catch (e) {
    console.error(e);
  }
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
