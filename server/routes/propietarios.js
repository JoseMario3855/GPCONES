const express = require('express');
const { body, param, query } = require('express-validator');
const propietariosController = require('../controllers/propietariosController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas de propietarios requieren autenticación
router.use(authenticateToken);

// GET /api/propietarios - Obtener lista de propietarios (LADM-COL)
router.get('/', [
  query('schema_name')
    .notEmpty().withMessage('El esquema (schema_name) es obligatorio'),
  query('predio_id')
    .optional()
    .isInt({ min: 1 }).withMessage('El ID del predio debe ser un número entero válido'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('La página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1 }).withMessage('El límite debe ser un número entero mayor a 0')
], propietariosController.getPropietarios);

// PUT /api/propietarios/:rrr - Actualizar propietario (LADM-COL)
router.put('/:rrr', [
  param('rrr')
    .isInt({ min: 1 }).withMessage('El RRR del derecho debe ser un número entero válido'),
  
  query('schema_name')
    .notEmpty().withMessage('El esquema (schema_name) es obligatorio'),
  
  body('documento')
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage('El documento debe tener entre 2 y 50 caracteres'),
  
  body('tipo_documento')
    .optional()
    .isInt().withMessage('El tipo de documento debe ser un número entero'),
  
  body('tipo_derecho')
    .optional()
    .isInt().withMessage('El tipo de derecho debe ser un número entero'),
  
  body('participacion')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('La participación debe ser un número decimal entre 0 y 100'),
  
  body('primer_nombre')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage('El primer nombre no puede exceder 100 caracteres'),
    
  body('segundo_nombre')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage('El segundo nombre no puede exceder 100 caracteres'),
    
  body('primer_apellido')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage('El primer apellido no puede exceder 100 caracteres'),
    
  body('segundo_apellido')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage('El segundo apellido no puede exceder 100 caracteres'),
    
  body('razon_social')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 200 }).withMessage('La razón social no puede exceder 200 caracteres'),
    
  body('escritura')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage('El número de escritura no puede exceder 100 caracteres'),
    
  body('entidad')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 200 }).withMessage('La entidad emisora no puede exceder 200 caracteres'),
    
  body('fecha_escritura')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('La fecha de la escritura debe ser una fecha válida (formato YYYY-MM-DD)'),
    
  body('tipo_fuente')
    .optional({ nullable: true, checkFalsy: true })
    .isInt().withMessage('El tipo de fuente debe ser un número entero'),
    
  body('disponibilidad')
    .optional({ nullable: true, checkFalsy: true })
    .isInt().withMessage('La disponibilidad debe ser un número entero'),
], propietariosController.updatePropietario);

// POST /api/propietarios - Crear propietario (LADM-COL)
router.post('/', [
  query('schema_name')
    .notEmpty().withMessage('El esquema (schema_name) es obligatorio'),
  
  body('predio_id')
    .notEmpty().withMessage('El ID del predio es obligatorio')
    .isInt({ min: 1 }).withMessage('El ID del predio debe ser un número entero válido'),
  
  body('documento')
    .notEmpty().withMessage('El documento de identidad es obligatorio')
    .isLength({ min: 2, max: 50 }).withMessage('El documento debe tener entre 2 y 50 caracteres'),
  
  body('tipo_documento')
    .notEmpty().withMessage('El tipo de documento es obligatorio')
    .isInt().withMessage('El tipo de documento debe ser un número entero'),
  
  body('tipo_derecho')
    .notEmpty().withMessage('El tipo de derecho es obligatorio')
    .isInt().withMessage('El tipo de derecho debe ser un número entero'),
  
  body('participacion')
    .notEmpty().withMessage('La participación es obligatoria')
    .isFloat({ min: 0, max: 100 }).withMessage('La participación debe ser un número decimal entre 0 y 100'),
  
  body('primer_nombre')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage('El primer nombre no puede exceder 100 caracteres'),
    
  body('segundo_nombre')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage('El segundo nombre no puede exceder 100 caracteres'),
    
  body('primer_apellido')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage('El primer apellido no puede exceder 100 caracteres'),
    
  body('segundo_apellido')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage('El segundo apellido no puede exceder 100 caracteres'),
    
  body('razon_social')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 200 }).withMessage('La razón social no puede exceder 200 caracteres'),
    
  body('escritura')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage('El número de escritura no puede exceder 100 caracteres'),
    
  body('entidad')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 200 }).withMessage('La entidad emisora no puede exceder 200 caracteres'),
    
  body('fecha_escritura')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('La fecha de la escritura debe ser una fecha válida (formato YYYY-MM-DD)'),
    
  body('tipo_fuente')
    .optional({ nullable: true, checkFalsy: true })
    .isInt().withMessage('El tipo de fuente debe ser un número entero'),
    
  body('disponibilidad')
    .optional({ nullable: true, checkFalsy: true })
    .isInt().withMessage('La disponibilidad debe ser un número entero'),
    
  body().custom((value) => {
    if (!value.razon_social) {
      if (!value.primer_nombre || value.primer_nombre.trim() === '') {
        throw new Error('El primer nombre es obligatorio para personas naturales');
      }
      if (!value.primer_apellido || value.primer_apellido.trim() === '') {
        throw new Error('El primer apellido es obligatorio para personas naturales');
      }
    }
    return true;
  })
], propietariosController.createPropietario);

module.exports = router;
