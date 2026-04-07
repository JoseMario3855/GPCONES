/**
 * Script de Pruebas - Carga y Validación XTF
 * CP-015, CP-016, CP-017, CP-018, CP-019
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002/api';
let authToken = null;

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  log(`\n=== ${name} ===`, 'blue');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'yellow');
}

// Función para obtener token
async function getAuthToken() {
  if (authToken) return authToken;
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin_sistema',
      password: 'admin123'
    });
    
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      return authToken;
    }
  } catch (error) {
    logError(`Error obteniendo token: ${error.message}`);
    throw error;
  }
}

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${authToken}`
  };
}

// Test CP-016: Validar Archivo XTF
async function testValidateXTF() {
  logTest('CP-016: Validar Archivo XTF');
  
  await getAuthToken();

  // Buscar archivo XTF de ejemplo
  const xtfPath = path.join(__dirname, '../Historiasdeusuario/xtf_donmatias_rural_20252508.xtf');
  
  if (!fs.existsSync(xtfPath)) {
    logError(`Archivo XTF no encontrado: ${xtfPath}`);
    logInfo('Este test requiere un archivo XTF válido');
    return { success: false, skipped: true };
  }

  try {
    const formData = new FormData();
    formData.append('xtf_file', fs.createReadStream(xtfPath));
    formData.append('model_type', 'antioquia');

    const response = await axios.post(
      `${BASE_URL}/xtf/validate`,
      formData,
      {
        headers: {
          ...getAuthHeaders(),
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    if (response.data.success) {
      logSuccess('Validación XTF exitosa');
      logInfo(`Archivo: ${path.basename(xtfPath)}`);
      logInfo(`Modelo: ${response.data.data?.model_type || 'antioquia'}`);
      logInfo(`Total entidades: ${response.data.data?.total_entities || 'N/A'}`);
      logInfo(`Válido: ${response.data.data?.is_valid ? 'Sí' : 'No'}`);
      return { success: true, data: response.data.data };
    } else {
      logError('Validación falló');
      return { success: false };
    }
  } catch (error) {
    logError(`Error validando XTF: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      logInfo(`Detalles: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { success: false };
  }
}

// Test CP-017: Cargar Archivo XTF Inválido
async function testUploadInvalidXTF() {
  logTest('CP-017: Cargar Archivo XTF Inválido');
  
  await getAuthToken();

  // Crear archivo XML inválido temporal
  const tempInvalidPath = path.join(__dirname, 'temp-invalid.xtf');
  fs.writeFileSync(tempInvalidPath, '<?xml version="1.0"?><INVALID>Malformed XML');

  try {
    const formData = new FormData();
    formData.append('xtf_file', fs.createReadStream(tempInvalidPath));
    formData.append('model_type', 'antioquia');

    await axios.post(
      `${BASE_URL}/xtf/upload`,
      formData,
      {
        headers: {
          ...getAuthHeaders(),
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    // Limpiar archivo temporal
    fs.unlinkSync(tempInvalidPath);

    logError('No debería permitir cargar archivo inválido');
    return { success: false };
  } catch (error) {
    // Limpiar archivo temporal
    if (fs.existsSync(tempInvalidPath)) {
      fs.unlinkSync(tempInvalidPath);
    }

    if (error.response?.status === 400) {
      logSuccess('Archivo inválido rechazado correctamente');
      logInfo(`Mensaje: ${error.response.data.message}`);
      return { success: true };
    } else {
      logError(`Error inesperado: ${error.message}`);
      return { success: false };
    }
  }
}

// Test CP-019: Listar Archivos XTF Cargados
async function testListXTFUploads() {
  logTest('CP-019: Listar Archivos XTF Cargados');
  
  await getAuthToken();

  try {
    const response = await axios.get(
      `${BASE_URL}/xtf/uploads`,
      { headers: getAuthHeaders() }
    );

    if (response.data.success) {
      logSuccess('Lista de uploads obtenida exitosamente');
      const uploads = response.data.data || [];
      logInfo(`Total uploads: ${uploads.length}`);
      
      if (uploads.length > 0) {
        logInfo(`Primer upload: ${uploads[0].filename}`);
        logInfo(`Estado: ${uploads[0].status}`);
      }
      
      return { success: true, uploads };
    } else {
      logError('Error obteniendo lista de uploads');
      return { success: false };
    }
  } catch (error) {
    logError(`Error listando uploads: ${error.response?.data?.message || error.message}`);
    return { success: false };
  }
}

// Test CP-018: Verificar Estado de Carga
async function testGetUploadStatus() {
  logTest('CP-018: Verificar Estado de Carga');
  
  await getAuthToken();

  // Primero obtener lista de uploads
  const listResult = await testListXTFUploads();
  if (!listResult.success || !listResult.uploads || listResult.uploads.length === 0) {
    logInfo('No hay uploads disponibles para probar estado');
    return { success: false, skipped: true };
  }

  const uploadId = listResult.uploads[0].id;

  try {
    const response = await axios.get(
      `${BASE_URL}/xtf/upload/${uploadId}/status`,
      { headers: getAuthHeaders() }
    );

    if (response.data.success && response.data.data) {
      logSuccess('Estado de upload obtenido exitosamente');
      const status = response.data.data;
      logInfo(`Upload ID: ${status.upload_id}`);
      logInfo(`Estado: ${status.status}`);
      logInfo(`Progreso: ${status.progress}%`);
      logInfo(`Entidades procesadas: ${status.entities_processed || 0}`);
      logInfo(`Entidades importadas: ${status.entities_imported || 0}`);
      return { success: true };
    } else {
      logError('Error obteniendo estado');
      return { success: false };
    }
  } catch (error) {
    logError(`Error obteniendo estado: ${error.response?.data?.message || error.message}`);
    return { success: false };
  }
}

// Test CP-015: Cargar Archivo XTF Válido (comentado por defecto - requiere archivo real)
async function testUploadXTF() {
  logTest('CP-015: Cargar Archivo XTF Válido');
  logInfo('Este test requiere un archivo XTF válido y puede tardar varios minutos');
  logInfo('Descomenta este test si tienes un archivo XTF de prueba');
  
  return { success: false, skipped: true };
  
  /* Descomenta para ejecutar:
  await getAuthToken();

  const xtfPath = path.join(__dirname, '../Historiasdeusuario/xtf_donmatias_rural_20252508.xtf');
  
  if (!fs.existsSync(xtfPath)) {
    logError(`Archivo XTF no encontrado: ${xtfPath}`);
    return { success: false, skipped: true };
  }

  try {
    const formData = new FormData();
    formData.append('xtf_file', fs.createReadStream(xtfPath));
    formData.append('model_type', 'antioquia');

    const response = await axios.post(
      `${BASE_URL}/xtf/upload`,
      formData,
      {
        headers: {
          ...getAuthHeaders(),
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 300000 // 5 minutos
      }
    );

    if (response.data.success) {
      logSuccess('Carga XTF exitosa');
      logInfo(`Upload ID: ${response.data.data?.upload_id}`);
      logInfo(`Entidades importadas: ${response.data.data?.entities_imported || 0}`);
      return { success: true, uploadId: response.data.data?.upload_id };
    } else {
      logError('Carga falló');
      return { success: false };
    }
  } catch (error) {
    logError(`Error cargando XTF: ${error.response?.data?.message || error.message}`);
    return { success: false };
  }
  */
}

// Ejecutar todas las pruebas
async function runAllTests() {
  log('\n========================================', 'blue');
  log('PRUEBAS DE CARGA Y VALIDACIÓN XTF', 'blue');
  log('========================================\n', 'blue');

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
  };

  // CP-016: Validar XTF
  const test1 = await testValidateXTF();
  results.tests.push({ name: 'CP-016: Validar XTF', passed: test1.success, skipped: test1.skipped });
  if (test1.success) results.passed++;
  else if (test1.skipped) results.skipped++;
  else results.failed++;

  // CP-017: Cargar XTF Inválido
  const test2 = await testUploadInvalidXTF();
  results.tests.push({ name: 'CP-017: Cargar XTF Inválido', passed: test2.success });
  if (test2.success) results.passed++; else results.failed++;

  // CP-019: Listar Uploads
  const test3 = await testListXTFUploads();
  results.tests.push({ name: 'CP-019: Listar Uploads', passed: test3.success });
  if (test3.success) results.passed++; else results.failed++;

  // CP-018: Estado de Carga
  const test4 = await testGetUploadStatus();
  results.tests.push({ name: 'CP-018: Estado de Carga', passed: test4.success, skipped: test4.skipped });
  if (test4.success) results.passed++;
  else if (test4.skipped) results.skipped++;
  else results.failed++;

  // CP-015: Cargar XTF (opcional)
  const test5 = await testUploadXTF();
  results.tests.push({ name: 'CP-015: Cargar XTF', passed: test5.success, skipped: test5.skipped });
  if (test5.success) results.passed++;
  else if (test5.skipped) results.skipped++;
  else results.failed++;

  // Resumen
  log('\n========================================', 'blue');
  log('RESUMEN DE PRUEBAS', 'blue');
  log('========================================\n', 'blue');
  
  results.tests.forEach(test => {
    if (test.skipped) {
      log(`⊘ ${test.name} (omitido)`, 'yellow');
    } else if (test.passed) {
      logSuccess(test.name);
    } else {
      logError(test.name);
    }
  });

  log(`\nTotal: ${results.passed + results.failed + results.skipped} pruebas`);
  log(`Aprobadas: ${results.passed}`, 'green');
  log(`Fallidas: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Omitidas: ${results.skipped}`, 'yellow');
  
  return results;
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runAllTests()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      logError(`Error ejecutando pruebas: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  testValidateXTF,
  testUploadInvalidXTF,
  testListXTFUploads,
  testGetUploadStatus,
  testUploadXTF,
  runAllTests
};

