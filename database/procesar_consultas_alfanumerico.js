const fs = require('fs');
const path = require('path');

/**
 * Script para procesar el archivo CONSULTASALFANUMERICO.txt
 * y convertir las consultas Python a SQL puro
 */

const archivoConsultas = path.join(__dirname, '../CONSULTASALFANUMERICO.txt');

if (!fs.existsSync(archivoConsultas)) {
  console.log(`❌ Archivo no encontrado: ${archivoConsultas}`);
  process.exit(1);
}

console.log('\n📝 Procesando archivo CONSULTASALFANUMERICO.txt...\n');

const contenido = fs.readFileSync(archivoConsultas, 'utf8');

// Extraer las consultas del diccionario Python
const consultas = {};

// Buscar cada consulta en el formato: "NombreConsulta": f"""..."""
const patron = /"([^"]+)":\s*f?"""([\s\S]*?)"""/g;
let match;

while ((match = patron.exec(contenido)) !== null) {
  const nombreConsulta = match[1];
  let consultaSQL = match[2];
  
  // Reemplazar {esquema} por un placeholder que podamos usar
  consultaSQL = consultaSQL.replace(/\{esquema\}/g, '${schemaName}');
  
  // Limpiar espacios en blanco excesivos
  consultaSQL = consultaSQL.trim();
  
  consultas[nombreConsulta] = consultaSQL;
  
  console.log(`✅ Consulta encontrada: ${nombreConsulta} (${consultaSQL.length} caracteres)`);
}

console.log(`\n📊 Total de consultas encontradas: ${Object.keys(consultas).length}\n`);

// Guardar las consultas procesadas en un archivo JSON
const archivoSalida = path.join(__dirname, 'consultas_alfanumerico.json');
fs.writeFileSync(archivoSalida, JSON.stringify(consultas, null, 2), 'utf8');

console.log(`✅ Consultas guardadas en: ${archivoSalida}\n`);
console.log('📋 Consultas disponibles:');
Object.keys(consultas).forEach((nombre, idx) => {
  console.log(`   ${idx + 1}. ${nombre}`);
});
console.log('');




