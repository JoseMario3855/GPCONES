// Cargar variables de entorno PRIMERO (siempre desde la raíz del repo)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configurar JWT_SECRET directamente si no se lee del .env
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'gpcones_jwt_secret_key_2024_secure';
  console.log('🔧 JWT_SECRET configurado manualmente');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Importar rutas
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const prediosRoutes = require('./routes/predios');
const xtfRoutes = require('./routes/xtf');
const auditRoutes = require('./routes/audit');
const iliRoutes = require('./routes/ili');
const municipiosRoutes = require('./routes/municipios');
const consultaAlfanumericoRoutes = require('./routes/consultaAlfanumerico');

// Importar configuración de base de datos
const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3002;

// Configurar trust proxy para rate limiting
app.set('trust proxy', true);

// Verificar que las variables de entorno se están leyendo
console.log('🔧 Variables de entorno cargadas:');
console.log('   PORT:', process.env.PORT);
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Configurado' : '❌ No configurado');
console.log('   DB_HOST:', process.env.DB_HOST);

// Middleware de seguridad
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - Excluir completamente las rutas de autenticación
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests en desarrollo, 100 en producción
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  message: 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.',
  skip: (req) => {
    // Excluir TODAS las rutas de autenticación del rate limiting
    const path = req.path || req.url || '';
    const isAuthRoute = path.includes('/api/auth/') || path.startsWith('/api/auth/');
    if (isAuthRoute) {
      console.log('🔓 Rate limiting EXCLUIDO para:', path);
      return true; // Skip rate limiting
    }
    return false; // Aplicar rate limiting
  }
});

// Aplicar rate limiting (las rutas de auth están excluidas)
app.use(limiter);

// =====================================================
// RUTAS PRINCIPALES
// =====================================================

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: 'GP Cones Backend API',
    version: '1.0.0',
    status: 'running',
    description: 'Sistema de Catastro Integral - Cumplimiento con estándares IGAC y Antioquia',
    modules: [
      'Autenticación y Seguridad (RBAC)',
      'Gestión Catastral',
      'Carga/Exportación XTF',
      'Auditoría y Trazabilidad'
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'PostgreSQL GP_CONES',
    environment: process.env.NODE_ENV || 'development'
  });
});

// =====================================================
// RUTAS DE LA API
// =====================================================

// Prefijo de la API
const API_PREFIX = '/api';

// Rutas de autenticación
app.use(`${API_PREFIX}/auth`, authRoutes);

// Rutas de gestión de usuarios
app.use(`${API_PREFIX}/users`, usersRoutes);

// Rutas de gestión catastral
app.use(`${API_PREFIX}/predios`, prediosRoutes);

// Rutas de carga y validación XTF
app.use(`${API_PREFIX}/xtf`, xtfRoutes);

// Rutas de auditoría
app.use(`${API_PREFIX}/audit`, auditRoutes);

// Rutas de ILI/XTF
app.use(`${API_PREFIX}/ili`, iliRoutes);

// Rutas de municipios
app.use(`${API_PREFIX}/municipios`, municipiosRoutes);

// Rutas de consulta alfanumérica
app.use(`${API_PREFIX}/consulta-alfanumerico`, consultaAlfanumericoRoutes);

// =====================================================
// RUTAS DE DOCUMENTACIÓN
// =====================================================

// Información de la API
app.get(`${API_PREFIX}/info`, (req, res) => {
  res.json({
    api_name: 'GP Cones API',
    version: '1.0.0',
    description: 'API para el Sistema de Catastro Integral GPCONES',
    endpoints: {
      auth: {
        base: `${API_PREFIX}/auth`,
        routes: [
          'POST /login - Inicio de sesión',
          'POST /forgot-password - Recuperación de contraseña',
          'GET /verify-reset-token/:token - Verificar token de recuperación',
          'POST /reset-password - Restablecer contraseña',
          'POST /logout - Cierre de sesión',
          'GET /profile - Perfil del usuario',
          'PUT /change-password - Cambiar contraseña',
          'PUT /users/:userId/role - Cambiar rol (Admin)',
          'GET /check-permissions - Verificar permisos',
          'GET /validate-token - Validar token',
          'GET /system-info - Información del sistema'
        ]
      },
      users: {
        base: `${API_PREFIX}/users`,
        routes: [
          'GET / - Listar usuarios con filtros',
          'GET /stats - Estadísticas de usuarios',
          'POST / - Crear nuevo usuario',
          'PUT /:userId - Actualizar usuario',
          'DELETE /:userId - Desactivar usuario',
          'PUT /:userId/reactivate - Reactivar usuario',
          'PUT /:userId/reset-password - Resetear contraseña',
          'GET /roles - Lista de roles disponibles',
          'GET /permissions - Lista de permisos disponibles'
        ]
      },
      predios: {
        base: `${API_PREFIX}/predios`,
        routes: [
          'POST / - Crear nuevo predio',
          'GET / - Consultar predios con filtros',
          'GET /stats - Estadísticas de predios',
          'GET /:id - Obtener predio específico',
          'PUT /:id - Actualizar predio',
          'PATCH /:id/status - Cambiar estado',
          'GET /reconocedor/mis-predios - Predios del reconocedor',
          'GET /revision/por-revisar - Predios por revisar',
          'GET /export/geojson - Exportar a GeoJSON',
          'GET /export/csv - Exportar a CSV'
        ]
      },
      xtf: {
        base: `${API_PREFIX}/xtf`,
        routes: [
          'POST /upload - Cargar archivo XTF',
          'POST /validate - Validar archivo XTF contra modelo ILI',
          'GET /export - Exportar predios a formato XTF (solo Admin y Revisión)',
          'GET /uploads - Listar archivos cargados',
          'GET /stats - Estadísticas de archivos XTF',
          'GET /upload/:id/status - Estado del procesamiento',
          'GET /upload/:id/data - Datos del archivo cargado',
          'GET /upload/:id/logs - Logs de procesamiento',
          'DELETE /upload/:id - Eliminar archivo cargado',
          'POST /upload/:id/reprocess - Reprocesar archivo'
        ]
      },
      audit: {
        base: `${API_PREFIX}/audit`,
        routes: [
          'GET /logs - Obtener logs de auditoría con filtros',
          'GET /stats - Estadísticas de auditoría',
          'GET /logs/:id - Obtener log específico',
          'GET /export/csv - Exportar logs a CSV',
          'GET /export/json - Exportar logs a JSON'
        ]
      },
      ili: {
        base: `${API_PREFIX}/ili`,
        routes: [
          'POST /upload-ili - Cargar carpeta ILI (Paso 1)',
          'POST /upload-xtf - Cargar archivo XTF (Paso 2)',
          'GET /schemas - Listar schemas disponibles',
          'GET /schemas/:schemaName/stats - Estadísticas de schema',
          'POST /validate-ili - Validar archivo ILI',
          'GET /upload-status/:uploadId - Estado de carga',
          'DELETE /upload/:uploadId - Cancelar carga',
          'GET /logs - Logs de carga ILI/XTF',
          'GET /info - Información del módulo ILI/XTF'
        ]
      }
    },
    authentication: 'JWT Bearer Token',
    database: 'PostgreSQL con PostGIS',
    compliance: ['IGAC', 'Antioquia', 'LADM-COL']
  });
});

// =====================================================
// MANEJO DE ERRORES
// =====================================================

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    message: 'La ruta solicitada no existe en la API',
    available_endpoints: [
      `${API_PREFIX}/auth`,
      `${API_PREFIX}/users`,
      `${API_PREFIX}/predios`,
      `${API_PREFIX}/xtf`,
      `${API_PREFIX}/audit`,
      `${API_PREFIX}/ili`,
      `${API_PREFIX}/info`
    ]
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  
  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      message: 'Los datos proporcionados no son válidos',
      details: err.message
    });
  }

  // Error de base de datos
  if (err.code === '23505') { // Unique violation
    return res.status(400).json({
      error: 'Dato duplicado',
      message: 'El registro ya existe en el sistema',
      constraint: err.constraint
    });
  }

  // Error de geometría PostGIS
  if (err.message && err.message.includes('geometry')) {
    return res.status(400).json({
      error: 'Error de geometría',
      message: 'La geometría proporcionada no es válida',
      details: 'Verifique que el formato GeoJSON sea correcto'
    });
  }

  // Error genérico
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: 'Algo salió mal en el servidor',
    timestamp: new Date().toISOString()
  });
});

// =====================================================
// INICIALIZACIÓN DEL SERVIDOR
// =====================================================

const startServer = async () => {
  try {
    // Probar conexión a la base de datos
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ No se pudo conectar a la base de datos. Verifique la configuración.');
      process.exit(1);
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('🚀 Servidor GP Cones corriendo en puerto', PORT);
      console.log('📊 Health check: http://localhost:' + PORT + '/health');
      console.log('🔐 API Auth: http://localhost:' + PORT + API_PREFIX + '/auth');
      console.log('🏠 API Predios: http://localhost:' + PORT + API_PREFIX + '/predios');
      console.log('📚 API Info: http://localhost:' + PORT + API_PREFIX + '/info');
      console.log('✅ Base de datos GP_CONES conectada exitosamente');
      console.log('🔒 Sistema de autenticación RBAC activo');
      console.log('📋 Módulo de gestión catastral disponible');
    });

  } catch (error) {
    console.error('❌ Error iniciando el servidor:', error);
    process.exit(1);
  }
};

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('🛑 Señal SIGTERM recibida. Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Señal SIGINT recibida. Cerrando servidor...');
  process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;
