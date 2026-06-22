const xtfIntegrationService = require('../services/xtfIntegrationService');

async function main() {
  console.log('=== Attempting integration for xtf_1781275955487 ===');
  const result = await xtfIntegrationService.integrateXTFToMainSchema('xtf_1781275955487', {
    userId: '1fbe4c27-dc84-44d0-9846-995551adaeb2',
    filename: 'xtf-1781275955484-483379376.xtf',
    model_type: 'modelo-interno'
  });
  console.log('Result:', result);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
