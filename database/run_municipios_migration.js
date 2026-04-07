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

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Ejecutando migración de municipios...\n');
    
    // Verificar conexión
    await client.query('SELECT NOW()');
    console.log('✅ Conexión a la base de datos establecida\n');
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'create_municipios_table.sql');
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Archivo de migración leído exitosamente\n');
    
    // Ejecutar la migración
    await client.query(migrationContent);
    
    console.log('✅ Migración ejecutada exitosamente\n');
    
    // Verificar que las tablas se crearon
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('municipios', 'municipio_schemas')
    `);
    
    console.log('📊 Tablas creadas:');
    tablesCheck.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    // Contar municipios insertados
    const countResult = await client.query('SELECT COUNT(*) as total FROM municipios');
    console.log(`\n📋 Municipios en la base de datos: ${countResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar migración
runMigration()
  .then(() => {
    console.log('\n✅ Migración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en la migración:', error);
    process.exit(1);
  });




