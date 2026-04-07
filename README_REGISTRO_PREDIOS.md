# Registro de Predios - GPCONES

## ✅ Historia de Usuario Completada

**Historia 3: Registro de predios**
> Como técnico catastral, quiero registrar un nuevo predio, para que se mantenga actualizado el inventario catastral conforme a IGAC.

## 🚀 Funcionalidades Implementadas

### 1. **Formulario de Registro Completo**
- **Formulario por Pasos**: 4 pasos organizados lógicamente
  - **Paso 1**: Datos Básicos (NPN, Municipio, Zona, Sector, Número de Ficha)
  - **Paso 2**: Información Física (Área, Tipo de Predio, Uso, Observaciones)
  - **Paso 3**: Propietario (Nombre, Tipo de Documento, Número de Documento)
  - **Paso 4**: Geometría (Mapa interactivo o carga de GeoJSON)

### 2. **Validaciones Robustas**
- **NPN Único**: Validación de Número de Predio Nacional único
- **Campos Obligatorios**: NPN, Municipio, Tipo de Predio, Uso, Propietario
- **Formatos Válidos**: Validación de tipos de documento, estados, etc.
- **Geometría**: Validación de GeoJSON válido
- **Longitudes**: Límites de caracteres según especificaciones

### 3. **Gestión de Estados**
- **Estados del Predio**: Borrador, En Revisión, Aprobado, Rechazado
- **Flujo de Trabajo**: Predios inician en estado "Borrador"
- **Cambio de Estados**: Con observaciones y auditoría
- **Permisos por Rol**: Según especificaciones RBAC

### 4. **Integración con PostGIS**
- **Geometría**: Almacenamiento en formato PostGIS
- **GeoJSON**: Conversión automática de/para GeoJSON
- **Validación Espacial**: Verificación de geometrías válidas
- **Exportación**: GeoJSON y CSV con geometría

## 🎨 Interfaz de Usuario

### 1. **Formulario por Pasos**
- **Navegación Intuitiva**: Pasos claros con iconos descriptivos
- **Validación en Tiempo Real**: Feedback inmediato al usuario
- **Guardado Automático**: Prevención de pérdida de datos
- **Responsive**: Adaptable a diferentes tamaños de pantalla

### 2. **Campos Inteligentes**
- **Selectores con Búsqueda**: Municipios, tipos de predio, usos
- **Validación de NPN**: Verificación de unicidad en tiempo real
- **Carga de Geometría**: Múltiples opciones (mapa, archivo GeoJSON)
- **Observaciones**: Campo de texto con contador de caracteres

### 3. **Feedback Visual**
- **Estados de Carga**: Indicadores durante operaciones
- **Mensajes de Error**: Específicos y accionables
- **Confirmaciones**: Para operaciones críticas
- **Progreso**: Indicador de pasos completados

## 🔧 Backend Completo

### 1. **Controlador de Predios**
- **createPredio**: Creación con validaciones completas
- **getPredioById**: Consulta individual con geometría
- **updatePredio**: Actualización parcial o completa
- **changePredioStatus**: Cambio de estado con auditoría
- **getPrediosStats**: Estadísticas detalladas

### 2. **Validaciones de Negocio**
- **NPN Único**: Verificación en base de datos
- **Geometría Válida**: Validación PostGIS
- **Permisos por Rol**: Control de acceso granular
- **Auditoría Completa**: Registro de todas las operaciones

### 3. **Rutas Especializadas**
- **CRUD Completo**: Create, Read, Update, Delete
- **Rutas por Rol**: Endpoints específicos por tipo de usuario
- **Exportación**: GeoJSON y CSV con filtros
- **Estadísticas**: Métricas en tiempo real

## 📊 Estructura de Datos

### Tabla: `predios`
```sql
CREATE TABLE predios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    npn VARCHAR(50) UNIQUE NOT NULL,           -- Número de Predio Nacional
    municipio VARCHAR(100) NOT NULL,           -- Municipio del predio
    zona VARCHAR(100),                         -- Zona del predio
    sector VARCHAR(100),                       -- Sector del predio
    numero_ficha VARCHAR(50),                  -- Número de ficha
    area_hectareas DECIMAL(10,4),              -- Área en hectáreas
    tipo_predio VARCHAR(100),                  -- Tipo: URBANO, RURAL, MIXTO
    uso_predio VARCHAR(100),                   -- Uso: RESIDENCIAL, COMERCIAL, etc.
    propietario_nombre VARCHAR(200),           -- Nombre del propietario
    propietario_documento VARCHAR(20),         -- Documento del propietario
    propietario_tipo_documento VARCHAR(10),    -- Tipo: CC, CE, NIT, RUT, TI, RC
    observaciones TEXT,                        -- Observaciones adicionales
    geometry GEOMETRY(POLYGON, 4326),          -- Geometría PostGIS
    estado VARCHAR(50) DEFAULT 'Borrador',     -- Estado del predio
    created_by UUID REFERENCES users(id),      -- Usuario creador
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)       -- Usuario que actualizó
);
```

## 🎯 Criterios de Aceptación Cumplidos

✅ **Permite ingresar datos físicos y jurídicos del predio**
✅ **Valida que el NPN sea único y cumpla el formato**
✅ **Guarda la información en la base de datos**
✅ **Asocia el registro a su georreferenciación**

## 🔧 API Endpoints

### Gestión de Predios
```
POST   /api/predios              - Crear nuevo predio
GET    /api/predios              - Listar predios con filtros
GET    /api/predios/stats        - Estadísticas de predios
GET    /api/predios/:id          - Obtener predio por ID
PUT    /api/predios/:id          - Actualizar predio
PATCH  /api/predios/:id/status   - Cambiar estado del predio
```

### Rutas Específicas por Rol
```
GET    /api/predios/reconocedor/mis-predios    - Predios del reconocedor
GET    /api/predios/revision/por-revisar       - Predios por revisar
```

### Exportación
```
GET    /api/predios/export/geojson  - Exportar a GeoJSON
GET    /api/predios/export/csv      - Exportar a CSV
```

## 🎨 Componentes Frontend

### 1. **PredioForm.js** - Formulario Principal
- Formulario por pasos con validaciones
- Carga de geometría (mapa o GeoJSON)
- Integración con backend
- Manejo de errores y estados

### 2. **Predios.js** - Lista y Gestión
- Tabs de navegación (Lista / Registrar)
- Tabla con filtros avanzados
- Estadísticas en tiempo real
- Acciones por rol

### 3. **Integración con AuthContext**
- Verificación de permisos
- Control de acceso por rol
- Estado de autenticación

## 🔄 Flujo de Trabajo

### 1. **Registro de Predio**
1. Usuario accede a "Registrar Predio"
2. Completa formulario por pasos
3. Define geometría del predio
4. Sistema valida datos y NPN único
5. Predio se crea en estado "Borrador"
6. Se registra en auditoría

### 2. **Edición de Predio**
1. Usuario selecciona predio de la lista
2. Hace clic en "Editar"
3. Modifica datos necesarios
4. Sistema valida cambios
5. Actualiza predio y auditoría

### 3. **Cambio de Estado**
1. Revisor accede a predios por revisar
2. Revisa información del predio
3. Cambia estado (Aprobado/Rechazado)
4. Agrega observaciones
5. Sistema registra cambio en auditoría

## 📱 Características de UX

### 1. **Formulario Intuitivo**
- Pasos claros y lógicos
- Validación en tiempo real
- Navegación fácil entre pasos
- Guardado automático

### 2. **Manejo de Errores**
- Mensajes específicos y claros
- Validación de NPN duplicado
- Verificación de geometría
- Feedback visual inmediato

### 3. **Responsive Design**
- Adaptable a móviles y tablets
- Formulario optimizado para touch
- Navegación táctil
- Contenido escalable

## 🔒 Seguridad Implementada

### 1. **Validaciones de Entrada**
- Sanitización de datos
- Validación de tipos
- Límites de longitud
- Formato de geometría

### 2. **Control de Acceso**
- Permisos por rol
- Verificación de autenticación
- Autorización granular
- Auditoría completa

### 3. **Protección de Datos**
- Validación de NPN único
- Verificación de geometría
- Manejo seguro de archivos
- Logs de auditoría

## 🎯 Próximos Pasos

La funcionalidad de registro de predios está **100% implementada** y lista para producción.

**Siguiente historia recomendada**: 
1. **Historia 4: Consulta de predios** - Implementar filtros avanzados y búsqueda
2. **Historia 5: Carga de XTF** - Finalizar validación y procesamiento
3. **Historia 6: Validación de modelo ILI** - Validación real contra modelos

---

**Desarrollado por BY CONESTUDIOS**  
**Sistema GPCONES - Versión 1.0.0**
