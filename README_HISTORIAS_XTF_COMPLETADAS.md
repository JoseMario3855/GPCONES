# Historias de Usuario Completadas - Módulo XTF

**Fecha:** Enero 2025  
**Versión:** 1.0.0

## 📋 Resumen

Se han completado las siguientes historias de usuario relacionadas con la gestión de archivos XTF:

## ✅ Funcionalidades Implementadas

### 1. Descarga de Archivo XTF Original
**Endpoint:** `GET /api/xtf/upload/:upload_id/download`

**Descripción:** Permite descargar el archivo XTF original que fue cargado al sistema.

**Características:**
- Verificación de existencia del archivo en base de datos y sistema de archivos
- Descarga segura con headers apropiados
- Registro de auditoría de la descarga
- Control de acceso por roles (Administrador del Sistema, Revisión de Calidad)

**Uso:**
```bash
GET /api/xtf/upload/{upload_id}/download
Authorization: Bearer {token}
```

---

### 2. Eliminación de Archivo XTF y Datos Asociados
**Endpoint:** `DELETE /api/xtf/upload/:upload_id`

**Descripción:** Elimina completamente un archivo XTF cargado, incluyendo:
- Registro en base de datos
- Archivo físico del servidor
- Logs de procesamiento asociados

**Características:**
- Eliminación transaccional (rollback en caso de error)
- Eliminación de logs de procesamiento (CASCADE)
- Eliminación del archivo físico
- Registro de auditoría
- Solo disponible para Administrador del Sistema

**Uso:**
```bash
DELETE /api/xtf/upload/{upload_id}
Authorization: Bearer {token}
```

**Nota:** Los schemas de PostgreSQL creados durante la importación NO se eliminan automáticamente para preservar los datos. Esto puede ser configurado según necesidades.

---

### 3. Reprocesamiento de Archivo XTF
**Endpoint:** `POST /api/xtf/upload/:upload_id/reprocess`

**Descripción:** Permite reprocesar un archivo XTF que ya fue cargado previamente.

**Características:**
- Reprocesamiento completo del archivo
- Validación XML y ILI
- Importación a PostgreSQL
- Integración al schema principal
- Registro detallado de logs durante el proceso
- Procesamiento asíncrono (no bloquea la respuesta)
- Actualización de estado en tiempo real

**Parámetros opcionales:**
- `model_type`: Tipo de modelo (antioquia/igac)
- `schema_name`: Nombre del schema (opcional)

**Uso:**
```bash
POST /api/xtf/upload/{upload_id}/reprocess
Authorization: Bearer {token}
Content-Type: application/json

{
  "model_type": "antioquia",
  "schema_name": "xtf_reprocess_1234567890"
}
```

---

### 4. Consulta de Logs de Procesamiento
**Endpoint:** `GET /api/xtf/upload/:upload_id/logs`

**Descripción:** Obtiene los logs detallados del procesamiento de un archivo XTF.

**Características:**
- Logs en tiempo real del procesamiento
- Filtrado por nivel (INFO, WARNING, ERROR, SUCCESS)
- Paginación de resultados
- Ordenamiento cronológico
- Detalles adicionales en formato JSON

**Parámetros de consulta:**
- `page`: Número de página (default: 1)
- `limit`: Registros por página (default: 100)
- `level`: Filtrar por nivel de log (INFO, WARNING, ERROR, SUCCESS)

**Uso:**
```bash
GET /api/xtf/upload/{upload_id}/logs?page=1&limit=50&level=ERROR
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "level": "INFO",
      "message": "Iniciando procesamiento del archivo XTF",
      "details": null,
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "pages": 1
  },
  "upload_info": {
    "id": "upload_id",
    "filename": "archivo.xtf"
  }
}
```

---

### 5. Estadísticas Reales de Archivos XTF
**Endpoint:** `GET /api/xtf/stats`

**Descripción:** Proporciona estadísticas reales y actualizadas sobre los archivos XTF cargados.

**Características:**
- Estadísticas generales (total de uploads, entidades, errores)
- Estadísticas por modelo (Antioquia, IGAC)
- Estadísticas por estado (Cargado, Validando, Procesado, Error)
- Estadísticas por mes (últimos 12 meses)
- Estadísticas de tamaño de archivos
- Top 10 usuarios que más archivos han cargado

**Uso:**
```bash
GET /api/xtf/stats
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "total_uploads": 15,
    "total_entities": 2340,
    "total_processed": 2300,
    "total_errors": 40,
    "by_model": {
      "antioquia": 12,
      "igac": 3
    },
    "by_status": {
      "procesado": 13,
      "validando": 1,
      "error": 1
    },
    "by_month": {
      "2025-01": 5,
      "2025-02": 7,
      "2025-03": 3
    },
    "file_size": {
      "total_mb": "125.50",
      "avg_mb": "8.37",
      "max_mb": "25.00",
      "min_mb": "1.20"
    },
    "top_users": [
      {
        "username": "admin_sistema",
        "full_name": "Administrador Sistema",
        "upload_count": 8,
        "total_imported": 1500
      }
    ]
  }
}
```

---

## 🗄️ Cambios en Base de Datos

### Nueva Tabla: `xtf_processing_logs`

Tabla para almacenar logs detallados del procesamiento de archivos XTF.

**Estructura:**
```sql
CREATE TABLE xtf_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID NOT NULL REFERENCES xtf_files(id) ON DELETE CASCADE,
    log_level VARCHAR(20) NOT NULL CHECK (log_level IN ('INFO', 'WARNING', 'ERROR', 'SUCCESS')),
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Índices:**
- `idx_xtf_processing_logs_upload_id` - Búsqueda por upload
- `idx_xtf_processing_logs_created_at` - Ordenamiento temporal
- `idx_xtf_processing_logs_level` - Filtrado por nivel

### Modificación: `xtf_files`

Se agregó la columna `schema_name` para almacenar el nombre del schema PostgreSQL asociado.

```sql
ALTER TABLE xtf_files ADD COLUMN schema_name VARCHAR(100);
```

---

## 📝 Scripts de Migración

Se ha creado el script `database/add_xtf_processing_logs_table.sql` para aplicar estos cambios en bases de datos existentes.

**Ejecución:**
```bash
psql -U postgres -d GP_CONES -f database/add_xtf_processing_logs_table.sql
```

---

## 🔧 Funciones Auxiliares

### `logProcessingEvent(uploadId, level, message, details)`

Función auxiliar para registrar logs de procesamiento de forma sencilla.

**Parámetros:**
- `uploadId`: ID del upload (UUID)
- `level`: Nivel del log (INFO, WARNING, ERROR, SUCCESS)
- `message`: Mensaje descriptivo
- `details`: Objeto JSON opcional con detalles adicionales

**Uso:**
```javascript
await logProcessingEvent(uploadId, 'INFO', 'Validación XML completada', {
  entities_found: 150,
  validation_time: '2.5s'
});
```

---

## 🔐 Control de Acceso

Todas las funcionalidades implementadas respetan el sistema de roles:

- **Administrador del Sistema**: Acceso completo a todas las funcionalidades
- **Revisión de Calidad**: Acceso a descarga, logs y estadísticas. No puede eliminar archivos.
- **Reconocedor Predial / Digitador Alfanumérico**: Sin acceso a estas funcionalidades

---

## 📊 Auditoría

Todas las acciones críticas se registran en `audit_logs`:

- `DESCARGA_XTF` - Descarga de archivo XTF
- `ELIMINACION_XTF` - Eliminación de archivo XTF
- `REPROCESAMIENTO_XTF` - Inicio de reprocesamiento

---

## 🧪 Pruebas

Las siguientes funcionalidades están listas para pruebas:

1. ✅ Descargar archivo XTF cargado previamente
2. ✅ Eliminar archivo XTF (solo admin)
3. ✅ Reprocesar archivo XTF existente
4. ✅ Consultar logs de procesamiento
5. ✅ Ver estadísticas reales de archivos XTF

---

## 📚 Referencias

- [README_CARGA_XTF.md](./README_CARGA_XTF.md) - Documentación general de carga XTF
- [CASOS_DE_PRUEBA.md](./CASOS_DE_PRUEBA.md) - Casos de prueba del sistema
- [Historias de Usuario](./Historiasdeusuario/) - Documentación original de historias

---

## 🚀 Próximos Pasos

Funcionalidades pendientes para futuras iteraciones:

1. **Cola de Procesamiento**: Implementar sistema de colas para reprocesamiento asíncrono
2. **Validación Previa a Exportación**: Pre-check antes de exportar XTF
3. **Perfiles de Exportación**: Guardar configuraciones de exportación reutilizables
4. **Catálogos y Dominios Controlados**: Gestión de listas de valores
5. **Reglas de Validación**: Sistema de reglas alfanuméricas y espaciales

---

**Desarrollado por BY CONESTUDIOS**  
**Sistema GPCONES - Versión 1.0.0**

