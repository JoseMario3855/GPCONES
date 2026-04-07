/**
 * Script Principal - Ejecutar Todas las Pruebas
 * Ejecuta todos los casos de prueba del sistema
 */

const testAuth = require('./test-authentication');
const testPredios = require('./test-predios');
const testXTF = require('./test-xtf');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runAllTestSuites() {
  log('\n╔══════════════════════════════════════════════════════╗', 'cyan');
  log('║  SUITE DE PRUEBAS AUTOMATIZADAS - GPCONES            ║', 'cyan');
  log('╚══════════════════════════════════════════════════════╝\n', 'cyan');

  const overallResults = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    suites: []
  };

  // Suite 1: Autenticación
  log('🔐 Ejecutando pruebas de Autenticación...', 'blue');
  try {
    const authResults = await testAuth.runAllTests();
    overallResults.suites.push({
      name: 'Autenticación',
      ...authResults
    });
    overallResults.total += authResults.passed + authResults.failed;
    overallResults.passed += authResults.passed;
    overallResults.failed += authResults.failed;
  } catch (error) {
    log(`Error ejecutando pruebas de autenticación: ${error.message}`, 'red');
  }

  // Suite 2: Predios
  log('\n🏠 Ejecutando pruebas de Gestión de Predios...', 'blue');
  try {
    const prediosResults = await testPredios.runAllTests();
    overallResults.suites.push({
      name: 'Gestión de Predios',
      ...prediosResults
    });
    overallResults.total += prediosResults.passed + prediosResults.failed;
    overallResults.passed += prediosResults.passed;
    overallResults.failed += prediosResults.failed;
  } catch (error) {
    log(`Error ejecutando pruebas de predios: ${error.message}`, 'red');
  }

  // Suite 3: XTF
  log('\n📄 Ejecutando pruebas de Carga XTF...', 'blue');
  try {
    const xtfResults = await testXTF.runAllTests();
    overallResults.suites.push({
      name: 'Carga XTF',
      ...xtfResults
    });
    overallResults.total += xtfResults.passed + xtfResults.failed + (xtfResults.skipped || 0);
    overallResults.passed += xtfResults.passed;
    overallResults.failed += xtfResults.failed;
    overallResults.skipped += xtfResults.skipped || 0;
  } catch (error) {
    log(`Error ejecutando pruebas de XTF: ${error.message}`, 'red');
  }

  // Resumen Final
  log('\n╔══════════════════════════════════════════════════════╗', 'cyan');
  log('║  RESUMEN FINAL DE PRUEBAS                            ║', 'cyan');
  log('╚══════════════════════════════════════════════════════╝\n', 'cyan');

  overallResults.suites.forEach(suite => {
    log(`\n📊 ${suite.name}:`, 'yellow');
    log(`   Aprobadas: ${suite.passed}`, suite.passed > 0 ? 'green' : 'reset');
    log(`   Fallidas: ${suite.failed}`, suite.failed > 0 ? 'red' : 'reset');
    if (suite.skipped) {
      log(`   Omitidas: ${suite.skipped}`, 'yellow');
    }
  });

  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan');
  log(`Total de Pruebas: ${overallResults.total + overallResults.skipped}`, 'cyan');
  log(`✓ Aprobadas: ${overallResults.passed}`, 'green');
  log(`✗ Fallidas: ${overallResults.failed}`, overallResults.failed > 0 ? 'red' : 'green');
  if (overallResults.skipped > 0) {
    log(`⊘ Omitidas: ${overallResults.skipped}`, 'yellow');
  }
  
  const successRate = overallResults.total > 0 
    ? ((overallResults.passed / overallResults.total) * 100).toFixed(1)
    : 0;
  
  log(`📈 Tasa de éxito: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, 'cyan');

  // Generar reporte
  const report = {
    fecha: new Date().toISOString(),
    resultado: overallResults.failed === 0 ? 'EXITOSO' : 'CON ERRORES',
    resumen: {
      total: overallResults.total + overallResults.skipped,
      aprobadas: overallResults.passed,
      fallidas: overallResults.failed,
      omitidas: overallResults.skipped,
      tasa_exito: `${successRate}%`
    },
    suites: overallResults.suites
  };

  // Guardar reporte
  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`📄 Reporte guardado en: ${reportPath}\n`, 'cyan');

  return {
    exitCode: overallResults.failed > 0 ? 1 : 0,
    results: overallResults
  };
}

// Ejecutar
if (require.main === module) {
  runAllTestSuites()
    .then(({ exitCode }) => {
      process.exit(exitCode);
    })
    .catch(error => {
      log(`\n❌ Error crítico ejecutando pruebas: ${error.message}`, 'red');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runAllTestSuites };

