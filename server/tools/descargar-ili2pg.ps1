# Script para descargar ili2pg.jar
# Ejecutar: .\descargar-ili2pg.ps1

Write-Host "=== Descarga de ili2pg.jar ===" -ForegroundColor Cyan
Write-Host ""

$toolsDir = Join-Path $PSScriptRoot "."
$jarPath = Join-Path $toolsDir "ili2pg.jar"

# URLs de descarga (intentar varias versiones)
$urls = @(
    "https://github.com/claeis/ili2db/releases/download/v5.1.0/ili2pg-5.1.0.jar",
    "https://github.com/claeis/ili2db/releases/download/v5.0.1/ili2pg-5.0.1.jar",
    "https://github.com/claeis/ili2db/releases/download/v4.5.0/ili2pg-4.5.0.jar"
)

Write-Host "Destino: $jarPath" -ForegroundColor Yellow
Write-Host ""

$descargado = $false

foreach ($url in $urls) {
    try {
        Write-Host "Intentando descargar desde: $url" -ForegroundColor Gray
        
        # Usar BITS para descarga más robusta
        $tempFile = Join-Path $env:TEMP "ili2pg-temp.jar"
        
        Invoke-WebRequest -Uri $url -OutFile $tempFile -UseBasicParsing -TimeoutSec 60 -ErrorAction Stop
        
        if (Test-Path $tempFile -and (Get-Item $tempFile).Length -gt 1000000) {
            Move-Item -Path $tempFile -Destination $jarPath -Force
            $size = (Get-Item $jarPath).Length / 1MB
            Write-Host ""
            Write-Host "✅ ili2pg.jar descargado exitosamente!" -ForegroundColor Green
            Write-Host "   Ubicación: $jarPath" -ForegroundColor Gray
            Write-Host "   Tamaño: $([math]::Round($size, 2)) MB" -ForegroundColor Gray
            $descargado = $true
            break
        }
    } catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if (Test-Path $tempFile) { Remove-Item $tempFile -ErrorAction SilentlyContinue }
        continue
    }
}

if (-not $descargado) {
    Write-Host ""
    Write-Host "❌ No se pudo descargar automáticamente" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 INSTRUCCIONES PARA DESCARGA MANUAL:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Abre tu navegador y visita:" -ForegroundColor White
    Write-Host "   https://github.com/claeis/ili2db/releases" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Busca la última versión (recomendado: v5.1.0 o superior)" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Descarga el archivo 'ili2pg-5.1.0.jar' (o similar)" -ForegroundColor White
    Write-Host ""
    Write-Host "4. Renombra el archivo a 'ili2pg.jar' y colócalo en:" -ForegroundColor White
    Write-Host "   $jarPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "5. Verifica la instalación ejecutando:" -ForegroundColor White
    Write-Host "   java -jar `"$jarPath`" --help" -ForegroundColor Cyan
    Write-Host ""
}

# Verificar si ya existe
if (Test-Path $jarPath) {
    Write-Host ""
    Write-Host "=== Verificación ===" -ForegroundColor Cyan
    Write-Host "Probando ejecución de ili2pg..." -ForegroundColor Yellow
    try {
        $result = java -jar $jarPath --help 2>&1 | Select-Object -First 5
        Write-Host "✅ ili2pg funciona correctamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "El servidor GPCONES ahora puede crear todas las tablas del modelo LADM-COL." -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Error al ejecutar ili2pg: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "   Verifica que Java esté instalado correctamente" -ForegroundColor Yellow
    }
}

