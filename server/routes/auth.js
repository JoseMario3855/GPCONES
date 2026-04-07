const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// =====================================================
// RUTAS PÚBLICAS (NO REQUIEREN AUTENTICACIÓN)
// =====================================================

// POST /api/auth/login - Inicio de sesión
router.post('/login', [
  body('username')
    .notEmpty().withMessage('El nombre de usuario es obligatorio')
    .isLength({ min: 3, max: 50 }).withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres'),
  
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
], authController.login);

// POST /api/auth/forgot-password - Recuperación de contraseña (Historia 1)
router.post('/forgot-password', [
  body('email')
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('El email debe tener un formato válido')
], authController.forgotPassword);

// GET /api/auth/verify-reset-token/:token - Verificar token de recuperación
router.get('/verify-reset-token/:token', authController.verifyResetToken);

// POST /api/auth/reset-password - Restablecer contraseña con token
router.post('/reset-password', [
  body('token')
    .notEmpty().withMessage('El token es obligatorio'),
  
  body('newPassword')
    .notEmpty().withMessage('La nueva contraseña es obligatoria')
    .isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage('La nueva contraseña debe contener al menos una minúscula, una mayúscula, un número y un carácter especial')
], authController.resetPassword);

// =====================================================
// RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN)
// =====================================================

// Aplicar autenticación a todas las rutas siguientes
router.use(authenticateToken);

// POST /api/auth/logout - Cierre de sesión
router.post('/logout', authController.logout);

// GET /api/auth/profile - Obtener perfil del usuario autenticado
router.get('/profile', authController.getProfile);

// PUT /api/auth/change-password - Cambiar contraseña del usuario autenticado
router.put('/change-password', [
  body('currentPassword')
    .notEmpty().withMessage('La contraseña actual es obligatoria'),
  
  body('newPassword')
    .notEmpty().withMessage('La nueva contraseña es obligatoria')
    .isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número')
], authController.changePassword);

// =====================================================
// RUTAS DE ADMINISTRACIÓN (SOLO ADMINISTRADORES)
// =====================================================

// PUT /api/auth/users/:userId/role - Cambiar rol de usuario (Historia 2)
router.put('/users/:userId/role', [
  authorizeRole(['Administrador del Sistema']),
  
  body('newRole')
    .notEmpty().withMessage('El nuevo rol es obligatorio')
    .isIn(['Administrador del Sistema', 'Revisión de Calidad', 'Reconocedor Predial', 'Digitador Alfanumérico'])
    .withMessage('Rol inválido')
], authController.updateUserRole);

// =====================================================
// RUTAS DE VERIFICACIÓN DE PERMISOS
// =====================================================

// GET /api/auth/check-permissions - Verificar permisos del usuario
router.get('/check-permissions', (req, res) => {
  try {
    const user = req.user;
    
    // Definir permisos según rol según especificaciones del documento
    const permissions = {
      'Administrador del Sistema': {
        can_export_xtf: true,
        can_load_xtf: true,
        can_access_gdb: 'full',
        can_manage_users: true,
        can_manage_predios: true,
        can_approve_predios: true,
        can_view_audit_logs: true
      },
      'Revisión de Calidad': {
        can_export_xtf: 'validated_only',
        can_load_xtf: true,
        can_access_gdb: 'full',
        can_manage_users: false,
        can_manage_predios: true,
        can_approve_predios: true,
        can_view_audit_logs: true
      },
      'Reconocedor Predial': {
        can_export_xtf: false,
        can_load_xtf: false,
        can_access_gdb: 'read_only',
        can_manage_users: false,
        can_manage_predios: 'own_only',
        can_approve_predios: false,
        can_view_audit_logs: 'own_only'
      },
      'Digitador Alfanumérico': {
        can_export_xtf: false,
        can_load_xtf: false,
        can_access_gdb: 'read_only',
        can_manage_users: false,
        can_manage_predios: 'assigned_only',
        can_approve_predios: false,
        can_view_audit_logs: 'assigned_only'
      }
    };

    const userPermissions = permissions[user.role] || {};

    res.json({
      message: 'Permisos obtenidos exitosamente',
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      permissions: userPermissions,
      role_description: getRoleDescription(user.role)
    });

  } catch (error) {
    console.error('Error en check-permissions:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron verificar los permisos'
    });
  }
});

// Función auxiliar para obtener descripción del rol
function getRoleDescription(role) {
  const descriptions = {
    'Administrador del Sistema': 'Control total del sistema. Puede gestionar usuarios, exportar/cargar XTF y GDB, y administrar todos los módulos.',
    'Revisión de Calidad': 'Responsable de validar y aprobar información catastral. Puede exportar XTF solo de predios validados y cargar archivos para revisión.',
    'Reconocedor Predial': 'Captura información en campo. Acceso limitado a GDB (solo lectura) y gestión de predios propios.',
    'Digitador Alfanumérico': 'Ingresa y corrige datos alfanuméricos. Acceso limitado a GDB (solo lectura) y gestión de predios asignados.'
  };
  
  return descriptions[role] || 'Rol no definido';
}

// =====================================================
// RUTAS DE VALIDACIÓN DE TOKENS
// =====================================================

// GET /api/auth/validate-token - Validar token JWT
router.get('/validate-token', (req, res) => {
  try {
    // Si llegamos aquí, el token es válido (middleware authenticateToken ya lo validó)
    res.json({
      message: 'Token válido',
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        full_name: req.user.full_name,
        role: req.user.role,
        is_active: req.user.is_active
      },
      token_info: {
        valid: true,
        expires_in: process.env.JWT_EXPIRES_IN || '24h'
      }
    });
  } catch (error) {
    console.error('Error en validate-token:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo validar el token'
    });
  }
});

// =====================================================
// RUTAS DE INFORMACIÓN DEL SISTEMA
// =====================================================

// GET /api/auth/system-info - Información del sistema para el usuario
router.get('/system-info', (req, res) => {
  try {
    const systemInfo = {
      system_name: 'GPCONES - Sistema de Catastro Integral',
      version: '1.0.0',
      description: 'Plataforma catastral integral para levantamiento predial, consolidación y validación de información catastral',
      compliance: [
        'Estándares IGAC',
        'Gestor Catastral de Antioquia',
        'Modelo LADM-COL'
      ],
      features: [
        'Gestión de predios catastrales',
        'Carga y exportación XTF',
        'Validación de modelos ILI',
        'Control de acceso basado en roles (RBAC)',
        'Auditoría y trazabilidad completa'
      ],
      user_role: req.user.role,
      user_permissions: {
        can_export_xtf: req.user.role === 'Administrador del Sistema' || req.user.role === 'Revisión de Calidad',
        can_load_xtf: req.user.role === 'Administrador del Sistema' || req.user.role === 'Revisión de Calidad',
        can_access_gdb: req.user.role === 'Administrador del Sistema' || req.user.role === 'Revisión de Calidad' ? 'full' : 'read_only'
      }
    };

    res.json({
      message: 'Información del sistema obtenida exitosamente',
      success: true,
      system_info: systemInfo
    });

  } catch (error) {
    console.error('Error en system-info:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener la información del sistema'
    });
  }
});

module.exports = router;
