const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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
    console.log('🔍 Verificando usuarios y contraseñas...\n');
    
    const testUsers = [
      { username: 'admin_sistema', password: 'admin123' },
      { username: 'revisor_calidad', password: 'revisor123' },
      { username: 'reconocedor_predial', password: 'reconocedor123' },
      { username: 'digitador_alfanumerico', password: 'digitador123' },
      { username: 'test_user', password: 'test123' }
    ];
    
    for (const testUser of testUsers) {
      const result = await client.query(
        'SELECT id, username, password_hash, is_active FROM users WHERE username = $1',
        [testUser.username]
      );
      
      if (result.rows.length === 0) {
        console.log(`❌ Usuario NO existe: ${testUser.username}`);
        // Crear usuario si no existe
        const passwordHash = await bcrypt.hash(testUser.password, 12);
        await client.query(
          `INSERT INTO users (username, email, password_hash, full_name, role, is_active) 
           VALUES ($1, $2, $3, $4, $5, true)`,
          [
            testUser.username,
            `${testUser.username}@gpcones.com`,
            passwordHash,
            testUser.username.replace('_', ' '),
            testUser.username.includes('admin') ? 'Administrador del Sistema' :
            testUser.username.includes('revisor') ? 'Revisión de Calidad' :
            testUser.username.includes('reconocedor') ? 'Reconocedor Predial' :
            'Digitador Alfanumérico'
          ]
        );
        console.log(`✅ Usuario creado: ${testUser.username}`);
      } else {
        const user = result.rows[0];
        const isValid = await bcrypt.compare(testUser.password, user.password_hash);
        
        if (isValid) {
          console.log(`✅ ${testUser.username}: Contraseña correcta`);
        } else {
          console.log(`❌ ${testUser.username}: Contraseña INCORRECTA - Actualizando...`);
          const newHash = await bcrypt.hash(testUser.password, 12);
          await client.query(
            'UPDATE users SET password_hash = $1 WHERE username = $2',
            [newHash, testUser.username]
          );
          console.log(`✅ ${testUser.username}: Contraseña actualizada`);
        }
      }
    }
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testLogin();


