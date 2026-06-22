const { query } = require('../config/database');

async function main() {
  const r = await query(`
    SELECT * FROM xtf_processing_logs 
    WHERE upload_id = '397c503b-e803-46c6-8eb6-c382a1498203' 
    ORDER BY created_at ASC
  `);
  console.log('=== Processing Logs for upload 397c503b-e803-46c6-8eb6-c382a1498203 ===');
  console.log(r.rows);

  const r2 = await query(`
    SELECT * FROM xtf_processing_logs 
    ORDER BY created_at DESC 
    LIMIT 20
  `);
  console.log('\n=== Recent Processing Logs (all uploads) ===');
  r2.rows.forEach(row => console.log(`[${row.log_level}] ${row.message}: ${row.details}`));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
