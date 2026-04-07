# =====================================================
# SCRIPT PARA INICIAR GPCONES - BACKEND Y FRONTEND
# Sistema de Catastro Integral
# =====================================================

Write-Host "🚀 Iniciando GPCONES - Sistema de Catastro Integral..." -ForegroundColor Green
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "server") -or -not (Test-Path "FRONT")) {
    Write-Host "❌ Error: No se encontraron las carpetas 'server' y 'FRONT'" -ForegroundColor Red
    Write-Host "   Asegúrate de estar en el directorio raíz de GPCONES" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Estructura de directorios verificada" -ForegroundColor Green
Write-Host ""

# Función para iniciar el backend
function Start-Backend {
    Write-Host "🔧 Iniciando servidor backend..." -ForegroundColor Cyan
    
    # Cambiar al directorio del servidor
    Set-Location "server"
    
    # Verificar que existe el archivo .env
    if (-not (Test-Path ".env")) {
        Write-Host "📝 Creando archivo .env desde env.example..." -ForegroundColor Yellow
        Copy-Item "env.example" ".env"
    }
    
    # Iniciar el servidor en segundo plano
    Start-Process -FilePath "node" -ArgumentList "index.js" -WindowStyle Hidden
    
    Write-Host "✅ Servidor backend iniciado en http://localhost:3001" -ForegroundColor Green
    
    # Volver al directorio raíz
    Set-Location ".."
}

# Función para iniciar el frontend
function Start-Frontend {
    Write-Host "🎨 Iniciando aplicación frontend..." -ForegroundColor Cyan
    
    # Cambiar al directorio del frontend
    Set-Location "FRONT"
    
    # Verificar dependencias
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 Instalando dependencias del frontend..." -ForegroundColor Yellow
        npm install
    }
    
    # Iniciar el frontend en segundo plano
    Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Hidden
    
    Write-Host "✅ Frontend iniciado en http://localhost:3000" -ForegroundColor Green
    
    # Volver al directorio raíz
    Set-Location ".."
}

# Función para esperar y verificar que los servicios estén listos
function Wait-ForServices {
    Write-Host ""
    Write-Host "⏳ Esperando que los servicios estén listos..." -ForegroundColor Yellow
    
    $backendReady = $false
    $frontendReady = $false
    $attempts = 0
    $maxAttempts = 30
    
    while (-not ($backendReady -and $frontendReady) -and $attempts -lt $maxAttempts) {
        $attempts++
        
        # Verificar backend
        if (-not $backendReady) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $backendReady = $true
                    Write-Host "✅ Backend listo (puerto 3001)" -ForegroundColor Green
                }
            } catch {
                # Backend aún no está listo
            }
        }
        
        # Verificar frontend
        if (-not $frontendReady) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $frontendReady = $true
                    Write-Host "✅ Frontend listo (puerto 3000)" -ForegroundColor Green
                }
            } catch {
                # Frontend aún no está listo
            }
        }
        
        if (-not ($backendReady -and $frontendReady)) {
            Write-Host "⏳ Intento $attempts/$maxAttempts - Esperando servicios..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
}

# Función para mostrar información final
function Show-FinalInfo {
    Write-Host ""
    Write-Host "🎉 ¡GPCONES está ejecutándose!" -ForegroundColor Green
    Write-Host "=" * 60
    Write-Host ""
    Write-Host "🌐 URLs de acceso:" -ForegroundColor Cyan
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "   Backend API: http://localhost:3001" -ForegroundColor White
    Write-Host "   Health Check: http://localhost:3001/health" -ForegroundColor White
    Write-Host ""
    Write-Host "👤 Usuarios de prueba disponibles:" -ForegroundColor Cyan
    Write-Host "   👑 Administrador: admin_sistema / admin123" -ForegroundColor White
    Write-Host "   🔍 Revisor: revisor_calidad / revisor123" -ForegroundColor White
    Write-Host "   🏠 Reconocedor: reconocedor_predial / reconocedor123" -ForegroundColor White
    Write-Host "   ⌨️  Digitador: digitador_alfanumerico / digitador123" -ForegroundColor White
    Write-Host "   🧪 Test: test_user / test123" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Próximos pasos:" -ForegroundColor Yellow
    Write-Host "   1. Abre http://localhost:3000 en tu navegador" -ForegroundColor White
    Write-Host "   2. Inicia sesión con cualquiera de los usuarios de prueba" -ForegroundColor White
    Write-Host "   3. Explora las diferentes funcionalidades según tu rol" -ForegroundColor White
    Write-Host ""
    Write-Host "🛑 Para detener los servicios, ejecuta: .\stop-app.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "✨ ¡Disfruta usando GPCONES!" -ForegroundColor Green
}

# Ejecutar el proceso completo
try {
    Start-Backend
    Start-Sleep -Seconds 3
    Start-Frontend
    Wait-ForServices
    Show-FinalInfo
} catch {
    Write-Host "❌ Error iniciando GPCONES: $_" -ForegroundColor Red
    exit 1
}
