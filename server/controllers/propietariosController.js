const { query } = require('../config/database');
const { validationResult } = require('express-validator');

async function getOwnerSnapshot(schema_name, rrr, isStandard, hasFraccion) {
  try {
    let sqlQuery = "";
    if (isStandard) {
      sqlQuery = `
        SELECT
            tipogrupo.ilicode                              AS "TipoAgrupacion",
            derecho.t_id                                   AS "rrr",
            predio.numero_predial                          AS "Npn",
            tipoderecho.ilicode                            AS "TipoDerecho",
            COALESCE(tipodoc_directo.ilicode, 
                     tipodoc_miembro.ilicode)              AS "TipoDocumento",
            COALESCE(interesado_directo.documento_identidad,
                     miembro.documento_identidad)          AS "Documento",
            COALESCE(interesado_directo.primer_nombre,
                     miembro.primer_nombre)                AS "PrimerNombre",
            COALESCE(interesado_directo.segundo_nombre,
                     miembro.segundo_nombre)               AS "SegundoNombre",
            COALESCE(interesado_directo.primer_apellido,
                     miembro.primer_apellido)              AS "PrimerApellido",
            COALESCE(interesado_directo.segundo_apellido,
                     miembro.segundo_apellido)             AS "SegundoApellido",
            COALESCE(interesado_directo.razon_social,
                     miembro.razon_social)                 AS "RazonSocial",
            CASE 
              WHEN miembros.participacion IS NOT NULL THEN miembros.participacion * 100
              WHEN derecho.fraccion_derecho IS NOT NULL THEN CAST(derecho.fraccion_derecho AS NUMERIC) * 100
              ELSE 100 
            END                                            AS "Participacion"
        FROM "${schema_name}".lc_derecho derecho
        INNER JOIN "${schema_name}".lc_predio predio ON predio.t_id = derecho.unidad
        LEFT JOIN "${schema_name}".lc_derechotipo tipoderecho ON tipoderecho.t_id = derecho.tipo
        LEFT JOIN "${schema_name}".cr_interesado interesado_directo ON interesado_directo.t_id = derecho.interesado_cr_interesado
        LEFT JOIN "${schema_name}".cr_documentotipo tipodoc_directo ON tipodoc_directo.t_id = interesado_directo.tipo_documento
        LEFT JOIN "${schema_name}".cr_agrupacioninteresados agrupacion ON agrupacion.t_id = derecho.interesado_cr_agrupacioninteresados
        LEFT JOIN "${schema_name}".col_grupointeresadotipo tipogrupo ON tipogrupo.t_id = agrupacion.tipo
        LEFT JOIN "${schema_name}".col_miembros miembros ON miembros.agrupacion = agrupacion.t_id
        LEFT JOIN "${schema_name}".cr_interesado miembro ON miembro.t_id = miembros.interesado_cr_interesado
        LEFT JOIN "${schema_name}".cr_documentotipo tipodoc_miembro ON tipodoc_miembro.t_id = miembro.tipo_documento
        WHERE derecho.t_id = $1
        LIMIT 1
      `;
    } else {
      sqlQuery = `
        SELECT
            tipogrupo.ilicode                              AS "TipoAgrupacion",
            derecho.t_id                                   AS "rrr",
            predio.numero_predial_nacional                 AS "Npn",
            tipoderecho.ilicode                            AS "TipoDerecho",
            COALESCE(tipodoc_directo.ilicode, 
                     tipodoc_miembro.ilicode)              AS "TipoDocumento",
            COALESCE(interesado_directo.documento_identidad,
                     miembro.documento_identidad)          AS "Documento",
            COALESCE(interesado_directo.primer_nombre,
                     miembro.primer_nombre)                AS "PrimerNombre",
            COALESCE(interesado_directo.segundo_nombre,
                     miembro.segundo_nombre)               AS "SegundoNombre",
            COALESCE(interesado_directo.primer_apellido,
                     miembro.primer_apellido)              AS "PrimerApellido",
            COALESCE(interesado_directo.segundo_apellido,
                     miembro.segundo_apellido)             AS "SegundoApellido",
            COALESCE(interesado_directo.razon_social,
                     miembro.razon_social)                 AS "RazonSocial",
            CASE 
              WHEN miembros.participacion IS NOT NULL THEN miembros.participacion * 100
              WHEN derecho.fraccion_derecho IS NOT NULL THEN CAST(derecho.fraccion_derecho AS NUMERIC) * 100
              ELSE 100 
            END                                            AS "Participacion"
        FROM "${schema_name}".ilc_derecho derecho
        INNER JOIN "${schema_name}".ilc_predio predio ON predio.t_id = derecho.unidad
        LEFT JOIN "${schema_name}".ilc_derechocatastraltipo tipoderecho ON tipoderecho.t_id = derecho.tipo
        LEFT JOIN "${schema_name}".col_rrrinteresado colrinteresado ON colrinteresado.rrr = derecho.t_id
        LEFT JOIN "${schema_name}".ilc_interesado interesado_directo ON interesado_directo.t_id = colrinteresado.interesado_ilc_interesado
        LEFT JOIN "${schema_name}".cr_documentotipo tipodoc_directo ON tipodoc_directo.t_id = interesado_directo.tipo_documento
        LEFT JOIN "${schema_name}".cr_agrupacioninteresados agrupacion ON agrupacion.t_id = colrinteresado.interesado_cr_agrupacioninteresados
        LEFT JOIN "${schema_name}".col_grupointeresadotipo tipogrupo ON tipogrupo.t_id = agrupacion.tipo
        LEFT JOIN "${schema_name}".col_miembros miembros ON miembros.agrupacion = agrupacion.t_id
        LEFT JOIN "${schema_name}".ilc_interesado miembro ON miembro.t_id = miembros.interesado_ilc_interesado
        LEFT JOIN "${schema_name}".cr_documentotipo tipodoc_miembro ON tipodoc_miembro.t_id = miembro.tipo_documento
        WHERE derecho.t_id = $1
        LIMIT 1
      `;
    }

    const res = await query(sqlQuery, [rrr]);
    if (res.rows.length > 0) {
      const row = res.rows[0];
      const isNIT = row.TipoDocumento && row.TipoDocumento.toUpperCase() === 'NIT';
      if (isNIT) {
        let rSocial = row.RazonSocial;
        if (!rSocial || rSocial.trim() === '') {
          const nameParts = [
            row.PrimerNombre,
            row.SegundoNombre,
            row.PrimerApellido,
            row.SegundoApellido
          ].filter(p => p && p.trim() !== '');
          rSocial = nameParts.join(' ');
        }
        row.RazonSocial = rSocial || null;
        row.PrimerNombre = null;
        row.SegundoNombre = null;
        row.PrimerApellido = null;
        row.SegundoApellido = null;
      }
      return row;
    }
    return null;
  } catch (e) {
    console.warn(`[getOwnerSnapshot] Error al obtener snapshot de propietario/derecho RRR ${rrr}:`, e.message);
    return null;
  }
}

class PropietariosController {
  
  // Obtener la lista de propietarios, con soporte para consultas dinámicas en LADM-COL
  async getPropietarios(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array(), message: 'Error de validación en la consulta' });
    }
    try {
      const { schema_name, predio_id, page = 1, limit = 1000, search = '' } = req.query;

      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Falta parámetro de esquema',
          message: 'Debes proporcionar un esquema válido (ej. modelointerno) para consultar los propietarios LADM-COL.'
        });
      }

      // Validar que el schema existe
      const schemaCheck = await query(
        'SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1',
        [schema_name]
      );

      if (schemaCheck.rows.length === 0) {
         return res.status(404).json({
           success: false,
           error: 'Esquema no encontrado',
           message: `El esquema "${schema_name}" no existe en la base de datos`
         });
      }

      const offset = (page - 1) * limit;
      const queryParams = [];

      // 1. Detectar si es standard
      const standardResult = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'lc_predio'
        );
      `, [schema_name]);
      const isStandard = standardResult.rows[0]?.exists || false;

      const tableDerecho = isStandard ? 'lc_derecho' : 'ilc_derecho';
      const tablePredio = isStandard ? 'lc_predio' : 'ilc_predio';

      // 2. Verificar si la columna fraccion_derecho existe
      const colCheck = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2 AND column_name = 'fraccion_derecho'
        );
      `, [schema_name, tableDerecho]);
      const hasFraccion = colCheck.rows[0]?.exists || false;

      // Consulta de Propietarios LADM-COL inyectando el nombre del esquema dinámicamente
      let sqlQuery = "";
      if (isStandard) {
        sqlQuery = `
          SELECT
              tipogrupo.ilicode                              AS "TipoAgrupacion",
              derecho.t_id,
              colrfuente.fuente_administrativa,
              derecho.t_id                                   AS "rrr",
              predio.numero_predial                          AS "Npn",
              tipoderecho.ilicode                            AS "TipoDerecho",

              -- Documento unificado: directo o miembro de agrupación
              COALESCE(tipodoc_directo.ilicode, 
                       tipodoc_miembro.ilicode)              AS "TipoDocumento",

              COALESCE(interesado_directo.documento_identidad,
                       miembro.documento_identidad)          AS "Documento",

              COALESCE(interesado_directo.primer_nombre,
                       miembro.primer_nombre)                AS "PrimerNombre",

              COALESCE(interesado_directo.segundo_nombre,
                       miembro.segundo_nombre)               AS "SegundoNombre",

              COALESCE(interesado_directo.primer_apellido,
                       miembro.primer_apellido)              AS "PrimerApellido",

              COALESCE(interesado_directo.segundo_apellido,
                       miembro.segundo_apellido)             AS "SegundoApellido",
                       
              COALESCE(interesado_directo.razon_social,
                       miembro.razon_social)                 AS "RazonSocial",
              
              CASE 
                WHEN miembros.participacion IS NOT NULL THEN miembros.participacion * 100
                ${hasFraccion ? 'WHEN derecho.fraccion_derecho IS NOT NULL THEN CAST(derecho.fraccion_derecho AS NUMERIC) * 100' : ''}
                ELSE 100 
              END                                            AS "Participacion"

          FROM "${schema_name}".lc_derecho derecho
          
          -- Relación con el Predio
          INNER JOIN "${schema_name}".lc_predio predio
              ON predio.t_id = derecho.unidad

          -- Relación opcional con la Fuente
          LEFT JOIN "${schema_name}".col_rrrfuente colrfuente
              ON colrfuente.rrr = derecho.t_id

          -- Tipo de Derecho
          LEFT JOIN "${schema_name}".lc_derechotipo tipoderecho
              ON tipoderecho.t_id = derecho.tipo

          -- Interesado Directo
          LEFT JOIN "${schema_name}".cr_interesado interesado_directo
              ON interesado_directo.t_id = derecho.interesado_cr_interesado

          -- Tipo de documento del interesado directo
          LEFT JOIN "${schema_name}".cr_documentotipo tipodoc_directo
              ON tipodoc_directo.t_id = interesado_directo.tipo_documento

          -- Agrupación de Interesados
          LEFT JOIN "${schema_name}".cr_agrupacioninteresados agrupacion
              ON agrupacion.t_id = derecho.interesado_cr_agrupacioninteresados

          -- Tipo de Agrupación
          LEFT JOIN "${schema_name}".col_grupointeresadotipo tipogrupo
              ON tipogrupo.t_id = agrupacion.tipo

          -- Miembros de la agrupación
          LEFT JOIN "${schema_name}".col_miembros miembros
              ON miembros.agrupacion = agrupacion.t_id

          LEFT JOIN "${schema_name}".cr_interesado miembro
              ON miembro.t_id = miembros.interesado_cr_interesado

          LEFT JOIN "${schema_name}".cr_documentotipo tipodoc_miembro
              ON tipodoc_miembro.t_id = miembro.tipo_documento
              
          -- Aplicar búsqueda simple si existe (opcional)
          ${predio_id ? `WHERE predio.t_id = $1` : ''}
          LIMIT $${predio_id ? 2 : 1} OFFSET $${predio_id ? 3 : 2}
        `;
      } else {
        sqlQuery = `
          SELECT
              tipogrupo.ilicode                              AS "TipoAgrupacion",
              derecho.t_id,
              colrfuente.fuente_administrativa,
              derecho.t_id                                   AS "rrr",
              predio.numero_predial_nacional                 AS "Npn",
              tipoderecho.ilicode                            AS "TipoDerecho",

              -- Documento unificado: directo o miembro de agrupación
              COALESCE(tipodoc_directo.ilicode, 
                       tipodoc_miembro.ilicode)              AS "TipoDocumento",

              COALESCE(interesado_directo.documento_identidad,
                       miembro.documento_identidad)          AS "Documento",

              COALESCE(interesado_directo.primer_nombre,
                       miembro.primer_nombre)                AS "PrimerNombre",

              COALESCE(interesado_directo.segundo_nombre,
                       miembro.segundo_nombre)               AS "SegundoNombre",

              COALESCE(interesado_directo.primer_apellido,
                       miembro.primer_apellido)              AS "PrimerApellido",

              COALESCE(interesado_directo.segundo_apellido,
                       miembro.segundo_apellido)             AS "SegundoApellido",
                       
              COALESCE(interesado_directo.razon_social,
                       miembro.razon_social)                 AS "RazonSocial",
              
              CASE 
                WHEN miembros.participacion IS NOT NULL THEN miembros.participacion * 100
                ${hasFraccion ? 'WHEN derecho.fraccion_derecho IS NOT NULL THEN CAST(derecho.fraccion_derecho AS NUMERIC) * 100' : ''}
                ELSE 100 
              END                                            AS "Participacion"

          FROM "${schema_name}".ilc_derecho derecho
          
          -- Relación con el Predio
          INNER JOIN "${schema_name}".ilc_predio predio
              ON predio.t_id = derecho.unidad

          -- Relación opcional con la Fuente
          LEFT JOIN "${schema_name}".col_rrrfuente colrfuente
              ON colrfuente.rrr = derecho.t_id

          -- Tipo de Derecho
          LEFT JOIN "${schema_name}".ilc_derechocatastraltipo tipoderecho
              ON tipoderecho.t_id = derecho.tipo

          -- Relación con Interesados (directos o agrupaciones)
          LEFT JOIN "${schema_name}".col_rrrinteresado colrinteresado
              ON colrinteresado.rrr = derecho.t_id

          -- Interesado Directo
          LEFT JOIN "${schema_name}".ilc_interesado interesado_directo
              ON interesado_directo.t_id = colrinteresado.interesado_ilc_interesado

          -- Tipo de documento del interesado directo
          LEFT JOIN "${schema_name}".cr_documentotipo tipodoc_directo
              ON tipodoc_directo.t_id = interesado_directo.tipo_documento

          -- Agrupación de Interesados
          LEFT JOIN "${schema_name}".cr_agrupacioninteresados agrupacion
              ON agrupacion.t_id = colrinteresado.interesado_cr_agrupacioninteresados

          -- Tipo de Agrupación
          LEFT JOIN "${schema_name}".col_grupointeresadotipo tipogrupo
              ON tipogrupo.t_id = agrupacion.tipo

          -- Miembros de la agrupación
          LEFT JOIN "${schema_name}".col_miembros miembros
              ON miembros.agrupacion = agrupacion.t_id

          LEFT JOIN "${schema_name}".ilc_interesado miembro
              ON miembro.t_id = miembros.interesado_ilc_interesado

          LEFT JOIN "${schema_name}".cr_documentotipo tipodoc_miembro
              ON tipodoc_miembro.t_id = miembro.tipo_documento
              
          -- Aplicar búsqueda simple si existe (opcional)
          ${predio_id ? `WHERE predio.t_id = $1` : ''}
          LIMIT $${predio_id ? 2 : 1} OFFSET $${predio_id ? 3 : 2}
        `;
      }

      if (predio_id) {
        queryParams.push(predio_id);
      }
      queryParams.push(limit, offset);

      console.log(`🔍 Consultando propietarios en LADM esquema: ${schema_name}`);
      console.log(`🔍 Query: \n${sqlQuery}`);
      console.log(`🔍 Params: ${JSON.stringify(queryParams)}`);
      
      const result = await query(sqlQuery, queryParams);
      
      // Contar totales para la paginación de manera simplificada
      let countQuery = `SELECT COUNT(*) as total FROM "${schema_name}".col_rrrfuente colrfuente`;
      let countParams = [];
      if (predio_id) {
         countQuery += ` LEFT JOIN "${schema_name}"."${tableDerecho}" derecho ON derecho.t_id = colrfuente.rrr LEFT JOIN "${schema_name}"."${tablePredio}" predio ON predio.t_id = derecho.unidad WHERE predio.t_id = $1`;
         countParams.push(predio_id);
      }
      const countResult = await query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].total) || 0;

      const processedRows = result.rows.map(row => {
        const isNIT = row.TipoDocumento && row.TipoDocumento.toUpperCase() === 'NIT';
        if (isNIT) {
          let rSocial = row.RazonSocial;
          if (!rSocial || rSocial.trim() === '') {
            const nameParts = [
              row.PrimerNombre,
              row.SegundoNombre,
              row.PrimerApellido,
              row.SegundoApellido
            ].filter(p => p && p.trim() !== '');
            rSocial = nameParts.join(' ');
          }
          return {
            ...row,
            RazonSocial: rSocial || null,
            PrimerNombre: null,
            SegundoNombre: null,
            PrimerApellido: null,
            SegundoApellido: null
          };
        }
        return row;
      });

      res.json({
        success: true,
        data: {
          propietarios: processedRows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Error en getPropietarios:', error);

      if (error.code === '42P01') {
        return res.status(404).json({
          success: false,
          error: 'Tablas no encontradas',
          message: `El esquema "${req.query.schema_name}" está vacío o no contiene las tablas LADM requeridas (ej. ilc_derecho, col_rrrfuente).`
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudieron obtener los propietarios'
      });
    }
  }

  // Actualizar propietario LADM-COL
  async updatePropietario(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array(), message: 'Error de validación en los campos enviados' });
    }
    try {
      const { rrr } = req.params;
      const { schema_name } = req.query;
      const {
        documento,
        primer_nombre,
        segundo_nombre,
        primer_apellido,
        segundo_apellido,
        razon_social,
        tipo_documento,
        tipo_derecho,
        current_documento,
        participacion,
        escritura,
        entidad,
        fecha_escritura,
        tipo_fuente,
        disponibilidad
      } = req.body;

      if (!schema_name) {
        return res.status(400).json({ success: false, error: 'Falta el parámetro schema_name' });
      }

      // 1. Detectar si es standard
      const { query } = require('../config/database');
      const standardResult = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'lc_predio'
        );
      `, [schema_name]);
      const isStandard = standardResult.rows[0]?.exists || false;

      // Obtener el estado anterior para auditoría
      const colCheckSnapshot = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2 AND column_name = 'fraccion_derecho'
        );
      `, [schema_name, isStandard ? 'lc_derecho' : 'ilc_derecho']);
      const hasFraccionSnapshot = colCheckSnapshot.rows[0]?.exists || false;
      const oldState = await getOwnerSnapshot(schema_name, rrr, isStandard, hasFraccionSnapshot);

      const prefix = isStandard ? 'lc_' : 'ilc_';
      const tableDerecho = isStandard ? 'lc_derecho' : 'ilc_derecho';

      if (participacion !== undefined && participacion !== null) {
        const rrrRes = await query(
          `SELECT unidad FROM "${schema_name}"."${tableDerecho}" WHERE t_id = $1`,
          [rrr]
        );
        const predio_id = rrrRes.rows[0]?.unidad;

        if (predio_id) {
          // Verificar si existe la columna fraccion_derecho antes de realizar la suma
          const colCheck = await query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = $1 AND table_name = $2 AND column_name = 'fraccion_derecho'
          `, [schema_name, tableDerecho]);
          const hasFraccionCol = colCheck.rows.length > 0;

          if (hasFraccionCol) {
            const otherRightsRes = await query(
              `SELECT t_id, fraccion_derecho FROM "${schema_name}"."${tableDerecho}" WHERE unidad = $1 AND t_id != $2`,
              [predio_id, rrr]
            );
            let otherSum = 0;
            for (const r of otherRightsRes.rows) {
              otherSum += parseFloat(r.fraccion_derecho || 0) * 100;
            }

            const newPart = parseFloat(participacion);

            const oldRightRes = await query(
              `SELECT fraccion_derecho FROM "${schema_name}"."${tableDerecho}" WHERE t_id = $1`,
              [rrr]
            );
            const oldPartVal = oldRightRes.rows[0]?.fraccion_derecho;
            const oldPart = oldPartVal !== null && oldPartVal !== undefined 
              ? parseFloat(oldPartVal) * 100 
              : 100;

            if (otherSum + newPart > 100.01 && !(newPart < oldPart)) {
              return res.status(400).json({
                success: false,
                error: 'Suma de participaciones excede el 100%',
                message: `La suma de participaciones para este predio no puede superar el 100%. Las participaciones de los otros propietarios suman ${otherSum.toFixed(2)}%, e intentas asignar ${newPart.toFixed(2)}% (Total: ${(otherSum + newPart).toFixed(2)}%).`
              });
            }
          }
        }
      }

      // 2. Encontrar el interesado_id y miembro_id asociado al rrr y al current_documento
      let interesadoId = null;
      let miembroId = null;

      if (current_documento) {
        if (isStandard) {
          const ownersRes = await query(`
            SELECT 
              d.interesado_cr_interesado AS direct_id,
              i_dir.documento_identidad AS direct_doc,
              d.interesado_cr_agrupacioninteresados AS agrupacion_id,
              m.t_id AS miembro_id,
              i_memb.t_id AS miembro_interesado_id,
              i_memb.documento_identidad AS miembro_doc
            FROM "${schema_name}"."lc_derecho" d
            LEFT JOIN "${schema_name}"."cr_interesado" i_dir ON i_dir.t_id = d.interesado_cr_interesado
            LEFT JOIN "${schema_name}"."col_miembros" m ON m.agrupacion = d.interesado_cr_agrupacioninteresados
            LEFT JOIN "${schema_name}"."cr_interesado" i_memb ON i_memb.t_id = m.interesado_cr_interesado
            WHERE d.t_id = $1
          `, [rrr]);

          for (const row of ownersRes.rows) {
            if (row.direct_doc === current_documento) {
              interesadoId = row.direct_id;
              miembroId = null;
              break;
            } else if (row.miembro_doc === current_documento) {
              interesadoId = row.miembro_interesado_id;
              miembroId = row.miembro_id;
              break;
            }
          }
        } else {
          const ownersRes = await query(`
            SELECT 
              ri.interesado_ilc_interesado AS direct_id,
              i_dir.documento_identidad AS direct_doc,
              ri.interesado_cr_agrupacioninteresados AS agrupacion_id,
              m.t_id AS miembro_id,
              i_memb.t_id AS miembro_interesado_id,
              i_memb.documento_identidad AS miembro_doc
            FROM "${schema_name}"."ilc_derecho" d
            LEFT JOIN "${schema_name}"."col_rrrinteresado" ri ON ri.rrr = d.t_id
            LEFT JOIN "${schema_name}"."ilc_interesado" i_dir ON i_dir.t_id = ri.interesado_ilc_interesado
            LEFT JOIN "${schema_name}"."col_miembros" m ON m.agrupacion = ri.interesado_cr_agrupacioninteresados
            LEFT JOIN "${schema_name}"."ilc_interesado" i_memb ON i_memb.t_id = m.interesado_ilc_interesado
            WHERE d.t_id = $1
          `, [rrr]);

          for (const row of ownersRes.rows) {
            if (row.direct_doc === current_documento) {
              interesadoId = row.direct_id;
              miembroId = null;
              break;
            } else if (row.miembro_doc === current_documento) {
              interesadoId = row.miembro_interesado_id;
              miembroId = row.miembro_id;
              break;
            }
          }
        }
      }

      // Fallback si no se encontró usando current_documento (o si no se proporcionó)
      if (!interesadoId) {
        if (isStandard) {
          const derechoRes = await query(
            `SELECT interesado_cr_interesado FROM "${schema_name}"."lc_derecho" WHERE t_id = $1`,
            [rrr]
          );
          interesadoId = derechoRes.rows[0]?.interesado_cr_interesado;
        } else {
          const relationRes = await query(
            `SELECT interesado_ilc_interesado FROM "${schema_name}"."col_rrrinteresado" WHERE rrr = $1`,
            [rrr]
          );
          interesadoId = relationRes.rows[0]?.interesado_ilc_interesado;
        }
      }

      if (!interesadoId) {
        return res.status(404).json({ success: false, error: 'Interesado no encontrado para este derecho' });
      }

      // 3. Actualizar interesado
      const tableInteresado = isStandard ? 'cr_interesado' : 'ilc_interesado';
      const intFields = [];
      const intValues = [];
      let pIndex = 1;

      if (documento !== undefined) {
        intFields.push(`documento_identidad = $${pIndex++}`);
        intValues.push(documento);
      }
      if (primer_nombre !== undefined) {
        intFields.push(`primer_nombre = $${pIndex++}`);
        intValues.push(primer_nombre);
      }
      if (segundo_nombre !== undefined) {
        intFields.push(`segundo_nombre = $${pIndex++}`);
        intValues.push(segundo_nombre);
      }
      if (primer_apellido !== undefined) {
        intFields.push(`primer_apellido = $${pIndex++}`);
        intValues.push(primer_apellido);
      }
      if (segundo_apellido !== undefined) {
        intFields.push(`segundo_apellido = $${pIndex++}`);
        intValues.push(segundo_apellido);
      }
      if (razon_social !== undefined) {
        intFields.push(`razon_social = $${pIndex++}`);
        intValues.push(razon_social);
      }
      if (tipo_documento !== undefined) {
        intFields.push(`tipo_documento = $${pIndex++}`);
        intValues.push(tipo_documento === '' || tipo_documento === null ? null : parseInt(tipo_documento));
      }

      if (intFields.length > 0) {
        intValues.push(interesadoId);
        await query(
          `UPDATE "${schema_name}"."${tableInteresado}" SET ${intFields.join(', ')} WHERE t_id = $${pIndex}`,
          intValues
        );
      }

      // 4. Actualizar tipo de derecho si se proporciona
      if (tipo_derecho !== undefined) {
        const tableDerecho = isStandard ? 'lc_derecho' : 'ilc_derecho';
        await query(
          `UPDATE "${schema_name}"."${tableDerecho}" SET tipo = $1 WHERE t_id = $2`,
          [tipo_derecho === '' || tipo_derecho === null ? null : parseInt(tipo_derecho), rrr]
        );
      }

      // 5. Actualizar participación si se proporciona
      if (participacion !== undefined) {
        const partFraction = parseFloat(participacion) / 100;
        if (miembroId) {
          // Si hay un registro en col_miembros, actualizar participacion allí
          await query(
            `UPDATE "${schema_name}"."col_miembros" SET participacion = $1 WHERE t_id = $2`,
            [partFraction, miembroId]
          );
        } else {
          // Para derechos directos, intentar actualizar fraccion_derecho.
          // Si no existe la columna en la tabla de derechos, se crea dinámicamente.
          const tableDerecho = isStandard ? 'lc_derecho' : 'ilc_derecho';
          try {
            const colCheck = await query(`
              SELECT column_name
              FROM information_schema.columns 
              WHERE table_schema = $1 AND table_name = $2 AND column_name = 'fraccion_derecho'
              LIMIT 1
            `, [schema_name, tableDerecho]);

            let hasColumn = colCheck.rows.length > 0;
            if (!hasColumn) {
              try {
                console.log(`[updatePropietario] Creando columna fraccion_derecho en ${schema_name}.${tableDerecho}...`);
                await query(`ALTER TABLE "${schema_name}"."${tableDerecho}" ADD COLUMN fraccion_derecho VARCHAR(50)`);
                hasColumn = true;
              } catch (alterErr) {
                console.error(`[updatePropietario] No se pudo crear la columna fraccion_derecho:`, alterErr.message);
              }
            }

            if (hasColumn) {
              await query(
                `UPDATE "${schema_name}"."${tableDerecho}" SET fraccion_derecho = $1 WHERE t_id = $2`,
                [partFraction.toString(), rrr]
              );
              console.log(`[updatePropietario] fraccion_derecho actualizado en ${tableDerecho}`);
            } else {
              console.warn(`[updatePropietario] columna fraccion_derecho no existe y no pudo ser creada en ${schema_name}.${tableDerecho} — participación omitida.`);
            }
          } catch (partErr) {
            // No fallar toda la operación por no poder actualizar la participación
            console.warn(`[updatePropietario] No se pudo actualizar participación en ${tableDerecho}:`, partErr.message);
          }
        }
      }

      // 6. Actualizar fuente administrativa si se proporcionan campos relacionados
      if (escritura !== undefined || entidad !== undefined || fecha_escritura !== undefined || tipo_fuente !== undefined || disponibilidad !== undefined) {
        const fuenteRes = await query(
          `SELECT fuente_administrativa FROM "${schema_name}"."col_rrrfuente" WHERE rrr = $1`,
          [rrr]
        );
        const fuenteId = fuenteRes.rows[0]?.fuente_administrativa;
        
        if (fuenteId) {
          const tableFuente = isStandard ? 'lc_fuenteadministrativa' : 'ilc_fuenteadministrativa';
          
          // Verificar dinámicamente qué columnas existen en la tabla de fuentes
          const colCheck = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = $1 AND table_name = $2
          `, [schema_name, tableFuente]);
          const existingCols = new Set(colCheck.rows.map(r => r.column_name));

          const fuFields = [];
          const fuValues = [];
          let fuIndex = 1;
          
          if (escritura !== undefined && existingCols.has('numero_fuente')) {
            fuFields.push(`numero_fuente = $${fuIndex++}`);
            fuValues.push(escritura);
          }
          if (entidad !== undefined && existingCols.has('ente_emisor')) {
            fuFields.push(`ente_emisor = $${fuIndex++}`);
            fuValues.push(entidad);
          }
          if (fecha_escritura !== undefined && existingCols.has('fecha_documento_fuente')) {
            fuFields.push(`fecha_documento_fuente = $${fuIndex++}`);
            fuValues.push(fecha_escritura === '' || fecha_escritura === null ? null : fecha_escritura);
          }
          if (tipo_fuente !== undefined && tipo_fuente !== null && tipo_fuente !== '' && existingCols.has('tipo')) {
            fuFields.push(`tipo = $${fuIndex++}`);
            fuValues.push(parseInt(tipo_fuente));
          }
          if (disponibilidad !== undefined && existingCols.has('estado_disponibilidad')) {
            fuFields.push(`estado_disponibilidad = $${fuIndex++}`);
            fuValues.push(disponibilidad === '' || disponibilidad === null ? null : parseInt(disponibilidad));
          }
          
          if (fuFields.length > 0) {
            fuValues.push(fuenteId);
            await query(
              `UPDATE "${schema_name}"."${tableFuente}" SET ${fuFields.join(', ')} WHERE t_id = $${fuIndex}`,
              fuValues
            );
          }
        }
      }

      // Registrar log de auditoría
      const newState = await getOwnerSnapshot(schema_name, rrr, isStandard, hasFraccionSnapshot);
      await query(
        `INSERT INTO audit_logs (user_id, action, module, details, is_critical, previous_state, new_state) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.id,
          'MODIFICACION_PROPIETARIO',
          'PROPIETARIOS',
          `Propietario con RRR ${rrr} y NPN ${oldState?.Npn || 'desconocido'} en esquema "${schema_name}" actualizado.`,
          true,
          JSON.stringify(oldState),
          JSON.stringify(newState)
        ]
      );

      res.json({
        success: true,
        message: 'Propietario actualizado exitosamente'
      });

    } catch (error) {
      console.error('Error en updatePropietario:', error);
      res.status(500).json({
        success: false,
        error: 'Error actualizando propietario',
        message: error.message
      });
    }
  }

  // Crear propietario LADM-COL asociado a un predio
  async createPropietario(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array(), message: 'Error de validación en los campos enviados' });
    }
    try {
      const { schema_name } = req.query;
      const {
        predio_id,
        documento,
        primer_nombre,
        segundo_nombre,
        primer_apellido,
        segundo_apellido,
        razon_social,
        tipo_documento,
        tipo_derecho,
        participacion,
        escritura,
        entidad,
        fecha_escritura,
        tipo_fuente,
        disponibilidad
      } = req.body;

      if (!schema_name) {
        return res.status(400).json({ success: false, error: 'Falta el parámetro schema_name' });
      }
      if (!predio_id) {
        return res.status(400).json({ success: false, error: 'Falta el parámetro predio_id' });
      }
      if (!documento) {
        return res.status(400).json({ success: false, error: 'Falta el número de documento' });
      }

      const crypto = require('crypto');

      // 1. Detectar si es standard
      const standardResult = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'lc_predio'
        );
      `, [schema_name]);
      const isStandard = standardResult.rows[0]?.exists || false;

      const tableInteresado = isStandard ? 'cr_interesado' : 'ilc_interesado';
      const tableDerecho = isStandard ? 'lc_derecho' : 'ilc_derecho';
      const tableFuente = isStandard ? 'lc_fuenteadministrativa' : 'ilc_fuenteadministrativa';

      // Validar que la suma de participaciones no supere el 100% (si la columna fraccion_derecho existe)
      const colCheck = await query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2 AND column_name = 'fraccion_derecho'
      `, [schema_name, tableDerecho]);
      const hasFraccionCol = colCheck.rows.length > 0;

      if (hasFraccionCol) {
        const existingRightsRes = await query(
          `SELECT t_id, fraccion_derecho FROM "${schema_name}"."${tableDerecho}" WHERE unidad = $1`,
          [predio_id]
        );
        let existingSum = 0;
        for (const r of existingRightsRes.rows) {
          existingSum += parseFloat(r.fraccion_derecho || 0) * 100;
        }
        
        const newPart = participacion ? parseFloat(participacion) : 100;
        if (existingSum + newPart > 100.01) {
          return res.status(400).json({
            success: false,
            error: 'Suma de participaciones excede el 100%',
            message: `La suma de participaciones para este predio no puede superar el 100%. Las participaciones existentes suman ${existingSum.toFixed(2)}%, e intentas asignar ${newPart.toFixed(2)}% (Total: ${(existingSum + newPart).toFixed(2)}%).`
          });
        }
      }

      // 2. Insertar Interesado
      const intTid = crypto.randomUUID();
      const intLocalId = documento;
      // Tipo de interesado (Persona Natural = 1037, Persona Jurídica = 1038)
      const intTipo = razon_social ? 1038 : 1037; 
      // Tipo documento default: Cedula_Ciudadania (678)
      const docType = tipo_documento ? parseInt(tipo_documento, 10) : 678;

      const intRes = await query(`
        INSERT INTO "${schema_name}"."${tableInteresado}" (
          t_ili_tid, tipo, tipo_documento, documento_identidad, 
          primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, 
          razon_social, autorreconocimientocampesino, comienzo_vida_util_version, 
          espacio_de_nombres, local_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, $11, $12)
        RETURNING t_id
      `, [
        intTid, intTipo, docType, documento,
        primer_nombre || null, segundo_nombre || null, primer_apellido || null, segundo_apellido || null,
        razon_social || null, false, 'GPCONES_Interesados', intLocalId
      ]);
      const interesadoId = intRes.rows[0].t_id;

      // 3. Insertar Derecho
      const derTid = crypto.randomUUID();
      const derLocalId = crypto.randomUUID();
      // Tipo derecho default: Dominio (977)
      const derType = tipo_derecho ? parseInt(tipo_derecho, 10) : 977;

      let rrrId;
      if (isStandard) {
        // En estándar, lc_derecho tiene columna directa al interesado y fraccion_derecho (en formato string o numeric)
        const colCheck = await query(`
          SELECT column_name
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = 'lc_derecho' AND column_name = 'fraccion_derecho'
          LIMIT 1
        `, [schema_name]);
        
        let hasFraccion = colCheck.rows.length > 0;
        if (!hasFraccion) {
          try {
            console.log(`[createPropietario] Creando columna fraccion_derecho en ${schema_name}.lc_derecho...`);
            await query(`ALTER TABLE "${schema_name}"."lc_derecho" ADD COLUMN fraccion_derecho VARCHAR(50)`);
            hasFraccion = true;
          } catch (alterErr) {
            console.error(`[createPropietario] No se pudo crear la columna fraccion_derecho:`, alterErr.message);
          }
        }

        const partFraction = participacion ? (parseFloat(participacion) / 100).toString() : '1';

        const standardFields = [
          't_ili_tid', 'tipo', 'posesion_ancestral_y_o_tradicional', 
          'fecha_inicio_tenencia', 'unidad', 'espacio_de_nombres', 'local_id', 
          'interesado_cr_interesado'
        ];
        const standardValues = [
          derTid, derType, false, new Date(), parseInt(predio_id, 10), 
          'GPCONES_Derechos', derLocalId, interesadoId
        ];

        if (hasFraccion) {
          standardFields.push('fraccion_derecho');
          standardValues.push(partFraction);
        }

        const placeholders = standardFields.map((_, idx) => `$${idx + 1}`);

        const derRes = await query(`
          INSERT INTO "${schema_name}"."lc_derecho" (${standardFields.join(', ')})
          VALUES (${placeholders.join(', ')})
          RETURNING t_id
        `, standardValues);
        rrrId = derRes.rows[0].t_id;
      } else {
        // En no estándar, ilc_derecho no tiene link directo, usa tabla intermedia col_rrrinteresado.
        // Pero si tiene fraccion_derecho, podemos guardarlo en ilc_derecho!
        const colCheck = await query(`
          SELECT column_name
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = 'ilc_derecho' AND column_name = 'fraccion_derecho'
          LIMIT 1
        `, [schema_name]);
        
        let hasFraccion = colCheck.rows.length > 0;
        if (!hasFraccion) {
          try {
            console.log(`[createPropietario] Creando columna fraccion_derecho en ${schema_name}.ilc_derecho...`);
            await query(`ALTER TABLE "${schema_name}"."ilc_derecho" ADD COLUMN fraccion_derecho VARCHAR(50)`);
            hasFraccion = true;
          } catch (alterErr) {
            console.error(`[createPropietario] No se pudo crear la columna fraccion_derecho:`, alterErr.message);
          }
        }

        const partFraction = participacion ? (parseFloat(participacion) / 100).toString() : '1';

        const nonStandardFields = [
          't_ili_tid', 'tipo', 'posesion_ancestral_y_o_tradicional',
          'fecha_inicio_tenencia', 'unidad', 'comienzo_vida_util_version',
          'espacio_de_nombres', 'local_id'
        ];
        const nonStandardValues = [
          derTid, derType, false, new Date(), parseInt(predio_id, 10),
          new Date(), 'GPCONES_Derechos', derLocalId
        ];

        if (hasFraccion) {
          nonStandardFields.push('fraccion_derecho');
          nonStandardValues.push(partFraction);
        }

        const placeholders = nonStandardFields.map((_, idx) => `$${idx + 1}`);

        const derRes = await query(`
          INSERT INTO "${schema_name}"."ilc_derecho" (${nonStandardFields.join(', ')})
          VALUES (${placeholders.join(', ')})
          RETURNING t_id
        `, nonStandardValues);
        rrrId = derRes.rows[0].t_id;

        // Insertar relación RRR - Interesado
        await query(`
          INSERT INTO "${schema_name}"."col_rrrinteresado" (
            rrr, interesado_ilc_interesado
          ) VALUES ($1, $2)
        `, [rrrId, interesadoId]);
      }

      // 4. Insertar Fuente Administrativa
      const fuTid = crypto.randomUUID();
      const fuLocalId = escritura || crypto.randomUUID();
      // Tipo fuente default: Escritura_Publica (806)
      const fuType = tipo_fuente ? parseInt(tipo_fuente, 10) : 806;
      // Disponibilidad default: Disponible (934)
      const dispType = disponibilidad ? parseInt(disponibilidad, 10) : 934;

      const fuRes = await query(`
        INSERT INTO "${schema_name}"."${tableFuente}" (
          t_ili_tid, tipo, ente_emisor, numero_fuente,
          estado_disponibilidad, fecha_documento_fuente,
          espacio_de_nombres, local_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING t_id
      `, [
        fuTid, fuType, entidad || 'Notaría', escritura || '—',
        dispType, fecha_escritura ? new Date(fecha_escritura) : null,
        'GPCONES_Fuentes', fuLocalId
      ]);
      const fuenteId = fuRes.rows[0].t_id;

      // 5. Vincular RRR con Fuente
      await query(`
        INSERT INTO "${schema_name}"."col_rrrfuente" (
          rrr, fuente_administrativa
        ) VALUES ($1, $2)
      `, [rrrId, fuenteId]);

      // Registrar log de auditoría
      const colCheckSnapshot = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2 AND column_name = 'fraccion_derecho'
        );
      `, [schema_name, isStandard ? 'lc_derecho' : 'ilc_derecho']);
      const hasFraccionSnapshot = colCheckSnapshot.rows[0]?.exists || false;
      const newState = await getOwnerSnapshot(schema_name, rrrId, isStandard, hasFraccionSnapshot);

      await query(
        `INSERT INTO audit_logs (user_id, action, module, details, is_critical, previous_state, new_state) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.id,
          'CREACION_PROPIETARIO',
          'PROPIETARIOS',
          `Propietario creado con RRR ${rrrId} y NPN ${newState?.Npn || 'desconocido'} en esquema "${schema_name}".`,
          true,
          null,
          JSON.stringify(newState)
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Propietario agregado exitosamente',
        data: {
          rrr_id: rrrId,
          interesado_id: interesadoId,
          fuente_id: fuenteId
        }
      });

    } catch (error) {
      console.error('Error en createPropietario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

}

module.exports = new PropietariosController();
