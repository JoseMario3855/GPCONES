const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'GP_CONES',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345'
});

async function normalizarDepartamentos() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔧 Normalizando nombres de departamentos...\n');
    
    // Primero, ver qué departamentos tenemos y sus variaciones
    const departamentos = await client.query(`
      SELECT DISTINCT departamento, codigo_departamento, COUNT(*) as cantidad
      FROM municipios
      GROUP BY departamento, codigo_departamento
      ORDER BY codigo_departamento, departamento
    `);
    
    console.log('📋 Departamentos encontrados (con variaciones):');
    departamentos.rows.forEach(dept => {
      console.log(`   ${dept.departamento} (${dept.codigo_departamento}): ${dept.cantidad} municipios`);
    });
    console.log('');
    
    // Agrupar por código de departamento para encontrar duplicados
    const duplicados = await client.query(`
      SELECT codigo_departamento, 
             STRING_AGG(DISTINCT departamento, ' | ') as nombres,
             COUNT(DISTINCT departamento) as variaciones
      FROM municipios
      GROUP BY codigo_departamento
      HAVING COUNT(DISTINCT departamento) > 1
      ORDER BY codigo_departamento
    `);
    
    if (duplicados.rows.length > 0) {
      console.log(`⚠️  Departamentos con variaciones de nombre: ${duplicados.rows.length}\n`);
      
      await client.query('BEGIN');
      
      // Para cada departamento con variaciones, normalizar a mayúsculas
      for (const dup of duplicados.rows) {
        // Obtener el nombre más común o el que está en mayúsculas
        const nombres = await client.query(`
          SELECT departamento, COUNT(*) as cantidad
          FROM municipios
          WHERE codigo_departamento = $1
          GROUP BY departamento
          ORDER BY cantidad DESC, departamento
        `, [dup.codigo_departamento]);
        
        // Preferir el nombre en mayúsculas, o el más común
        let nombreNormalizado = nombres.rows[0].departamento;
        const nombreMayusculas = nombres.rows.find(r => r.departamento === r.departamento.toUpperCase());
        if (nombreMayusculas) {
          nombreNormalizado = nombreMayusculas.departamento;
        } else {
          // Si no hay en mayúsculas, usar el nombre en mayúsculas del más común
          nombreNormalizado = nombres.rows[0].departamento.toUpperCase();
        }
        
        console.log(`   Normalizando código ${dup.codigo_departamento}:`);
        console.log(`     Variaciones: ${dup.nombres}`);
        console.log(`     → Unificando a: ${nombreNormalizado}`);
        
        // Actualizar todos los registros de este departamento
        const result = await client.query(`
          UPDATE municipios
          SET departamento = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE codigo_departamento = $2
            AND departamento != $1
        `, [nombreNormalizado, dup.codigo_departamento]);
        
        console.log(`     ✅ Actualizados: ${result.rowCount} registros\n`);
      }
      
      // También normalizar todos los departamentos a mayúsculas para consistencia
      console.log('📝 Normalizando todos los departamentos a mayúsculas...\n');
      
      const todosDepartamentos = await client.query(`
        SELECT DISTINCT departamento
        FROM municipios
        WHERE departamento != UPPER(departamento)
      `);
      
      for (const dept of todosDepartamentos.rows) {
        const nombreMayusculas = dept.departamento.toUpperCase();
        const result = await client.query(`
          UPDATE municipios
          SET departamento = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE departamento = $2
        `, [nombreMayusculas, dept.departamento]);
        
        if (result.rowCount > 0) {
          console.log(`   ${dept.departamento} → ${nombreMayusculas}: ${result.rowCount} registros`);
        }
      }
      
      await client.query('COMMIT');
      console.log('\n✅ Normalización completada\n');
    } else {
      console.log('✅ No se encontraron departamentos con variaciones de nombre\n');
    }
    
    // Verificar resultado final
    const departamentosFinal = await client.query(`
      SELECT DISTINCT departamento, codigo_departamento, COUNT(*) as cantidad
      FROM municipios
      GROUP BY departamento, codigo_departamento
      ORDER BY codigo_departamento, departamento
    `);
    
    console.log('📊 Departamentos después de la normalización:');
    departamentosFinal.rows.forEach(dept => {
      console.log(`   ${dept.departamento} (${dept.codigo_departamento}): ${dept.cantidad} municipios`);
    });
    
    // Verificar que no hay duplicados por código
    const duplicadosFinal = await client.query(`
      SELECT codigo_departamento, 
             COUNT(DISTINCT departamento) as variaciones
      FROM municipios
      GROUP BY codigo_departamento
      HAVING COUNT(DISTINCT departamento) > 1
    `);
    
    if (duplicadosFinal.rows.length === 0) {
      console.log('\n✅ Verificación: No hay duplicados por código de departamento\n');
    } else {
      console.log(`\n⚠️  Aún hay ${duplicadosFinal.rows.length} códigos con múltiples nombres\n`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error normalizando departamentos:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  normalizarDepartamentos();
}

module.exports = { normalizarDepartamentos };




