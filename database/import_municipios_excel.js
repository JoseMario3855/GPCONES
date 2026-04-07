const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const XLSX = require('xlsx');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'GP_CONES',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345'
});

async function importMunicipiosFromExcel() {
  const client = await pool.connect();
  
  try {
    console.log('\n🚀 Iniciando importación de municipios desde Excel...\n');
    
    // Leer el archivo Excel
    const excelFile = path.join(__dirname, '../subregiones.xls');
    
    if (!fs.existsSync(excelFile)) {
      console.log(`❌ Archivo no encontrado: ${excelFile}`);
      console.log('📝 Verifica que el archivo subregiones.xls esté en la carpeta GPCONES\n');
      return;
    }
    
    console.log(`📂 Leyendo archivo: ${excelFile}\n`);
    
    // Leer el archivo Excel
    const workbook = XLSX.readFile(excelFile);
    
    // Obtener el nombre de la primera hoja
    const sheetName = workbook.SheetNames[0];
    console.log(`📋 Hoja encontrada: ${sheetName}\n`);
    
    // Convertir la hoja a JSON
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Registros encontrados en Excel: ${data.length}\n`);
    
    if (data.length === 0) {
      console.log('❌ No se encontraron datos en el archivo Excel');
      return;
    }
    
    // Mostrar las primeras filas para entender la estructura
    console.log('📋 Estructura de datos (primeras 3 filas):');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
    console.log('\n');
    
    await client.query('BEGIN');
    
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const errorsList = [];
    
    // Mapear las columnas del Excel a nuestros campos
    // Intentar diferentes posibles nombres de columnas
    const possibleColumns = {
      codigo_dane: ['codigo_dane', 'codigo', 'código', 'dane', 'cod_dane', 'codigoDane', 'CODIGO_DANE', 'CODIGO', 'CODIGO_MUNICIPIO', 'codigo_municipio'],
      nombre: ['nombre', 'municipio', 'municipio_nombre', 'NOMBRE', 'MUNICIPIO', 'Nombre', 'NOMBRE_MPIO', 'nombre_mpio'],
      departamento: ['departamento', 'depto', 'DEPARTAMENTO', 'Departamento', 'dept', 'NOMBRE_DEPTO', 'nombre_depto'],
      codigo_departamento: ['codigo_departamento', 'cod_depto', 'cod_departamento', 'CODIGO_DEPARTAMENTO', 'codigoDepto']
    };
    
    // Detectar nombres de columnas
    const firstRow = data[0];
    const columnMap = {};
    
    Object.keys(possibleColumns).forEach(key => {
      const found = Object.keys(firstRow).find(col => 
        possibleColumns[key].some(possible => 
          col.toLowerCase().replace(/_/g, '').replace(/\s/g, '') === possible.toLowerCase().replace(/_/g, '').replace(/\s/g, '')
        )
      );
      if (found) {
        columnMap[key] = found;
        console.log(`✅ Columna detectada: ${found} -> ${key}`);
      }
    });
    
    console.log('\n');
    
    if (!columnMap.codigo_dane || !columnMap.nombre) {
      console.log('❌ No se pudieron detectar las columnas necesarias (codigo_dane, nombre)');
      console.log('📋 Columnas disponibles:', Object.keys(firstRow).join(', '));
      return;
    }
    
    for (const row of data) {
      try {
        // Extraer valores usando el mapeo de columnas
        let codigo_dane = row[columnMap.codigo_dane];
        let nombre = row[columnMap.nombre];
        let departamento = row[columnMap.departamento] || '';
        let codigo_departamento = row[columnMap.codigo_departamento] || '';
        
        // Limpiar y convertir valores
        if (typeof codigo_dane === 'number') {
          codigo_dane = codigo_dane.toString().padStart(5, '0');
        } else if (codigo_dane) {
          codigo_dane = codigo_dane.toString().trim().replace(/\s/g, '').padStart(5, '0');
        }
        
        if (typeof codigo_departamento === 'number') {
          codigo_departamento = codigo_departamento.toString().padStart(2, '0');
        } else if (codigo_departamento) {
          codigo_departamento = codigo_departamento.toString().trim().replace(/\s/g, '').padStart(2, '0');
        }
        
        nombre = nombre ? nombre.toString().trim() : '';
        departamento = departamento ? departamento.toString().trim() : '';
        
        // Validaciones
        if (!codigo_dane || !nombre) {
          skipped++;
          continue;
        }
        
        if (!/^\d{5}$/.test(codigo_dane)) {
          errorsList.push(`Código DANE inválido: ${codigo_dane} para ${nombre}`);
          errors++;
          continue;
        }
        
        // Si no hay código de departamento, extraerlo del código DANE (primeros 2 dígitos)
        if (!codigo_departamento && codigo_dane.length >= 2) {
          codigo_departamento = codigo_dane.substring(0, 2);
        }
        
        if (!/^\d{2}$/.test(codigo_departamento)) {
          errorsList.push(`Código departamento inválido: ${codigo_departamento} para ${nombre}`);
          errors++;
          continue;
        }
        
        // Si no hay departamento pero tenemos NOMBRE_DEPTO, usarlo
        if (!departamento || departamento === 'Sin especificar') {
          const nombreDepto = row['NOMBRE_DEPTO'] || row['nombre_depto'] || '';
          if (nombreDepto) {
            departamento = nombreDepto.toString().trim();
          } else {
            departamento = 'Sin especificar';
          }
        }
        
        // Preferir NOMBRE_MPIO sobre Nombre si está disponible
        const nombreMpio = row['NOMBRE_MPIO'] || row['nombre_mpio'] || '';
        if (nombreMpio && (!nombre || nombre === '')) {
          nombre = nombreMpio.toString().trim();
        }
        
        // Verificar si existe
        const existente = await client.query(
          'SELECT id FROM municipios WHERE codigo_dane = $1',
          [codigo_dane]
        );
        
        if (existente.rows.length > 0) {
          // Actualizar
          await client.query(`
            UPDATE municipios 
            SET nombre = $1, 
                departamento = $2, 
                codigo_departamento = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE codigo_dane = $4
          `, [nombre, departamento, codigo_departamento, codigo_dane]);
          updated++;
        } else {
          // Insertar
          await client.query(`
            INSERT INTO municipios (codigo_dane, nombre, departamento, codigo_departamento)
            VALUES ($1, $2, $3, $4)
          `, [codigo_dane, nombre, departamento, codigo_departamento]);
          inserted++;
        }
        
      } catch (error) {
        console.error(`❌ Error procesando fila:`, error.message);
        errorsList.push(`Error: ${error.message}`);
        errors++;
      }
    }
    
    await client.query('COMMIT');
    
    // Contar total
    const countResult = await client.query('SELECT COUNT(*) as total FROM municipios');
    const total = countResult.rows[0].total;
    
    console.log('\n✅ Importación completada:');
    console.log(`   📊 Total de municipios en la base de datos: ${total}`);
    console.log(`   ✅ Insertados: ${inserted}`);
    console.log(`   🔄 Actualizados: ${updated}`);
    console.log(`   ⚠️  Omitidos: ${skipped}`);
    console.log(`   ❌ Errores: ${errors}`);
    
    if (errorsList.length > 0 && errorsList.length <= 20) {
      console.log('\n📋 Primeros errores:');
      errorsList.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    }
    
    console.log('\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error importando municipios:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  importMunicipiosFromExcel();
}

module.exports = { importMunicipiosFromExcel };

