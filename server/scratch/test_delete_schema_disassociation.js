const db = require('../config/database');
const xtfController = require('../controllers/xtfController');

async function test() {
  const { query } = db;
  const tempSchema = 'temp_test_schema_delete';
  const userId = '1fbe4c27-dc84-44d0-9846-995551adaeb2'; // Mock user ID

  console.log('=== Starting disassociation test ===');

  try {
    // 1. Create temporary schema
    console.log(`Creating schema: ${tempSchema}`);
    await query(`CREATE SCHEMA IF NOT EXISTS "${tempSchema}"`);

    // 2. Clear any existing records for this schema
    await query(`DELETE FROM municipio_schemas WHERE schema_name = $1`, [tempSchema]);

    // 3. Associate schema to a mock municipio (query a valid UUID from DB)
    console.log('Querying a valid municipio...');
    const muniResult = await query(`SELECT id FROM municipios LIMIT 1`);
    if (muniResult.rows.length === 0) {
      throw new Error('No municipios found in database to associate test schema');
    }
    const municipioId = muniResult.rows[0].id;

    console.log('Inserting mock association...');
    await query(`
      INSERT INTO municipio_schemas (municipio_id, schema_name, descripcion, created_by, activo)
      VALUES ($1, $2, 'Temporary test schema', $3, true)
    `, [municipioId, tempSchema, userId]);

    // Verify insertion
    const checkBefore = await query(
      `SELECT activo FROM municipio_schemas WHERE schema_name = $1`,
      [tempSchema]
    );
    console.log('Association active before deletion:', checkBefore.rows[0]?.activo);

    // 4. Invoke deleteSchema through Controller
    const req = {
      params: { schema_name: tempSchema },
      user: { id: userId }
    };
    
    let resSuccess = false;
    const res = {
      status: (code) => ({
        json: (data) => {
          console.log(`Response status ${code}:`, data);
        }
      }),
      json: (data) => {
        console.log('Response JSON:', data);
        resSuccess = data.success;
      }
    };

    console.log('Deleting schema via xtfController.deleteSchema...');
    await xtfController.deleteSchema(req, res);

    // 5. Check if schema was disassociated
    const checkAfter = await query(
      `SELECT activo FROM municipio_schemas WHERE schema_name = $1`,
      [tempSchema]
    );

    const isDisassociated = checkAfter.rows[0]?.activo === false;
    console.log('Association active after deletion:', checkAfter.rows[0]?.activo);

    if (resSuccess && isDisassociated) {
      console.log('✅ TEST PASSED: Schema was deleted and successfully marked as inactive in municipio_schemas!');
    } else {
      console.error('❌ TEST FAILED: Schema was not deleted or association remains active.');
    }

    // Cleanup association record
    await query(`DELETE FROM municipio_schemas WHERE schema_name = $1`, [tempSchema]);

  } catch (error) {
    console.error('Test threw an error:', error);
  } finally {
    // Make sure temporary schema is dropped
    try {
      await query(`DROP SCHEMA IF EXISTS "${tempSchema}" CASCADE`);
    } catch (e) {}
    process.exit(0);
  }
}

test();
