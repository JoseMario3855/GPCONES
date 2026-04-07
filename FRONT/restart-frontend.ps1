# Script para reiniciar el frontend limpiando caché
Write-Host "`n🔄 Limpiando caché del frontend...`n" -ForegroundColor Cyan

# Limpiar caché de node_modules
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✅ Caché de node_modules limpiado" -ForegroundColor Green
}

# Limpiar carpeta build si existe
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build"
    Write-Host "✅ Carpeta build limpiada" -ForegroundColor Green
}

Write-Host "`n✅ Caché limpiado. Ahora ejecuta: npm start`n" -ForegroundColor Green




