const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

// Middleware de autenticación JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acceso requerido',
        message: 'Debe proporcionar un token de autenticación válido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario existe y está activo
    const userResult = await query(
      'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Usuario no válido',
        message: 'El usuario no existe o está inactivo'
      });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        message: 'Su sesión ha expirado, debe iniciar sesión nuevamente'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido',
        message: 'El token de autenticación no es válido'
      });
    }

    console.error('Error en autenticación:', error);
    return res.status(500).json({ 
      error: 'Error de autenticación',
      message: 'Error interno del servidor durante la autenticación'
    });
  }
};

// Middleware de autorización por roles
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado',
        message: 'Debe iniciar sesión para acceder a este recurso'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        message: `Su rol '${req.user.role}' no tiene permisos para acceder a este recurso`,
        required_roles: allowedRoles,
        user_role: req.user.role
      });
    }

    next();
  };
};

// Middleware específico para exportar XTF según especificaciones del documento
const canExportXTF = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Usuario no autenticado',
      message: 'Debe iniciar sesión para acceder a este recurso'
    });
  }

  // Según documento: Administrador siempre puede, Revisión de Calidad solo para predios validados
  if (req.user.role === 'Administrador del Sistema') {
    return next(); // Siempre permitido
  }

  if (req.user.role === 'Revisión de Calidad') {
    // Aquí se podría agregar lógica adicional para verificar que solo exporte predios validados
    return next();
  }

  // Reconocedor y Digitador no pueden exportar XTF
  return res.status(403).json({ 
    error: 'Acceso denegado para exportar XTF',
    message: `Su rol '${req.user.role}' no tiene permisos para exportar archivos XTF`,
    allowed_roles: ['Administrador del Sistema', 'Revisión de Calidad']
  });
};

// Middleware específico para cargar XTF según especificaciones del documento
const canLoadXTF = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Usuario no autenticado',
      message: 'Debe iniciar sesión para acceder a este recurso'
    });
  }

  // Solo el Administrador del Sistema puede cargar XTF
  if (req.user.role === 'Administrador del Sistema') {
    return next(); // Solo permitido para Administrador
  }

  // Todos los demás roles no pueden cargar XTF
  return res.status(403).json({ 
    error: 'Acceso denegado para cargar XTF',
    message: `Su rol '${req.user.role}' no tiene permisos para cargar archivos XTF. Solo el Administrador del Sistema puede realizar esta acción.`,
    allowed_roles: ['Administrador del Sistema']
  });
};

// Middleware para acceso a GDB según especificaciones del documento
const canAccessGDB = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Usuario no autenticado',
      message: 'Debe iniciar sesión para acceder a este recurso'
    });
  }

  // Según documento: Administrador y Revisión de Calidad pueden cargar/preparar, Reconocedor/Digitador solo lectura
  if (req.user.role === 'Administrador del Sistema' || req.user.role === 'Revisión de Calidad') {
    return next(); // Acceso completo
  }

  if (req.user.role === 'Reconocedor Predial' || req.user.role === 'Digitador Alfanumérico') {
    // Solo lectura para GDB
    if (req.method === 'GET') {
      return next();
    }
    return res.status(403).json({ 
      error: 'Acceso denegado para modificar GDB',
      message: `Su rol '${req.user.role}' solo tiene acceso de lectura a archivos GDB`
    });
  }

  return res.status(403).json({ 
    error: 'Acceso denegado a GDB',
    message: `Su rol '${req.user.role}' no tiene permisos para acceder a archivos GDB`
  });
};

// Función para generar hash de contraseña
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

// Función para verificar contraseña
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Función para generar token JWT
const generateToken = (userId) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn });
};

module.exports = {
  authenticateToken,
  authorizeRole,
  canExportXTF,
  canLoadXTF,
  canAccessGDB,
  hashPassword,
  verifyPassword,
  generateToken
};
