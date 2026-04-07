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

// Usuarios con sus contraseñas
const users = [
  { username: 'admin_sistema', password: 'admin123' },
  { username: 'revisor_calidad', password: 'revisor123' },
  { username: 'reconocedor_predial', password: 'reconocedor123' },
  { username: 'digitador_alfanumerico', password: 'digitador123' },
  { username: 'test_user', password: 'test123' }
];

async function fixPasswords() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Corrigiendo contraseñas de usuarios...\n');
    
    for (const user of users) {
      try {
        // Generar hash correcto de la contraseña
        const passwordHash = await bcrypt.hash(user.password, 12);
        
        // Actualizar contraseña en la base de datos
        const result = await client.query(
          `UPDATE users 
           SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE username = $2 
           RETURNING username, email, role`,
          [passwordHash, user.username]
        );
        
        if (result.rows.length > 0) {
          console.log(`✅ Contraseña actualizada para: ${user.username}`);
          console.log(`   Rol: ${result.rows[0].role}`);
          console.log(`   Email: ${result.rows[0].email}`);
          console.log(`   Contraseña: ${user.password}\n`);
        } else {
          console.log(`⚠️  Usuario no encontrado: ${user.username}\n`);
        }
      } catch (error) {
        console.error(`❌ Error actualizando ${user.username}:`, error.message);
      }
    }
    
    // Verificar que las contraseñas funcionan
    console.log('🔍 Verificando contraseñas...\n');
    
    for (const user of users) {
      try {
        const result = await client.query(
          'SELECT username, password_hash FROM users WHERE username = $1',
          [user.username]
        );
        
        if (result.rows.length > 0) {
          const isValid = await bcrypt.compare(user.password, result.rows[0].password_hash);
          if (isValid) {
            console.log(`✅ ${user.username}: Contraseña verificada correctamente`);
          } else {
            console.log(`❌ ${user.username}: La contraseña NO coincide`);
          }
        }
      } catch (error) {
        console.error(`❌ Error verificando ${user.username}:`, error.message);
      }
    }
    
    console.log('\n✅ Proceso completado');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixPasswords();


