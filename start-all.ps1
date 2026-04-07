# Script para iniciar GPCONES Backend y Frontend en segundo plano
Write-Host "🚀 Iniciando GPCONES Backend y Frontend..." -ForegroundColor Green

# Iniciar Backend en segundo plano
Write-Host "📡 Iniciando Backend en puerto 3002..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'E:\GPCONES\GPCONES\server'; npm start"

# Esperar un momento
Start-Sleep -Seconds 3

# Iniciar Frontend en segundo plano
Write-Host "🌐 Iniciando Frontend en puerto 3000..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'E:\GPCONES\GPCONES\FRONT'; npm start"

Write-Host "✅ Ambos servicios iniciados en segundo plano" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "📡 Backend: http://localhost:3002/health" -ForegroundColor Yellow
Write-Host "⏳ Espera unos segundos para que se carguen completamente..." -ForegroundColor Cyan
