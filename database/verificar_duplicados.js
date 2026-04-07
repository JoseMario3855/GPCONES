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

async function verificarDuplicados() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Verificando duplicados en la tabla municipios...\n');
    
    // Verificar duplicados por código DANE
    const duplicadosCodigo = await client.query(`
      SELECT codigo_dane, COUNT(*) as cantidad
      FROM municipios
      GROUP BY codigo_dane
      HAVING COUNT(*) > 1
      ORDER BY cantidad DESC, codigo_dane
    `);
    
    // Verificar duplicados por nombre (mismo nombre en diferentes códigos)
    const duplicadosNombre = await client.query(`
      SELECT nombre, COUNT(*) as cantidad, 
             STRING_AGG(codigo_dane::text, ', ') as codigos
      FROM municipios
      GROUP BY nombre
      HAVING COUNT(*) > 1
      ORDER BY cantidad DESC, nombre
      LIMIT 20
    `);
    
    // Contar totales
    const totalMunicipios = await client.query('SELECT COUNT(*) as total FROM municipios');
    const totalCodigosUnicos = await client.query('SELECT COUNT(DISTINCT codigo_dane) as total FROM municipios');
    const totalNombresUnicos = await client.query('SELECT COUNT(DISTINCT nombre) as total FROM municipios');
    
    console.log('📊 Estadísticas generales:');
    console.log(`   Total de registros: ${totalMunicipios.rows[0].total}`);
    console.log(`   Códigos DANE únicos: ${totalCodigosUnicos.rows[0].total}`);
    console.log(`   Nombres únicos: ${totalNombresUnicos.rows[0].total}`);
    console.log('');
    
    if (duplicadosCodigo.rows.length > 0) {
      console.log(`❌ DUPLICADOS ENCONTRADOS POR CÓDIGO DANE: ${duplicadosCodigo.rows.length}`);
      console.log('');
      duplicadosCodigo.rows.forEach(dup => {
        console.log(`   Código DANE ${dup.codigo_dane}: ${dup.cantidad} registros`);
      });
      console.log('');
      
      // Mostrar detalles de los duplicados
      console.log('📋 Detalles de duplicados por código DANE:');
      for (const dup of duplicadosCodigo.rows.slice(0, 10)) {
        const detalles = await client.query(`
          SELECT id, codigo_dane, nombre, departamento, codigo_departamento, created_at
          FROM municipios
          WHERE codigo_dane = $1
          ORDER BY created_at
        `, [dup.codigo_dane]);
        
        console.log(`\n   Código DANE: ${dup.codigo_dane}`);
        detalles.rows.forEach((row, idx) => {
          console.log(`   ${idx + 1}. ID: ${row.id.substring(0, 8)}... | ${row.nombre} | ${row.departamento} | Creado: ${row.created_at}`);
        });
      }
      console.log('');
    } else {
      console.log('✅ No hay duplicados por código DANE (todos los códigos son únicos)');
      console.log('');
    }
    
    if (duplicadosNombre.rows.length > 0) {
      console.log(`⚠️  MUNICIPIOS CON EL MISMO NOMBRE (diferentes códigos): ${duplicadosNombre.rows.length}`);
      console.log('   (Esto puede ser normal si hay municipios con el mismo nombre en diferentes departamentos)');
      console.log('');
      duplicadosNombre.rows.slice(0, 10).forEach(dup => {
        console.log(`   "${dup.nombre}": ${dup.cantidad} registros (códigos: ${dup.codigos})`);
      });
      if (duplicadosNombre.rows.length > 10) {
        console.log(`   ... y ${duplicadosNombre.rows.length - 10} más`);
      }
      console.log('');
    }
    
    // Verificar registros con datos incompletos
    const incompletos = await client.query(`
      SELECT COUNT(*) as total
      FROM municipios
      WHERE codigo_dane IS NULL 
         OR nombre IS NULL 
         OR nombre = ''
         OR departamento IS NULL
         OR codigo_departamento IS NULL
    `);
    
    if (parseInt(incompletos.rows[0].total) > 0) {
      console.log(`⚠️  Registros con datos incompletos: ${incompletos.rows[0].total}`);
      console.log('');
    }
    
    // Resumen final
    console.log('📊 Resumen:');
    if (duplicadosCodigo.rows.length === 0) {
      console.log('   ✅ No hay duplicados por código DANE');
    } else {
      console.log(`   ❌ Hay ${duplicadosCodigo.rows.length} códigos DANE duplicados`);
    }
    
    const diferencia = parseInt(totalMunicipios.rows[0].total) - parseInt(totalCodigosUnicos.rows[0].total);
    if (diferencia > 0) {
      console.log(`   ⚠️  Diferencia entre registros y códigos únicos: ${diferencia}`);
    }
    
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error verificando duplicados:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verificarDuplicados();
}

module.exports = { verificarDuplicados };




