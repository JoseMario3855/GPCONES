# =====================================================
# SCRIPT DE POWERSHELL PARA CREAR USUARIOS GPCONES
# Sistema de Catastro Integral
# =====================================================

Write-Host "🚀 Iniciando creación de usuarios de prueba para GPCONES..." -ForegroundColor Green
Write-Host ""

# Verificar si Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "   Por favor, instala Node.js desde: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verificar si npm está instalado
try {
    $npmVersion = npm --version
    Write-Host "✅ npm detectado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: npm no está instalado o no está en el PATH" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verificar si PostgreSQL está ejecutándose
Write-Host "🔍 Verificando conexión a PostgreSQL..." -ForegroundColor Yellow

try {
    # Intentar conectar a PostgreSQL
    $pgTest = psql -h localhost -U postgres -d "GP_CONES" -c "SELECT version();" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Conexión a PostgreSQL exitosa" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Advertencia: No se pudo conectar a PostgreSQL" -ForegroundColor Yellow
        Write-Host "   Asegúrate de que PostgreSQL esté ejecutándose en localhost:5432" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Advertencia: No se pudo verificar PostgreSQL" -ForegroundColor Yellow
}

Write-Host ""

# Verificar dependencias del proyecto
Write-Host "📦 Verificando dependencias del proyecto..." -ForegroundColor Yellow

if (Test-Path "package-lock.json") {
    Write-Host "✅ package-lock.json encontrado" -ForegroundColor Green
} else {
    Write-Host "⚠️  package-lock.json no encontrado, instalando dependencias..." -ForegroundColor Yellow
    npm install
}

Write-Host ""

# Verificar si bcryptjs está instalado
try {
    $bcryptCheck = npm list bcryptjs 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ bcryptjs está instalado" -ForegroundColor Green
    } else {
        Write-Host "📦 Instalando bcryptjs..." -ForegroundColor Yellow
        npm install bcryptjs
    }
} catch {
    Write-Host "📦 Instalando bcryptjs..." -ForegroundColor Yellow
    npm install bcryptjs
}

Write-Host ""

# Verificar si pg está instalado
try {
    $pgCheck = npm list pg 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ pg (PostgreSQL) está instalado" -ForegroundColor Green
    } else {
        Write-Host "📦 Instalando pg (PostgreSQL)..." -ForegroundColor Yellow
        npm install pg
    }
} catch {
    Write-Host "📦 Instalando pg (PostgreSQL)..." -ForegroundColor Yellow
    npm install pg
}

Write-Host ""

# Ejecutar el script de creación de usuarios
Write-Host "👥 Ejecutando script de creación de usuarios..." -ForegroundColor Cyan
Write-Host ""

try {
    node database/create_users.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 ¡Proceso completado exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Resumen de usuarios creados:" -ForegroundColor Cyan
        Write-Host "   👑 Administrador del Sistema: admin_sistema (admin123)" -ForegroundColor White
        Write-Host "   🔍 Revisión de Calidad: revisor_calidad (revisor123)" -ForegroundColor White
        Write-Host "   🏠 Reconocedor Predial: reconocedor_predial (reconocedor123)" -ForegroundColor White
        Write-Host "   ⌨️  Digitador Alfanumérico: digitador_alfanumerico (digitador123)" -ForegroundColor White
        Write-Host "   🧪 Usuario de Prueba: test_user (test123)" -ForegroundColor White
        Write-Host ""
        Write-Host "🔗 Ahora puedes probar el login en el frontend con cualquiera de estos usuarios" -ForegroundColor Green
    } else {
        Write-Host "❌ Error ejecutando el script de creación de usuarios" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error ejecutando el script: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📝 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   1. Verifica que el backend esté ejecutándose (npm start en la carpeta server)" -ForegroundColor White
Write-Host "   2. Verifica que el frontend esté ejecutándose (npm start en la carpeta FRONT)" -ForegroundColor White
Write-Host "   3. Prueba el login con cualquiera de los usuarios creados" -ForegroundColor White
Write-Host "   4. Verifica que los permisos funcionen correctamente según el rol" -ForegroundColor White

Write-Host ""
Write-Host "✨ ¡GPCONES está listo para las pruebas!" -ForegroundColor Green
