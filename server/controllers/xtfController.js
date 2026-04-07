const db = require('../config/database');
const { logAuditEvent } = require('./auditController');
const iliService = require('../services/iliService');
const xtfIntegrationService = require('../services/xtfIntegrationService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const xml2js = require('xml2js');

// Función auxiliar para registrar logs de procesamiento XTF
const logProcessingEvent = async (uploadId, level, message, details = null) => {
  try {
    const { query } = db;
    await query(`
      INSERT INTO xtf_processing_logs (upload_id, log_level, message, details)
      VALUES ($1, $2, $3, $4)
    `, [uploadId, level, message, details ? JSON.stringify(details) : null]);
  } catch (error) {
    console.error('Error registrando log de procesamiento:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
};

// Configuración de multer para archivos XTF
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/xtf');
    fs.mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `xtf-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xtf', '.xml'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .xtf y .xml'));
    }
  }
});

// Historia 5: Carga de XTF
const uploadXTF = async (req, res) => {
  let uploadId = null;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo XTF'
      });
    }

    const { model_type = 'antioquia', schema_name } = req.body;
    const { query } = db;
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    // Generar nombre de schema si no se proporciona
    const finalSchemaName = schema_name || `xtf_${Date.now()}`;

    // Registrar archivo en xtf_files con estado inicial
    const xtfType = model_type === 'antioquia' ? 'Antioquia Extendido' : 'IGAC 1.0';
    const uploadRecord = await query(`
      INSERT INTO xtf_files (
        filename, original_filename, file_size, file_path, 
        xtf_type, model_version, status, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at
    `, [
      path.basename(filePath),
      fileName,
      fileSize,
      filePath,
      xtfType,
      '2.0',
      'Validando',
      req.user.id
    ]);

    uploadId = uploadRecord.rows[0].id;

    // Log de auditoría
    await logAuditEvent(req.user.id, 'CARGA_XTF', 'XTF', {
      filename: fileName,
      model_type: model_type,
      file_size: fileSize,
      schema_name: finalSchemaName,
      upload_id: uploadId
    });

    // Actualizar estado a Validando
    await query(`
      UPDATE xtf_files SET status = 'Validando' WHERE id = $1
    `, [uploadId]);

    // Validar estructura XML básica
    const xmlValidation = await iliService.validateXMLStructure(filePath);
    if (!xmlValidation.isValid) {
      // Actualizar estado a Error
      await query(`
        UPDATE xtf_files 
        SET status = 'Error', 
            validation_errors = $2,
            error_details = $3
        WHERE id = $1
      `, [uploadId, xmlValidation.errors, xmlValidation.errors.join('; ')]);
      
      return res.status(400).json({
        success: false,
        message: 'Archivo XML no válido',
        errors: xmlValidation.errors,
        upload_id: uploadId
      });
    }

    // Validar contra modelo ILI
    const validationResult = await iliService.validateXTFAgainstModel(filePath, model_type);
    
    if (!validationResult.isValid) {
      // Actualizar estado a Error
      await query(`
        UPDATE xtf_files 
        SET status = 'Error', 
            validation_errors = $2,
            error_details = $3
        WHERE id = $1
      `, [
        uploadId, 
        validationResult.errors || [],
        validationResult.errors?.join('; ') || 'Validación ILI fallida'
      ]);
      
      return res.status(400).json({
        success: false,
        message: 'Archivo XTF no válido según modelo ILI',
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        upload_id: uploadId
      });
    }

    // Actualizar estado a Validado
    await query(`
      UPDATE xtf_files 
      SET status = 'Validado',
          validation_errors = $2
      WHERE id = $1
    `, [uploadId, validationResult.warnings || []]);

    // Crear schema si no existe
    const schemaResult = await iliService.createSchemaFromModel(model_type, finalSchemaName);
    if (!schemaResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Error creando schema de base de datos',
        error: schemaResult.error
      });
    }

    // Convertir XTF a PostgreSQL
    const conversionResult = await iliService.convertXTFToPostgreSQL(filePath, model_type, finalSchemaName);
    
    // Integración automática al schema principal
    const integrationResult = await xtfIntegrationService.integrateXTFToMainSchema(finalSchemaName, {
      userId: req.user.id,
      filename: fileName,
      model_type: model_type
    });
    
    // Actualizar registro con resultados del procesamiento
    const totalImported = integrationResult.total_imported || conversionResult.totalEntities || 0;
    await query(`
      UPDATE xtf_files 
      SET status = 'Procesado',
          records_processed = $2,
          records_imported = $3,
          records_errors = $4,
          processed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [
      uploadId,
      validationResult.totalEntities || 0,
      totalImported,
      (validationResult.totalEntities || 0) - totalImported
    ]);
    
    // Log de auditoría exitoso
    await logAuditEvent(req.user.id, 'CARGA_XTF_EXITOSA', 'XTF', {
      filename: fileName,
      model_type: model_type,
      entities_imported: conversionResult.totalEntities,
      schema_name: finalSchemaName,
      integration_success: integrationResult.success,
      integration_total: integrationResult.total_imported,
      upload_id: uploadId
    });

    res.json({
      success: true,
      message: 'Archivo XTF cargado e integrado exitosamente',
      data: {
        upload_id: uploadId,
        filename: fileName,
        model_type: model_type,
        file_size: fileSize,
        entities_imported: conversionResult.totalEntities,
        processing_time: conversionResult.processingTime,
        schema_name: finalSchemaName,
        validation: {
          total_entities: validationResult.totalEntities,
          valid_entities: validationResult.validEntities,
          warnings: validationResult.warnings,
          errors: validationResult.errors
        },
        integration: {
          success: integrationResult.success,
          total_imported: integrationResult.total_imported,
          predios: integrationResult.integration?.predios || 0,
          terrenos: integrationResult.integration?.terrenos || 0,
          construcciones: integrationResult.integration?.construcciones || 0
        },
        details: conversionResult.details
      }
    });

  } catch (error) {
    console.error('Error en uploadXTF:', error);
    
    // Actualizar estado a Error si tenemos uploadId
    if (uploadId) {
      try {
        const { query } = db;
        await query(`
          UPDATE xtf_files 
          SET status = 'Error',
              error_details = $2
          WHERE id = $1
        `, [uploadId, error.message]);
      } catch (updateError) {
        console.error('Error actualizando estado del upload:', updateError);
      }
    }
    
    // Log de auditoría de error
    await logAuditEvent(req.user.id, 'ERROR_CARGA_XTF', 'XTF', {
      filename: req.file?.originalname,
      error: error.message,
      upload_id: uploadId
    });

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      upload_id: uploadId
    });
  }
};

// Historia 6: Validación de modelo ILI
const validateXTF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo XTF'
      });
    }

    const { model_type = 'antioquia' } = req.body;
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    console.log(`Iniciando validación XTF: ${fileName}, modelo: ${model_type}`);

    // Log de auditoría
    try {
      await logAuditEvent(req.user.id, 'VALIDACION_XTF', 'XTF', {
        filename: fileName,
        model_type: model_type
      });
    } catch (auditError) {
      console.warn('Error en log de auditoría (continuando):', auditError.message);
    }

    // Validación de estructura XML
    let xmlValidation;
    try {
      xmlValidation = await iliService.validateXMLStructure(filePath);
    } catch (error) {
      console.error('Error en validación XML:', error);
      return res.status(400).json({
        success: false,
        message: 'Error validando estructura XML del archivo',
        error: error.message
      });
    }

    if (!xmlValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Archivo XML no válido',
        errors: xmlValidation.errors
      });
    }

    // Obtener información del archivo XTF (con manejo de errores)
    let xtfInfo = {
      datasets: 0,
      totalObjects: 0,
      objectTypes: []
    };
    
    try {
      xtfInfo = await iliService.getXTFInfo(filePath);
    } catch (error) {
      console.warn('Error obteniendo información XTF (continuando con validación):', error.message);
      // Continuar con la validación aunque no se pueda obtener la info completa
    }

    // Validación contra modelo ILI (con manejo de errores mejorado)
    let iliValidation;
    try {
      iliValidation = await iliService.validateXTFAgainstModel(filePath, model_type);
    } catch (error) {
      console.error('Error en validación ILI, usando validación básica:', error);
      // Si falla la validación ILI, usar validación básica
      try {
        iliValidation = await iliService.basicXTFValidation(filePath);
        iliValidation.warnings = iliValidation.warnings || [];
        iliValidation.warnings.push('Validación ILI completa no disponible, usando validación básica');
      } catch (basicError) {
        console.error('Error incluso en validación básica:', basicError);
        return res.status(500).json({
          success: false,
          message: 'Error en validación del archivo XTF',
          error: basicError.message
        });
      }
    }
    
    // Asegurar que iliValidation tenga todas las propiedades necesarias
    if (!iliValidation) {
      iliValidation = await iliService.basicXTFValidation(filePath);
    }

    iliValidation.totalEntities = iliValidation.totalEntities || 0;
    iliValidation.validEntities = iliValidation.validEntities || iliValidation.totalEntities;
    iliValidation.warnings = iliValidation.warnings || [];
    iliValidation.errors = iliValidation.errors || [];
    iliValidation.details = iliValidation.details || [];
    
    // Log de auditoría de validación
    try {
      await logAuditEvent(req.user.id, 'VALIDACION_XTF_COMPLETADA', 'XTF', {
        filename: fileName,
        model_type: model_type,
        validation_result: iliValidation.isValid ? 'EXITOSA' : 'FALLIDA',
        total_entities: iliValidation.totalEntities
      });
    } catch (auditError) {
      console.warn('Error en log de auditoría (continuando):', auditError.message);
    }

    res.json({
      success: true,
      message: 'Validación completada',
      data: {
        filename: fileName,
        model_type: model_type,
        is_valid: iliValidation.isValid !== false, // Por defecto true si no está definido
        total_entities: iliValidation.totalEntities,
        valid_entities: iliValidation.validEntities,
        warnings: iliValidation.warnings,
        errors: iliValidation.errors,
        details: iliValidation.details,
        file_info: {
          datasets: xtfInfo.datasets || 0,
          total_objects: xtfInfo.totalObjects || 0,
          object_types: xtfInfo.objectTypes || []
        }
      }
    });

  } catch (error) {
    console.error('Error en validateXTF:', error);
    console.error('Stack trace:', error.stack);
    
    try {
      await logAuditEvent(req.user.id, 'ERROR_VALIDACION_XTF', 'XTF', {
        filename: req.file?.originalname,
        error: error.message,
        stack: error.stack
      });
    } catch (auditError) {
      console.error('Error en log de auditoría de error:', auditError);
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor durante la validación',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Historia 8: Visualización del proceso de carga
const getUploadStatus = async (req, res) => {
  try {
    const { upload_id } = req.params;
    const { query } = db;
    
    // Consultar registro de upload
    const result = await query(`
      SELECT 
        id,
        filename,
        original_filename,
        file_size,
        xtf_type,
        model_version,
        status,
        records_processed,
        records_imported,
        records_errors,
        validation_errors,
        error_details,
        created_at,
        processed_at,
        uploaded_by,
        (SELECT username FROM users WHERE id = uploaded_by) as uploaded_by_username
      FROM xtf_files
      WHERE id = $1
    `, [upload_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Upload no encontrado'
      });
    }

    const upload = result.rows[0];
    
    // Calcular progreso basado en el estado
    let progress = 0;
    if (upload.status === 'Cargado') progress = 10;
    else if (upload.status === 'Validando') progress = 30;
    else if (upload.status === 'Validado') progress = 50;
    else if (upload.status === 'Procesado') progress = 100;
    else if (upload.status === 'Error') progress = 0;

    // Calcular tiempo de procesamiento
    let processingTime = null;
    if (upload.processed_at && upload.created_at) {
      const start = new Date(upload.created_at);
      const end = new Date(upload.processed_at);
      const seconds = (end - start) / 1000;
      processingTime = seconds < 60 
        ? `${seconds.toFixed(1)}s` 
        : `${(seconds / 60).toFixed(1)}min`;
    }

    res.json({
      success: true,
      data: {
        upload_id: upload.id,
        filename: upload.original_filename,
        status: upload.status,
        progress: progress,
        entities_processed: upload.records_processed || 0,
        entities_imported: upload.records_imported || 0,
        errors: upload.records_errors || 0,
        warnings: upload.validation_errors?.length || 0,
        processing_time: processingTime,
        file_size: upload.file_size,
        xtf_type: upload.xtf_type,
        created_at: upload.created_at,
        processed_at: upload.processed_at,
        uploaded_by: upload.uploaded_by_username,
        error_details: upload.error_details,
        validation_errors: upload.validation_errors
      }
    });
    
  } catch (error) {
    console.error('Error en getUploadStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Historia 9: Revisión de datos cargados
const getUploadedData = async (req, res) => {
  try {
    const { upload_id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { query } = db;
    
    // Obtener información del upload
    const uploadResult = await query(`
      SELECT schema_name, status, records_imported
      FROM xtf_files
      WHERE id = $1
    `, [upload_id]);

    if (uploadResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Upload no encontrado'
      });
    }

    const upload = uploadResult.rows[0];
    
    if (upload.status !== 'Procesado') {
      return res.status(400).json({
        success: false,
        message: 'El upload aún no ha sido procesado completamente',
        current_status: upload.status
      });
    }

    // Buscar schema_name en los logs de auditoría si no está en xtf_files
    // Por ahora usamos el schema pattern estándar
    const schemaPattern = `xtf_%`;
    
    // Obtener datos desde la vista unificada o desde el schema específico
    // Por simplicidad, obtenemos desde predios_unified filtrando por source
    const offset = (page - 1) * limit;
    
    const recordsResult = await query(`
      SELECT 
        source,
        id,
        npn,
        municipio,
        zona,
        sector,
        numero_ficha,
        area_hectareas,
        tipo_predio,
        uso_predio,
        propietario_nombre,
        estado,
        created_at
      FROM predios_unified
      WHERE source = 'xtf'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM predios_unified
      WHERE source = 'xtf'
    `);

    const totalRecords = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: {
        upload_id: upload_id,
        total_records: totalRecords,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalRecords / limit),
        records: recordsResult.rows.map(record => ({
          id: record.id,
          npn: record.npn,
          tipo: 'predio',
          estado: record.estado || 'pendiente_revision',
          datos: {
            municipio: record.municipio,
            zona: record.zona,
            sector: record.sector,
            area: record.area_hectareas,
            tipo_predio: record.tipo_predio,
            uso_predio: record.uso_predio,
            propietario: record.propietario_nombre
          },
          created_at: record.created_at
        }))
      }
    });
    
  } catch (error) {
    console.error('Error en getUploadedData:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Aprobar registros de un upload
const approveUploadRecords = async (req, res) => {
  try {
    const { upload_id } = req.params;
    const { record_ids, all = false } = req.body;
    const { query } = db;

    // Verificar que el upload existe y está procesado
    const uploadResult = await query(`
      SELECT status FROM xtf_files WHERE id = $1
    `, [upload_id]);

    if (uploadResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Upload no encontrado'
      });
    }

    if (uploadResult.rows[0].status !== 'Procesado') {
      return res.status(400).json({
        success: false,
        message: 'El upload debe estar procesado para aprobar registros'
      });
    }

    let whereClause = "WHERE source = 'xtf'";
    const queryParams = [];
    let paramIndex = 1;

    if (all) {
      // Aprobar todos los registros XTF
    } else if (record_ids && record_ids.length > 0) {
      // Aprobar registros específicos
      whereClause += ` AND id = ANY($${paramIndex}::uuid[])`;
      queryParams.push(record_ids);
      paramIndex++;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar record_ids o establecer all=true'
      });
    }

    // Actualizar estado de los registros
    const updateResult = await query(`
      UPDATE predios
      SET estado = 'Aprobado',
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $${paramIndex}
      WHERE id IN (
        SELECT id FROM predios_unified ${whereClause}
      )
      RETURNING id, npn, estado
    `, [...queryParams, req.user.id]);

    // Registrar en auditoría
    for (const record of updateResult.rows) {
      await logAuditEvent(req.user.id, 'APROBACION_REGISTRO_XTF', 'XTF', {
        upload_id: upload_id,
        record_id: record.id,
        npn: record.npn,
        action: 'aprobado'
      });
    }

    res.json({
      success: true,
      message: `${updateResult.rows.length} registro(s) aprobado(s) exitosamente`,
      data: {
        upload_id: upload_id,
        records_approved: updateResult.rows.length,
        records: updateResult.rows
      }
    });

  } catch (error) {
    console.error('Error aprobando registros:', error);
    res.status(500).json({
      success: false,
      message: 'Error aprobando registros',
      error: error.message
    });
  }
};

// Rechazar registros de un upload
const rejectUploadRecords = async (req, res) => {
  try {
    const { upload_id } = req.params;
    const { record_ids, all = false, observaciones } = req.body;
    const { query } = db;

    if (!observaciones || observaciones.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Las observaciones son obligatorias al rechazar registros'
      });
    }

    // Verificar que el upload existe y está procesado
    const uploadResult = await query(`
      SELECT status FROM xtf_files WHERE id = $1
    `, [upload_id]);

    if (uploadResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Upload no encontrado'
      });
    }

    if (uploadResult.rows[0].status !== 'Procesado') {
      return res.status(400).json({
        success: false,
        message: 'El upload debe estar procesado para rechazar registros'
      });
    }

    let whereClause = "WHERE source = 'xtf'";
    const queryParams = [];
    let paramIndex = 1;

    if (all) {
      // Rechazar todos los registros XTF
    } else if (record_ids && record_ids.length > 0) {
      // Rechazar registros específicos
      whereClause += ` AND id = ANY($${paramIndex}::uuid[])`;
      queryParams.push(record_ids);
      paramIndex++;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar record_ids o establecer all=true'
      });
    }

    // Actualizar estado de los registros
    // Nota: Si la tabla predios no tiene campo observaciones, las guardamos solo en auditoría
    const updateResult = await query(`
      UPDATE predios
      SET estado = 'Rechazado',
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $${paramIndex}
      WHERE id IN (
        SELECT id FROM predios_unified ${whereClause}
      )
      RETURNING id, npn, estado
    `, [...queryParams, req.user.id]);

    // Registrar en auditoría
    for (const record of updateResult.rows) {
      await logAuditEvent(req.user.id, 'RECHAZO_REGISTRO_XTF', 'XTF', {
        upload_id: upload_id,
        record_id: record.id,
        npn: record.npn,
        action: 'rechazado',
        observaciones: observaciones
      });
    }

    res.json({
      success: true,
      message: `${updateResult.rows.length} registro(s) rechazado(s) exitosamente`,
      data: {
        upload_id: upload_id,
        records_rejected: updateResult.rows.length,
        records: updateResult.rows,
        observaciones: observaciones
      }
    });

  } catch (error) {
    console.error('Error rechazando registros:', error);
    res.status(500).json({
      success: false,
      message: 'Error rechazando registros',
      error: error.message
    });
  }
};

// Exportar predios a formato XTF
const exportXTF = async (req, res) => {
  try {
    const { query } = db;
    const { model_type = 'antioquia', schema_name = 'public', dataset, only_validated = false } = req.query;
    
    // Verificar permisos - solo Admin siempre puede exportar, Revisión solo validados
    const userRole = req.user.role;
    if (userRole === 'Revisión de Calidad' && !only_validated) {
      return res.status(403).json({
        success: false,
        message: 'Revisión de Calidad solo puede exportar predios validados. Use only_validated=true'
      });
    }

    // Crear directorio de exportación si no existe
    const exportDir = path.join(__dirname, '../uploads/exports');
    await fs.mkdir(exportDir, { recursive: true });

    // Generar nombre de archivo único
    const timestamp = Date.now();
    const outputFileName = `export_${schema_name}_${timestamp}.xtf`;
    const outputFilePath = path.join(exportDir, outputFileName);

    // Opciones de exportación
    const exportOptions = {
      dataset: dataset || `export_${timestamp}`,
      basket: null
    };

    // Exportar usando iliService
    const exportResult = await iliService.exportPostgreSQLToXTF(
      model_type,
      schema_name,
      outputFilePath,
      exportOptions
    );

    // Log de auditoría
    await logAuditEvent(req.user.id, 'EXPORTACION_XTF', 'XTF', {
      filename: outputFileName,
      model_type: model_type,
      schema_name: schema_name,
      file_size: exportResult.fileSize,
      only_validated: only_validated
    });

    // Enviar archivo como respuesta
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${outputFileName}"`);
    
    const fileContent = await fs.readFile(outputFilePath);
    res.send(fileContent);

  } catch (error) {
    console.error('Error exportando XTF:', error);
    res.status(500).json({
      success: false,
      message: 'Error exportando archivo XTF',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  uploadXTF,
  validateXTF,
  getUploadStatus,
  getUploadedData,
  approveUploadRecords,
  rejectUploadRecords,
  exportXTF,
  
  // Obtener lista de schemas disponibles
  getSchemas: async (req, res) => {
    try {
      const { query } = db;
      
      // Obtener schemas de la base de datos
      const result = await query(`
        SELECT 
          schema_name,
          schema_owner,
          created_at
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'xtf_%' OR schema_name LIKE 'ili_%'
        ORDER BY schema_name DESC
      `);

      // Obtener estadísticas de cada schema
      const schemasWithStats = await Promise.all(
        result.rows.map(async (schema) => {
          try {
            const statsResult = await query(`
              SELECT 
                COUNT(*) as total_tables,
                SUM(n_tup_ins) as total_records
              FROM pg_stat_user_tables 
              WHERE schemaname = $1
            `, [schema.schema_name]);

            return {
              ...schema,
              total_tables: statsResult.rows[0]?.total_tables || 0,
              total_records: statsResult.rows[0]?.total_records || 0
            };
          } catch (error) {
            return {
              ...schema,
              total_tables: 0,
              total_records: 0
            };
          }
        })
      );

      res.json({
        success: true,
        data: schemasWithStats
      });

    } catch (error) {
      console.error('Error obteniendo schemas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo schemas',
        error: error.message
      });
    }
  },

  // Obtener estadísticas de un schema específico
  getSchemaStats: async (req, res) => {
    try {
      const { schema_name } = req.params;
      const { query } = db;

      // Verificar que el schema existe
      const schemaCheck = await query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = $1
      `, [schema_name]);

      if (schemaCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Schema no encontrado'
        });
      }

      // Obtener estadísticas detalladas del schema
      const statsResult = await query(`
        SELECT 
          t.table_name,
          t.table_type,
          COALESCE(s.n_tup_ins, 0) as total_records,
          COALESCE(s.n_tup_upd, 0) as updated_records,
          COALESCE(s.n_tup_del, 0) as deleted_records,
          COALESCE(s.n_live_tup, 0) as live_records
        FROM information_schema.tables t
        LEFT JOIN pg_stat_user_tables s ON t.table_name = s.relname AND s.schemaname = $1
        WHERE t.table_schema = $1
        ORDER BY t.table_name
      `, [schema_name]);

      // Obtener información de columnas espaciales
      const spatialResult = await query(`
        SELECT 
          c.table_name,
          c.column_name,
          c.data_type,
          c.udt_name
        FROM information_schema.columns c
        WHERE c.table_schema = $1 
        AND (c.udt_name = 'geometry' OR c.data_type = 'USER-DEFINED')
        ORDER BY c.table_name, c.column_name
      `, [schema_name]);

      // Agrupar información espacial por tabla
      const spatialByTable = {};
      spatialResult.rows.forEach(row => {
        if (!spatialByTable[row.table_name]) {
          spatialByTable[row.table_name] = [];
        }
        spatialByTable[row.table_name].push({
          column_name: row.column_name,
          data_type: row.data_type,
          udt_name: row.udt_name
        });
      });

      // Combinar estadísticas con información espacial
      const detailedStats = statsResult.rows.map(table => ({
        ...table,
        spatial_columns: spatialByTable[table.table_name] || []
      }));

      // Calcular totales
      const totals = {
        total_tables: detailedStats.length,
        total_records: detailedStats.reduce((sum, table) => sum + parseInt(table.total_records), 0),
        total_spatial_tables: detailedStats.filter(table => table.spatial_columns.length > 0).length
      };

      res.json({
        success: true,
        data: {
          schema_name,
          totals,
          tables: detailedStats
        }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas del schema:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas del schema',
        error: error.message
      });
    }
  },

  // Eliminar schema
  deleteSchema: async (req, res) => {
    try {
      const { schema_name } = req.params;
      const { query } = db;

      // Verificar que el schema existe
      const schemaCheck = await query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = $1
      `, [schema_name]);

      if (schemaCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Schema no encontrado'
        });
      }

      // Limpiar integración antes de eliminar schema
      try {
        await xtfIntegrationService.cleanIntegration(schema_name);
      } catch (integrationError) {
        console.warn('Error limpiando integración:', integrationError.message);
      }

      // Eliminar schema (CASCADE para eliminar todas las tablas)
      await query(`DROP SCHEMA IF EXISTS "${schema_name}" CASCADE`);

      // Log de auditoría
      await logAuditEvent(req.user.id, 'ELIMINACION_SCHEMA', 'XTF', {
        schema_name: schema_name
      });

      res.json({
        success: true,
        message: `Schema ${schema_name} eliminado exitosamente`
      });

    } catch (error) {
      console.error('Error eliminando schema:', error);
      res.status(500).json({
        success: false,
        message: 'Error eliminando schema',
        error: error.message
      });
    }
  },

  // Integrar manualmente un schema XTF al schema principal
  integrateSchema: async (req, res) => {
    try {
      const { schema_name } = req.params;
      
      // Verificar que el schema existe
      const schemaExists = await xtfIntegrationService.checkSchemaExists(schema_name);
      if (!schemaExists) {
        return res.status(404).json({
          success: false,
          message: 'Schema XTF no encontrado'
        });
      }

      // Realizar integración
      const integrationResult = await xtfIntegrationService.integrateXTFToMainSchema(schema_name, {
        userId: req.user.id,
        manual_integration: true
      });

      res.json({
        success: true,
        message: 'Integración completada exitosamente',
        data: integrationResult
      });

    } catch (error) {
      console.error('Error en integración manual:', error);
      res.status(500).json({
        success: false,
        message: 'Error en integración',
        error: error.message
      });
    }
  },

  // Obtener estadísticas de integración
  getIntegrationStats: async (req, res) => {
    try {
      const { schema_name } = req.params;
      
      const stats = await xtfIntegrationService.getIntegrationStats(schema_name);
      
      res.json({
        success: true,
        data: {
          schema_name,
          stats
        }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de integración:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas',
        error: error.message
      });
    }
  },

  // Limpiar integración de un schema
  cleanIntegration: async (req, res) => {
    try {
      const { schema_name } = req.params;
      
      const result = await xtfIntegrationService.cleanIntegration(schema_name);
      
      // Log de auditoría
      await logAuditEvent(req.user.id, 'LIMPIEZA_INTEGRACION_XTF', 'XTF', {
        schema_name: schema_name
      });

      res.json({
        success: true,
        message: 'Integración limpiada exitosamente',
        data: result
      });

    } catch (error) {
      console.error('Error limpiando integración:', error);
      res.status(500).json({
        success: false,
        message: 'Error limpiando integración',
        error: error.message
      });
    }
  },

  // Obtener predios unificados (aplicación + XTF)
  getUnifiedPredios: async (req, res) => {
    try {
      const { query } = db;
      const { page = 1, limit = 20, source } = req.query;
      
      let whereClause = '';
      let queryParams = [];
      let paramIndex = 1;

      if (source) {
        whereClause = `WHERE source = $${paramIndex}`;
        queryParams.push(source);
        paramIndex++;
      }

      const offset = (page - 1) * limit;

      // Obtener predios unificados
      const result = await query(`
        SELECT 
          source,
          id,
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
        FROM predios_unified
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...queryParams, limit, offset]);

      // Contar total
      const countResult = await query(`
        SELECT COUNT(*) as total 
        FROM predios_unified
        ${whereClause}
      `, queryParams);

      res.json({
        success: true,
        data: {
          predios: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(countResult.rows[0].total),
            pages: Math.ceil(countResult.rows[0].total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Error obteniendo predios unificados:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo predios unificados',
        error: error.message
      });
    }
  },

  // Exportar predios a formato XTF
  exportXTF: async (req, res) => {
    try {
      const { query } = db;
      const { model_type = 'antioquia', estado, municipio, only_validated = false } = req.query;
      
      // Verificar permisos según rol
      const userRole = req.user.role;
      
      // Construir query de predios según permisos
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // Revisión de Calidad solo puede exportar predios validados/aprobados
      if (userRole === 'Revisión de Calidad' || only_validated === 'true') {
        whereConditions.push(`estado IN ($${paramIndex}, $${paramIndex + 1})`);
        queryParams.push('Aprobado', 'En Revisión');
        paramIndex += 2;
      } else if (estado) {
        whereConditions.push(`estado = $${paramIndex}`);
        queryParams.push(estado);
        paramIndex++;
      }

      if (municipio) {
        whereConditions.push(`municipio = $${paramIndex}`);
        queryParams.push(municipio);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Obtener predios para exportar
      const prediosResult = await query(`
        SELECT 
          id,
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
          ST_AsGeoJSON(geometry)::json as geometry
        FROM predios
        ${whereClause}
        ORDER BY npn
      `, queryParams);

      if (prediosResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron predios para exportar con los criterios especificados'
        });
      }

      // Crear directorio de exportación si no existe
      const exportDir = path.join(__dirname, '../uploads/exports');
      await fs.mkdir(exportDir, { recursive: true });

      // Generar nombre de archivo
      const timestamp = Date.now();
      const filename = `export_predios_${timestamp}.xtf`;
      const outputPath = path.join(exportDir, filename);

      // Para exportar desde PostgreSQL, necesitamos usar un schema temporal o el schema public
      // Por ahora exportamos desde public schema usando ili2pg
      const exportOptions = {
        dataset: `export_${timestamp}`,
        basket: null
      };

      // Exportar a XTF usando el servicio ILI (desde schema public)
      const exportResult = await iliService.exportPostgreSQLToXTF(
        model_type,
        'public',
        outputPath,
        exportOptions
      );

      // Log de auditoría
      await logAuditEvent(req.user.id, 'EXPORT_XTF', 'XTF', {
        filename: filename,
        model_type: model_type,
        total_predios: exportResult.totalPredios,
        file_size: exportResult.fileSize,
        estado_filter: estado,
        municipio_filter: municipio,
        only_validated: only_validated
      });

      // Enviar archivo como descarga
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const fileContent = await fs.readFile(outputPath, 'utf8');
      res.send(fileContent);

      // Opcional: eliminar archivo después de enviarlo (o mantenerlo para auditoría)
      // await fs.unlink(outputPath);

    } catch (error) {
      console.error('Error exportando XTF:', error);
      res.status(500).json({
        success: false,
        message: 'Error exportando archivo XTF',
        error: error.message
      });
    }
  }
};
