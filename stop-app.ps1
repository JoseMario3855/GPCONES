# =====================================================
# SCRIPT PARA DETENER GPCONES - BACKEND Y FRONTEND
# Sistema de Catastro Integral
# =====================================================

Write-Host "🛑 Deteniendo GPCONES - Sistema de Catastro Integral..." -ForegroundColor Red
Write-Host ""

# Detener procesos de Node.js
Write-Host "🔧 Deteniendo procesos de Node.js..." -ForegroundColor Yellow

try {
    # Detener procesos que usan los puertos 3000 y 3001
    $processes = Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue | 
                 ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue } |
                 Where-Object { $_.ProcessName -eq "node" } | 
                 Select-Object -Unique

    if ($processes) {
        foreach ($process in $processes) {
            Write-Host "   Deteniendo proceso Node.js (PID: $($process.Id))..." -ForegroundColor Yellow
            Stop-Process -Id $process.Id -Force
        }
        Write-Host "✅ Procesos de Node.js detenidos" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No se encontraron procesos de Node.js ejecutándose" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  Error deteniendo procesos: $_" -ForegroundColor Yellow
}

# Verificar que los puertos estén libres
Write-Host ""
Write-Host "🔍 Verificando que los puertos estén libres..." -ForegroundColor Cyan

$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

if (-not $port3000) {
    Write-Host "✅ Puerto 3000 (Frontend) - Libre" -ForegroundColor Green
} else {
    Write-Host "⚠️  Puerto 3000 (Frontend) - Aún en uso" -ForegroundColor Yellow
}

if (-not $port3001) {
    Write-Host "✅ Puerto 3001 (Backend) - Libre" -ForegroundColor Green
} else {
    Write-Host "⚠️  Puerto 3001 (Backend) - Aún en uso" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 ¡GPCONES ha sido detenido exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Para volver a iniciar la aplicación:" -ForegroundColor Cyan
Write-Host "   Ejecuta: .\start-app.ps1" -ForegroundColor White
Write-Host ""
Write-Host "✨ ¡Gracias por usar GPCONES!" -ForegroundColor Green
