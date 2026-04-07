const express = require('express');
const { body, param } = require('express-validator');
const usersController = require('../controllers/usersController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Aplicar autorización de administrador a todas las rutas
router.use(authorizeRole(['Administrador del Sistema']));

// =====================================================
// GESTIÓN DE USUARIOS - SOLO ADMINISTRADORES
// =====================================================

// GET /api/users - Obtener lista de usuarios con filtros
router.get('/', [
  // Validaciones de query parameters
  body('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número positivo'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  body('search').optional().isLength({ max: 100 }).withMessage('La búsqueda no puede exceder 100 caracteres'),
  body('role').optional().isIn(['Administrador del Sistema', 'Revisión de Calidad', 'Reconocedor Predial', 'Digitador Alfanumérico']).withMessage('Rol inválido'),
  body('status').optional().isIn(['active', 'inactive', '']).withMessage('Estado inválido'),
  body('sortBy').optional().isIn(['username', 'email', 'full_name', 'role', 'is_active', 'last_login', 'created_at']).withMessage('Campo de ordenamiento inválido'),
  body('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Orden inválido')
], usersController.getUsers);

// GET /api/users/stats - Obtener estadísticas de usuarios
router.get('/stats', usersController.getUserStats);

// POST /api/users - Crear nuevo usuario
router.post('/', [
  // Validaciones para creación de usuario
  body('username')
    .notEmpty().withMessage('El nombre de usuario es obligatorio')
    .isLength({ min: 3, max: 50 }).withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
  
  body('email')
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('El email debe tener un formato válido')
    .isLength({ max: 100 }).withMessage('El email no puede exceder 100 caracteres'),
  
  body('full_name')
    .notEmpty().withMessage('El nombre completo es obligatorio')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre completo debe tener entre 2 y 100 caracteres'),
  
  body('role')
    .notEmpty().withMessage('El rol es obligatorio')
    .isIn(['Administrador del Sistema', 'Revisión de Calidad', 'Reconocedor Predial', 'Digitador Alfanumérico'])
    .withMessage('Rol inválido'),
  
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage('La contraseña debe contener al menos una minúscula, una mayúscula, un número y un carácter especial'),
  
  body('is_active')
    .optional()
    .isBoolean().withMessage('El estado activo debe ser verdadero o falso')
], usersController.createUser);

// PUT /api/users/:userId - Actualizar usuario
router.put('/:userId', [
  // Validación de parámetro
  param('userId').isUUID().withMessage('ID de usuario inválido'),
  
  // Validaciones para actualización de usuario
  body('username')
    .optional()
    .isLength({ min: 3, max: 50 }).withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
  
  body('email')
    .optional()
    .isEmail().withMessage('El email debe tener un formato válido')
    .isLength({ max: 100 }).withMessage('El email no puede exceder 100 caracteres'),
  
  body('full_name')
    .optional()
    .isLength({ min: 2, max: 100 }).withMessage('El nombre completo debe tener entre 2 y 100 caracteres'),
  
  body('role')
    .optional()
    .isIn(['Administrador del Sistema', 'Revisión de Calidad', 'Reconocedor Predial', 'Digitador Alfanumérico'])
    .withMessage('Rol inválido'),
  
  body('is_active')
    .optional()
    .isBoolean().withMessage('El estado activo debe ser verdadero o falso')
], usersController.updateUser);

// DELETE /api/users/:userId - Desactivar usuario (soft delete)
router.delete('/:userId', [
  param('userId').isUUID().withMessage('ID de usuario inválido')
], usersController.deleteUser);

// PUT /api/users/:userId/reactivate - Reactivar usuario
router.put('/:userId/reactivate', [
  param('userId').isUUID().withMessage('ID de usuario inválido')
], usersController.reactivateUser);

// PUT /api/users/:userId/reset-password - Resetear contraseña de usuario
router.put('/:userId/reset-password', [
  param('userId').isUUID().withMessage('ID de usuario inválido'),
  
  body('newPassword')
    .notEmpty().withMessage('La nueva contraseña es obligatoria')
    .isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage('La nueva contraseña debe contener al menos una minúscula, una mayúscula, un número y un carácter especial')
], usersController.resetUserPassword);

// =====================================================
// RUTAS DE INFORMACIÓN Y CONSULTA
// =====================================================

// GET /api/users/roles - Obtener lista de roles disponibles
router.get('/roles', (req, res) => {
  try {
    const roles = [
      {
        value: 'Administrador del Sistema',
        label: 'Administrador del Sistema',
        description: 'Control total del sistema. Puede gestionar usuarios, exportar/cargar XTF y GDB, y administrar todos los módulos.',
        permissions: {
          can_export_xtf: true,
          can_load_xtf: true,
          can_access_gdb: 'full',
          can_manage_users: true,
          can_manage_predios: true,
          can_approve_predios: true,
          can_view_audit_logs: true
        }
      },
      {
        value: 'Revisión de Calidad',
        label: 'Revisión de Calidad',
        description: 'Responsable de validar y aprobar información catastral. Puede exportar XTF solo de predios validados y cargar archivos para revisión.',
        permissions: {
          can_export_xtf: 'validated_only',
          can_load_xtf: true,
          can_access_gdb: 'full',
          can_manage_users: false,
          can_manage_predios: true,
          can_approve_predios: true,
          can_view_audit_logs: true
        }
      },
      {
        value: 'Reconocedor Predial',
        label: 'Reconocedor Predial',
        description: 'Captura información en campo. Acceso limitado a GDB (solo lectura) y gestión de predios propios.',
        permissions: {
          can_export_xtf: false,
          can_load_xtf: false,
          can_access_gdb: 'read_only',
          can_manage_users: false,
          can_manage_predios: 'own_only',
          can_approve_predios: false,
          can_view_audit_logs: 'own_only'
        }
      },
      {
        value: 'Digitador Alfanumérico',
        label: 'Digitador Alfanumérico',
        description: 'Ingresa y corrige datos alfanuméricos. Acceso limitado a GDB (solo lectura) y gestión de predios asignados.',
        permissions: {
          can_export_xtf: false,
          can_load_xtf: false,
          can_access_gdb: 'read_only',
          can_manage_users: false,
          can_manage_predios: 'assigned_only',
          can_approve_predios: false,
          can_view_audit_logs: 'assigned_only'
        }
      }
    ];

    res.json({
      success: true,
      data: roles
    });

  } catch (error) {
    console.error('Error en getRoles:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los roles'
    });
  }
});

// GET /api/users/permissions - Obtener lista de permisos disponibles
router.get('/permissions', (req, res) => {
  try {
    const permissions = [
      {
        code: 'can_export_xtf',
        name: 'Exportar XTF',
        description: 'Permite exportar archivos XTF según el modelo IGAC o Antioquia',
        module: 'XTF',
        levels: ['true', 'validated_only', 'false']
      },
      {
        code: 'can_load_xtf',
        name: 'Cargar XTF',
        description: 'Permite cargar archivos XTF al sistema para procesamiento',
        module: 'XTF',
        levels: ['true', 'false']
      },
      {
        code: 'can_access_gdb',
        name: 'Acceso GDB',
        description: 'Permite acceder a archivos GDB (Geodatabase)',
        module: 'GDB',
        levels: ['full', 'read_only', 'false']
      },
      {
        code: 'can_manage_users',
        name: 'Gestionar Usuarios',
        description: 'Permite crear, editar y gestionar usuarios del sistema',
        module: 'USUARIOS',
        levels: ['true', 'false']
      },
      {
        code: 'can_manage_predios',
        name: 'Gestionar Predios',
        description: 'Permite crear, editar y gestionar predios catastrales',
        module: 'PREDIOS',
        levels: ['true', 'own_only', 'assigned_only', 'false']
      },
      {
        code: 'can_approve_predios',
        name: 'Aprobar Predios',
        description: 'Permite aprobar o rechazar predios en el flujo de validación',
        module: 'PREDIOS',
        levels: ['true', 'false']
      },
      {
        code: 'can_view_audit_logs',
        name: 'Ver Auditoría',
        description: 'Permite consultar los logs de auditoría del sistema',
        module: 'AUDITORIA',
        levels: ['true', 'own_only', 'assigned_only', 'false']
      }
    ];

    res.json({
      success: true,
      data: permissions
    });

  } catch (error) {
    console.error('Error en getPermissions:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los permisos'
    });
  }
});

module.exports = router;
