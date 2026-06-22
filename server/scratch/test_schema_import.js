const iliService = require('../services/iliService');

async function main() {
  console.log('=== Test createSchemaFromModel for model-interno ===');
  const schemaName = `test_schema_${Date.now()}`;
  try {
    const res = await iliService.createSchemaFromModel('modelo-interno', schemaName);
    console.log('Result:', res);
  } catch (err) {
    console.error('Error caught in main:', err.message);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
