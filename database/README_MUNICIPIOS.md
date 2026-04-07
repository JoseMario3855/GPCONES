# Importación de Municipios de Colombia

## Opciones para agregar municipios

### Opción 1: Importar desde CSV (Recomendado para 1100+ municipios)

1. Crea un archivo `municipios_colombia.csv` en la carpeta `database/` con el siguiente formato:

```csv
codigo_dane,nombre,departamento,codigo_departamento
05001,Medellín,Antioquia,05
05002,Abejorral,Antioquia,05
25001,Bogotá D.C.,Cundinamarca,25
76001,Cali,Valle del Cauca,76
...
```

2. Ejecuta el script de importación:

```bash
cd E:\GPCONES\GPCONES\database
node import_municipios_csv.js
```

### Opción 2: Usar el script SQL existente

El script `insert_municipios_completos.sql` contiene más de 300 municipios. Para agregar más, edita el archivo y ejecuta:

```bash
node run_insert_municipios.js
```

### Opción 3: Agregar desde el Frontend

1. Ve a "Municipios y Schemas" en el menú
2. Haz clic en "Agregar Municipio"
3. Completa el formulario y guarda

## Fuentes de datos para obtener los 1123 municipios

Puedes obtener la lista completa de municipios de Colombia desde:

1. **DANE (Departamento Administrativo Nacional de Estadística)**: 
   - https://www.dane.gov.co/
   - Buscar "Divipola" o "Códigos de municipios"
   - Descargar archivo Excel/CSV con todos los municipios

2. **Divipola (División Político Administrativa)**:
   - Códigos oficiales de municipios
   - Formato estándar: 5 dígitos para municipio, 2 para departamento

3. **IGAC (Instituto Geográfico Agustín Codazzi)**:
   - Información geográfica oficial
   - Catálogo de códigos DANE

4. **APIs públicas**:
   - Algunas APIs proporcionan listas completas de municipios
   - Formato JSON que puede convertirse a CSV

## Importar desde el Frontend (Nuevo)

También puedes importar municipios desde el frontend usando el endpoint `/api/municipios/importar-csv`:

1. Prepara un array JSON con los municipios
2. Envía una petición POST con el array en el body
3. El sistema procesará e insertará/actualizará los municipios

## Formato de datos

- **codigo_dane**: 5 dígitos (ej: 05001)
- **nombre**: Nombre del municipio
- **departamento**: Nombre del departamento
- **codigo_departamento**: 2 dígitos (ej: 05)

## Notas

- El script usa `ON CONFLICT DO NOTHING` para evitar duplicados
- Los códigos DANE son únicos y se usan como clave
- El script valida el formato de los códigos antes de insertar

