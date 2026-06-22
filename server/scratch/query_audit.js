const { query } = require('../config/database');

async function main() {
  const result = await query(`
    SELECT * FROM audit_logs 
    ORDER BY created_at DESC 
    LIMIT 20
  `);
  console.log('=== Recent Audit Logs ===');
  result.rows.forEach(row => {
    console.log(`[${row.created_at}] Action: ${row.action}, Resource: ${row.resource}`);
    console.log('Details:', JSON.stringify(row.details, null, 2));
    console.log('------------------------');
  });
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
