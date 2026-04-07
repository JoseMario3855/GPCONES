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

// Usuarios de prueba para cada rol
const testUsers = [
  {
    username: 'admin_sistema',
    email: 'admin@gpcones.com',
    password: 'admin123',
    full_name: 'Administrador del Sistema GPCONES',
    role: 'Administrador del Sistema'
  },
  {
    username: 'revisor_calidad',
    email: 'revisor@gpcones.com',
    password: 'revisor123',
    full_name: 'María García - Revisora de Calidad',
    role: 'Revisión de Calidad'
  },
  {
    username: 'reconocedor_predial',
    email: 'reconocedor@gpcones.com',
    password: 'reconocedor123',
    full_name: 'Juan Pérez - Reconocedor Predial',
    role: 'Reconocedor Predial'
  },
  {
    username: 'digitador_alfanumerico',
    email: 'digitador@gpcones.com',
    password: 'digitador123',
    full_name: 'Ana López - Digitadora Alfanumérica',
    role: 'Digitador Alfanumérico'
  },
  {
    username: 'test_user',
    email: 'test@gpcones.com',
    password: 'test123',
    full_name: 'Usuario de Prueba',
    role: 'Digitador Alfanumérico'
  }
];

async function createUsers() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando creación de usuarios de prueba para GPCONES...\n');
    
    // Verificar conexión
    await client.query('SELECT NOW()');
    console.log('✅ Conexión a la base de datos establecida\n');
    
    // Crear usuarios
    for (const user of testUsers) {
      try {
        // Hash de la contraseña
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(user.password, saltRounds);
        
        // Insertar o actualizar usuario
        const query = `
          INSERT INTO users (username, email, password_hash, full_name, role, is_active)
          VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (username) DO UPDATE SET
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id, username, role
        `;
        
        const result = await client.query(query, [
          user.username,
          user.email,
          passwordHash,
          user.full_name,
          user.role
        ]);
        
        if (result.rows[0]) {
          console.log(`✅ Usuario creado/actualizado: ${user.username} (${user.role})`);
          console.log(`   📧 Email: ${user.email}`);
          console.log(`   🔑 Contraseña: ${user.password}`);
          console.log(`   🆔 ID: ${result.rows[0].id}\n`);
        }
        
      } catch (error) {
        console.error(`❌ Error creando usuario ${user.username}:`, error.message);
      }
    }
    
    // Verificar usuarios creados
    console.log('📊 Verificando usuarios creados...\n');
    
    const usersQuery = `
      SELECT username, email, full_name, role, is_active, created_at
      FROM users 
      ORDER BY role, username
    `;
    
    const usersResult = await client.query(usersQuery);
    
    console.log('👥 Usuarios en la base de datos:');
    console.log('─'.repeat(80));
    
    usersResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username}`);
      console.log(`   📧 ${user.email}`);
      console.log(`   👤 ${user.full_name}`);
      console.log(`   🎭 ${user.role}`);
      console.log(`   ✅ ${user.is_active ? 'Activo' : 'Inactivo'}`);
      console.log(`   📅 ${new Date(user.created_at).toLocaleString('es-ES')}`);
      console.log('');
    });
    
    // Estadísticas por rol
    const statsQuery = `
      SELECT 
        role,
        COUNT(*) as cantidad_usuarios,
        COUNT(CASE WHEN is_active = true THEN 1 END) as usuarios_activos
      FROM users 
      GROUP BY role
      ORDER BY role
    `;
    
    const statsResult = await client.query(statsQuery);
    
    console.log('📈 Estadísticas por rol:');
    console.log('─'.repeat(50));
    
    statsResult.rows.forEach(stat => {
      console.log(`🎭 ${stat.role}:`);
      console.log(`   📊 Total: ${stat.cantidad_usuarios}`);
      console.log(`   ✅ Activos: ${stat.usuarios_activos}`);
      console.log('');
    });
    
    console.log('🎉 ¡Usuarios de prueba creados exitosamente!');
    console.log('\n🔑 Credenciales de acceso:');
    console.log('─'.repeat(50));
    testUsers.forEach(user => {
      console.log(`👤 ${user.username}: ${user.password}`);
    });
    
    console.log('\n📝 Notas importantes:');
    console.log('• Las contraseñas están hasheadas con bcrypt (costo 12)');
    console.log('• Todos los usuarios están activos por defecto');
    console.log('• Los emails son únicos y verificables');
    console.log('• Los roles están validados según el CHECK constraint');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar el script
createUsers().catch(console.error);
