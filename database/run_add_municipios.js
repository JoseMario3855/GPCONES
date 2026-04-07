const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuración de la base de datos
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'GP_CONES',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345'
});

async function addMunicipios() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Agregando más municipios a la base de datos...\n');
    
    // Verificar conexión
    await client.query('SELECT NOW()');
    console.log('✅ Conexión a la base de datos establecida\n');
    
    // Contar municipios antes
    const countBefore = await client.query('SELECT COUNT(*) as total FROM municipios');
    console.log(`📊 Municipios antes: ${countBefore.rows[0].total}\n`);
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'add_more_municipios.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 Archivo SQL leído exitosamente\n');
    console.log('⏳ Ejecutando inserción de municipios...\n');
    
    // Ejecutar el SQL
    await client.query(sqlContent);
    
    console.log('✅ Municipios agregados exitosamente\n');
    
    // Contar municipios después
    const countAfter = await client.query('SELECT COUNT(*) as total FROM municipios');
    const added = parseInt(countAfter.rows[0].total) - parseInt(countBefore.rows[0].total);
    
    console.log(`📊 Municipios después: ${countAfter.rows[0].total}`);
    console.log(`✨ Municipios nuevos agregados: ${added}\n`);
    
    // Mostrar algunos municipios por departamento
    const byDept = await client.query(`
      SELECT departamento, COUNT(*) as total
      FROM municipios
      GROUP BY departamento
      ORDER BY total DESC
      LIMIT 10
    `);
    
    console.log('📋 Top 10 departamentos por cantidad de municipios:');
    byDept.rows.forEach(row => {
      console.log(`   ${row.departamento}: ${row.total} municipios`);
    });
    
  } catch (error) {
    console.error('❌ Error agregando municipios:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
addMunicipios()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  });

