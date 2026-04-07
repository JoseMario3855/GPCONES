# Script para ejecutar pruebas automatizadas de GPCONES
# PowerShell Script

Write-Host "🧪 Ejecutando Pruebas Automatizadas - GPCONES`n" -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "tests")) {
    Write-Host "❌ Error: Directorio 'tests' no encontrado" -ForegroundColor Red
    Write-Host "   Asegúrate de estar en el directorio raíz de GPCONES" -ForegroundColor Yellow
    exit 1
}

# Verificar que Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js no está instalado o no está en PATH" -ForegroundColor Red
    exit 1
}

# Verificar que el servidor está corriendo
Write-Host "`n🔍 Verificando servidor backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Servidor backend está corriendo" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Advertencia: No se pudo conectar al servidor backend" -ForegroundColor Yellow
    Write-Host "   Asegúrate de que el servidor esté corriendo en http://localhost:3002" -ForegroundColor Yellow
    Write-Host "   Ejecuta: cd server; npm start" -ForegroundColor Yellow
    $continue = Read-Host "¿Deseas continuar de todas formas? (S/N)"
    if ($continue -ne "S" -and $continue -ne "s") {
        exit 1
    }
}

# Instalar dependencias si no existen
Write-Host "`n📦 Verificando dependencias..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules/axios") -or -not (Test-Path "node_modules/form-data")) {
    Write-Host "   Instalando dependencias..." -ForegroundColor Yellow
    npm install axios form-data --no-save
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error instalando dependencias" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencias ya instaladas" -ForegroundColor Green
}

# Ejecutar pruebas
Write-Host "`n🚀 Ejecutando pruebas...`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Set-Location tests
node run-all-tests.js
$testExitCode = $LASTEXITCODE
Set-Location ..

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if ($testExitCode -eq 0) {
    Write-Host "`n✅ Todas las pruebas pasaron exitosamente" -ForegroundColor Green
} else {
    Write-Host "`n❌ Algunas pruebas fallaron. Revisa el output anterior." -ForegroundColor Red
}

Write-Host "`n📄 El reporte detallado se guardó en: tests/test-report.json`n" -ForegroundColor Cyan

exit $testExitCode

