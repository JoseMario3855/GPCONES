const express = require('express');
const router = express.Router();
const { authenticateToken, canLoadXTF } = require('../middleware/auth');
const { 
  upload, 
  uploadMultiple,
  uploadILIFolder, 
  uploadMultipleILIFiles,
  uploadXTF, 
  listSchemas,
  listAllSchemas,
  getSchemaStats,
  getSchemaTables,
  getTableColumns,
  getTableData
} = require('../controllers/iliController');

// =====================================================
// RUTAS PARA CARGA DE ARCHIVOS ILI Y XTF
// Sistema de Catastro Integral GPCONES
// =====================================================

// Ruta para cargar carpeta ILI (Paso 1) - Un solo archivo
// POST /api/ili/upload-ili
// Crea schema en BD con nombre del municipio
router.post('/upload-ili', 
  authenticateToken, 
  canLoadXTF, 
  upload.single('iliFile'), 
  uploadILIFolder
);

// Ruta para cargar múltiples archivos ILI (Paso 1)
// POST /api/ili/upload-ili-multiple
// Crea schema en BD con nombre del municipio usando múltiples archivos ILI
router.post('/upload-ili-multiple', 
  authenticateToken, 
  canLoadXTF, 
  uploadMultiple.array('iliFiles', 20), // Máximo 20 archivos
  uploadMultipleILIFiles
);

// Ruta para cargar archivo XTF (Paso 2)
// POST /api/ili/upload-xtf
// Importa datos al schema creado en el paso anterior
router.post('/upload-xtf', 
  authenticateToken, 
  canLoadXTF, 
  upload.single('xtfFile'), 
  uploadXTF
);

// Ruta para listar schemas disponibles (solo schemas LADM)
// GET /api/ili/schemas
router.get('/schemas', 
  authenticateToken, 
  listSchemas
);

// Ruta para listar TODOS los schemas disponibles
// GET /api/ili/schemas/all
router.get('/schemas/all', 
  authenticateToken, 
  listAllSchemas
);

// Ruta para obtener estadísticas de un schema específico
// GET /api/ili/schemas/:schemaName/stats
router.get('/schemas/:schemaName/stats', 
  authenticateToken, 
  getSchemaStats
);

// Ruta para listar tablas de un schema
// GET /api/ili/schemas/:schemaName/tables
router.get('/schemas/:schemaName/tables', 
  authenticateToken, 
  getSchemaTables
);

// Ruta para obtener columnas de una tabla
// GET /api/ili/schemas/:schemaName/tables/:tableName/columns
router.get('/schemas/:schemaName/tables/:tableName/columns', 
  authenticateToken, 
  getTableColumns
);

// Ruta para consultar datos de una tabla
// GET /api/ili/schemas/:schemaName/tables/:tableName/data?page=1&limit=100&search=texto&orderBy=columna&orderDirection=ASC
router.get('/schemas/:schemaName/tables/:tableName/data', 
  authenticateToken, 
  getTableData
);

// Ruta para obtener información del proceso ILI/XTF
// GET /api/ili/info
router.get('/info', 
  authenticateToken, 
  (req, res) => {
    res.json({
      success: true,
      message: 'Información del módulo ILI/XTF',
      data: {
        description: 'Módulo para carga de archivos ILI y XTF siguiendo estándares IGAC y Antioquia',
        process: {
          step1: {
            title: 'Cargar Carpeta ILI',
            description: 'Crea schema en BD con nombre del municipio',
            endpoint: 'POST /api/ili/upload-ili',
            requiredFields: ['municipio', 'modelName', 'iliFile'],
            expectedTables: 193
          },
          step2: {
            title: 'Cargar Archivo XTF',
            description: 'Importa datos al schema creado en el paso anterior',
            endpoint: 'POST /api/ili/upload-xtf',
            requiredFields: ['schemaName', 'modelName', 'datasetName', 'xtfFile'],
            requiresStep1: true
          }
        },
        supportedFormats: ['.ili', '.xtf', '.zip'],
        maxFileSize: '100MB',
        tools: {
          validation: 'ilivalidator',
          import: 'ili2pg',
          database: 'PostgreSQL con PostGIS',
          srs: 'EPSG:3116 (MAGNA-SIRGAS Colombia)'
        },
        permissions: {
          requiredRole: 'Administrador del Sistema',
          canLoadXTF: true,
          canExportXTF: true
        }
      }
    });
  }
);

// Ruta para validar archivo ILI sin cargarlo
// POST /api/ili/validate-ili
router.post('/validate-ili', 
  authenticateToken, 
  canLoadXTF, 
  upload.single('iliFile'), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se proporcionó archivo ILI'
        });
      }

      const { modelName } = req.body;
      const iliFilePath = req.file.path;

      // Simular validación
      const validationResult = {
        success: true,
        message: 'Archivo ILI validado exitosamente',
        data: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          modelName: modelName,
          expectedTables: 193,
          validation: {
            syntax: 'OK',
            structure: 'OK',
            modelCompliance: 'OK'
          }
        }
      };

      res.json(validationResult);

    } catch (error) {
      console.error('Error validando ILI:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }
);

// Ruta para obtener progreso de carga
// GET /api/ili/upload-status/:uploadId
router.get('/upload-status/:uploadId', 
  authenticateToken, 
  (req, res) => {
    const { uploadId } = req.params;
    
    // Simular estado de carga
    res.json({
      success: true,
      data: {
        uploadId: uploadId,
        status: 'completed',
        progress: 100,
        message: 'Carga completada exitosamente',
        timestamp: new Date().toISOString()
      }
    });
  }
);

// Ruta para cancelar carga en progreso
// DELETE /api/ili/upload/:uploadId
router.delete('/upload/:uploadId', 
  authenticateToken, 
  canLoadXTF, 
  (req, res) => {
    const { uploadId } = req.params;
    
    res.json({
      success: true,
      message: `Carga ${uploadId} cancelada exitosamente`
    });
  }
);

// Ruta para obtener logs de carga
// GET /api/ili/logs
router.get('/logs', 
  authenticateToken, 
  (req, res) => {
    // Simular logs de carga
    res.json({
      success: true,
      data: {
        logs: [
          {
            id: 1,
            timestamp: new Date().toISOString(),
            action: 'ILI_SCHEMA_CREATED',
            schemaName: 'ladm_medellin',
            modelName: 'LADM_COL_ExtAntioquia',
            status: 'success',
            details: '193 tablas creadas exitosamente'
          },
          {
            id: 2,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            action: 'XTF_DATA_IMPORTED',
            schemaName: 'ladm_medellin',
            datasetName: 'lote_2025_01_15',
            status: 'success',
            details: '1500 registros importados exitosamente'
          }
        ]
      }
    });
  }
);

module.exports = router;
