const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { 
  getAuditLogs, 
  getAuditStats, 
  getAuditLogById 
} = require('../controllers/auditController');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Obtener logs de auditoría con filtros
// GET /api/audit/logs
router.get('/logs', 
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 20,
        user_id,
        action,
        module,
        date_from,
        date_to,
        is_critical
      } = req.query;

      const filters = {
        user_id: user_id || undefined,
        action: action || undefined,
        module: module || undefined,
        date_from: date_from || undefined,
        date_to: date_to || undefined,
        is_critical: is_critical !== undefined ? is_critical === 'true' : undefined
      };

      const result = await getAuditLogs(filters, parseInt(page), parseInt(limit));
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error obteniendo logs de auditoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Obtener estadísticas de auditoría
// GET /api/audit/stats
router.get('/stats',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  async (req, res) => {
    try {
      const stats = await getAuditStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas de auditoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Obtener log específico por ID
// GET /api/audit/logs/:id
router.get('/logs/:id',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const log = await getAuditLogById(id);
      
      res.json({
        success: true,
        data: log
      });
    } catch (error) {
      console.error('Error obteniendo log de auditoría:', error);
      
      if (error.message === 'Log de auditoría no encontrado') {
        return res.status(404).json({
          success: false,
          message: 'Log de auditoría no encontrado'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Exportar logs de auditoría a CSV
// GET /api/audit/export/csv
router.get('/export/csv',
  authorizeRole(['Administrador del Sistema']),
  async (req, res) => {
    try {
      const { 
        date_from,
        date_to,
        module,
        action
      } = req.query;

      const filters = {
        date_from: date_from || undefined,
        date_to: date_to || undefined,
        module: module || undefined,
        action: action || undefined
      };

      // Obtener todos los logs para exportar
      const result = await getAuditLogs(filters, 1, 10000);
      
      // TODO: Implementar exportación real a CSV
      res.json({
        success: false,
        message: 'Funcionalidad de exportación CSV no implementada aún'
      });
    } catch (error) {
      console.error('Error exportando logs de auditoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Exportar logs de auditoría a JSON
// GET /api/audit/export/json
router.get('/export/json',
  authorizeRole(['Administrador del Sistema']),
  async (req, res) => {
    try {
      const { 
        date_from,
        date_to,
        module,
        action
      } = req.query;

      const filters = {
        date_from: date_from || undefined,
        date_to: date_to || undefined,
        module: module || undefined,
        action: action || undefined
      };

      // Obtener todos los logs para exportar
      const result = await getAuditLogs(filters, 1, 10000);
      
      res.json({
        success: true,
        data: result.logs,
        export_info: {
          format: 'JSON',
          timestamp: new Date().toISOString(),
          total_records: result.pagination.total,
          filters_applied: filters
        }
      });
    } catch (error) {
      console.error('Error exportando logs de auditoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

module.exports = router;
