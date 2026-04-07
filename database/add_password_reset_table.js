const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos según el documento GPCONES
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'GP_CONES',
  user: 'postgres',
  password: '12345'
});

async function addPasswordResetTable() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Agregando tabla de tokens de recuperación de contraseña...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'add_password_reset_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el SQL
    await client.query(sqlContent);
    
    console.log('✅ Tabla password_reset_tokens creada exitosamente');
    console.log('📋 Características de la tabla:');
    console.log('   - Tokens únicos con expiración de 30 minutos');
    console.log('   - Referencia a usuarios con CASCADE DELETE');
    console.log('   - Índices optimizados para consultas');
    console.log('   - Control de tokens usados');
    
  } catch (error) {
    console.error('❌ Error creando tabla:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  addPasswordResetTable();
}

module.exports = addPasswordResetTable;
