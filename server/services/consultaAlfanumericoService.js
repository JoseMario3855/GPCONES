const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Servicio para ejecutar consultas alfanuméricas basadas en el archivo CONSULTASALFANUMERICO.txt
 * Las consultas están diseñadas para trabajar con schemas LADM-COL
 */

// Cargar consultas procesadas desde JSON como fallback
let consultasProcesadas = {};
try {
  const consultasPath = path.join(__dirname, '../../database/consultas_alfanumerico.json');
  console.log(`📂 Buscando consultas fallback en: ${consultasPath}`);
  if (fs.existsSync(consultasPath)) {
    consultasProcesadas = JSON.parse(fs.readFileSync(consultasPath, 'utf8'));
    console.log(`✅ Consultas fallback cargadas: ${Object.keys(consultasProcesadas).length} consultas disponibles`);
  } else {
    console.log(`⚠️ Archivo de consultas fallback no encontrado`);
  }
} catch (error) {
  console.error('❌ Error cargando las consultas procesadas fallback:', error.message);
}

// ─── SQL Queries defined directly as JavaScript constants ────────────────────
const SQL_FICHAS = `
select
  max(predio.t_id) as "predio_t_id",
  max(predio.espacio_de_nombres) as "NroFicha",
  MAX(predio.numero_predial_nacional) as "Npn",
  max(predio.departamento) as "Departamento",
  max(predio.municipio) as "Municipio",
  MAX(SUBSTRING(predio.numero_predial_nacional, 6, 2)) as "Zona",
  MAX(SUBSTRING(predio.numero_predial_nacional, 8, 2)) as "Sector" ,
  MAX(SUBSTRING(predio.numero_predial_nacional, 10, 2)) as "Comuna",
  MAX(SUBSTRING(predio.numero_predial_nacional, 12, 2)) as "Barrio",
  MAX(SUBSTRING(predio.numero_predial_nacional, 14, 4)) as "Manzana o Vereda",
  MAX(SUBSTRING(predio.numero_predial_nacional, 18, 4)) as "Terreno",
  MAX(SUBSTRING(predio.numero_predial_nacional, 22, 1)) as "Condicion",
  MAX(SUBSTRING(predio.numero_predial_nacional, 23, 2)) as "Edificio",
  MAX(SUBSTRING(predio.numero_predial_nacional, 25, 2)) as "Piso",
  MAX(SUBSTRING(predio.numero_predial_nacional, 27, 4)) as "Unidad Predial",
  max(predio.matricula_inmobiliaria::varchar(255)) as "MatriculaInmobiliaria",
  max(predio.codigo_orip) as "Circulo",
  max(sisantiguo.libro) as "Libro",
  max(sisantiguo.tomo) as "tomo",
  max(sisantiguo.pagina) as "pagina",
  case
    when MAX(derechotipo.ilicode)= 'Dominio' then '1|DOMINIO (TRADICION)'
    when MAX(derechotipo.ilicode)= 'Posesion' then '2|POSESIÓN'
    when MAX(derechotipo.ilicode)= 'Ocupacion' then '5|OCUPACIÓN'
  end as "ModoAdquisicion",
  case
    when MAX(condicion.ilicode)= 'NPH' then '1|NPH (0)'
    when MAX(condicion.ilicode)= 'Informal' then '12|INFORMAL (2)'
    when MAX(condicion.ilicode)= 'Bien_Uso_Publico' then '13|BIEN DE USO PUBLICO (3)'
    when MAX(condicion.ilicode)= 'Via' then '11|VIA (4)'
    when MAX(condicion.ilicode)= 'PH.Matriz' then '2|RPH'
    when MAX(condicion.ilicode)= 'PH.Unidad_Predial' then '2|RPH'
    when MAX(condicion.ilicode)= 'Condominio.Matriz' then '3|Parcelacion'
    when MAX(condicion.ilicode)= 'Condominio.Unidad_Predial' then '3|Parcelacion'
  end as "CondicionPredio",
  case
    when MAX(destino.ilicode)= 'Acuicola' then '60|ACUICOLA'
    when MAX(destino.ilicode)= 'Agricola' then '24|AGRICOLA'
    when MAX(destino.ilicode)= 'Agroindustrial' then '28|AGROINDUSTRIAL'
    when MAX(destino.ilicode)= 'Agroforestal' then '61|AGROFORESTAL'
    when MAX(destino.ilicode)= 'Comercial' then '3|COMERCIAL'
    when MAX(destino.ilicode)= 'Cultural' then '6|CULTURAL'
    when MAX(destino.ilicode)= 'Educativo' then '27|EDUCATIVO'
    when MAX(destino.ilicode)= 'Forestal' then '30|FORESTAL'
    when MAX(destino.ilicode)= 'Habitacional' then '1|HABITACIONAL'
    when MAX(destino.ilicode)= 'Industrial' then '2|INDUSTRIAL'
    when MAX(destino.ilicode)= 'Infraestructura_Asociada_Produccion_Agropecuaria' then '62|INFRAESTRUCTURA_ASOCIADA_PRODUCCIÓN_AGROPECUARIA'
    when MAX(destino.ilicode)= 'Infraestructura_Hidraulica' then '63|INFRAESTRUCTURA HIDRAULICA'
    when MAX(destino.ilicode)= 'Infraestructura_Saneamiento_Basico' then '64|INFRAESTRUCTURA SANEAMIENTO BÁSICO'
    when MAX(destino.ilicode)= 'Infraestructura_Seguridad' then '67|INFRAESTRUCTURA SEGURIDAD'
    when MAX(destino.ilicode)= 'Infraestructura_Transporte' then '65|INFRAESTRUCTURA TRANSPORTE'
    when MAX(destino.ilicode)= 'Institucional' then '9|INSTITUCIONAL'
    when MAX(destino.ilicode)= 'Mineria_Hidrocarburos' then '5|MINEROS_HIDROCARBUROS'
    when MAX(destino.ilicode)= 'Lote_Urbanizable_No_Urbanizado' then '13|LOTE URBANIZABLE NO URBANIZADO'
    when MAX(destino.ilicode)= 'Lote_Urbanizado_No_Construido' then '12|LOTE URBANIZADO NO CONSTRUIDO'
    when MAX(destino.ilicode)= 'Lote_No_Urbanizable' then '14|LOTE NO URBANIZABLE'
    when MAX(destino.ilicode)= 'Pecuario' then '25|PECUARIO'
    when MAX(destino.ilicode)= 'Recreacional' then '7|RECREACIONAL'
    when MAX(destino.ilicode)= 'Religioso' then '29|RELIGIOSO'
    when MAX(destino.ilicode)= 'Salubridad' then '8|SALUBRIDAD'
    when MAX(destino.ilicode)= 'Servicios_Funerarios' then '66|SERVICIOS_FUNERARIOS'
    when MAX(destino.ilicode)= 'Uso_Publico' then '19|USO PUBLICO'
  end as "DestinoEcconomico",
  max(tipodir.ilicode) as "TipoDireccion",
  max(prediotipo.ilicode) as "Tipo",
  CASE
    WHEN MAX(tipodir.ilicode) = 'No_Estructurada' THEN MAX(direccion.nombre_predio)
  ELSE
    TRIM(CONCAT_WS(' ',
      MAX(CASE
        WHEN clasevia.itfcode = '0' THEN 'AC'
        WHEN clasevia.itfcode = '1' THEN 'ACR'
        WHEN clasevia.itfcode = '2' THEN 'AV'
        WHEN clasevia.itfcode = '3' THEN 'AU'
        WHEN clasevia.itfcode = '4' THEN 'CIR'
        WHEN clasevia.itfcode = '5' THEN 'CL'
        WHEN clasevia.itfcode = '6' THEN 'CR'
        WHEN clasevia.itfcode = '7' THEN 'DG'
        WHEN clasevia.itfcode = '8' THEN 'TV'
        WHEN clasevia.itfcode = '9' THEN 'CQ'
      END),
      MAX(direccion.valor_via_principal),
      MAX(direccion.letra_via_principal),
      MAX(sector.ilicode),
      
      -- Agregar "N" solo si valor_via_principal no es NULL
      CASE 
        WHEN MAX(direccion.valor_via_principal) IS NOT NULL THEN 'N' 
        ELSE NULL 
      END,
      
      MAX(direccion.valor_via_generadora),
      MAX(direccion.letra_via_generadora),
      MAX(sectorp.ilicode),
      
      -- Agregar "-" solo si numero_predio no es NULL
      CASE 
        WHEN MAX(direccion.numero_predio) IS NOT NULL THEN '-' 
        ELSE NULL 
      END,            
      MAX(direccion.numero_predio),
      MAX(direccion.complemento)
    ))
  END AS "DireccionReal",
  max(predio.nombre) as "DireccionNombre",
  --datosph
  max(datosph.total_unidades_privadas) as "total_unidades",
  max(datosph.numero_torres) as "numero_torres",
  max(datosph.area_total_terreno) as "area_total_terreno",
  max(datosph.area_total_terreno_comun) as "area_total_terreno_comun",
  max(datosph.area_total_terreno_privada) as "area_total_terreno_privada",
  max(datosph.area_total_construida) as "area_total_construida",
  max(datosph.area_total_construida_comun) as "area_total_construida_comun",
  max(datosph.area_total_construida_privada) as area_total_construida_privada
from \${schemaName}.ilc_predio predio
join \${schemaName}.ilc_destinacioneconomicatipo as destino on predio.destinacion_economica = destino.t_id
join \${schemaName}.ilc_prediotipo as prediotipo on predio.tipo=prediotipo.t_id 
join \${schemaName}.ilc_condicionprediotipo condicion on condicion.t_id=predio.condicion_predio 
left join \${schemaName}.extreferenciaregistralsistemaantiguo sisantiguo on predio.t_id=sisantiguo.ilc_predio_referencia_registral_sistema_antiguo
left join \${schemaName}.ilc_derecho derecho on predio.t_id=derecho.unidad
left join \${schemaName}.ilc_derechocatastraltipo derechotipo  on derechotipo.t_id=derecho.tipo
left join \${schemaName}.extdireccion direccion on direccion.ilc_predio_direccion=predio.t_id
left join \${schemaName}.extdireccion_clase_via_principal clasevia on direccion.clase_via_principal = clasevia.t_id
left join \${schemaName}.extdireccion_sector_ciudad sector on direccion.sector_ciudad = sector.t_id
left join \${schemaName}.extdireccion_tipo_direccion tipodir on direccion.tipo_direccion =tipodir.t_id
left join \${schemaName}.extdireccion_sector_predio sectorp on direccion.sector_predio =sectorp.t_id
left join \${schemaName}.cr_datosphcondominio datosph on datosph.ilc_predio =predio.t_id
group by predio.t_id
`;

const SQL_PROPIETARIOS = `
SELECT
  predio.t_id as "predio_t_id",
  derecho.t_id as "rrr",
  predio.numero_predial_nacional AS "Npn",
  predio.espacio_de_nombres AS "NroFicha",
  tipoderecho.ilicode AS "TipoDerecho",
  tipogrupo.ilicode AS "TipoAgrupacion",
  fuentetipo.ilicode as "TipoFuente",
  fuente.numero_fuente as "Escritura",   
  fuente.ente_emisor as "Entidad",
  fuente.fecha_documento_fuente as "FechaEscritura",
  derecho.fecha_inicio_tenencia as "Fecha",  
  COALESCE(tipodoc_directo.ilicode, tipodoc_miembro.ilicode) AS "TipoDocumento",
  COALESCE(interesado_directo.documento_identidad, miembro.documento_identidad) AS "Documento",
  COALESCE(interesado_directo.primer_nombre, miembro.primer_nombre) AS "PrimerNombre",
  COALESCE(interesado_directo.segundo_nombre, miembro.segundo_nombre) AS "SegundoNombre",
  COALESCE(interesado_directo.primer_apellido, miembro.primer_apellido) AS "PrimerApellido",
  COALESCE(interesado_directo.segundo_apellido, miembro.segundo_apellido) AS "SegundoApellido",
  COALESCE(interesado_directo.razon_social, miembro.razon_social) AS "RazonSocial",
  case
    when miembros.participacion is not null then miembros.participacion * 100
    else 100
  end AS "Derecho",
  disponibilidad.ilicode as "Disponibilidad"
FROM \${schemaName}.ilc_derecho derecho
INNER JOIN \${schemaName}.ilc_predio predio ON predio.t_id = derecho.unidad
LEFT JOIN \${schemaName}.ilc_derechocatastraltipo tipoderecho ON tipoderecho.t_id = derecho.tipo
LEFT JOIN \${schemaName}.col_rrrinteresado colrinteresado ON colrinteresado.rrr = derecho.t_id
-- Rama 1: interesado directo
LEFT JOIN \${schemaName}.ilc_interesado interesado_directo ON interesado_directo.t_id = colrinteresado.interesado_ilc_interesado
LEFT JOIN \${schemaName}.cr_documentotipo tipodoc_directo ON tipodoc_directo.t_id = interesado_directo.tipo_documento
-- Rama 2: agrupación
LEFT JOIN \${schemaName}.cr_agrupacioninteresados agrupacion ON agrupacion.t_id = colrinteresado.interesado_cr_agrupacioninteresados
LEFT JOIN \${schemaName}.col_grupointeresadotipo tipogrupo ON tipogrupo.t_id = agrupacion.tipo
-- Miembros de la agrupación
LEFT JOIN \${schemaName}.col_miembros miembros ON miembros.agrupacion = agrupacion.t_id
LEFT JOIN \${schemaName}.ilc_interesado miembro ON miembro.t_id = miembros.interesado_ilc_interesado
LEFT JOIN \${schemaName}.cr_documentotipo tipodoc_miembro ON tipodoc_miembro.t_id = miembro.tipo_documento
LEFT JOIN \${schemaName}.col_rrrfuente colrfuente ON colrfuente.rrr = derecho.t_id
LEFT JOIN \${schemaName}.ilc_fuenteadministrativa fuente ON fuente.t_id = colrfuente.fuente_administrativa 
LEFT JOIN \${schemaName}.col_fuenteadministrativatipo fuentetipo ON fuentetipo.t_id = fuente.tipo
LEFT JOIN \${schemaName}.col_estadodisponibilidadtipo disponibilidad ON disponibilidad.t_id = fuente.estado_disponibilidad
`;

const SQL_CONSTRUCCIONES = `
select
  max(predio.t_id) as "predio_t_id",
  max(predio.espacio_de_nombres) as "NroFicha",
  max(predio.numero_predial_nacional) as "Npn",
  max(caracteristica.t_id) as "caracteristica",
  max(unidadtipo.ilicode) as "tipo",
  max(caracteristica.identificador) as "identificador",
  max(caracteristica.total_plantas) as "total_plantas",
  max(unidad.altura) as "Altura",
  max(unidad.planta_ubicacion) as "plantaubicacion",
  max(unidad.etiqueta) as "etiqueta",
  max(caracteristica.anio_construccion) as "añoConstruccion",
  max(caracteristica.area_construida) as "areaConstruida",
  max(uso.ilicode) as "Uso",
  max(usotrad.ilicode) as "usoTadicional",
  max(consplantatipo.ilicode) as "tipoPlanta"
from \${schemaName}.ilc_caracteristicasunidadconstruccion caracteristica
join \${schemaName}.cr_unidadconstrucciontipo unidadtipo on unidadtipo.t_id=caracteristica.tipo_unidad_construccion
join \${schemaName}.cr_usouconstipo uso on uso.t_id =caracteristica.uso 
left join \${schemaName}.ilc_usostradicionalesculturalestipo usotrad on usotrad.t_id=caracteristica.usos_tradicionales_culturales 
join \${schemaName}.cr_unidadconstruccion unidad on unidad.cr_caracteristicasunidadconstruccion =caracteristica.t_id
left join \${schemaName}.cr_construccionplantatipo consplantatipo on consplantatipo.t_id=unidad.tipo_planta
left join \${schemaName}.col_uebaunit baunit on baunit.ue_cr_unidadconstruccion=unidad.t_id 
left join \${schemaName}.ilc_predio predio on predio.t_id=baunit.baunit
group by caracteristica.t_id 
`;

class ConsultaAlfanumericoService {
  /**
   * Comprueba si un schema utiliza LADM-COL estándar (tiene lc_predio en lugar de ilc_predio)
   */
  async isStandardSchema(schemaName) {
    try {
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'lc_predio'
        );
      `, [schemaName]);
      return result.rows[0]?.exists || false;
    } catch (err) {
      console.error(`Error detectando tipo de schema para ${schemaName}:`, err);
      return false;
    }
  }

  /**
   * Traduce una consulta SQL escrita para Interchange (ilc_) a Standard (lc_)
   */
  translateToStandard(sqlQuery, schemaName, hasFraccion = true) {
    let translated = sqlQuery;

    // Generar un patrón regex dinámico para soportar tanto los placeholders como el schema real
    const escapedSchema = schemaName ? schemaName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') : '';
    const schemaPattern = schemaName
      ? `(?:\\$\\{schemaName\\}|\\{esquema\\}|"${escapedSchema}"|${escapedSchema})`
      : `(?:\\$\\{schemaName\\}|\\{esquema\\})`;

    // Helper para reemplazar prefijos de tabla usando el schemaPattern
    const replaceTable = (fromTable, toTable) => {
      const regex = new RegExp(`(${schemaPattern})\\.${fromTable}\\b`, 'gi');
      translated = translated.replace(regex, `$1.${toTable}`);
    };

    // 1. Reemplazo de prefijos de tablas de ilc_ a lc_/cr_/col_
    replaceTable('ilc_predio', 'lc_predio');
    replaceTable('ilc_destinacioneconomicatipo', 'lc_destinacioneconomicatipo');
    replaceTable('ilc_prediotipo', 'col_unidadadministrativabasicatipo');
    replaceTable('ilc_condicionprediotipo', 'lc_condicionprediotipo');
    replaceTable('ilc_derecho', 'lc_derecho');
    replaceTable('ilc_derechocatastraltipo', 'lc_derechotipo');
    replaceTable('ilc_interesado', 'cr_interesado');
    replaceTable('ilc_fuenteadministrativa', 'lc_fuenteadministrativa');
    replaceTable('ilc_caracteristicasunidadconstruccion', 'cr_caracteristicasunidadconstruccion');

    // 2. Reemplazo de columnas de relaciones
    translated = translated.replace(/sisantiguo\.ilc_predio_referencia_registral_sistema_antiguo/gi, 'sisantiguo.lc_predio_referencia_registral_sistema_antiguo');
    translated = translated.replace(/direccion\.ilc_predio_direccion/gi, 'direccion.lc_predio_direccion');
    translated = translated.replace(/datosph\.ilc_predio/gi, 'datosph.lc_predio');
    translated = translated.replace(/calificacion\.ilc_caracteristicasunidadconstruccion/gi, 'calificacion.cr_caracteristicasunidadconstruccion');


    // 3. Reemplazo de numero_predial_nacional a numero_predial
    translated = translated.replace(/numero_predial_nacional/gi, 'numero_predial');

    // 4. Reemplazo de espacio_de_nombres as "NroFicha" a n_ficha as "NroFicha"
    translated = translated.replace(/predio\.espacio_de_nombres\s+as\s+"NroFicha"/gi, 'predio.n_ficha as "NroFicha"');
    translated = translated.replace(/max\(predio\.espacio_de_nombres\)\s+as\s+"NroFicha"/gi, 'max(predio.n_ficha) as "NroFicha"');

    // 5. Bypass de tabla de unión col_rrrinteresado en Propietarios
    // Removemos la unión de col_rrrinteresado
    const rrrJoinRegex = new RegExp(`LEFT\\s+JOIN\\s+(${schemaPattern})\\.col_rrrinteresado\\s+colrinteresado\\s+ON\\s+colrinteresado\\.rrr\\s+=\\s+derecho\\.t_id`, 'gi');
    translated = translated.replace(rrrJoinRegex, '/* bypassed col_rrrinteresado */');
    
    // Conectamos directamente interesado_directo a derecho
    translated = translated.replace(/ON\s+interesado_directo\.t_id\s+=\s+colrinteresado\.interesado_ilc_interesado/gi, 'ON interesado_directo.t_id = derecho.interesado_cr_interesado');
    
    // Conectamos directamente agrupacion a derecho
    translated = translated.replace(/ON\s+agrupacion\.t_id\s+=\s+colrinteresado\.interesado_cr_agrupacioninteresados/gi, 'ON agrupacion.t_id = derecho.interesado_cr_agrupacioninteresados');
    
    // En col_miembros, conectamos a interesado_cr_interesado
    translated = translated.replace(/miembros\.interesado_ilc_interesado/gi, 'miembros.interesado_cr_interesado');

    // Reemplazo para Derecho/Fracción de Derecho en estándar
    if (hasFraccion) {
      translated = translated.replace(
        /case\s+when\s+miembros\.participacion\s+is\s+not\s+null\s+then\s+miembros\.participacion\s+\*\s+100\s+else\s+100\s+end\s+AS\s+"Derecho"/gi,
        `CASE 
           WHEN miembros.participacion IS NOT NULL THEN miembros.participacion * 100 
           WHEN derecho.fraccion_derecho IS NOT NULL THEN derecho.fraccion_derecho::numeric * 100 
           ELSE 100 
         END AS "Derecho"`
      );
    }

    // 6. Mock de tabla ilc_usostradicionalesculturalestipo en Construcciones
    const tradUsoRegex = new RegExp(`left\\s+join\\s+(${schemaPattern})\\.ilc_usostradicionalesculturalestipo\\s+usotrad\\s+on\\s+usotrad\\.t_id\\s*=\\s*caracteristica\\.usos_tradicionales_culturales`, 'gi');
    translated = translated.replace(tradUsoRegex, 'left join (select null::integer as t_id, null::varchar as ilicode) usotrad on false');

    return translated;
  }

  /**
   * Ejecuta la consulta de Fichas (Predios)
   * @param {string} schemaName - Nombre del schema a consultar
   * @param {object} filters - Filtros opcionales (nroFicha, npn, municipio, etc.)
   */
  async consultarFichas(schemaName, filters = {}) {
    return await this.ejecutarConsulta('Fichas', schemaName, filters);
  }

  /**
   * Ejecuta una consulta genérica desde las JS constants o el JSON fallback
   */
  async ejecutarConsulta(nombreConsulta, schemaName, filters = {}) {
    try {
      // 1. Obtener la consulta base. Usar JS constants para Fichas, Propietarios y Construcciones.
      let sqlQuery = "";
      if (nombreConsulta === 'Fichas') {
        sqlQuery = SQL_FICHAS;
      } else if (nombreConsulta === 'Propietarios') {
        sqlQuery = SQL_PROPIETARIOS;
      } else if (nombreConsulta === 'Construcciones') {
        sqlQuery = SQL_CONSTRUCCIONES;
      } else {
        if (!consultasProcesadas[nombreConsulta]) {
          throw new Error(`Consulta "${nombreConsulta}" no encontrada en fallback ni en JS constants`);
        }
        sqlQuery = consultasProcesadas[nombreConsulta];
      }

      // Validar que el schema existe
      const schemaExists = await query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = $1
      `, [schemaName]);

      if (schemaExists.rows.length === 0) {
        throw new Error(`Schema ${schemaName} no existe`);
      }

      // Detectar tipo de schema (Standard LADM-COL o Interchange)
      const isStandard = await this.isStandardSchema(schemaName);
      console.log(`🔍 Schema "${schemaName}" detectado como LADM-COL Standard: ${isStandard}`);

      // Verificar si la columna fraccion_derecho existe en la tabla de derechos de este esquema
      const tableDerecho = isStandard ? 'lc_derecho' : 'ilc_derecho';
      const colCheck = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2 AND column_name = 'fraccion_derecho'
        );
      `, [schemaName, tableDerecho]);
      const hasFraccion = colCheck.rows[0]?.exists || false;
      console.log(`🔍 Schema "${schemaName}" tiene columna fraccion_derecho en ${tableDerecho}: ${hasFraccion}`);

      // Si es Standard, aplicar traducción ANTES de reemplazar los placeholders
      if (isStandard) {
        sqlQuery = this.translateToStandard(sqlQuery, schemaName, hasFraccion);
      } else if (hasFraccion) {
        // Si no es Standard pero tiene fraccion_derecho, actualizar el cálculo de Derecho
        sqlQuery = sqlQuery.replace(
          /case\s+when\s+miembros\.participacion\s+is\s+not\s+null\s+then\s+miembros\.participacion\s+\*\s+100\s+else\s+100\s+end\s+AS\s+"Derecho"/gi,
          `CASE 
             WHEN miembros.participacion IS NOT NULL THEN miembros.participacion * 100 
             WHEN derecho.fraccion_derecho IS NOT NULL THEN derecho.fraccion_derecho::numeric * 100 
             ELSE 100 
           END AS "Derecho"`
        );
      }

      // Reemplazar placeholders en el SQL original/traducido
      sqlQuery = sqlQuery.replace(/\$\{schemaName\}/g, schemaName);
      sqlQuery = sqlQuery.replace(/\{esquema\}/g, schemaName);

      // Limpiar la consulta (eliminar punto y coma al final si existe)
      sqlQuery = sqlQuery.trim().replace(/;\s*$/, '');
      
      // Eliminar comentarios SQL (-- comentario) antes de envolver en subconsulta
      sqlQuery = sqlQuery.replace(/--[^\r\n]*/g, '').trim();
      
      // Determinar nombres de columnas según la consulta
      let fichaCol = '"NroFicha"';
      let npnCol = '"Npn"';
      
      if (nombreConsulta === 'CalificacionesConstrucciones') {
        fichaCol = '"NroFicha "';
      }
      if (nombreConsulta === 'Propietarios') {
        npnCol = '"Npn"';
      }

      // Inicializar queryParams
      const queryParams = [];
      
      // Verificar si hay filtros o paginación para aplicar
      const hasFilters = filters.nroFicha || filters.npn || filters.matriculaInmobiliaria || filters.documento || filters.predio_id;
      const hasPagination = filters.limit || filters.offset;
      
      console.log(`📊 Filtros recibidos para ${nombreConsulta}:`, filters);
      
      // Si hay filtros o paginación, envolver la consulta en una subconsulta
      if (hasFilters || hasPagination) {
        sqlQuery = `SELECT * FROM (${sqlQuery}) AS consulta_base`;
        
        // Preparar parámetros para los filtros (empezando desde $1)
        const newWhereConditions = [];
        let newParamIndex = 1;
        
        if (filters.predio_id) {
          newWhereConditions.push(`consulta_base."predio_t_id" = $${newParamIndex}::BIGINT`);
          queryParams.push(filters.predio_id);
          newParamIndex++;
        }

        if (filters.nroFicha) {
          newWhereConditions.push(`(
            TRIM(consulta_base.${fichaCol}::TEXT) = $${newParamIndex} OR 
            consulta_base.${fichaCol} = $${newParamIndex}
            ${nombreConsulta === 'Fichas' ? `OR consulta_base."NumCedulaCatastral" = $${newParamIndex}` : ''}
          )`);
          queryParams.push(filters.nroFicha);
          newParamIndex++;
        }
        
        if (filters.npn) {
          if (!['ConstruccionesGenerales', 'Colindantes', 'CartografiaInformacionGrafica'].includes(nombreConsulta)) {
            const npnConditions = [];
            npnConditions.push(`consulta_base.${npnCol} LIKE $${newParamIndex}`);
            if (nombreConsulta === 'CalificacionesConstrucciones') {
              npnConditions.push(`TRIM(consulta_base."Npn ") LIKE $${newParamIndex}`);
            }
            newWhereConditions.push(`(${npnConditions.join(' OR ')})`);
          } else {
            // Si la consulta no tiene la columna Npn, filtrar por EXISTS
            if (isStandard) {
              newWhereConditions.push(`EXISTS (
                SELECT 1 FROM ${schemaName}.lc_predio p
                WHERE p.n_ficha::varchar = TRIM(COALESCE(consulta_base.${fichaCol}::text, ''))
                  AND p.numero_predial LIKE $${newParamIndex}
              )`);
            } else {
              newWhereConditions.push(`EXISTS (
                SELECT 1 FROM ${schemaName}.ilc_predio p
                WHERE p.espacio_de_nombres::varchar = TRIM(COALESCE(consulta_base.${fichaCol}::text, ''))
                  AND p.numero_predial_nacional LIKE $${newParamIndex}
              )`);
            }
          }
          queryParams.push(`%${filters.npn}%`);
          newParamIndex++;
        }
        
        if (filters.matriculaInmobiliaria) {
          if (['Fichas', 'Propietarios'].includes(nombreConsulta)) {
            newWhereConditions.push(`(
              consulta_base."MatriculaInmobiliaria" = $${newParamIndex}
            )`);
          } else {
            // Filtrar por EXISTS
            if (isStandard) {
              newWhereConditions.push(`EXISTS (
                SELECT 1 FROM ${schemaName}.lc_predio p
                WHERE p.n_ficha::varchar = TRIM(COALESCE(consulta_base.${fichaCol}::text, ''))
                  AND p.matricula_inmobiliaria = $${newParamIndex}
              )`);
            } else {
              newWhereConditions.push(`EXISTS (
                SELECT 1 FROM ${schemaName}.ilc_predio p
                WHERE p.espacio_de_nombres::varchar = TRIM(COALESCE(consulta_base.${fichaCol}::text, ''))
                  AND p.matricula_inmobiliaria = $${newParamIndex}
              )`);
            }
          }
          queryParams.push(filters.matriculaInmobiliaria);
          newParamIndex++;
        }
        
        if (filters.documento) {
          if (nombreConsulta === 'Propietarios') {
            newWhereConditions.push(`(
              TRIM(consulta_base."Documento"::TEXT) = $${newParamIndex} OR 
              consulta_base."Documento" = $${newParamIndex}
            )`);
          } else {
            // Filtrar por EXISTS asociando el documento al predio por ficha o npn
            if (isStandard) {
              newWhereConditions.push(`EXISTS (
                SELECT 1 FROM ${schemaName}.lc_predio p
                JOIN ${schemaName}.lc_derecho derecho ON p.t_id = derecho.unidad
                LEFT JOIN ${schemaName}.cr_interesado intereasdo ON derecho.interesado_cr_interesado = intereasdo.t_id
                LEFT JOIN ${schemaName}.cr_agrupacioninteresados agrupacion ON derecho.interesado_cr_agrupacioninteresados = agrupacion.t_id
                LEFT JOIN ${schemaName}.col_miembros cm ON agrupacion.t_id = cm.agrupacion
                LEFT JOIN ${schemaName}.cr_interesado interesadomiembros ON interesadomiembros.t_id = cm.interesado_cr_interesado
                WHERE (p.n_ficha::varchar = TRIM(COALESCE(consulta_base.${fichaCol}::text, ''))
                       ${!['ConstruccionesGenerales', 'Colindantes', 'CartografiaInformacionGrafica'].includes(nombreConsulta) ? `OR p.numero_predial = TRIM(COALESCE(consulta_base.${npnCol}::text, ''))` : ''})
                  AND (
                    TRIM(intereasdo.documento_identidad::TEXT) = $${newParamIndex} OR intereasdo.documento_identidad = $${newParamIndex}
                    OR TRIM(interesadomiembros.documento_identidad::TEXT) = $${newParamIndex} OR interesadomiembros.documento_identidad = $${newParamIndex}
                  )
              )`);
            } else {
              newWhereConditions.push(`EXISTS (
                SELECT 1 FROM ${schemaName}.ilc_predio p
                JOIN ${schemaName}.ilc_derecho derecho ON p.t_id = derecho.unidad
                LEFT JOIN ${schemaName}.col_rrrinteresado colrinteresado ON colrinteresado.rrr = derecho.t_id
                LEFT JOIN ${schemaName}.ilc_interesado interesado_directo ON interesado_directo.t_id = colrinteresado.interesado_ilc_interesado
                LEFT JOIN ${schemaName}.cr_agrupacioninteresados agrupacion ON agrupacion.t_id = colrinteresado.interesado_cr_agrupacioninteresados
                LEFT JOIN ${schemaName}.col_miembros miembros ON miembros.agrupacion = agrupacion.t_id
                LEFT JOIN ${schemaName}.ilc_interesado miembro ON miembro.t_id = miembros.interesado_ilc_interesado
                WHERE (p.espacio_de_nombres::varchar = TRIM(COALESCE(consulta_base.${fichaCol}::text, ''))
                       ${!['ConstruccionesGenerales', 'Colindantes', 'CartografiaInformacionGrafica'].includes(nombreConsulta) ? `OR p.numero_predial_nacional = TRIM(COALESCE(consulta_base.${npnCol}::text, ''))` : ''})
                  AND (
                    TRIM(interesado_directo.documento_identidad::TEXT) = $${newParamIndex} OR interesado_directo.documento_identidad = $${newParamIndex}
                    OR TRIM(miembro.documento_identidad::TEXT) = $${newParamIndex} OR miembro.documento_identidad = $${newParamIndex}
                  )
              )`);
            }
          }
          queryParams.push(filters.documento);
          newParamIndex++;
        }
        
        // Agregar WHERE si hay condiciones
        if (newWhereConditions.length > 0) {
          sqlQuery += ` WHERE ${newWhereConditions.join(' AND ')}`;
        }
        
        // Agregar paginación
        if (filters.limit) {
          sqlQuery += ` LIMIT $${newParamIndex}`;
          queryParams.push(filters.limit);
          newParamIndex++;
        }

        if (filters.offset) {
          sqlQuery += ` OFFSET $${newParamIndex}`;
          queryParams.push(filters.offset);
          newParamIndex++;
        }
      }

      console.log(`📝 Ejecutando consulta: ${nombreConsulta} en schema: ${schemaName}`);
      
      // Contar parámetros únicos para verificar
      const finalParamsMatch = sqlQuery.match(/\$(\d+)/g);
      const paramNumbers = finalParamsMatch 
        ? [...new Set(finalParamsMatch.map(m => parseInt(m.replace('$', ''))))].sort((a, b) => a - b)
        : [];
      
      console.log(`📋 Parámetros detectados en SQL:`, paramNumbers);
      console.log(`📋 Parámetros a enviar:`, queryParams);

      const result = await query(sqlQuery, queryParams);
      console.log(`✅ Consulta ${nombreConsulta} ejecutada exitosamente. Filas: ${result.rows.length}`);

      // Si es la consulta de Fichas y tenemos filas, cargar la geometría del terreno para cada predio
      if (nombreConsulta === 'Fichas' && result.rows.length > 0) {
        for (const row of result.rows) {
          const predioId = row.predio_t_id;
          if (predioId) {
            try {
              // Buscar nombre de la tabla de terrenos en el esquema
              const terrainTableResult = await query(
                `SELECT table_name FROM information_schema.tables 
                 WHERE table_schema = $1 
                   AND (table_name = 'cr_terreno' OR table_name = 'lc_terreno' OR table_name = 'ilc_terreno') 
                 LIMIT 1`,
                [schemaName]
              );
              if (terrainTableResult.rows.length > 0) {
                const terrainTableName = terrainTableResult.rows[0].table_name;
                
                // Buscar en col_uebaunit si existe la relación
                const uebaunitResult = await query(
                  `SELECT table_name FROM information_schema.tables 
                   WHERE table_schema = $1 AND table_name = 'col_uebaunit' LIMIT 1`,
                  [schemaName]
                );
                
                let geomRes = null;
                if (uebaunitResult.rows.length > 0) {
                  // Verificar cuáles columnas tiene col_uebaunit para el link del terreno
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
                  
                  geomRes = await query(
                    `SELECT ST_AsGeoJSON(ST_Transform(ST_CurveToLine(t.geometria), 4326)) as geometry_geojson
                     FROM "${schemaName}"."${terrainTableName}" t
                     JOIN "${schemaName}".col_uebaunit ueb ON ueb.${linkCol} = t.t_id
                     WHERE ueb.baunit = $1::bigint AND t.geometria IS NOT NULL LIMIT 1`,
                    [predioId]
                  );

                  // Fallback 1: Copropiedad (matriz)
                  if (!geomRes || geomRes.rows.length === 0 || !geomRes.rows[0].geometry_geojson) {
                    const copropiedadResult = await query(
                      `SELECT table_name FROM information_schema.tables 
                       WHERE table_schema = $1 AND (table_name = 'cr_predio_copropiedad' OR table_name = 'lc_predio_copropiedad') LIMIT 1`,
                      [schemaName]
                    );
                    if (copropiedadResult.rows.length > 0) {
                      const copTableName = copropiedadResult.rows[0].table_name;
                      geomRes = await query(
                        `SELECT ST_AsGeoJSON(ST_Transform(ST_CurveToLine(t.geometria), 4326)) as geometry_geojson
                         FROM "${schemaName}"."${terrainTableName}" t
                         JOIN "${schemaName}".col_uebaunit ueb ON ueb.${linkCol} = t.t_id
                         WHERE ueb.baunit = (SELECT matriz FROM "${schemaName}"."${copTableName}" WHERE unidad_predial = $1::bigint LIMIT 1) 
                           AND t.geometria IS NOT NULL LIMIT 1`,
                        [predioId]
                      );
                    }
                  }

                  // Fallback 2: Prefix matching
                  if (!geomRes || geomRes.rows.length === 0 || !geomRes.rows[0].geometry_geojson) {
                    geomRes = await query(
                      `SELECT ST_AsGeoJSON(ST_Transform(ST_CurveToLine(geometria), 4326)) as geometry_geojson
                       FROM "${schemaName}"."${terrainTableName}" 
                       WHERE SUBSTRING(local_id, 1, 21) = SUBSTRING(($1::text), 1, 21) 
                         AND geometria IS NOT NULL LIMIT 1`,
                      [row.Npn || '']
                    );
                  }

                  // Fallback 3: Construction
                  if (!geomRes || geomRes.rows.length === 0 || !geomRes.rows[0].geometry_geojson) {
                    const constTableResult = await query(
                      `SELECT table_name FROM information_schema.tables 
                       WHERE table_schema = $1 
                         AND (table_name = 'cr_unidadconstruccion' OR table_name = 'lc_construccion' OR table_name = 'ilc_construccion') 
                       LIMIT 1`,
                      [schemaName]
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
                         FROM "${schemaName}"."${constTableName}" c
                         JOIN "${schemaName}".col_uebaunit ueb ON ueb.${constLinkCol} = c.t_id
                         WHERE ueb.baunit = $1::bigint AND c.geometria IS NOT NULL LIMIT 1`,
                        [predioId]
                      );
                    }
                  }
                } else {
                  // Fallback: por local_id / npn
                  geomRes = await query(
                    `SELECT ST_AsGeoJSON(ST_Transform(ST_CurveToLine(geometria), 4326)) as geometry_geojson
                     FROM "${schemaName}"."${terrainTableName}" 
                     WHERE (local_id = $1 OR local_id = $2) AND geometria IS NOT NULL LIMIT 1`,
                    [row.local_id || row.NroFicha, row.Npn]
                  );
                }
                
                if (geomRes && geomRes.rows.length > 0 && geomRes.rows[0].geometry_geojson) {
                  row.geometry = JSON.parse(geomRes.rows[0].geometry_geojson);
                }

                // Buscar construcciones asociadas
                let constructionGeoms = [];
                const constTableResult = await query(
                  `SELECT table_name FROM information_schema.tables 
                   WHERE table_schema = $1 
                     AND (table_name = 'cr_unidadconstruccion' OR table_name = 'lc_construccion' OR table_name = 'ilc_construccion') 
                   LIMIT 1`,
                  [schemaName]
                );
                if (constTableResult.rows.length > 0) {
                  const constTableName = constTableResult.rows[0].table_name;
                  
                  if (uebaunitResult.rows.length > 0) {
                    const uebColsResult = await query(
                      `SELECT column_name FROM information_schema.columns 
                       WHERE table_schema = $1 AND table_name = 'col_uebaunit'`,
                      [schemaName]
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
                       FROM "${schemaName}"."${constTableName}" c
                       JOIN "${schemaName}".col_uebaunit ueb ON ueb.${constLinkCol} = c.t_id
                       WHERE ueb.baunit = $1::bigint AND c.geometria IS NOT NULL`,
                      [predioId]
                    );
                    
                    constructionGeoms = constGeomRes.rows.map(r => ({
                      t_id: r.t_id,
                      etiqueta: r.etiqueta,
                      local_id: r.local_id,
                      geometry: JSON.parse(r.geometry_geojson)
                    }));
                  }
                }
                row.construction_geometries = constructionGeoms;
              }
            } catch (geomErr) {
              console.warn(`Error al recuperar geometría para ficha ${predioId}:`, geomErr.message);
            }
          }
        }
      }

      return {
        success: true,
        data: result.rows,
        total: result.rows.length
      };

    } catch (error) {
      console.error(`❌ Error en ejecutarConsulta (${nombreConsulta}):`, error);
      throw error;
    }
  }

  /**
   * Ejecuta la consulta de Propietarios
   */
  async consultarPropietarios(schemaName, filters = {}) {
    return await this.ejecutarConsulta('Propietarios', schemaName, filters);
  }

  /**
   * Ejecuta la consulta de Construcciones
   */
  async consultarConstrucciones(schemaName, filters = {}) {
    return await this.ejecutarConsulta('Construcciones', schemaName, filters);
  }

  /**
   * Ejecuta la consulta de CalificacionesConstrucciones
   */
  async consultarCalificacionesConstrucciones(schemaName, filters = {}) {
    return await this.ejecutarConsulta('CalificacionesConstrucciones', schemaName, filters);
  }

  /**
   * Ejecuta la consulta de CalificacionesDetalle
   */
  async consultarCalificacionesDetalle(schemaName, filters = {}) {
    const result = await this.ejecutarConsulta('CalificacionesDetalle', schemaName, filters);
    
    const getPoints = (tipoCal, category, value) => {
      if (!value) return 0;
      
      const val = String(value).trim();
      const tc = String(tipoCal || 'Residencial').trim().charAt(0).toUpperCase(); // 'R', 'C', 'I', 'T'
      const cat = category.toLowerCase().replace(/_/g, '');

      switch (cat) {
        case 'armazon':
          if (val === 'Madera') return (tc === 'R' || tc === 'T') ? 0 : 4;
          if (val === 'Prefabricado') return (tc === 'R' || tc === 'T') ? 1 : 8;
          if (val === 'Ladrillo_Bloque') return (tc === 'R' || tc === 'T') ? 2 : 12;
          if (val === 'Concreto_Hasta_Tres_Pisos') return (tc === 'R' || tc === 'T') ? 4 : 22;
          if (val === 'Concreto_Cuatro_O_Mas_Pisos') return (tc === 'R' || tc === 'T') ? 6 : 22;
          return 0;

        case 'muros':
          if (val === 'Materiales_Desecho_Esterilla') return 0;
          if (val === 'Bahareque_Adobe_Tapia') return 1;
          if (val === 'Madera') return 2;
          if (val === 'Concreto_Prefabricado') return 3;
          if (val === 'Bloque_Ladrillo') return 4;
          return 0;

        case 'cubierta':
          if (val === 'Materiales_Desecho_Telas_Asfalticas') return 1;
          if (val === 'Zinc_Teja_De_Barro_Eternit_Rustico') return 3;
          if (val === 'Entrepiso_Cubierta_Provisional_Prefabricado') return 6;
          if (val === 'Eternit_O_Teja_De_Barro_Cubierta_Sencilla') return 9;
          if (val === 'Azotea_Aluminio_Placa_Sencilla_Con_Eternit') return 13;
          if (val === 'Placa_Impermeabilizada_Cubierta_Lujosa_U_Ornamenta' || val === 'Placa_Impermeabilizada_Cubierta_Lujosa_U_Ornamental') {
            return (tc !== 'I') ? 16 : 0;
          }
          return 0;

        case 'conservacionestructura':
          if (val.toLowerCase() === 'malo') return 0;
          if (val === 'Regular') return 2;
          if (val === 'Bueno') return 4;
          if (val === 'Excelente') return 5;
          return 0;

        case 'fachada':
          if (val === 'Pobre') return (tc === 'R' || tc === 'T') ? 0 : 2;
          if (val === 'Sencilla') return (tc === 'R' || tc === 'T') ? 2 : 4;
          if (val === 'Regular') return (tc === 'R' || tc === 'T') ? 4 : 6;
          if (val === 'Buena') return (tc === 'C') ? 8 : 6;
          if (val === 'Lujosa') return (tc === 'C') ? 12 : 8;
          return 0;

        case 'cubrimientosmuro':
          if (val === 'Sin_Cubrimiento') return 0;
          if (val === 'Paniete_Papel_Comun_Ladrillo_Prensado') return (tc === 'R' || tc === 'T') ? 1 : 2;
          if (val === 'Estuco_Ceramica_Papel_Fino') return (tc === 'C') ? 3 : 2;
          if (val === 'Madera_Piedra_Ornamental') return (tc === 'C') ? 5 : 3;
          if (val === 'Marmol_Lujosos_Otros') return (tc === 'C') ? 7 : 4;
          return 0;

        case 'piso':
          if (val === 'Tierra_Pisada') return 0;
          if (val === 'Cemento_Madera_Burda') return (tc === 'R' || tc === 'T') ? 2 : 3;
          if (val === 'Baldosa_Comun_De_Cemento_Tablon_Ladrillo') return (tc === 'R' || tc === 'T') ? 3 : 5;
          if (val === 'Liston_Machihembrado') return (tc === 'C') ? 7 : 4;
          if (val === 'Tableta_Caucho_Acrilico_Granito_Baldosa_Fina') return (tc === 'R' || tc === 'T') ? 6 : 9;
          if (val === 'Parquet_Alfombra_Retal_De_Marmol') return (tc === 'C') ? 11 : 8;
          if (val === 'Retal_De_Marmol_Marmol_Otros_Lujosos') return (tc === 'C') ? 13 : 9;
          return 0;

        case 'conservacionacabados':
          if (val.toLowerCase() === 'malo') return 0;
          if (val === 'Regular') return 2;
          if (val === 'Bueno') return 4;
          if (val === 'Excelente') return 5;
          return 0;

        case 'tamaniobanio':
          if (tc === 'R' || tc === 'T') {
            if (val === 'Sin_Banio') return 0;
            if (val === 'Pequenio') return 1;
            if (val === 'Mediano') return 2;
            if (val === 'Grande') return 3;
          }
          return 0;

        case 'enchapebanio':
          if (tc === 'R' || tc === 'T') {
            if (val === 'Sin_Cubrimiento') return 0;
            if (val === 'Paniete_Baldosa_Comun_De_Cemento') return 1;
            if (val === 'Baldosin_Unicolor_Papel_Comun') return 2;
            if (val === 'Baldosin_Decorado_Papel_Fino') return 3;
            if (val === 'Ceramica_Cristanac_Granito') return 4;
            if (val === 'Marmol_Enchape_Lujoso') return 5;
          }
          return 0;

        case 'mobiliariobanio':
          if (tc === 'R' || tc === 'T' || tc === 'C') {
            if (val === 'Pobre') return 0;
            if (val === 'Sencillo') return 3;
            if (val === 'Regular') return 6;
            if (val === 'Bueno') return 9;
            if (val === 'Lujoso') return (tc === 'C') ? 15 : 11;
          }
          return 0;

        case 'conservacionbanio':
          if (tc === 'R' || tc === 'T') {
            if (val.toLowerCase() === 'malo') return 0;
            if (val === 'Regular') return 2;
            if (val === 'Bueno') return 4;
            if (val === 'Excelente') return 5;
          }
          return 0;

        case 'tamaniococina':
          if (tc === 'R' || tc === 'T') {
            if (val === 'Sin_Cocina') return 0;
            if (val === 'Pequenia') return 1;
            if (val === 'Mediana') return 2;
            if (val === 'Grande') return 3;
          }
          return 0;

        case 'enchapecocina':
          if (tc === 'R' || tc === 'T') {
            if (val === 'Sin_Cubrimiento') return 0;
            if (val === 'Paniete_Baldosa_De_Cemento') return 1;
            if (val === 'Baldosin_Unicolor_Papel_Comun') return 2;
            if (val === 'Baldosin_Decorado_Papel_Fino') return 3;
            if (val === 'Ceramica_Cristanac_Granito') return 4;
            if (val === 'Marmol_Enchape_Lujoso') return 5;
          }
          return 0;

        case 'mobiliariococina':
          if (tc === 'R' || tc === 'T' || tc === 'C') {
            if (val === 'Pobre') return 0;
            if (val === 'Sencillo') return (tc === 'C') ? 3 : 2;
            if (val === 'Regular') return (tc === 'C') ? 6 : 3;
            if (val === 'Bueno') return (tc === 'C') ? 9 : 4;
            if (val === 'Lujoso') return (tc === 'C') ? 13 : 6;
          }
          return 0;

        case 'conservacioncocina':
          if (tc === 'R' || tc === 'T') {
            if (val.toLowerCase() === 'malo') return 0;
            if (val === 'Regular') return 2;
            if (val === 'Bueno') return 4;
            if (val === 'Excelente') return 5;
          }
          return 0;

        case 'complementoindustrial':
          if (tc === 'I') {
            if (val === 'Madera') return 6;
            if (val === 'Metalica_Liviana') return 12;
            if (val === 'Metalica_Mediana') return 22;
            if (val === 'Metalica_Pesada') return 34;
          }
          return 0;

        default:
          return 0;
      }
    };

    if (result && result.success && result.data && result.data.length > 0) {
      result.data = result.data.map(row => {
        const newRow = {};
        
        // Copiar columnas básicas anteriores a la calificación
        const preKeys = ['predio_t_id', 'NroFicha', 'Npn', 'caracteristica', 'identificador', 'Uso', 'usoTadicional', 'tipocalificaion', 'Puntos', 'convencional_id', 'ConvencionalNoConvencional'];
        preKeys.forEach(k => {
          if (row[k] !== undefined) newRow[k] = row[k];
        });

        // Columnas de variables con sus respectivos puntos al frente
        const variables = [
          { key: 'armazon', label: 'PuntosArmazon' },
          { key: 'muros', label: 'PuntosMuros' },
          { key: 'cubierta', label: 'PuntosCubierta' },
          { key: 'ConservacionEstructura', label: 'PuntosConservacionEstructura' },
          { key: 'Fachada', label: 'PuntosFachada' },
          { key: 'CubrimientosMuro', label: 'PuntosCubrimientoMuro' },
          { key: 'Piso', label: 'PuntosPiso' },
          { key: 'ConservacionAcabados', label: 'PuntosConservacionAcabados' },
          { key: 'Tamaniobanio', label: 'PuntosTamanioBanio' },
          { key: 'EnchapeBanio', label: 'PuntosEnchapesBanio' },
          { key: 'mobiliariobanio', label: 'PuntosMobiliarioBanio' },
          { key: 'ConservacionBanio', label: 'PuntosConservacionBanio' },
          { key: 'Tamaniococina', label: 'PuntosTamanioCocina' },
          { key: 'enchapecocina', label: 'PuntosEnchapeCocina' },
          { key: 'mobiliariococina', label: 'PuntosMobiliarioCocina' },
          { key: 'ConservacionCocina', label: 'PuntosConservacionCocina' },
          { key: 'complementoindustrial', label: 'PuntosComplementoIndustrial' }
        ];

        variables.forEach(v => {
          if (row[v.key] !== undefined) {
            newRow[v.key] = row[v.key];
            newRow[v.label] = getPoints(row.tipocalificaion, v.key, row[v.key]);
          }
        });

        // Copiar las columnas restantes
        Object.keys(row).forEach(k => {
          if (newRow[k] === undefined) {
            newRow[k] = row[k];
          }
        });

        return newRow;
      });
    }
    
    return result;
  }

  /**
   * Ejecuta la consulta de ConstruccionesGenerales
   */
  async consultarConstruccionesGenerales(schemaName, filters = {}) {
    return await this.ejecutarConsulta('ConstruccionesGenerales', schemaName, filters);
  }

  /**
   * Ejecuta la consulta de Colindantes
   */
  async consultarColindantes(schemaName, filters = {}) {
    return await this.ejecutarConsulta('Colindantes', schemaName, filters);
  }

  /**
   * Ejecuta la consulta de CartografiaInformacionGrafica
   */
  async consultarCartografia(schemaName, filters = {}) {
    return await this.ejecutarConsulta('CartografiaInformacionGrafica', schemaName, filters);
  }

  /**
   * Helper para citar identificadores SQL
   */
  quoteIdentifier(identifier) {
    return `"${identifier}"`;
  }
}

module.exports = new ConsultaAlfanumericoService();
