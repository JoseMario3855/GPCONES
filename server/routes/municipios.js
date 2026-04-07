const express = require('express');
const municipiosController = require('../controllers/municipiosController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /api/municipios - Obtener todos los municipios
router.get('/', municipiosController.getMunicipios);

// GET /api/municipios/departamentos - Obtener lista de departamentos
router.get('/departamentos', municipiosController.getDepartamentos);

// GET /api/municipios/schemas-disponibles - Obtener schemas disponibles
router.get('/schemas-disponibles', municipiosController.getSchemasDisponibles);

// POST /api/municipios - Crear un nuevo municipio
router.post('/',
  authorizeRole(['Administrador del Sistema']),
  municipiosController.createMunicipio
);

// GET /api/municipios/:id - Obtener municipio por ID con sus schemas
router.get('/:id', municipiosController.getMunicipioById);

// POST /api/municipios/asociar-schema - Asociar un schema a un municipio
router.post('/asociar-schema', 
  authorizeRole(['Administrador del Sistema']),
  municipiosController.asociarSchema
);

// DELETE /api/municipios/desasociar-schema/:id - Desasociar un schema de un municipio
router.delete('/desasociar-schema/:id',
  authorizeRole(['Administrador del Sistema']),
  municipiosController.desasociarSchema
);

// POST /api/municipios/importar-csv - Importar municipios desde CSV
router.post('/importar-csv',
  authorizeRole(['Administrador del Sistema']),
  municipiosController.importarDesdeCSV
);

module.exports = router;

