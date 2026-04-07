# Instalación y Configuración de ili2pg

## Problema

Si al cargar archivos ILI no se crean las tablas en el schema de la base de datos, es porque **ili2pg** no está instalado o configurado correctamente.

## ¿Qué es ili2pg?

**ili2pg** es una herramienta oficial de INTERLIS que convierte modelos ILI (INTERLIS) a esquemas de PostgreSQL/PostGIS. Es necesario para crear todas las tablas del modelo LADM-COL según los archivos ILI.

## Requisitos

1. **Java JDK 8 o superior** instalado
2. **ili2pg.jar** descargado
3. Configuración correcta en el sistema

## Instalación Paso a Paso

### 1. Instalar Java ✅ (Ya instalado)

**Windows:**
1. Descargar Java JDK desde: https://www.oracle.com/java/technologies/downloads/
2. Instalar Java JDK
3. Verificar instalación:
   ```powershell
   java -version
   ```
   Debe mostrar algo como: `java version "1.8.0_xxx"` o superior

**Nota:** Java ya está instalado en tu sistema (versión 21.0.2).

**Si Java no está en el PATH:**
- Agregar la ruta de Java al PATH del sistema
- O usar la ruta completa en los comandos

### 2. Descargar ili2pg.jar

1. Descargar desde: https://www.interlis.ch/downloads/ili2pg
2. O desde el repositorio oficial de INTERLIS
3. Guardar el archivo `ili2pg.jar` en una ubicación accesible

### 3. Configurar ili2pg en GPCONES

**Opción A: Colocar ili2pg.jar en el proyecto (RECOMENDADO)**

1. La carpeta `tools` ya está creada en: `GPCONES/server/tools/`
2. Descargar ili2pg.jar y colocarlo en: `GPCONES/server/tools/ili2pg.jar`

**Script de descarga automática:**
```powershell
cd E:\GPCONES\GPCONES\server\tools
.\descargar-ili2pg.ps1
```

**Descarga manual:**
1. Visitar: https://github.com/claeis/ili2db/releases
2. Descargar `ili2pg-5.1.0.jar` (o última versión)
3. Renombrar a `ili2pg.jar`
4. Colocar en: `E:\GPCONES\GPCONES\server\tools\ili2pg.jar`

**Opción B: Colocar en ubicación del sistema**

1. Colocar `ili2pg.jar` en una carpeta del sistema (ej: `C:\tools\ili2pg.jar`)
2. Agregar al PATH del sistema

**Opción C: Especificar ruta completa**

Modificar `server/controllers/iliController.js` para usar la ruta completa:
```javascript
const ili2pgPath = 'C:\\ruta\\completa\\a\\ili2pg.jar';
```

## Verificación

Para verificar que ili2pg funciona:

```powershell
java -jar ili2pg.jar --help
```

Si muestra la ayuda de ili2pg, está funcionando correctamente.

## Uso Manual (Alternativa)

Si no puedes instalar ili2pg en el servidor, puedes crear las tablas manualmente:

### 1. Crear Schema
```sql
CREATE SCHEMA IF NOT EXISTS ladm_antioquia;
```

### 2. Ejecutar ili2pg manualmente
```powershell
java -jar ili2pg.jar `
  --dbhost localhost `
  --dbport 5432 `
  --dbdatabase GP_CONES `
  --dbusr postgres `
  --dbpwd 12345 `
  --dbschema ladm_antioquia `
  --modeldir "E:\LADMCOL_ANT_V2_AJUSTADA_20240812" `
  --models "MA_LADMCOL_Lev_Cat_Antioquia_V2_0.ili" `
  --defaultSrsCode 3116 `
  --nameByTopic `
  --createFk `
  --createGeomIdx `
  --createEnumTabs `
  --schemaimport
```

### 3. Verificar tablas creadas
```sql
SELECT COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'ladm_antioquia';
```

Debería mostrar aproximadamente 193 tablas.

## Solución Temporal

Si ili2pg no está disponible, el sistema creará **tablas básicas** del modelo LADM-COL (6 tablas principales). Estas son suficientes para pruebas básicas, pero **no incluyen todas las tablas del modelo completo**.

Para obtener todas las tablas (193 aprox.), es necesario instalar ili2pg.

## Troubleshooting

### Error: "java no se reconoce como comando"
- Java no está instalado o no está en el PATH
- Solución: Instalar Java y agregarlo al PATH

### Error: "ili2pg.jar no encontrado"
- El archivo ili2pg.jar no está en la ubicación esperada
- Solución: Colocar ili2pg.jar en `server/tools/` o especificar ruta completa

### Error: "No se pueden crear las tablas"
- Verificar que PostgreSQL esté ejecutándose
- Verificar credenciales de conexión
- Verificar que el schema existe
- Revisar logs del servidor para más detalles

## Referencias

- Documentación ili2pg: https://www.interlis.ch/en/software/ili2db
- Modelo LADM-COL: https://www.igac.gov.co/
- INTERLIS: https://www.interlis.ch/

---

**Nota:** El sistema funcionará con tablas básicas si ili2pg no está disponible, pero para funcionalidad completa se recomienda instalar ili2pg.

