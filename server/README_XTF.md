# Módulo XTF - Sistema GPCONES

## Descripción

El módulo XTF (eXtended Transfer Format) implementa las funcionalidades de carga, validación y procesamiento de archivos catastrales según los estándares IGAC y extensión Antioquia.

## Historias de Usuario Implementadas

### Historia 5: Carga de XTF
- **Endpoint**: `POST /api/xtf/upload`
- **Descripción**: Permite cargar archivos XTF al sistema para importación automática
- **Permisos**: Administrador del Sistema, Revisión de Calidad
- **Funcionalidades**:
  - Validación de formato (.xtf, .xml)
  - Límite de tamaño: 50MB
  - Procesamiento automático
  - Logs de auditoría

### Historia 6: Validación de Modelo ILI
- **Endpoint**: `POST /api/xtf/validate`
- **Descripción**: Valida archivos XTF contra modelos ILI antes de la importación
- **Permisos**: Administrador del Sistema, Revisión de Calidad
- **Funcionalidades**:
  - Validación de estructura XML
  - Validación contra modelo LADM-COL
  - Validación contra extensión Antioquia
  - Reporte detallado de errores y advertencias

### Historia 7: Conversión a Base de Datos
- **Funcionalidad**: Convierte datos XTF a registros PostgreSQL
- **Características**:
  - Mapeo de entidades XTF a tablas
  - Preservación de relaciones espaciales
  - Registro de auditoría completo

### Historia 8: Visualización del Proceso
- **Endpoint**: `GET /api/xtf/upload/:id/status`
- **Descripción**: Muestra el estado del procesamiento de archivos
- **Información**:
  - Progreso del procesamiento
  - Cantidad de entidades procesadas
  - Errores y advertencias

### Historia 9: Revisión de Datos Cargados
- **Endpoint**: `GET /api/xtf/upload/:id/data`
- **Descripción**: Permite revisar la información importada
- **Funcionalidades**:
  - Acceso al detalle de cada registro
  - Opciones de aprobación/rechazo
  - Exportación de reportes

## Endpoints Disponibles

### Carga y Validación
- `POST /api/xtf/upload` - Cargar archivo XTF
- `POST /api/xtf/validate` - Validar archivo XTF
- `GET /api/xtf/uploads` - Listar archivos cargados
- `GET /api/xtf/stats` - Estadísticas de archivos

### Gestión de Archivos
- `GET /api/xtf/upload/:id/status` - Estado del procesamiento
- `GET /api/xtf/upload/:id/data` - Datos del archivo
- `GET /api/xtf/upload/:id/logs` - Logs de procesamiento
- `DELETE /api/xtf/upload/:id` - Eliminar archivo
- `POST /api/xtf/upload/:id/reprocess` - Reprocesar archivo

## Formatos Soportados

### Modelos ILI
- **LADM-COL 2.0**: Estándar IGAC para administración de tierras
- **Antioquia 2.0**: Extensión regional del modelo LADM-COL

### Tipos de Archivo
- `.xtf` - Formato de transferencia extendido
- `.xml` - Formato XML estándar

## Validaciones Implementadas

### Estructura XML
- Sintaxis XML válida
- Estructura jerárquica correcta
- Referencias cruzadas válidas

### Modelo ILI
- Conformidad con LADM-COL
- Validación de entidades
- Verificación de atributos obligatorios

### Reglas de Negocio
- NPN único y válido
- Áreas dentro de rangos permitidos
- Geometrías válidas (PostGIS)
- Referencias espaciales consistentes

## Auditoría y Trazabilidad

### Eventos Registrados
- `CARGA_XTF` - Inicio de carga
- `VALIDACION_XTF` - Inicio de validación
- `CARGA_XTF_EXITOSA` - Carga completada
- `ERROR_CARGA_XTF` - Error en carga
- `VALIDACION_XTF_COMPLETADA` - Validación completada

### Información de Auditoría
- Usuario que realizó la acción
- Timestamp de la operación
- Detalles del archivo procesado
- Resultado de la operación

## Estructura de Base de Datos

### Tablas Principales
- `predios` - Información catastral básica
- `terrenos` - Geometrías y atributos del terreno
- `construcciones` - Edificaciones y estructuras
- `servidumbres` - Restricciones y servidumbres
- `terceros` - Personas y entidades relacionadas

### Campos de Auditoría
- `created_at` - Fecha de creación
- `created_by` - Usuario creador
- `updated_at` - Fecha de actualización
- `updated_by` - Usuario que actualizó

## Configuración

### Variables de Entorno
```env
# Límites de archivo
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=.xtf,.xml

# Directorios
UPLOAD_DIR=./uploads/xtf
TEMP_DIR=./uploads/temp

# Validación
VALIDATION_TIMEOUT=30000
MAX_ENTITIES_PER_FILE=10000
```

### Dependencias
```json
{
  "multer": "^1.4.5-lts.1",
  "xml2js": "^0.6.2"
}
```

## Uso del Frontend

### Componente XTFUpload
- Interfaz drag & drop para archivos
- Validación en tiempo real
- Barra de progreso
- Estadísticas de procesamiento

### Componente XTFValidation
- Selección de modelo ILI
- Validación detallada
- Reporte de errores
- Historial de validaciones

## Próximas Implementaciones

### Funcionalidades Pendientes
- [ ] Validación real contra modelos ILI
- [ ] Conversión completa a PostgreSQL
- [ ] Procesamiento asíncrono con colas
- [ ] Exportación a formatos estándar
- [ ] Integración con servicios externos

### Mejoras Técnicas
- [ ] Cache de validaciones
- [ ] Procesamiento paralelo
- [ ] Compresión de archivos
- [ ] Backup automático
- [ ] Monitoreo de rendimiento

## Soporte y Contacto

**Desarrollado por BY CONESTUDIOS**

Para soporte técnico o consultas sobre el módulo XTF, contactar al equipo de desarrollo.

---

*Documentación actualizada: Enero 2025*
*Versión del módulo: 1.0.0*
