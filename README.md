# Sistema Catastral GP Cones

Sistema de gestión catastral desarrollado con Node.js, React y PostgreSQL, diseñado para cumplir con los estándares IGAC y la extensión Antioquia del modelo LADM-COL.

## 🚀 Características Principales

### Autenticación y Seguridad
- ✅ Inicio de sesión con usuario y contraseña
- ✅ Recuperación de contraseña
- ✅ Control de roles y permisos
- ✅ Autenticación JWT

### Gestión Catastral
- ✅ Registro de predios
- ✅ Consulta de predios con filtros (NPN, municipio, etc.)
- ✅ CRUD completo de predios

### Carga de Archivos XTF
- ✅ Carga de archivos .xtf
- ✅ Validación con modelo .ili extendido
- ✅ Conversión a PostgreSQL
- ✅ Visualización del proceso de carga
- ✅ Revisión de datos cargados

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Base de datos
- **JWT** - Autenticación
- **bcryptjs** - Encriptación de contraseñas
- **multer** - Manejo de archivos

### Frontend (Próximamente)
- **React** - Framework de UI
- **Material-UI** - Componentes de interfaz
- **Axios** - Cliente HTTP
- **React Router** - Enrutamiento

## 📋 Prerrequisitos

- Node.js (v16 o superior)
- PostgreSQL (v12 o superior)
- npm o yarn

## 🔧 Instalación

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd gp-cones-catastral-system
```

### 2. Instalar dependencias
```bash
npm run install-all
```

### 3. Configurar base de datos
```bash
# Crear base de datos PostgreSQL
psql -U postgres -f database/schema.sql
```

### 4. Configurar variables de entorno
```bash
# Copiar archivo de ejemplo
cp server/env.example server/.env

# Editar variables de entorno
nano server/.env
```

### 5. Ejecutar el servidor
```bash
# Desarrollo (servidor + cliente)
npm run dev

# Solo servidor
npm run server

# Solo cliente
npm run client
```

## 📁 Estructura del Proyecto

```
GPCONES/
├── server/                 # Backend Node.js
│   ├── config/            # Configuración de BD
│   ├── middleware/        # Middleware de autenticación
│   ├── routes/            # Rutas de la API
│   ├── index.js           # Servidor principal
│   └── package.json       # Dependencias del servidor
├── client/                # Frontend React (próximamente)
├── database/              # Scripts de base de datos
│   └── schema.sql         # Esquema de BD
├── HistoriasDeUsuario/    # Documentación de historias
└── package.json           # Dependencias principales
```

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/forgot-password` - Recuperar contraseña
- `POST /api/auth/reset-password` - Resetear contraseña
- `GET /api/auth/me` - Obtener usuario actual

### Predios
- `GET /api/predios` - Listar predios con filtros
- `POST /api/predios` - Crear predio
- `GET /api/predios/:id` - Obtener predio
- `PUT /api/predios/:id` - Actualizar predio
- `DELETE /api/predios/:id` - Eliminar predio

### Archivos XTF
- `POST /api/xtf/upload` - Cargar archivo XTF
- `POST /api/xtf/:id/validate` - Validar archivo
- `POST /api/xtf/:id/process` - Procesar archivo
- `GET /api/xtf` - Listar archivos
- `GET /api/xtf/:id` - Obtener detalles
- `DELETE /api/xtf/:id` - Eliminar archivo

## 👤 Usuario por Defecto

- **Usuario:** admin
- **Contraseña:** admin123
- **Rol:** admin

## 🔒 Variables de Entorno

```env
# Servidor
PORT=5000
NODE_ENV=development

# Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gp_cones_catastral
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key

# Cliente
CLIENT_URL=http://localhost:3000
```

## 📊 Estado del Proyecto

### ✅ Completado
- [x] Estructura del proyecto
- [x] Configuración de base de datos
- [x] API de autenticación
- [x] API de gestión de predios
- [x] API de carga de archivos XTF
- [x] Middleware de autenticación
- [x] Validación de datos

### 🚧 En Desarrollo
- [ ] Frontend React
- [ ] Interfaz de usuario
- [ ] Validación real de archivos XTF
- [ ] Procesamiento real de archivos XTF
- [ ] Integración con IGAC

### 📋 Pendiente
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Documentación de API
- [ ] Dockerización
- [ ] Despliegue en producción

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Contacto

GP Cones Team - [@gpcones](https://github.com/gpcones)

Link del proyecto: [https://github.com/gpcones/catastral-system](https://github.com/gpcones/catastral-system) 