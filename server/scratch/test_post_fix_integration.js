const xtfIntegrationService = require('../services/xtfIntegrationService');
const { query } = require('../config/database');

async function main() {
  console.log('=== Starting Post-Fix Integration Verification ===\n');

  console.log('1. Integrating modelo_interno_import...');
  const res1 = await xtfIntegrationService.integrateXTFToMainSchema('modelo_interno_import', {
    userId: '1fbe4c27-dc84-44d0-9846-995551adaeb2',
    filename: 'test_poblado_modelo_enviado.xtf',
    model_type: 'modelo-interno'
  });
  console.log('Result 1:', res1);

  console.log('\n2. Integrating xtf_1781275955487...');
  const res2 = await xtfIntegrationService.integrateXTFToMainSchema('xtf_1781275955487', {
    userId: '1fbe4c27-dc84-44d0-9846-995551adaeb2',
    filename: 'xtf-1781275955484-483379376.xtf',
    model_type: 'modelo-interno'
  });
  console.log('Result 2:', res2);

  console.log('\n3. Verifying database stats...');

  // Predios count
  const predios = await query(`
    SELECT xtf_schema, count(*) as total, count(geometry) as with_geom 
    FROM predios_xtf 
    WHERE xtf_schema IN ('modelo_interno_import', 'xtf_1781275955487')
    GROUP BY xtf_schema
  `);
  console.log('Predios XTF counts:', predios.rows);

  // Terrenos count and link checks
  const terrenos = await query(`
    SELECT xtf_schema, count(*) as total, count(predio_id) as linked_to_predio, count(geometry) as with_geom 
    FROM terrenos_xtf 
    WHERE xtf_schema IN ('modelo_interno_import', 'xtf_1781275955487')
    GROUP BY xtf_schema
  `);
  console.log('Terrenos XTF counts:', terrenos.rows);

  // Construcciones count and link checks
  const construcciones = await query(`
    SELECT xtf_schema, count(*) as total, count(predio_id) as linked_to_predio, count(geometry) as with_geom 
    FROM construcciones_xtf 
    WHERE xtf_schema IN ('modelo_interno_import', 'xtf_1781275955487')
    GROUP BY xtf_schema
  `);
  console.log('Construcciones XTF counts:', construcciones.rows);

  // Quick assertions
  const ok1 = predios.rows.every(r => parseInt(r.total) === 83 && parseInt(r.with_geom) === 63);
  const ok2 = terrenos.rows.every(r => parseInt(r.total) === 56 && parseInt(r.linked_to_predio) === 53);
  const ok3 = construcciones.rows.every(r => parseInt(r.linked_to_predio) === parseInt(r.total));

  if (ok1 && ok2 && ok3) {
    console.log('\n✅ VERIFICATION SUCCESSFUL! All records and geometries successfully imported and linked across both schemas!');
  } else {
    console.error('\n❌ VERIFICATION FAILED. Some counts or linkages are incorrect.');
  }

  process.exit(0);
}

main().catch(e => {
  console.error('Error during verification:', e);
  process.exit(1);
});
