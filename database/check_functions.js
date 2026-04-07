const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'GP_CONES',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345'
});

async function checkFunctions() {
  try {
    const result = await pool.query(`
      SELECT proname, pronargs 
      FROM pg_proc 
      WHERE proname LIKE 'consulta_fichas%'
      ORDER BY proname
    `);
    
    console.log('Funciones encontradas:');
    if (result.rows.length === 0) {
      console.log('  ❌ No se encontraron funciones');
    } else {
      result.rows.forEach(row => {
        console.log(`  ✅ ${row.proname} (${row.pronargs} argumentos)`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkFunctions();




