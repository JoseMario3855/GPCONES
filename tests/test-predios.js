/**
 * Script de Pruebas - Gestión de Predios
 * CP-010, CP-011, CP-012, CP-013
 */

const axios = require('axios');

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

// Función para obtener token (requiere autenticación previa)
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

function generate30DigitNPN() {
  let npn = '18094';
  while (npn.length < 30) {
    npn += Math.floor(Math.random() * 10);
  }
  return npn;
}

// Test CP-010: Crear Nuevo Predio
async function testCreatePredio() {
  logTest('CP-010: Crear Nuevo Predio');
  
  await getAuthToken();
  
  const testNPN = generate30DigitNPN();
  
  const predioData = {
    npn: testNPN,
    municipio: 'Medellín',
    zona: '1',
    sector: 'A',
    numero_ficha: '100',
    area_hectareas: 2.5,
    tipo_predio: 'URBANO',
    uso_predio: 'RESIDENCIAL',
    propietario_nombre: 'Juan Pérez',
    propietario_documento: '1234567890',
    propietario_tipo_documento: 'CC',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-75.567, 6.244],
        [-75.566, 6.244],
        [-75.566, 6.245],
        [-75.567, 6.245],
        [-75.567, 6.244]
      ]]
    }
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/predios`,
      predioData,
      { headers: getAuthHeaders() }
    );

    if (response.data.success && response.data.predio) {
      logSuccess('Predio creado exitosamente');
      logInfo(`ID: ${response.data.predio.id}`);
      logInfo(`NPN: ${response.data.predio.npn}`);
      logInfo(`Estado: ${response.data.predio.estado}`);
      return { success: true, predio: response.data.predio };
    } else {
      logError('Predio no se creó correctamente');
      return { success: false };
    }
  } catch (error) {
    logError(`Error creando predio: ${error.response?.data?.message || error.message}`);
    if (error.response?.data?.error) {
      logError(`Detalles: ${JSON.stringify(error.response.data)}`);
    }
    return { success: false, error: error.message };
  }
}

// Test CP-011: Validar NPN Único
async function testNPNUnique() {
  logTest('CP-011: Validar NPN Único');
  
  await getAuthToken();
  
  // Primero crear un predio
  const testNPN = generate30DigitNPN();
  
  const predioData = {
    npn: testNPN,
    municipio: 'Medellín',
    zona: '1',
    sector: 'A',
    area_hectareas: 2.5,
    tipo_predio: 'URBANO',
    uso_predio: 'RESIDENCIAL',
    propietario_nombre: 'Test User',
    propietario_documento: '1234567890',
    propietario_tipo_documento: 'CC',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-75.567, 6.244],
        [-75.566, 6.244],
        [-75.566, 6.245],
        [-75.567, 6.245],
        [-75.567, 6.244]
      ]]
    }
  };

  try {
    // Crear primer predio
    await axios.post(
      `${BASE_URL}/predios`,
      predioData,
      { headers: getAuthHeaders() }
    );
    logInfo('Primer predio creado');

    // Intentar crear segundo predio con mismo NPN
    const response = await axios.post(
      `${BASE_URL}/predios`,
      predioData,
      { headers: getAuthHeaders() }
    );

    logError('No debería permitir crear predio con NPN duplicado');
    return { success: false };
  } catch (error) {
    if (error.response?.status === 400 && 
        (error.response.data.message?.includes('NPN') || 
         error.response.data.error === 'NPN duplicado')) {
      logSuccess('NPN duplicado rechazado correctamente');
      logInfo(`Mensaje: ${error.response.data.message || error.response.data.error}`);
      return { success: true };
    } else {
      logError(`Error inesperado: ${error.message}`);
      return { success: false };
    }
  }
}

// Test CP-012: Consultar Predios con Filtros
async function testQueryPredios() {
  logTest('CP-012: Consultar Predios con Filtros');
  
  await getAuthToken();

  try {
    // Consulta sin filtros
    let response = await axios.get(
      `${BASE_URL}/predios`,
      { headers: getAuthHeaders() }
    );

    if (response.data.success) {
      logSuccess('Consulta sin filtros exitosa');
      logInfo(`Total predios: ${response.data.data?.total || response.data.predios?.length || 0}`);
    }

    // Consulta con filtros
    response = await axios.get(
      `${BASE_URL}/predios?municipio=Medellín&estado=Aprobado&tipo_predio=URBANO&page=1&limit=10`,
      { headers: getAuthHeaders() }
    );

    if (response.data.success) {
      logSuccess('Consulta con filtros exitosa');
      logInfo(`Predios encontrados: ${response.data.data?.predios?.length || response.data.predios?.length || 0}`);
      logInfo(`Municipio filtrado: Medellín`);
      logInfo(`Estado filtrado: Aprobado`);
      return { success: true };
    } else {
      logError('Consulta con filtros falló');
      return { success: false };
    }
  } catch (error) {
    logError(`Error consultando predios: ${error.response?.data?.message || error.message}`);
    return { success: false };
  }
}

// Test CP-013: Cambiar Estado de Predio
async function testChangePredioStatus() {
  logTest('CP-013: Cambiar Estado de Predio');
  
  await getAuthToken();

  // Primero crear un predio
  const createResult = await testCreatePredio();
  if (!createResult.success || !createResult.predio) {
    logError('No se pudo crear predio para prueba de cambio de estado');
    return { success: false };
  }

  const predioId = createResult.predio.id;

  try {
    // Cambiar estado a "En Revisión"
    const response = await axios.patch(
      `${BASE_URL}/predios/${predioId}/status`,
      {
        estado: 'En Revisión',
        observaciones: 'Predio en revisión - prueba automatizada'
      },
      { headers: getAuthHeaders() }
    );

    if (response.data.success && response.data.data) {
      logSuccess('Estado cambiado exitosamente');
      logInfo(`Estado anterior: Borrador`);
      logInfo(`Estado nuevo: ${response.data.data.estado}`);
      return { success: true };
    } else {
      logError('Cambio de estado falló');
      return { success: false };
    }
  } catch (error) {
    logError(`Error cambiando estado: ${error.response?.data?.message || error.message}`);
    return { success: false };
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  log('\n========================================', 'blue');
  log('PRUEBAS DE GESTIÓN DE PREDIOS', 'blue');
  log('========================================\n', 'blue');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // CP-010: Crear Predio
  const test1 = await testCreatePredio();
  results.tests.push({ name: 'CP-010: Crear Predio', passed: test1.success });
  if (test1.success) results.passed++; else results.failed++;

  // CP-011: NPN Único
  const test2 = await testNPNUnique();
  results.tests.push({ name: 'CP-011: NPN Único', passed: test2.success });
  if (test2.success) results.passed++; else results.failed++;

  // CP-012: Consultar con Filtros
  const test3 = await testQueryPredios();
  results.tests.push({ name: 'CP-012: Consultar Predios', passed: test3.success });
  if (test3.success) results.passed++; else results.failed++;

  // CP-013: Cambiar Estado
  const test4 = await testChangePredioStatus();
  results.tests.push({ name: 'CP-013: Cambiar Estado', passed: test4.success });
  if (test4.success) results.passed++; else results.failed++;

  // Resumen
  log('\n========================================', 'blue');
  log('RESUMEN DE PRUEBAS', 'blue');
  log('========================================\n', 'blue');
  
  results.tests.forEach(test => {
    if (test.passed) {
      logSuccess(test.name);
    } else {
      logError(test.name);
    }
  });

  log(`\nTotal: ${results.passed + results.failed} pruebas`);
  log(`Aprobadas: ${results.passed}`, 'green');
  log(`Fallidas: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  
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
  testCreatePredio,
  testNPNUnique,
  testQueryPredios,
  testChangePredioStatus,
  runAllTests
};

