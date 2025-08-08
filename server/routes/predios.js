const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/predios
// @desc    Registrar un nuevo predio
// @access  Private
router.post('/', auth, [
  body('numero_predial', 'El número predial es requerido').not().isEmpty(),
  body('matricula_inmobiliaria', 'La matrícula inmobiliaria es requerida').not().isEmpty(),
  body('area_terreno', 'El área del terreno es requerida').isNumeric(),
  body('municipio', 'El municipio es requerido').not().isEmpty(),
  body('departamento', 'El departamento es requerido').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      numero_predial,
      matricula_inmobiliaria,
      area_terreno,
      area_construccion,
      direccion,
      municipio,
      departamento,
      coordenadas_x,
      coordenadas_y,
      tipo_predio,
      uso_predio,
      observaciones
    } = req.body;

    // Verificar si el número predial ya existe
    const existingPredio = await db.query(
      'SELECT id FROM predios WHERE numero_predial = $1',
      [numero_predial]
    );

    if (existingPredio.rows.length > 0) {
      return res.status(400).json({ 
        error: 'El número predial ya existe en el sistema' 
      });
    }

    // Insertar nuevo predio
    const insertQuery = `
      INSERT INTO predios (
        numero_predial, matricula_inmobiliaria, area_terreno, 
        area_construccion, direccion, municipio, departamento,
        coordenadas_x, coordenadas_y, tipo_predio, uso_predio, 
        observaciones, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      numero_predial, matricula_inmobiliaria, area_terreno,
      area_construccion || null, direccion, municipio, departamento,
      coordenadas_x || null, coordenadas_y || null, tipo_predio || null,
      uso_predio || null, observaciones || null, req.user.id
    ]);

    res.json({
      success: true,
      message: 'Predio registrado correctamente',
      predio: result.rows[0]
    });

  } catch (err) {
    console.error('Error al registrar predio:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// @route   GET /api/predios
// @desc    Consultar predios con filtros
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      municipio,
      departamento,
      tipo_predio,
      area_min,
      area_max,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Construir condiciones de búsqueda
    if (search) {
      paramCount++;
      whereConditions.push(`(
        numero_predial ILIKE $${paramCount} OR 
        matricula_inmobiliaria ILIKE $${paramCount} OR 
        direccion ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    if (municipio) {
      paramCount++;
      whereConditions.push(`municipio ILIKE $${paramCount}`);
      queryParams.push(`%${municipio}%`);
    }

    if (departamento) {
      paramCount++;
      whereConditions.push(`departamento ILIKE $${paramCount}`);
      queryParams.push(`%${departamento}%`);
    }

    if (tipo_predio) {
      paramCount++;
      whereConditions.push(`tipo_predio = $${paramCount}`);
      queryParams.push(tipo_predio);
    }

    if (area_min) {
      paramCount++;
      whereConditions.push(`area_terreno >= $${paramCount}`);
      queryParams.push(parseFloat(area_min));
    }

    if (area_max) {
      paramCount++;
      whereConditions.push(`area_terreno <= $${paramCount}`);
      queryParams.push(parseFloat(area_max));
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Consulta para contar total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM predios 
      ${whereClause}
    `;
    
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Consulta para obtener datos
    const dataQuery = `
      SELECT 
        p.*,
        u.username as created_by_name
      FROM predios p
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
      ORDER BY p.${sort_by} ${sort_order}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const dataResult = await db.query(dataQuery, [...queryParams, limit, offset]);

    // Obtener estadísticas
    const statsQuery = `
      SELECT 
        COUNT(*) as total_predios,
        COUNT(DISTINCT municipio) as total_municipios,
        COUNT(DISTINCT departamento) as total_departamentos,
        AVG(area_terreno) as area_promedio,
        SUM(area_terreno) as area_total
      FROM predios
    `;
    
    const statsResult = await db.query(statsQuery);

    res.json({
      success: true,
      data: {
        predios: dataResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        },
        filters: {
          search,
          municipio,
          departamento,
          tipo_predio,
          area_min,
          area_max
        },
        statistics: statsResult.rows[0]
      }
    });

  } catch (err) {
    console.error('Error al consultar predios:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// @route   GET /api/predios/statistics
// @desc    Obtener estadísticas de predios
// @access  Private
router.get('/statistics', auth, async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_predios,
        COUNT(CASE WHEN estado = 'activo' THEN 1 END) as predios_activos,
        COUNT(CASE WHEN estado = 'inactivo' THEN 1 END) as predios_inactivos,
        COUNT(DISTINCT municipio) as total_municipios,
        COUNT(DISTINCT departamento) as total_departamentos,
        AVG(area_terreno) as area_promedio,
        SUM(area_terreno) as area_total,
        AVG(area_construccion) as construccion_promedio,
        SUM(area_construccion) as construccion_total
      FROM predios
      WHERE estado != 'eliminado'
    `;

    const statsResult = await db.query(statsQuery);

    // Estadísticas por municipio
    const municipiosQuery = `
      SELECT 
        municipio,
        COUNT(*) as cantidad,
        AVG(area_terreno) as area_promedio,
        SUM(area_terreno) as area_total
      FROM predios
      WHERE estado != 'eliminado'
      GROUP BY municipio
      ORDER BY cantidad DESC
      LIMIT 10
    `;

    const municipiosResult = await db.query(municipiosQuery);

    res.json({
      success: true,
      statistics: statsResult.rows[0],
      topMunicipios: municipiosResult.rows
    });

  } catch (err) {
    console.error('Error al obtener estadísticas:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// @route   GET /api/predios/:id
// @desc    Obtener un predio específico
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.*,
        u.username as created_by_name
      FROM predios p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }

    res.json({
      success: true,
      predio: result.rows[0]
    });

  } catch (err) {
    console.error('Error al obtener predio:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// @route   PUT /api/predios/:id
// @desc    Actualizar un predio
// @access  Private
router.put('/:id', auth, [
  body('numero_predial', 'El número predial es requerido').not().isEmpty(),
  body('matricula_inmobiliaria', 'La matrícula inmobiliaria es requerida').not().isEmpty(),
  body('area_terreno', 'El área del terreno es requerida').isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      numero_predial,
      matricula_inmobiliaria,
      area_terreno,
      area_construccion,
      direccion,
      municipio,
      departamento,
      coordenadas_x,
      coordenadas_y,
      tipo_predio,
      uso_predio,
      observaciones,
      estado
    } = req.body;

    // Verificar si el predio existe
    const existingPredio = await db.query(
      'SELECT id FROM predios WHERE id = $1',
      [id]
    );

    if (existingPredio.rows.length === 0) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }

    // Verificar si el número predial ya existe en otro predio
    const duplicatePredio = await db.query(
      'SELECT id FROM predios WHERE numero_predial = $1 AND id != $2',
      [numero_predial, id]
    );

    if (duplicatePredio.rows.length > 0) {
      return res.status(400).json({ 
        error: 'El número predial ya existe en otro predio' 
      });
    }

    // Actualizar predio
    const updateQuery = `
      UPDATE predios SET
        numero_predial = $1,
        matricula_inmobiliaria = $2,
        area_terreno = $3,
        area_construccion = $4,
        direccion = $5,
        municipio = $6,
        departamento = $7,
        coordenadas_x = $8,
        coordenadas_y = $9,
        tipo_predio = $10,
        uso_predio = $11,
        observaciones = $12,
        estado = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      numero_predial, matricula_inmobiliaria, area_terreno,
      area_construccion || null, direccion, municipio, departamento,
      coordenadas_x || null, coordenadas_y || null, tipo_predio || null,
      uso_predio || null, observaciones || null, estado || 'activo', id
    ]);

    res.json({
      success: true,
      message: 'Predio actualizado correctamente',
      predio: result.rows[0]
    });

  } catch (err) {
    console.error('Error al actualizar predio:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// @route   DELETE /api/predios/:id
// @desc    Eliminar un predio (soft delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el predio existe
    const existingPredio = await db.query(
      'SELECT id FROM predios WHERE id = $1',
      [id]
    );

    if (existingPredio.rows.length === 0) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }

    // Soft delete - cambiar estado a 'eliminado'
    await db.query(
      'UPDATE predios SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['eliminado', id]
    );

    res.json({
      success: true,
      message: 'Predio eliminado correctamente'
    });

  } catch (err) {
    console.error('Error al eliminar predio:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router; 