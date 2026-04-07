# Casos de Prueba - Sistema GPCONES

**Versión:** 1.0.0  
**Fecha:** Enero 2025  
**Sistema:** GP Cones - Sistema de Catastro Integral

---

## Índice

1. [Autenticación y Seguridad](#1-autenticación-y-seguridad)
2. [Gestión de Usuarios y Roles](#2-gestión-de-usuarios-y-roles)
3. [Gestión Catastral - Predios](#3-gestión-catastral---predios)
4. [Carga y Validación XTF](#4-carga-y-validación-xtf)
5. [Revisión y Aprobación de Datos](#5-revisión-y-aprobación-de-datos)
6. [Exportación XTF](#6-exportación-xtf)
7. [Dashboard y Estadísticas](#7-dashboard-y-estadísticas)

---

## 1. Autenticación y Seguridad

### CP-001: Login Exitoso
**Prioridad:** Alta  
**Precondiciones:** Usuario existe en la base de datos

**Pasos:**
1. Acceder a http://localhost:3000/login
2. Ingresar username y password válidos
3. Hacer clic en "Iniciar Sesión"

**Resultado Esperado:**
- Usuario autenticado correctamente
- Redirección al Dashboard
- Token JWT almacenado
- Auditoría registrada (LOGIN_EXITOSO)

**Datos de Prueba:**
```
Username: admin_sistema
Password: admin123
```

---

### CP-002: Login con Credenciales Inválidas
**Prioridad:** Alta

**Pasos:**
1. Acceder a http://localhost:3000/login
2. Ingresar username o password incorrectos
3. Hacer clic en "Iniciar Sesión"

**Resultado Esperado:**
- Mensaje de error: "Credenciales inválidas"
- No se genera token
- Auditoría registrada (LOGIN_FALLIDO)
- No hay redirección

---

### CP-003: Recuperación de Contraseña
**Prioridad:** Media

**Pasos:**
1. Acceder a página de recuperación de contraseña
2. Ingresar email válido
3. Enviar solicitud
4. Verificar email recibido
5. Hacer clic en enlace de recuperación
6. Ingresar nueva contraseña válida
7. Confirmar nueva contraseña

**Resultado Esperado:**
- Email de recuperación enviado
- Token de recuperación válido (30 min)
- Contraseña actualizada exitosamente
- Usuario puede iniciar sesión con nueva contraseña

---

### CP-004: Validación de Token Expirado
**Prioridad:** Media

**Pasos:**
1. Obtener token JWT
2. Esperar expiración (24h) o usar token expirado
3. Realizar petición autenticada

**Resultado Esperado:**
- Error 401: "Token expirado o inválido"
- Redirección al login

---

## 2. Gestión de Usuarios y Roles

### CP-005: Listar Usuarios (Administrador)
**Prioridad:** Alta  
**Rol:** Administrador del Sistema

**Pasos:**
1. Iniciar sesión como administrador
2. Acceder a módulo "Usuarios"
3. Visualizar lista de usuarios

**Resultado Esperado:**
- Lista completa de usuarios con paginación
- Filtros por rol y estado funcionando
- Búsqueda por nombre/email/username
- Información: nombre, email, rol, estado, última actividad

---

### CP-006: Crear Nuevo Usuario
**Prioridad:** Alta  
**Rol:** Administrador del Sistema

**Pasos:**
1. Acceder a "Usuarios" → "Nuevo Usuario"
2. Llenar formulario:
   - Username: usuario_prueba
   - Email: prueba@test.com
   - Nombre completo: Usuario Prueba
   - Rol: Reconocedor Predial
   - Contraseña: prueba123
3. Guardar

**Resultado Esperado:**
- Usuario creado exitosamente
- Contraseña hasheada con bcrypt
- Usuario activo por defecto
- Auditoría registrada (CREACION_USUARIO)
- Mensaje de confirmación

---

### CP-007: Cambiar Rol de Usuario
**Prioridad:** Media  
**Rol:** Administrador del Sistema

**Pasos:**
1. Seleccionar usuario existente
2. Editar usuario
3. Cambiar rol de "Reconocedor Predial" a "Revisión de Calidad"
4. Guardar cambios

**Resultado Esperado:**
- Rol actualizado inmediatamente
- Permisos actualizados sin requerir nuevo login
- Auditoría registrada (CAMBIO_ROL)
- Usuario ve cambios en interfaz

---

### CP-008: Desactivar Usuario (Soft Delete)
**Prioridad:** Alta

**Pasos:**
1. Seleccionar usuario activo
2. Hacer clic en "Desactivar"
3. Confirmar acción

**Resultado Esperado:**
- Usuario marcado como inactivo (is_active = false)
- No puede iniciar sesión
- Historial preservado
- Auditoría registrada
- Usuario puede reactivarse después

---

### CP-009: Intentar Acceder sin Permisos
**Prioridad:** Alta

**Pasos:**
1. Iniciar sesión como "Reconocedor Predial"
2. Intentar acceder a módulo "Usuarios"
3. Intentar acceder a endpoint /api/users

**Resultado Esperado:**
- Acceso denegado (403)
- Mensaje: "No tienes permisos para esta acción"
- Redirección o bloqueo de funcionalidad

---

## 3. Gestión Catastral - Predios

### CP-010: Crear Nuevo Predio
**Prioridad:** Alta

**Pasos:**
1. Acceder a "Predios" → "Registrar Predio"
2. Paso 1 - Datos Básicos:
   - NPN: TEST-001-2025
   - Municipio: Medellín
   - Zona: 1
   - Sector: A
   - Número de Ficha: 100
3. Paso 2 - Información Física:
   - Área: 2.5 ha
   - Tipo: URBANO
   - Uso: RESIDENCIAL
4. Paso 3 - Propietario:
   - Nombre: Juan Pérez
   - Tipo Documento: CC
   - Número: 1234567890
5. Paso 4 - Geometría:
   - Cargar GeoJSON válido o dibujar en mapa
6. Guardar

**Resultado Esperado:**
- Predio creado exitosamente
- Estado inicial: "Borrador"
- Geometría guardada en PostGIS
- NPN único validado
- Auditoría registrada (CREACION_PREDIO)

---

### CP-011: Validar NPN Único
**Prioridad:** Alta

**Pasos:**
1. Crear predio con NPN: TEST-001-2025
2. Intentar crear segundo predio con mismo NPN
3. Guardar

**Resultado Esperado:**
- Error 400: "NPN duplicado"
- Mensaje: "El Número de Predio Nacional (NPN) ya existe"
- Predio no se crea
- Validación en frontend y backend

---

### CP-012: Consultar Predios con Filtros
**Prioridad:** Alta

**Pasos:**
1. Acceder a lista de predios
2. Aplicar filtros:
   - Municipio: Medellín
   - Estado: Aprobado
   - Tipo: URBANO
3. Buscar por NPN: TEST-001

**Resultado Esperado:**
- Resultados filtrados correctamente
- Paginación funcionando
- Contador de resultados
- Exportación a CSV/GeoJSON disponible

---

### CP-013: Cambiar Estado de Predio
**Prioridad:** Alta  
**Rol:** Revisión de Calidad o Administrador

**Pasos:**
1. Seleccionar predio en estado "Borrador"
2. Cambiar estado a "En Revisión"
3. Agregar observaciones opcionales
4. Guardar

**Resultado Esperado:**
- Estado actualizado
- Observaciones guardadas
- Auditoría registrada (CAMBIO_ESTADO_PREDIO)
- Flujo: Borrador → En Revisión → Aprobado/Rechazado

---

### CP-014: Actualizar Información de Predio
**Prioridad:** Media

**Pasos:**
1. Seleccionar predio existente
2. Editar información (ej: área, propietario)
3. Guardar cambios

**Resultado Esperado:**
- Predio actualizado
- updated_at actualizado
- updated_by registrado
- Auditoría con previous_state y new_state

---

## 4. Carga y Validación XTF

### CP-015: Cargar Archivo XTF Válido
**Prioridad:** Alta  
**Rol:** Administrador del Sistema o Revisión de Calidad

**Pasos:**
1. Acceder a "XTF" → "Cargar XTF"
2. Seleccionar archivo .xtf válido
3. Seleccionar modelo: Antioquia Extendido
4. Opcional: Especificar nombre de schema
5. Cargar archivo

**Resultado Esperado:**
- Archivo validado (XML + ILI)
- Schema PostgreSQL creado
- Datos importados correctamente
- Registro en xtf_files con estado "Procesado"
- Integración automática al schema principal
- Auditoría completa registrada

**Archivos de Prueba:**
- `xtf_donmatias_rural_20252508.xtf` (en Historiasdeusuario/)

---

### CP-016: Validar Archivo XTF Antes de Cargar
**Prioridad:** Alta

**Pasos:**
1. Acceder a "XTF" → "Validar XTF"
2. Seleccionar archivo .xtf
3. Seleccionar modelo ILI
4. Ejecutar validación

**Resultado Esperado:**
- Validación XML exitosa
- Validación contra modelo ILI
- Reporte detallado:
  - Total de entidades
  - Entidades válidas
  - Errores encontrados
  - Advertencias
- Estado de validación (válido/inválido)

---

### CP-017: Cargar Archivo XTF Inválido
**Prioridad:** Alta

**Pasos:**
1. Intentar cargar archivo XML malformado
2. O archivo XTF que no cumple modelo ILI

**Resultado Esperado:**
- Error en validación
- Estado en xtf_files: "Error"
- Mensaje de error claro
- Errores detallados en error_details
- No se importan datos

---

### CP-018: Verificar Estado de Carga
**Prioridad:** Media

**Pasos:**
1. Iniciar carga de archivo XTF
2. Obtener upload_id de la respuesta
3. Consultar GET /api/xtf/upload/:upload_id/status

**Resultado Esperado:**
- Estado actual (Cargado/Validando/Validado/Procesado/Error)
- Progreso porcentual
- Entidades procesadas
- Tiempo de procesamiento
- Errores/advertencias

---

### CP-019: Listar Archivos XTF Cargados
**Prioridad:** Media

**Pasos:**
1. Acceder a lista de uploads XTF
2. Aplicar filtros (estado, tipo)
3. Paginar resultados

**Resultado Esperado:**
- Lista de todos los uploads
- Información: archivo, modelo, estado, fecha, usuario
- Estadísticas: entidades, tamaño
- Filtros funcionando
- Paginación correcta

---

## 5. Revisión y Aprobación de Datos

### CP-020: Revisar Datos Cargados desde XTF
**Prioridad:** Alta  
**Rol:** Revisión de Calidad

**Pasos:**
1. Acceder a upload procesado
2. Ver detalles del upload
3. Acceder a "Revisar Datos"
4. Ver lista de registros importados

**Resultado Esperado:**
- Lista paginada de registros
- Información completa de cada predio
- Estado actual de cada registro
- Filtros y búsqueda disponibles

---

### CP-021: Aprobar Registros Individuales
**Prioridad:** Alta

**Pasos:**
1. Revisar datos de upload
2. Seleccionar uno o más registros
3. Hacer clic en "Aprobar"
4. Confirmar acción

**Resultado Esperado:**
- Estado cambiado a "Aprobado"
- Registros marcados como válidos
- Auditoría registrada (APROBACION_REGISTRO_XTF)
- Registros disponibles para exportación

---

### CP-022: Aprobar Todos los Registros
**Prioridad:** Media

**Pasos:**
1. En revisión de datos
2. Seleccionar "Aprobar Todos"
3. Confirmar acción
4. Enviar request: `POST /api/xtf/upload/:id/approve` con `{"all": true}`

**Resultado Esperado:**
- Todos los registros aprobados
- Conteo de registros aprobados
- Auditoría masiva registrada

---

### CP-023: Rechazar Registro con Observaciones
**Prioridad:** Alta

**Pasos:**
1. Seleccionar registro para rechazar
2. Hacer clic en "Rechazar"
3. Ingresar observaciones obligatorias: "Datos incompletos en propietario"
4. Confirmar

**Resultado Esperado:**
- Estado cambiado a "Rechazado"
- Observaciones guardadas en auditoría
- Registro no disponible para exportación
- Auditoría registrada (RECHAZO_REGISTRO_XTF)

---

### CP-024: Validar Observaciones Obligatorias en Rechazo
**Prioridad:** Alta

**Pasos:**
1. Intentar rechazar registro sin observaciones
2. O con observaciones vacías

**Resultado Esperado:**
- Error 400: "Las observaciones son obligatorias"
- Registro no se rechaza
- Mensaje claro al usuario

---

## 6. Exportación XTF

### CP-025: Exportar Predios Aprobados (Revisión de Calidad)
**Prioridad:** Alta  
**Rol:** Revisión de Calidad

**Pasos:**
1. Acceder a exportación XTF
2. Seleccionar modelo: Antioquia Extendido
3. Establecer `only_validated=true`
4. Ejecutar exportación

**Resultado Esperado:**
- Solo predios con estado "Aprobado" se exportan
- Archivo XTF generado válido
- Descarga automática del archivo
- Auditoría registrada (EXPORTACION_XTF)
- Archivo cumple con modelo ILI especificado

---

### CP-026: Exportar Todos los Predios (Administrador)
**Prioridad:** Alta  
**Rol:** Administrador del Sistema

**Pasos:**
1. Acceder a exportación
2. Seleccionar modelo: IGAC 1.0
3. No establecer filtro only_validated
4. Exportar

**Resultado Esperado:**
- Todos los predios exportados (sin restricción de estado)
- Archivo XTF válido
- Descarga exitosa
- Auditoría completa

---

### CP-027: Exportar con Filtros (Municipio, Estado)
**Prioridad:** Media

**Pasos:**
1. Exportar con filtros:
   - Municipio: Medellín
   - Estado: Aprobado
   - Modelo: Antioquia
2. Ejecutar exportación

**Resultado Esperado:**
- Solo predios que cumplan filtros exportados
- Archivo XTF con datos filtrados
- Estadísticas de exportación

---

### CP-028: Validar Permisos de Exportación
**Prioridad:** Alta

**Pasos:**
1. Iniciar sesión como "Reconocedor Predial"
2. Intentar acceder a exportación XTF
3. O hacer request directo a /api/xtf/export

**Resultado Esperado:**
- Acceso denegado (403)
- Mensaje: "No tienes permisos para exportar XTF"
- Revisión de Calidad solo puede exportar validados

---

## 7. Dashboard y Estadísticas

### CP-029: Visualizar Dashboard
**Prioridad:** Media

**Pasos:**
1. Iniciar sesión
2. Acceder a Dashboard principal

**Resultado Esperado:**
- Estadísticas principales:
  - Total de predios
  - Área total (ha)
  - Área promedio (ha)
  - Usuarios activos
- Gráficos de estado de predios
- Top municipios
- Actividad reciente
- Sin errores en consola

---

### CP-030: Estadísticas de Predios
**Prioridad:** Media

**Pasos:**
1. Consultar GET /api/predios/stats
2. Verificar estructura de respuesta

**Resultado Esperado:**
- Estadísticas generales:
  - Total, por estado, por tipo
  - Área total y promedio
- Estadísticas por municipio
- Datos correctos y actualizados

---

### CP-031: Estadísticas de Usuarios
**Prioridad:** Baja

**Pasos:**
1. Consultar GET /api/users/stats

**Resultado Esperado:**
- Total de usuarios
- Usuarios por rol
- Usuarios activos/inactivos
- Últimas actividades

---

## Casos de Prueba de Integración

### CP-032: Flujo Completo - Carga a Exportación
**Prioridad:** Crítica

**Pasos:**
1. Cargar archivo XTF válido
2. Verificar estado de carga
3. Revisar datos importados
4. Aprobar registros seleccionados
5. Exportar predios aprobados

**Resultado Esperado:**
- Flujo completo sin errores
- Datos consistentes en cada paso
- Auditoría completa
- Archivo exportado contiene solo predios aprobados

---

### CP-033: Manejo de Errores en Carga XTF
**Prioridad:** Alta

**Escenarios:**
1. Archivo muy grande (>50MB)
2. Formato inválido
3. Conexión perdida durante carga
4. Base de datos no disponible

**Resultado Esperado:**
- Errores manejados correctamente
- Mensajes claros al usuario
- Estado de error registrado
- Rollback si es necesario

---

## Casos de Prueba de Rendimiento

### CP-034: Carga de Archivo XTF Grande
**Prioridad:** Media

**Pasos:**
1. Cargar archivo XTF con >1000 registros
2. Monitorear tiempo de procesamiento
3. Verificar uso de recursos

**Resultado Esperado:**
- Procesamiento completado (timeout adecuado)
- Progreso visible al usuario
- Sin errores de memoria
- Datos importados correctamente

---

### CP-035: Consulta con Muchos Registros
**Prioridad:** Baja

**Pasos:**
1. Listar predios con >10,000 registros
2. Aplicar filtros
3. Paginar resultados

**Resultado Esperado:**
- Respuesta en <2 segundos
- Paginación eficiente
- Filtros aplicados correctamente

---

## Casos de Prueba de Seguridad

### CP-036: Inyección SQL
**Prioridad:** Crítica

**Pasos:**
1. Intentar inyección SQL en campos de búsqueda
2. Ejemplo: `'; DROP TABLE predios; --`

**Resultado Esperado:**
- Input sanitizado
- No se ejecuta código SQL malicioso
- Error manejado correctamente

---

### CP-037: XSS (Cross-Site Scripting)
**Prioridad:** Crítica

**Pasos:**
1. Intentar ingresar script en campos de texto
2. Ejemplo: `<script>alert('XSS')</script>`

**Resultado Esperado:**
- Scripts escapados/sanitizados
- No se ejecutan en el navegador
- Datos guardados de forma segura

---

### CP-038: Validación de Tokens JWT
**Prioridad:** Crítica

**Pasos:**
1. Intentar modificar token JWT
2. Intentar usar token de otro usuario
3. Intentar acceder sin token

**Resultado Esperado:**
- Tokens modificados rechazados
- Acceso solo a recursos del usuario autenticado
- Sin token: 401 Unauthorized

---

## Datos de Prueba Sugeridos

### Usuarios de Prueba

```
Administrador:
- Username: admin_sistema
- Password: admin123
- Rol: Administrador del Sistema

Revisor:
- Username: revisor_calidad
- Password: revisor123
- Rol: Revisión de Calidad

Reconocedor:
- Username: reconocedor_predial
- Password: reconocedor123
- Rol: Reconocedor Predial

Digitador:
- Username: digitador_alfanumerico
- Password: digitador123
- Rol: Digitador Alfanumérico
```

### Predios de Prueba

```
NPN: TEST-001-2025
Municipio: Medellín
Tipo: URBANO
Estado: Borrador

NPN: TEST-002-2025
Municipio: Bello
Tipo: RURAL
Estado: Aprobado
```

---

## Checklist de Ejecución

### Pre-ejecución
- [ ] Base de datos GP_CONES creada
- [ ] Tablas creadas (schema.sql ejecutado)
- [ ] Usuarios de prueba creados
- [ ] Servidor backend corriendo (puerto 3002)
- [ ] Frontend corriendo (puerto 3000)
- [ ] PostgreSQL y PostGIS configurados

### Post-ejecución
- [ ] Registrar resultados de cada caso
- [ ] Documentar bugs encontrados
- [ ] Verificar auditoría en base de datos
- [ ] Revisar logs del servidor
- [ ] Validar integridad de datos

---

## Criterios de Aceptación

Un caso de prueba se considera **APROBADO** si:
- ✅ Todos los pasos se ejecutan sin errores
- ✅ Resultado esperado coincide con resultado real
- ✅ No se generan errores en consola/logs
- ✅ Datos se guardan correctamente en BD
- ✅ Auditoría se registra apropiadamente
- ✅ Permisos y seguridad funcionan correctamente

Un caso se considera **FALLIDO** si:
- ❌ Error durante ejecución
- ❌ Resultado no coincide con esperado
- ❌ Datos no se guardan o se corrompen
- ❌ Vulnerabilidad de seguridad detectada
- ❌ Rendimiento inaceptable

---

## Reporte de Pruebas

**Template:**

```
Caso: CP-XXX
Descripción: [Nombre del caso]
Fecha: [Fecha de ejecución]
Ejecutado por: [Nombre del tester]
Resultado: [APROBADO/FALLIDO]
Observaciones: [Notas adicionales]
Bugs encontrados: [IDs de bugs si aplica]
Tiempo de ejecución: [X minutos]
```

---

## 🧪 Scripts de Prueba Automatizados

Se han creado scripts automatizados para ejecutar las pruebas principales del sistema:

### Ejecución Rápida

**Windows (PowerShell):**
```powershell
.\run-tests.ps1
```

**Manual:**
```bash
cd tests
npm install axios form-data
node run-all-tests.js
```

### Scripts Disponibles

- **`tests/test-authentication.js`** - Pruebas de autenticación (CP-001, CP-002, CP-004)
- **`tests/test-predios.js`** - Pruebas de gestión de predios (CP-010, CP-011, CP-012, CP-013)
- **`tests/test-xtf.js`** - Pruebas de carga XTF (CP-015, CP-016, CP-017, CP-018, CP-019)
- **`tests/run-all-tests.js`** - Ejecuta todas las suites de prueba

### Requisitos

- Backend corriendo en `http://localhost:3002`
- Usuarios de prueba creados (ver `tests/README.md`)
- Node.js instalado
- Dependencias: `axios`, `form-data`

Para más información, ver `tests/README.md`

---

**Desarrollado por BY CONESTUDIOS**  
**Sistema GPCONES - Versión 1.0.0**

