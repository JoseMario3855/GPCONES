const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'GP_CONES',
  user: 'postgres',
  password: '12345'
});

async function runSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Ejecutando esquema completo de GPCONES...\n');
    
    // Verificar conexión
    await client.query('SELECT NOW()');
    console.log('✅ Conexión a la base de datos establecida\n');
    
    // Leer el archivo de esquema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📖 Archivo de esquema leído exitosamente');
    console.log(`📏 Tamaño del archivo: ${(schemaContent.length / 1024).toFixed(2)} KB\n`);
    
    // Dividir el esquema en comandos individuales
    const commands = schemaContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`🔧 Ejecutando ${commands.length} comandos SQL...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.trim() === '') continue;
      
      try {
        // Agregar punto y coma de vuelta
        const fullCommand = command + ';';
        
        // Ejecutar el comando
        await client.query(fullCommand);
        successCount++;
        
        // Mostrar progreso cada 10 comandos
        if (successCount % 10 === 0) {
          console.log(`✅ ${successCount} comandos ejecutados exitosamente...`);
        }
        
      } catch (error) {
        errorCount++;
        console.log(`❌ Error en comando ${i + 1}:`);
        console.log(`   Comando: ${command.substring(0, 100)}...`);
        console.log(`   Error: ${error.message}`);
        
        // Continuar con el siguiente comando
        continue;
      }
    }
    
    console.log('\n📊 Resumen de ejecución:');
    console.log('─'.repeat(50));
    console.log(`✅ Comandos exitosos: ${successCount}`);
    console.log(`❌ Comandos con error: ${errorCount}`);
    console.log(`📊 Total de comandos: ${commands.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 ¡Esquema ejecutado completamente sin errores!');
    } else {
      console.log('\n⚠️  Esquema ejecutado con algunos errores. Revisa los logs anteriores.');
    }
    
    // Verificar la estructura final
    console.log('\n🔍 Verificando estructura final...');
    
    const finalCheckQuery = `
      SELECT 
        table_name,
        COUNT(*) as column_count
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'predios', 'audit_logs', 'xtf_files')
      GROUP BY table_name
      ORDER BY table_name;
    `;
    
    const finalCheck = await client.query(finalCheckQuery);
    
    console.log('\n📋 Tablas creadas:');
    console.log('─'.repeat(40));
    
    finalCheck.rows.forEach(row => {
      console.log(`${row.table_name}: ${row.column_count} columnas`);
    });
    
  } catch (error) {
    console.error('❌ Error ejecutando esquema:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar el script
runSchema().catch(console.error);
