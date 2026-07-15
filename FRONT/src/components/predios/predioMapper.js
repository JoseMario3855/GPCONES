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
    condicion: getSeg(21, 1, '') || p.Condicion || p.condicion || (p.condicion_predio === 57 ? '0' : p.condicion_predio === 58 || p.condicion_predio === 59 ? '9' : p.condicion_predio === 60 || p.condicion_predio === 61 ? '8' : p.condicion_predio === 64 ? '4' : p.condicion_predio === 65 ? '2' : p.condicion_predio === 66 ? '3' : '0'),
    edificio: p.Edificio || p.edificio || getSeg(22, 2, '00'),
    piso: p.Piso || p.piso || getSeg(24, 2, '00'),
    unidadPredial: p.UnidadPredial || p["Unidad Predial"] || p.unidad_predial || getSeg(26, 4, '0000'),
    matriculaInmobiliaria: matriculaInmobiliaria,
    circulo: circulo,
    circuloNombre: getOripName(circulo),
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
    areaTerrenoGdb: p.area_terreno_gdb != null ? parseFloat(p.area_terreno_gdb) : null,
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
    escritura: (() => {
      const escVal = String(p.Escritura || p.escritura || p.fuente_administrativa || '').trim();
      const npnVal = String(p.Npn || p.npn || '').trim();
      if (escVal === npnVal || (escVal.length === 30 && /^\d+$/.test(escVal))) {
        return '';
      }
      return escVal;
    })(),
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
    identificador: (() => {
      const rawId = c.NumeroConstruccion || c.identificador || c.secuencia || '';
      if (!rawId) return `UC-${index + 1}`;
      const clean = String(rawId).trim();
      return clean.includes('-') ? clean.split('-').pop() : clean;
    })(),
    totalPlantas: c.total_plantas != null ? parseInt(c.total_plantas) : (c.NumeroPisos ? parseInt(c.NumeroPisos) : (c.totalPlantas ? parseInt(c.totalPlantas) : (c.total_pisos ? parseInt(c.total_pisos) : null))),
    altura: c.Altura != null ? parseFloat(c.Altura) : (c.altura != null ? parseFloat(c.altura) : null),
    plantaUbicacion: c.plantaubicacion != null ? parseInt(c.plantaubicacion) : (c.plantaUbicacion != null ? parseInt(c.plantaUbicacion) : null),
    etiqueta: c.FHNC || c.etiqueta || c.NumeroConstruccion || `Unidad ${index + 1}`,
    anioConstruccion: anio,
    uso: c.IdUso && c.IdUso.includes('|') ? c.IdUso.split('|')[1] : (c.uso || c.Uso || uso),
    usoTradicional: c.usoTradicional || c.usoTadicional || (c.IdUso && c.IdUso.includes('|') ? c.IdUso.split('|')[1] : null),
    tipoPlanta: c.tipoPlanta || c.tipo_planta || null,
    areaConstruida: c.areaConstruida != null ? parseFloat(c.areaConstruida) : (c.areaConstruidaGdb != null ? parseFloat(c.areaConstruidaGdb) : (c.AreaConstruida != null ? parseFloat(c.AreaConstruida) : (c.area_construida != null ? parseFloat(c.area_construida) : null))),
  };
};

export const getOripName = (code) => {
  if (!code) return '';
  const clean = String(code).trim();
  const padded = clean.padStart(3, '0');
  const oripNames = {
    // Antioquia
    '001': 'Medellín (Zona Sur/Norte)', '01': 'Medellín', '1': 'Medellín',
    '002': 'Abejorral',
    '003': 'Amalfi',
    '004': 'Andes',
    '005': 'Bolívar (Ciudad Bolívar)',
    '006': 'Cañasgordas',
    '007': 'Dabeiba',
    '008': 'Apartadó',
    '010': 'Fredonia',
    '011': 'Frontino',
    '012': 'Girardota',
    '013': 'Ituango',
    '014': 'Jericó',
    '015': 'Caucasia',
    '017': 'La Ceja',
    '018': 'Marinilla',
    '019': 'Puerto Berrío',
    '020': 'Rionegro',
    '022': 'Santa Bárbara',
    '024': 'Santa Fe de Antioquia',
    '025': 'Santa Rosa de Osos',
    '026': 'Santo Domingo',
    '027': 'Segovia',
    '028': 'Sonsón',
    '029': 'Sopetrán', '29': 'Sopetrán',
    '034': 'Turbo',
    '035': 'Urrao',
    '037': 'Yarumal',
    '038': 'Yolombó',
    '801': 'San Pedro de los Milagros',

    // Atlántico
    '040': 'Barranquilla',
    '041': 'Sabanalarga',

    // Arauca
    '055': 'Arauca',

    // Bogotá y Cundinamarca
    '050': 'Bogotá D.C.', '050C': 'Bogotá (Centro)', '050N': 'Bogotá (Norte)', '050S': 'Bogotá (Sur)',
    '150': 'Agua de Dios',
    '161': 'Chocontá',
    '162': 'Facatativá',
    '163': 'Fómeque',
    '164': 'Funza',
    '165': 'Fusagasugá',
    '166': 'Gachetá',
    '167': 'Girardot',
    '168': 'Guaduas',
    '169': 'La Mesa',
    '171': 'Pacho',
    '172': 'San Juan de Rioseco',
    '173': 'Soacha',
    '174': 'Ubaté',
    '175': 'Villeta',
    '176': 'Zipaquirá',

    // Bolívar
    '060': 'Cartagena',
    '061': 'El Carmen de Bolívar',
    '062': 'Magangué',
    '063': 'Mompós',
    '064': 'Simití',

    // Boyacá
    '070': 'Tunja',
    '071': 'Chiquinquirá',
    '072': 'El Cocuy',
    '073': 'Duitama',
    '074': 'Garagoa',
    '075': 'Guateque',
    '076': 'Miraflores',
    '077': 'Moniquirá',
    '078': 'Puerto Boyacá',
    '079': 'Ramiriquí',
    '081': 'Soatá',
    '082': 'Socha',
    '083': 'Sogamoso',

    // Caldas
    '100': 'Manizales',
    '101': 'Aguadas',
    '102': 'Anserma',
    '103': 'Manzanares',
    '104': 'Pácora',
    '105': 'Pensilvania',
    '106': 'Riosucio',
    '107': 'Salamina',

    // Cauca
    '120': 'Popayán',
    '121': 'Bolívar (Cauca)',
    '122': 'Caloto',
    '123': 'Guapi',
    '124': 'Patía (El Bordo)',
    '125': 'Puerto Tejada',
    '126': 'Santander de Quilichao',
    '127': 'Silvia',

    // Cesar
    '190': 'Valledupar',
    '141': 'Aguachica',
    '142': 'Chimichagua',

    // Chocó
    '180': 'Quibdó',
    '184': 'Istmina',

    // Córdoba
    '140': 'Montería',
    '143': 'Cereté',
    '146': 'Santa Cruz de Lorica',
    '148': 'Sahagún',

    // Huila
    '200': 'Neiva',
    '201': 'Garzón',
    '202': 'La Plata',
    '203': 'Pitalito',

    // La Guajira
    '210': 'Riohacha',
    '211': 'San Juan del Cesar',
    '212': 'Maicao',

    // Magdalena
    '220': 'Santa Marta',
    '221': 'Ciénaga',
    '222': 'El Banco',
    '223': 'Plato',
    '224': 'Pivijay',
    '225': 'San Sebastián de Buenavista',

    // Meta
    '230': 'Villavicencio',
    '231': 'Acacías',
    '232': 'Granada',
    '233': 'San Martín',

    // Nariño
    '240': 'Pasto',
    '241': 'Barbacoas',
    '242': 'Ipiales',
    '243': 'La Cruz',
    '244': 'La Unión',
    '245': 'Samaniego',
    '246': 'Túquerres',
    '247': 'Tumaco',

    // Norte de Santander
    '250': 'Cúcuta',
    '251': 'Ocaña',
    '252': 'Pamplona',
    '253': 'Salazar de las Palmas',

    // Quindío
    '270': 'Armenia',
    '271': 'Calarcá',

    // Risaralda
    '280': 'Pereira',
    '281': 'Belén de Umbría',
    '282': 'Santa Rosa de Cabal',

    // Santander
    '300': 'Bucaramanga',
    '301': 'Barrancabermeja',
    '302': 'Barbosa (Santander)',
    '303': 'Charalá',
    '304': 'Málaga',
    '305': 'Puente Nacional',
    '306': 'Rionegro (Santander)',
    '307': 'San Gil',
    '308': 'San Vicente de Chucurí',
    '309': 'Socorro',
    '310': 'Vélez',

    // Sucre
    '340': 'Sincelejo',
    '341': 'Corozal',
    '342': 'Sincé',
    '343': 'Sucre',
    '344': 'Majagual',
    '345': 'San Marcos',

    // Tolima
    '350': 'Ibagué',
    '351': 'Armero (Guayabal)',
    '352': 'Cajamarca',
    '353': 'Chaparral',
    '354': 'El Espinal',
    '355': 'El Guamo',
    '356': 'Lérida',
    '357': 'El Líbano',
    '358': 'Melgar',
    '359': 'Purificación',
    '360': 'Honda',

    // Valle del Cauca
    '370': 'Cali',
    '371': 'Guadalajara de Buga',
    '372': 'Buenaventura',
    '373': 'Cartago',
    '374': 'Florida',
    '375': 'Palmira',
    '376': 'Roldanillo',
    '377': 'Sevilla',
    '378': 'Tuluá',

    // Caquetá / Putumayo / Llanos / Casanare / Otros
    '160': 'Florencia (Caquetá)',
    '420': 'Belén de los Andaquíes (Caquetá)',
    '260': 'Mocoa (Putumayo)',
    '261': 'Puerto Asís (Putumayo)',
    '470': 'Yopal (Casanare)',
    '058': 'Puerto Carreño (Vichada)',
    '052': 'Inírida (Guainía)',
    '051': 'San José del Guaviare (Guaviare)',
    '290': 'Leticia (Amazonas)'
  };
  return oripNames[clean] || oripNames[padded] || '';
};
