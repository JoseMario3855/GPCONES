# Recuperación de Contraseña - GPCONES

## ✅ Historia de Usuario Completada

**Historia 1: Recuperación de contraseña**
> Como usuario registrado, quiero poder recuperar mi contraseña, para que no pierda el acceso al sistema en caso de olvido.

## 🚀 Funcionalidades Implementadas

### 1. **Solicitud de Recuperación**
- **Endpoint**: `POST /api/auth/forgot-password`
- **Funcionalidad**: Envía enlace de restablecimiento por correo
- **Seguridad**: No revela si el email existe o no
- **Expiración**: 30 minutos según especificaciones

### 2. **Verificación de Token**
- **Endpoint**: `GET /api/auth/verify-reset-token/:token`
- **Funcionalidad**: Verifica validez del token antes de mostrar formulario
- **Validaciones**: Token no expirado, no usado, usuario activo

### 3. **Restablecimiento de Contraseña**
- **Endpoint**: `POST /api/auth/reset-password`
- **Funcionalidad**: Cambia contraseña con token válido
- **Validaciones**: Contraseña segura (8+ caracteres, mayúscula, minúscula, número, carácter especial)

### 4. **Envío de Email**
- **Servicio**: `emailService.js`
- **Características**: 
  - Email HTML responsivo
  - Enlace seguro con token único
  - Información de expiración
  - Diseño corporativo GPCONES

## 🗄️ Base de Datos

### Tabla: `password_reset_tokens`
```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP
);
```

### Índices Optimizados
- `idx_password_reset_tokens_user_id` - Búsqueda por usuario
- `idx_password_reset_tokens_token` - Validación de token
- `idx_password_reset_tokens_expires_at` - Limpieza de tokens expirados

## 🎨 Interfaz de Usuario

### 1. **Página de Solicitud** (`/forgot-password`)
- Formulario simple con email
- Validación en tiempo real
- Mensaje de confirmación
- Enlace de regreso al login

### 2. **Página de Restablecimiento** (`/reset-password/:token`)
- Verificación automática del token
- Formulario de nueva contraseña
- Validación de seguridad
- Confirmación de contraseña
- Estados: Cargando, Válido, Expirado, Éxito

### 3. **Estados de la Aplicación**
- **Verificando**: Spinner mientras valida token
- **Token Válido**: Muestra formulario de restablecimiento
- **Token Expirado**: Mensaje de error con enlace para solicitar nuevo
- **Éxito**: Confirmación y redirección al login

## 🔒 Seguridad Implementada

### 1. **Tokens Seguros**
- Generación con `crypto.randomBytes(32)`
- Expiración automática en 30 minutos
- Uso único (se marca como usado)
- Invalidación de tokens anteriores

### 2. **Validaciones de Contraseña**
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un carácter especial

### 3. **Auditoría Completa**
- Registro de solicitudes de recuperación
- Registro de restablecimientos exitosos
- Trazabilidad de tokens usados
- Logs de errores y intentos fallidos

## ⚙️ Configuración

### Variables de Entorno Requeridas
```env
# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=gpcones.system@gmail.com
SMTP_PASS=your_app_password_here
FRONTEND_URL=http://localhost:3000

# Seguridad
PASSWORD_RESET_EXPIRY_MINUTES=30
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_SPECIAL_CHARS=true
```

### Configuración de Gmail
1. Habilitar autenticación de 2 factores
2. Generar contraseña de aplicación
3. Usar la contraseña de aplicación en `SMTP_PASS`

## 🧪 Criterios de Aceptación Cumplidos

✅ **Envío de enlace de restablecimiento por correo con expiración (30 min)**
✅ **Solicitud de nueva contraseña que cumple con la política definida**
✅ **Bloqueo de enlaces caducados o ya usados**
✅ **Interfaz intuitiva y responsive**
✅ **Auditoría completa de eventos**
✅ **Validaciones de seguridad robustas**

## 📱 Flujo de Usuario

1. **Usuario olvida contraseña** → Va a `/forgot-password`
2. **Ingresa email** → Sistema envía enlace (si existe)
3. **Recibe email** → Hace clic en enlace
4. **Sistema verifica token** → Muestra formulario si es válido
5. **Ingresa nueva contraseña** → Sistema valida y actualiza
6. **Confirmación** → Redirección al login

## 🔧 Mantenimiento

### Limpieza de Tokens Expirados
```sql
-- Ejecutar periódicamente para limpiar tokens expirados
DELETE FROM password_reset_tokens 
WHERE expires_at < NOW() OR used = true;
```

### Monitoreo
- Revisar logs de auditoría para intentos fallidos
- Monitorear tasa de éxito de recuperaciones
- Verificar funcionamiento del servicio de email

## 🎯 Próximos Pasos

La funcionalidad de recuperación de contraseña está **100% implementada** y lista para producción. 

**Siguiente historia recomendada**: Completar la gestión de roles y permisos (Historia 2) o continuar con el registro de predios (Historia 3).

---

**Desarrollado por BY CONESTUDIOS**  
**Sistema GPCONES - Versión 1.0.0**
