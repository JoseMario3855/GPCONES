const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/xtf');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/xml' || file.originalname.toLowerCase().endsWith('.xtf')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos XTF'), false);
    }
  }
});

// @route   POST /api/xtf/upload
// @desc    Subir archivo XTF
// @access  Private
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    const fileData = {
      filename: req.file.originalname,
      filepath: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      status: 'pending',
      progress: 0,
      created_by: req.user.id
    };

    const query = `
      INSERT INTO xtf_uploads (filename, filepath, size, mimetype, status, progress, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await db.query(query, [
      fileData.filename,
      fileData.filepath,
      fileData.size,
      fileData.mimetype,
      fileData.status,
      fileData.progress,
      fileData.created_by
    ]);

    res.json({
      success: true,
      message: 'Archivo XTF subido correctamente',
      file: result.rows[0]
    });

  } catch (err) {
    console.error('Error al subir archivo XTF:', err);
    res.status(500).json({ error: 'Error al subir archivo' });
  }
});

// @route   GET /api/xtf
// @desc    Obtener lista de archivos XTF
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const countQuery = 'SELECT COUNT(*) as total FROM xtf_uploads';
    const countResult = await db.query(countQuery);
    const total = parseInt(countResult.rows[0].total);

    const query = `
      SELECT 
        xt.*,
        u.username as created_by_name
      FROM xtf_uploads xt
      LEFT JOIN users u ON xt.created_by = u.id
      ORDER BY xt.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await db.query(query, [limit, offset]);

    res.json({
      success: true,
      files: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error('Error al obtener archivos XTF:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// @route   GET /api/xtf/:id
// @desc    Obtener archivo XTF específico
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        xt.*,
        u.username as created_by_name
      FROM xtf_uploads xt
      LEFT JOIN users u ON xt.created_by = u.id
      WHERE xt.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.json({
      success: true,
      file: result.rows[0]
    });

  } catch (err) {
    console.error('Error al obtener archivo XTF:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// @route   POST /api/xtf/:id/validate
// @desc    Validar archivo XTF
// @access  Private
router.post('/:id/validate', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener archivo
    const fileQuery = 'SELECT * FROM xtf_uploads WHERE id = $1';
    const fileResult = await db.query(fileQuery, [id]);

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const file = fileResult.rows[0];

    // Simular validación contra el modelo LADM-COL
    const validationResults = await simulateValidation(file);

    // Actualizar estado del archivo
    await db.query(
      'UPDATE xtf_uploads SET status = $1, validation_results = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [validationResults.valid ? 'validated' : 'error', JSON.stringify(validationResults), id]
    );

    res.json({
      success: true,
      message: 'Validación completada',
      ...validationResults
    });

  } catch (err) {
    console.error('Error en validación:', err);
    res.status(500).json({ error: 'Error en validación' });
  }
});

// @route   POST /api/xtf/:id/process
// @desc    Procesar archivo XTF
// @access  Private
router.post('/:id/process', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener archivo
    const fileQuery = 'SELECT * FROM xtf_uploads WHERE id = $1';
    const fileResult = await db.query(fileQuery, [id]);

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const file = fileResult.rows[0];

    // Simular procesamiento
    const processingResults = await simulateProcessing(file);

    // Actualizar estado del archivo
    await db.query(
      'UPDATE xtf_uploads SET status = $1, processing_results = $2, progress = 100, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['completed', JSON.stringify(processingResults), id]
    );

    res.json({
      success: true,
      message: 'Procesamiento completado',
      ...processingResults
    });

  } catch (err) {
    console.error('Error en procesamiento:', err);
    res.status(500).json({ error: 'Error en procesamiento' });
  }
});

// @route   DELETE /api/xtf/:id
// @desc    Eliminar archivo XTF
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener archivo
    const fileQuery = 'SELECT * FROM xtf_uploads WHERE id = $1';
    const fileResult = await db.query(fileQuery, [id]);

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const file = fileResult.rows[0];

    // Eliminar archivo físico
    if (fs.existsSync(file.filepath)) {
      fs.unlinkSync(file.filepath);
    }

    // Eliminar registro de la base de datos
    await db.query('DELETE FROM xtf_uploads WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Archivo eliminado correctamente'
    });

  } catch (err) {
    console.error('Error al eliminar archivo:', err);
    res.status(500).json({ error: 'Error al eliminar archivo' });
  }
});

// Función para simular validación
async function simulateValidation(file) {
  // Simular tiempo de validación
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Simular validación contra modelo LADM-COL
  const isValid = Math.random() > 0.2; // 80% de probabilidad de ser válido

  const errors = [];
  const warnings = [];

  if (!isValid) {
    errors.push({
      message: 'Error en la estructura del archivo XTF',
      location: 'Línea 15',
      severity: 'error'
    });
    errors.push({
      message: 'Geometría inválida en predio ID 12345',
      location: 'Línea 45',
      severity: 'error'
    });
  }

  if (Math.random() > 0.5) {
    warnings.push({
      message: 'Advertencia: Coordenadas fuera del rango esperado',
      location: 'Línea 23',
      severity: 'warning'
    });
  }

  return {
    valid: isValid,
    errors: errors,
    warnings: warnings,
    validation_time: Math.random() * 5 + 1, // 1-6 segundos
    model_used: 'LADM-COL Antioquia Extension',
    total_elements: Math.floor(Math.random() * 1000) + 100,
    valid_elements: Math.floor(Math.random() * 950) + 50
  };
}

// Función para simular procesamiento
async function simulateProcessing(file) {
  // Simular tiempo de procesamiento
  await new Promise(resolve => setTimeout(resolve, 3000));

  const prediosProcessed = Math.floor(Math.random() * 500) + 50;
  const construccionesProcessed = Math.floor(Math.random() * 300) + 20;
  const terrenosProcessed = Math.floor(Math.random() * 200) + 10;

  return {
    predios_processed: prediosProcessed,
    construcciones_processed: construccionesProcessed,
    terrenos_processed: terrenosProcessed,
    processing_time: Math.random() * 10 + 5, // 5-15 segundos
    success_rate: Math.random() * 20 + 80, // 80-100%
    errors_encountered: Math.floor(Math.random() * 10),
    warnings_generated: Math.floor(Math.random() * 20),
    database_tables_updated: ['predios', 'construcciones', 'terrenos', 'geometrias'],
    spatial_indexes_created: Math.floor(Math.random() * 5) + 1
  };
}

module.exports = router; 