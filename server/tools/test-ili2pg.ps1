# Script de prueba para ili2pg
# Ejecutar: .\test-ili2pg.ps1

Write-Host "=== Prueba de ili2pg ===" -ForegroundColor Cyan
Write-Host ""

$jarPath = "E:\GPCONES\GPCONES\server\tools\ili2pg.jar"
$libsPath = "E:\GPCONES\GPCONES\server\tools\ili2pg-folder\libs"

# Verificar archivos
if (-not (Test-Path $jarPath)) {
    Write-Host "❌ ili2pg.jar no encontrado: $jarPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $libsPath)) {
    Write-Host "❌ Librerías no encontradas: $libsPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Archivos encontrados" -ForegroundColor Green
Write-Host ""

# Construir comando de prueba
$classpath = "$jarPath;$libsPath\*"
$javaCommand = "java -cp `"$classpath`" ch.interlis.ili2pg.Main"

Write-Host "Probando conexión a PostgreSQL..." -ForegroundColor Yellow
Write-Host "Comando: $javaCommand --help" -ForegroundColor Gray
Write-Host ""

try {
    $result = & java -cp "$classpath" ch.interlis.ili2pg.Main --help 2>&1
    Write-Host "✅ ili2pg funciona correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "Salida:" -ForegroundColor Cyan
    $result | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} catch {
    Write-Host "❌ Error ejecutando ili2pg: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Prueba de conexión a PostgreSQL ===" -ForegroundColor Cyan
Write-Host ""

# Comando de prueba con conexión
$testCommand = "$javaCommand --dbhost localhost --dbport 5432 --dbdatabase GP_CONES --dbusr postgres --dbpwd 12345 --dbschema test_schema --help"

Write-Host "Comando de prueba:" -ForegroundColor Yellow
Write-Host $testCommand -ForegroundColor Gray
Write-Host ""

try {
    $testResult = & java -cp "$classpath" ch.interlis.ili2pg.Main --dbhost localhost --dbport 5432 --dbdatabase GP_CONES --dbusr postgres --dbpwd 12345 --dbschema test_schema --help 2>&1
    Write-Host "✅ Comando ejecutado" -ForegroundColor Green
    Write-Host ""
    Write-Host "Salida:" -ForegroundColor Cyan
    $testResult | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Detalles del error:" -ForegroundColor Yellow
    $_.Exception | Format-List -Force
}

