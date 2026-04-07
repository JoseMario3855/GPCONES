# Scripts de Prueba Automatizados - GPCONES

Este directorio contiene scripts de prueba automatizados para validar las funcionalidades del sistema GPCONES.

## 📋 Requisitos Previos

1. **Servidor Backend corriendo** en `http://localhost:3002`
2. **Base de datos configurada** con usuarios de prueba
3. **Node.js** instalado con las dependencias:
   ```bash
   npm install axios form-data
   ```

## 🚀 Ejecución Rápida

### Ejecutar Todas las Pruebas

```bash
node tests/run-all-tests.js
```

### Ejecutar Pruebas Individuales

```bash
# Pruebas de Autenticación
node tests/test-authentication.js

# Pruebas de Gestión de Predios
node tests/test-predios.js

# Pruebas de Carga XTF
node tests/test-xtf.js
```

## 📦 Estructura de Pruebas

### test-authentication.js
- CP-001: Login Exitoso
- CP-002: Login con Credenciales Inválidas
- CP-004: Validar Token
- CP-004: Acceso sin/con Token

### test-predios.js
- CP-010: Crear Nuevo Predio
- CP-011: Validar NPN Único
- CP-012: Consultar Predios con Filtros
- CP-013: Cambiar Estado de Predio

### test-xtf.js
- CP-015: Cargar Archivo XTF Válido (opcional)
- CP-016: Validar Archivo XTF
- CP-017: Cargar Archivo XTF Inválido
- CP-018: Verificar Estado de Carga
- CP-019: Listar Archivos XTF Cargados

## 🔧 Configuración

### Usuarios de Prueba Requeridos

Asegúrate de tener estos usuarios en la base de datos:

```sql
-- Usuario Administrador
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin_sistema', 'admin@test.com', '$2b$12$...', 'Administrador', 'Administrador del Sistema')
ON CONFLICT DO NOTHING;
```

**Nota:** Las contraseñas deben estar hasheadas con bcrypt. Usa el script `create-users.ps1` o `create-users.js` para crear usuarios de prueba.

### Variables de Configuración

Puedes modificar la URL base en cada script:

```javascript
const BASE_URL = 'http://localhost:3002/api';
```

## 📊 Interpretación de Resultados

### Códigos de Salida
- `0` - Todas las pruebas pasaron
- `1` - Una o más pruebas fallaron

### Colores en Output
- 🟢 **Verde** - Prueba aprobada
- 🔴 **Rojo** - Prueba fallida
- 🟡 **Amarillo** - Información o prueba omitida

### Reporte JSON

Después de ejecutar todas las pruebas, se genera un archivo `test-report.json` con:
- Fecha de ejecución
- Resumen de resultados
- Detalles por suite de pruebas
- Tasa de éxito

## 🐛 Troubleshooting

### Error: "Cannot find module 'axios'"
```bash
cd GPCONES
npm install axios form-data
```

### Error: "ECONNREFUSED"
- Verifica que el servidor backend esté corriendo en el puerto 3002
- Verifica la URL en los scripts

### Error: "401 Unauthorized"
- Verifica que los usuarios de prueba existan
- Verifica las credenciales en los scripts
- Verifica que las contraseñas estén correctamente hasheadas

### Error: "No hay token disponible"
- Ejecuta primero las pruebas de autenticación
- O ejecuta `testLoginSuccess()` antes de otras pruebas

## 📝 Agregar Nuevas Pruebas

Para agregar un nuevo caso de prueba:

1. Abre el archivo correspondiente (ej: `test-predios.js`)
2. Crea una nueva función async:
   ```javascript
   async function testNewFeature() {
     logTest('CP-XXX: Nombre del Test');
     await getAuthToken();
     
     try {
       // Tu código de prueba aquí
       logSuccess('Prueba exitosa');
       return { success: true };
     } catch (error) {
       logError(`Error: ${error.message}`);
       return { success: false };
     }
   }
   ```
3. Agrega la función a `runAllTests()`
4. Exporta la función en `module.exports`

## 🔐 Seguridad

- ⚠️ **No ejecutes estas pruebas en producción**
- ⚠️ Los scripts usan credenciales hardcodeadas (solo para pruebas)
- ⚠️ Los datos de prueba pueden crear/modificar datos en la BD

## 📚 Casos de Prueba Cubiertos

Ver el documento completo `CASOS_DE_PRUEBA.md` en la raíz del proyecto para la lista completa de casos de prueba y sus criterios de aceptación.

---

**Desarrollado por BY CONESTUDIOS**  
**Sistema GPCONES - Versión 1.0.0**

