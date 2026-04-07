# =====================================================
# Script para verificar y ejecutar GPCONES
# Verifica base de datos, migraciones y ejecuta la app
# =====================================================

Write-Host "🔍 Verificando configuración de GPCONES..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "server") -or -not (Test-Path "FRONT")) {
    Write-Host "❌ Error: No se encontraron las carpetas 'server' y 'FRONT'" -ForegroundColor Red
    Write-Host "   Asegúrate de estar en el directorio raíz de GPCONES" -ForegroundColor Yellow
    exit 1
}

# Verificar archivo .env en servidor
Set-Location "server"
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creando archivo .env desde env.example..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "✅ Archivo .env creado. Por favor revisa la configuración si es necesario." -ForegroundColor Green
} else {
    Write-Host "✅ Archivo .env encontrado" -ForegroundColor Green
}
Set-Location ".."

# Verificar dependencias del backend
Write-Host ""
Write-Host "📦 Verificando dependencias del backend..." -ForegroundColor Cyan
Set-Location "server"
if (-not (Test-Path "node_modules")) {
    Write-Host "   Instalando dependencias del backend..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "✅ Dependencias del backend instaladas" -ForegroundColor Green
}
Set-Location ".."

# Verificar dependencias del frontend
Write-Host ""
Write-Host "📦 Verificando dependencias del frontend..." -ForegroundColor Cyan
Set-Location "FRONT"
if (-not (Test-Path "node_modules")) {
    Write-Host "   Instalando dependencias del frontend..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "✅ Dependencias del frontend instaladas" -ForegroundColor Green
}
Set-Location ".."

# Verificar migración de base de datos
Write-Host ""
Write-Host "🗄️  Verificando migración de base de datos..." -ForegroundColor Cyan
Write-Host "   Ejecutando script de migración para tabla xtf_processing_logs..." -ForegroundColor Yellow

# Leer configuración de base de datos desde .env
$envContent = Get-Content "server\.env" -Raw
$dbName = ($envContent | Select-String -Pattern "DB_NAME=(\w+)" | ForEach-Object { $_.Matches.Groups[1].Value })
$dbUser = ($envContent | Select-String -Pattern "DB_USER=(\w+)" | ForEach-Object { $_.Matches.Groups[1].Value })
$dbPassword = ($envContent | Select-String -Pattern "DB_PASSWORD=(\w+)" | ForEach-Object { $_.Matches.Groups[1].Value })

if ($dbName -and $dbUser) {
    $env:PGPASSWORD = $dbPassword
    try {
        # Verificar si la tabla ya existe
        $checkTable = psql -U $dbUser -d $dbName -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'xtf_processing_logs');" 2>&1
        
        if ($checkTable -match "f") {
            Write-Host "   Aplicando migración..." -ForegroundColor Yellow
            psql -U $dbUser -d $dbName -f "database\add_xtf_processing_logs_table.sql" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Migración aplicada exitosamente" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Advertencia: No se pudo aplicar la migración automáticamente" -ForegroundColor Yellow
                Write-Host "   Puedes aplicarla manualmente ejecutando:" -ForegroundColor Yellow
                Write-Host "   psql -U $dbUser -d $dbName -f database\add_xtf_processing_logs_table.sql" -ForegroundColor White
            }
        } else {
            Write-Host "✅ Tabla xtf_processing_logs ya existe" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  No se pudo verificar/aplicar la migración automáticamente" -ForegroundColor Yellow
        Write-Host "   Asegúrate de que PostgreSQL esté ejecutándose y aplica la migración manualmente si es necesario" -ForegroundColor Yellow
    }
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
} else {
    Write-Host "⚠️  No se pudo leer la configuración de base de datos" -ForegroundColor Yellow
    Write-Host "   Asegúrate de aplicar la migración manualmente:" -ForegroundColor Yellow
    Write-Host "   psql -U postgres -d GP_CONES -f database\add_xtf_processing_logs_table.sql" -ForegroundColor White
}

Write-Host ""
Write-Host "🚀 Iniciando GPCONES..." -ForegroundColor Green
Write-Host ""

# Ejecutar el script de inicio
& ".\start-app.ps1"

