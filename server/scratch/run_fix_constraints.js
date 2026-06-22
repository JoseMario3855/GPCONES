const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('=== Running migration to fix unique constraints ===');
  
  const sqlPath = path.join(__dirname, '../../database/fix_integration_unique_constraints.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('Executing SQL...');
  await query(sql);
  
  console.log('✅ Migration completed successfully!');
  process.exit(0);
}

main().catch(e => {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
});
