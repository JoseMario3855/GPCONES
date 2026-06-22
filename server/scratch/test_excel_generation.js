const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const municipiosController = require('../controllers/municipiosController');

async function test() {
  const { query } = db;
  console.log('=== Starting Excel Generation Test ===');

  try {
    // 1. Find a municipality that has active schemas
    const activeMuniRes = await query(`
      SELECT ms.municipio_id, m.nombre 
      FROM municipio_schemas ms
      JOIN municipios m ON ms.municipio_id = m.id
      WHERE ms.activo = true 
      LIMIT 1
    `);

    if (activeMuniRes.rows.length === 0) {
      console.error('❌ No active municipality schemas found in DB. Cannot run test.');
      process.exit(1);
    }

    const { municipio_id, nombre } = activeMuniRes.rows[0];
    console.log(`Found active municipality: ${nombre} (ID: ${municipio_id})`);

    // 2. Set up request and response mock
    const req = {
      params: { id: municipio_id }
    };

    const outputPath = path.join(__dirname, 'consolidado_test.xlsx');
    const writeStream = fs.createWriteStream(outputPath);

    const res = {
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value;
        console.log(`Response header set: ${name} = ${value}`);
      },
      write(chunk) {
        return writeStream.write(chunk);
      },
      end() {
        writeStream.end();
        console.log('Response finished (end called)');
      }
    };

    console.log('Generating Excel sheet via controller...');
    await municipiosController.exportarConsolidado(req, res);

    // Wait a brief moment for the write stream to fully close
    await new Promise((resolve) => writeStream.on('finish', resolve));

    // 3. Verify file was created
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`File generated successfully at: ${outputPath}`);
      console.log(`File size: ${stats.size} bytes`);
      if (stats.size > 0) {
        console.log('✅ TEST PASSED: Consolidated Excel sheet is valid and has non-zero size!');
      } else {
        console.error('❌ TEST FAILED: Generated file is empty.');
      }
    } else {
      console.error('❌ TEST FAILED: Excel file was not created.');
    }

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    process.exit(0);
  }
}

test();
