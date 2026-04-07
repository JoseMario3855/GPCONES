/**
 * Script de Pruebas - Autenticación y Seguridad
 * CP-001, CP-002, CP-004
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

// Test CP-001: Login Exitoso
async function testLoginSuccess() {
  logTest('CP-001: Login Exitoso');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin_sistema',
      password: 'admin123'
    });

    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      logSuccess('Login exitoso');
      logInfo(`Token recibido: ${authToken.substring(0, 20)}...`);
      logInfo(`Usuario: ${response.data.user.full_name}`);
      logInfo(`Rol: ${response.data.user.role}`);
      return true;
    } else {
      logError('Login falló: No se recibió token');
      return false;
    }
  } catch (error) {
    logError(`Login falló: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test CP-002: Login con Credenciales Inválidas
async function testLoginInvalid() {
  logTest('CP-002: Login con Credenciales Inválidas');
  
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      username: 'usuario_inexistente',
      password: 'password_incorrecto'
    });
    
    logError('Login no debería haber sido exitoso');
    return false;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 400) {
      logSuccess('Login rechazado correctamente');
      logInfo(`Mensaje: ${error.response.data.message}`);
      return true;
    } else {
      logError(`Error inesperado: ${error.message}`);
      return false;
    }
  }
}

// Test CP-004: Validar Token
async function testValidateToken() {
  logTest('CP-004: Validar Token');
  
  if (!authToken) {
    logError('No hay token disponible, ejecuta primero testLoginSuccess');
    return false;
  }

  try {
    const response = await axios.get(`${BASE_URL}/auth/validate-token`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success && response.data.token_info?.valid) {
      logSuccess('Token válido');
      logInfo(`Usuario: ${response.data.user.username}`);
      return true;
    } else {
      logError('Token inválido');
      return false;
    }
  } catch (error) {
    logError(`Validación falló: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test CP-004: Acceso sin Token
async function testAccessWithoutToken() {
  logTest('CP-004: Acceso sin Token');
  
  try {
    await axios.get(`${BASE_URL}/users`);
    logError('Acceso no debería ser permitido sin token');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('Acceso denegado correctamente sin token');
      return true;
    } else {
      logError(`Error inesperado: ${error.message}`);
      return false;
    }
  }
}

// Test CP-004: Acceso con Token Válido
async function testAccessWithToken() {
  logTest('CP-004: Acceso con Token Válido');
  
  if (!authToken) {
    logError('No hay token disponible');
    return false;
  }

  try {
    const response = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.user) {
      logSuccess('Acceso permitido con token válido');
      logInfo(`Perfil: ${response.data.user.full_name}`);
      return true;
    } else {
      logError('No se recibió información del usuario');
      return false;
    }
  } catch (error) {
    logError(`Acceso falló: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  log('\n========================================', 'blue');
  log('PRUEBAS DE AUTENTICACIÓN Y SEGURIDAD', 'blue');
  log('========================================\n', 'blue');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // CP-001: Login Exitoso (debe ejecutarse primero)
  const test1 = await testLoginSuccess();
  results.tests.push({ name: 'CP-001: Login Exitoso', passed: test1 });
  if (test1) results.passed++; else results.failed++;

  // CP-002: Login Inválido
  const test2 = await testLoginInvalid();
  results.tests.push({ name: 'CP-002: Login Inválido', passed: test2 });
  if (test2) results.passed++; else results.failed++;

  // CP-004: Validar Token
  const test3 = await testValidateToken();
  results.tests.push({ name: 'CP-004: Validar Token', passed: test3 });
  if (test3) results.passed++; else results.failed++;

  // CP-004: Acceso sin Token
  const test4 = await testAccessWithoutToken();
  results.tests.push({ name: 'CP-004: Acceso sin Token', passed: test4 });
  if (test4) results.passed++; else results.failed++;

  // CP-004: Acceso con Token
  const test5 = await testAccessWithToken();
  results.tests.push({ name: 'CP-004: Acceso con Token', passed: test5 });
  if (test5) results.passed++; else results.failed++;

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
  testLoginSuccess,
  testLoginInvalid,
  testValidateToken,
  testAccessWithoutToken,
  testAccessWithToken,
  runAllTests
};

