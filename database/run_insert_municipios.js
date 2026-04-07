const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'GP_CONES',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345'
});

async function insertMunicipios() {
  const client = await pool.connect();
  
  try {
    console.log('\n🚀 Iniciando inserción de municipios adicionales...\n');
    
    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, 'insert_municipios_completos.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Ejecutar el script SQL
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    // Contar municipios insertados
    const countResult = await client.query('SELECT COUNT(*) as total FROM municipios');
    const total = countResult.rows[0].total;
    
    console.log(`✅ Municipios adicionales agregados exitosamente`);
    console.log(`📊 Total de municipios en la base de datos: ${total}\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error insertando municipios:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

insertMunicipios();




