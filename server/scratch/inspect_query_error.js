const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function main() {
  const file = path.join(__dirname, '../../database/consultas_alfanumerico.json');
  const queries = JSON.parse(fs.readFileSync(file, 'utf8'));
  let sql = queries['CalificacionesConstrucciones'];

  // Apply the same cleaning as in service
  sql = sql.replace(/--[^\r\n]*/g, '').trim();
  sql = sql.replace(/\$\{schemaName\}/g, 'modelointerno');
  sql = sql.replace(/\{esquema\}/g, 'modelointerno');

  console.log('--- CLEANED SQL ---');
  console.log(sql.substring(0, 1000));
  console.log('-------------------');

  try {
    const result = await db.query(sql);
    console.log('Query succeeded with rows:', result.rows.length);
  } catch (err) {
    console.error('Error during query:', err.message);
    // Find where the error is
    if (err.position) {
      const pos = parseInt(err.position);
      console.log('Error position:', pos);
      console.log('Context:', sql.substring(Math.max(0, pos - 50), Math.min(sql.length, pos + 50)));
    }
  }
  process.exit(0);
}

main();
