const express = require('express');
const consultaAlfanumericoController = require('../controllers/consultaAlfanumericoController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /api/consulta-alfanumerico/fichas - Consultar Fichas (Predios)
router.get('/fichas', consultaAlfanumericoController.consultarFichas);

// GET /api/consulta-alfanumerico/propietarios - Consultar Propietarios
router.get('/propietarios', consultaAlfanumericoController.consultarPropietarios);

// GET /api/consulta-alfanumerico/construcciones - Consultar Construcciones
router.get('/construcciones', consultaAlfanumericoController.consultarConstrucciones);

// GET /api/consulta-alfanumerico/calificaciones-construcciones - Consultar CalificacionesConstrucciones
router.get('/calificaciones-construcciones', consultaAlfanumericoController.consultarCalificacionesConstrucciones);

// GET /api/consulta-alfanumerico/construcciones-generales - Consultar ConstruccionesGenerales
router.get('/construcciones-generales', consultaAlfanumericoController.consultarConstruccionesGenerales);

// GET /api/consulta-alfanumerico/colindantes - Consultar Colindantes
router.get('/colindantes', consultaAlfanumericoController.consultarColindantes);

// GET /api/consulta-alfanumerico/cartografia - Consultar CartografiaInformacionGrafica
router.get('/cartografia', consultaAlfanumericoController.consultarCartografia);

module.exports = router;

