const express = require('express');
const router = express.Router();
const catalogosController = require('../controllers/catalogosController');
const authMiddleware = require('../middleware/auth');

// Proteger todas las rutas con autenticación
router.use(authMiddleware.authenticateToken);

// Obtener todos los catálogos
router.get('/', catalogosController.getAllCatalogos);

// Obtener un catálogo por ID o nombre, con sus valores
router.get('/:id_o_nombre', catalogosController.getCatalogoConValores);

// Solo administradores pueden modificar catálogos (si existe middleware de roles, usarlo)
// router.use(authMiddleware.requireRole(['Administrador']));

// Crear nuevo catálogo
router.post('/', catalogosController.createCatalogo);

// Crear valor en un catálogo
router.post('/:catalogo_id/valores', catalogosController.createCatalogoValor);

// Actualizar un valor
router.put('/valores/:id', catalogosController.updateCatalogoValor);

// Eliminar un valor
router.delete('/valores/:id', catalogosController.deleteCatalogoValor);

module.exports = router;
