# 👥 Creación de Usuarios de Prueba - GPCONES

Este documento explica cómo crear usuarios de prueba para cada rol en el sistema GPCONES.

## 🎯 Objetivo

Crear usuarios de prueba para cada rol del sistema, permitiendo probar las funcionalidades específicas de cada uno:

- **👑 Administrador del Sistema**: Acceso completo a todas las funcionalidades
- **🔍 Revisión de Calidad**: Validación y aprobación de predios
- **🏠 Reconocedor Predial**: Captura de información en campo
- **⌨️ Digitador Alfanumérico**: Ingreso y corrección de datos

## 🚀 Métodos de Creación

### Opción 1: Script de PowerShell (Recomendado)

```powershell
# Ejecutar desde la raíz del proyecto
.\create-users.ps1
```

### Opción 2: Script de Node.js Directo

```bash
# Instalar dependencias si no están instaladas
npm install bcryptjs pg

# Ejecutar el script
node database/create_users.js
```

### Opción 3: SQL Directo

```sql
-- Conectar a la base de datos GP_CONES
\c "GP_CONES"

-- Ejecutar el script SQL
\i database/create_test_users.sql
```

## 🔑 Usuarios Creados

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| `admin_sistema` | admin@gpcones.com | admin123 | Administrador del Sistema |
| `revisor_calidad` | revisor@gpcones.com | revisor123 | Revisión de Calidad |
| `reconocedor_predial` | reconocedor@gpcones.com | reconocedor123 | Reconocedor Predial |
| `digitador_alfanumerico` | digitador@gpcones.com | digitador123 | Digitador Alfanumérico |
| `test_user` | test@gpcones.com | test123 | Digitador Alfanumérico |

## 📋 Requisitos Previos

### 1. Base de Datos
- ✅ PostgreSQL ejecutándose en localhost:5432
- ✅ Base de datos `GP_CONES` creada
- ✅ Usuario `postgres` con contraseña `12345`
- ✅ Esquema ejecutado (`database/schema.sql`)

### 2. Dependencias
- ✅ Node.js (versión 14 o superior)
- ✅ npm
- ✅ bcryptjs
- ✅ pg (PostgreSQL para Node.js)

### 3. Estructura del Proyecto
```
GPCONES/
├── database/
│   ├── schema.sql
│   ├── create_test_users.sql
│   ├── create_users.js
│   └── README_USUARIOS.md
├── create-users.ps1
└── package.json
```

## 🔧 Configuración de la Base de Datos

### Variables de Entorno
```bash
# En el archivo .env del servidor
DB_HOST=localhost
DB_PORT=5432
DB_NAME=GP_CONES
DB_USER=postgres
DB_PASSWORD=12345
```

### Conexión Manual
```bash
# Conectar a PostgreSQL
psql -h localhost -U postgres

# Crear base de datos (si no existe)
CREATE DATABASE "GP_CONES" WITH ENCODING 'UTF8';

# Conectar a la base de datos
\c "GP_CONES"

# Ejecutar esquema
\i database/schema.sql
```

## 📊 Verificación

### 1. Verificar Usuarios Creados
```sql
SELECT 
    username,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM users 
ORDER BY role, username;
```

### 2. Verificar Estadísticas por Rol
```sql
SELECT 
    role,
    COUNT(*) as cantidad_usuarios,
    COUNT(CASE WHEN is_active = true THEN 1 END) as usuarios_activos
FROM users 
GROUP BY role
ORDER BY role;
```

### 3. Verificar Estructura de la Tabla
```sql
\d users
```

## 🧪 Pruebas de Login

### 1. Iniciar el Backend
```bash
cd server
npm start
```

### 2. Iniciar el Frontend
```bash
cd FRONT
npm start
```

### 3. Probar Login
- Ir a `http://localhost:3000/login`
- Usar cualquiera de los usuarios creados
- Verificar que los permisos funcionen según el rol

## 🔒 Seguridad

### Contraseñas
- ✅ Hasheadas con bcrypt (costo 12)
- ✅ No se almacenan en texto plano
- ✅ Únicas para cada usuario

### Roles
- ✅ Validados con CHECK constraints
- ✅ No se pueden crear roles personalizados
- ✅ Permisos específicos por rol

### Auditoría
- ✅ Todas las acciones se registran en `audit_logs`
- ✅ Trazabilidad completa de operaciones
- ✅ Eventos críticos marcados

## 🚨 Solución de Problemas

### Error: "Connection refused"
```bash
# Verificar que PostgreSQL esté ejecutándose
sudo service postgresql status

# Iniciar PostgreSQL si no está ejecutándose
sudo service postgresql start
```

### Error: "Database does not exist"
```sql
-- Crear la base de datos
CREATE DATABASE "GP_CONES" WITH ENCODING 'UTF8';
```

### Error: "Permission denied"
```bash
# Verificar permisos del usuario postgres
sudo -u postgres psql

# Crear usuario si no existe
CREATE USER postgres WITH PASSWORD '12345';
GRANT ALL PRIVILEGES ON DATABASE "GP_CONES" TO postgres;
```

### Error: "Module not found"
```bash
# Instalar dependencias faltantes
npm install bcryptjs pg
```

## 📝 Notas Importantes

1. **Contraseñas de Prueba**: Las contraseñas son simples para facilitar las pruebas
2. **Emails Únicos**: Cada email debe ser único en el sistema
3. **Roles Fijos**: Los roles están predefinidos y no se pueden modificar
4. **Auditoría**: Todas las operaciones se registran automáticamente
5. **Backup**: Se recomienda hacer backup antes de ejecutar scripts

## 🔄 Actualización de Usuarios

Para actualizar usuarios existentes:

```bash
# El script maneja conflictos automáticamente
node database/create_users.js

# O manualmente
psql -h localhost -U postgres -d "GP_CONES" -f database/create_test_users.sql
```

## 📞 Soporte

Si encuentras problemas:

1. Verifica los requisitos previos
2. Revisa los logs de PostgreSQL
3. Verifica la conexión a la base de datos
4. Asegúrate de que el esquema esté ejecutado

---

**🎉 ¡GPCONES está listo para las pruebas con usuarios de todos los roles!**
