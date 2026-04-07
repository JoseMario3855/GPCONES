const express = require('express');
const { body, param, query } = require('express-validator');
const prediosController = require('../controllers/prediosController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// =====================================================
// HISTORIA 3: REGISTRO DE PREDIOS
// =====================================================

// POST /api/predios - Crear nuevo predio
router.post('/', [
  // Validaciones para el registro de predios
  body('npn')
    .notEmpty().withMessage('El NPN es obligatorio')
    .isLength({ min: 1, max: 50 }).withMessage('El NPN debe tener entre 1 y 50 caracteres'),
  
  body('municipio')
    .notEmpty().withMessage('El municipio es obligatorio')
    .isLength({ min: 1, max: 100 }).withMessage('El municipio debe tener entre 1 y 100 caracteres'),
  
  body('zona')
    .optional()
    .isLength({ max: 100 }).withMessage('La zona no puede exceder 100 caracteres'),
  
  body('sector')
    .optional()
    .isLength({ max: 100 }).withMessage('El sector no puede exceder 100 caracteres'),
  
  body('numero_ficha')
    .optional()
    .isLength({ max: 50 }).withMessage('El número de ficha no puede exceder 50 caracteres'),
  
  body('area_hectareas')
    .optional()
    .isFloat({ min: 0 }).withMessage('El área debe ser un número positivo'),
  
  body('tipo_predio')
    .optional()
    .isIn(['URBANO', 'RURAL', 'MIXTO']).withMessage('El tipo de predio debe ser URBANO, RURAL o MIXTO'),
  
  body('uso_predio')
    .optional()
    .isIn(['RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'AGRICOLA']).withMessage('Uso de predio inválido'),
  
  body('propietario_nombre')
    .optional()
    .isLength({ max: 200 }).withMessage('El nombre del propietario no puede exceder 200 caracteres'),
  
  body('propietario_documento')
    .optional()
    .isLength({ max: 20 }).withMessage('El documento del propietario no puede exceder 20 caracteres'),
  
  body('propietario_tipo_documento')
    .optional()
    .isIn(['CC', 'CE', 'NIT', 'RUT']).withMessage('Tipo de documento inválido'),
  
  body('geometry')
    .notEmpty().withMessage('La geometría del predio es obligatoria')
    .isObject().withMessage('La geometría debe ser un objeto GeoJSON válido')
], prediosController.createPredio);

// =====================================================
// HISTORIA 4: CONSULTA DE PREDIOS
// =====================================================

// GET /api/predios - Consultar predios con filtros
router.get('/', prediosController.getPredios.bind(prediosController));

// GET /api/predios/stats - Obtener estadísticas de predios
router.get('/stats', prediosController.getPrediosStats);

// GET /api/predios/:id - Obtener predio por ID
router.get('/:id', [
  param('id').isUUID().withMessage('ID de predio inválido')
], prediosController.getPredioById);

// PUT /api/predios/:id - Actualizar predio
router.put('/:id', [
  param('id').isUUID().withMessage('ID de predio inválido'),
  
  // Validaciones opcionales para actualización
  body('npn')
    .optional()
    .isLength({ min: 1, max: 50 }).withMessage('El NPN debe tener entre 1 y 50 caracteres'),
  
  body('municipio')
    .optional()
    .isLength({ min: 1, max: 100 }).withMessage('El municipio debe tener entre 1 y 100 caracteres'),
  
  body('zona')
    .optional()
    .isLength({ max: 100 }).withMessage('La zona no puede exceder 100 caracteres'),
  
  body('sector')
    .optional()
    .isLength({ max: 100 }).withMessage('El sector no puede exceder 100 caracteres'),
  
  body('numero_ficha')
    .optional()
    .isLength({ max: 50 }).withMessage('El número de ficha no puede exceder 50 caracteres'),
  
  body('area_hectareas')
    .optional()
    .isFloat({ min: 0 }).withMessage('El área debe ser un número positivo'),
  
  body('tipo_predio')
    .optional()
    .isIn(['URBANO', 'RURAL', 'MIXTO']).withMessage('El tipo de predio debe ser URBANO, RURAL o MIXTO'),
  
  body('uso_predio')
    .optional()
    .isIn(['RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'AGRICOLA', 'PECUARIO', 'FORESTAL', 'MINERO', 'ESPECIAL']).withMessage('Uso de predio inválido'),
  
  body('propietario_nombre')
    .optional()
    .isLength({ max: 200 }).withMessage('El nombre del propietario no puede exceder 200 caracteres'),
  
  body('propietario_documento')
    .optional()
    .isLength({ max: 20 }).withMessage('El documento del propietario no puede exceder 20 caracteres'),
  
  body('propietario_tipo_documento')
    .optional()
    .isIn(['CC', 'CE', 'NIT', 'RUT', 'TI', 'RC']).withMessage('Tipo de documento inválido'),
  
  body('estado')
    .optional()
    .isIn(['Borrador', 'En Revisión', 'Aprobado', 'Rechazado']).withMessage('Estado inválido'),
  
  body('geometry')
    .optional()
    .isObject().withMessage('La geometría debe ser un objeto GeoJSON válido')
], prediosController.updatePredio);

// PATCH /api/predios/:id/status - Cambiar estado del predio
router.patch('/:id/status', [
  param('id').isUUID().withMessage('ID de predio inválido'),
  
  body('estado')
    .notEmpty().withMessage('El estado es obligatorio')
    .isIn(['Borrador', 'En Revisión', 'Aprobado', 'Rechazado']).withMessage('Estado inválido'),
  
  body('observaciones')
    .optional()
    .isLength({ max: 500 }).withMessage('Las observaciones no pueden exceder 500 caracteres')
], prediosController.changePredioStatus);

// =====================================================
// RUTAS ESPECÍFICAS POR ROL
// =====================================================

// GET /api/predios/reconocedor/mis-predios - Predios del reconocedor actual
router.get('/reconocedor/mis-predios', [
  // Solo reconocedores pueden acceder a sus propios predios
], async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT 
        p.*,
        u.username as created_by_username,
        u.full_name as created_by_name
      FROM predios p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.created_by = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM predios WHERE created_by = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        predios: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error en mis-predios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los predios'
    });
  }
});

// GET /api/predios/revision/por-revisar - Predios pendientes de revisión
router.get('/revision/por-revisar', [
  // Solo revisores pueden acceder
], async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT 
        p.*,
        u.username as created_by_username,
        u.full_name as created_by_name
      FROM predios p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.estado IN ('Borrador', 'En Revisión')
      ORDER BY p.created_at ASC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query(
      "SELECT COUNT(*) as total FROM predios WHERE estado IN ('Borrador', 'En Revisión')"
    );

    res.json({
      success: true,
      data: {
        predios: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error en por-revisar:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los predios por revisar'
    });
  }
});

// =====================================================
// RUTAS DE EXPORTACIÓN
// =====================================================

// GET /api/predios/export/geojson - Exportar predios a GeoJSON
router.get('/export/geojson', async (req, res) => {
  try {
    const { estado, municipio, tipo_predio } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (estado) {
      whereConditions.push(`estado = $${paramIndex}`);
      queryParams.push(estado);
      paramIndex++;
    }

    if (municipio) {
      whereConditions.push(`municipio = $${paramIndex}`);
      queryParams.push(municipio);
      paramIndex++;
    }

    if (tipo_predio) {
      whereConditions.push(`tipo_predio = $${paramIndex}`);
      queryParams.push(tipo_predio);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT 
        p.*,
        ST_AsGeoJSON(p.geometry) as geometry_geojson
      FROM predios p
      ${whereClause}
      ORDER BY p.created_at DESC`,
      queryParams
    );

    // Construir GeoJSON FeatureCollection
    const features = result.rows.map(predio => ({
      type: 'Feature',
      properties: {
        id: predio.id,
        npn: predio.npn,
        municipio: predio.municipio,
        zona: predio.zona,
        sector: predio.sector,
        numero_ficha: predio.numero_ficha,
        area_hectareas: predio.area_hectareas,
        tipo_predio: predio.tipo_predio,
        uso_predio: predio.uso_predio,
        propietario_nombre: predio.propietario_nombre,
        propietario_documento: predio.propietario_documento,
        propietario_tipo_documento: predio.propietario_tipo_documento,
        estado: predio.estado,
        created_at: predio.created_at,
        updated_at: predio.updated_at
      },
      geometry: predio.geometry_geojson ? JSON.parse(predio.geometry_geojson) : null
    }));

    const geoJson = {
      type: 'FeatureCollection',
      features: features
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=predios.geojson');
    res.json(geoJson);

  } catch (error) {
    console.error('Error en export geojson:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudo exportar a GeoJSON'
    });
  }
});

// GET /api/predios/export/csv - Exportar predios a CSV
router.get('/export/csv', async (req, res) => {
  try {
    const { estado, municipio, tipo_predio } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (estado) {
      whereConditions.push(`estado = $${paramIndex}`);
      queryParams.push(estado);
      paramIndex++;
    }

    if (municipio) {
      whereConditions.push(`municipio = $${paramIndex}`);
      queryParams.push(municipio);
      paramIndex++;
    }

    if (tipo_predio) {
      whereConditions.push(`tipo_predio = $${paramIndex}`);
      queryParams.push(tipo_predio);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT 
        npn,
        municipio,
        zona,
        sector,
        numero_ficha,
        area_hectareas,
        tipo_predio,
        uso_predio,
        propietario_nombre,
        propietario_documento,
        propietario_tipo_documento,
        estado,
        created_at,
        updated_at
      FROM predios
      ${whereClause}
      ORDER BY created_at DESC`,
      queryParams
    );

    // Generar CSV
    const headers = [
      'NPN', 'Municipio', 'Zona', 'Sector', 'Numero_Ficha', 'Area_Hectareas',
      'Tipo_Predio', 'Uso_Predio', 'Propietario_Nombre', 'Propietario_Documento',
      'Propietario_Tipo_Documento', 'Estado', 'Created_At', 'Updated_At'
    ];

    const csvContent = [
      headers.join(','),
      ...result.rows.map(row => 
        headers.map(header => {
          const value = row[header.toLowerCase()];
          return value ? `"${value.toString().replace(/"/g, '""')}"` : '';
        }).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=predios.csv');
    res.send(csvContent);

  } catch (error) {
    console.error('Error en export csv:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudo exportar a CSV'
    });
  }
});

// =====================================================
// RUTAS DE CONSULTA CON FILTROS
// =====================================================

// GET /api/predios/search - Consultar predios con filtros avanzados
router.get('/search', [
  // Validaciones para consultas
  query('npn')
    .optional()
    .isLength({ max: 50 }).withMessage('El NPN no puede exceder 50 caracteres'),
  
  query('municipio')
    .optional()
    .isLength({ max: 100 }).withMessage('El municipio no puede exceder 100 caracteres'),
  
  query('zona')
    .optional()
    .isLength({ max: 100 }).withMessage('La zona no puede exceder 100 caracteres'),
  
  query('sector')
    .optional()
    .isLength({ max: 100 }).withMessage('El sector no puede exceder 100 caracteres'),
  
  query('numero_ficha')
    .optional()
    .isLength({ max: 50 }).withMessage('El número de ficha no puede exceder 50 caracteres'),
  
  query('estado')
    .optional()
    .isIn(['Borrador', 'En Revisión', 'Aprobado', 'Rechazado']).withMessage('Estado de predio inválido'),
  
  query('tipo_predio')
    .optional()
    .isIn(['URBANO', 'RURAL', 'MIXTO']).withMessage('Tipo de predio inválido'),
  
  query('uso_predio')
    .optional()
    .isIn(['RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'AGRICOLA']).withMessage('Uso de predio inválido'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('La página debe ser un número entero positivo'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('El límite debe ser entre 1 y 100'),
  
  query('sort_by')
    .optional()
    .isIn(['npn', 'municipio', 'created_at', 'estado', 'area_hectareas']).withMessage('Campo de ordenamiento inválido'),
  
  query('sort_order')
    .optional()
    .isIn(['ASC', 'DESC']).withMessage('El orden debe ser ASC o DESC')
], prediosController.getPredios);

// GET /api/predios/stats - Estadísticas de predios
router.get('/stats', prediosController.getPrediosStats);

// GET /api/predios/:id - Obtener predio específico
router.get('/:id', [
  param('id')
    .isUUID().withMessage('El ID del predio debe ser un UUID válido')
], prediosController.getPredioById);

// =====================================================
// OPERACIONES DE ACTUALIZACIÓN
// =====================================================

// PUT /api/predios/:id - Actualizar predio existente
router.put('/:id', [
  param('id')
    .isUUID().withMessage('El ID del predio debe ser un UUID válido'),
  
  // Validaciones para actualización
  body('npn')
    .optional()
    .isLength({ min: 1, max: 50 }).withMessage('El NPN debe tener entre 1 y 50 caracteres'),
  
  body('municipio')
    .optional()
    .isLength({ min: 1, max: 100 }).withMessage('El municipio debe tener entre 1 y 100 caracteres'),
  
  body('zona')
    .optional()
    .isLength({ max: 100 }).withMessage('La zona no puede exceder 100 caracteres'),
  
  body('sector')
    .optional()
    .isLength({ max: 100 }).withMessage('El sector no puede exceder 100 caracteres'),
  
  body('numero_ficha')
    .optional()
    .isLength({ max: 50 }).withMessage('El número de ficha no puede exceder 50 caracteres'),
  
  body('area_hectareas')
    .optional()
    .isFloat({ min: 0 }).withMessage('El área debe ser un número positivo'),
  
  body('tipo_predio')
    .optional()
    .isIn(['URBANO', 'RURAL', 'MIXTO']).withMessage('El tipo de predio debe ser URBANO, RURAL o MIXTO'),
  
  body('uso_predio')
    .optional()
    .isIn(['RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'AGRICOLA']).withMessage('Uso de predio inválido'),
  
  body('propietario_nombre')
    .optional()
    .isLength({ max: 200 }).withMessage('El nombre del propietario no puede exceder 200 caracteres'),
  
  body('propietario_documento')
    .optional()
    .isLength({ max: 20 }).withMessage('El documento del propietario no puede exceder 20 caracteres'),
  
  body('propietario_tipo_documento')
    .optional()
    .isIn(['CC', 'CE', 'NIT', 'RUT']).withMessage('Tipo de documento inválido'),
  
  body('geometry')
    .optional()
    .isObject().withMessage('La geometría debe ser un objeto GeoJSON válido')
], prediosController.updatePredio);

// =====================================================
// GESTIÓN DE ESTADOS (FLUJO DE TRABAJO)
// =====================================================

// PATCH /api/predios/:id/status - Cambiar estado del predio
router.patch('/:id/status', [
  param('id')
    .isUUID().withMessage('El ID del predio debe ser un UUID válido'),
  
  body('newStatus')
    .notEmpty().withMessage('El nuevo estado es obligatorio')
    .isIn(['Borrador', 'En Revisión', 'Aprobado', 'Rechazado']).withMessage('Estado inválido'),
  
  body('observaciones')
    .optional()
    .isLength({ max: 1000 }).withMessage('Las observaciones no pueden exceder 1000 caracteres')
], prediosController.changePredioStatus);

// =====================================================
// RUTAS ESPECÍFICAS POR ROL
// =====================================================

// Ruta para Reconocedores Prediales - Solo pueden ver y crear predios
router.get('/reconocedor/mis-predios', [
  authorizeRole(['Reconocedor Predial'])
], async (req, res) => {
  try {
    // Implementar lógica para mostrar solo predios del reconocedor
    res.json({
      message: 'Lista de predios del reconocedor',
      success: true,
      data: []
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los predios del reconocedor'
    });
  }
});

// Ruta para Revisión de Calidad - Solo pueden ver predios en revisión
router.get('/revision/por-revisar', [
  authorizeRole(['Revisión de Calidad'])
], async (req, res) => {
  try {
    // Implementar lógica para mostrar predios que requieren revisión
    res.json({
      message: 'Lista de predios por revisar',
      success: true,
      data: []
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los predios por revisar'
    });
  }
});

// =====================================================
// EXPORTACIÓN DE DATOS
// =====================================================

// GET /api/predios/export/geojson - Exportar predios en formato GeoJSON
router.get('/export/geojson', [
  query('estado')
    .optional()
    .isIn(['Borrador', 'En Revisión', 'Aprobado', 'Rechazado']).withMessage('Estado de predio inválido'),
  
  query('municipio')
    .optional()
    .isLength({ max: 100 }).withMessage('El municipio no puede exceder 100 caracteres')
], async (req, res) => {
  try {
    // TODO: Implementar exportación a GeoJSON
    res.json({
      message: 'Exportación a GeoJSON (pendiente de implementación)',
      success: true
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo exportar a GeoJSON'
    });
  }
});

// GET /api/predios/export/csv - Exportar predios en formato CSV
router.get('/export/csv', [
  query('estado')
    .optional()
    .isIn(['Borrador', 'En Revisión', 'Aprobado', 'Rechazado']).withMessage('Estado de predio inválido'),
  
  query('municipio')
    .optional()
    .isLength({ max: 100 }).withMessage('El municipio no puede exceder 100 caracteres')
], async (req, res) => {
  try {
    // TODO: Implementar exportación a CSV
    res.json({
      message: 'Exportación a CSV (pendiente de implementación)',
      success: true
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo exportar a CSV'
    });
  }
});

module.exports = router;
