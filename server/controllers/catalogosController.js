const { query } = require('../config/database');

class CatalogosController {
  
  // Obtener todos los catálogos
  async getAllCatalogos(req, res) {
    try {
      const result = await query('SELECT * FROM catalogos ORDER BY nombre ASC');
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error en getAllCatalogos:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  // Obtener un catálogo con sus valores
  async getCatalogoConValores(req, res) {
    try {
      const { id_o_nombre } = req.params;
      
      let catalogoResult;
      if (!isNaN(id_o_nombre)) {
        catalogoResult = await query('SELECT * FROM catalogos WHERE id = $1', [id_o_nombre]);
      } else {
        catalogoResult = await query('SELECT * FROM catalogos WHERE nombre = $1', [id_o_nombre]);
      }

      if (catalogoResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Catálogo no encontrado' });
      }

      const catalogo = catalogoResult.rows[0];
      const valoresResult = await query(
        'SELECT * FROM catalogo_valores WHERE catalogo_id = $1 ORDER BY orden ASC, valor ASC',
        [catalogo.id]
      );

      res.json({
        success: true,
        data: {
          ...catalogo,
          valores: valoresResult.rows
        }
      });
    } catch (error) {
      console.error('Error en getCatalogoConValores:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  // Crear catálogo (Admin)
  async createCatalogo(req, res) {
    try {
      const { nombre, descripcion, activo } = req.body;
      const result = await query(
        'INSERT INTO catalogos (nombre, descripcion, activo) VALUES ($1, $2, $3) RETURNING *',
        [nombre, descripcion, activo !== undefined ? activo : true]
      );
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error en createCatalogo:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  // Crear valor de catálogo
  async createCatalogoValor(req, res) {
    try {
      const { catalogo_id } = req.params;
      const { codigo, valor, descripcion, orden, activo } = req.body;
      
      const result = await query(
        `INSERT INTO catalogo_valores (catalogo_id, codigo, valor, descripcion, orden, activo) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [catalogo_id, codigo, valor, descripcion, orden || 0, activo !== undefined ? activo : true]
      );
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error en createCatalogoValor:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  // Actualizar valor de catálogo
  async updateCatalogoValor(req, res) {
    try {
      const { id } = req.params;
      const { codigo, valor, descripcion, orden, activo } = req.body;
      
      const result = await query(
        `UPDATE catalogo_valores 
         SET codigo = $1, valor = $2, descripcion = $3, orden = $4, activo = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 RETURNING *`,
        [codigo, valor, descripcion, orden, activo, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Valor no encontrado' });
      }
      
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error en updateCatalogoValor:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  // Eliminar valor de catálogo
  async deleteCatalogoValor(req, res) {
    try {
      const { id } = req.params;
      const result = await query('DELETE FROM catalogo_valores WHERE id = $1 RETURNING id', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Valor no encontrado' });
      }
      
      res.json({ success: true, message: 'Valor eliminado' });
    } catch (error) {
      console.error('Error en deleteCatalogoValor:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = new CatalogosController();
