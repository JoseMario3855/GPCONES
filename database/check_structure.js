const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'GP_CONES',
  user: 'postgres',
  password: '12345'
});

async function checkStructure() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando estructura de la base de datos GP_CONES...\n');
    
    // Verificar conexión
    await client.query('SELECT NOW()');
    console.log('✅ Conexión a la base de datos establecida\n');
    
    // Verificar si la tabla users existe
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `;
    
    const tableExists = await client.query(tableExistsQuery);
    console.log(`📋 Tabla 'users' existe: ${tableExists.rows[0].exists}`);
    
    if (tableExists.rows[0].exists) {
      // Verificar estructura de la tabla users
      const structureQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position;
      `;
      
      const structure = await client.query(structureQuery);
      
      console.log('\n🏗️  Estructura actual de la tabla users:');
      console.log('─'.repeat(80));
      
      structure.rows.forEach((col, index) => {
        console.log(`${index + 1}. ${col.column_name}`);
        console.log(`   Tipo: ${col.data_type}`);
        console.log(`   Nullable: ${col.is_nullable}`);
        console.log(`   Default: ${col.column_default || 'N/A'}`);
        console.log('');
      });
      
      // Verificar si la columna full_name existe
      const fullNameExists = structure.rows.some(col => col.column_name === 'full_name');
      console.log(`🔍 Columna 'full_name' existe: ${fullNameExists ? '✅ Sí' : '❌ No'}`);
      
      if (!fullNameExists) {
        console.log('\n⚠️  La columna full_name no existe. Necesitamos actualizar la tabla.');
        
        // Intentar agregar la columna
        try {
          const alterQuery = `
            ALTER TABLE users 
            ADD COLUMN full_name VARCHAR(100);
          `;
          
          await client.query(alterQuery);
          console.log('✅ Columna full_name agregada exitosamente');
          
          // Actualizar usuarios existentes con un valor por defecto
          const updateQuery = `
            UPDATE users 
            SET full_name = username 
            WHERE full_name IS NULL;
          `;
          
          await client.query(updateQuery);
          console.log('✅ Usuarios existentes actualizados con nombre por defecto');
          
        } catch (error) {
          console.error('❌ Error actualizando la tabla:', error.message);
        }
      }
    } else {
      console.log('❌ La tabla users no existe. Necesitamos ejecutar el esquema completo.');
    }
    
    // Verificar otras tablas importantes
    const importantTables = ['predios', 'audit_logs', 'xtf_files'];
    
    console.log('\n📋 Verificando otras tablas importantes:');
    console.log('─'.repeat(50));
    
    for (const tableName of importantTables) {
      const existsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `;
      
      const exists = await client.query(existsQuery, [tableName]);
      console.log(`${tableName}: ${exists.rows[0].exists ? '✅ Existe' : '❌ No existe'}`);
    }
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar el script
checkStructure().catch(console.error);
