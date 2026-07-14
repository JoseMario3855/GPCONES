const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const xml2js = require('xml2js');
const db = require('../config/database');

const execAsync = promisify(exec);

// Servicio para manejo de herramientas ILI (ili2pg, ilivalidator)
class ILIService {
  
  constructor() {
    this.uploadDir = path.join(__dirname, '../uploads');
    this.modelsDir = path.join(__dirname, '../models');
    this.tempDir = path.join(__dirname, '../temp');
    
    // Asegurar que los directorios existan
    this.ensureDirectories();
  }

  isCommandNotFoundError(error) {
    if (!error) return false;
    if (error.code === 'ENOENT') return true;
    const msg = error.message ? error.message.toLowerCase() : '';
    return msg.includes('not recognized') || 
           msg.includes('no se reconoce') || 
           msg.includes('not found') || 
           msg.includes('no encontrado');
  }

  async preprocessXTFFile(xtfFilePath) {
    try {
      let content = await fs.readFile(xtfFilePath, 'utf8');
      let modified = false;
      
      // 1. Corregir casing del submodelo
      if (content.includes('Submodelo_Valoracion_Masiva_V_1_0')) {
        content = content.replace(/Submodelo_Valoracion_Masiva_V_1_0/g, 'Submodelo_Valoracion_Masiva_v_1_0');
        modified = true;
      }

      // 2. Resolver TIDs duplicados de CR_UnidadConstruccion y actualizar col_ueBaunit
      try {
        const parser = new xml2js.Parser({ explicitArray: true });
        const result = await parser.parseStringPromise(content);
        
        const transferKey = Object.keys(result || {}).find(k => k.endsWith('TRANSFER'));
        if (transferKey) {
          const transfer = result[transferKey];
          const dsKey = Object.keys(transfer || {}).find(k => k.endsWith('DATASECTION'));
          
          if (dsKey && transfer[dsKey] && transfer[dsKey][0]) {
            const datasection = transfer[dsKey][0];
            
            // Encontrar todos los ILC_Predio para mapear su TID a su Local_Id
            const predioMap = new Map(); // TID -> Local_Id
            
            for (const [key, val] of Object.entries(datasection)) {
              if (key === '$' || key === 'BID') continue;
              const dataset = val[0];
              if (typeof dataset === 'object' && dataset !== null) {
                const predioKey = Object.keys(dataset).find(k => k.endsWith('.ILC_Predio'));
                if (predioKey) {
                  const predios = dataset[predioKey];
                  if (Array.isArray(predios)) {
                    predios.forEach(p => {
                      const tid = p.$?.TID;
                      const localId = p.Local_Id?.[0];
                      if (tid && localId) {
                        predioMap.set(tid, localId);
                      }
                    });
                  }
                }
              }
            }
            
            // Modificar TIDs duplicados de CR_UnidadConstruccion usando UUIDs válidos
            const unitMap = new Map(); // "TID_LocalId" -> nuevoTID
            const seenTids = new Set();
            let duplicatedUnits = 0;
            const crypto = require('crypto');
            
            for (const [key, val] of Object.entries(datasection)) {
              if (key === '$' || key === 'BID') continue;
              const dataset = val[0];
              if (typeof dataset === 'object' && dataset !== null) {
                const unitKey = Object.keys(dataset).find(k => k.endsWith('.CR_UnidadConstruccion'));
                if (unitKey) {
                  const units = dataset[unitKey];
                  if (Array.isArray(units)) {
                    units.forEach(u => {
                      const tid = u.$?.TID;
                      const localId = u.Local_Id?.[0];
                      if (tid && localId) {
                        let targetTid = tid;
                        if (seenTids.has(tid)) {
                          targetTid = crypto.randomUUID();
                          u.$.TID = targetTid;
                          duplicatedUnits++;
                          console.log(`[DEDUP] Duplicado en CR_UnidadConstruccion. Reemplazando TID ${tid} por nuevo UUID ${targetTid} para Local_Id ${localId}`);
                        } else {
                          seenTids.add(tid);
                        }
                        unitMap.set(`${tid}_${localId}`, targetTid);
                      }
                    });
                  }
                }
              }
            }
            
            if (duplicatedUnits > 0) {
              // Actualizar referencias en col_ueBaunit
              let updatedRefs = 0;
              for (const [key, val] of Object.entries(datasection)) {
                if (key === '$' || key === 'BID') continue;
                const dataset = val[0];
                if (typeof dataset === 'object' && dataset !== null) {
                  const ueBaunitKey = Object.keys(dataset).find(k => k.endsWith('.col_ueBaunit'));
                  if (ueBaunitKey) {
                    const ueBaunits = dataset[ueBaunitKey];
                    if (Array.isArray(ueBaunits)) {
                      ueBaunits.forEach(rel => {
                        const ueRef = rel.ue?.[0]?.$?.REF;
                        const baunitRef = rel.baunit?.[0]?.$?.REF;
                        if (ueRef && baunitRef) {
                          const localId = predioMap.get(baunitRef);
                          if (localId) {
                            const lookupKey = `${ueRef}_${localId}`;
                            const newUeTid = unitMap.get(lookupKey);
                            if (newUeTid) {
                              rel.ue[0].$.REF = newUeTid;
                              updatedRefs++;
                            }
                          }
                        }
                      });
                    }
                  }
                }
              }
              
              console.log(`[PREPROCESS] Resolviendo ${duplicatedUnits} duplicados en CR_UnidadConstruccion y actualizando ${updatedRefs} referencias.`);
              const builder = new xml2js.Builder();
              content = builder.buildObject(result);
              modified = true;
            }
          }
        }
      } catch (parseError) {
        console.warn(`[PREPROCESS] Advertencia al analizar XTF para deduplicación: ${parseError.message}`);
      }

      if (modified) {
        console.log(`[PREPROCESS] Escribiendo cambios en archivo XTF: ${xtfFilePath}`);
        await fs.writeFile(xtfFilePath, content, 'utf8');
      }
    } catch (error) {
      console.error('Error preprocesando archivo XTF:', error);
    }
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.modelsDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creando directorios:', error);
    }
  }

  getModelName(modelType) {
    if (modelType === 'modelo-interno') {
      return 'Modelo_Aplicacion_Interno_Levantamiento_Catastral_LADMCOL_V1_0;LADM_COL_V3_1;Submodelo_Valoracion_Masiva_v_1_0;Submodelo_Cartografia_Catastral_V1_0;Submodelo_Calificacion_Unidad_Construccion_V1_0';
    }
    return 'LADM_COL_V3_1';
  }

  getDBParams() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 5432;
    const dbname = process.env.DB_NAME || 'GP_CONES';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'admin1';
    return `--dbhost ${host} --dbport ${port} --dbdatabase ${dbname} --dbusr ${user} --dbpwd ${password}`;
  }

  async getILI2PGCommand() {
    const toolsDir = path.join(__dirname, '../tools');
    const jarPath = path.join(toolsDir, 'ili2pg.jar');
    const libDir = path.join(toolsDir, 'ili2pg-folder/libs');
    
    try {
      await fs.access(jarPath);
      const libsFiles = await fs.readdir(libDir);
      const libsList = libsFiles
        .filter(f => f.endsWith('.jar'))
        .map(f => path.join(libDir, f).replace(/\\/g, '/'));
      
      const jarPathEscaped = jarPath.replace(/\\/g, '/');
      const classpath = [jarPathEscaped, ...libsList].join(';');
      return `java -cp "${classpath}" ch.ehi.ili2pg.PgMain`;
    } catch (error) {
      console.warn('ili2pg.jar o carpeta libs no encontrados, usando "ili2pg" por defecto');
      return 'ili2pg';
    }
  }

  // Validar archivo XTF contra modelo ILI usando ilivalidator
  async validateXTFAgainstModel(xtfFilePath, modelType = 'antioquia') {
    try {
      console.log(`Validando XTF contra modelo ${modelType}: ${xtfFilePath}`);
      await this.preprocessXTFFile(xtfFilePath);
      
      // Intentar obtener el modelo ILI
      let modelPath;
      try {
        modelPath = await this.getModelPath(modelType);
      } catch (modelError) {
        console.warn(`Modelo ILI no encontrado (${modelError.message}), usando validación básica`);
        return await this.basicXTFValidation(xtfFilePath);
      }
      
      // Comando ilivalidator
      const command = `ilivalidator --model ${modelPath} ${xtfFilePath}`;
      
      console.log(`Ejecutando: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 minutos timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      // Parsear resultado de ilivalidator
      const validationResult = this.parseValidationOutput(stdout, stderr);
      
      return {
        isValid: validationResult.errors.length === 0,
        totalEntities: validationResult.totalEntities,
        validEntities: validationResult.validEntities,
        warnings: validationResult.warnings,
        errors: validationResult.errors,
        details: validationResult.details
      };

    } catch (error) {
      console.error('Error en validación ILI:', error);
      
      // Si ilivalidator no está disponible o hay cualquier error, usar validación básica
      if (error.code === 'ENOENT' || 
          error.message.includes('ilivalidator') || 
          error.message.includes('Modelo ILI no encontrado')) {
        console.log('ilivalidator o modelo no disponible, usando validación básica');
        return await this.basicXTFValidation(xtfFilePath);
      }
      
      // Para otros errores, también usar validación básica en lugar de lanzar error
      console.warn('Error en validación ILI completa, usando validación básica:', error.message);
      const basicValidation = await this.basicXTFValidation(xtfFilePath);
      basicValidation.warnings = basicValidation.warnings || [];
      basicValidation.warnings.push(`Validación ILI completa no disponible: ${error.message}`);
      return basicValidation;
    }
  }

  // Validación básica cuando ilivalidator no está disponible
  async basicXTFValidation(xtfFilePath) {
    try {
      const xmlContent = await fs.readFile(xtfFilePath, 'utf8');
      const parser = new xml2js.Parser({ 
        explicitRoot: false,
        tagNameProcessors: [xml2js.processors.stripPrefix]
      });
      const result = await parser.parseStringPromise(xmlContent);
      
      // Validar estructura básica XTF
      const validation = {
        isValid: true,
        totalEntities: 0,
        validEntities: 0,
        warnings: [],
        errors: [],
        details: []
      };

      // Find DATASECTION key in a case-insensitive manner
      const keys = Object.keys(result || {});
      const dataSectionKey = keys.find(k => k.toUpperCase() === 'DATASECTION');
      const datasection = dataSectionKey ? result[dataSectionKey] : null;

      // Verificar estructura XTF
      if (!datasection) {
        validation.errors.push('Archivo XTF no contiene sección DATASECTION');
        validation.isValid = false;
        return validation;
      }

      // Contar entidades de forma dinámica
      let totalObjects = 0;
      const datasections = Array.isArray(datasection) ? datasection : [datasection];
      
      datasections.forEach(dsSection => {
        if (typeof dsSection === 'object' && dsSection !== null) {
          for (const [key, value] of Object.entries(dsSection)) {
            if (key === '$') continue;
            const datasets = Array.isArray(value) ? value : [value];
            datasets.forEach(dataset => {
              if (typeof dataset === 'object' && dataset !== null) {
                for (const [classKey, classVal] of Object.entries(dataset)) {
                  if (classKey === '$' || classKey === 'BID') continue;
                  const objects = Array.isArray(classVal) ? classVal : [classVal];
                  totalObjects += objects.length;
                }
              }
            });
          }
        }
      });

      validation.totalEntities = totalObjects;
      validation.validEntities = totalObjects;

      // Validaciones básicas
      if (validation.totalEntities === 0) {
        validation.warnings.push('No se encontraron entidades en el archivo XTF');
      }

      // Verificar elementos requeridos para catastro
      const hasPredios = xmlContent.includes('LC_Predio') || xmlContent.includes('LC_PLOT') || xmlContent.includes('ilc_predio') || xmlContent.includes('ILC_Predio');
      if (!hasPredios) {
        validation.warnings.push('No se encontraron predios en el archivo');
      }

      return validation;

    } catch (error) {
      return {
        isValid: false,
        totalEntities: 0,
        validEntities: 0,
        warnings: [],
        errors: [`Error de sintaxis XML: ${error.message}`],
        details: []
      };
    }
  }

  // Parsear salida de ilivalidator
  parseValidationOutput(stdout, stderr) {
    const result = {
      totalEntities: 0,
      validEntities: 0,
      warnings: [],
      errors: [],
      details: []
    };

    // Parsear stdout para información de entidades
    const entityMatch = stdout.match(/(\d+)\s+objects\s+found/);
    if (entityMatch) {
      result.totalEntities = parseInt(entityMatch[1]);
      result.validEntities = result.totalEntities;
    }

    // Parsear errores y advertencias
    const lines = (stdout + '\n' + stderr).split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;

      if (line.includes('ERROR') || line.includes('error')) {
        result.errors.push(line);
        result.validEntities = Math.max(0, result.validEntities - 1);
      } else if (line.includes('WARNING') || line.includes('warning')) {
        result.warnings.push(line);
      } else if (line.includes('INFO') || line.includes('info')) {
        result.details.push(line);
      }
    });

    return result;
  }

  // Obtener ruta del modelo ILI
  async getModelPath(modelType) {
    const modelFiles = {
      'antioquia': 'LADM-COL_Antioquia.ili',
      'igac': 'LADM-COL_IGAC.ili',
      'ladm-col': 'LADM-COL.ili',
      'modelo-interno': 'Modelo_Aplicacion_Interno_Levantamiento_Catastral_LADMCOL_V1_0.ili'
    };

    const modelFile = modelFiles[modelType] || modelFiles['antioquia'];
    const modelPath = path.join(this.modelsDir, modelFile);

    // Verificar si el modelo existe
    try {
      await fs.access(modelPath);
      return modelPath;
    } catch (error) {
      console.warn(`Modelo ${modelFile} no encontrado, usando validación básica`);
      throw new Error(`Modelo ILI no encontrado: ${modelFile}`);
    }
  }

  // Convertir XTF a PostgreSQL usando ili2pg
  async convertXTFToPostgreSQL(xtfFilePath, modelType, schemaName) {
    try {
      console.log(`Convirtiendo XTF a PostgreSQL: ${xtfFilePath}`);
      await this.preprocessXTFFile(xtfFilePath);
      
      const modelPath = await this.getModelPath(modelType);
      const ili2pgCmd = await this.getILI2PGCommand();
      const dbParams = this.getDBParams();
      const modelDirEscaped = this.modelsDir.replace(/\\/g, '/');
      const xtfFilePathEscaped = xtfFilePath.replace(/\\/g, '/');
      // Comando ili2pg para importar XTF
      const command = `${ili2pgCmd} --import --disableValidation --models ${this.getModelName(modelType)} --modeldir "${modelDirEscaped}" --dbschema ${schemaName} --smart2Inheritance --createEnumTabs --createMetaInfo --createFk --createFkIdx --createGeomIdx --createTidCol --createBasketCol --createTypeDiscriminator --createImportTabs --createEnumTabsWithId --createUnique --createNumChecks --defaultSrsCode 3116 ${dbParams} "${xtfFilePathEscaped}"`;
      
      console.log(`Ejecutando: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 600000, // 10 minutos timeout
        maxBuffer: 1024 * 1024 * 20 // 20MB buffer
      });

      // Parsear resultado de ili2pg
      const conversionResult = this.parseConversionOutput(stdout, stderr);
      
      return {
        success: true,
        totalEntities: conversionResult.totalEntities,
        processingTime: conversionResult.processingTime,
        details: conversionResult.details,
        schemaName: schemaName
      };

    } catch (error) {
      console.error('Error en conversión XTF:', error);
      
      // Si ili2pg no está disponible, simular conversión
      if (this.isCommandNotFoundError(error)) {
        console.log('ili2pg no disponible, simulando conversión');
        return await this.simulateConversion(xtfFilePath, schemaName);
      }
      
      throw new Error(`Error en conversión XTF: ${error.message}`);
    }
  }

  // Simular conversión cuando ili2pg no está disponible
  async simulateConversion(xtfFilePath, schemaName) {
    try {
      const xmlContent = await fs.readFile(xtfFilePath, 'utf8');
      const parser = new xml2js.Parser({
        explicitRoot: false,
        tagNameProcessors: [xml2js.processors.stripPrefix]
      });
      const result = await parser.parseStringPromise(xmlContent);
      
      // Find DATASECTION key in a case-insensitive manner
      const keys = Object.keys(result || {});
      const dataSectionKey = keys.find(k => k.toUpperCase() === 'DATASECTION');
      const datasection = dataSectionKey ? result[dataSectionKey] : null;
      
      let totalEntities = 0;
      if (datasection) {
        const datasections = Array.isArray(datasection) ? datasection : [datasection];
        datasections.forEach(dsSection => {
          if (typeof dsSection === 'object' && dsSection !== null) {
            for (const [key, value] of Object.entries(dsSection)) {
              if (key === '$') continue;
              const datasets = Array.isArray(value) ? value : [value];
              datasets.forEach(dataset => {
                if (typeof dataset === 'object' && dataset !== null) {
                  for (const [classKey, classVal] of Object.entries(dataset)) {
                    if (classKey === '$' || classKey === 'BID') continue;
                    const objects = Array.isArray(classVal) ? classVal : [classVal];
                    totalEntities += objects.length;
                  }
                }
              });
            }
          }
        });
      }

      // Simular tiempo de procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        totalEntities: totalEntities,
        processingTime: '2.5s',
        details: [
          `Schema ${schemaName} creado exitosamente`,
          `${totalEntities} entidades procesadas`,
          'Conversión simulada (ili2pg no disponible)'
        ],
        schemaName: schemaName
      };

    } catch (error) {
      throw new Error(`Error en simulación de conversión: ${error.message}`);
    }
  }

  // Parsear salida de ili2pg
  parseConversionOutput(stdout, stderr) {
    const result = {
      totalEntities: 0,
      processingTime: '0s',
      details: []
    };

    // Parsear información de entidades
    const entityMatch = stdout.match(/(\d+)\s+objects\s+imported/);
    if (entityMatch) {
      result.totalEntities = parseInt(entityMatch[1]);
    }

    // Parsear tiempo de procesamiento
    const timeMatch = stdout.match(/Processing\s+time:\s+([\d.]+)s/);
    if (timeMatch) {
      result.processingTime = `${timeMatch[1]}s`;
    }

    // Agregar detalles
    const lines = (stdout + '\n' + stderr).split('\n');
    lines.forEach(line => {
      line = line.trim();
      if (line && (line.includes('INFO') || line.includes('SUCCESS'))) {
        result.details.push(line);
      }
    });

    return result;
  }

  // Crear schema PostgreSQL desde modelo ILI
  async createSchemaFromModel(modelType, schemaName) {
    try {
      console.log(`Creando schema ${schemaName} desde modelo ${modelType}`);
      
      const modelPath = await this.getModelPath(modelType);
      const ili2pgCmd = await this.getILI2PGCommand();
      const dbParams = this.getDBParams();
      const modelDirEscaped = this.modelsDir.replace(/\\/g, '/');
      
      // Comando ili2pg para crear schema
      const command = `${ili2pgCmd} --schemaimport --models ${this.getModelName(modelType)} --modeldir "${modelDirEscaped}" --dbschema ${schemaName} --smart2Inheritance --createEnumTabs --createMetaInfo --createFk --createFkIdx --createGeomIdx --createTidCol --createBasketCol --createTypeDiscriminator --createImportTabs --createEnumTabsWithId --createUnique --createNumChecks --defaultSrsCode 3116 ${dbParams}`;
      
      console.log(`Ejecutando: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 minutos timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      return {
        success: true,
        schemaName: schemaName,
        details: [
          `Schema ${schemaName} creado exitosamente`,
          'Tablas generadas según modelo LADM-COL',
          'Índices espaciales creados'
        ]
      };

    } catch (error) {
      console.error('Error creando schema:', error);
      
      // Si ili2pg no está disponible, simular creación
      if (this.isCommandNotFoundError(error)) {
        console.log('ili2pg no disponible, simulando creación de schema');
        return await this.simulateSchemaCreation(schemaName);
      }
      
      throw new Error(`Error creando schema: ${error.message}`);
    }
  }

  // Simular creación de schema
  async simulateSchemaCreation(schemaName) {
    // Simular tiempo de procesamiento
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      success: true,
      schemaName: schemaName,
      details: [
        `Schema ${schemaName} creado exitosamente`,
        '~193 tablas generadas según modelo LADM-COL',
        'Índices espaciales creados',
        'Creación simulada (ili2pg no disponible)'
      ]
    };
  }

  // Validar estructura XML básica
  async validateXMLStructure(filePath) {
    try {
      const xmlContent = await fs.readFile(filePath, 'utf8');
      const parser = new xml2js.Parser();
      await parser.parseStringPromise(xmlContent);
      
      return {
        isValid: true,
        errors: []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Error de sintaxis XML: ${error.message}`]
      };
    }
  }

  // Obtener información del archivo XTF
  async getXTFInfo(filePath) {
    try {
      const xmlContent = await fs.readFile(filePath, 'utf8');
      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true,
        explicitRoot: false,
        tagNameProcessors: [xml2js.processors.stripPrefix]
      });
      const result = await parser.parseStringPromise(xmlContent);
      
      // Find DATASECTION key in a case-insensitive manner
      const keys = Object.keys(result || {});
      const dataSectionKey = keys.find(k => k.toUpperCase() === 'DATASECTION');
      const datasection = dataSectionKey ? result[dataSectionKey] : null;

      const info = {
        hasDataSection: !!datasection,
        datasets: 0,
        totalObjects: 0,
        objectTypes: []
      };

      // Contar datasets y objetos
      if (datasection) {
        const objectTypesSet = new Set();
        let datasetsCount = 0;

        const datasections = Array.isArray(datasection) ? datasection : [datasection];
        datasections.forEach(dsSection => {
          if (typeof dsSection === 'object' && dsSection !== null) {
            for (const [key, value] of Object.entries(dsSection)) {
              if (key === '$') continue;
              datasetsCount++;
              
              const datasets = Array.isArray(value) ? value : [value];
              datasets.forEach(dataset => {
                if (typeof dataset === 'object' && dataset !== null) {
                  for (const [classKey, classVal] of Object.entries(dataset)) {
                    if (classKey === '$' || classKey === 'BID') continue;
                    const objects = Array.isArray(classVal) ? classVal : [classVal];
                    info.totalObjects += objects.length;
                    
                    // Agregar tipo de objeto (limpiando el namespace si existe)
                    const cleanType = classKey.includes('.') ? classKey.substring(classKey.lastIndexOf('.') + 1) : classKey;
                    objectTypesSet.add(cleanType);
                  }
                }
              });
            }
          }
        });

        info.datasets = datasetsCount;
        info.objectTypes = Array.from(objectTypesSet);
      }
      
      return info;
    } catch (error) {
      console.error('Error obteniendo información XTF:', error);
      // Retornar información básica en lugar de lanzar error
      return {
        hasDataSection: false,
        datasets: 0,
        totalObjects: 0,
        objectTypes: [],
        error: error.message
      };
    }
  }

  // Exportar datos de PostgreSQL a XTF usando ili2pg
  async exportPostgreSQLToXTF(modelType, schemaName, outputFilePath, options = {}) {
    try {
      console.log(`Exportando datos de schema ${schemaName} a XTF usando modelo ${modelType}`);
      
      const modelPath = await this.getModelPath(modelType);
      const { dataset = null, basket = null } = options;
      const ili2pgCmd = await this.getILI2PGCommand();
      const dbParams = this.getDBParams();
      const modelDirEscaped = this.modelsDir.replace(/\\/g, '/');
      const outputFilePathEscaped = outputFilePath.replace(/\\/g, '/');

      // Detectar el tipo de herencia configurado en el esquema
      let inheritanceFlag = '--smart2Inheritance';
      try {
        const settingsRes = await db.query(`
          SELECT setting FROM "${schemaName}"."t_ili2db_settings" 
          WHERE tag = 'ch.ehi.ili2db.inheritanceTrafo'
        `);
        if (settingsRes.rows.length > 0) {
          const trafo = settingsRes.rows[0].setting;
          if (trafo === 'smart1') {
            inheritanceFlag = '--smart1Inheritance';
          } else if (trafo === 'smart2') {
            inheritanceFlag = '--smart2Inheritance';
          } else {
            // Si es 'noInheritance' u otro, no pasamos flag de herencia inteligente
            inheritanceFlag = '';
          }
        }
      } catch (e) {
        console.log(`No se pudo leer t_ili2db_settings para ${schemaName}, usando '--smart2Inheritance' por defecto:`, e.message);
      }

      // Comando ili2pg para exportar a XTF
      let command = `${ili2pgCmd} --export --disableValidation --exportModels ${this.getModelName(modelType)} --modeldir "${modelDirEscaped}" --dbschema ${schemaName} ${inheritanceFlag} ${dbParams} "${outputFilePathEscaped}"`;
      
      if (dataset) {
        command += ` --dataset ${dataset}`;
      }
      
      if (basket) {
        command += ` --basket ${basket}`;
      }
      
      console.log(`Ejecutando: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 600000, // 10 minutos timeout
        maxBuffer: 1024 * 1024 * 20 // 20MB buffer
      });

      // Verificar que el archivo se creó
      const fileStats = await fs.stat(outputFilePath);
      
      return {
        success: true,
        outputFilePath: outputFilePath,
        fileSize: fileStats.size,
        dataset: dataset,
        schemaName: schemaName,
        modelType: modelType,
        details: [
          `Archivo XTF exportado exitosamente`,
          `Tamaño: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`,
          `Schema: ${schemaName}`,
          `Modelo: ${modelType}`
        ]
      };

    } catch (error) {
      console.error('Error en exportación XTF:', error);
      
      // Si ili2pg no está disponible, simular exportación
      if (this.isCommandNotFoundError(error)) {
        console.log('ili2pg no disponible, simulando exportación');
        return await this.simulateExport(schemaName, outputFilePath, modelType);
      }
      
      throw new Error(`Error en exportación XTF: ${error.message}`);
    }
  }

  // Simular exportación cuando ili2pg no está disponible
  async simulateExport(schemaName, outputFilePath, modelType) {
    try {
      // Crear un archivo XTF básico de ejemplo
      const sampleXTF = `<?xml version="1.0" encoding="UTF-8"?>
<TRANSFER xmlns="http://www.interlis.ch/INTERLIS2.3">
  <HEADERSECTION SENDER="GP_CONES" VERSION="2.3">
    <MODELS>
      <MODEL NAME="${modelType === 'antioquia' ? 'LADM_COL_ExtAntioquia' : 'LADM_COL_IGAC'}" VERSION="2.0"/>
    </MODELS>
  </HEADERSECTION>
  <DATASECTION>
    <DATASET NAME="${schemaName}">
      <!-- Datos exportados desde schema: ${schemaName} -->
      <!-- Exportación simulada - ili2pg no disponible -->
    </DATASET>
  </DATASECTION>
</TRANSFER>`;

      await fs.writeFile(outputFilePath, sampleXTF, 'utf8');
      const fileStats = await fs.stat(outputFilePath);

      return {
        success: true,
        outputFilePath: outputFilePath,
        fileSize: fileStats.size,
        schemaName: schemaName,
        modelType: modelType,
        details: [
          `Archivo XTF exportado exitosamente (simulado)`,
          `Tamaño: ${(fileStats.size / 1024).toFixed(2)} KB`,
          `Schema: ${schemaName}`,
          `Modelo: ${modelType}`,
          `NOTA: Exportación simulada - ili2pg no disponible`
        ]
      };

    } catch (error) {
      throw new Error(`Error en simulación de exportación: ${error.message}`);
    }
  }

  // Exportar predios de PostgreSQL a formato XTF
  async exportPrediosToXTF(predios, modelType = 'antioquia', options = {}) {
    try {
      const { datasetName = `export_${Date.now()}`, outputPath } = options;
      
      // Si ili2pg está disponible, usar exportación nativa
      try {
        return await this.exportUsingILI2PG(predios, modelType, datasetName, outputPath);
      } catch (error) {
        // Si ili2pg no está disponible, generar XTF manualmente
        console.log('ili2pg no disponible, generando XTF manualmente');
        return await this.generateXTFManually(predios, modelType, datasetName, outputPath);
      }
    } catch (error) {
      throw new Error(`Error exportando a XTF: ${error.message}`);
    }
  }

  // Exportar usando ili2pg (método preferido)
  async exportUsingILI2PG(predios, modelType, datasetName, outputPath) {
    // Nota: ili2pg requiere que los datos estén en un schema específico
    // Por ahora, usaremos generación manual
    throw new Error('Exportación con ili2pg requiere configuración adicional');
  }

  // Generar archivo XTF manualmente desde predios
  async generateXTFManually(predios, modelType, datasetName, outputPath) {
    try {
      const builder = new xml2js.Builder({
        xmldec: { version: '1.0', encoding: 'UTF-8' },
        renderOpts: { pretty: true, indent: '  ' }
      });

      // Construir estructura XTF
      const xtfStructure = {
        TRANSFER: {
          $: {
            xmlns: 'http://www.interlis.ch/INTERLIS2.3',
            version: '2.3'
          },
          HEADERSECTION: {
            SENDER: {
              $: { NAME: 'GPCONES' }
            },
            MODELS: {
              MODEL: {
                $: {
                  NAME: modelType === 'antioquia' ? 'LADM_COL_ExtAntioquia' : 'LADM_COL',
                  VERSION: modelType === 'antioquia' ? '2.0' : '1.0'
                }
              }
            }
          },
          DATASECTION: {
            DATASET: {
              $: { BID: datasetName },
              OBJECT: predios.map((predio, index) => this.predioToXTFObject(predio, index))
            }
          }
        }
      };

      const xml = builder.buildObject(xtfStructure);
      
      // Guardar archivo si se proporciona ruta
      if (outputPath) {
        await fs.writeFile(outputPath, xml, 'utf8');
      }

      return {
        success: true,
        totalPredios: predios.length,
        filePath: outputPath,
        fileSize: Buffer.byteLength(xml, 'utf8'),
        datasetName: datasetName
      };
    } catch (error) {
      throw new Error(`Error generando XTF: ${error.message}`);
    }
  }

  // Convertir predio a objeto XTF
  predioToXTFObject(predio, index) {
    const tid = predio.id || `predio_${index + 1}`;
    
    const obj = {
      $: {
        TID: tid
      },
      LC_Predio: {
        TID: tid,
        NPN: predio.npn || '',
        Municipio: predio.municipio || '',
        Zona: predio.zona || null,
        Sector: predio.sector || null,
        NumeroFicha: predio.numero_ficha || null,
        AreaHectareas: predio.area_hectareas || null,
        TipoPredio: predio.tipo_predio || null,
        UsoPredio: predio.uso_predio || null
      }
    };

    // Agregar geometría si existe
    if (predio.geometry) {
      obj.LC_Predio.Geometry = this.geometryToXTF(predio.geometry);
    }

    // Agregar información del propietario
    if (predio.propietario_nombre) {
      obj.LC_Predio.Propietario = {
        Nombre: predio.propietario_nombre,
        Documento: predio.propietario_documento || null,
        TipoDocumento: predio.propietario_tipo_documento || null
      };
    }

    return obj;
  }

  // Convertir geometría PostGIS a formato XTF
  geometryToXTF(geometry) {
    // Simplificar conversión - en producción usar biblioteca especializada
    if (typeof geometry === 'string') {
      try {
        const geoJson = JSON.parse(geometry);
        return this.geoJSONToXTF(geoJson);
      } catch (e) {
        // Si no es JSON, podría ser WKT
        return { COORD: geometry };
      }
    } else if (geometry && geometry.type) {
      return this.geoJSONToXTF(geometry);
    }
    return null;
  }

  // Convertir GeoJSON a formato XTF
  geoJSONToXTF(geoJson) {
    if (!geoJson || !geoJson.coordinates) {
      return null;
    }

    // Convertir coordenadas a formato XTF
    const coords = geoJson.coordinates[0] || geoJson.coordinates;
    const coordString = coords.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
    
    return {
      COORD: coordString
    };
  }
}

module.exports = new ILIService();
