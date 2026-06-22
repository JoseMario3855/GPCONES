const fs = require('fs');
const path = require('path');

function fix() {
  const filePath = path.join(__dirname, '../../database/consultas_alfanumerico.json');
  console.log('Reading file from:', filePath);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const queries = JSON.parse(content);
  
  let q = queries['CalificacionesConstrucciones'];
  if (!q) {
    console.error('CalificacionesConstrucciones not found in JSON');
    return;
  }
  
  // Find the exact text in the query around "PuntosPiso"
  // Let's print out what is around "PuntosPiso"
  const searchPattern = /END\)\s+AS\s+"PuntosPiso"(\s+)MAX\(CASE/gi;
  
  if (searchPattern.test(q)) {
    console.log('Found the target pattern without comma!');
    const fixedQuery = q.replace(searchPattern, 'END) AS "PuntosPiso",$1MAX(CASE');
    queries['CalificacionesConstrucciones'] = fixedQuery;
    
    // Write back
    fs.writeFileSync(filePath, JSON.stringify(queries, null, 2), 'utf8');
    console.log('✅ Comma fixed and file saved successfully!');
  } else {
    console.log('Pattern without comma not found. Let us inspect what is after PuntosPiso:');
    const idx = q.indexOf('PuntosPiso');
    if (idx !== -1) {
      console.log('Context:', q.substring(idx - 50, idx + 150));
    } else {
      console.log('"PuntosPiso" not found in the query string.');
    }
  }
}

fix();
