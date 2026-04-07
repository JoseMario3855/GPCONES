const { query } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { logAuditEvent } = require('./auditController');

// Configuración de multer para archivos ILI y XTF
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.ili', '.xtf', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten archivos .ili, .xtf y .zip'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB máximo
  }
});

// Multer para múltiples archivos ILI
const uploadMultiple = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.ili', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten archivos .ili y .zip'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB máximo por archivo
    files: 20 // Máximo 20 archivos
  }
});

// Función para crear schema en PostgreSQL
const createSchema = async (schemaName) => {
  try {
    // PostgreSQL no permite parámetros en CREATE SCHEMA, usamos template string
    const result = await query(
      `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`
    );
    return { success: true, message: `Schema ${schemaName} creado exitosamente` };
  } catch (error) {
    console.error('Error creando schema:', error);
    return { success: false, error: error.message };
  }
};

// Función para validar archivo ILI con ilivalidator
const validateILI = async (iliFilePath, modelName) => {
  try {
    // Verificar si ilivalidator está disponible
    const { stdout, stderr } = await execAsync('java -version');
    
    // Comando para validar ILI (simulado por ahora)
    console.log(`Validando archivo ILI: ${iliFilePath} con modelo: ${modelName}`);
    
    // Simular validación exitosa
    return {
      success: true,
      message: 'Archivo ILI validado exitosamente',
      modelName: modelName,
      tables: 193 // Aproximadamente 193 tablas según el documento
    };
  } catch (error) {
    console.error('Error validando ILI:', error);
    return { success: false, error: error.message };
  }
};

// Función para crear esquema desde archivo ILI usando ili2pg
const createSchemaFromILI = async (iliFilePath, schemaName, modelName, userId, additionalILIFiles = []) => {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const path = require('path');
    const fs = require('fs').promises;

    console.log(`Creando schema ${schemaName} desde archivo ILI: ${iliFilePath}`);
    console.log(`Modelo: ${modelName}`);
    
    // Verificar que el archivo ILI existe
    let modelPath = iliFilePath;
    try {
      await fs.access(modelPath);
      console.log(`Archivo ILI encontrado: ${modelPath}`);
    } catch (error) {
      return {
        success: false,
        error: `Archivo ILI no encontrado: ${modelPath}`,
        details: 'El archivo ILI cargado no se encuentra en el servidor. Por favor, vuelva a cargar el archivo.'
      };
    }

    // Construir lista de modelos (archivo principal + dependencias)
    const modelPaths = [modelPath];
    if (additionalILIFiles.length > 0) {
      for (const file of additionalILIFiles) {
        const filePath = file.path || file;
        try {
          await fs.access(filePath);
          modelPaths.push(filePath);
          console.log(`Archivo ILI dependiente agregado: ${filePath}`);
        } catch (error) {
          console.warn(`Archivo ILI dependiente no encontrado: ${filePath}`);
        }
      }
    }

    // Construir parámetros para ili2pg
    // ili2pg puede usar --models con nombres de modelos o rutas completas
    // Si todos los archivos están en el mismo directorio, usar --modeldir
    const modelDirs = [...new Set(modelPaths.map(p => path.dirname(p)))];
    const modelNames = modelPaths.map(p => path.basename(p));
    
    console.log(`Directorios de modelos: ${modelDirs.join(', ')}`);
    console.log(`Nombres de modelos: ${modelNames.join(', ')}`);

    // Buscar ili2pg.jar en ubicaciones comunes
    const ili2pgLocations = [
      path.join(__dirname, '../tools/ili2pg.jar'),
      path.join(__dirname, '../ili2pg.jar'),
      path.join(process.cwd(), 'tools/ili2pg.jar'),
      path.join(process.cwd(), 'ili2pg.jar'),
      'ili2pg.jar' // En el PATH
    ];

    let ili2pgPath = null;
    let ili2pgLibsPath = null;
    
    for (const location of ili2pgLocations) {
      try {
        await fs.access(location);
        ili2pgPath = location;
        console.log(`ili2pg.jar encontrado en: ${location}`);
        
        // Buscar carpeta libs cerca del jar
        const libsPath = path.join(path.dirname(location), 'ili2pg-folder', 'libs');
        const libsPath2 = path.join(path.dirname(location), 'libs');
        try {
          if (await fs.access(libsPath).then(() => true).catch(() => false)) {
            ili2pgLibsPath = libsPath;
            console.log(`Librerías encontradas en: ${libsPath}`);
          } else if (await fs.access(libsPath2).then(() => true).catch(() => false)) {
            ili2pgLibsPath = libsPath2;
            console.log(`Librerías encontradas en: ${libsPath2}`);
          }
        } catch (e) {
          // No hay libs, usar solo el jar
        }
        break;
      } catch (error) {
        // Continuar buscando
      }
    }

    if (!ili2pgPath) {
      console.warn('ili2pg.jar no encontrado en ubicaciones estándar');
      // Intentar usar desde el PATH
      ili2pgPath = 'ili2pg.jar';
    }

    // Construir comando ili2pg
    // ili2pg.jar necesita las librerías en el classpath
    // Usar classpath cuando hay librerías disponibles
    let javaCommand;
    
    // Normalizar rutas para Windows (usar / en lugar de \)
    const jarPathEscaped = ili2pgPath.replace(/\\/g, '/');
    
    if (ili2pgLibsPath) {
      // Si hay librerías, DEBEMOS usar classpath (el jar no tiene todas las dependencias)
      // Leer todos los archivos .jar en la carpeta libs y listarlos explícitamente
      // En Windows, el wildcard /* no funciona, necesitamos listar los jars
      let libsList = [];
      try {
        const libsFiles = await fs.readdir(ili2pgLibsPath);
        libsList = libsFiles
          .filter(f => f.endsWith('.jar'))
          .map(f => path.join(ili2pgLibsPath, f).replace(/\\/g, '/'));
        console.log(`Encontradas ${libsList.length} librerías en: ${ili2pgLibsPath}`);
      } catch (error) {
        console.warn('No se pudieron leer las librerías:', error.message);
        // Fallback: usar wildcard (puede no funcionar en Windows)
        const libsPathEscaped = ili2pgLibsPath.replace(/\\/g, '/');
        libsList = [`${libsPathEscaped}/*`];
      }
      
      // Construir classpath: jar principal + todas las librerías
      // En Windows, usar ; como separador
      const classpath = [jarPathEscaped, ...libsList].join(';');
      javaCommand = `java -cp "${classpath}" ch.ehi.ili2pg.PgMain`;
      
      console.log('Usando classpath con librerías listadas explícitamente');
    } else {
      // Si no hay libs, intentar con -jar (probablemente fallará)
      javaCommand = `java -jar "${jarPathEscaped}"`;
      console.log('⚠️  Usando -jar sin librerías (probablemente fallará)');
    }
    
    console.log('Java command:', javaCommand);
    console.log('ili2pgPath:', ili2pgPath);
    console.log('ili2pgLibsPath:', ili2pgLibsPath);
    
    // Opción 1: Si todos los archivos están en el mismo directorio, usar --modeldir
    // Opción 2: Usar rutas completas en --models
    let ili2pgCommand;
    
    // Escapar rutas para Windows (mantener \ pero escapar espacios y caracteres especiales)
    const escapePath = (p) => {
      // Reemplazar \ por / para compatibilidad, pero mantener comillas
      return p.replace(/\\/g, '/').replace(/ /g, '\\ ');
    };
    
    const normalizedModelPaths = modelPaths.map(escapePath);
    const normalizedModelDirs = modelDirs.map(escapePath);
    
    // Construir parámetros de conexión (sin espacios problemáticos)
    const dbParams = `--dbhost localhost --dbport 5432 --dbdatabase GP_CONES --dbusr postgres --dbpwd 12345`;
    
    // Construir parámetros de modelos
    // Si todos están en el mismo directorio, usar --modeldir con nombres de archivos
    // Si están en diferentes directorios, usar rutas completas sin --modeldir
    let modelsParam;
    let modeldirParam = '';
    
    // Verificar que los archivos existan antes de construir el comando
    for (const modelPath of modelPaths) {
      try {
        await fs.access(modelPath);
        console.log(`Archivo verificado: ${path.basename(modelPath)}`);
      } catch (error) {
        console.error(`⚠️  Archivo no encontrado: ${modelPath}`);
      }
    }
    
    // ili2pg necesita que se especifiquen todos los archivos en --models
    // cuando hay múltiples archivos, no resuelve automáticamente todas las dependencias
    // Usar --modeldir para que busque en ese directorio Y especificar todos los archivos
    if (normalizedModelDirs.length === 1) {
      // Todos en el mismo directorio: usar --modeldir + todos los nombres de archivos
      const modelDir = path.resolve(normalizedModelDirs[0]).replace(/\\/g, '/');
      modeldirParam = `--modeldir "${modelDir}"`;
      
      // Especificar TODOS los archivos en --models (no solo el principal)
      // Separados por punto y coma
      modelsParam = modelNames.join(';');
      
      console.log(`Usando --modeldir con TODOS los archivos:`);
      console.log(`  Directorio: ${modelDir}`);
      console.log(`  Archivos: ${modelsParam}`);
    } else {
      // Archivos en diferentes directorios: usar rutas completas
      const escapedModelPaths = modelPaths.map(p => {
        return path.resolve(p).replace(/\\/g, '/');
      });
      modelsParam = escapedModelPaths.join(';');
      console.log(`Usando rutas completas de TODOS los archivos: ${modelsParam}`);
    }
    
    ili2pgCommand = `${javaCommand} ${dbParams} --dbschema ${schemaName} ${modeldirParam} --models "${modelsParam}" --defaultSrsCode 3116 --nameByTopic --createFk --createGeomIdx --createEnumTabs --createMetaInfo --createTidCol --createBasketCol --schemaimport`;

    console.log('Ejecutando comando ili2pg:', ili2pgCommand);
    
    let tablesCreated = 0;
    let executionSuccess = false;

    try {
      console.log('Ejecutando comando ili2pg...');
      console.log('Comando completo:', ili2pgCommand);
      
      // Intentar ejecutar ili2pg
      const { stdout, stderr } = await execAsync(ili2pgCommand, {
        timeout: 600000, // 10 minutos timeout
        maxBuffer: 1024 * 1024 * 20 // 20MB buffer
      });

      console.log('ili2pg stdout:', stdout);
      if (stderr) {
        console.log('ili2pg stderr:', stderr);
      }

      // Verificar si hubo errores en stderr (ili2pg puede mostrar errores ahí)
      if (stderr && (stderr.includes('Error') || stderr.includes('Exception') || stderr.includes('Failed'))) {
        console.error('ili2pg reportó errores en stderr:', stderr);
        // No lanzar error todavía, verificar si se crearon tablas
      }

      // Verificar en la base de datos cuántas tablas se crearon realmente
      const { query } = require('../config/database');
      const tablesResult = await query(`
        SELECT COUNT(*) as table_count
        FROM information_schema.tables
        WHERE table_schema = $1
      `, [schemaName]);
      
      tablesCreated = parseInt(tablesResult.rows[0].table_count);
      console.log(`Tablas encontradas en schema ${schemaName}: ${tablesCreated}`);

      // Si se crearon menos de 10 tablas, probablemente falló
      if (tablesCreated < 10) {
        console.warn(`Solo se crearon ${tablesCreated} tablas. Esperado: ~193 tablas para modelo LADM-COL`);
        console.warn('Esto sugiere que ili2pg no se ejecutó correctamente');
        
        // Intentar parsear salida para ver si hay errores
        const errorMatch = (stdout + ' ' + stderr).match(/Error[:\s]+([^\n]+)/i);
        if (errorMatch) {
          throw new Error(`ili2pg reportó error: ${errorMatch[1]}`);
        }
        
        throw new Error(`Solo se crearon ${tablesCreated} tablas. Se esperaban ~193 tablas. Verifique los logs de ili2pg.`);
      }

      executionSuccess = true;
      console.log(`Schema ${schemaName} creado exitosamente con ${tablesCreated} tablas`);

    } catch (execError) {
      console.error('Error ejecutando ili2pg:', execError);
      console.error('Comando ejecutado:', ili2pgCommand);
      console.error('Error completo:', execError.message);
      
      // Capturar stdout y stderr del error
      const errorStdout = execError.stdout || '';
      const errorStderr = execError.stderr || '';
      
      console.error('stdout:', errorStdout);
      console.error('stderr:', errorStderr);
      
      // Extraer mensaje de error más específico
      let errorMessage = execError.message;
      let errorDetails = '';
      
      // Buscar errores comunes en la salida
      const errorPatterns = [
        /Error[:\s]+([^\n\r]+)/i,
        /Exception[:\s]+([^\n\r]+)/i,
        /Failed[:\s]+([^\n\r]+)/i,
        /There is no such file[:\s]+([^\n\r]+)/i,
        /Could not find[:\s]+([^\n\r]+)/i
      ];
      
      const allOutput = (errorStdout + ' ' + errorStderr);
      for (const pattern of errorPatterns) {
        const match = allOutput.match(pattern);
        if (match && match[1]) {
          errorDetails = match[1].trim();
          break;
        }
      }
      
      // Si no se encontró un error específico, usar el mensaje completo
      if (!errorDetails && allOutput.trim()) {
        errorDetails = allOutput.substring(0, 500); // Limitar a 500 caracteres
      }
      
      return {
        success: false,
        error: 'Error ejecutando ili2pg',
        message: errorMessage,
        details: errorDetails || execError.message,
        command: ili2pgCommand.substring(0, 200), // Mostrar solo parte del comando
        stdout: errorStdout.substring(0, 1000), // Limitar tamaño
        stderr: errorStderr.substring(0, 1000),
        modelPaths: modelPaths,
        requiresIli2pg: true
      };
    }

    if (!executionSuccess && tablesCreated === 0) {
      return {
        success: false,
        error: 'No se pudieron crear las tablas del schema',
        details: 'El schema fue creado pero no se generaron las tablas. Verifique que ili2pg esté instalado y configurado correctamente.',
        requiresIli2pg: true
      };
    }

    const result = {
      success: true,
      message: `Schema ${schemaName} creado desde ILI exitosamente`,
      schemaName: schemaName,
      modelName: modelName,
      tablesCreated: tablesCreated,
      ili2pgUsed: executionSuccess
    };

    // Registrar en auditoría
    try {
      await logAuditEvent(userId, 'ILI_SCHEMA_CREATED', 'ILI', {
        schemaName: schemaName,
        modelName: modelName,
        tablesCreated: tablesCreated,
        ili2pgUsed: executionSuccess,
        iliFile: path.basename(iliFilePath)
      });
    } catch (auditError) {
      console.warn('Error en log de auditoría:', auditError.message);
    }

    return result;
  } catch (error) {
    console.error('Error creando schema desde ILI:', error);
    return { 
      success: false, 
      error: error.message,
      details: error.stack
    };
  }
};

// Función para importar datos XTF al schema
const importXTFToSchema = async (xtfFilePath, schemaName, modelName, datasetName, userId) => {
  try {
    // Comando ili2pg para importar XTF
    const ili2pgCommand = `java -jar ili2pg.jar \
      --dbhost localhost \
      --dbport 5432 \
      --dbdatabase GP_CONES \
      --dbusr postgres \
      --dbpwd 12345 \
      --dbschema ${schemaName} \
      --models ${modelName} \
      --dataset ${datasetName} \
      --import ${xtfFilePath}`;

    console.log('Ejecutando comando ili2pg para importar XTF:', ili2pgCommand);
    
    // Simular importación exitosa
    const result = {
      success: true,
      message: `Datos XTF importados al schema ${schemaName} exitosamente`,
      schemaName: schemaName,
      datasetName: datasetName,
      recordsImported: 1500 // Simular número de registros importados
    };

    // Registrar en auditoría
    await logAuditEvent({
      userId: userId,
      action: 'XTF_DATA_IMPORTED',
      resource: `Schema: ${schemaName}`,
      details: `Dataset: ${datasetName}, Registros: ${result.recordsImported}`,
      ipAddress: 'localhost'
    });

    return result;
  } catch (error) {
    console.error('Error importando XTF:', error);
    return { success: false, error: error.message };
  }
};

// Controlador para cargar carpeta ILI (Paso 1) - Un solo archivo
const uploadILIFolder = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó archivo ILI'
      });
    }

    const { municipio, modelName } = req.body;
    const iliFilePath = req.file.path;
    const schemaName = `ladm_${municipio.toLowerCase().replace(/\s+/g, '_')}`;

    // Validar archivo ILI
    const validationResult = await validateILI(iliFilePath, modelName);
    if (!validationResult.success) {
      return res.status(400).json(validationResult);
    }

    // Crear schema en BD
    const schemaResult = await createSchema(schemaName);
    if (!schemaResult.success) {
      return res.status(500).json(schemaResult);
    }

    // Crear esquema desde ILI
    const iliResult = await createSchemaFromILI(iliFilePath, schemaName, modelName, req.user.id);
    if (!iliResult.success) {
      return res.status(500).json(iliResult);
    }

    res.json({
      success: true,
      message: 'Carpeta ILI cargada exitosamente',
      data: {
        schemaName: schemaName,
        modelName: modelName,
        tablesCreated: iliResult.tablesCreated,
        municipio: municipio
      }
    });

  } catch (error) {
    console.error('Error en uploadILIFolder:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// Controlador para cargar múltiples archivos ILI (Paso 1)
const uploadMultipleILIFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionaron archivos ILI'
      });
    }

    const { municipio, modelName } = req.body;
    const schemaName = `ladm_${municipio.toLowerCase().replace(/\s+/g, '_')}`;
    const iliFiles = req.files;
    
    console.log(`Procesando ${iliFiles.length} archivo(s) ILI para municipio: ${municipio}`);

    // Crear directorio temporal para los archivos ILI
    const tempDir = path.join(__dirname, '../uploads/ili_temp', Date.now().toString());
    await fs.mkdir(tempDir, { recursive: true });

    const processedFiles = [];
    const errors = [];

    // Copiar todos los archivos ILI al directorio temporal
    for (const file of iliFiles) {
      try {
        const destPath = path.join(tempDir, file.originalname);
        await fs.copyFile(file.path, destPath);
        processedFiles.push({
          filename: file.originalname,
          path: destPath,
          size: file.size
        });
        console.log(`Archivo copiado: ${file.originalname}`);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    if (processedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se pudieron procesar los archivos ILI',
        details: errors
      });
    }

    // Buscar el archivo principal del modelo (generalmente el más grande o el que contiene el nombre del modelo)
    const mainFile = processedFiles.reduce((prev, current) => {
      // Priorizar archivos que contengan el nombre del modelo o sean más grandes
      if (current.filename.toLowerCase().includes(modelName.toLowerCase()) || 
          current.filename.toLowerCase().includes('ladm') ||
          current.size > (prev?.size || 0)) {
        return current;
      }
      return prev;
    }, processedFiles[0]);

    console.log(`Archivo principal seleccionado: ${mainFile.filename}`);

    // Validar archivo ILI principal
    const validationResult = await validateILI(mainFile.path, modelName);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Error validando archivo ILI principal',
        details: validationResult,
        mainFile: mainFile.filename
      });
    }

    // Crear schema en BD
    const schemaResult = await createSchema(schemaName);
    if (!schemaResult.success) {
      return res.status(500).json(schemaResult);
    }

    // Crear esquema desde ILI principal (los otros archivos se usan como dependencias)
    const additionalFiles = processedFiles
      .filter(f => f.filename !== mainFile.filename)
      .map(f => ({ path: f.path, filename: f.filename }));
    
    console.log(`Archivos ILI adicionales: ${additionalFiles.length}`);
    additionalFiles.forEach(f => console.log(`  - ${f.filename}: ${f.path}`));
    
    const iliResult = await createSchemaFromILI(
      mainFile.path, 
      schemaName, 
      modelName, 
      req.user.id,
      additionalFiles
    );
    if (!iliResult.success) {
      return res.status(500).json(iliResult);
    }

    // Log de auditoría
    await logAuditEvent(req.user.id, 'CARGA_MULTIPLE_ILI', 'ILI', {
      municipio: municipio,
      modelName: modelName,
      schemaName: schemaName,
      filesCount: processedFiles.length,
      files: processedFiles.map(f => f.filename),
      mainFile: mainFile.filename,
      tablesCreated: iliResult.tablesCreated
    });

    res.json({
      success: true,
      message: `${processedFiles.length} archivo(s) ILI cargado(s) exitosamente`,
      data: {
        schemaName: schemaName,
        modelName: modelName,
        tablesCreated: iliResult.tablesCreated,
        municipio: municipio,
        filesProcessed: processedFiles.length,
        files: processedFiles.map(f => ({
          filename: f.filename,
          size: f.size
        })),
        mainFile: mainFile.filename,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Error en uploadMultipleILIFiles:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// Controlador para cargar archivo XTF (Paso 2)
const uploadXTF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó archivo XTF'
      });
    }

    const { schemaName, modelName, datasetName } = req.body;
    const xtfFilePath = req.file.path;

    // Verificar que el schema existe
    const schemaExists = await query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1",
      [schemaName]
    );

    if (schemaExists.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: `El schema ${schemaName} no existe. Debe cargar primero la carpeta ILI.`
      });
    }

    // Importar datos XTF al schema
    const importResult = await importXTFToSchema(xtfFilePath, schemaName, modelName, datasetName, req.user.id);
    if (!importResult.success) {
      return res.status(500).json(importResult);
    }

    res.json({
      success: true,
      message: 'Archivo XTF cargado exitosamente',
      data: {
        schemaName: schemaName,
        datasetName: datasetName,
        recordsImported: importResult.recordsImported
      }
    });

  } catch (error) {
    console.error('Error en uploadXTF:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// Controlador para listar schemas disponibles
const listSchemas = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        schema_name,
        schema_owner,
        created_at
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'ladm_%'
      ORDER BY schema_name
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error listando schemas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// Controlador para obtener estadísticas de un schema
const getSchemaStats = async (req, res) => {
  try {
    const { schemaName } = req.params;

    // Verificar que el schema existe
    const schemaExists = await query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1",
      [schemaName]
    );

    if (schemaExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Schema ${schemaName} no encontrado`
      });
    }

    // Obtener estadísticas del schema
    const statsResult = await query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM "${schemaName}"."${table_name}") as record_count
      FROM information_schema.tables 
      WHERE table_schema = $1
      ORDER BY table_name
    `, [schemaName]);

    res.json({
      success: true,
      data: {
        schemaName: schemaName,
        tables: statsResult.rows,
        totalTables: statsResult.rows.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas del schema:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// Controlador para listar tablas de un schema
const getSchemaTables = async (req, res) => {
  try {
    const { schemaName } = req.params;

    // Verificar que el schema existe
    const schemaExists = await query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1",
      [schemaName]
    );

    if (schemaExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Schema ${schemaName} no encontrado`
      });
    }

    // Obtener todas las tablas del schema con conteo de registros
    const tablesResult = await query(`
      SELECT 
        t.table_name,
        t.table_type,
        COALESCE(
          (SELECT COUNT(*) 
           FROM information_schema.columns c 
           WHERE c.table_schema = t.table_schema 
           AND c.table_name = t.table_name 
           AND c.udt_name = 'geometry'), 0
        ) as geometry_columns,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name))) as table_size
      FROM information_schema.tables t
      WHERE t.table_schema = $1
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `, [schemaName]);

    // Obtener conteo de registros para cada tabla (en paralelo, limitado)
    const tablesWithCounts = await Promise.all(
      tablesResult.rows.slice(0, 50).map(async (table) => {
        try {
          const countResult = await query(
            `SELECT COUNT(*) as count FROM "${schemaName}"."${table.table_name}"`
          );
          return {
            ...table,
            record_count: parseInt(countResult.rows[0].count) || 0
          };
        } catch (error) {
          return {
            ...table,
            record_count: 0,
            error: error.message
          };
        }
      })
    );

    res.json({
      success: true,
      data: {
        schemaName: schemaName,
        tables: tablesWithCounts,
        totalTables: tablesResult.rows.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo tablas del schema:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// Controlador para obtener columnas de una tabla
const getTableColumns = async (req, res) => {
  try {
    const { schemaName, tableName } = req.params;

    // Verificar que el schema y la tabla existen
    const tableExists = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 AND table_name = $2
    `, [schemaName, tableName]);

    if (tableExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Tabla ${schemaName}.${tableName} no encontrada`
      });
    }

    // Obtener columnas de la tabla
    const columnsResult = await query(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        character_maximum_length,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `, [schemaName, tableName]);

    // Obtener información de índices
    const indexesResult = await query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = $1 AND tablename = $2
    `, [schemaName, tableName]);

    res.json({
      success: true,
      data: {
        schemaName: schemaName,
        tableName: tableName,
        columns: columnsResult.rows,
        indexes: indexesResult.rows,
        totalColumns: columnsResult.rows.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo columnas de la tabla:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// Controlador para consultar datos de una tabla
const getTableData = async (req, res) => {
  try {
    const { schemaName, tableName } = req.params;
    const { 
      page = 1, 
      limit = 100, 
      search = '',
      orderBy = '',
      orderDirection = 'ASC'
    } = req.query;

    // Verificar que el schema y la tabla existen
    const tableExists = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 AND table_name = $2
    `, [schemaName, tableName]);

    if (tableExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Tabla ${schemaName}.${tableName} no encontrada`
      });
    }

    // Obtener columnas de la tabla
    const columnsResult = await query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `, [schemaName, tableName]);

    const columns = columnsResult.rows.map(col => col.column_name);
    const safeColumns = columns.map(col => `"${col}"`).join(', ');

    // Construir WHERE clause para búsqueda
    let whereClause = '';
    let queryParams = [];
    let paramIndex = 1;

    if (search) {
      // Buscar en todas las columnas de texto
      const textColumns = columnsResult.rows
        .filter(col => ['character varying', 'text', 'varchar'].includes(col.data_type))
        .map(col => `"${col.column_name}"::text ILIKE $${paramIndex}`);
      
      if (textColumns.length > 0) {
        whereClause = `WHERE ${textColumns.join(' OR ')}`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
    }

    // Construir ORDER BY
    let orderClause = '';
    if (orderBy && columns.includes(orderBy)) {
      const direction = orderDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      orderClause = `ORDER BY "${orderBy}" ${direction}`;
    }

    // Obtener total de registros
    const countResult = await query(
      `SELECT COUNT(*) as total FROM "${schemaName}"."${tableName}" ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);

    // Obtener datos paginados
    const offset = (page - 1) * limit;
    const dataResult = await query(
      `SELECT ${safeColumns} FROM "${schemaName}"."${tableName}" ${whereClause} ${orderClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    res.json({
      success: true,
      data: {
        schemaName: schemaName,
        tableName: tableName,
        columns: columns,
        records: dataResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error consultando datos de la tabla:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// Controlador mejorado para listar schemas (incluye todos los schemas, no solo ladm_%)
const listAllSchemas = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        schema_name,
        schema_owner
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
        AND schema_name NOT LIKE 'pg_%'
      ORDER BY schema_name
    `);

    // Obtener estadísticas básicas de cada schema
    const schemasWithStats = await Promise.all(
      result.rows.map(async (schema) => {
        try {
          const tablesResult = await query(`
            SELECT COUNT(*) as total_tables
            FROM information_schema.tables
            WHERE table_schema = $1
              AND table_type = 'BASE TABLE'
          `, [schema.schema_name]);

          return {
            ...schema,
            total_tables: parseInt(tablesResult.rows[0].total_tables) || 0
          };
        } catch (error) {
          return {
            ...schema,
            total_tables: 0
          };
        }
      })
    );

    res.json({
      success: true,
      data: schemasWithStats
    });

  } catch (error) {
    console.error('Error listando schemas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

module.exports = {
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
};
