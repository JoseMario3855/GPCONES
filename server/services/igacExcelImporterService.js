const db = require('../config/database');
const ExcelJS = require('exceljs');
const crypto = require('crypto');

class IGACExcelImporterService {
  
  async importExcel(filePath, schemaName) {
    const { query } = db;
    console.log(`🚀 [EXCEL IMPORT] Starting import from: ${filePath} into schema: ${schemaName}`);

    // 1. Initialize dataset and basket metadata records
    await this.initializeMetadata(schemaName);

    // 2. Load and parse the workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // Check sheets
    const r1Sheet = workbook.getWorksheet('R1_Datos');
    const r2Sheet = workbook.getWorksheet('R2_Datos');

    if (!r1Sheet) {
      throw new Error("No se encontró la hoja de cálculo 'R1_Datos' en el archivo Excel");
    }
    if (!r2Sheet) {
      throw new Error("No se encontró la hoja de cálculo 'R2_Datos' en el archivo Excel");
    }

    console.log(`📂 [EXCEL IMPORT] R1 Rows: ${r1Sheet.rowCount}, R2 Rows: ${r2Sheet.rowCount}`);

    // Map headers dynamically
    const headersR1 = this.mapHeaders(r1Sheet);
    const headersR2 = this.mapHeaders(r2Sheet);

    // Group rows by NPN
    const prediosMap = new Map();

    // Parse R1_Datos
    for (let r = 2; r <= r1Sheet.rowCount; r++) {
      const row = r1Sheet.getRow(r);
      const npn = this.getCellValue(row, headersR1['NPN']);
      if (!npn) continue;

      let predio = prediosMap.get(npn);
      if (!predio) {
        predio = {
          npn: npn,
          departamento: this.getCellValue(row, headersR1['DEPARTAMENTO']) || '00',
          municipio: this.getCellValue(row, headersR1['MUNICIPIO']) || '000',
          numero_del_predio: this.getCellValue(row, headersR1['NUMERO_DEL_PREDIO']) || '',
          direccion: this.getCellValue(row, headersR1['DIRECCION']) || 'SIN DIRECCION',
          destino_economico: this.getCellValue(row, headersR1['DESTINO_ECONOMICO']) || '',
          destino_economico_desc: this.getCellValue(row, headersR1['DESTINO_ECONOMICO_DESC']) || '',
          area_terreno: this.parseImplicitDecimal(this.getCellValue(row, headersR1['AREA_TERRENO'])),
          avaluo: this.parseImplicitDecimal(this.getCellValue(row, headersR1['AVALUO'])),
          vigencia: this.getCellValue(row, headersR1['VIGENCIA']) || '',
          numero_predial_anterior: this.getCellValue(row, headersR1['NUMERO_PREDIAL_ANTERIOR']) || '',
          owners: [],
          constructions: []
        };
        prediosMap.set(npn, predio);
      }

      const ownerName = this.getCellValue(row, headersR1['NOMBRE']);
      const docNum = this.getCellValue(row, headersR1['NUMERO_DOCUMENTO']);
      if (ownerName || docNum) {
        const owner = {
          nombre: ownerName || 'PROPIETARIO DESCONOCIDO',
          tipo_documento: this.getCellValue(row, headersR1['TIPO_DOCUMENTO']) || '',
          tipo_documento_desc: this.getCellValue(row, headersR1['TIPO_DOCUMENTO_DESC']) || '',
          numero_documento: docNum || '0',
          estado_civil: this.getCellValue(row, headersR1['ESTADO_CIVIL']) || '',
          estado_civil_desc: this.getCellValue(row, headersR1['ESTADO_CIVIL_DESC']) || ''
        };

        const duplicate = predio.owners.some(o => o.numero_documento === owner.numero_documento && o.nombre === owner.nombre);
        if (!duplicate) {
          predio.owners.push(owner);
        }
      }
    }

    // Parse R2_Datos
    for (let r = 2; r <= r2Sheet.rowCount; r++) {
      const row = r2Sheet.getRow(r);
      const npn = this.getCellValue(row, headersR2['NPN']);
      if (!npn) continue;

      const predio = prediosMap.get(npn);
      if (!predio) continue; // NPN not in R1

      predio.matricula = this.getCellValue(row, headersR2['MATRICULA_INMOBILIARIA']) || '';

      // Parse up to 3 constructions
      for (let i = 1; i <= 3; i++) {
        const suffix = `_${i}`;
        const areaVal = this.getCellValue(row, headersR2[`AREA_CONSTRUIDA${suffix}`]);
        const area = this.parseImplicitDecimal(areaVal);

        if (area > 0) {
          const construction = {
            area_construida: area,
            pisos: parseInt(this.getCellValue(row, headersR2[`PISOS${suffix}`])) || 1,
            estrato: this.getCellValue(row, headersR2[`ESTRATO${suffix}`]) || '0',
            uso: this.getCellValue(row, headersR2[`USO${suffix}`]) || '',
            habitaciones: parseInt(this.getCellValue(row, headersR2[`HABITACIONES${suffix}`])) || 0,
            banos: parseInt(this.getCellValue(row, headersR2[`BANOS${suffix}`])) || 0,
            locales: parseInt(this.getCellValue(row, headersR2[`LOCALES${suffix}`])) || 0,
            puntaje: parseInt(this.getCellValue(row, headersR2[`PUNTAJE${suffix}`])) || 0
          };
          predio.constructions.push(construction);
        }
      }
    }

    console.log(`📦 [EXCEL IMPORT] Unique NPNs found: ${prediosMap.size}`);

    // 3. Write data into the PostgreSQL schema inside a transaction
    let currentFicha = 1;
    let totalImported = 0;
    
    await query('BEGIN');
    
    try {
      for (const [npn, predio] of prediosMap.entries()) {
        const fichaNumber = String(currentFicha++);
        
        // ORIP Ciruculo & Matricula
        let oripCircle = '420';
        let matriculaInt = null;
        if (predio.matricula) {
          const parts = predio.matricula.split('-');
          if (parts.length > 1) {
            oripCircle = parts[0].trim();
            const rawMat = parseInt(parts[1].replace(/[^\d]/g, ''));
            matriculaInt = isNaN(rawMat) ? null : rawMat;
          } else {
            const rawMat = parseInt(predio.matricula.replace(/[^\d]/g, ''));
            matriculaInt = isNaN(rawMat) ? null : rawMat;
          }
        }

        if (matriculaInt !== null && matriculaInt > 2147483647) {
          matriculaInt = matriculaInt % 1000000000;
        }
        if (matriculaInt !== null && matriculaInt <= 0) {
          matriculaInt = null;
        }

        // Destinacion economica ID mapping
        const destinacionId = this.getDestinacionId(predio.destino_economico_desc, predio.destino_economico);

        // 3.1. Insert into ilc_predio
        const predioRes = await query(`
          INSERT INTO "${schemaName}".ilc_predio (
            t_id, t_basket, t_type, t_ili_tid, departamento, municipio, codigo_orip,
            matricula_inmobiliaria, area_catastral_terreno, numero_predial_nacional,
            tipo, condicion_predio, destinacion_economica, area_registral_m2,
            nombre, comienzo_vida_util_version, espacio_de_nombres, local_id
          ) VALUES (
            nextval('"${schemaName}".t_ili2db_seq'), $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, $15, $16
          ) RETURNING t_id
        `, [
          2, // t_basket ID for Interno_Levantamiento_Catastral
          'ilc_predio',
          crypto.randomUUID(),
          predio.departamento,
          predio.municipio,
          oripCircle,
          matriculaInt,
          predio.area_terreno,
          predio.npn,
          457, // tipo: Privado.Privado
          524, // condicion_predio: NPH
          destinacionId,
          predio.area_terreno,
          predio.direccion, // Use direccion as name
          fichaNumber, // espacio_de_nombres is used as "NroFicha"
          predio.npn // local_id
        ]);

        const predioTId = predioRes.rows[0].t_id;

        // 3.2. Insert into cr_terreno
        const terrenoRes = await query(`
          INSERT INTO "${schemaName}".cr_terreno (
            t_id, t_basket, t_type, t_ili_tid, geometria, dimension, etiqueta,
            relacion_superficie, comienzo_vida_util_version, espacio_de_nombres, local_id
          ) VALUES (
            nextval('"${schemaName}".t_ili2db_seq'), $1, $2, $3,
            ST_GeomFromText('MULTISURFACE Z (CURVEPOLYGON Z (COMPOUNDCURVE Z ((1000000 1000000 0, 1000000 1000001 0, 1000001 1000001 0, 1000001 1000000 0, 1000000 1000000 0))))', 3116),
            $4, $5, $6, CURRENT_TIMESTAMP, $7, $8
          ) RETURNING t_id
        `, [
          2,
          'cr_terreno',
          crypto.randomUUID(),
          null, null, null,
          schemaName,
          `${predio.npn}_terreno`
        ]);

        const terrenoTId = terrenoRes.rows[0].t_id;

        // 3.3. Insert into col_uebaunit (links terrain and predio)
        await query(`
          INSERT INTO "${schemaName}".col_uebaunit (
            t_id, t_basket, t_type, t_ili_tid, ue_cr_terreno, ue_cr_unidadconstruccion, baunit
          ) VALUES (
            nextval('"${schemaName}".t_ili2db_seq'), $1, $2, $3, $4, NULL, $5
          )
        `, [
          2,
          'col_uebaunit',
          crypto.randomUUID(),
          terrenoTId,
          predioTId
        ]);

        // Insert owners (interesados), rights (derechos), and link them
        for (const owner of predio.owners) {
          const docTipoId = this.getDocumentoTipoId(owner.tipo_documento_desc, owner.tipo_documento);
          const interesadoTipo = this.getInteresadoTipo(docTipoId, owner.nombre);
          const nameParts = this.splitFullName(owner.nombre);

          // 3.4. Insert into ilc_interesado
          const interesadoRes = await query(`
            INSERT INTO "${schemaName}".ilc_interesado (
              t_id, t_basket, t_type, t_ili_tid, tipo, tipo_documento, documento_identidad,
              primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
              sexo, grupo_etnico, autorreconocimientocampesino, razon_social, nombre,
              comienzo_vida_util_version, espacio_de_nombres, local_id
            ) VALUES (
              nextval('"${schemaName}".t_ili2db_seq'), $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10, $11, NULL, false, $12, $13,
              CURRENT_TIMESTAMP, $14, $15
            ) RETURNING t_id
          `, [
            2,
            'ilc_interesado',
            crypto.randomUUID(),
            interesadoTipo,
            docTipoId,
            owner.numero_documento,
            nameParts.primer_nombre,
            nameParts.segundo_nombre,
            nameParts.primer_apellido,
            nameParts.segundo_apellido,
            847, // sexo: Sin determinar
            interesadoTipo === 2 ? owner.nombre : null, // razon_social
            owner.nombre, // nombre completo
            schemaName,
            owner.numero_documento
          ]);

          const interesadoTId = interesadoRes.rows[0].t_id;

          // 3.5. Insert into ilc_derecho
          const derechoRes = await query(`
            INSERT INTO "${schemaName}".ilc_derecho (
              t_id, t_basket, t_type, t_ili_tid, tipo, posesion_ancestral_y_o_tradicional,
              fecha_inicio_tenencia, descripcion, unidad, comienzo_vida_util_version,
              espacio_de_nombres, local_id
            ) VALUES (
              nextval('"${schemaName}".t_ili2db_seq'), $1, $2, $3, $4, false,
              CURRENT_DATE, $5, $6, CURRENT_TIMESTAMP, $7, $8
            ) RETURNING t_id
          `, [
            2,
            'ilc_derecho',
            crypto.randomUUID(),
            914, // Dominio
            'Importado desde Excel IGAC R1/R2',
            predioTId,
            schemaName,
            `${predio.npn}_derecho_${interesadoTId}`
          ]);

          const derechoTId = derechoRes.rows[0].t_id;

          // 3.6. Insert into col_rrrinteresado (links derecho and interesado)
          await query(`
            INSERT INTO "${schemaName}".col_rrrinteresado (
              t_id, t_basket, t_type, t_ili_tid, rrr, interesado_ilc_interesado, interesado_cr_agrupacioninteresados
            ) VALUES (
              nextval('"${schemaName}".t_ili2db_seq'), $1, $2, $3, $4, $5, NULL
            )
          `, [
            2,
            'col_rrrinteresado',
            crypto.randomUUID(),
            derechoTId,
            interesadoTId
          ]);
        }

        // Insert constructions if any
        let constIndex = 1;
        for (const constr of predio.constructions) {
          const { usoId, tipoId } = this.getUsoAndTipo(constr.uso);
          // 3.7. Insert into ilc_caracteristicasunidadconstruccion
          const caractRes = await query(`
            INSERT INTO "${schemaName}".ilc_caracteristicasunidadconstruccion (
              t_id, t_basket, t_type, t_ili_tid, tipo_unidad_construccion,
              total_plantas, anio_construccion, uso, usos_tradicionales_culturales,
              identificador, comienzo_vida_util_version, espacio_de_nombres, local_id,
              area_construida, area_privada_construida
            ) VALUES (
              nextval('"${schemaName}".t_ili2db_seq'), $1, $2, $3, $4,
              $5, 2023, $6, NULL, $7, CURRENT_TIMESTAMP, $8, $9, $10, $11
            ) RETURNING t_id
          `, [
            2,
            'ilc_caracteristicasunidadconstruccion',
            crypto.randomUUID(),
            tipoId, // tipo_unidad_construccion mapped dynamically
            constr.pisos,
            usoId, // uso mapped dynamically
            `${fichaNumber}_${constIndex}`,
            schemaName,
            `${predio.npn}_caract_${constIndex}`,
            constr.area_construida,
            constr.area_construida
          ]);

          const caractTId = caractRes.rows[0].t_id;

          // 3.8. Insert into cr_unidadconstruccion
          const constrRes = await query(`
            INSERT INTO "${schemaName}".cr_unidadconstruccion (
              t_id, t_basket, t_type, t_ili_tid, tipo_planta, planta_ubicacion, altura,
              geometria, cr_caracteristicasunidadconstruccion, dimension, etiqueta,
              relacion_superficie, comienzo_vida_util_version, espacio_de_nombres, local_id
            ) VALUES (
              nextval('"${schemaName}".t_ili2db_seq'), $1, $2, $3, $4, 1, $5,
              ST_GeomFromText('MULTISURFACE Z (CURVEPOLYGON Z (COMPOUNDCURVE Z ((1000000 1000000 0, 1000000 1000001 0, 1000001 1000001 0, 1000001 1000000 0, 1000000 1000000 0))))', 3116),
              $6, NULL, NULL, NULL, CURRENT_TIMESTAMP, $7, $8
            ) RETURNING t_id
          `, [
            2,
            'cr_unidadconstruccion',
            crypto.randomUUID(),
            321, // tipo_planta default: Piso (321)
            constr.pisos * 3, // height ~3m per floor
            caractTId,
            schemaName,
            `${predio.npn}_uc_${constIndex}`
          ]);

          const constrTId = constrRes.rows[0].t_id;

          // 3.9. Insert into col_uebaunit to link predio and construction
          await query(`
            INSERT INTO "${schemaName}".col_uebaunit (
              t_id, t_basket, t_type, t_ili_tid, ue_cr_terreno, ue_cr_unidadconstruccion, baunit
            ) VALUES (
              nextval('"${schemaName}".t_ili2db_seq'), $1, $2, $3, NULL, $4, $5
            )
          `, [
            2,
            'col_uebaunit',
            crypto.randomUUID(),
            constrTId,
            predioTId
          ]);

          constIndex++;
        }

        totalImported++;
      }

      await query('COMMIT');
      console.log(`✅ [EXCEL IMPORT] Transaction committed successfully! Imported ${totalImported} predios.`);
      return { totalImported };

    } catch (err) {
      await query('ROLLBACK');
      console.error('❌ [EXCEL IMPORT] Transaction rolled back due to error:', err);
      throw err;
    }
  }

  // Map sheet header values to column index
  mapHeaders(sheet) {
    const headers = {};
    if (sheet.rowCount > 0) {
      sheet.getRow(1).eachCell((cell, colNumber) => {
        if (cell.value) {
          headers[String(cell.value).toUpperCase().trim()] = colNumber;
        }
      });
    }
    return headers;
  }

  // Helper to read clean cell values
  getCellValue(row, colIndex) {
    if (!colIndex) return '';
    const cell = row.getCell(colIndex);
    if (!cell || cell.value === null || cell.value === undefined) return '';
    if (typeof cell.value === 'object') {
      if (cell.value.result !== undefined) return String(cell.value.result).trim();
      if (cell.value.text !== undefined) return String(cell.value.text).trim();
      return JSON.stringify(cell.value).trim();
    }
    return String(cell.value).trim();
  }

  // Clean and parse padded numeric strings
  parseImplicitDecimal(val) {
    if (!val) return 0;
    const cleaned = val.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    return parsed / 100.0;
  }

  // Map destiny strings or codes to lookup table IDs
  getDestinacionId(desc, code) {
    const destinacionMap = {
      'AGROPECUARIO': 655,
      'AGRICOLA': 653,
      'AGRÍCOLA': 653,
      'HABITACIONAL': 661,
      'RESIDENCIAL': 661,
      'COMERCIAL': 657,
      'INDUSTRIAL': 662,
      'LOTE RURAL': 679
    };

    if (desc) {
      const key = String(desc).toUpperCase().trim();
      if (destinacionMap[key]) return destinacionMap[key];
    }
    if (code) {
      const c = String(code).toUpperCase().trim();
      if (c === 'D') return 655; // Agropecuario
      if (c === 'A') return 661; // Habitacional
      if (c === 'I') return 662; // Industrial
      if (c === 'C') return 657; // Comercial
    }
    return 661; // Habitacional default
  }

  // Map document type strings or codes to lookup table IDs
  getDocumentoTipoId(desc, code) {
    if (desc) {
      const d = String(desc).toUpperCase().trim();
      if (d.includes('CEDULA DE CIUDADANIA') || d.includes('CÉDULA DE CÉDULA DE CIUDADANÍA') || d.includes('CÉDULA DE CIUDADANÍA')) return 534;
      if (d.includes('CEDULA DE EXTRANJERIA') || d.includes('CÉDULA DE EXTRANJERÍA')) return 535;
      if (d.includes('NIT')) return 536;
      if (d.includes('TARJETA DE IDENTIDAD')) return 537;
      if (d.includes('REGISTRO CIVIL')) return 538;
      if (d.includes('PASAPORTE')) return 540;
    }
    if (code) {
      const c = String(code).toUpperCase().trim();
      if (c === 'C' || c === 'CC') return 534;
      if (c === 'E' || c === 'CE') return 535;
      if (c === 'N' || c === 'NIT') return 536;
      if (c === 'T' || c === 'TI') return 537;
      if (c === 'R' || c === 'RC') return 538;
      if (c === 'P') return 540;
    }
    return 534; // CC default
  }

  // Determine natural/legal person type
  getInteresadoTipo(docTipoId, nombre) {
    if (docTipoId === 536) return 2; // NIT is Legal Person
    if (nombre) {
      const n = nombre.toUpperCase();
      if (n.includes(' S.A') || n.includes(' S A') || n.includes(' SAS') || n.includes(' S.A.S') || n.includes(' LTDA') || n.includes(' LIMITADA') || n.includes(' MUNICIPIO') || n.includes(' DEPARTAMENTO') || n.includes(' NACION') || n.includes(' ASOCIACION')) {
        return 2;
      }
    }
    return 1; // Natural Person
  }

  // Helper to split full names of natural persons
  splitFullName(fullName) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const result = {
      primer_nombre: '',
      segundo_nombre: null,
      primer_apellido: '',
      segundo_apellido: null
    };

    if (parts.length === 1) {
      result.primer_nombre = parts[0];
    } else if (parts.length === 2) {
      result.primer_nombre = parts[0];
      result.primer_apellido = parts[1];
    } else if (parts.length === 3) {
      result.primer_nombre = parts[0];
      result.primer_apellido = parts[1];
      result.segundo_apellido = parts[2];
    } else if (parts.length === 4) {
      result.primer_nombre = parts[0];
      result.segundo_nombre = parts[1];
      result.primer_apellido = parts[2];
      result.segundo_apellido = parts[3];
    } else if (parts.length > 4) {
      result.primer_nombre = parts[0];
      result.segundo_nombre = parts[1];
      result.primer_apellido = parts[parts.length - 2];
      result.segundo_apellido = parts[parts.length - 1];
    }
    return result;
  }

  // Map 3-digit Excel USO code to LADM-COL cr_usouconstipo (usoId) and cr_unidadconstrucciontipo (tipoId)
  getUsoAndTipo(excelCode) {
    const code = String(excelCode).trim().padStart(3, '0');
    
    // Default fallback: Residencial Vivienda hasta 3 pisos
    let usoId = 226;
    let tipoId = 330;

    switch (code) {
      case '001':
        usoId = 226; // Residencial.Vivienda_Hasta_3_Pisos
        tipoId = 330; // Residencial
        break;
      case '002':
        usoId = 235; // Comercial.Comercio
        tipoId = 331; // Comercial
        break;
      case '003':
        usoId = 258; // Industrial.Talleres
        tipoId = 332; // Industrial
        break;
      case '004':
        usoId = 256; // Industrial.Industrias
        tipoId = 332; // Industrial
        break;
      case '005':
        usoId = 241; // Comercial.Oficinas_Consultorios
        tipoId = 331; // Comercial
        break;
      case '006':
        usoId = 239; // Comercial.Hoteles
        tipoId = 331; // Comercial
        break;
      case '007':
        usoId = 263; // Institucional.Clinicas_Hospitales_Centros_Medicos
        tipoId = 333; // Institucional
        break;
      case '008':
        usoId = 269; // Institucional.Iglesia
        tipoId = 333; // Institucional
        break;
      case '009':
        usoId = 280; // Institucional.Unidad_Deportiva
        tipoId = 333; // Institucional
        break;
      case '010':
        usoId = 282; // Anexo.Albercas_Banaderas
        tipoId = 334; // Anexo
        break;
      case '012':
        usoId = 290; // Anexo.Cocheras_Marraneras_Porquerizas
        tipoId = 334; // Anexo
        break;
      case '013':
        usoId = 297; // Anexo.Galpones_Gallineros
        tipoId = 334; // Anexo
        break;
      case '014':
        usoId = 300; // Anexo.Kioscos
        tipoId = 334; // Anexo
        break;
      case '019':
        usoId = 309; // Anexo.Ramadas_Cobertizos_Caneyes
        tipoId = 334; // Anexo
        break;
      case '021':
        usoId = 310; // Anexo.Secaderos
        tipoId = 334; // Anexo
        break;
      case '023':
        usoId = 312; // Anexo.Tanques
        tipoId = 334; // Anexo
        break;
      case '026':
        usoId = 283; // Anexo.Beneficiaderos
        tipoId = 334; // Anexo
        break;
      case '028':
        usoId = 288; // Anexo.Cerramiento
        tipoId = 334; // Anexo
        break;
      case '029':
        usoId = 285; // Anexo.Canchas
        tipoId = 334; // Anexo
        break;
      case '034':
        usoId = 220; // Residencial.Garajes_Cubiertos
        tipoId = 330; // Residencial
        break;
      case '035':
        usoId = 219; // Residencial.Depositos_Lockers
        tipoId = 330; // Residencial
        break;
      case '036':
        usoId = 222; // Residencial.Salon_Comunal
        tipoId = 330; // Residencial
        break;
      case '037':
        usoId = 286; // Anexo.Canchas_de_Tenis
        tipoId = 334; // Anexo
        break;
      case '038':
        usoId = 311; // Anexo.Silos
        tipoId = 334; // Anexo
        break;
      case '042':
        usoId = 306; // Anexo.Piscinas
        tipoId = 334; // Anexo
        break;
      case '043':
        usoId = 282; // Anexo.Albercas_Banaderas
        tipoId = 334; // Anexo
        break;
      case '044':
        usoId = 288; // Anexo.Cerramiento
        tipoId = 334; // Anexo
        break;
      case '045':
        usoId = 305; // Anexo.Pergolas
        tipoId = 334; // Anexo
        break;
      case '063':
        usoId = 294; // Anexo.Establos_Pesebreras_Caballerizas
        tipoId = 334; // Anexo
        break;
      default:
        usoId = 226; // Residencial.Vivienda_Hasta_3_Pisos
        tipoId = 330; // Residencial
    }

    return { usoId, tipoId };
  }

  // Initialize dataset & baskets metadata to satisfy FK constraints in standard schema
  async initializeMetadata(schemaName) {
    const { query } = db;
    console.log(`🔧 [EXCEL IMPORT] Initializing LADM-COL Metadata for schema: ${schemaName}`);

    try {
      // 1. Insert into t_ili2db_dataset
      await query(`
        INSERT INTO "${schemaName}".t_ili2db_dataset (t_id, datasetname)
        VALUES (1, $1)
        ON CONFLICT DO NOTHING
      `, [`excel_dataset_${schemaName}`]);

      // 2. Insert into t_ili2db_basket for different sub-models
      const topics = [
        { t_id: 2, topic: 'Modelo_Aplicacion_Interno_Levantamiento_Catastral_LADMCOL_V1_0.Interno_Levantamiento_Catastral' },
        { t_id: 3, topic: 'Submodelo_Calificacion_Unidad_Construccion_V1_0.Calificacion_Construccion' },
        { t_id: 4, topic: 'Submodelo_Cartografia_Catastral_V1_0.LimitesOperativosCatastro' },
        { t_id: 5, topic: 'Submodelo_Valoracion_Masiva_v_1_0.Avaluos' }
      ];

      for (const t of topics) {
        await query(`
          INSERT INTO "${schemaName}".t_ili2db_basket (t_id, dataset, topic, t_ili_tid, attachmentkey, domains)
          VALUES ($1, 1, $2, NULL, $3, '')
          ON CONFLICT DO NOTHING
        `, [t.t_id, t.topic, `excel_basket_${t.t_id}`]);
      }

      console.log(`✅ [EXCEL IMPORT] LADM-COL Metadata successfully initialized!`);
    } catch (err) {
      console.error(`❌ [EXCEL IMPORT] Error initializing metadata:`, err.message);
      throw err;
    }
  }
}

module.exports = new IGACExcelImporterService();
