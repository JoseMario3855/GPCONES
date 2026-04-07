const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'GP_CONES',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345'
});

// Función para parsear CSV
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length >= headers.length) {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      data.push(obj);
    }
  }
  
  return data;
}

async function importMunicipiosFromCSV() {
  const client = await pool.connect();
  
  try {
    console.log('\n🚀 Iniciando importación de municipios desde CSV...\n');
    
    // Leer el archivo CSV
    const csvFile = path.join(__dirname, 'municipios_colombia.csv');
    
    if (!fs.existsSync(csvFile)) {
      console.log('⚠️  Archivo CSV no encontrado. Creando archivo de ejemplo...\n');
      createExampleCSV(csvFile);
      console.log('✅ Archivo de ejemplo creado en:', csvFile);
      console.log('📝 Por favor, completa el archivo con todos los municipios de Colombia');
      console.log('   Formato: codigo_dane,nombre,departamento,codigo_departamento\n');
      return;
    }
    
    const csvContent = fs.readFileSync(csvFile, 'utf8');
    const municipios = parseCSV(csvContent);
    
    if (municipios.length === 0) {
      console.log('❌ No se encontraron municipios en el archivo CSV');
      return;
    }
    
    console.log(`📊 Municipios encontrados en CSV: ${municipios.length}\n`);
    
    await client.query('BEGIN');
    
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const municipio of municipios) {
      try {
        const { codigo_dane, nombre, departamento, codigo_departamento } = municipio;
        
        // Validaciones
        if (!codigo_dane || !nombre || !departamento || !codigo_departamento) {
          console.log(`⚠️  Saltando municipio con datos incompletos: ${nombre || 'N/A'}`);
          skipped++;
          continue;
        }
        
        if (!/^\d{5}$/.test(codigo_dane)) {
          console.log(`⚠️  Código DANE inválido: ${codigo_dane} para ${nombre}`);
          skipped++;
          continue;
        }
        
        if (!/^\d{2}$/.test(codigo_departamento)) {
          console.log(`⚠️  Código departamento inválido: ${codigo_departamento} para ${nombre}`);
          skipped++;
          continue;
        }
        
        // Insertar o actualizar
        const result = await client.query(`
          INSERT INTO municipios (codigo_dane, nombre, departamento, codigo_departamento)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (codigo_dane) DO UPDATE
          SET nombre = EXCLUDED.nombre,
              departamento = EXCLUDED.departamento,
              codigo_departamento = EXCLUDED.codigo_departamento,
              updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `, [codigo_dane, nombre, departamento, codigo_departamento]);
        
        if (result.rows.length > 0) {
          inserted++;
        }
        
      } catch (error) {
        console.error(`❌ Error procesando ${municipio.nombre || 'N/A'}:`, error.message);
        errors++;
      }
    }
    
    await client.query('COMMIT');
    
    // Contar total
    const countResult = await client.query('SELECT COUNT(*) as total FROM municipios');
    const total = countResult.rows[0].total;
    
    console.log('\n✅ Importación completada:');
    console.log(`   📊 Total de municipios en la base de datos: ${total}`);
    console.log(`   ✅ Insertados/Actualizados: ${inserted}`);
    console.log(`   ⚠️  Omitidos: ${skipped}`);
    console.log(`   ❌ Errores: ${errors}\n`);
    
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

function createExampleCSV(filePath) {
  const exampleContent = `codigo_dane,nombre,departamento,codigo_departamento
05001,Medellín,Antioquia,05
05002,Abejorral,Antioquia,05
05004,Abriaquí,Antioquia,05
25001,Bogotá D.C.,Cundinamarca,25
76001,Cali,Valle del Cauca,76
08001,Barranquilla,Atlántico,08
68001,Bucaramanga,Santander,68
13001,Cartagena,Bolívar,13
50001,Villavicencio,Meta,50
66001,Pereira,Risaralda,66
63001,Armenia,Quindío,63
73001,Ibagué,Tolima,73
54001,Cúcuta,Norte de Santander,54
41001,Neiva,Huila,41
19001,Popayán,Cauca,19
52001,Pasto,Nariño,52
15001,Tunja,Boyacá,15
23001,Montería,Córdoba,23
70001,Sincelejo,Sucre,70
85001,Yopal,Casanare,85`;
  
  fs.writeFileSync(filePath, exampleContent, 'utf8');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  importMunicipiosFromCSV();
}

module.exports = { importMunicipiosFromCSV };




