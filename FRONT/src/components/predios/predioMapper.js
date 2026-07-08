// Helper functions to map backend model objects to UI representations in GPCONES

export const mapPredio = (p) => {
  if (!p) return {};
  
  const npn = p.Npn || p.npn || p.NumCedulaCatastral || p.numero_predial || p.numero_predial_nacional || '';
  const departamento = p.Departamento || p.DepartamentoPredio || p.departamento || '';
  const municipio = p.Municipio || p.MunicipioPredio || p.municipio || '';
  const circulo = p.circulo || p.codigo_orip || p.Circulo || '';
  const matriculaInmobiliaria = p.MatriculaInmobiliaria || p.matricula_inmobiliaria || p.matriculaInmobiliaria || '';
  const libro = p.Libro || p.libro || '';
  const tomo = p.Tomo || p.tomo || '';
  const pagina = p.Pagina || p.pagina || '';
  
  const npnClean = npn.replace(/\s/g, '');
  const getSeg = (start, len, defaultValue) => {
    if (npnClean.length >= start + len) {
      return npnClean.substring(start, start + len);
    }
    return defaultValue;
  };

  return {
    t_id: p.predio_t_id || p.t_id,
    id: p.id || p.predio_t_id || p.t_id,
    npn: npn,
    departamento: departamento,
    municipio: municipio,
    tipo: p.Tipo || p.tipo || '',
    espacio_de_nombres: p.NroFicha || p.espacio_de_nombres || p.n_ficha || p.NumeroFicha || '',
    zona: p.Zona || p.zona || getSeg(5, 2, '00'),
    sector: p.Sector || p.sector || getSeg(7, 2, '00'),
    comuna: p.Comuna || p.comuna || getSeg(9, 2, '00'),
    barrio: p.Barrio || p.barrio || getSeg(11, 2, '00'),
    manzana: p["Manzana o Vereda"] || p.manzana || p.vereda || getSeg(13, 4, '0000'),
    terreno: p.Terreno || p.terreno || getSeg(17, 4, '0000'),
    condicion: p.Condicion || p.condicion || p.condicion_predio || getSeg(21, 1, '0'),
    edificio: p.Edificio || p.edificio || getSeg(22, 2, '00'),
    piso: p.Piso || p.piso || getSeg(24, 2, '00'),
    unidadPredial: p.UnidadPredial || p["Unidad Predial"] || p.unidad_predial || getSeg(26, 4, '0000'),
    matriculaInmobiliaria: matriculaInmobiliaria,
    circulo: circulo,
    libro: libro,
    tomo: tomo,
    pagina: pagina,
    modoAdquisicion: p.ModoAdquisicion || p.modo_adquisicion || '1|DOMINIO (TRADICION)',
    condicionPredio: p.CaracteristicaPredio || p.condicion_predio || p.condicion || '1|NPH (0)',
    destinoEconomico: p.DestinoEcconomico || p.destino_economico || p.destinacion_economica || '1|HABITACIONAL',
    tipoDireccion: p.TipoDireccion || p.tipo_direccion || 'Estructurada',
    direccionReal: p.DireccionReal || p.Direccion || p.direccion || p.nombre || '—',
    direccionNombre: p.DireccionNombre || p.nombre || p.nombre_predio || '—',
    totalUnidades: p.UnidadesEnRPH ? parseInt(p.UnidadesEnRPH) : (p.total_unidades ? parseInt(p.total_unidades) : null),
    numeroTorres: p.TotalEdificios ? parseInt(p.TotalEdificios) : (p.numero_torres ? parseInt(p.numero_torres) : null),
    areaTotalTerreno: p.AreaTotalTerreno ? parseFloat(p.AreaTotalTerreno) : (p.area_total_terreno ? parseFloat(p.area_total_terreno) : (p.area_hectareas ? parseFloat(p.area_hectareas) * 10000 : null)),
    areaTotalTerrenoComun: p.AreaLoteComun ? parseFloat(p.AreaLoteComun) : (p.area_total_terreno_comun ? parseFloat(p.area_total_terreno_comun) : null),
    areaTotalTerrenoPrivada: p.AreaLotePrivada ? parseFloat(p.AreaLotePrivada) : (p.area_total_terreno_privada ? parseFloat(p.area_total_terreno_privada) : null),
    areaTotalConstruida: p.AreaTotalConstruida ? parseFloat(p.AreaTotalConstruida) : (p.area_total_construida ? parseFloat(p.area_total_construida) : null),
    areaTotalConstruidaComun: p.area_total_construida_comun ? parseFloat(p.area_total_construida_comun) : null,
    areaTotalConstruidaPrivada: p.area_total_construida_privada ? parseFloat(p.area_total_construida_privada) : null,
    geometry: p.geometry || null,
    constructionGeometries: p.construction_geometries || [],
  };
};

export const mapPropietario = (p) => {
  if (!p) return {};
  
  let tipoDerecho = p.TipoDerecho || p.tipo_derecho || 'Dominio';
  if (tipoDerecho.toLowerCase().includes('dominio')) tipoDerecho = 'Dominio';
  else if (tipoDerecho.toLowerCase().includes('posesion')) tipoDerecho = 'Posesion';
  else if (tipoDerecho.toLowerCase().includes('ocupacion')) tipoDerecho = 'Ocupacion';
  
  let tipoDoc = p.TipoDocumento || p.tipo_documento || 'Cedula_Ciudadania';
  if (tipoDoc.includes('10|') || tipoDoc.toLowerCase().includes('ciudadania') || tipoDoc.toUpperCase() === 'CC') {
    tipoDoc = 'Cedula_Ciudadania';
  } else if (tipoDoc.includes('3|') || tipoDoc.toLowerCase().includes('nit')) {
    tipoDoc = 'NIT';
  } else if (tipoDoc.includes('6|') || tipoDoc.toLowerCase().includes('identidad') || tipoDoc.toUpperCase() === 'TI') {
    tipoDoc = 'Tarjeta_Identidad';
  } else if (tipoDoc.includes('4|') || tipoDoc.toLowerCase().includes('extranjeria') || tipoDoc.toUpperCase() === 'CE') {
    tipoDoc = 'Cedula_Extranjeria';
  } else if (tipoDoc.includes('7|') || tipoDoc.toLowerCase().includes('pasaporte')) {
    tipoDoc = 'Pasaporte';
  } else if (tipoDoc.includes('5|') || tipoDoc.toLowerCase().includes('registro civil') || tipoDoc.toUpperCase() === 'RC') {
    tipoDoc = 'Registro_Civil';
  }

  let derecho = parseFloat(p.Derecho || p.Participacion || p.participacion || 100);
  if (isNaN(derecho)) derecho = 100;

  return {
    rrr: p.rrr || p.t_id || p.id || null,
    tipoDerecho: tipoDerecho,
    tipoAgrupacion: p.TipoAgrupacion || p.tipo_agrupacion || null,
    tipoFuente: p.TipoFuente || p.tipo_fuente || 'Escritura_Publica',
    escritura: p.Escritura || p.escritura || p.fuente_administrativa || '',
    entidad: p.Entidad || p.ente_emisor || p.entidad || '—',
    fechaEscritura: p.FechaEscritura || p.fecha_escritura || '',
    fecha: p.Fecha || p.fecha_registro || p.fecha || '',
    tipoDocumento: tipoDoc,
    documento: p.Documento || p.documento || '',
    primerNombre: p.PrimerNombre || p.primer_nombre || '',
    segundoNombre: p.SegundoNombre || p.segundo_nombre || '',
    primerApellido: p.PrimerApellido || p.primer_apellido || '',
    segundoApellido: p.SegundoApellido || p.segundo_apellido || '',
    razonSocial: p.RazonSocial || p.razon_social || null,
    derecho: derecho,
    disponibilidad: p.Disponibilidad || p.disponibilidad || 'Disponible',
  };
};

export const mapConstruccion = (c, index) => {
  if (!c) return {};
  
  let tipo = 'Convencional';
  if (c.tipo) {
    tipo = c.tipo;
  } else if (c.ConvencionalNoConvencional) {
    if (c.ConvencionalNoConvencional.toLowerCase().includes('no')) {
      tipo = 'No_Convencional';
    } else {
      tipo = 'Convencional';
    }
  } else if (c.TipoConstruccion === 'N' || c.TipoConstruccion === 'Anexo') {
    tipo = 'No_Convencional';
  }

  let uso = 'Habitacional';
  const usoRaw = (c.Uso || c.uso || c.IdUso || c.TipoConstruccion || '').toLowerCase();
  if (usoRaw.includes('habitacional') || usoRaw.includes('residencial') || usoRaw === 'r') {
    uso = 'Habitacional';
  } else if (usoRaw.includes('comercio') || usoRaw.includes('comercial') || usoRaw === 'c') {
    uso = 'Comercio';
  } else if (usoRaw.includes('industrial') || usoRaw === 'i') {
    uso = 'Industrial';
  } else if (usoRaw.includes('institucional') || usoRaw === 't') {
    uso = 'Institucional';
  } else {
    uso = 'Mixto';
  }

  let anio = c.añoConstruccion || c.AñoConstruccion || c.anioConstruccion || c.anio_construccion || null;
  if (anio !== null && anio < 200) {
    anio = 2025 - anio;
  }

  return {
    caracteristica: c.t_id || c.caracteristica || index + 1,
    tipo: tipo,
    identificador: c.NumeroConstruccion || c.identificador || c.secuencia || `UC-${index + 1}`,
    totalPlantas: c.total_plantas != null ? parseInt(c.total_plantas) : (c.NumeroPisos ? parseInt(c.NumeroPisos) : (c.totalPlantas ? parseInt(c.totalPlantas) : (c.total_pisos ? parseInt(c.total_pisos) : null))),
    altura: c.Altura != null ? parseFloat(c.Altura) : (c.altura != null ? parseFloat(c.altura) : null),
    plantaUbicacion: c.plantaubicacion != null ? parseInt(c.plantaubicacion) : (c.plantaUbicacion != null ? parseInt(c.plantaUbicacion) : null),
    etiqueta: c.FHNC || c.etiqueta || c.NumeroConstruccion || `Unidad ${index + 1}`,
    anioConstruccion: anio,
    uso: c.IdUso && c.IdUso.includes('|') ? c.IdUso.split('|')[1] : (c.uso || c.Uso || uso),
    usoTradicional: c.usoTradicional || c.usoTadicional || (c.IdUso && c.IdUso.includes('|') ? c.IdUso.split('|')[1] : null),
    tipoPlanta: c.tipoPlanta || c.tipo_planta || null,
  };
};
