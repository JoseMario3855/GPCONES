# 🏠 GPCONES Frontend

Frontend para el Sistema de Catastro Integral GPCONES, desarrollado con React y Ant Design.

## 🚀 Características

- **Autenticación JWT** con control de roles RBAC
- **Dashboard interactivo** con estadísticas en tiempo real
- **Gestión catastral** completa de predios
- **Carga y validación** de archivos XTF
- **Auditoría y trazabilidad** de todas las operaciones
- **Interfaz responsiva** para dispositivos móviles y desktop
- **Mapas interactivos** con Leaflet y PostGIS

## 🛠️ Tecnologías

- **React 18** - Biblioteca de interfaz de usuario
- **Ant Design 5** - Sistema de diseño y componentes
- **React Router 6** - Enrutamiento de la aplicación
- **Axios** - Cliente HTTP para API
- **Leaflet** - Biblioteca de mapas interactivos
- **Formik + Yup** - Manejo de formularios y validación
- **JWT Decode** - Manejo de tokens JWT

## 📦 Instalación

1. **Clonar el repositorio:**
```bash
cd FRONT
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
# El proxy está configurado para http://localhost:3001
# Asegúrate de que el backend esté corriendo en ese puerto
```

4. **Iniciar en modo desarrollo:**
```bash
npm start
```

La aplicación se abrirá en `http://localhost:3000`

## 🏗️ Estructura del Proyecto

```
FRONT/
├── public/                 # Archivos públicos
│   ├── index.html         # HTML principal
│   └── favicon.ico        # Icono de la aplicación
├── src/                   # Código fuente
│   ├── components/        # Componentes React
│   │   ├── auth/         # Componentes de autenticación
│   │   ├── dashboard/    # Dashboard principal
│   │   ├── layout/       # Layout y navegación
│   │   ├── predios/      # Gestión de predios
│   │   ├── users/        # Gestión de usuarios
│   │   ├── xtf/          # Carga de archivos XTF
│   │   └── audit/        # Auditoría y trazabilidad
│   ├── contexts/         # Contextos de React
│   │   └── AuthContext.js # Contexto de autenticación
│   ├── services/         # Servicios y API calls
│   ├── utils/            # Utilidades y helpers
│   ├── App.js            # Componente principal
│   ├── index.js          # Punto de entrada
│   └── index.css         # Estilos globales
├── package.json           # Dependencias y scripts
└── README.md             # Este archivo
```

## 🔐 Autenticación y Roles

### Roles del Sistema
- **Administrador del Sistema**: Acceso completo a todas las funcionalidades
- **Revisión de Calidad**: Validación y aprobación de predios, carga XTF
- **Reconocedor Predial**: Captura de información en campo
- **Digitador Alfanumérico**: Ingreso y corrección de datos

### Permisos por Rol
- **Exportar XTF**: Administrador, Revisión de Calidad
- **Cargar XTF**: Administrador, Revisión de Calidad
- **Acceso GDB**: Administrador y Revisión (completo), Reconocedor/Digitador (solo lectura)
- **Gestión de Usuarios**: Solo Administrador
- **Aprobar Predios**: Administrador, Revisión de Calidad

## 🗺️ Funcionalidades Principales

### 1. Dashboard
- Estadísticas de predios en tiempo real
- Gráficos de estado y distribución geográfica
- Actividad reciente del sistema
- Información del sistema y compliance

### 2. Gestión Catastral
- **Crear Predios**: Formulario completo con validaciones
- **Consultar Predios**: Búsqueda avanzada con filtros
- **Editar Predios**: Actualización de información
- **Cambiar Estados**: Flujo de trabajo de validación
- **Visualización**: Mapas interactivos con Leaflet

### 3. Carga de Archivos XTF
- **Upload de XTF**: Carga de archivos catastrales
- **Validación de Modelos**: Verificación de archivos .ili
- **Conversión a BD**: Transformación XTF a PostgreSQL
- **Visualización**: Proceso de carga en tiempo real

### 4. Auditoría y Trazabilidad
- **Logs de Actividad**: Todas las operaciones del sistema
- **Historial de Cambios**: Trazabilidad completa
- **Reportes**: Exportación de logs de auditoría

## 🎨 Sistema de Diseño

### Colores Principales
- **Primario**: `#1890ff` (Azul)
- **Éxito**: `#52c41a` (Verde)
- **Advertencia**: `#faad14` (Amarillo)
- **Error**: `#f5222d` (Rojo)

### Tipografía
- **Familia**: Inter (Google Fonts)
- **Pesos**: 300, 400, 500, 600, 700

### Componentes
- **Cards**: Sombras suaves y bordes redondeados
- **Botones**: Gradientes y estados hover
- **Formularios**: Validación en tiempo real
- **Tablas**: Paginación y filtros avanzados

## 📱 Responsividad

La aplicación está diseñada para funcionar en:
- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: 320px - 767px

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm start          # Inicia en modo desarrollo
npm run build      # Construye para producción
npm test           # Ejecuta tests
npm run eject      # Expone configuración de webpack
```

## 🌐 Configuración de API

El frontend se conecta al backend a través de:
- **URL Base**: `http://localhost:3001` (configurado en proxy)
- **Prefijo API**: `/api`
- **Autenticación**: JWT Bearer Token

## 📊 Estado de la Aplicación

- **Context API**: Para estado global (autenticación, permisos)
- **Estado Local**: Para componentes específicos
- **Persistencia**: Token JWT en localStorage

## 🚀 Despliegue

### Producción
```bash
npm run build
```

Los archivos se generan en la carpeta `build/` lista para desplegar.

### Variables de Entorno
```bash
# .env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_VERSION=1.0.0
```

## 🐛 Solución de Problemas

### Error de CORS
- Verificar que el backend esté corriendo en puerto 3001
- El proxy está configurado para desarrollo

### Error de Autenticación
- Verificar que el token JWT sea válido
- Revisar la configuración del backend

### Problemas de Mapas
- Verificar que Leaflet CSS esté cargado
- Revisar la configuración de PostGIS

## 📝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🤝 Soporte

Para soporte técnico o preguntas:
- **Email**: soporte@gpcones.com
- **Documentación**: [docs.gpcones.com](https://docs.gpcones.com)
- **Issues**: [GitHub Issues](https://github.com/gpcones/frontend/issues)

---

**GPCONES** - Sistema de Catastro Integral  
*Cumplimiento con estándares IGAC y Antioquia*
