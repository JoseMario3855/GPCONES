const fs = require('fs');
const path = require('path');

/**
 * Script para generar un archivo SQL con todos los municipios de Colombia
 * Basado en la lista oficial del DANE
 * 
 * Este script genera un archivo SQL que puede contener hasta 1123 municipios
 */

// Lista completa de municipios de Colombia (ejemplo - completar con datos oficiales)
const municipiosColombia = [
  // Este es un ejemplo. Para la lista completa, necesitarías:
  // 1. Descargar el archivo oficial del DANE
  // 2. O usar una API que proporcione los datos
  // 3. O completar manualmente esta lista
  
  // Ejemplo de estructura:
  { codigo_dane: '05001', nombre: 'Medellín', departamento: 'Antioquia', codigo_departamento: '05' },
  { codigo_dane: '05002', nombre: 'Abejorral', departamento: 'Antioquia', codigo_departamento: '05' },
  // ... agregar todos los municipios aquí
];

function generateSQL(municipios) {
  let sql = `-- =====================================================
-- LISTA COMPLETA DE MUNICIPIOS DE COLOMBIA
-- =====================================================
-- Total de municipios: ${municipios.length}
-- Generado automáticamente
-- =====================================================

INSERT INTO municipios (codigo_dane, nombre, departamento, codigo_departamento) VALUES
`;

  const values = municipios.map((m, index) => {
    const comma = index < municipios.length - 1 ? ',' : '';
    return `('${m.codigo_dane}', '${m.nombre.replace(/'/g, "''")}', '${m.departamento.replace(/'/g, "''")}', '${m.codigo_departamento}')${comma}`;
  });

  sql += values.join('\n');
  sql += `\nON CONFLICT (codigo_dane) DO UPDATE
SET nombre = EXCLUDED.nombre,
    departamento = EXCLUDED.departamento,
    codigo_departamento = EXCLUDED.codigo_departamento,
    updated_at = CURRENT_TIMESTAMP;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Municipios de Colombia importados: ${municipios.length}';
END $$;
`;

  return sql;
}

// Función principal
function main() {
  console.log('\n🚀 Generando archivo SQL con municipios de Colombia...\n');
  
  if (municipiosColombia.length === 0) {
    console.log('⚠️  No hay municipios en la lista.');
    console.log('📝 Por favor, completa el array municipiosColombia con todos los municipios.\n');
    return;
  }
  
  const sql = generateSQL(municipiosColombia);
  const outputFile = path.join(__dirname, 'municipios_colombia_completo.sql');
  
  fs.writeFileSync(outputFile, sql, 'utf8');
  
  console.log(`✅ Archivo SQL generado: ${outputFile}`);
  console.log(`📊 Total de municipios: ${municipiosColombia.length}\n`);
  console.log('📝 Para ejecutar el script SQL:');
  console.log('   node run_insert_municipios.js\n');
}

if (require.main === module) {
  main();
}

module.exports = { generateSQL };




