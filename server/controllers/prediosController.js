const { query, getClient } = require('../config/database');
const { validationResult } = require('express-validator');

// Utility function to extract pure geometry from Feature or FeatureCollection wrappers
function sanitizeGeometry(geometry) {
  if (!geometry) return null;
  let parsed = geometry;
  if (typeof geometry === 'string') {
    try {
      parsed = JSON.parse(geometry);
    } catch (e) {
      return geometry; // Return original to let database/postgis fail or handle it
    }
  }
  if (parsed && typeof parsed === 'object') {
    if (parsed.type === 'FeatureCollection') {
      if (parsed.features && parsed.features.length > 0) {
        return parsed.features[0].geometry;
      }
      return null;
    }
    if (parsed.type === 'Feature') {
      return parsed.geometry;
    }
  }
  return parsed;
}

// Controlador de gestión catastral para el sistema GPCONES
class PrediosController {
  
  // Historia 3: Registro de predios
  // Como técnico catastral, quiero registrar un nuevo predio, para que se mantenga
  // actualizado el inventario catastral conforme a IGAC.
  async createPredio(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos inválidos',
          details: errors.array() 
        });
      }

      const {
        npn,                    // Número de Predio Nacional (único según documento)
        municipio,              // Municipio del predio
        zona,                   // Zona del predio
        sector,                 // Sector del predio
        numero_ficha,           // Número de ficha
        area_hectareas,         // Área en hectáreas
        tipo_predio,            // Tipo de predio (URBANO, RURAL, MIXTO)
        uso_predio,             // Uso del predio (RESIDENCIAL, COMERCIAL, etc.)
        propietario_nombre,     // Nombre del propietario
        propietario_documento,  // Documento del propietario
        propietario_tipo_documento, // Tipo de documento
        geometry                // Geometría del predio (PostGIS)
      } = req.body;

      const { schema } = req.query;

      const sanitizedGeom = sanitizeGeometry(geometry);

      // Validar que el NPN sea obligatorio
      if (!npn || npn.trim().length === 0) {
        return res.status(400).json({ 
          error: 'NPN requerido',
          message: 'El Número de Predio Nacional (NPN) es obligatorio'
        });
      }

      // Validar que el municipio sea obligatorio
      if (!municipio || municipio.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Municipio requerido',
          message: 'El municipio del predio es obligatorio'
        });
      }

      let targetSchema = null;
      if (municipio) {
        const schemaResult = await query(
          `SELECT ms.schema_name 
           FROM municipio_schemas ms
           JOIN municipios m ON ms.municipio_id = m.id
           WHERE (m.nombre = $1 OR m.codigo_dane = $1 OR m.id::text = $1)
             AND ms.activo = true
           LIMIT 1`,
          [municipio]
        );
        if (schemaResult.rows.length > 0) {
          targetSchema = schemaResult.rows[0].schema_name;
        }
      }

      const schemaToUse = targetSchema;

      if (schemaToUse) {
        const schema = schemaToUse;
        const prefixResult = await query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND (table_name = 'ilc_predio' OR table_name = 'lc_predio') LIMIT 1`,
          [schema]
        );
        if (prefixResult.rows.length === 0) {
          return res.status(404).json({ error: 'Tabla predio no encontrada en el esquema LADM' });
        }
        const tableName = prefixResult.rows[0].table_name;

        // Obtener las columnas reales de la tabla de predios para determinar si es lc_predio o ilc_predio
        const colNamesResult = await query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
          [schema, tableName]
        );
        const predioCols = new Set(colNamesResult.rows.map(r => r.column_name));
        const npnColumn = predioCols.has('numero_predial') ? 'numero_predial' : 'numero_predial_nacional';

        // Validar que el NPN sea único en este esquema
        const existingNPN = await query(
          `SELECT t_id FROM "${schema}"."${tableName}" WHERE ${npnColumn} = $1`,
          [npn]
        );
        if (existingNPN.rows.length > 0) {
          return res.status(400).json({ 
            error: 'NPN duplicado',
            message: 'El Número de Predio Nacional (NPN) ya existe en este esquema LADM',
            existing_npn: npn
          });
        }

        // Generar UUID y local_id
        const crypto = require('crypto');
        const tIliTid = crypto.randomUUID();

        // En LADM-COL el campo numero_predial_nacional/numero_predial es varchar(30)
        // Validar longitud y truncar si es necesario
        const npnTrimmed = (npn || '').trim();
        if (npnTrimmed.length > 30) {
          return res.status(400).json({
            error: 'NPN demasiado largo',
            message: `El NPN no puede superar 30 caracteres en el esquema LADM-COL. El valor ingresado tiene ${npnTrimmed.length} caracteres.`,
            max_length: 30
          });
        }
        const localId = npnTrimmed || crypto.randomUUID().substring(0, 30);

        // Resolver departamento y municipio desde la tabla municipios
        let deptCode = '05'; // Default Antioquia
        let muniCode = '001'; // Default
        if (municipio) {
          const muniResult = await query(
            `SELECT codigo_dane, codigo_departamento FROM municipios WHERE nombre = $1 OR id::text = $1 OR codigo_dane = $1 LIMIT 1`,
            [municipio]
          );
          if (muniResult.rows.length > 0) {
            const row = muniResult.rows[0];
            if (row.codigo_departamento) {
              deptCode = row.codigo_departamento;
            }
            if (row.codigo_dane && row.codigo_dane.length >= 5) {
              muniCode = row.codigo_dane.substring(2);
            }
          }
        }

        // Homologar tipo_predio a entero LADM (ilc_prediotipo)
        let tipoVal = 282; // Predio.Privado.Privado por defecto
        if (tipo_predio) {
          const parsed = parseInt(tipo_predio, 10);
          if (!isNaN(parsed) && parsed > 0) {
            tipoVal = parsed;
          } else {
            const lower = tipo_predio.toString().toLowerCase();
            if (lower.includes('public') || lower.includes('público')) {
              tipoVal = 280; // Predio.Publico.Uso_Publico
            } else if (lower.includes('bald') || lower.includes('baldío')) {
              tipoVal = 278; // Predio.Publico.Baldio.Baldio
            } else {
              tipoVal = 282; // Privado
            }
          }
        }

        // Homologar uso_predio a destinacion_economica (ilc_destinacioneconomicatipo)
        const usoMapping = {
          'habitacional': 994,
          'residencial': 994,
          'comercial': 990,
          'industrial': 995,
          'institucional': 1001,
          'lote_rural': 1012,
          'agricola': 986,
          'agrícola': 986,
          'mixto': 994,
          'no_especificado': 994
        };
        let destVal = 994; // Habitacional por defecto
        if (uso_predio) {
          const parsed = parseInt(uso_predio, 10);
          if (!isNaN(parsed) && parsed > 0) {
            destVal = parsed;
          } else {
            const key = uso_predio.toString().toLowerCase();
            if (usoMapping[key]) {
              destVal = usoMapping[key];
            }
          }
        }

        // Convertir área de hectáreas a m2
        const areaM2 = area_hectareas ? parseFloat(area_hectareas) * 10000 : 0;

        // Obtener el ID de la t_basket para el esquema LADM-COL
        let basketId = null;
        try {
          const resBasket = await query(
            `SELECT t_id FROM "${schema}".t_ili2db_basket 
             WHERE topic LIKE '%Levantamiento_Catastral%'
             LIMIT 1`
          );
          if (resBasket.rows.length > 0) {
            basketId = parseInt(resBasket.rows[0].t_id, 10);
          }
        } catch (basketError) {
          console.warn('Advertencia obteniendo t_basket:', basketError.message);
        }

        if (!basketId) {
          try {
            const resAnyBasket = await query(
              `SELECT t_id FROM "${schema}".t_ili2db_basket LIMIT 1`
            );
            if (resAnyBasket.rows.length > 0) {
              basketId = parseInt(resAnyBasket.rows[0].t_id, 10);
            } else {
              basketId = 3; // Fallback razonable
            }
          } catch (anyError) {
            basketId = 3;
          }
        }

        const fields = [];
        const values = [];

        const addField = (colName, val) => {
          if (predioCols.has(colName)) {
            fields.push(colName);
            values.push(val);
          }
        };

        addField('t_basket', basketId);
        addField('t_type', tableName);
        addField('t_ili_tid', tIliTid);
        addField('local_id', localId);
        addField(npnColumn, npnTrimmed || null);
        addField('municipio', muniCode);
        addField('tipo', tipoVal);
        addField('destinacion_economica', destVal);
        addField('espacio_de_nombres', numero_ficha || 'GPCONES_Predios');
        addField('departamento', deptCode);
        addField('codigo_orip', req.body.codigo_orip || null);
        addField('condicion_predio', req.body.condicion_predio ? parseInt(req.body.condicion_predio, 10) : 57);
        addField('nombre', req.body.nombre || null);
        addField('area_registral_m2', areaM2);
        addField('area_catastral_terreno', areaM2);
        addField('comienzo_vida_util_version', new Date());

        const placeholders = fields.map((_, idx) => `$${idx + 1}`);

        // Iniciar transacción de base de datos
        const client = await getClient();

        // Helper para insertar registros en tablas técnicas de Interlis dinámicamente
        const insertInterlisRecord = async (tblName, valObj) => {
          const colsRes = await client.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
            [schema, tblName]
          );
          const colsSet = new Set(colsRes.rows.map(r => r.column_name.toLowerCase()));
          
          const flds = [];
          const vals = [];
          
          for (const [key, val] of Object.entries(valObj)) {
            if (colsSet.has(key.toLowerCase())) {
              flds.push(key);
              vals.push(val);
            }
          }
          
          if (colsSet.has('t_basket') && !flds.includes('t_basket')) {
            flds.push('t_basket');
            vals.push(basketId);
          }
          if (colsSet.has('t_type') && !flds.includes('t_type')) {
            flds.push('t_type');
            vals.push(tblName);
          }
          
          let queryStr = '';
          if (colsSet.has('t_id')) {
            const plc = flds.map((_, i) => `$${i + 1}`);
            queryStr = `INSERT INTO "${schema}"."${tblName}" (t_id, ${flds.join(', ')}) 
                        VALUES (nextval('"${schema}".t_ili2db_seq'), ${plc.join(', ')}) 
                        RETURNING t_id`;
          } else {
            const plc = flds.map((_, i) => `$${i + 1}`);
            queryStr = `INSERT INTO "${schema}"."${tblName}" (${flds.join(', ')}) 
                        VALUES (${plc.join(', ')}) 
                        RETURNING t_id`;
          }
          
          const res = await client.query(queryStr, vals);
          return res.rows[0]?.t_id;
        };

        let newPredio;
        try {
          await client.query('BEGIN');

          // 1. Insertar predio
          const insertRes = await client.query(
            `INSERT INTO "${schema}"."${tableName}" (${fields.join(', ')}) 
             VALUES (${placeholders.join(', ')}) 
             RETURNING t_id as id, ${npnColumn} as npn, municipio, 'Borrador' as estado, CURRENT_TIMESTAMP as created_at`,
            values
          );
          newPredio = insertRes.rows[0];

          // 1b. También insertar en la tabla pública de predios para seguimiento de estado y bandeja de revisión
          const geometryParam = geometry ? JSON.stringify(sanitizedGeom) : null;
          await client.query(
            `INSERT INTO public.predios (
              id, npn, municipio, zona, sector, numero_ficha, area_hectareas, 
              tipo_predio, uso_predio, propietario_nombre, propietario_documento, 
              propietario_tipo_documento, geometry, created_by, estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
              CASE WHEN $13::text IS NOT NULL THEN ST_GeomFromGeoJSON($13) ELSE NULL END, 
              $14, $15)`,
            [
              tIliTid, // usas el mismo UUID para mantener la vinculación!
              npn,
              municipio,
              zona || null,
              sector || null,
              numero_ficha || null,
              area_hectareas || null,
              tipo_predio || null,
              uso_predio || null,
              propietario_nombre || null,
              propietario_documento || null,
              propietario_tipo_documento || null,
              geometryParam,
              req.user.id,
              'Borrador'
            ]
          );

          // 2. Insertar terreno (geometría) si viene especificada
          if (geometry) {
            const terrainTableResult = await client.query(
              `SELECT table_name FROM information_schema.tables 
               WHERE table_schema = $1 
                 AND (table_name = 'cr_terreno' OR table_name = 'lc_terreno' OR table_name = 'ilc_terreno') 
               LIMIT 1`,
              [schema]
            );
            if (terrainTableResult.rows.length > 0) {
              const terrainTableName = terrainTableResult.rows[0].table_name;
              
              // Columnas de la tabla de terrenos
              const terrainColsResult = await client.query(
                `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
                [schema, terrainTableName]
              );
              const terrainCols = new Set(terrainColsResult.rows.map(r => r.column_name));
              
              const terrainTid = crypto.randomUUID();
              const terrainLocalId = npnTrimmed || crypto.randomUUID().substring(0, 30);
              
              const terrainFields = ['t_ili_tid', 'local_id', 'comienzo_vida_util_version'];
              const terrainValues = [terrainTid, terrainLocalId, new Date()];
              
              if (terrainCols.has('t_basket')) {
                terrainFields.push('t_basket');
                terrainValues.push(basketId);
              }
              if (terrainCols.has('t_type')) {
                terrainFields.push('t_type');
                terrainValues.push(terrainTableName);
              }
              
              let srid = 3116; // default fallback
              let useForce3D = false;
              if (terrainCols.has('geometria')) {
                terrainFields.push('geometria');
                terrainValues.push(JSON.stringify(sanitizedGeom));
                
                try {
                  const sridRes = await client.query(
                    `SELECT srid, coord_dimension FROM geometry_columns 
                     WHERE f_table_schema = $1 
                       AND f_table_name = $2 
                       AND f_geometry_column = 'geometria' 
                     LIMIT 1`,
                    [schema, terrainTableName]
                  );
                  if (sridRes.rows.length > 0) {
                    srid = sridRes.rows[0].srid;
                    const coordDim = parseInt(sridRes.rows[0].coord_dimension, 10);
                    if (coordDim === 3) {
                      useForce3D = true;
                    }
                  }
                } catch (sridErr) {
                  console.warn('Advertencia al consultar SRID/dimension, usando fallback 3116/2D:', sridErr.message);
                }
              }
              
              if (terrainCols.has('area_calculada')) {
                terrainFields.push('area_calculada');
                terrainValues.push(areaM2);
              }
              if (terrainCols.has('area_geometria')) {
                terrainFields.push('area_geometria');
                terrainValues.push(areaM2);
              }
              if (terrainCols.has('area_terreno')) {
                terrainFields.push('area_terreno');
                terrainValues.push(areaM2);
              }
              if (terrainCols.has('espacio_de_nombres')) {
                terrainFields.push('espacio_de_nombres');
                terrainValues.push('GPCONES_Terrenos');
              }
              
              const terrainPlaceholders = terrainFields.map((field, idx) => {
                if (field === 'geometria') {
                  const baseTransform = `ST_Transform(ST_GeomFromGeoJSON($${idx + 1}), ${srid})`;
                  return useForce3D 
                    ? `ST_Force3D(ST_Multi(${baseTransform}))` 
                    : `ST_Multi(${baseTransform})`;
                }
                return `$${idx + 1}`;
              });
              
              const terrainInsertResult = await client.query(
                `INSERT INTO "${schema}"."${terrainTableName}" (${terrainFields.join(', ')})
                 VALUES (${terrainPlaceholders.join(', ')})
                 RETURNING t_id`,
                terrainValues
              );
              const terrainId = terrainInsertResult.rows[0].t_id;
              
              // Vincular terreno y predio en col_uebaunit
              const uebaResult = await client.query(
                `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'col_uebaunit' LIMIT 1`,
                [schema]
              );
              if (uebaResult.rows.length > 0) {
                const uebaColsResult = await client.query(
                  `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'col_uebaunit'`,
                  [schema]
                );
                const uebaCols = uebaColsResult.rows.map(r => r.column_name);
                const terrenoCol = uebaCols.find(c => c.includes('terreno'));
                const baunitCol = uebaCols.find(c => c.includes('baunit'));
                
                if (terrenoCol && baunitCol) {
                  await insertInterlisRecord('col_uebaunit', {
                    [terrenoCol]: terrainId,
                    [baunitCol]: newPredio.id
                  });
                }
              }
            }
          }

          // 3. Insertar propietario (interesado) y derecho (link al predio) si vienen especificados
          if (propietario_nombre || propietario_documento) {
            const isStandard = tableName === 'lc_predio';
            const tableInteresado = isStandard ? 'cr_interesado' : 'ilc_interesado';
            const tableDerecho = isStandard ? 'lc_derecho' : 'ilc_derecho';
            
            // Resolver t_id de tipo_documento
            const docTypeStr = propietario_tipo_documento || 'CC';
            const docMapping = {
              'CC': 'Cedula_Ciudadania',
              'NIT': 'NIT',
              'CE': 'Cedula_Extranjeria',
              'TI': 'Tarjeta_Identidad',
              'RC': 'Registro_Civil',
              'PASAPORTE': 'Pasaporte'
            };
            const mappedIlicode = docMapping[docTypeStr.toUpperCase()] || docTypeStr;
            
            const docTypeResult = await client.query(
              `SELECT t_id FROM "${schema}"."cr_documentotipo" WHERE ilicode = $1 OR dispname ILIKE $2 LIMIT 1`,
              [mappedIlicode, `%${docTypeStr}%`]
            );
            const docTypeId = docTypeResult.rows[0]?.t_id || 678; // Fallback
            
            const intTid = crypto.randomUUID();
            const intLocalId = propietario_documento || crypto.randomUUID().substring(0, 30);
            const intTipo = (docTypeStr === 'NIT' || (propietario_nombre && propietario_nombre.toLowerCase().includes('nit'))) ? 1038 : 1037; 
            
            // Dividir nombre completo para separar primer_nombre, primer_apellido
            const names = (propietario_nombre || '').trim().split(/\s+/);
            const primer_nombre = names[0] || 'Propietario';
            const segundo_nombre = names.slice(1, names.length - 1).join(' ') || null;
            const primer_apellido = names[names.length - 1] || 'Temporal';
            const segundo_apellido = null;
            const razon_social = intTipo === 1038 ? propietario_nombre : null;
            
            // Insertar interesado
            const interesadoId = await insertInterlisRecord(tableInteresado, {
              t_ili_tid: intTid,
              tipo: intTipo,
              tipo_documento: docTypeId,
              documento_identidad: propietario_documento || '0',
              primer_nombre,
              segundo_nombre,
              primer_apellido,
              segundo_apellido,
              razon_social,
              autorreconocimientocampesino: false,
              comienzo_vida_util_version: new Date(),
              espacio_de_nombres: 'GPCONES_Interesados',
              local_id: intLocalId
            });
            
            // Resolver t_id de tipo_derecho (Dominio)
            const derTypeTable = isStandard ? 'lc_derechotipo' : 'ilc_derechocatastraltipo';
            const derTypeResult = await client.query(
              `SELECT t_id FROM "${schema}"."${derTypeTable}" WHERE ilicode = 'Dominio' OR dispname ILIKE '%Dominio%' LIMIT 1`
            );
            const derTypeId = derTypeResult.rows[0]?.t_id || 977; // Fallback
            
            const derTid = crypto.randomUUID();
            const derLocalId = crypto.randomUUID();
            
            let rrrId;
            if (isStandard) {
              const colCheck = await client.query(`
                SELECT column_name
                FROM information_schema.columns 
                WHERE table_schema = $1 AND table_name = 'lc_derecho' AND column_name = 'fraccion_derecho'
                LIMIT 1
              `, [schema]);
              const hasFraccion = colCheck.rows.length > 0;
              
              const derValues = {
                t_ili_tid: derTid,
                tipo: derTypeId,
                posesion_ancestral_y_o_tradicional: false,
                fecha_inicio_tenencia: new Date(),
                unidad: newPredio.id,
                espacio_de_nombres: 'GPCONES_Derechos',
                local_id: derLocalId,
                interesado_cr_interesado: interesadoId
              };
              
              if (hasFraccion) {
                derValues.fraccion_derecho = 1.0;
              }
              
              rrrId = await insertInterlisRecord('lc_derecho', derValues);
            } else {
              rrrId = await insertInterlisRecord('ilc_derecho', {
                t_ili_tid: derTid,
                tipo: derTypeId,
                posesion_ancestral_y_o_tradicional: false,
                fecha_inicio_tenencia: new Date(),
                unidad: newPredio.id,
                comienzo_vida_util_version: new Date(),
                espacio_de_nombres: 'GPCONES_Derechos',
                local_id: derLocalId
              });
              
              // Tabla col_rrrinteresado en no-standard
              await insertInterlisRecord('col_rrrinteresado', {
                rrr: rrrId,
                interesado_ilc_interesado: interesadoId
              });
            }
            
            // Insertar fuente administrativa (escritura)
            const tableFuente = isStandard ? 'lc_fuenteadministrativa' : 'ilc_fuenteadministrativa';
            const hasFuenteTable = (await client.query(
              `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2 LIMIT 1`,
              [schema, tableFuente]
            )).rows.length > 0;
            
            if (hasFuenteTable) {
              const fuTid = crypto.randomUUID();
              const fuLocalId = crypto.randomUUID();
              
              const fuTypeResult = await client.query(
                `SELECT t_id FROM "${schema}"."col_fuenteadministrativatipo" WHERE ilicode = 'Escritura_Publica' OR dispname ILIKE '%Escritura%' LIMIT 1`
              );
              const fuTypeId = fuTypeResult.rows[0]?.t_id || 806;
              
              const dispResult = await client.query(
                `SELECT t_id FROM "${schema}"."col_estadodisponibilidadtipo" WHERE ilicode = 'Disponible' OR dispname ILIKE '%Disponible%' LIMIT 1`
              );
              const dispId = dispResult.rows[0]?.t_id || 934;
              
              const fuenteId = await insertInterlisRecord(tableFuente, {
                t_ili_tid: fuTid,
                tipo: fuTypeId,
                ente_emisor: 'Notaría Catastral',
                numero_fuente: 'NUEVO_PREDIO',
                estado_disponibilidad: dispId,
                fecha_documento_fuente: new Date(),
                espacio_de_nombres: 'GPCONES_Fuentes',
                local_id: fuLocalId
              });
              
              await insertInterlisRecord('col_rrrfuente', {
                rrr: rrrId,
                fuente_administrativa: fuenteId
              });
            }
          }

          // Registrar en auditoría
          await client.query(
            'INSERT INTO audit_logs (user_id, action, module, details, is_critical, new_state) VALUES ($1, $2, $3, $4, $5, $6)',
            [
              req.user.id, 
              'CREACION_PREDIO', 
              'GESTION_CATASTRAL', 
              `Nuevo predio LADM creado con geometría y propietario: NPN ${npn} en ${municipio} (Esquema: ${schema})`,
              false,
              JSON.stringify(newPredio)
            ]
          );

          await client.query('COMMIT');
        } catch (txError) {
          await client.query('ROLLBACK');
          throw txError;
        } finally {
          client.release();
        }

        return res.status(201).json({
          message: 'Predio registrado exitosamente en el esquema LADM',
          success: true,
          predio: newPredio,
          estado: 'El predio ha sido creado en estado "Borrador" y requiere revisión'
        });
      }

      // Validar que el NPN sea único en el sistema público
      const existingPredio = await query(
        'SELECT id, npn FROM predios WHERE npn = $1',
        [npn]
      );

      if (existingPredio.rows.length > 0) {
        return res.status(400).json({ 
          error: 'NPN duplicado',
          message: 'El Número de Predio Nacional (NPN) ya existe en el sistema',
          existing_npn: npn
        });
      }

      // Insertar el nuevo predio en el sistema público
      const geometryParam = sanitizedGeom ? JSON.stringify(sanitizedGeom) : null;
      const result = await query(
        `INSERT INTO predios (
          npn, municipio, zona, sector, numero_ficha, area_hectareas, 
          tipo_predio, uso_predio, propietario_nombre, propietario_documento, 
          propietario_tipo_documento, geometry, created_by, estado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
          CASE WHEN $12::text IS NOT NULL THEN ST_GeomFromGeoJSON($12) ELSE NULL END, 
          $13, $14)
        RETURNING id, npn, municipio, estado, created_at`,
        [
          npn, municipio, zona, sector, numero_ficha, area_hectareas,
          tipo_predio, uso_predio, propietario_nombre, propietario_documento,
          propietario_tipo_documento, geometryParam, req.user.id, 'Borrador'
        ]
      );

      const newPredio = result.rows[0];

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical, new_state) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          req.user.id, 
          'CREACION_PREDIO', 
          'GESTION_CATASTRAL', 
          `Nuevo predio creado: NPN ${npn} en ${municipio}`,
          false,
          JSON.stringify(newPredio)
        ]
      );

      res.status(201).json({
        message: 'Predio registrado exitosamente',
        success: true,
        predio: newPredio,
        estado: 'El predio ha sido creado en estado "Borrador" y requiere revisión'
      });

    } catch (error) {
      console.error('Error en createPredio:', error);
      console.error('  Code:', error.code);
      console.error('  Detail:', error.detail);
      console.error('  Constraint:', error.constraint);
      console.error('  Table:', error.table);
      
      // Manejo específico de errores de geometría PostGIS
      if (error.message && error.message.includes('geometry')) {
        return res.status(400).json({ 
          error: 'Geometría inválida',
          message: 'La geometría del predio no es válida. Verifique el formato GeoJSON.',
          details: 'El sistema espera un objeto GeoJSON válido con coordenadas en EPSG:4326'
        });
      }

      // Manejo de errores de restricciones de base de datos
      if (error.code === '23502') { // NOT NULL violation
        return res.status(400).json({
          error: 'Campo requerido faltante',
          message: `El campo '${error.column || error.detail}' es obligatorio en la base de datos`,
          details: error.detail || error.message
        });
      }

      if (error.code === '23503') { // FK violation
        return res.status(400).json({
          error: 'Referencia inválida',
          message: error.detail || error.message,
          details: error.detail
        });
      }

      if (error.code === '23505') { // Unique violation
        return res.status(400).json({
          error: 'Registro duplicado',
          message: error.detail || 'Ya existe un registro con estos datos',
          details: error.detail
        });
      }

      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: error.message || 'No se pudo registrar el predio',
        details: process.env.NODE_ENV !== 'production' ? {
          code: error.code,
          detail: error.detail,
          constraint: error.constraint,
          table: error.table
        } : undefined
      });
    }
  }

  // Obtener predio por ID
  async getPredioById(req, res) {
    try {
      const { id } = req.params;
      const { schema } = req.query;

      if (schema) {
        const prefixResult = await query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND (table_name = 'ilc_predio' OR table_name = 'lc_predio') LIMIT 1`,
          [schema]
        );
        if (prefixResult.rows.length === 0) {
          return res.status(404).json({ error: 'Tabla predio no encontrada en el esquema LADM' });
        }
        const tableName = prefixResult.rows[0].table_name;
        const result = await query(
          `SELECT * FROM "${schema}"."${tableName}" WHERE t_id = $1`,
          [id]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Predio no encontrado en el esquema LADM' });
        }
        const predio = result.rows[0];
        predio.npn = predio.numero_predial_nacional || predio.numero_predial;

        // Intentar obtener la geometría del terreno asociado al predio
        try {
          const terrainTableResult = await query(
            `SELECT table_name FROM information_schema.tables 
             WHERE table_schema = $1 
               AND (table_name = 'cr_terreno' OR table_name = 'lc_terreno' OR table_name = 'ilc_terreno') 
             LIMIT 1`,
            [schema]
          );
          if (terrainTableResult.rows.length > 0) {
            const terrainTableName = terrainTableResult.rows[0].table_name;
            
            // Buscar en col_uebaunit si existe la relación
            const uebaunitResult = await query(
              `SELECT table_name FROM information_schema.tables 
               WHERE table_schema = $1 AND table_name = 'col_uebaunit' LIMIT 1`,
              [schema]
            );
            
            let geomRes = null;
            if (uebaunitResult.rows.length > 0) {
              const uebColsResult = await query(
                `SELECT column_name FROM information_schema.columns 
                 WHERE table_schema = $1 AND table_name = 'col_uebaunit'`,
                [schema]
              );
              const uebCols = new Set(uebColsResult.rows.map(r => r.column_name));
              
              let linkCol = 'ue_cr_terreno';
              if (uebCols.has('ue_lc_terreno')) {
                linkCol = 'ue_lc_terreno';
              } else if (uebCols.has('ue_ilc_terreno')) {
                linkCol = 'ue_ilc_terreno';
              } else if (uebCols.has('ue_terreno')) {
                linkCol = 'ue_terreno';
              }

              geomRes = await query(
                `SELECT ST_AsGeoJSON(ST_Transform(ST_CurveToLine(t.geometria), 4326)) as geometry_geojson
                 FROM "${schema}"."${terrainTableName}" t
                 JOIN "${schema}".col_uebaunit ueb ON ueb.${linkCol} = t.t_id
                 WHERE ueb.baunit = $1::bigint AND t.geometria IS NOT NULL LIMIT 1`,
                [id]
              );

              // Fallback 1: Copropiedad (matriz)
              if (!geomRes || geomRes.rows.length === 0 || !geomRes.rows[0].geometry_geojson) {
                const copropiedadResult = await query(
                  `SELECT table_name FROM information_schema.tables 
                   WHERE table_schema = $1 AND (table_name = 'cr_predio_copropiedad' OR table_name = 'lc_predio_copropiedad') LIMIT 1`,
                  [schema]
                );
                if (copropiedadResult.rows.length > 0) {
                  const copTableName = copropiedadResult.rows[0].table_name;
                  geomRes = await query(
                    `SELECT ST_AsGeoJSON(ST_Transform(ST_CurveToLine(t.geometria), 4326)) as geometry_geojson
                     FROM "${schema}"."${terrainTableName}" t
                     JOIN "${schema}".col_uebaunit ueb ON ueb.${linkCol} = t.t_id
                     WHERE ueb.baunit = (SELECT matriz FROM "${schema}"."${copTableName}" WHERE unidad_predial = $1::bigint LIMIT 1) 
                       AND t.geometria IS NOT NULL LIMIT 1`,
                    [id]
                  );
                }
              }

              // Fallback 2: Prefix matching
              if (!geomRes || geomRes.rows.length === 0 || !geomRes.rows[0].geometry_geojson) {
                geomRes = await query(
                  `SELECT ST_AsGeoJSON(ST_Transform(ST_CurveToLine(geometria), 4326)) as geometry_geojson
                   FROM "${schema}"."${terrainTableName}" 
                   WHERE SUBSTRING(local_id, 1, 21) = SUBSTRING(($1::text), 1, 21) 
                     AND geometria IS NOT NULL LIMIT 1`,
                  [predio.npn || '']
                );
              }

              // Fallback 3: Construction
              if (!geomRes || geomRes.rows.length === 0 || !geomRes.rows[0].geometry_geojson) {
                const constTableResult = await query(
                  `SELECT table_name FROM information_schema.tables 
                   WHERE table_schema = $1 
                     AND (table_name = 'cr_unidadconstruccion' OR table_name = 'lc_construccion' OR table_name = 'ilc_construccion') 
                   LIMIT 1`,
                  [schema]
                );
                if (constTableResult.rows.length > 0) {
                  const constTableName = constTableResult.rows[0].table_name;
                  let constLinkCol = 'ue_cr_unidadconstruccion';
                  if (uebCols.has('ue_lc_construccion')) {
                    constLinkCol = 'ue_lc_construccion';
                  } else if (uebCols.has('ue_ilc_construccion')) {
                    constLinkCol = 'ue_ilc_construccion';
                  } else if (uebCols.has('ue_unidadconstruccion')) {
                    constLinkCol = 'ue_unidadconstruccion';
                  }

                  geomRes = await query(
                    `SELECT ST_AsGeoJSON(ST_Transform(ST_CurveToLine(c.geometria), 4326)) as geometry_geojson
                     FROM "${schema}"."${constTableName}" c
                     JOIN "${schema}".col_uebaunit ueb ON ueb.${constLinkCol} = c.t_id
                     WHERE ueb.baunit = $1::bigint AND c.geometria IS NOT NULL LIMIT 1`,
                    [id]
                  );
                }
              }
            } else {
              // Fallback: por local_id / npn
              geomRes = await query(
                `SELECT ST_AsGeoJSON(ST_Transform(ST_CurveToLine(geometria), 4326)) as geometry_geojson
                 FROM "${schema}"."${terrainTableName}" 
                 WHERE (local_id = $1 OR local_id = $2) AND geometria IS NOT NULL LIMIT 1`,
                [predio.local_id, predio.npn]
              );
            }
            
            if (geomRes && geomRes.rows.length > 0 && geomRes.rows[0].geometry_geojson) {
              predio.geometry = JSON.parse(geomRes.rows[0].geometry_geojson);
            }

            // Buscar construcciones asociadas
            let constructionGeoms = [];
            const constTableResult = await query(
              `SELECT table_name FROM information_schema.tables 
               WHERE table_schema = $1 
                 AND (table_name = 'cr_unidadconstruccion' OR table_name = 'lc_construccion' OR table_name = 'ilc_construccion') 
               LIMIT 1`,
              [schema]
            );
            if (constTableResult.rows.length > 0) {
              const constTableName = constTableResult.rows[0].table_name;
              
              if (uebaunitResult.rows.length > 0) {
                const uebColsResult = await query(
                  `SELECT column_name FROM information_schema.columns 
                   WHERE table_schema = $1 AND table_name = 'col_uebaunit'`,
                  [schema]
                );
                const uebCols = new Set(uebColsResult.rows.map(r => r.column_name));
                
                let constLinkCol = 'ue_cr_unidadconstruccion';
                if (uebCols.has('ue_lc_construccion')) {
                  constLinkCol = 'ue_lc_construccion';
                } else if (uebCols.has('ue_ilc_construccion')) {
                  constLinkCol = 'ue_ilc_construccion';
                } else if (uebCols.has('ue_unidadconstruccion')) {
                  constLinkCol = 'ue_unidadconstruccion';
                }
                
                const constGeomRes = await query(
                  `SELECT c.t_id, c.etiqueta, c.local_id, ST_AsGeoJSON(ST_Transform(ST_CurveToLine(c.geometria), 4326)) as geometry_geojson
                   FROM "${schema}"."${constTableName}" c
                   JOIN "${schema}".col_uebaunit ueb ON ueb.${constLinkCol} = c.t_id
                   WHERE ueb.baunit = $1::bigint AND c.geometria IS NOT NULL`,
                  [id]
                );
                
                constructionGeoms = constGeomRes.rows.map(r => ({
                  t_id: r.t_id,
                  etiqueta: r.etiqueta,
                  local_id: r.local_id,
                  geometry: JSON.parse(r.geometry_geojson)
                }));
              }
            }
            predio.construction_geometries = constructionGeoms;
          }
        } catch (geomErr) {
          console.warn('Error al recuperar geometría para predio LADM:', geomErr.message);
        }

        // Resolver el código Dane del municipio al nombre legible
        // En la BD LADM, municipio = '001' (3 dígitos) y departamento = '05' (2 dígitos)
        // El código Dane completo es departamento + municipio (5 dígitos)
        if (predio.municipio && predio.departamento) {
          const daneCodigo = `${predio.departamento}${predio.municipio}`;
          const muniRes = await query(
            `SELECT nombre, codigo_dane FROM municipios WHERE codigo_dane = $1 LIMIT 1`,
            [daneCodigo]
          );
          if (muniRes.rows.length > 0) {
            predio.municipio_nombre = muniRes.rows[0].nombre;
            predio.municipio_codigo_dane = muniRes.rows[0].codigo_dane;
            // Override municipio with the name for the form dropdown
            predio.municipio = muniRes.rows[0].nombre;
          }
        }

        return res.json({ success: true, data: predio });
      }

      const result = await query(
        `SELECT 
          p.*,
          u.username as created_by_username,
          u.full_name as created_by_name,
          u2.username as updated_by_username,
          u2.full_name as updated_by_name,
          ST_AsGeoJSON(p.geometry) as geometry_geojson
        FROM predios p
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN users u2 ON p.updated_by = u2.id
        WHERE p.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Predio no encontrado',
          message: 'El predio especificado no existe'
        });
      }

      const predio = result.rows[0];
      
      // Convertir geometría a GeoJSON
      if (predio.geometry_geojson) {
        predio.geometry = JSON.parse(predio.geometry_geojson);
        delete predio.geometry_geojson;
      }

      res.json({
        success: true,
        data: predio
      });

    } catch (error) {
      console.error('Error en getPredioById:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo obtener el predio'
      });
    }
  }

  // Obtener opciones de tipo para LADM-COL
  async getTypeOptions(req, res) {
    try {
      const { schema } = req.query;
      if (!schema) {
        return res.status(400).json({ error: 'Falta el parámetro schema' });
      }

      // Detectar si es standard
      const { query } = require('../config/database');
      const standardResult = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'lc_predio'
        );
      `, [schema]);
      const isStandard = standardResult.rows[0]?.exists || false;

      const prefix = isStandard ? 'lc_' : 'ilc_';
      const condTable = `"${schema}"."${prefix}condicionprediotipo"`;
      const destTable = `"${schema}"."${prefix}destinacioneconomicatipo"`;
      const tipoTable = isStandard ? `"${schema}"."col_unidadadministrativabasicatipo"` : `"${schema}"."ilc_prediotipo"`;

      const condRes = await query(`SELECT t_id, ilicode, dispname FROM ${condTable} ORDER BY dispname`);
      const destRes = await query(`SELECT t_id, ilicode, dispname FROM ${destTable} ORDER BY dispname`);
      const tipoRes = await query(`SELECT t_id, ilicode, dispname FROM ${tipoTable} ORDER BY dispname`);

      // Opciones para Propietarios
      const docTable = `"${schema}"."cr_documentotipo"`;
      const derTable = isStandard ? `"${schema}"."lc_derechotipo"` : `"${schema}"."ilc_derechocatastraltipo"`;
      const docRes = await query(`SELECT t_id, ilicode, dispname FROM ${docTable} ORDER BY dispname`);
      const derRes = await query(`SELECT t_id, ilicode, dispname FROM ${derTable} ORDER BY dispname`);

      // Opciones para Fuente Administrativa
      let fuenteRes = { rows: [] };
      let dispRes = { rows: [] };
      try {
        const fuenteTable = `"${schema}"."col_fuenteadministrativatipo"`;
        fuenteRes = await query(`SELECT t_id, ilicode, dispname FROM ${fuenteTable} ORDER BY dispname`);
      } catch (err) {
        console.warn('Error querying col_fuenteadministrativatipo:', err.message);
      }
      try {
        const dispTable = `"${schema}"."col_estadodisponibilidadtipo"`;
        dispRes = await query(`SELECT t_id, ilicode, dispname FROM ${dispTable} ORDER BY dispname`);
      } catch (err) {
        console.warn('Error querying col_estadodisponibilidadtipo:', err.message);
      }

      // Opciones para Construcciones
      const ucTipoTable = `"${schema}"."cr_unidadconstrucciontipo"`;
      const ucUsoTable = `"${schema}"."cr_usouconstipo"`;
      const ucPlantaTable = `"${schema}"."cr_construccionplantatipo"`;
      const ucTipoRes = await query(`SELECT t_id, ilicode, itfcode, dispname FROM ${ucTipoTable} ORDER BY dispname`);
      const ucUsoRes = await query(`SELECT t_id, ilicode, itfcode, dispname FROM ${ucUsoTable} ORDER BY dispname`);
      const ucPlantaRes = await query(`SELECT t_id, ilicode, itfcode, dispname FROM ${ucPlantaTable} ORDER BY dispname`);

      let ucTradRes = { rows: [] };
      if (!isStandard) {
        const ucTradTable = `"${schema}"."ilc_usostradicionalesculturalestipo"`;
        ucTradRes = await query(`SELECT t_id, ilicode, itfcode, dispname FROM ${ucTradTable} ORDER BY dispname`);
      }

      // Helper para buscar tablas de calificación convencional (cuc_)
      const queryLookup = async (tbl) => {
        try {
          const res = await query(`SELECT t_id, ilicode, dispname FROM "${schema}"."${tbl}" ORDER BY dispname`);
          return res.rows;
        } catch (err) {
          try {
            const res = await query(`SELECT t_id, ilicode, dispname FROM "modelointerno"."${tbl}" ORDER BY dispname`);
            return res.rows;
          } catch (err2) {
            console.warn(`Could not query lookup table ${tbl}:`, err2.message);
            return [];
          }
        }
      };

      const cucArmazon = await queryLookup('cuc_armazontipo');
      const cucMuros = await queryLookup('cuc_murostipo');
      const cucCubierta = await queryLookup('cuc_cubiertatipo');
      const cucConservacion = await queryLookup('cuc_estadoconservaciontipo');
      const cucFachada = await queryLookup('cuc_fachadatipo');
      const cucCubrimientoMuros = await queryLookup('cuc_cubrimiento_murostipo');
      const cucPiso = await queryLookup('cuc_pisotipo');
      const cucTamanioBanio = await queryLookup('cuc_tamanio_baniotipo');
      const cucEnchapeBanio = await queryLookup('cuc_enchape_baniotipo');
      const cucMobiliarioBanio = await queryLookup('cuc_mobiliario_baniotipo');
      const cucTamanioCocina = await queryLookup('cuc_tamanio_cocinatipo');
      const cucEnchapeCocina = await queryLookup('cuc_enchape_cocinatipo');
      const cucMobiliarioCocina = await queryLookup('cuc_mobiliario_cocinatipo');
      const cucCerchasComplemento = await queryLookup('cuc_cerchascomplementoindustriatipo');
      const cucCalificarTipo = await queryLookup('cuc_calificartipo');

      res.json({
        success: true,
        data: {
          condiciones: condRes.rows,
          destinaciones: destRes.rows,
          tipos: tipoRes.rows,
          documentoTypes: docRes.rows,
          derechoTypes: derRes.rows,
          ucTipos: ucTipoRes.rows,
          ucUsos: ucUsoRes.rows,
          ucPlantas: ucPlantaRes.rows,
          ucTradicionales: ucTradRes.rows,
          fuenteTypes: fuenteRes.rows,
          disponibilidadTypes: dispRes.rows,
          // Calificaciones lookup tables
          cucArmazon,
          cucMuros,
          cucCubierta,
          cucConservacion,
          cucFachada,
          cucCubrimientoMuros,
          cucPiso,
          cucTamanioBanio,
          cucEnchapeBanio,
          cucMobiliarioBanio,
          cucTamanioCocina,
          cucEnchapeCocina,
          cucMobiliarioCocina,
          cucCerchasComplemento,
          cucCalificarTipo
        }
      });
    } catch (error) {
      console.error('Error en getTypeOptions:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo opciones de tipo',
        message: error.message
      });
    }
  }

  // Actualizar construcción LADM-COL
  async updateConstruccion(req, res) {
    try {
      const { caracteristica } = req.params;
      const { schema } = req.query;
      const {
        identificador,
        total_plantas,
        anio_construccion,
        tipo_unidad_construccion,
        uso,
        usos_tradicionales_culturales,
        altura,
        planta_ubicacion,
        etiqueta,
        tipo_planta
      } = req.body;

      if (!schema) {
        return res.status(400).json({ success: false, error: 'Falta el parámetro schema' });
      }

      // 1. Detectar si es standard
      const standardResult = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'lc_predio'
        );
      `, [schema]);
      const isStandard = standardResult.rows[0]?.exists || false;

      const prefix = isStandard ? 'cr_' : 'ilc_';
      const charTable = `${prefix}caracteristicasunidadconstruccion`;

      // 2. Actualizar caracteristicas
      const charFields = [];
      const charValues = [];
      let pIndex = 1;

      if (identificador !== undefined) {
        charFields.push(`identificador = $${pIndex++}`);
        charValues.push(identificador);
      }
      if (total_plantas !== undefined) {
        charFields.push(`total_plantas = $${pIndex++}`);
        charValues.push(total_plantas === '' || total_plantas === null ? null : parseInt(total_plantas));
      }
      if (anio_construccion !== undefined) {
        charFields.push(`anio_construccion = $${pIndex++}`);
        charValues.push(anio_construccion === '' || anio_construccion === null ? null : parseInt(anio_construccion));
      }
      if (tipo_unidad_construccion !== undefined) {
        charFields.push(`tipo_unidad_construccion = $${pIndex++}`);
        charValues.push(tipo_unidad_construccion === '' || tipo_unidad_construccion === null ? null : parseInt(tipo_unidad_construccion));
      }
      if (uso !== undefined) {
        charFields.push(`uso = $${pIndex++}`);
        charValues.push(uso === '' || uso === null ? null : parseInt(uso));
      }
      if (usos_tradicionales_culturales !== undefined && !isStandard) {
        charFields.push(`usos_tradicionales_culturales = $${pIndex++}`);
        charValues.push(usos_tradicionales_culturales === '' || usos_tradicionales_culturales === null ? null : parseInt(usos_tradicionales_culturales));
      }

      if (charFields.length > 0) {
        charValues.push(caracteristica);
        await query(
          `UPDATE "${schema}"."${charTable}" SET ${charFields.join(', ')} WHERE t_id = $${pIndex}`,
          charValues
        );
      }

      // 3. Actualizar unidad
      const unitFields = [];
      const unitValues = [];
      let uIndex = 1;

      if (altura !== undefined) {
        unitFields.push(`altura = $${uIndex++}`);
        unitValues.push(altura === '' || altura === null ? null : parseFloat(altura));
      }
      if (planta_ubicacion !== undefined) {
        unitFields.push(`planta_ubicacion = $${uIndex++}`);
        unitValues.push(planta_ubicacion === '' || planta_ubicacion === null ? null : parseInt(planta_ubicacion));
      }
      if (etiqueta !== undefined) {
        unitFields.push(`etiqueta = $${uIndex++}`);
        unitValues.push(etiqueta);
      }
      if (tipo_planta !== undefined) {
        unitFields.push(`tipo_planta = $${uIndex++}`);
        unitValues.push(tipo_planta === '' || tipo_planta === null ? null : parseInt(tipo_planta));
      }

      if (unitFields.length > 0) {
        unitValues.push(caracteristica);
        await query(
          `UPDATE "${schema}"."cr_unidadconstruccion" SET ${unitFields.join(', ')} WHERE cr_caracteristicasunidadconstruccion = $${uIndex}`,
          unitValues
        );
      }

      res.json({
        success: true,
        message: 'Construcción actualizada exitosamente'
      });

    } catch (error) {
      console.error('Error en updateConstruccion:', error);
      res.status(500).json({
        success: false,
        error: 'Error actualizando construcción',
        message: error.message
      });
    }
  }

  // Crear construcción LADM-COL vinculada a un predio
  async createConstruccion(req, res) {
    const { schema } = req.query;
    const {
      predio_id,
      identificador,
      total_plantas,
      anio_construccion,
      tipo_unidad_construccion,
      uso,
      usos_tradicionales_culturales,
      altura,
      planta_ubicacion,
      etiqueta,
      tipo_planta
    } = req.body;

    if (!schema) {
      return res.status(400).json({ success: false, error: 'Falta el parámetro schema' });
    }
    if (!predio_id) {
      return res.status(400).json({ success: false, error: 'Falta el parámetro predio_id' });
    }

    const { getClient } = require('../config/database');
    const crypto = require('crypto');
    const client = await getClient();

    try {
      // 1. Detectar si es standard
      const standardResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'lc_predio'
        );
      `, [schema]);
      const isStandard = standardResult.rows[0]?.exists || false;

      const prefix = isStandard ? 'cr_' : 'ilc_';
      const charTable = `${prefix}caracteristicasunidadconstruccion`;

      // Resolver SRID dinámicamente para cr_unidadconstruccion
      let srid = 9377; // default standard LADM-COL SRID
      try {
        const sridRes = await client.query(
          `SELECT srid FROM geometry_columns 
           WHERE f_table_schema = $1 
             AND f_table_name = 'cr_unidadconstruccion' 
             AND f_geometry_column = 'geometria' 
           LIMIT 1`,
          [schema]
        );
        if (sridRes.rows.length > 0) {
          srid = sridRes.rows[0].srid;
        }
      } catch (sridErr) {
        console.warn('Advertencia al consultar SRID para cr_unidadconstruccion:', sridErr.message);
      }

      await client.query('BEGIN');

      // 2. Insertar características de unidad de construcción
      const charColsResult = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
        [schema, charTable]
      );
      const charCols = new Set(charColsResult.rows.map(r => r.column_name));

      const charTid = crypto.randomUUID();
      const charLocalId = identificador || crypto.randomUUID().substring(0, 30);

      const charFields = ['t_ili_tid', 'local_id', 'comienzo_vida_util_version', 'espacio_de_nombres'];
      const charValues = [charTid, charLocalId, new Date(), 'GPCONES_Construcciones'];

      const addCharCol = (colName, val) => {
        if (charCols.has(colName)) {
          charFields.push(colName);
          charValues.push(val);
        }
      };

      // Buscar defaults de base de datos para no-nulos si no vienen especificados
      const defaultTipoUc = tipo_unidad_construccion || (await client.query(`SELECT t_id FROM "${schema}"."cr_unidadconstrucciontipo" LIMIT 1`)).rows[0]?.t_id;
      const defaultUso = uso || (await client.query(`SELECT t_id FROM "${schema}"."cr_usouconstipo" LIMIT 1`)).rows[0]?.t_id;

      addCharCol('identificador', identificador || `UC-${Date.now().toString().slice(-4)}`);
      addCharCol('total_plantas', total_plantas ? parseInt(total_plantas, 10) : 1);
      addCharCol('anio_construccion', anio_construccion ? parseInt(anio_construccion, 10) : new Date().getFullYear());
      addCharCol('tipo_unidad_construccion', defaultTipoUc);
      addCharCol('uso', defaultUso);
      addCharCol('area_construida', 0.0);
      
      if (!isStandard) {
        addCharCol('usos_tradicionales_culturales', usos_tradicionales_culturales ? parseInt(usos_tradicionales_culturales, 10) : null);
      }

      const charPlaceholders = charFields.map((_, idx) => `$${idx + 1}`);
      const charInsertResult = await client.query(
        `INSERT INTO "${schema}"."${charTable}" (${charFields.join(', ')})
         VALUES (${charPlaceholders.join(', ')})
         RETURNING t_id`,
        charValues
      );
      const charTId = charInsertResult.rows[0].t_id;

      // 3. Insertar unidad de construcción
      const ucColsResult = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'cr_unidadconstruccion'`,
        [schema]
      );
      const ucCols = new Set(ucColsResult.rows.map(r => r.column_name));

      const ucTid = crypto.randomUUID();
      const ucLocalId = crypto.randomUUID().substring(0, 30);

      const ucFields = ['t_ili_tid', 'local_id', 'comienzo_vida_util_version', 'espacio_de_nombres', 'cr_caracteristicasunidadconstruccion'];
      const ucValues = [ucTid, ucLocalId, new Date(), 'GPCONES_UnidadesConstruccion', charTId];

      const addUcCol = (colName, val) => {
        if (ucCols.has(colName)) {
          ucFields.push(colName);
          ucValues.push(val);
        }
      };

      // defaults para cr_unidadconstruccion
      const defaultTipoPlanta = tipo_planta || (await client.query(`SELECT t_id FROM "${schema}"."cr_construccionplantatipo" LIMIT 1`)).rows[0]?.t_id;

      let parsedAltura = 3;
      if (altura !== undefined && altura !== null && altura !== '') {
        parsedAltura = Math.round(parseFloat(altura));
      }
      addUcCol('altura', parsedAltura);
      addUcCol('planta_ubicacion', planta_ubicacion ? parseInt(planta_ubicacion, 10) : 1);
      addUcCol('etiqueta', etiqueta || identificador || 'Unidad de Construcción');
      addUcCol('tipo_planta', defaultTipoPlanta);

      if (ucCols.has('geometria')) {
        ucFields.push('geometria');
      }

      const ucPlaceholders = [];
      let ucValIdx = 1;
      const finalUcValues = [];

      for (const field of ucFields) {
        if (field === 'geometria') {
          ucPlaceholders.push(`ST_GeomFromText('MULTIPOLYGON Z EMPTY', ${srid})`);
        } else {
          ucPlaceholders.push(`$${ucValIdx++}`);
          const fieldIdx = ucFields.indexOf(field);
          finalUcValues.push(ucValues[fieldIdx]);
        }
      }

      const ucInsertResult = await client.query(
        `INSERT INTO "${schema}"."cr_unidadconstruccion" (${ucFields.join(', ')})
         VALUES (${ucPlaceholders.join(', ')})
         RETURNING t_id`,
        finalUcValues
      );
      const ucTId = ucInsertResult.rows[0].t_id;

      // 4. Vincular unidad de construcción con predio (baunit) en col_uebaunit
      const uebaColsResult = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'col_uebaunit'`,
        [schema]
      );
      const uebaCols = uebaColsResult.rows.map(r => r.column_name);
      const constCol = uebaCols.find(c => c.includes('unidadconstruccion'));
      const baunitCol = uebaCols.find(c => c.includes('baunit'));

      if (constCol && baunitCol) {
        await client.query(
          `INSERT INTO "${schema}"."col_uebaunit" (${constCol}, ${baunitCol}) VALUES ($1, $2)`,
          [ucTId, parseInt(predio_id, 10)]
        );
      } else {
        throw new Error('No se encontraron las columnas necesarias en col_uebaunit para vincular la construcción.');
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Construcción agregada exitosamente',
        data: {
          caracteristica_id: charTId,
          unidad_id: ucTId
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en createConstruccion:', error);
      res.status(500).json({
        success: false,
        error: 'Error agregando construcción',
        message: error.message
      });
    } finally {
      client.release();
    }
  }

  // Actualizar calificación LADM-COL
  async updateCalificacion(req, res) {
    try {
      const { caracteristica } = req.params;
      const { schema } = req.query;
      const {
        tipo_calificacion,
        armazon,
        muros,
        cubierta,
        conservacion_estructura,
        fachada,
        cubrimiento_muros,
        piso,
        conservacion_acabados,
        tamanio_banio,
        enchape_banio,
        mobiliario_banio,
        conservacion_banio,
        tamanio_cocina,
        enchape_cocina,
        mobiliario_cocina,
        conservacion_cocina,
        cerchas_complemento_industria,
        altura_cerchas_superior_6m
      } = req.body;

      if (!schema) {
        return res.status(400).json({ success: false, error: 'Falta el parámetro schema' });
      }

      // 1. Verificar si existe el enlace en cuc_calificacion_unidadconstruccion
      const uebaColsResult = await query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'cuc_calificacion_unidadconstruccion'`,
        [schema]
      );
      const colNames = uebaColsResult.rows.map(r => r.column_name);
      const charCol = colNames.find(c => c.includes('caracteristicasunidadconstruccion')) || 'ilc_caracteristicasunidadconstruccion';

      const linkResult = await query(
        `SELECT t_id, cuc_clfccnndcnstrccion_cuc_calificacionconvencional 
         FROM "${schema}"."cuc_calificacion_unidadconstruccion" 
         WHERE "${charCol}" = $1`,
        [caracteristica]
      );

      let convencionalId = null;
      if (linkResult.rows.length > 0) {
        convencionalId = linkResult.rows[0].cuc_clfccnndcnstrccion_cuc_calificacionconvencional;
      }


      // 2. Si no existe calificacion convencional, crearla y enlazarla
      if (!convencionalId) {
        // Resolver IDs por defecto si no son provistos (para evitar fallas de null/FKey constraints)
        const getFallbackDefault = async (table) => {
          try {
            return (await query(`SELECT t_id FROM "${schema}"."${table}" LIMIT 1`)).rows[0]?.t_id;
          } catch (err) {
            try {
              return (await query(`SELECT t_id FROM "modelointerno"."${table}" LIMIT 1`)).rows[0]?.t_id;
            } catch (err2) {
              return null;
            }
          }
        };

        const defaultTipo = tipo_calificacion || (await getFallbackDefault("cuc_calificartipo"));
        const defaultArmazon = armazon || (await getFallbackDefault("cuc_armazontipo"));
        const defaultMuros = muros || (await getFallbackDefault("cuc_murostipo"));
        const defaultCubierta = cubierta || (await getFallbackDefault("cuc_cubiertatipo"));
        const defaultConservEstructura = conservacion_estructura || (await getFallbackDefault("cuc_estadoconservaciontipo"));
        const defaultFachada = fachada || (await getFallbackDefault("cuc_fachadatipo"));
        const defaultCubrimiento = cubrimiento_muros || (await getFallbackDefault("cuc_cubrimiento_murostipo"));
        const defaultPiso = piso || (await getFallbackDefault("cuc_pisotipo"));
        const defaultConservAcabados = conservacion_acabados || defaultConservEstructura || (await getFallbackDefault("cuc_estadoconservaciontipo"));
        const defaultMobiliarioBanio = mobiliario_banio || (await getFallbackDefault("cuc_mobiliario_baniotipo"));
        const defaultMobiliarioCocina = mobiliario_cocina || (await getFallbackDefault("cuc_mobiliario_cocinatipo"));

        const insertRes = await query(`
          INSERT INTO "${schema}"."cuc_calificacionconvencional" (
            tipo_calificacion, armazon, muros, cubierta, conservacion_estructura,
            fachada, cubrimiento_muros, piso, conservacion_acabados,
            mobiliario_banio, mobiliario_cocina, total_calificacion,
            tamanio_banio, enchape_banio, conservacion_banio,
            tamanio_cocina, enchape_cocina, conservacion_cocina,
            cerchas_complemento_industria, altura_cerchas_superior_6m
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, $12, $13, $14, $15, $16, $17, $18, $19)
          RETURNING t_id
        `, [
          defaultTipo, defaultArmazon, defaultMuros, defaultCubierta, defaultConservEstructura,
          defaultFachada, defaultCubrimiento, defaultPiso, defaultConservAcabados,
          defaultMobiliarioBanio, defaultMobiliarioCocina,
          tamanio_banio || null, enchape_banio || null, conservacion_banio || null,
          tamanio_cocina || null, enchape_cocina || null, conservacion_cocina || null,
          cerchas_complemento_industria || null, altura_cerchas_superior_6m || null
        ]);

        convencionalId = insertRes.rows[0].t_id;

        if (linkResult.rows.length > 0) {
          await query(`
            UPDATE "${schema}"."cuc_calificacion_unidadconstruccion" 
            SET cuc_clfccnndcnstrccion_cuc_calificacionconvencional = $1 
            WHERE t_id = $2
          `, [convencionalId, linkResult.rows[0].t_id]);
        } else {
          await query(`
            INSERT INTO "${schema}"."cuc_calificacion_unidadconstruccion" (
              "${charCol}",
              cuc_clfccnndcnstrccion_cuc_calificacionconvencional
            ) VALUES ($1, $2)
          `, [caracteristica, convencionalId]);
        }
      } else {
        // 3. Si ya existe calificacion convencional, actualizar los campos provistos
        const updateFields = [];
        const updateValues = [];
        let pIdx = 1;

        const possibleFields = [
          'tipo_calificacion', 'armazon', 'muros', 'cubierta', 'conservacion_estructura',
          'fachada', 'cubrimiento_muros', 'piso', 'conservacion_acabados',
          'tamanio_banio', 'enchape_banio', 'mobiliario_banio', 'conservacion_banio',
          'tamanio_cocina', 'enchape_cocina', 'mobiliario_cocina', 'conservacion_cocina',
          'cerchas_complemento_industria', 'altura_cerchas_superior_6m'
        ];

        possibleFields.forEach(f => {
          if (req.body[f] !== undefined) {
            updateFields.push(`${f} = $${pIdx++}`);
            updateValues.push(req.body[f] === '' ? null : req.body[f]);
          }
        });

        if (updateFields.length > 0) {
          updateValues.push(convencionalId);
          await query(
            `UPDATE "${schema}"."cuc_calificacionconvencional" 
             SET ${updateFields.join(', ')} 
             WHERE t_id = $${pIdx}`,
            updateValues
          );
        }
      }

      res.json({
        success: true,
        message: 'Calificación convencional actualizada exitosamente'
      });

    } catch (error) {
      console.error('Error en updateCalificacion:', error);
      res.status(500).json({
        success: false,
        error: 'Error actualizando calificaciones',
        message: error.message
      });
    }
  }

  // Actualizar predio
  async updatePredio(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('[updatePredio] Errores de validación:', errors.array());
        return res.status(400).json({ 
          error: 'Datos inválidos',
          details: errors.array() 
        });
      }
      const { id } = req.params;
      const { schema } = req.query;
      const updateData = req.body;
      console.log('[updatePredio] id:', id, '| schema:', schema, '| body:', JSON.stringify(updateData));
      console.log('[updatePredio] user role:', req.user?.role);

      let targetSchema = schema;
      if (updateData.municipio && !schema) {
        const schemaResult = await query(
          `SELECT ms.schema_name 
           FROM municipio_schemas ms
           JOIN municipios m ON ms.municipio_id = m.id
           WHERE (m.nombre = $1 OR m.codigo_dane = $1 OR m.id::text = $1)
             AND ms.activo = true
           LIMIT 1`,
          [updateData.municipio]
        );
        if (schemaResult.rows.length > 0) {
          targetSchema = schemaResult.rows[0].schema_name;
        }
      }

      const schemaToUse = targetSchema;

      if (schemaToUse) {
        const schema = schemaToUse;
        const prefixResult = await query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND (table_name = 'ilc_predio' OR table_name = 'lc_predio') LIMIT 1`,
          [schema]
        );
        if (prefixResult.rows.length === 0) {
          return res.status(404).json({ error: 'Tabla predio no encontrada en el esquema LADM' });
        }
        const tableName = prefixResult.rows[0].table_name;

        // Obtener las columnas reales de la tabla de predios
        const colNamesResult = await query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
          [schema, tableName]
        );
        const predioCols = new Set(colNamesResult.rows.map(r => r.column_name));
        
        const ladmFields = [];
        const ladmValues = [];
        let paramIndex = 1;

        const addUpdateField = (colName, val) => {
          if (predioCols.has(colName)) {
            ladmFields.push(`"${colName}" = $${paramIndex++}`);
            ladmValues.push(val);
          }
        };

        // npn o numero_predial_nacional mapean a la misma columna
        const npnValue = updateData.numero_predial_nacional ?? updateData.npn;
        if (npnValue !== undefined) {
          const npnColumn = predioCols.has('numero_predial') ? 'numero_predial' : 'numero_predial_nacional';
          addUpdateField(npnColumn, npnValue);
        }
        if (updateData.matricula_inmobiliaria !== undefined) {
          if (updateData.matricula_inmobiliaria === '' || updateData.matricula_inmobiliaria === null) {
            if (predioCols.has('matricula_inmobiliaria')) {
              ladmFields.push(`"matricula_inmobiliaria" = NULL`);
            }
          } else {
            // matricula_inmobiliaria es tipo INTEGER en la BD — convertir y validar rango
            const matVal = parseInt(updateData.matricula_inmobiliaria, 10);
            if (!isNaN(matVal) && matVal >= -2147483648 && matVal <= 2147483647) {
              addUpdateField('matricula_inmobiliaria', matVal);
            } else if (!isNaN(matVal)) {
              console.warn('[updatePredio] matricula_inmobiliaria fuera de rango integer, se omite:', updateData.matricula_inmobiliaria);
            }
          }
        }
        if (updateData.espacio_de_nombres !== undefined) {
          addUpdateField('espacio_de_nombres', updateData.espacio_de_nombres || 'GPCONES_Predios');
        }
        if (updateData.municipio !== undefined && updateData.municipio !== null) {
          let deptCode = '05';
          let muniCode = '001';
          const muniResult = await query(
            `SELECT codigo_dane, codigo_departamento FROM municipios WHERE nombre = $1 OR id::text = $1 OR codigo_dane = $1 LIMIT 1`,
            [updateData.municipio]
          );
          if (muniResult.rows.length > 0) {
            const row = muniResult.rows[0];
            if (row.codigo_departamento) deptCode = row.codigo_departamento;
            if (row.codigo_dane && row.codigo_dane.length >= 5) muniCode = row.codigo_dane.substring(2);
          }
          addUpdateField('municipio', muniCode);
          
          // Only update departamento if not explicitly provided in updateData
          if (updateData.departamento === undefined) {
            addUpdateField('departamento', deptCode);
          }
        }
        if (updateData.tipo_predio !== undefined) {
          let tipoVal = 282;
          const parsed = parseInt(updateData.tipo_predio, 10);
          if (!isNaN(parsed) && parsed > 0) {
            tipoVal = parsed;
          } else if (updateData.tipo_predio) {
            const lower = updateData.tipo_predio.toString().toLowerCase();
            if (lower.includes('public') || lower.includes('público')) {
              tipoVal = 280;
            } else if (lower.includes('bald') || lower.includes('baldío')) {
              tipoVal = 278;
            }
          }
          addUpdateField('tipo', tipoVal);
        }
        if (updateData.uso_predio !== undefined) {
          const usoMapping = {
            'habitacional': 994,
            'residencial': 994,
            'comercial': 990,
            'industrial': 995,
            'institucional': 1001,
            'lote_rural': 1012,
            'agricola': 986,
            'agrícola': 986,
            'mixto': 994,
            'no_especificado': 994
          };
          let destVal = 994;
          const parsed = parseInt(updateData.uso_predio, 10);
          if (!isNaN(parsed) && parsed > 0) {
            destVal = parsed;
          } else if (updateData.uso_predio) {
            const key = updateData.uso_predio.toString().toLowerCase();
            if (usoMapping[key]) {
              destVal = usoMapping[key];
            }
          }
          addUpdateField('destinacion_economica', destVal);
        }
        if (updateData.departamento !== undefined && updateData.municipio === undefined) {
          let deptCodeVal = updateData.departamento;
          if (deptCodeVal && isNaN(parseInt(deptCodeVal, 10))) {
            const deptResult = await query(
              `SELECT DISTINCT codigo_departamento FROM municipios WHERE departamento = $1 OR codigo_departamento = $1 LIMIT 1`,
              [deptCodeVal]
            );
            if (deptResult.rows.length > 0) {
              deptCodeVal = deptResult.rows[0].codigo_departamento;
            }
          }
          addUpdateField('departamento', deptCodeVal || '05');
        }
        if (updateData.codigo_orip !== undefined) {
          addUpdateField('codigo_orip', updateData.codigo_orip);
        }
        if (updateData.condicion_predio !== undefined) {
          let condVal = 57;
          const parsed = parseInt(updateData.condicion_predio, 10);
          if (!isNaN(parsed) && parsed > 0) {
            condVal = parsed;
          }
          addUpdateField('condicion_predio', condVal);
        }
        if (updateData.nombre !== undefined) {
          addUpdateField('nombre', updateData.nombre);
        }
        if (updateData.area_hectareas !== undefined) {
          const areaM2 = updateData.area_hectareas ? parseFloat(updateData.area_hectareas) * 10000 : 0;
          addUpdateField('area_registral_m2', areaM2);
          addUpdateField('area_catastral_terreno', areaM2);
        }

        let geomUpdated = false;
        if (updateData.geometry) {
          try {
            const sanitizedGeom = sanitizeGeometry(updateData.geometry);
            
            // 1. Obtener la tabla de linderos del terreno y columna de link en col_uebaunit
            const uebColsResult = await query(
              `SELECT column_name FROM information_schema.columns 
               WHERE table_schema = $1 AND table_name = 'col_uebaunit'`,
              [schema]
            );
            const uebCols = new Set(uebColsResult.rows.map(r => r.column_name));
            
            let terrainLinkCol = 'ue_cr_terreno';
            if (uebCols.has('ue_lc_terreno')) {
              terrainLinkCol = 'ue_lc_terreno';
            } else if (uebCols.has('ue_ilc_terreno')) {
              terrainLinkCol = 'ue_ilc_terreno';
            } else if (uebCols.has('ue_terreno')) {
              terrainLinkCol = 'ue_terreno';
            }
            
            const terrainTargetTables = ['lc_terreno', 'cr_terreno', 'lc_lindero'];
            let terrainTableName = 'cr_terreno';
            for (const tName of terrainTargetTables) {
              const checkTbl = await query(
                `SELECT EXISTS (
                  SELECT FROM information_schema.tables 
                  WHERE table_schema = $1 AND table_name = $2
                )`,
                [schema, tName]
              );
              if (checkTbl.rows[0]?.exists) {
                terrainTableName = tName;
                break;
              }
            }

            // 2. Obtener el t_id del terreno asociado a este predio (baunit)
            const linkRes = await query(
              `SELECT "${terrainLinkCol}" as terrain_id 
               FROM "${schema}".col_uebaunit 
               WHERE baunit = $1 AND "${terrainLinkCol}" IS NOT NULL 
               LIMIT 1`,
              [id]
            );

            if (linkRes.rows.length > 0) {
              const terrainId = linkRes.rows[0].terrain_id;

              // 3. Obtener el SRID de la columna de geometría destino del terreno
              const sridRes = await query(
                `SELECT Find_SRID($1, $2, 'geometria')`,
                [schema, terrainTableName]
              );
              const targetSrid = sridRes.rows[0]?.find_srid || 3116;

              // 4. Actualizar la geometría
              const updateGeomSql = `
                UPDATE "${schema}"."${terrainTableName}"
                SET geometria = ST_GeomFromText(
                  REPLACE(
                    ST_AsText(
                      ST_Force3D(
                        ST_Transform(
                          ST_GeomFromGeoJSON($1),
                          $2::integer
                        )
                      )
                    ),
                    'MULTIPOLYGON',
                    'MULTISURFACE'
                  ),
                  $2::integer
                )
                WHERE t_id = $3
              `;
              await query(updateGeomSql, [JSON.stringify(sanitizedGeom), targetSrid, terrainId]);
              console.log(`[updatePredio LADM GEOM] Geometría de terreno ID ${terrainId} actualizada con éxito en ${schema}.${terrainTableName}`);
              geomUpdated = true;
            }
          } catch (geomErr) {
            console.error('[updatePredio LADM GEOM] Error al actualizar la geometría en el esquema LADM:', geomErr.message);
          }
        }

        if (ladmFields.length === 0) {
           return res.json({ success: true, message: 'Ningún dato a actualizar en el predio LADM' });
        }
        
        ladmValues.push(id);
        const result = await query(
          `UPDATE "${schema}"."${tableName}" SET ${ladmFields.join(', ')} WHERE t_id = $${paramIndex} RETURNING *`,
          ladmValues
        );

        // También actualizar la tabla pública de predios para consistencia de estado y bandeja de revisión
        try {
          const publicUpdateFields = [];
          const publicUpdateValues = [];
          let publicIdx = 1;
          
          const addPublicField = (col, val) => {
            if (val !== undefined) {
              publicUpdateFields.push(`"${col}" = $${publicIdx++}`);
              publicUpdateValues.push(val);
            }
          };
          
          addPublicField('npn', npnValue);
          addPublicField('municipio', updateData.municipio);
          addPublicField('zona', updateData.zona);
          addPublicField('sector', updateData.sector);
          addPublicField('numero_ficha', updateData.numero_ficha);
          addPublicField('area_hectareas', updateData.area_hectareas);
          addPublicField('tipo_predio', updateData.tipo_predio);
          addPublicField('uso_predio', updateData.uso_predio);
          addPublicField('propietario_nombre', updateData.propietario_nombre);
          addPublicField('propietario_documento', updateData.propietario_documento);
          addPublicField('propietario_tipo_documento', updateData.propietario_tipo_documento);
          addPublicField('estado', updateData.estado);
          
          if (updateData.geometry !== undefined) {
            const geomParam = updateData.geometry ? JSON.stringify(sanitizeGeometry(updateData.geometry)) : null;
            if (geomParam) {
              publicUpdateFields.push(`"geometry" = ST_GeomFromGeoJSON($${publicIdx++})`);
              publicUpdateValues.push(geomParam);
            } else {
              publicUpdateFields.push(`"geometry" = NULL`);
            }
          }
          
          if (publicUpdateFields.length > 0) {
            publicUpdateValues.push(id);
            await query(
              `UPDATE public.predios 
               SET ${publicUpdateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
               WHERE id = (SELECT t_ili_tid::uuid FROM "${schema}"."${tableName}" WHERE t_id = $${publicIdx}::bigint LIMIT 1) 
                  OR id::text = $${publicIdx} 
                  OR npn = (SELECT ${npnColumn} FROM "${schema}"."${tableName}" WHERE t_id = $${publicIdx}::bigint LIMIT 1)`,
              publicUpdateValues
            );
          }
        } catch (pubErr) {
          console.warn('[updatePredio] No se pudo sincronizar la tabla pública:', pubErr.message);
        }

        return res.json({ success: true, data: result.rows[0] });
      }

      // Verificar que el predio existe en borrador
      const existingPredio = await query(
        'SELECT * FROM predios WHERE id = $1',
        [id]
      );

      if (existingPredio.rows.length === 0) {
        return res.status(404).json({
          error: 'Predio no encontrado',
          message: 'El predio especificado no existe'
        });
      }

      const oldPredio = existingPredio.rows[0];

      // Verificar NPN único si se está cambiando
      if (updateData.npn && updateData.npn !== oldPredio.npn) {
        const existingNPN = await query(
          'SELECT id FROM predios WHERE npn = $1 AND id != $2',
          [updateData.npn, id]
        );

        if (existingNPN.rows.length > 0) {
          return res.status(400).json({
            error: 'NPN duplicado',
            message: 'El Número de Predio Nacional (NPN) ya existe en el sistema'
          });
        }
      }

      // Construir query de actualización dinámico
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      const allowedFields = [
        'npn', 'municipio', 'zona', 'sector', 'numero_ficha',
        'area_hectareas', 'tipo_predio', 'uso_predio',
        'propietario_nombre', 'propietario_documento', 'propietario_tipo_documento',
        'observaciones', 'estado'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(updateData[field]);
          paramIndex++;
        }
      });

      // Manejar geometría si está presente
      if (updateData.geometry) {
        const sanitizedGeom = sanitizeGeometry(updateData.geometry);
        updateFields.push(`geometry = ST_GeomFromGeoJSON($${paramIndex})`);
        updateValues.push(JSON.stringify(sanitizedGeom));
        paramIndex++;
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateFields.push(`updated_by = $${paramIndex}`);
      updateValues.push(req.user.id);
      paramIndex++;

      updateValues.push(id);

      const result = await query(
        `UPDATE predios SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        updateValues
      );

      const updatedPredio = result.rows[0];

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical, previous_state, new_state) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          req.user.id,
          'ACTUALIZACION_PREDIO',
          'GESTION_CATASTRAL',
          `Predio actualizado: NPN ${updatedPredio.npn}`,
          false,
          JSON.stringify(oldPredio),
          JSON.stringify(updatedPredio)
        ]
      );

      res.json({
        success: true,
        message: 'Predio actualizado exitosamente',
        data: updatedPredio
      });

    } catch (error) {
      console.error('Error en updatePredio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo actualizar el predio'
      });
    }
  }

  // Cambiar estado del predio
  async changePredioStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos inválidos',
          details: errors.array() 
        });
      }

      const { id } = req.params;
      const { estado, observaciones } = req.body;

      // Verificar que el predio existe
      const existingPredio = await query(
        'SELECT * FROM predios WHERE id = $1',
        [id]
      );

      if (existingPredio.rows.length === 0) {
        return res.status(404).json({
          error: 'Predio no encontrado',
          message: 'El predio especificado no existe'
        });
      }

      const oldPredio = existingPredio.rows[0];

      // Actualizar estado
      const result = await query(
        'UPDATE predios SET estado = $1, observaciones = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3 WHERE id = $4 RETURNING *',
        [estado, observaciones, req.user.id, id]
      );

      const updatedPredio = result.rows[0];

      // Registrar en auditoría
      await query(
        'INSERT INTO audit_logs (user_id, action, module, details, is_critical, previous_state, new_state) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          req.user.id,
          'CAMBIO_ESTADO_PREDIO',
          'GESTION_CATASTRAL',
          `Estado cambiado de "${oldPredio.estado}" a "${estado}" para NPN ${updatedPredio.npn}`,
          true,
          JSON.stringify({ estado: oldPredio.estado }),
          JSON.stringify({ estado: estado, observaciones: observaciones })
        ]
      );

      res.json({
        success: true,
        message: 'Estado del predio actualizado exitosamente',
        data: updatedPredio
      });

    } catch (error) {
      console.error('Error en changePredioStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo cambiar el estado del predio'
      });
    }
  }

  // Obtener estadísticas de predios
  async getPrediosStats(req, res) {
    try {
      const { schema_name } = req.query;
      
      // Si se especifica un schema y no es 'public', consultar desde ese schema
      if (schema_name && schema_name !== 'public') {
        const schema = schema_name;
        
        // Verificar que el schema existe
        const schemaCheck = await query(`
          SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name = $1
        `, [schema]);

        if (schemaCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: `Schema ${schema} no encontrado`
          });
        }

        // Buscar tabla de predios en el schema (priorizar ilc_predio, luego lc_predio, luego otras)
        const tablesResult = await query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = $1 
            AND table_type = 'BASE TABLE'
            AND (
              table_name = 'ilc_predio'
              OR table_name = 'lc_predio' 
              OR table_name = 'LC_Predio'
              OR table_name ILIKE '%predio%'
            )
          ORDER BY 
            CASE 
              WHEN table_name = 'ilc_predio' THEN 1
              WHEN table_name = 'lc_predio' THEN 2
              WHEN table_name = 'LC_Predio' THEN 3
              ELSE 4
            END,
            table_name
          LIMIT 1
        `, [schema]);

        if (tablesResult.rows.length === 0) {
          return res.json({
            success: true,
            data: {
              general: { total: 0, borrador: 0, en_revision: 0, aprobado: 0, rechazado: 0, urbano: 0, rural: 0, mixto: 0, area_total: 0, area_promedio: 0 },
              byMunicipio: []
            }
          });
        }

        const tableName = tablesResult.rows[0].table_name;
        const fullTableName = `"${schema}"."${tableName}"`;

        // Obtener columnas de la tabla
        const columnsResult = await query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2
        `, [schema, tableName]);
        
        const cols = columnsResult.rows.map(r => r.column_name.toLowerCase());
        const colsSet = new Set(cols);

        // Determinar nombres de columna de NPN y Area
        let npnCol = 'numero_predial_nacional';
        if (colsSet.has('numero_predial')) npnCol = 'numero_predial';
        else if (colsSet.has('numero_predial_nacional')) npnCol = 'numero_predial_nacional';
        else if (colsSet.has('npn')) npnCol = 'npn';

        let areaExpr = '0';
        let isHectares = false;
        if (colsSet.has('area_registral_m2')) areaExpr = 'area_registral_m2';
        else if (colsSet.has('area_catastral_terreno')) areaExpr = 'area_catastral_terreno';
        else if (colsSet.has('area_hectareas')) {
          areaExpr = 'area_hectareas';
          isHectares = true;
        }

        const areaTotalExpr = isHectares ? `COALESCE(SUM(${areaExpr}), 0)` : `COALESCE(SUM(${areaExpr}), 0) / 10000.0`;
        const areaAvgExpr = isHectares ? `COALESCE(AVG(${areaExpr}), 0)` : `COALESCE(AVG(${areaExpr}), 0) / 10000.0`;

        const generalStatsQuery = `
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN fin_vida_util_version IS NULL THEN 1 END) as aprobado,
            0 as borrador,
            0 as en_revision,
            0 as rechazado,
            COUNT(CASE WHEN SUBSTRING(${npnCol} FROM 6 FOR 2) = '01' THEN 1 END) as urbano,
            COUNT(CASE WHEN SUBSTRING(${npnCol} FROM 6 FOR 2) != '01' THEN 1 END) as rural,
            0 as mixto,
            ${areaTotalExpr} as area_total,
            ${areaAvgExpr} as area_promedio
          FROM ${fullTableName}
        `;

        const generalStats = await query(generalStatsQuery);

        const byMunicipioQuery = `
          SELECT 
            COALESCE(m.nombre, p.municipio) as municipio,
            COUNT(*) as count_by_municipio,
            ${areaAvgExpr} as area_promedio
          FROM ${fullTableName} p
          LEFT JOIN public.municipios m ON m.codigo_dane = CONCAT(p.departamento, p.municipio)
          GROUP BY COALESCE(m.nombre, p.municipio)
          ORDER BY count_by_municipio DESC
        `;

        const result = await query(byMunicipioQuery);

        return res.json({
          success: true,
          data: {
            general: generalStats.rows[0],
            byMunicipio: result.rows
          }
        });
      }

      // Fallback al comportamiento estándar con la tabla public.predios
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN estado = 'Borrador' THEN 1 END) as borrador,
          COUNT(CASE WHEN estado = 'En Revisión' THEN 1 END) as en_revision,
          COUNT(CASE WHEN estado = 'Aprobado' THEN 1 END) as aprobado,
          COUNT(CASE WHEN estado = 'Rechazado' THEN 1 END) as rechazado,
          COUNT(CASE WHEN tipo_predio = 'URBANO' THEN 1 END) as urbano,
          COUNT(CASE WHEN tipo_predio = 'RURAL' THEN 1 END) as rural,
          COUNT(CASE WHEN tipo_predio = 'MIXTO' THEN 1 END) as mixto,
          SUM(area_hectareas) as area_total,
          AVG(area_hectareas) as area_promedio,
          municipio,
          COUNT(*) as count_by_municipio
        FROM predios
        GROUP BY municipio
        ORDER BY count_by_municipio DESC
      `;

      const result = await query(statsQuery);
      
      // Estadísticas generales
      const generalStats = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN estado = 'Borrador' THEN 1 END) as borrador,
          COUNT(CASE WHEN estado = 'En Revisión' THEN 1 END) as en_revision,
          COUNT(CASE WHEN estado = 'Aprobado' THEN 1 END) as aprobado,
          COUNT(CASE WHEN estado = 'Rechazado' THEN 1 END) as rechazado,
          COUNT(CASE WHEN tipo_predio = 'URBANO' THEN 1 END) as urbano,
          COUNT(CASE WHEN tipo_predio = 'RURAL' THEN 1 END) as rural,
          COUNT(CASE WHEN tipo_predio = 'MIXTO' THEN 1 END) as mixto,
          COALESCE(SUM(area_hectareas), 0) as area_total,
          COALESCE(AVG(area_hectareas), 0) as area_promedio
        FROM predios
      `);

      const stats = {
        general: generalStats.rows[0],
        byMunicipio: result.rows
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error en getPrediosStats:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudieron obtener las estadísticas'
      });
    }
  }

  // Historia 4: Consulta de predios
  // Como usuario, quiero buscar predios por filtros (NPN, municipio, Numero de ficha etc.), 
  // para que pueda consultar su información fácilmente.
  // Consultar predios desde un schema específico (XTF/ILI)
  async getPrediosFromSchema(req, res, schemaName) {
    try {
      const { query } = require('../config/database');
      
      const {
        npn,
        municipio,
        zona,
        sector,
        numero_ficha,
        page = 1,
        limit = 50,
        sort_by = 't_id',
        sort_order = 'DESC'
      } = req.query;

      // Verificar que el schema existe
      const schemaCheck = await query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = $1
      `, [schemaName]);

      if (schemaCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Schema ${schemaName} no encontrado`
        });
      }

      // Buscar tabla de predios en el schema (priorizar ilc_predio, luego lc_predio, luego otras)
      const tablesResult = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 
          AND table_type = 'BASE TABLE'
          AND (
            table_name = 'ilc_predio'
            OR table_name = 'lc_predio' 
            OR table_name = 'LC_Predio'
            OR table_name ILIKE '%predio%'
          )
        ORDER BY 
          CASE 
            WHEN table_name = 'ilc_predio' THEN 1
            WHEN table_name = 'lc_predio' THEN 2
            WHEN table_name = 'LC_Predio' THEN 3
            ELSE 4
          END,
          table_name
        LIMIT 1
      `, [schemaName]);

      if (tablesResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `No se encontró tabla de predios en el schema ${schemaName}`,
          message: `El schema ${schemaName} existe pero no contiene una tabla de predios. Buscando tablas que contengan 'predio' en el nombre.`
        });
      }

      const tableName = tablesResult.rows[0].table_name;
      const fullTableName = `"${schemaName}"."${tableName}"`;
      
      console.log(`Tabla encontrada: ${fullTableName}`);
      console.log(`Nombre de tabla: ${tableName}`);

      // Obtener columnas de la tabla con sus tipos de dato
      const columnsResult = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [schemaName, tableName]);

      const columns = columnsResult.rows.map(c => c.column_name);
      // Crear un mapa de tipos de dato para cada columna
      const columnTypes = {};
      columnsResult.rows.forEach(row => {
        columnTypes[row.column_name] = row.data_type;
      });
      
      console.log(`\n📋 Columnas encontradas en ${fullTableName} (${columns.length}):`, columns.join(', '));
      console.log(`📊 Tipos de dato:`, Object.entries(columnTypes).slice(0, 10).map(([name, type]) => `${name}:${type}`).join(', '));
      
      // Construir WHERE clause con filtros
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // Mapear campos comunes de LADM-COL
      const fieldMapping = {
        npn: ['numero_predial', 'numero_predial_nacional', 'npn', 't_id', 'matricula_inmobiliaria', 'codigo_homologado'],
        municipio: ['municipio', 'nombre_municipio'],
        zona: ['zona', 'codigo_zona'],
        sector: ['sector', 'codigo_sector'],
        numero_ficha: ['numero_ficha', 'ficha', 'n_ficha'],
        numero_predial: ['numero_predial', 'numero_predial_nacional', 'matricula_inmobiliaria', 'codigo_homologado'], // Filtro específico para número predial
        n_ficha: ['n_ficha', 'numero_ficha', 'ficha'], // Filtro específico para número de ficha
        search: ['numero_predial', 'numero_predial_nacional', 'npn', 'matricula_inmobiliaria', 'n_ficha', 'numero_ficha', 'ficha', 'codigo_homologado', 'nombre'], // Búsqueda general
        matricula_inmobiliaria: ['matricula_inmobiliaria'] // Filtro específico para matrícula inmobiliaria
      };
      
      // Mapeo de columnas LADM-COL a nombres más amigables para el frontend
      const columnMapping = {
        't_id': 't_id',
        't_ili_tid': 't_ili_tid',
        'departamento': 'departamento',
        'municipio': 'municipio',
        'id_operacion': 'id_operacion',
        'codigo_orip': 'codigo_orip',
        'matricula_inmobiliaria': 'matricula_inmobiliaria',
        'numero_predial': 'numero_predial',
        'codigo_homologado': 'codigo_homologado',
        'avaluo_catastral': 'avaluo_catastral',
        'tipo': 'tipo',
        'condicion_predio': 'condicion_predio',
        'destinacion_economica': 'destinacion_economica',
        'n_ficha': 'n_ficha',
        'nombre': 'nombre',
        'comienzo_vida_util_version': 'comienzo_vida_util_version',
        'fin_vida_util_version': 'fin_vida_util_version',
        'espacio_de_nombres': 'espacio_de_nombres',
        'local_id': 'local_id'
      };

      console.log(`\n🔍 Procesando filtros para schema: ${schemaName}`);
      console.log(`📋 Query params recibidos:`, req.query);
      console.log(`📋 Columnas disponibles en la tabla (${columns.length}):`, columns);
      
      Object.keys(fieldMapping).forEach(filterKey => {
        const value = req.query[filterKey];
        if (value && value.toString().trim() !== '') {
          console.log(`\n🔎 Procesando filtro: ${filterKey} = "${value}"`);
          // Buscar columnas que coincidan (case-insensitive)
          const possibleFields = fieldMapping[filterKey].filter(f => {
            const found = columns.find(col => col.toLowerCase() === f.toLowerCase());
            return found !== undefined;
          }).map(f => {
            // Retornar el nombre exacto de la columna en la tabla
            return columns.find(col => col.toLowerCase() === f.toLowerCase()) || f;
          });
          console.log(`   Campos posibles: ${fieldMapping[filterKey].join(', ')}`);
          console.log(`   Campos encontrados en tabla: ${possibleFields.join(', ') || 'NINGUNO'}`);
          
          if (possibleFields.length > 0) {
            // Usar el nombre de columna tal como está en la tabla (puede tener mayúsculas)
            const conditions = possibleFields.map(field => {
              // Siempre usar comillas dobles para nombres de columnas en PostgreSQL
              const quotedField = `"${field}"`;
              const fieldType = columnTypes[field];
              
              console.log(`   🔍 Campo: ${field}, Tipo: ${fieldType || 'NO ENCONTRADO'}`);
              
              // Si la columna es numérica, convertir a texto antes de usar ILIKE
              if (fieldType && ['integer', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision'].includes(fieldType)) {
                const condition = `CAST(${quotedField} AS TEXT) ILIKE $${paramIndex}`;
                console.log(`   ✅ Columna numérica convertida: ${condition}`);
                return condition;
              } else {
                // Para columnas de texto, usar ILIKE directamente
                const condition = `${quotedField} ILIKE $${paramIndex}`;
                console.log(`   ✅ Columna de texto: ${condition}`);
                return condition;
              }
            });
            whereConditions.push(`(${conditions.join(' OR ')})`);
            queryParams.push(`%${value}%`);
            console.log(`   ✅ Filtro agregado: (${conditions.join(' OR ')})`);
            paramIndex++;
          } else {
            // Si no se encontraron campos, log para debugging
            console.log(`   ⚠️ No se encontraron columnas para el filtro: ${filterKey}`);
            console.log(`      Columnas disponibles: ${columns.join(', ')}`);
            console.log(`      Campos buscados: ${fieldMapping[filterKey].join(', ')}`);
          }
        }
      });

      // Filtro especial por documento de propietario en schemas LADM-COL
      if (req.query.propietario_documento && req.query.propietario_documento.toString().trim() !== '') {
        const docValue = req.query.propietario_documento.toString().trim();
        const docType = req.query.propietario_tipo_documento ? req.query.propietario_tipo_documento.toString().trim() : null;
        const isLadmCol = tableName.toLowerCase() === 'ilc_predio' || tableName.toLowerCase() === 'lc_predio';
        const prefix = tableName.toLowerCase() === 'ilc_predio' ? 'ilc_' : 'lc_';
        
        if (isLadmCol) {
          // Mapear el tipo de documento del frontend (CC, NIT, CE, TI, RC, Pasaporte) al ilicode del LADM-COL
          let docTypeIlicode = null;
          if (docType) {
            const mapping = {
              'CC': 'Cedula_Ciudadania',
              'NIT': 'NIT',
              'CE': 'Cedula_Extranjeria',
              'TI': 'Tarjeta_Identidad',
              'RC': 'Registro_Civil',
              'PASAPORTE': 'Pasaporte'
            };
            docTypeIlicode = mapping[docType.toUpperCase()] || docType;
          }

          let docTypeFilter = '';
          if (docTypeIlicode) {
            docTypeFilter = `AND interesado_directo.tipo_documento IN (SELECT t_id FROM "${schemaName}"."cr_documentotipo" WHERE ilicode = $${paramIndex + 1})`;
          }

          let docTypeFilterMiembro = '';
          if (docTypeIlicode) {
            docTypeFilterMiembro = `AND miembro.tipo_documento IN (SELECT t_id FROM "${schemaName}"."cr_documentotipo" WHERE ilicode = $${paramIndex + 1})`;
          }

          if (prefix === 'ilc_') {
            whereConditions.push(`EXISTS (
              SELECT 1 FROM "${schemaName}"."ilc_derecho" derecho
              LEFT JOIN "${schemaName}"."col_rrrinteresado" colrinteresado ON colrinteresado.rrr = derecho.t_id
              LEFT JOIN "${schemaName}"."ilc_interesado" interesado_directo ON interesado_directo.t_id = colrinteresado.interesado_ilc_interesado
              LEFT JOIN "${schemaName}"."cr_agrupacioninteresados" agrupacion ON agrupacion.t_id = colrinteresado.interesado_cr_agrupacioninteresados
              LEFT JOIN "${schemaName}"."col_miembros" miembros ON miembros.agrupacion = agrupacion.t_id
              LEFT JOIN "${schemaName}"."ilc_interesado" miembro ON miembro.t_id = miembros.interesado_ilc_interesado
              WHERE derecho.unidad = predio.t_id 
                AND (
                  ((TRIM(interesado_directo.documento_identidad::TEXT) = $${paramIndex} OR interesado_directo.documento_identidad = $${paramIndex}) ${docTypeFilter})
                  OR ((TRIM(miembro.documento_identidad::TEXT) = $${paramIndex} OR miembro.documento_identidad = $${paramIndex}) ${docTypeFilterMiembro})
                )
            )`);
          } else {
            // Ajustar nombres para Standard lc_predio
            if (docTypeIlicode) {
              docTypeFilter = `AND intereasdo.tipo_documento IN (SELECT t_id FROM "${schemaName}"."cr_documentotipo" WHERE ilicode = $${paramIndex + 1})`;
              docTypeFilterMiembro = `AND interesadomiembros.tipo_documento IN (SELECT t_id FROM "${schemaName}"."cr_documentotipo" WHERE ilicode = $${paramIndex + 1})`;
            }
            whereConditions.push(`EXISTS (
              SELECT 1 FROM "${schemaName}"."lc_derecho" derecho
              LEFT JOIN "${schemaName}"."cr_interesado" intereasdo ON derecho.interesado_cr_interesado = intereasdo.t_id
              LEFT JOIN "${schemaName}"."cr_agrupacioninteresados" agrupacion ON agrupacion.t_id = derecho.interesado_cr_agrupacioninteresados
              LEFT JOIN "${schemaName}"."col_miembros" cm ON agrupacion.t_id = cm.agrupacion
              LEFT JOIN "${schemaName}"."cr_interesado" interesadomiembros ON interesadomiembros.t_id = cm.interesado_cr_interesado
              WHERE derecho.unidad = predio.t_id 
                AND (
                  ((TRIM(intereasdo.documento_identidad::TEXT) = $${paramIndex} OR intereasdo.documento_identidad = $${paramIndex}) ${docTypeFilter})
                  OR ((TRIM(interesadomiembros.documento_identidad::TEXT) = $${paramIndex} OR interesadomiembros.documento_identidad = $${paramIndex}) ${docTypeFilterMiembro})
                )
            )`);
          }
          queryParams.push(docValue);
          paramIndex++;
          if (docTypeIlicode) {
            queryParams.push(docTypeIlicode);
            paramIndex++;
          }
        } else {
          // Si no es LADM-COL pero la tabla tiene alguna columna relacionada a documento
          const possibleDocFields = ['propietario_documento', 'documento', 'documento_identidad'].filter(f => 
            columns.find(col => col.toLowerCase() === f.toLowerCase())
          ).map(f => columns.find(col => col.toLowerCase() === f.toLowerCase()));
          
          if (possibleDocFields.length > 0) {
            const conditions = possibleDocFields.map(field => `"${field}" ILIKE $${paramIndex}`);
            whereConditions.push(`(${conditions.join(' OR ')})`);
            queryParams.push(`%${docValue}%`);
            paramIndex++;
            
            // Si tiene tipo de documento, filtrar también por tipo de documento
            const possibleTypeFields = ['propietario_tipo_documento', 'tipo_documento', 'documento_tipo'].filter(f => 
              columns.find(col => col.toLowerCase() === f.toLowerCase())
            ).map(f => columns.find(col => col.toLowerCase() === f.toLowerCase()));
            
            if (docType && possibleTypeFields.length > 0) {
              const typeConditions = possibleTypeFields.map(field => `"${field}" = $${paramIndex}`);
              whereConditions.push(`(${typeConditions.join(' OR ')})`);
              queryParams.push(docType);
              paramIndex++;
            }
          }
        }
      }
      
      // Log de filtros aplicados
      if (whereConditions.length > 0) {
        console.log(`\n✅ Filtros aplicados (${whereConditions.length}):`, whereConditions);
        console.log(`   Parámetros:`, queryParams);
      } else {
        console.log(`\n⚠️ No se aplicaron filtros`);
      }

      // Check if we should use the advanced query for LADM-COL
      const isLadmCol = tableName.toLowerCase() === 'ilc_predio' || tableName.toLowerCase() === 'lc_predio';
      const prefix = tableName.toLowerCase() === 'ilc_predio' ? 'ilc_' : 'lc_';
      const derechotipoTable = prefix === 'ilc_' ? 'ilc_derechocatastraltipo' : 'lc_derechotipo';
      const prediotipoTable = prefix === 'ilc_' ? 'ilc_prediotipo' : 'col_unidadadministrativabasicatipo';
      const npnColumn = prefix === 'ilc_' ? 'numero_predial_nacional' : 'numero_predial';

      // Detect uebaunit and terrain tables to fetch geometry for the list
      let geometrySelectionStr = '';
      if (isLadmCol) {
        try {
          const terrainTableResult = await query(
            `SELECT table_name FROM information_schema.tables 
             WHERE table_schema = $1 
               AND (table_name = 'cr_terreno' OR table_name = 'lc_terreno' OR table_name = 'ilc_terreno') 
             LIMIT 1`,
            [schemaName]
          );
          if (terrainTableResult.rows.length > 0) {
            const terrainTableName = terrainTableResult.rows[0].table_name;
            const uebaunitResult = await query(
              `SELECT table_name FROM information_schema.tables 
               WHERE table_schema = $1 AND table_name = 'col_uebaunit' LIMIT 1`,
              [schemaName]
            );
            if (uebaunitResult.rows.length > 0) {
              const uebColsResult = await query(
                `SELECT column_name FROM information_schema.columns 
                 WHERE table_schema = $1 AND table_name = 'col_uebaunit'`,
                [schemaName]
              );
              const uebCols = new Set(uebColsResult.rows.map(r => r.column_name));
              let linkCol = 'ue_cr_terreno';
              if (uebCols.has('ue_lc_terreno')) {
                linkCol = 'ue_lc_terreno';
              } else if (uebCols.has('ue_ilc_terreno')) {
                linkCol = 'ue_ilc_terreno';
              } else if (uebCols.has('ue_terreno')) {
                linkCol = 'ue_terreno';
              }

              const copropiedadResult = await query(
                `SELECT table_name FROM information_schema.tables 
                 WHERE table_schema = $1 AND (table_name = 'cr_predio_copropiedad' OR table_name = 'lc_predio_copropiedad') LIMIT 1`,
                [schemaName]
              );
              const copTableName = copropiedadResult.rows.length > 0 ? copropiedadResult.rows[0].table_name : null;

              const attempt1 = `(
                SELECT ST_AsGeoJSON(ST_Transform(ST_CurveToLine(t.geometria), 4326))
                FROM "${schemaName}"."${terrainTableName}" t
                JOIN "${schemaName}".col_uebaunit ueb ON ueb.${linkCol} = t.t_id
                WHERE ueb.baunit = predio.t_id AND t.geometria IS NOT NULL
                LIMIT 1
              )`;

              const attempt2 = copTableName ? `(
                SELECT ST_AsGeoJSON(ST_Transform(ST_CurveToLine(t.geometria), 4326))
                FROM "${schemaName}"."${terrainTableName}" t
                JOIN "${schemaName}".col_uebaunit ueb ON ueb.${linkCol} = t.t_id
                WHERE ueb.baunit = (
                  SELECT matriz FROM "${schemaName}"."${copTableName}" 
                  WHERE unidad_predial = predio.t_id 
                  LIMIT 1
                ) AND t.geometria IS NOT NULL
                LIMIT 1
              )` : 'NULL';

              const attempt3 = `(
                SELECT ST_AsGeoJSON(ST_Transform(ST_CurveToLine(t.geometria), 4326))
                FROM "${schemaName}"."${terrainTableName}" t
                WHERE SUBSTRING(t.local_id, 1, 21) = SUBSTRING(COALESCE(predio.${npnColumn}, ''), 1, 21)
                  AND t.geometria IS NOT NULL
                LIMIT 1
              )`;

              geometrySelectionStr = `, COALESCE(${attempt1}, ${attempt2}, ${attempt3}) as geometry_geojson`;
            }
          }
        } catch (geomError) {
          console.warn('⚠️ No se pudo determinar la relación de geometría para el listado de predios:', geomError.message);
        }
      } else {
        const hasGeometriaColumn = columns.find(col => col.toLowerCase() === 'geometria');
        const hasGeometryColumn = columns.find(col => col.toLowerCase() === 'geometry');
        if (hasGeometriaColumn) {
          geometrySelectionStr = `, ST_AsGeoJSON(ST_Transform(ST_CurveToLine(predio.geometria), 4326)) as geometry_geojson`;
        } else if (hasGeometryColumn) {
          geometrySelectionStr = `, ST_AsGeoJSON(predio.geometry) as geometry_geojson`;
        }
      }

      let baseQuery = `SELECT * FROM ${fullTableName}`;

      if (isLadmCol) {
        baseQuery = `
          SELECT
            predio.*,
            predio.espacio_de_nombres as "NumeroFicha",
            predio.${npnColumn} as "Npn",
            condicion.ilicode as "Condicion",
            tipo.ilicode as "Tipo",
            destino.ilicode as "DestinoEconomico",
            ${geometrySelectionStr ? geometrySelectionStr.substring(1) + ',' : ''}
            CASE
              WHEN tipodir.ilicode = 'No_Estructurada' THEN direccion.nombre_predio
              ELSE
                TRIM(
                  CONCAT_WS(' ',
                    CASE clasevia.itfcode
                      WHEN '0' THEN 'AC'
                      WHEN '1' THEN 'ACR'
                      WHEN '2' THEN 'AV'
                      WHEN '3' THEN 'AU'
                      WHEN '4' THEN 'CIR'
                      WHEN '5' THEN 'CL'
                      WHEN '6' THEN 'CR'
                      WHEN '7' THEN 'DG'
                      WHEN '8' THEN 'TV'
                      WHEN '9' THEN 'CQ'
                    END,
                    CONCAT_WS(' ',
                      direccion.valor_via_principal,
                      direccion.letra_via_principal,
                      sector.ilicode
                    ),
                    CASE
                      WHEN direccion.valor_via_generadora IS NOT NULL
                      THEN CONCAT(
                        'N ',
                        CONCAT_WS(' ',
                          direccion.valor_via_generadora,
                          direccion.letra_via_generadora,
                          sectorp.ilicode
                        )
                      )
                    END,
                    CASE
                      WHEN direccion.numero_predio IS NOT NULL
                      THEN CONCAT('-', direccion.numero_predio)
                    END,
                    direccion.complemento
                  )
                )
            END AS "Direccion"
          FROM "${schemaName}".${prefix}predio predio
          JOIN "${schemaName}".${prefix}condicionprediotipo condicion ON condicion.t_id = predio.condicion_predio
          JOIN "${schemaName}"."${prediotipoTable}" tipo ON tipo.t_id = predio.tipo
          JOIN "${schemaName}".${prefix}destinacioneconomicatipo destino ON destino.t_id = predio.destinacion_economica
          LEFT JOIN LATERAL (
            SELECT *
            FROM "${schemaName}".extdireccion d
            WHERE d.${prefix}predio_direccion = predio.t_id
            ORDER BY d.t_id
            LIMIT 1
          ) direccion ON true
          LEFT JOIN "${schemaName}".extdireccion_clase_via_principal clasevia ON clasevia.t_id = direccion.clase_via_principal
          LEFT JOIN "${schemaName}".extdireccion_tipo_direccion tipodir ON tipodir.t_id = direccion.tipo_direccion
          LEFT JOIN "${schemaName}".extdireccion_sector_ciudad sector ON sector.t_id = direccion.sector_ciudad
          LEFT JOIN "${schemaName}".extdireccion_sector_ciudad sectorp ON sectorp.t_id = direccion.clase_via_principal
        `;
      }

      // Construir WHERE clause con filtros (aplicado sobre la tabla base o el CTE)
      let whereClauseStr = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Contar total
      let countResult;
      try {
        console.log(`\n📊 Contando registros en: ${fullTableName}`);
        console.log(`WHERE clause: ${whereClauseStr || 'NINGUNO'}`);
        console.log(`Count params (${queryParams.length}):`, queryParams);
        
        const countQuery = isLadmCol ? `
          WITH base_data AS (${baseQuery})
          SELECT COUNT(*) as total FROM base_data ${whereClauseStr}
        ` : `
          SELECT COUNT(*) as total FROM ${fullTableName} ${whereClauseStr}
        `;
        
        console.log(`\n📝 Count SQL completo:`);
        console.log(countQuery);
        console.log(`\n📦 Parámetros para COUNT:`, queryParams);
        
        countResult = await query(countQuery, queryParams);
        const totalCount = parseInt(countResult.rows[0].total);
        console.log(`✅ Total de registros: ${totalCount}`);
      } catch (countError) {
        console.error('\n❌ Error contando registros:', countError);
        console.error('Error message:', countError.message);
        console.error('Error code:', countError.code);
        console.error('Error detail:', countError.detail);
        console.error('Error hint:', countError.hint);
        console.error('Error position:', countError.position);
        console.error('Tabla:', fullTableName);
        console.error('WHERE clause:', whereClauseStr);
        console.error('Query params:', queryParams);
        console.error('Error stack:', countError.stack);
        return res.status(500).json({
          success: false,
          error: 'Error contando registros',
          message: countError.message || 'Error desconocido al contar registros. Es posible que el schema no tenga todas las tablas relacionadas requeridas para la consulta avanzada.',
          details: {
            table: fullTableName,
            whereClause: whereClauseStr,
            error: countError.message,
            code: countError.code,
            detail: countError.detail,
            hint: countError.hint
          }
        });
      }
      
      const total = parseInt(countResult.rows[0].total);

      // Obtener datos paginados
      const offset = (page - 1) * limit;
      // Buscar una columna segura para ordenar
      let safeSortBy = 't_id';
      if (columns.includes(sort_by)) {
        safeSortBy = sort_by;
      } else if (columns.includes('t_id')) {
        safeSortBy = 't_id';
      } else if (columns.length > 0) {
        safeSortBy = columns[0];
      }
      
      const safeSortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      let dataResult;
      try {
        // Usar el nombre de columna con comillas para evitar problemas con nombres reservados
        const sortColumn = `"${safeSortBy}"`;
        
        console.log(`\n🔍 Consultando tabla: ${fullTableName}`);
        console.log(`📋 Ordenando por: ${sortColumn} ${safeSortOrder}`);
        console.log(`🔎 WHERE clause: ${whereClauseStr || 'NINGUNO'}`);
        console.log(`📦 Parámetros WHERE (${queryParams.length}):`, queryParams);
        console.log(`📄 Paginación: LIMIT ${limit} OFFSET ${offset}`);
        console.log(`🔢 paramIndex actual: ${paramIndex}`);
        
        // Construir la consulta SQL
        // IMPORTANTE: Usar parámetros preparados para LIMIT y OFFSET también
        const finalParams = [...queryParams];
        const limitParamIndex = paramIndex;
        const offsetParamIndex = paramIndex + 1;
        finalParams.push(parseInt(limit), parseInt(offset));
        
        const sqlQuery = isLadmCol ? `
          WITH base_data AS (${baseQuery})
          SELECT * FROM base_data
          ${whereClauseStr}
          ORDER BY ${sortColumn} ${safeSortOrder}
          LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        ` : `
          SELECT *, ${geometrySelectionStr ? geometrySelectionStr.substring(1) : 'NULL as geometry_geojson'}
          FROM ${fullTableName}
          ${whereClauseStr}
          ORDER BY ${sortColumn} ${safeSortOrder}
          LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `;
        
        console.log(`\n📝 SQL Query completo:`);
        console.log(sqlQuery);
        console.log(`\n📊 Query params (${finalParams.length}):`, finalParams);
        console.log(`   - Parámetros WHERE: [${queryParams.join(', ')}]`);
        console.log(`   - LIMIT ($${limitParamIndex}): ${limit}`);
        console.log(`   - OFFSET ($${offsetParamIndex}): ${offset}`);
        
        dataResult = await query(sqlQuery, finalParams);
        
        console.log(`\n✅ Registros obtenidos: ${dataResult.rows.length}`);
        if (dataResult.rows.length > 0) {
          console.log(`   Primer registro:`, Object.keys(dataResult.rows[0]).slice(0, 5).join(', '));
        }
      } catch (dataError) {
        console.error('\n❌ Error obteniendo datos:', dataError);
        console.error('Error message:', dataError.message);
        console.error('Error code:', dataError.code);
        console.error('Error stack:', dataError.stack);
        console.error('Query intentada:', `SELECT * FROM ${fullTableName} ${whereClauseStr} ORDER BY "${safeSortBy}" ${safeSortOrder}`);
        console.error('Columnas disponibles:', columns);
        return res.status(500).json({
          success: false,
          error: 'Error obteniendo datos de la tabla',
          message: dataError.message,
          details: `Tabla: ${fullTableName}, Columna orden: ${safeSortBy}, Error: ${dataError.message}`
        });
      }

      // Mapear los datos para incluir todas las columnas
      const mappedPredios = dataResult.rows.map(row => {
        const mapped = { ...row };
        
        // Mapear campos adicionales para compatibilidad con el frontend
        if (row.Npn && !mapped.npn) mapped.npn = row.Npn;
        if (row.numero_predial && !mapped.npn) mapped.npn = row.numero_predial;
        
        if (row.Municipio && !mapped.municipio) mapped.municipio = row.Municipio;
        
        if (row.n_ficha && !mapped.numero_ficha) mapped.numero_ficha = row.n_ficha;
        
        if (row.tipo && !mapped.tipo_predio) mapped.tipo_predio = row.tipo;
        
        if (row.DestinoEcconomico && !mapped.uso_predio) mapped.uso_predio = row.DestinoEcconomico;
        else if (row.destinacion_economica && !mapped.uso_predio) mapped.uso_predio = row.destinacion_economica;
        
        if (row.CondicionPredio && !mapped.estado) mapped.estado = row.CondicionPredio;
        else if (row.condicion_predio && !mapped.estado) mapped.estado = row.condicion_predio;
        
        if (row.geometry_geojson) {
          try {
            mapped.geometry = JSON.parse(row.geometry_geojson);
          } catch (e) {
            console.error('Error al parsear geometry_geojson:', e.message);
          }
          delete mapped.geometry_geojson;
        }
        
        return mapped;
      });

      // Resolver nombre de municipio para todos los predios LADM (donde municipio es un código de 3 dígitos)
      if (isLadmCol && mappedPredios.length > 0) {
        // Recopilar todos los códigos Dane únicos (departamento + municipio)
        const daneCodigos = [...new Set(
          mappedPredios
            .filter(p => p.municipio && p.departamento && /^\d{2,3}$/.test(p.municipio))
            .map(p => `${p.departamento}${p.municipio}`)
        )];
        
        if (daneCodigos.length > 0) {
          try {
            const muniNombresRes = await query(
              `SELECT codigo_dane, nombre FROM municipios WHERE codigo_dane = ANY($1)`,
              [daneCodigos]
            );
            const muniMap = {};
            muniNombresRes.rows.forEach(m => { muniMap[m.codigo_dane] = m.nombre; });
            
            mappedPredios.forEach(p => {
              if (p.municipio && p.departamento && /^\d{2,3}$/.test(p.municipio)) {
                const dane = `${p.departamento}${p.municipio}`;
                if (muniMap[dane]) {
                  p.municipio_nombre = muniMap[dane];
                }
              }
            });
          } catch (muniErr) {
            console.warn('No se pudo resolver nombres de municipio:', muniErr.message);
          }
        }
      }

      // Obtener todas las columnas únicas de todos los registros
      const allColumnNames = new Set();
      if (dataResult.rows.length > 0) {
        dataResult.rows.forEach(row => {
          Object.keys(row).forEach(key => allColumnNames.add(key));
        });
      }
      // También agregar las columnas de la tabla
      columns.forEach(col => allColumnNames.add(col));
      
      const allColumns = Array.from(allColumnNames).sort();
      
      console.log(`\n📋 Columnas disponibles en los datos (${allColumns.length}):`, allColumns.join(', '));
      console.log(`📋 Columnas de la tabla (${columns.length}):`, columns.join(', '));

      res.json({
        success: true,
        data: {
          predios: mappedPredios,
          schema_name: schemaName,
          table_name: tableName,
          columns: columns, // Columnas de la tabla desde information_schema
          available_columns: allColumns, // TODAS las columnas encontradas en los datos
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Error en getPrediosFromSchema:', error);
      console.error('Stack:', error.stack);
      console.error('Schema:', schemaName);
      console.error('Query params:', req.query);
      console.error('Error completo:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Enviar mensaje de error más descriptivo
      const errorMessage = error.message || 'Error desconocido';
      const errorDetails = {
        schema: schemaName,
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      };
      
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: `Error al consultar predios del schema ${schemaName}: ${errorMessage}`,
        details: errorDetails
      });
    }
  }

  async getPredios(req, res) {
    try {
      const { schema_name } = req.query;
      
      // Si se especifica un schema, consultar desde ese schema
      if (schema_name) {
        // Llamar directamente al método usando this (el contexto se preserva)
        return await this.getPrediosFromSchema(req, res, schema_name);
      }
      const {
        npn,           // Filtro por NPN
        municipio,     // Filtro por municipio
        zona,          // Filtro por zona
        sector,        // Filtro por sector
        numero_ficha,  // Filtro por número de ficha
        estado,        // Filtro por estado del predio
        tipo_predio,   // Filtro por tipo de predio
        uso_predio,    // Filtro por uso del predio
        propietario_documento, // Filtro por documento del propietario
        matricula_inmobiliaria, // Filtro por matrícula inmobiliaria (para consistencia del frontend)
        page = 1,      // Paginación
        limit = 20,    // Límite de resultados por página
        sort_by = 'created_at', // Campo para ordenar
        sort_order = 'DESC'     // Orden ascendente o descendente
      } = req.query;

      // Construir query dinámico con filtros
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // Agregar filtros si están presentes
      if (npn) {
        whereConditions.push(`npn ILIKE $${paramIndex}`);
        queryParams.push(`%${npn}%`);
        paramIndex++;
      }

      if (municipio) {
        whereConditions.push(`municipio ILIKE $${paramIndex}`);
        queryParams.push(`%${municipio}%`);
        paramIndex++;
      }

      if (zona) {
        whereConditions.push(`zona ILIKE $${paramIndex}`);
        queryParams.push(`%${zona}%`);
        paramIndex++;
      }

      if (sector) {
        whereConditions.push(`sector ILIKE $${paramIndex}`);
        queryParams.push(`%${sector}%`);
        paramIndex++;
      }

      if (numero_ficha) {
        whereConditions.push(`numero_ficha ILIKE $${paramIndex}`);
        queryParams.push(`%${numero_ficha}%`);
        paramIndex++;
      }

      if (estado) {
        whereConditions.push(`estado = $${paramIndex}`);
        queryParams.push(estado);
        paramIndex++;
      }

      if (tipo_predio) {
        whereConditions.push(`tipo_predio = $${paramIndex}`);
        queryParams.push(tipo_predio);
        paramIndex++;
      }

      if (uso_predio) {
        whereConditions.push(`uso_predio = $${paramIndex}`);
        queryParams.push(uso_predio);
        paramIndex++;
      }

      if (propietario_documento) {
        whereConditions.push(`propietario_documento ILIKE $${paramIndex}`);
        queryParams.push(`%${propietario_documento}%`);
        paramIndex++;
      }

      // Construir WHERE clause
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Validar campos de ordenamiento
      const allowedSortFields = ['npn', 'municipio', 'created_at', 'estado', 'area_hectareas'];
      const allowedSortOrders = ['ASC', 'DESC'];
      
      if (!allowedSortFields.includes(sort_by)) {
        sort_by = 'created_at';
      }
      
      if (!allowedSortOrders.includes(sort_order.toUpperCase())) {
        sort_order = 'DESC';
      }

      // Query para contar total de registros
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM predios 
        ${whereClause}
      `;

      const countResult = await query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Calcular paginación
      const offset = (page - 1) * limit;

      // Query principal con paginación
      const mainQuery = `
        SELECT 
          p.*,
          u.username as created_by_username,
          u.full_name as created_by_name,
          u2.username as updated_by_username,
          u2.full_name as updated_by_name,
          ST_AsGeoJSON(p.geometry) as geometry_geojson
        FROM predios p
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN users u2 ON p.updated_by = u2.id
        ${whereClause}
        ORDER BY p.${sort_by} ${sort_order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await query(mainQuery, queryParams);
      const predios = result.rows.map(predio => {
        // Convertir geometría a GeoJSON si existe
        if (predio.geometry_geojson) {
          predio.geometry = JSON.parse(predio.geometry_geojson);
          delete predio.geometry_geojson;
        }
        return predio;
      });

      res.json({
        success: true,
        data: {
          predios,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          filters: {
            npn,
            municipio,
            zona,
            sector,
            numero_ficha,
            estado,
            tipo_predio,
            uso_predio
          }
        }
      });

    } catch (error) {
      console.error('Error en getPredios:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudieron obtener los predios'
      });
    }
  }

  // Eliminar predio (con cascada de propietarios y registros relacionados)
  async deletePredio(req, res) {
    const { query, pool } = require('../config/database');
    const { id } = req.params;
    const { schema } = req.query;

    // ── Eliminación en schema LADM-COL ──────────────────────────────────────
    if (schema) {
      const client = await pool.connect();
      try {
        // Determinar tabla base (ilc_ o lc_)
        const prefixResult = await client.query(
          `SELECT table_name FROM information_schema.tables
           WHERE table_schema = $1
             AND (table_name = 'ilc_predio' OR table_name = 'lc_predio')
           LIMIT 1`,
          [schema]
        );
        if (prefixResult.rows.length === 0) {
          client.release();
          return res.status(404).json({ error: 'Tabla predio no encontrada en el esquema LADM' });
        }
        const tableName   = prefixResult.rows[0].table_name;
        const prefix      = tableName === 'ilc_predio' ? 'ilc_' : 'lc_';
        const derechoTable = `${prefix}derecho`;

        await client.query('BEGIN');

        let deleted = {};

        // Helper to run query only if table exists in schema
        const runQueryIfTableExists = async (tbl, sql, params) => {
          const exists = await client.query(
            `SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = $1 AND table_name = $2
            )`,
            [schema, tbl]
          );
          if (exists.rows[0].exists) {
            return await client.query(sql, params);
          }
          return { rows: [], rowCount: 0 };
        };

        // ── Paso 1: Derechos y sus dependientes ────────────────────────────
        const derechosRes = await runQueryIfTableExists(
          derechoTable,
          `SELECT t_id FROM "${schema}"."${derechoTable}" WHERE unidad = $1`,
          [id]
        );
        const derechoIds = derechosRes.rows.map(r => r.t_id);

        if (derechoIds.length > 0) {
          const r1 = await runQueryIfTableExists(
            'col_rrrfuente',
            `DELETE FROM "${schema}".col_rrrfuente WHERE rrr = ANY($1)`,
            [derechoIds]
          );
          deleted.fuentes_rrr = r1.rowCount;

          const r2 = await runQueryIfTableExists(
            'col_rrrinteresado',
            `DELETE FROM "${schema}".col_rrrinteresado WHERE rrr = ANY($1)`,
            [derechoIds]
          );
          deleted.interesados = r2.rowCount;

          const r3 = await runQueryIfTableExists(
            derechoTable,
            `DELETE FROM "${schema}"."${derechoTable}" WHERE unidad = $1`,
            [id]
          );
          deleted.derechos = r3.rowCount;
        }

        // ── Paso 2a: Hijos de datos adicionales (antes de borrar el padre) ──
        // Obtener IDs de datos adicionales de este predio
        const datosIdsRes = await runQueryIfTableExists(
          'ilc_datosadicionaleslevantamientocatastral',
          `SELECT t_id FROM "${schema}".ilc_datosadicionaleslevantamientocatastral WHERE ilc_predio = $1`,
          [id]
        );
        const datosIds = datosIdsRes.rows.map(r => r.t_id);

        if (datosIds.length > 0) {
          // Contacto de visita
          const rcv = await runQueryIfTableExists(
            'ilc_contactovisita',
            `DELETE FROM "${schema}".ilc_contactovisita WHERE ilc_datos_adicionales = ANY($1)`,
            [datosIds]
          );
          deleted.contacto_visita = rcv.rowCount;

          // Novedad número predial
          const rnnp = await runQueryIfTableExists(
            'ilc_estructuranovedadnumeropredial',
            `DELETE FROM "${schema}".ilc_estructuranovedadnumeropredial WHERE ilc_dtsdcnltmntctstral_novedad_numeros_prediales = ANY($1)`,
            [datosIds]
          );
          deleted.novedad_npn = rnnp.rowCount;

          // Novedad FMI
          const rnfmi = await runQueryIfTableExists(
            'ilc_novedadfmi',
            `DELETE FROM "${schema}".ilc_novedadfmi WHERE ilc_dtsdcnltmntctstral_novedad_fmi = ANY($1)`,
            [datosIds]
          );
          deleted.novedad_fmi = rnfmi.rowCount;
        }

        // ── Paso 2b: Datos adicionales de levantamiento catastral ────────────
        const r4 = await runQueryIfTableExists(
          'ilc_datosadicionaleslevantamientocatastral',
          `DELETE FROM "${schema}".ilc_datosadicionaleslevantamientocatastral WHERE ilc_predio = $1`,
          [id]
        );
        deleted.datos_adicionales = r4.rowCount;

        // ── Paso 3: Estructura de avalúo ──────────────────────────────────
        const r5 = await runQueryIfTableExists(
          'ilc_estructuraavaluo',
          `DELETE FROM "${schema}".ilc_estructuraavaluo WHERE ilc_predio_avaluo = $1`,
          [id]
        );
        deleted.avaluo = r5.rowCount;

        // ── Paso 4: Referencia registral sistema antiguo ──────────────────
        const r6 = await runQueryIfTableExists(
          'extreferenciaregistralsistemaantiguo',
          `DELETE FROM "${schema}".extreferenciaregistralsistemaantiguo WHERE ilc_predio_referencia_registral_sistema_antiguo = $1`,
          [id]
        );
        deleted.ref_antigua = r6.rowCount;

        // ── Paso 5: Copropiedad (matriz y unidad predial) ─────────────────
        const r7 = await runQueryIfTableExists(
          'cr_predio_copropiedad',
          `DELETE FROM "${schema}".cr_predio_copropiedad WHERE matriz = $1 OR unidad_predial = $1`,
          [id]
        );
        deleted.copropiedad = r7.rowCount;

        // ── Paso 6: Datos PH / Condominio ─────────────────────────────────
        const r8 = await runQueryIfTableExists(
          'cr_datosphcondominio',
          `DELETE FROM "${schema}".cr_datosphcondominio WHERE ilc_predio = $1`,
          [id]
        );
        deleted.ph_condominio = r8.rowCount;

        // ── Paso 7: Trámites territoriales ───────────────────────────────
        const r9 = await runQueryIfTableExists(
          'lc_tramites_lc_predio',
          `DELETE FROM "${schema}".lc_tramites_lc_predio WHERE lc_tramitesderechosterritoriales = $1`,
          [id]
        );
        deleted.tramites = r9.rowCount;

        // ── Paso 8: Fuente de baunit (col_baunitfuente) ───────────────────
        const r10 = await runQueryIfTableExists(
          'col_baunitfuente',
          `DELETE FROM "${schema}".col_baunitfuente WHERE unidad = $1`,
          [id]
        );
        deleted.baunit_fuente = r10.rowCount;

        // ── Paso 9: Unidad-Fuente (col_unidadfuente) ──────────────────────
        const r11 = await runQueryIfTableExists(
          'col_unidadfuente',
          `DELETE FROM "${schema}".col_unidadfuente WHERE unidad = $1`,
          [id]
        );
        deleted.unidad_fuente = r11.rowCount;

        // ── Paso 10: Informalidad ─────────────────────────────────────────
        const r12 = await runQueryIfTableExists(
          'ilc_predio_informalidad',
          `DELETE FROM "${schema}".ilc_predio_informalidad WHERE igc_predio_formal = $1 OR igc_predio_informal = $1`,
          [id]
        );
        deleted.informalidad = r12.rowCount;

        // ── Paso 11: Vínculo unidad espacial ↔ predio (col_uebaunit) ─────
        const r13 = await runQueryIfTableExists(
          'col_uebaunit',
          `DELETE FROM "${schema}".col_uebaunit WHERE baunit = $1`,
          [id]
        );
        deleted.uebaunit = r13.rowCount;

        // ── Paso 12: Direcciones ──────────────────────────────────────────
        const r14 = await runQueryIfTableExists(
          'extdireccion',
          `DELETE FROM "${schema}".extdireccion WHERE ${prefix}predio_direccion = $1`,
          [id]
        );
        deleted.direcciones = r14.rowCount;

        // ── Paso 13: El predio ────────────────────────────────────────────
        const predioRes = await client.query(
          `DELETE FROM "${schema}"."${tableName}" WHERE t_id = $1 RETURNING t_id`,
          [id]
        );

        if (predioRes.rowCount === 0) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(404).json({ success: false, error: 'Predio no encontrado en el esquema LADM' });
        }

        await client.query('COMMIT');
        client.release();

        console.log(`🗑️ Predio ${id} eliminado del schema ${schema}. Cascada:`, deleted);
        return res.json({
          success: true,
          message: 'Predio y sus registros asociados eliminados exitosamente',
          deleted: { predio: 1, ...deleted }
        });

      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
        console.error('❌ Error eliminando predio LADM:', error);
        return res.status(500).json({
          success: false,
          error: 'Error eliminando el predio',
          message: error.message
        });
      }
    }

    // ── Eliminación en tabla interna del sistema ─────────────────────────────
    try {
      const result = await query(`DELETE FROM predios WHERE id = $1 RETURNING id`, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Predio no encontrado' });
      }
      return res.json({ success: true, message: 'Predio eliminado exitosamente' });
    } catch (error) {
      console.error('Error en deletePredio (sistema):', error);
      if (error.code === '23503') {
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar el predio porque tiene registros asociados'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo eliminar el predio'
      });
    }
  }
}

module.exports = new PrediosController();

