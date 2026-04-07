const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Leer el archivo Excel consolidado
const excelFile = path.join(__dirname, '../CONSOLIDADO_YARUMAL_U_05012026.xlsx');

if (!fs.existsSync(excelFile)) {
  console.log(`❌ Archivo no encontrado: ${excelFile}`);
  process.exit(1);
}

console.log('\n📊 Analizando estructura del archivo CONSOLIDADO...\n');

const workbook = XLSX.readFile(excelFile);
const sheetNames = workbook.SheetNames;

console.log(`📋 Hojas encontradas: ${sheetNames.join(', ')}\n`);

sheetNames.forEach((sheetName, index) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Hoja ${index + 1}: ${sheetName}`);
  console.log('='.repeat(60));
  
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  if (data.length > 0) {
    console.log(`\n📊 Total de filas: ${data.length}`);
    console.log(`\n📋 Columnas encontradas:`);
    const columns = Object.keys(data[0]);
    columns.forEach((col, idx) => {
      console.log(`   ${idx + 1}. ${col}`);
    });
    
    console.log(`\n📝 Primeras 3 filas de ejemplo:`);
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
  } else {
    console.log('\n⚠️  No hay datos en esta hoja');
  }
});

console.log('\n');




