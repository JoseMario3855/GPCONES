# Módulo ILI/XTF - GPCONES

## Descripción

El módulo ILI/XTF permite cargar archivos ILI (Interlis Model) y XTF (eXtended Transfer Format) siguiendo los estándares IGAC y Antioquia. Este módulo implementa el proceso de dos pasos para la gestión de datos catastrales.

## Proceso de Carga

### Paso 1: Cargar Carpeta ILI
- **Objetivo:** Crear schema en BD con nombre del municipio
- **Entrada:** Archivo ILI (.ili) o carpeta comprimida (.zip)
- **Salida:** Schema PostgreSQL con ~193 tablas
- **Herramientas:** ili2pg, ilivalidator

### Paso 2: Cargar Archivo XTF
- **Objetivo:** Importar datos al schema creado en el paso anterior
- **Entrada:** Archivo XTF (.xtf)
- **Salida:** Datos catastrales en las tablas del schema
- **Herramientas:** ili2pg

## Características

### ✅ Funcionalidades Implementadas

1. **Carga de Archivos ILI**
   - Validación de formato (.ili, .zip)
   - Creación automática de schema PostgreSQL
   - Generación de ~193 tablas según modelo LADM
   - Soporte para modelos IGAC y Antioquia

2. **Carga de Archivos XTF**
   - Validación de formato (.xtf)
   - Importación de datos al schema existente
   - Verificación de existencia del schema
   - Procesamiento con ili2pg

3. **Gestión de Schemas**
   - Listado de schemas disponibles
   - Estadísticas por schema
   - Información de tablas y registros

4. **Control de Acceso**
   - Solo Administrador del Sistema puede cargar
   - Validación de permisos en frontend y backend
   - Auditoría de todas las operaciones

5. **Interfaz de Usuario**
   - Proceso guiado por pasos
   - Barra de progreso en tiempo real
   - Validación de formularios
   - Mensajes de estado claros

### 🔧 Herramientas Utilizadas

- **ili2pg:** Herramienta oficial para crear esquemas desde ILI e importar XTF
- **ilivalidator:** Validación de archivos ILI contra modelos
- **PostgreSQL con PostGIS:** Base de datos espacial
- **Express.js:** Backend API
- **React + Ant Design:** Frontend

### 📋 Modelos Soportados

- **LADM_COL_ExtAntioquia:** Modelo extendido de Antioquia
- **LADM_COL_IGAC_1_0:** Modelo IGAC versión 1.0
- **LADM_COL_IGAC_2_0:** Modelo IGAC versión 2.0

## API Endpoints

### POST /api/ili/upload-ili
Carga archivo ILI y crea schema en BD.

**Parámetros:**
- `iliFile`: Archivo ILI (.ili) o ZIP (.zip)
- `municipio`: Nombre del municipio
- `modelName`: Modelo ILI a utilizar

**Respuesta:**
```json
{
  "success": true,
  "message": "Carpeta ILI cargada exitosamente",
  "data": {
    "schemaName": "ladm_medellin",
    "modelName": "LADM_COL_ExtAntioquia",
    "tablesCreated": 193,
    "municipio": "Medellín"
  }
}
```

### POST /api/ili/upload-xtf
Importa datos XTF al schema existente.

**Parámetros:**
- `xtfFile`: Archivo XTF (.xtf)
- `schemaName`: Nombre del schema destino
- `modelName`: Modelo ILI utilizado
- `datasetName`: Nombre del dataset

**Respuesta:**
```json
{
  "success": true,
  "message": "Archivo XTF cargado exitosamente",
  "data": {
    "schemaName": "ladm_medellin",
    "datasetName": "lote_2025_01_15",
    "recordsImported": 1500
  }
}
```

### GET /api/ili/schemas
Lista schemas disponibles.

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "schema_name": "ladm_medellin",
      "schema_owner": "postgres",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### GET /api/ili/schemas/:schemaName/stats
Estadísticas de un schema específico.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "schemaName": "ladm_medellin",
    "tables": [
      {
        "table_name": "predio",
        "record_count": 1500
      }
    ],
    "totalTables": 193
  }
}
```

## Instalación y Configuración

### Prerrequisitos

1. **Java Runtime Environment (JRE)**
   ```bash
   java -version
   ```

2. **ili2pg.jar**
   - Descargar desde: https://www.interlis.ch/downloads/ili2pg
   - Colocar en directorio del servidor

3. **ilivalidator.jar**
   - Descargar desde: https://www.interlis.ch/downloads/ilivalidator
   - Colocar en directorio del servidor

### Configuración del Servidor

1. **Variables de Entorno**
   ```env
   # Configuración de base de datos
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=GP_CONES
   DB_USER=postgres
   DB_PASSWORD=12345

   # Configuración ILI
   ILI2PG_PATH=./ili2pg.jar
   ILIVALIDATOR_PATH=./ilivalidator.jar
   ```

2. **Permisos de Archivos**
   ```bash
   chmod +x ili2pg.jar
   chmod +x ilivalidator.jar
   ```

## Uso

### 1. Acceso al Módulo
- Iniciar sesión como "Administrador del Sistema"
- Navegar a "Gestión ILI/XTF" en el menú lateral

### 2. Cargar Carpeta ILI
1. Seleccionar "Paso 1: Cargar Carpeta ILI"
2. Ingresar nombre del municipio
3. Seleccionar modelo ILI
4. Subir archivo ILI (.ili) o ZIP (.zip)
5. Hacer clic en "Crear Schema desde ILI"

### 3. Cargar Archivo XTF
1. Seleccionar "Paso 2: Cargar Archivo XTF"
2. Seleccionar schema de destino
3. Seleccionar modelo ILI
4. Ingresar nombre del dataset
5. Subir archivo XTF (.xtf)
6. Hacer clic en "Importar Datos XTF"

## Estructura de Base de Datos

### Schema Naming Convention
- Formato: `ladm_{municipio}`
- Ejemplo: `ladm_medellin`, `ladm_bello`

### Tablas Principales (LADM_COL_ExtAntioquia)
- `predio`: Información de predios
- `terreno`: Terrenos del predio
- `construccion`: Construcciones
- `unidad_construccion`: Unidades de construcción
- `punto_lindero`: Puntos de linderos
- `lindero`: Linderos del predio
- `persona`: Información de personas
- `derecho`: Derechos sobre predios
- `restriccion`: Restricciones de dominio
- `servidumbre`: Servidumbres
- Y ~183 tablas adicionales...

## Validaciones

### Archivos ILI
- Formato: .ili, .zip
- Tamaño máximo: 100MB
- Validación de sintaxis con ilivalidator
- Verificación de modelo LADM

### Archivos XTF
- Formato: .xtf
- Tamaño máximo: 100MB
- Validación de estructura XML
- Verificación contra modelo ILI

## Auditoría

Todas las operaciones se registran en la tabla `audit_logs`:

```sql
-- Ejemplo de logs
INSERT INTO audit_logs (user_id, action, resource, details, ip_address)
VALUES 
  (1, 'ILI_SCHEMA_CREATED', 'Schema: ladm_medellin', 'Modelo: LADM_COL_ExtAntioquia, Tablas: 193', 'localhost'),
  (1, 'XTF_DATA_IMPORTED', 'Schema: ladm_medellin', 'Dataset: lote_2025_01_15, Registros: 1500', 'localhost');
```

## Troubleshooting

### Error: "Java no encontrado"
```bash
# Verificar instalación de Java
java -version

# Si no está instalado, instalar JRE
# Windows: Descargar desde Oracle
# Linux: sudo apt-get install openjdk-11-jre
```

### Error: "ili2pg.jar no encontrado"
```bash
# Verificar que el archivo existe
ls -la ili2pg.jar

# Verificar permisos
chmod +x ili2pg.jar
```

### Error: "Schema ya existe"
```sql
-- Eliminar schema existente
DROP SCHEMA IF EXISTS ladm_medellin CASCADE;
```

### Error: "Permisos insuficientes"
- Verificar que el usuario sea "Administrador del Sistema"
- Verificar permisos en la base de datos
- Verificar configuración de roles

## Seguridad

### Control de Acceso
- Solo usuarios con rol "Administrador del Sistema" pueden cargar archivos
- Validación de permisos en frontend y backend
- Auditoría completa de todas las operaciones

### Validación de Archivos
- Verificación de tipos de archivo permitidos
- Límite de tamaño de archivo (100MB)
- Validación de contenido con herramientas oficiales

### Base de Datos
- Uso de parámetros preparados para prevenir SQL injection
- Validación de nombres de schema
- Transacciones para operaciones críticas

## Mantenimiento

### Limpieza de Archivos
```bash
# Limpiar archivos temporales
rm -rf server/uploads/*.ili
rm -rf server/uploads/*.xtf
rm -rf server/uploads/*.zip
```

### Backup de Schemas
```bash
# Backup de schema específico
pg_dump -h localhost -U postgres -n ladm_medellin GP_CONES > backup_ladm_medellin.sql

# Restaurar schema
psql -h localhost -U postgres -d GP_CONES < backup_ladm_medellin.sql
```

## Soporte

Para soporte técnico o reportar problemas:

- **Desarrollador:** BY CONESTUDIOS
- **Documentación:** README_ILI.md
- **API Docs:** http://localhost:3001/api/ili/info

---

**Versión:** 1.0.0  
**Última actualización:** Enero 2025  
**Compatible con:** GPCONES v1.0.0
