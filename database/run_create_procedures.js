const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'GP_CONES',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345'
});

async function createProcedures() {
  try {
    console.log('📝 Leyendo script de procedimientos almacenados...');
    const sqlFile = path.join(__dirname, 'create_consulta_alfanumerico_procedures.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('🚀 Ejecutando script SQL...');
    await pool.query(sql);
    
    console.log('✅ Procedimientos almacenados creados exitosamente!');
    console.log('   - consulta_fichas()');
    
  } catch (error) {
    console.error('❌ Error creando procedimientos:', error.message);
    console.error('📋 Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createProcedures();




