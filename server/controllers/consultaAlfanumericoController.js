const consultaAlfanumericoService = require('../services/consultaAlfanumericoService');

class ConsultaAlfanumericoController {
  /**
   * Consultar Fichas (Predios)
   * GET /api/consulta-alfanumerico/fichas
   */
  async consultarFichas(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido',
          message: 'Debe especificar el schema_name en los parámetros de consulta'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        npn: req.query.npn,
        municipio: req.query.municipio,
        matriculaInmobiliaria: req.query.matriculaInmobiliaria,
        limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      // Limpiar filtros undefined
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
          delete filters[key];
        }
      });

      const result = await consultaAlfanumericoService.consultarFichas(schema_name, filters);

      res.json(result);
    } catch (error) {
      console.error('Error en consultarFichas:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Consultar Propietarios
   * GET /api/consulta-alfanumerico/propietarios
   */
  async consultarPropietarios(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        npn: req.query.npn,
        documento: req.query.documento
      };

      const result = await consultaAlfanumericoService.consultarPropietarios(schema_name, filters);

      res.json(result);
    } catch (error) {
      console.error('Error en consultarPropietarios:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Consultar Construcciones
   * GET /api/consulta-alfanumerico/construcciones
   */
  async consultarConstrucciones(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        npn: req.query.npn,
        limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      const result = await consultaAlfanumericoService.consultarConstrucciones(schema_name, filters);

      res.json(result);
    } catch (error) {
      console.error('Error en consultarConstrucciones:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Consultar CalificacionesConstrucciones
   * GET /api/consulta-alfanumerico/calificaciones-construcciones
   */
  async consultarCalificacionesConstrucciones(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        npn: req.query.npn,
        limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      const result = await consultaAlfanumericoService.consultarCalificacionesConstrucciones(schema_name, filters);

      res.json(result);
    } catch (error) {
      console.error('Error en consultarCalificacionesConstrucciones:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Consultar ConstruccionesGenerales
   * GET /api/consulta-alfanumerico/construcciones-generales
   */
  async consultarConstruccionesGenerales(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      const result = await consultaAlfanumericoService.consultarConstruccionesGenerales(schema_name, filters);

      res.json(result);
    } catch (error) {
      console.error('Error en consultarConstruccionesGenerales:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Consultar Colindantes
   * GET /api/consulta-alfanumerico/colindantes
   */
  async consultarColindantes(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      const result = await consultaAlfanumericoService.consultarColindantes(schema_name, filters);

      res.json(result);
    } catch (error) {
      console.error('Error en consultarColindantes:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Consultar CartografiaInformacionGrafica
   * GET /api/consulta-alfanumerico/cartografia
   */
  async consultarCartografia(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      const result = await consultaAlfanumericoService.consultarCartografia(schema_name, filters);

      res.json(result);
    } catch (error) {
      console.error('Error en consultarCartografia:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }
}

module.exports = new ConsultaAlfanumericoController();

