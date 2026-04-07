const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configuración de la base de datos
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'GP_CONES',
  user: 'postgres',
  password: '12345'
});

async function testLogin() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Probando login para admin_sistema...\n');
    
    // Buscar usuario
    const userResult = await client.query(
      'SELECT id, username, email, full_name, role, password_hash, is_active FROM users WHERE username = $1',
      ['admin_sistema']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ Usuario encontrado:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Rol: ${user.role}`);
    console.log(`   Activo: ${user.is_active}`);
    console.log(`   Password hash: ${user.password_hash.substring(0, 30)}...`);
    console.log('');
    
    // Probar contraseña
    const testPassword = 'admin123';
    console.log(`🔑 Verificando contraseña: ${testPassword}`);
    
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    
    if (isValid) {
      console.log('✅ Contraseña válida');
    } else {
      console.log('❌ Contraseña inválida');
      console.log('');
      console.log('💡 Intentando crear nuevo hash...');
      const newHash = await bcrypt.hash(testPassword, 12);
      console.log(`Nuevo hash: ${newHash}`);
      console.log('');
      console.log('Actualizando contraseña en la base de datos...');
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2',
        [newHash, 'admin_sistema']
      );
      console.log('✅ Contraseña actualizada');
      
      // Verificar nuevamente
      const isValid2 = await bcrypt.compare(testPassword, newHash);
      console.log(`Verificación con nuevo hash: ${isValid2 ? '✅ Válida' : '❌ Inválida'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testLogin();




