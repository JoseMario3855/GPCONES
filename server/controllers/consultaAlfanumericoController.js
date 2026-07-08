const consultaAlfanumericoService = require('../services/consultaAlfanumericoService');

class ConsultaAlfanumericoController {
  /**
   * Consultar Fichas (Predios)
   * GET /api/consulta-alfanumerico/fichas
   */
  async consultarFichas(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido',
          message: 'Debe especificar el schema_name en los parámetros de consulta'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        npn: req.query.npn,
        municipio: req.query.municipio,
        matriculaInmobiliaria: req.query.matriculaInmobiliaria,
        documento: req.query.documento,
        predio_id: req.query.predio_id || req.query.predioId,
        limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      // Limpiar filtros undefined
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
          delete filters[key];
        }
      });

      const result = await consultaAlfanumericoService.consultarFichas(schema_name, filters);

      res.json(result);
    } catch (error) {
      console.error('Error en consultarFichas:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Consultar Propietarios
   * GET /api/consulta-alfanumerico/propietarios
   */
  async consultarPropietarios(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        npn: req.query.npn,
        matriculaInmobiliaria: req.query.matriculaInmobiliaria,
        documento: req.query.documento,
        predio_id: req.query.predio_id || req.query.predioId
      };

      // Limpiar filtros undefined
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
          delete filters[key];
        }
      });

      const result = await consultaAlfanumericoService.consultarPropietarios(schema_name, filters);

      res.json(result);
    } catch (error) {
      console.error('Error en consultarPropietarios:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Consultar Construcciones
   * GET /api/consulta-alfanumerico/construcciones
   */
  async consultarConstrucciones(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        npn: req.query.npn,
        matriculaInmobiliaria: req.query.matriculaInmobiliaria,
        documento: req.query.documento,
        predio_id: req.query.predio_id || req.query.predioId,
        limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      // Limpiar filtros undefined
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
          delete filters[key];
        }
      });

      const result = await consultaAlfanumericoService.consultarConstrucciones(schema_name, filters);

      res.json(result);
    } catch (error) {
      console.error('Error en consultarConstrucciones:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Consultar CalificacionesConstrucciones
   * GET /api/consulta-alfanumerico/calificaciones-construcciones
   */
  async consultarCalificacionesConstrucciones(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        npn: req.query.npn,
        matriculaInmobiliaria: req.query.matriculaInmobiliaria,
        documento: req.query.documento,
        limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      // Limpiar filtros undefined
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
          delete filters[key];
        }
      });

      const result = await consultaAlfanumericoService.consultarCalificacionesConstrucciones(schema_name, filters);

      res.json(result);
    } catch (error) {
      console.error('Error en consultarCalificacionesConstrucciones:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Consultar CalificacionesDetalle
   * GET /api/consulta-alfanumerico/calificaciones-detalle
   */
  async consultarCalificacionesDetalle(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        npn: req.query.npn,
        matriculaInmobiliaria: req.query.matriculaInmobiliaria,
        documento: req.query.documento,
        limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
          delete filters[key];
        }
      });

      const result = await consultaAlfanumericoService.consultarCalificacionesDetalle(schema_name, filters);

      if (result.success && Array.isArray(result.data)) {
        const { query } = require('../config/database');
        result.data.forEach(row => {
          if (row.ConvencionalNoConvencional === 'Convencional') {
            const calculated = calculateRowScore(row);
            if (row.convencional_id && (row.Puntos === null || parseInt(row.Puntos, 10) === 0 || parseInt(row.Puntos, 10) !== calculated)) {
              query(
                `UPDATE "${schema_name}"."cuc_calificacionconvencional" 
                 SET total_calificacion = $1 
                 WHERE t_id = $2`,
                [calculated, row.convencional_id]
              ).catch(err => {
                console.error(`Error de autocuración de puntos para calificación ${row.convencional_id}:`, err.message);
              });
            }
            row.Puntos = calculated;
          }
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Error en consultarCalificacionesDetalle:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }


  /**
   * Consultar ConstruccionesGenerales
   * GET /api/consulta-alfanumerico/construcciones-generales
   */
  async consultarConstruccionesGenerales(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        npn: req.query.npn,
        matriculaInmobiliaria: req.query.matriculaInmobiliaria,
        documento: req.query.documento,
        limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
          delete filters[key];
        }
      });

      const result = await consultaAlfanumericoService.consultarConstruccionesGenerales(schema_name, filters);

      res.json(result);
    } catch (error) {
      console.error('Error en consultarConstruccionesGenerales:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Consultar Colindantes
   * GET /api/consulta-alfanumerico/colindantes
   */
  async consultarColindantes(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        npn: req.query.npn,
        matriculaInmobiliaria: req.query.matriculaInmobiliaria,
        documento: req.query.documento,
        limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
          delete filters[key];
        }
      });

      const result = await consultaAlfanumericoService.consultarColindantes(schema_name, filters);

      res.json(result);
    } catch (error) {
      console.error('Error en consultarColindantes:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }

  /**
   * Consultar CartografiaInformacionGrafica
   * GET /api/consulta-alfanumerico/cartografia
   */
  async consultarCartografia(req, res) {
    try {
      const { schema_name } = req.query;
      
      if (!schema_name) {
        return res.status(400).json({
          success: false,
          error: 'Schema requerido'
        });
      }

      const filters = {
        nroFicha: req.query.nroFicha,
        npn: req.query.npn,
        matriculaInmobiliaria: req.query.matriculaInmobiliaria,
        documento: req.query.documento,
        limit: req.query.limit ? parseInt(req.query.limit) : 1000,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      // Limpiar filtros vacíos
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
          delete filters[key];
        }
      });

      const result = await consultaAlfanumericoService.consultarCartografia(schema_name, filters);

      res.json(result);
    } catch (error) {
      console.error('Error en consultarCartografia:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  }
}

module.exports = new ConsultaAlfanumericoController();

function calculateRowScore(row) {
  let tc = 'R';
  const tipoCal = row.tipocalificaion || '';
  if (tipoCal === 'Residencial') tc = 'R';
  else if (tipoCal === 'Comercial') tc = 'C';
  else if (tipoCal === 'Industrial') tc = 'I';
  else if (tipoCal === 'Institucional') tc = 'T';

  let total = 0;

  // Helper for exact case-insensitive match
  const matches = (val, target) => {
    if (!val) return false;
    const v = String(val).toLowerCase().replace(/_/g, ' ').replace(/,/g, ' ').trim();
    const t = String(target).toLowerCase().replace(/_/g, ' ').replace(/,/g, ' ').trim();
    return v === t;
  };

  // 1. Armazon
  const arm = row.armazon || '';
  if (matches(arm, 'Madera') || matches(arm, 'Madera Tapia') || matches(arm, '111|Madera Tapia')) {
    if (tc === 'R' || tc === 'T') total += 0;
    else if (tc === 'C' || tc === 'I') total += 4;
  } else if (matches(arm, 'Prefabricado') || matches(arm, '112|Prefabricado')) {
    if (tc === 'R' || tc === 'T') total += 1;
    else if (tc === 'C' || tc === 'I') total += 8;
  } else if (matches(arm, 'Ladrillo Bloque') || matches(arm, 'Ladrillo Bloque Madera Inmunizada') || matches(arm, '113|Ladrillo Bloque Madera Inmunizada') || matches(arm, 'Ladrillo,Bloque, Madera Inmunizada')) {
    if (tc === 'R' || tc === 'T') total += 2;
    else if (tc === 'C' || tc === 'I') total += 12;
  } else if (matches(arm, 'Concreto hasta tres pisos') || matches(arm, 'Concreto_Hasta_Tres_Pisos') || matches(arm, '114|Concreto Hasta Tres Pisos')) {
    if (tc === 'R' || tc === 'T') total += 4;
    else if (tc === 'C' || tc === 'I') total += 22;
  } else if (matches(arm, 'Concreto cuatro o mas pisos') || matches(arm, 'Concreto_Cuatro_O_Mas_Pisos') || matches(arm, '115|Concreto Cuatro o Mas Pisos')) {
    if (tc === 'R' || tc === 'T') total += 6;
    else if (tc === 'C' || tc === 'I') total += 22;
  }

  // 2. Muro
  const mur = row.muros || '';
  if (matches(mur, 'Materiales Desecho Esterilla') || matches(mur, 'Materiales_Desecho_Esterilla') || matches(mur, '121|Materiales Desecho Esterilla')) total += 0;
  else if (matches(mur, 'Bahareque Adobe Tapia') || matches(mur, 'Bahareque_Adobe_Tapia') || matches(mur, '122|Bahareque Adobe Tapia')) total += 1;
  else if (matches(mur, 'Madera') || matches(mur, '123|Madera')) total += 2;
  else if (matches(mur, 'Concreto Prefabricado') || matches(mur, 'Concreto_Prefabricado') || matches(mur, '124|Concreto Prefabricado')) total += 3;
  else if (matches(mur, 'Bloque Ladrillo') || matches(mur, 'Bloque_Ladrillo') || matches(mur, '125|Bloque Ladrillo')) total += 4;

  // 3. Cubierta
  const cub = row.cubierta || '';
  if (matches(cub, 'Materiales Desecho Telas Asfalticas') || matches(cub, 'Materiales_Desecho_Telas_Asfalticas') || matches(cub, '131|Materiales Desecho Telas Asfalticas')) total += 1;
  else if (matches(cub, 'Zinc Teja De Barro Eternit Rustico') || matches(cub, 'Zinc_Teja_De_Barro_Eternit_Rustico') || matches(cub, '132|Zinc Teja de Barro Eternit Rustico')) total += 3;
  else if (matches(cub, 'Entrepiso Cubierta Provisional Prefabricado') || matches(cub, 'Entrepiso_Cubierta_Provisional_Prefabricado') || matches(cub, '133|Entrepiso Cubierta Provisional Prefabricado')) total += 6;
  else if (matches(cub, 'Eternit O Teja De Barro Cubierta Sencilla') || matches(cub, 'Eternit_O_Teja_De_Barro_Cubierta_Sencilla') || matches(cub, '134|Eternit o Teja de Barro Cubierta Sencilla')) total += 9;
  else if (matches(cub, 'Azotea Aluminio Placa Sencilla Con Eternit') || matches(cub, 'Azotea_Aluminio_Placa_Sencilla_Con_Eternit') || matches(cub, '135|Azotea Aluminio Placa Sencilla con Eternit')) total += 13;
  else if (matches(cub, 'Placa Impermeabilizada Cubierta Lujosa') || matches(cub, 'Placa_Impermeabilizada_Cubierta_Lujosa_U_Ornamenta') || matches(cub, '136|Placa Impermeabilizada Cubierta Lujosa u Ornamenta')) {
    if (tc !== 'I') total += 16;
  }

  // 4. Conservacion Estructura
  const est = row.ConservacionEstructura || '';
  if (matches(est, 'Malo') || matches(est, '1041|Malo')) total += 0;
  else if (matches(est, 'Regular') || matches(est, '1042|Regular')) total += 2;
  else if (matches(est, 'Bueno') || matches(est, '1043|Bueno')) total += 4;
  else if (matches(est, 'Excelente') || matches(est, '1044|Excelente')) total += 5;

  // 5. Fachada
  const fac = row.Fachada || '';
  if (matches(fac, 'Pobre') || matches(fac, '211|Pobre')) {
    if (tc === 'R' || tc === 'T') total += 0;
    else if (tc === 'C' || tc === 'I') total += 2;
  } else if (matches(fac, 'Sencilla') || matches(fac, '212|Sencilla')) {
    if (tc === 'R' || tc === 'T') total += 2;
    else if (tc === 'C' || tc === 'I') total += 4;
  } else if (matches(fac, 'Regular') || matches(fac, '213|Regular')) {
    if (tc === 'R' || tc === 'T') total += 4;
    else if (tc === 'C' || tc === 'I') total += 6;
  } else if (matches(fac, 'Buena') || matches(fac, 'Bueno') || matches(fac, '214|Buena') || matches(fac, '214|Bueno')) {
    if (tc === 'R' || tc === 'T') total += 6;
    else if (tc === 'C') total += 8;
  } else if (matches(fac, 'Lujosa') || matches(fac, 'Lujoso') || matches(fac, '215|Lujosa') || matches(fac, '215|Lujoso')) {
    if (tc === 'R' || tc === 'T') total += 8;
    else if (tc === 'C') total += 12;
  }

  // 6. Cubrimiento Muro
  const cubm = row.CubrimientosMuro || '';
  if (matches(cubm, 'Sin Cubrimiento') || matches(cubm, 'Sin_Cubrimiento') || matches(cubm, '221|Sin Cubrimiento')) total += 0;
  else if (matches(cubm, 'Paniete Papel Comun Ladrillo Prensado') || matches(cubm, 'Paniete_Papel_Comun_Ladrillo_Prensado') || matches(cubm, '222|Paniete Papel Comun Ladrillo Prensado')) {
    if (tc === 'R' || tc === 'T') total += 1;
    else if (tc === 'C' || tc === 'I') total += 2;
  } else if (matches(cubm, 'Estuco Ceramica Papel Fino') || matches(cubm, 'Estuco_Ceramica_Papel_Fino') || matches(cubm, '223|Estuco Ceramica Papel Fino')) {
    if (tc === 'R' || tc === 'T') total += 2;
    else if (tc === 'C') total += 3;
  } else if (matches(cubm, 'Madera Piedra Ornamental') || matches(cubm, 'Madera_Piedra_Ornamental') || matches(cubm, '224|Madera Piedra Ornamental')) {
    if (tc === 'R' || tc === 'T') total += 3;
    else if (tc === 'C') total += 5;
  } else if (matches(cubm, 'Marmol Lujosos Otros') || matches(cubm, 'Marmol_Lujosos_Otros') || matches(cubm, '225|Marmol Lujosos Otros')) {
    if (tc === 'R' || tc === 'T') total += 4;
    else if (tc === 'C') total += 7;
  }

  // 7. Piso
  const pis = row.Piso || '';
  if (matches(pis, 'Tierra Pisada') || matches(pis, 'Tierra_Pisada') || matches(pis, '231|Tierra Pisada')) total += 0;
  else if (matches(pis, 'Cemento Madera Burda') || matches(pis, 'Cemento_Madera_Burda') || matches(pis, '232|Cemento Madera Burda')) {
    if (tc === 'R' || tc === 'T') total += 2;
    else if (tc === 'C' || tc === 'I') total += 3;
  } else if (matches(pis, 'Baldosa Comun De Cemento Tablon Ladrillo') || matches(pis, 'Baldosa_Comun_De_Cemento_Tablon_Ladrillo') || matches(pis, '233|Baldosa Comun de Cemento Tablon Ladrillo')) {
    if (tc === 'R' || tc === 'T') total += 3;
    else if (tc === 'C' || tc === 'I') total += 5;
  } else if (matches(pis, 'Liston Machihembrado') || matches(pis, 'Liston_Machihembrado') || matches(pis, '234|Liston Machihembrado')) {
    if (tc === 'R' || tc === 'T') total += 4;
    else if (tc === 'C') total += 7;
  } else if (matches(pis, 'Tableta Caucho Acrilico Granito Baldosa Fina') || matches(pis, 'Tableta_Caucho_Acrilico_Granito_Baldosa_Fina') || matches(pis, '235|Tableta Caucho Acrilico Granito Baldosa Fina')) {
    if (tc === 'R' || tc === 'T') total += 6;
    else if (tc === 'C' || tc === 'I') total += 9;
  } else if (matches(pis, 'Parquet Alfombra Retal De Marmol') || matches(pis, 'Parquet_Alfombra_Retal_De_Marmol') || matches(pis, '236|Parquet Alfombra Retal de Marmol')) {
    if (tc === 'R' || tc === 'T') total += 8;
    else if (tc === 'C') total += 11;
  } else if (matches(pis, 'Retal De Marmol Marmol Otros Lujosos') || matches(pis, 'Retal_De_Marmol_Marmol_Otros_Lujosos') || matches(pis, '237|Retal de Marmol Marmol Otros Lujosos')) {
    if (tc === 'R' || tc === 'T') total += 9;
    else if (tc === 'C') total += 13;
  }

  // 8. Conservacion Acabados
  const acab = row.ConservacionAcabados || '';
  if (matches(acab, 'Malo') || matches(acab, '1041|Malo')) total += 0;
  else if (matches(acab, 'Regular') || matches(acab, '1042|Regular')) total += 2;
  else if (matches(acab, 'Bueno') || matches(acab, '1043|Bueno')) total += 4;
  else if (matches(acab, 'Excelente') || matches(acab, '1044|Excelente')) total += 5;

  // 9. Tamanio Banio
  const tamb = row.Tamaniobanio || '';
  if (tc === 'R' || tc === 'T') {
    if (matches(tamb, 'Sin Banio') || matches(tamb, 'Sin_Banio') || matches(tamb, '311|Sin Banio')) total += 0;
    else if (matches(tamb, 'Pequenio') || matches(tamb, 'Pequeno') || matches(tamb, '312|Pequenio')) total += 1;
    else if (matches(tamb, 'Mediano') || matches(tamb, '313|Mediano')) total += 2;
    else if (matches(tamb, 'Grande') || matches(tamb, '314|Grande')) total += 3;
  }

  // 10. Enchape Banio
  const encb = row.EnchapeBanio || '';
  if (tc === 'R' || tc === 'T') {
    if (matches(encb, 'Sin Cubrimiento') || matches(encb, 'Sin_Cubrimiento') || matches(encb, '321|Sin Cubrimiento')) total += 0;
    else if (matches(encb, 'Paniete Baldosa Comun De Cemento') || matches(encb, 'Paniete_Baldosa_Comun_De_Cemento') || matches(encb, '322|Paniete Baldosa Comun de Cemento')) total += 1;
    else if (matches(encb, 'Baldosin Unicolor Papel Comun') || matches(encb, 'Baldosin_Unicolor_Papel_Comun') || matches(encb, '323|Baldosin Unicolor Papel Comun')) total += 2;
    else if (matches(encb, 'Baldosin Decorado Papel Fino') || matches(encb, 'Baldosin_Decorado_Papel_Fino') || matches(encb, '324|Baldosin Decorado Papel Fino')) total += 3;
    else if (matches(encb, 'Ceramica Cristanac Granito') || matches(encb, 'Ceramica_Cristanac_Granito') || matches(encb, '325|Ceramica Cristanac Granito')) total += 4;
    else if (matches(encb, 'Marmol Enchape Lujoso') || matches(encb, 'Marmol_Enchape_Lujoso') || matches(encb, '326|Marmol Enchape Lujoso')) total += 5;
  }

  // 11. Mobiliario Banio
  const mobb = row.mobiliariobanio || '';
  if (tc === 'R' || tc === 'T' || tc === 'C') {
    if (matches(mobb, 'Pobre') || matches(mobb, '331|Pobre')) total += 0;
    else if (matches(mobb, 'Sencillo') || matches(mobb, '332|Sencillo')) total += 3;
    else if (matches(mobb, 'Regular') || matches(mobb, '333|Regular')) total += 6;
    else if (matches(mobb, 'Bueno') || matches(mobb, '334|Bueno')) total += 9;
    else if (matches(mobb, 'Lujoso') || matches(mobb, '335|Lujoso')) {
      if (tc === 'R' || tc === 'T') total += 11;
      else if (tc === 'C') total += 15;
    }
  }

  // 12. Conservacion Banio
  const consb = row.ConservacionBanio || '';
  if (tc === 'R' || tc === 'T') {
    if (matches(consb, 'Malo') || matches(consb, '1041|Malo')) total += 0;
    else if (matches(consb, 'Regular') || matches(consb, '1042|Regular')) total += 2;
    else if (matches(consb, 'Bueno') || matches(consb, '1043|Bueno')) total += 4;
    else if (matches(consb, 'Excelente') || matches(consb, '1044|Excelente')) total += 5;
  }

  // 13. Tamanio Cocina
  const tamc = row.Tamaniococina || '';
  if (tc === 'R' || tc === 'T') {
    if (matches(tamc, 'Sin Cocina') || matches(tamc, 'Sin_Cocina') || matches(tamc, '411|Sin Cocina')) total += 0;
    else if (matches(tamc, 'Pequenia') || matches(tamc, 'Pequeno') || matches(tamc, '412|Pequenia')) total += 1;
    else if (matches(tamc, 'Mediana') || matches(tamc, '413|Mediana')) total += 2;
    else if (matches(tamc, 'Grande') || matches(tamc, '414|Grande')) total += 3;
  }

  // 14. Enchape Cocina
  const encc = row.enchapecocina || '';
  if (tc === 'R' || tc === 'T') {
    if (matches(encc, 'Sin Cubrimiento') || matches(encc, 'Sin_Cubrimiento') || matches(encc, '421|Sin Cubrimiento')) total += 0;
    else if (matches(encc, 'Paniete Baldosa De Cemento') || matches(encc, 'Paniete_Baldosa_De_Cemento') || matches(encc, '422|Paniete Baldosa de Cemento')) total += 1;
    else if (matches(encc, 'Baldosin Unicolor Papel Comun') || matches(encc, 'Baldosin_Unicolor_Papel_Comun') || matches(encc, '423|Baldosin Unicolor Papel Comun')) total += 2;
    else if (matches(encc, 'Baldosin Decorado Papel Fino') || matches(encc, 'Baldosin_Decorado_Papel_Fino') || matches(encc, '424|Baldosin Decorado Papel Fino')) total += 3;
    else if (matches(encc, 'Ceramica Cristanac Granito') || matches(encc, 'Ceramica_Cristanac_Granito') || matches(encc, '425|Ceramica Cristanac Granito')) total += 4;
    else if (matches(encc, 'Marmol Enchape Lujoso') || matches(encc, 'Marmol_Enchape_Lujoso') || matches(encc, '426|Marmol Enchape Lujoso')) total += 5;
  }

  // 15. Mobiliario Cocina
  const mobc = row.mobiliariococina || '';
  if (tc === 'R' || tc === 'T' || tc === 'C') {
    if (matches(mobc, 'Pobre') || matches(mobc, '431|Pobre')) total += 0;
    else if (matches(mobc, 'Sencillo') || matches(mobc, '432|Sencillo')) {
      if (tc === 'R' || tc === 'T') total += 2;
      else if (tc === 'C') total += 3;
    } else if (matches(mobc, 'Regular') || matches(mobc, '433|Regular')) {
      if (tc === 'R' || tc === 'T') total += 3;
      else if (tc === 'C') total += 6;
    } else if (matches(mobc, 'Bueno') || matches(mobc, '434|Bueno')) {
      if (tc === 'R' || tc === 'T') total += 4;
      else if (tc === 'C') total += 9;
    } else if (matches(mobc, 'Lujoso') || matches(mobc, '435|Lujoso')) {
      if (tc === 'R' || tc === 'T') total += 6;
      else if (tc === 'C') total += 13;
    }
  }

  // 16. Conservacion Cocina
  const consc = row.ConservacionCocina || '';
  if (tc === 'R' || tc === 'T') {
    if (matches(consc, 'Malo') || matches(consc, '1041|Malo')) total += 0;
    else if (matches(consc, 'Regular') || matches(consc, '1042|Regular')) total += 2;
    else if (matches(consc, 'Bueno') || matches(consc, '1043|Bueno')) total += 4;
    else if (matches(consc, 'Excelente') || matches(consc, '1044|Excelente')) total += 5;
  }

  // 17. Complemento Industrial
  const compl = row.complementoindustrial || '';
  if (tc === 'I') {
    if (matches(compl, 'Madera') || matches(compl, '511|Madera Rustica')) total += 6;
    else if (matches(compl, 'Metalica Liviana') || matches(compl, 'Metalica_Liviana') || matches(compl, '512|Metalica o de Madera Liviana')) total += 12;
    else if (matches(compl, 'Metalica Mediana') || matches(compl, 'Metalica_Mediana') || matches(compl, '513|Metalica o de Madera Mediana')) total += 22;
    else if (matches(compl, 'Metalica Pesada') || matches(compl, 'Metalica_Pesada') || matches(compl, '514|Metalica Pesada')) total += 34;
  }

  return total;
}

