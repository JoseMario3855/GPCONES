const xtfIntegrationService = require('../services/xtfIntegrationService');

async function main() {
  console.log('=== Testing cleanIntegration and full integrateXTFToMainSchema ===');
  
  console.log('Running cleanIntegration...');
  const cleanRes = await xtfIntegrationService.cleanIntegration('modelo_interno_import');
  console.log('Clean result:', cleanRes);
  
  console.log('Running integrateXTFToMainSchema...');
  const result = await xtfIntegrationService.integrateXTFToMainSchema('modelo_interno_import', {
    userId: '1fbe4c27-dc84-44d0-9846-995551adaeb2',
    filename: 'test_poblado_modelo_enviado.xtf',
    model_type: 'modelo-interno'
  });
  
  console.log('Integration completed successfully:', result);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
