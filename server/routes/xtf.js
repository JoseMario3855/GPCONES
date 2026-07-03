const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { 
  upload, 
  uploadXTF, 
  validateXTF, 
  getUploadStatus, 
  getUploadedData,
  approveUploadRecords,
  rejectUploadRecords,
  getSchemas,
  getSchemaStats,
  deleteSchema,
  integrateSchema,
  getIntegrationStats,
  cleanIntegration,
  getUnifiedPredios,
  exportXTF,
  uploadExcel,
  importExcel,
  excelToXTF,
  updateGeometriesGDB,
  uploadGDB,
  downloadGDB
} = require('../controllers/xtfController');
const { canExportXTF } = require('../middleware/auth');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Historia 5: Carga de archivos XTF
// POST /api/xtf/upload
router.post('/upload', 
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  upload.single('xtf_file'),
  uploadXTF
);

// Importar Excel de IGAC (R1/R2)
// POST /api/xtf/import-excel
router.post('/import-excel',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  uploadExcel.single('excel_file'),
  importExcel
);

// Convertir Excel consolidado de IGAC a XTF y descargar
// POST /api/xtf/excel-to-xtf
router.post('/excel-to-xtf',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  uploadExcel.single('excel_file'),
  excelToXTF
);

// Consolidar geometrías de terrenos desde capas GDB importadas
// POST /api/xtf/update-geometries-gdb
router.post('/update-geometries-gdb',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  uploadGDB.single('gdb_file'),
  updateGeometriesGDB
);

// Historia 6: Validación de modelos ILI
// POST /api/xtf/validate
router.post('/validate',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  upload.single('xtf_file'),
  validateXTF
);

// Historia 8: Visualización del proceso de carga
// GET /api/xtf/upload/:upload_id/status
router.get('/upload/:upload_id/status',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  getUploadStatus
);

// Historia 9: Revisión de datos cargados
// GET /api/xtf/upload/:upload_id/data
router.get('/upload/:upload_id/data',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  getUploadedData
);

// POST /api/xtf/upload/:upload_id/approve - Aprobar registros
router.post('/upload/:upload_id/approve',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  approveUploadRecords
);

// POST /api/xtf/upload/:upload_id/reject - Rechazar registros
router.post('/upload/:upload_id/reject',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  rejectUploadRecords
);

// Ruta para obtener información de archivos XTF cargados
// GET /api/xtf/uploads
router.get('/uploads',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  async (req, res) => {
    try {
      const db = require('../config/database');
      const { query } = db;
      const { page = 1, limit = 20, status } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = '';
      let queryParams = [limit, offset];
      let paramIndex = 3;

      if (status) {
        whereClause = `WHERE status = $${paramIndex}`;
        queryParams.splice(2, 0, status);
        paramIndex++;
      }

      // Obtener uploads con información del usuario
      const result = await query(`
        SELECT 
          xf.id,
          xf.original_filename as filename,
          xf.xtf_type as model_type,
          xf.status,
          xf.records_processed as entities_count,
          xf.file_size,
          xf.created_at as uploaded_at,
          xf.processed_at,
          u.username as uploaded_by,
          u.full_name as uploaded_by_name
        FROM xtf_files xf
        LEFT JOIN users u ON xf.uploaded_by = u.id
        ${whereClause}
        ORDER BY xf.created_at DESC
        LIMIT $1 OFFSET $2
      `, queryParams);

      // Contar total
      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM xtf_files
        ${whereClause || ''}
      `, status ? [status] : []);

      const uploads = result.rows.map(upload => {
        let modelType = 'igac';
        if (upload.model_type === 'Antioquia Extendido') {
          modelType = 'antioquia';
        } else if (upload.model_type === 'Modelo Interno V 1.0.1') {
          modelType = 'modelo-interno';
        }
        
        return {
          id: upload.id,
          filename: upload.filename,
          model_type: modelType,
          status: upload.status.toLowerCase(),
          uploaded_at: upload.uploaded_at,
          processed_at: upload.processed_at,
          uploaded_by: upload.uploaded_by,
          uploaded_by_name: upload.uploaded_by_name,
          entities_count: upload.entities_count || 0,
          file_size: `${(upload.file_size / 1024 / 1024).toFixed(2)}MB`
        };
      });

      res.json({
        success: true,
        data: uploads,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      });
    } catch (error) {
      console.error('Error obteniendo listado de uploads:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Ruta para obtener estadísticas de archivos XTF
// GET /api/xtf/stats
router.get('/stats',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  async (req, res) => {
    try {
      const db = require('../config/database');
      const { query } = db;
      
      // Estadísticas generales
      const totalUploadsResult = await query(`
        SELECT COUNT(*) as total
        FROM xtf_files
      `);
      
      const totalEntitiesResult = await query(`
        SELECT 
          COALESCE(SUM(records_imported), 0) as total_entities,
          COALESCE(SUM(records_processed), 0) as total_processed,
          COALESCE(SUM(records_errors), 0) as total_errors
        FROM xtf_files
        WHERE status = 'Procesado'
      `);
      
      // Estadísticas por modelo
      const byModelResult = await query(`
        SELECT 
          CASE 
            WHEN xtf_type = 'Antioquia Extendido' THEN 'antioquia'
            WHEN xtf_type = 'IGAC 1.0' THEN 'igac'
            WHEN xtf_type = 'Modelo Interno V 1.0.1' THEN 'modelo-interno'
            ELSE 'other'
          END as model,
          COUNT(*) as count
        FROM xtf_files
        GROUP BY xtf_type
      `);
      
      const byModel = {};
      byModelResult.rows.forEach(row => {
        byModel[row.model] = parseInt(row.count);
      });
      
      // Estadísticas por estado
      const byStatusResult = await query(`
        SELECT 
          LOWER(status) as status,
          COUNT(*) as count
        FROM xtf_files
        GROUP BY status
      `);
      
      const byStatus = {};
      byStatusResult.rows.forEach(row => {
        byStatus[row.status] = parseInt(row.count);
      });
      
      // Estadísticas por mes (últimos 12 meses)
      const byMonthResult = await query(`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*) as count
        FROM xtf_files
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month DESC
      `);
      
      const byMonth = {};
      byMonthResult.rows.forEach(row => {
        byMonth[row.month] = parseInt(row.count);
      });
      
      // Estadísticas de tamaño de archivos
      const fileSizeStatsResult = await query(`
        SELECT 
          COALESCE(SUM(file_size), 0) as total_size,
          COALESCE(AVG(file_size), 0) as avg_size,
          COALESCE(MAX(file_size), 0) as max_size,
          COALESCE(MIN(file_size), 0) as min_size
        FROM xtf_files
      `);
      
      const fileSizeStats = fileSizeStatsResult.rows[0];
      
      // Estadísticas de usuarios que han cargado archivos
      const byUserResult = await query(`
        SELECT 
          u.username,
          u.full_name,
          COUNT(xf.id) as upload_count,
          COALESCE(SUM(xf.records_imported), 0) as total_imported
        FROM xtf_files xf
        LEFT JOIN users u ON xf.uploaded_by = u.id
        GROUP BY u.id, u.username, u.full_name
        ORDER BY upload_count DESC
        LIMIT 10
      `);
      
      const stats = {
        total_uploads: parseInt(totalUploadsResult.rows[0].total),
        total_entities: parseInt(totalEntitiesResult.rows[0].total_entities),
        total_processed: parseInt(totalEntitiesResult.rows[0].total_processed),
        total_errors: parseInt(totalEntitiesResult.rows[0].total_errors),
        by_model: byModel,
        by_status: byStatus,
        by_month: byMonth,
        file_size: {
          total_mb: (parseFloat(fileSizeStats.total_size) / 1024 / 1024).toFixed(2),
          avg_mb: (parseFloat(fileSizeStats.avg_size) / 1024 / 1024).toFixed(2),
          max_mb: (parseFloat(fileSizeStats.max_size) / 1024 / 1024).toFixed(2),
          min_mb: (parseFloat(fileSizeStats.min_size) / 1024 / 1024).toFixed(2)
        },
        top_users: byUserResult.rows.map(row => ({
          username: row.username,
          full_name: row.full_name,
          upload_count: parseInt(row.upload_count),
          total_imported: parseInt(row.total_imported)
        }))
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas XTF:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Ruta para descargar archivo XTF original
// GET /api/xtf/upload/:upload_id/download
router.get('/upload/:upload_id/download',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  async (req, res) => {
    try {
      const { upload_id } = req.params;
      const db = require('../config/database');
      const { query } = db;
      const fs = require('fs').promises;
      const path = require('path');
      
      // Obtener información del archivo
      const fileResult = await query(`
        SELECT file_path, original_filename, filename
        FROM xtf_files
        WHERE id = $1
      `, [upload_id]);
      
      if (fileResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }
      
      const fileInfo = fileResult.rows[0];
      const filePath = fileInfo.file_path;
      
      // Verificar que el archivo existe
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'El archivo físico no existe en el servidor'
        });
      }
      
      // Obtener estadísticas del archivo
      const stats = await fs.stat(filePath);
      
      // Log de auditoría
      const { logAuditEvent } = require('../controllers/auditController');
      await logAuditEvent(req.user.id, 'DESCARGA_XTF', 'XTF', {
        upload_id: upload_id,
        filename: fileInfo.original_filename,
        file_size: stats.size
      });
      
      // Enviar archivo como descarga
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.original_filename}"`);
      res.setHeader('Content-Length', stats.size);
      
      const fileStream = require('fs').createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('Error descargando archivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Ruta para eliminar archivo XTF cargado
// DELETE /api/xtf/upload/:upload_id
router.delete('/upload/:upload_id',
  authorizeRole(['Administrador del Sistema']),
  async (req, res) => {
    const db = require('../config/database');
    const { query } = db;
    const fs = require('fs').promises;
    const { logAuditEvent } = require('../controllers/auditController');
    
    try {
      const { upload_id } = req.params;
      
      // Obtener información del archivo antes de eliminarlo
      const fileResult = await query(`
        SELECT file_path, original_filename, schema_name, status
        FROM xtf_files
        WHERE id = $1
      `, [upload_id]);
      
      if (fileResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }
      
      const fileInfo = fileResult.rows[0];
      
      // Iniciar transacción para eliminar datos relacionados
      await query('BEGIN');
      
      try {
        // Eliminar logs de procesamiento asociados (CASCADE debería hacerlo automáticamente)
        await query(`
          DELETE FROM xtf_processing_logs
          WHERE upload_id = $1
        `, [upload_id]);
        
        // Si hay un schema asociado, eliminarlo (opcional - solo si se desea)
        // Por ahora no eliminamos el schema para preservar datos
        
        // Eliminar el archivo físico si existe
        try {
          await fs.unlink(fileInfo.file_path);
        } catch (error) {
          console.warn(`No se pudo eliminar el archivo físico: ${error.message}`);
          // Continuar aunque no se pueda eliminar el archivo físico
        }
        
        // Eliminar registro de la base de datos
        await query(`
          DELETE FROM xtf_files
          WHERE id = $1
        `, [upload_id]);
        
        await query('COMMIT');
        
        // Log de auditoría
        await logAuditEvent(req.user.id, 'ELIMINACION_XTF', 'XTF', {
          upload_id: upload_id,
          filename: fileInfo.original_filename,
          schema_name: fileInfo.schema_name,
          status: fileInfo.status
        });
        
        res.json({
          success: true,
          message: `Archivo ${fileInfo.original_filename} eliminado exitosamente`
        });
        
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('Error eliminando archivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Ruta para reprocesar archivo XTF
// POST /api/xtf/upload/:upload_id/reprocess
router.post('/upload/:upload_id/reprocess',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  async (req, res) => {
    const db = require('../config/database');
    const { query } = db;
    const { uploadXTF } = require('../controllers/xtfController');
    const { logAuditEvent } = require('../controllers/auditController');
    const iliService = require('../services/iliService');
    const xtfIntegrationService = require('../services/xtfIntegrationService');
    
    try {
      const { upload_id } = req.params;
      const { model_type, schema_name } = req.body;
      
      // Obtener información del archivo
      const fileResult = await query(`
        SELECT file_path, original_filename, xtf_type, schema_name, status
        FROM xtf_files
        WHERE id = $1
      `, [upload_id]);
      
      if (fileResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }
      
      const fileInfo = fileResult.rows[0];
      
      // Verificar que el archivo físico existe
      const fs = require('fs').promises;
      try {
        await fs.access(fileInfo.file_path);
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'El archivo físico no existe en el servidor'
        });
      }
      
      // Actualizar estado a "Validando"
      await query(`
        UPDATE xtf_files
        SET status = 'Validando', processed_at = NULL, error_details = NULL
        WHERE id = $1
      `, [upload_id]);
      
      // Log de inicio de reprocesamiento
      await query(`
        INSERT INTO xtf_processing_logs (upload_id, log_level, message, details)
        VALUES ($1, 'INFO', 'Iniciando reprocesamiento del archivo XTF', '{}'::jsonb)
      `, [upload_id]);
      
      // Log de auditoría
      await logAuditEvent(req.user.id, 'REPROCESAMIENTO_XTF', 'XTF', {
        upload_id: upload_id,
        filename: fileInfo.original_filename,
        previous_status: fileInfo.status
      });
      
      // Reprocesar en segundo plano (asíncrono)
      // Por ahora, ejecutamos el procesamiento de forma síncrona
      // En producción, esto debería ir a una cola de trabajos
      (async () => {
        try {
          // Determinar tipo de modelo
          const finalModelType = model_type || (fileInfo.xtf_type === 'Antioquia Extendido' ? 'antioquia' : 'igac');
          const finalSchemaName = schema_name || fileInfo.schema_name || `xtf_${Date.now()}`;
          
          // Validar estructura XML
          const xmlValidation = await iliService.validateXMLStructure(fileInfo.file_path);
          if (!xmlValidation.isValid) {
            await query(`
              UPDATE xtf_files
              SET status = 'Error', error_details = $1
              WHERE id = $2
            `, [JSON.stringify(xmlValidation.errors), upload_id]);
            
            await query(`
              INSERT INTO xtf_processing_logs (upload_id, log_level, message, details)
              VALUES ($1, 'ERROR', 'Error en validación XML', $2::jsonb)
            `, [upload_id, JSON.stringify({ errors: xmlValidation.errors })]);
            return;
          }
          
          await query(`
            INSERT INTO xtf_processing_logs (upload_id, log_level, message)
            VALUES ($1, 'INFO', 'Validación XML completada exitosamente')
          `, [upload_id]);
          
          // Validar contra modelo ILI
          const iliValidation = await iliService.validateXTFAgainstModel(
            fileInfo.file_path,
            finalModelType
          );
          
          if (!iliValidation.isValid) {
            await query(`
              UPDATE xtf_files
              SET status = 'Error', error_details = $1
              WHERE id = $2
            `, [JSON.stringify(iliValidation.errors), upload_id]);
            
            await query(`
              INSERT INTO xtf_processing_logs (upload_id, log_level, message, details)
              VALUES ($1, 'ERROR', 'Error en validación ILI', $2::jsonb)
            `, [upload_id, JSON.stringify({ errors: iliValidation.errors })]);
            return;
          }
          
          await query(`
            INSERT INTO xtf_processing_logs (upload_id, log_level, message)
            VALUES ($1, 'INFO', 'Validación ILI completada exitosamente')
          `, [upload_id]);
          
          // Importar a PostgreSQL usando iliService
          const importResult = await iliService.convertXTFToPostgreSQL(
            fileInfo.file_path,
            finalModelType,
            finalSchemaName
          );
          
          await query(`
            INSERT INTO xtf_processing_logs (upload_id, log_level, message, details)
            VALUES ($1, 'INFO', 'Importación a PostgreSQL completada', $2::jsonb)
          `, [upload_id, JSON.stringify(importResult)]);
          
          // Integrar al schema principal
          const integrationResult = await xtfIntegrationService.integrateXTFToMainSchema(finalSchemaName);
          
          await query(`
            INSERT INTO xtf_processing_logs (upload_id, log_level, message, details)
            VALUES ($1, 'SUCCESS', 'Integración al schema principal completada', $2::jsonb)
          `, [upload_id, JSON.stringify(integrationResult)]);
          
          // Actualizar estado final
          await query(`
            UPDATE xtf_files
            SET status = 'Procesado',
                processed_at = CURRENT_TIMESTAMP,
                records_processed = $1,
                records_imported = $2,
                records_errors = $3,
                schema_name = $4
            WHERE id = $5
          `, [
            importResult.totalRecords || 0,
            integrationResult.importedRecords || 0,
            importResult.errorRecords || 0,
            finalSchemaName,
            upload_id
          ]);
          
        } catch (error) {
          console.error('Error en reprocesamiento asíncrono:', error);
          await query(`
            UPDATE xtf_files
            SET status = 'Error', error_details = $1
            WHERE id = $2
          `, [error.message, upload_id]);
          
          await query(`
            INSERT INTO xtf_processing_logs (upload_id, log_level, message, details)
            VALUES ($1, 'ERROR', 'Error durante reprocesamiento', $2::jsonb)
          `, [upload_id, JSON.stringify({ error: error.message })]);
        }
      })();
      
      res.json({
        success: true,
        message: `Archivo ${fileInfo.original_filename} en cola para reprocesamiento`,
        upload_id: upload_id
      });
      
    } catch (error) {
      console.error('Error reprocesando archivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Ruta para obtener logs de procesamiento
// GET /api/xtf/upload/:upload_id/logs
router.get('/upload/:upload_id/logs',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  async (req, res) => {
    try {
      const { upload_id } = req.params;
      const { page = 1, limit = 100, level } = req.query;
      const db = require('../config/database');
      const { query } = db;
      
      // Verificar que el upload existe
      const uploadCheck = await query(`
        SELECT id, original_filename
        FROM xtf_files
        WHERE id = $1
      `, [upload_id]);
      
      if (uploadCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Upload no encontrado'
        });
      }
      
      // Construir query de logs
      const offset = (page - 1) * limit;
      let whereConditions = ['upload_id = $1'];
      let queryParams = [upload_id];
      let paramIndex = 2;
      
      if (level) {
        whereConditions.push(`log_level = $${paramIndex}`);
        queryParams.push(level);
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // Obtener logs
      const logsResult = await query(`
        SELECT 
          id,
          log_level as level,
          message,
          details,
          created_at as timestamp
        FROM xtf_processing_logs
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...queryParams, limit, offset]);
      
      // Contar total
      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM xtf_processing_logs
        WHERE ${whereClause}
      `, queryParams);
      
      const logs = logsResult.rows.map(log => ({
        id: log.id,
        level: log.level,
        message: log.message,
        details: log.details,
        timestamp: log.timestamp
      }));
      
      res.json({
        success: true,
        data: logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        },
        upload_info: {
          id: upload_id,
          filename: uploadCheck.rows[0].original_filename
        }
      });
    } catch (error) {
      console.error('Error obteniendo logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

// Gestión de Schemas
// GET /api/xtf/schemas - Obtener lista de schemas
router.get('/schemas',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  getSchemas
);

// GET /api/xtf/schemas/:schema_name/download-gdb - Descargar GDB
router.get('/schemas/:schema_name/download-gdb',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  downloadGDB
);

// GET /api/xtf/schemas/:schema_name/stats - Obtener estadísticas de un schema
router.get('/schemas/:schema_name/stats',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  getSchemaStats
);

// DELETE /api/xtf/schemas/:schema_name - Eliminar schema
router.delete('/schemas/:schema_name',
  authorizeRole(['Administrador del Sistema']),
  deleteSchema
);

// Integración de Schemas
// POST /api/xtf/schemas/:schema_name/integrate - Integrar schema al principal
router.post('/schemas/:schema_name/integrate',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  integrateSchema
);

// GET /api/xtf/schemas/:schema_name/integration/stats - Estadísticas de integración
router.get('/schemas/:schema_name/integration/stats',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad']),
  getIntegrationStats
);

// DELETE /api/xtf/schemas/:schema_name/integration - Limpiar integración
router.delete('/schemas/:schema_name/integration',
  authorizeRole(['Administrador del Sistema']),
  cleanIntegration
);

// Predios Unificados
// GET /api/xtf/predios/unified - Obtener predios unificados (app + XTF)
router.get('/predios/unified',
  authorizeRole(['Administrador del Sistema', 'Revisión de Calidad', 'Reconocedor Predial']),
  getUnifiedPredios
);

// Exportar predios a formato XTF
// GET /api/xtf/export - Exportar predios a formato XTF
router.get('/export',
  canExportXTF,
  exportXTF
);

module.exports = router;
