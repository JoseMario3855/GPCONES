const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const auth = require('../middleware/auth');

// Obtener información del schema antioquia_test
router.get('/schema-info', auth, async (req, res) => {
  try {
    const tablesResult = await query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'antioquia_test'
      ORDER BY table_name
    `);
    
    const geometryResult = await query(`
      SELECT f_table_name, f_geometry_column, type, srid
      FROM geometry_columns 
      WHERE f_table_schema = 'antioquia_test'
      ORDER BY f_table_name
    `);
    
    // Agrupar por categorías
    const categories = {};
    tablesResult.rows.forEach(row => {
      const prefix = row.table_name.split('_')[0];
      if (!categories[prefix]) {
        categories[prefix] = [];
      }
      categories[prefix].push({
        name: row.table_name,
        type: row.table_type
      });
    });
    
    res.json({
      success: true,
      data: {
        totalTables: tablesResult.rows.length,
        geometryTables: geometryResult.rows.length,
        categories: categories,
        geometryColumns: geometryResult.rows
      }
    });
  } catch (error) {
    console.error('Error al obtener información del schema:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener información del schema'
    });
  }
});

// Obtener datos de una tabla específica
router.get('/table/:tableName', auth, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    
    if (search) {
      whereClause = 'WHERE codigo ILIKE $1 OR nombre ILIKE $1 OR descripcion ILIKE $1';
      params.push(`%${search}%`);
    }
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM antioquia_test.${tableName} 
      ${whereClause}
    `;
    
    const dataQuery = `
      SELECT * 
      FROM antioquia_test.${tableName} 
      ${whereClause}
      ORDER BY id 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    const countResult = await query(countQuery, params);
    const dataResult = await query(dataQuery, [...params, limit, offset]);
    
    res.json({
      success: true,
      data: {
        table: tableName,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].total / limit),
        records: dataResult.rows
      }
    });
  } catch (error) {
    console.error('Error al obtener datos de la tabla:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos de la tabla'
    });
  }
});

// Obtener estructura de una tabla
router.get('/table/:tableName/structure', auth, async (req, res) => {
  try {
    const { tableName } = req.params;
    
    const columnsResult = await query(`
      SELECT column_name, data_type, is_nullable, column_default, 
             character_maximum_length, numeric_precision, numeric_scale
      FROM information_schema.columns 
      WHERE table_schema = 'antioquia_test' 
      AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    
    // Verificar si tiene geometría
    const geometryResult = await query(`
      SELECT f_geometry_column, type, srid
      FROM geometry_columns 
      WHERE f_table_schema = 'antioquia_test' 
      AND f_table_name = $1
    `, [tableName]);
    
    res.json({
      success: true,
      data: {
        table: tableName,
        columns: columnsResult.rows,
        geometry: geometryResult.rows.length > 0 ? geometryResult.rows[0] : null
      }
    });
  } catch (error) {
    console.error('Error al obtener estructura de la tabla:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estructura de la tabla'
    });
  }
});

// Obtener estadísticas del schema
router.get('/statistics', auth, async (req, res) => {
  try {
    // Contar registros por categoría
    const categories = ['cc', 'cr', 'gc', 'lc', 'snr', 'ini'];
    const stats = {};
    
    for (const category of categories) {
      const result = await query(`
        SELECT COUNT(*) as total
        FROM information_schema.tables 
        WHERE table_schema = 'antioquia_test' 
        AND table_name LIKE $1
      `, [`${category}_%`]);
      
      stats[category] = parseInt(result.rows[0].total);
    }
    
    // Contar geometrías
    const geometryResult = await query(`
      SELECT COUNT(*) as total
      FROM geometry_columns 
      WHERE f_table_schema = 'antioquia_test'
    `);
    
    res.json({
      success: true,
      data: {
        categories: stats,
        totalTables: Object.values(stats).reduce((a, b) => a + b, 0),
        geometryTables: parseInt(geometryResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
});

// Validar archivo XTF contra el modelo
router.post('/validate-xtf', auth, async (req, res) => {
  try {
    // Simulación de validación XTF
    // En producción, aquí se usaría ili2c o similar
    const { fileName, fileSize } = req.body;
    
    // Simular proceso de validación
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({
      success: true,
      data: {
        fileName,
        fileSize,
        isValid: true,
        errors: [],
        warnings: [],
        tablesFound: 9,
        recordsProcessed: 0,
        validationTime: '2.1s'
      }
    });
  } catch (error) {
    console.error('Error al validar archivo XTF:', error);
    res.status(500).json({
      success: false,
      error: 'Error al validar archivo XTF'
    });
  }
});

module.exports = router;
