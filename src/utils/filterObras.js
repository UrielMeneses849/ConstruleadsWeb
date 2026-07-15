const TIPO_OBRA_POR_SUBGENERO = {
  Lujo: [
    'Condominios de Lujo',
    'Vivienda Unifamiliar de Lujo',
  ],
  Medio: [
    'Condominios Medio',
    'Vivienda Unifamiliar Interes Medio',
  ],
  Social: [
    'Vivienda Plurifamiliar Interes Social',
    'Vivienda Unifamiliar Interes Social',
  ],
  Comercial: [
    'Plazas Comercio, Tiendas, Autoservicio',
    'Edificios de Oficinas',
    'Bancarias, Bolsa y Corredurias',
    'Agencias Automotrices y Talleres',
    'Centrales de Carga y Distribucion',
    'Restaurantes y Salones de Eventos',
    'Mercados Publicos y Centrales de Abastos',
    'Cines y Teatros',
    'Centros de Diversiones',
    'Gasolinerias',
    'Terminales de Transporte',
    'Edificios de Estacionamiento',
  ],
  Educativo: [
    'Edificios de Educacion Superior',
    'Edificios de Educacion Basica',
    'Edificios de Educacion Media',
  ],
  Institucional: [
    'Judiciales y Bomberos',
    'Albergues, Orfanatos, Asilos y Conventos',
    'Iglesias y Templos',
    'Crematorios y Velatorios',
    'Instalaciones Deportivas',
  ],
  Salud: [
    'Centros de Rehabilitacion y Salud',
    'Clinicas, Hospitales y Centros Medicos',
  ],
  Turistico: [
    'Desarrollos Turisticos - Hoteleros',
    'Hoteles 4, 5 Estrellas, G.Turismo, Negocios',
    'Hoteles de 1, 2 y 3 Estrellas y Moteles',
  ],
  Industrial: [
    'Naves, Almacenes y Bodegas',
    'Camaras Frigorificas y Rastros',
    'Laboratorios',
    'Plantas Industriales',
    'Parques Industriales',
    'Petroleras, Petroquimicas y Refinerias',
    'Hidro + Termoelectricas y Subestaciones',
  ],
  Infraestructura: [
    'Hidro - Agropecuaria',
    'Agua Potable',
    'Drenaje y Saneamiento',
    'Telecomunicaciones',
    'Electrificacion',
    'Maritimas',
    'Aeropuertos',
    'Vias Ferreas, Tren Ligero, Metro',
    'Urbanizacion',
    'Carreteras',
    'Redes de Gas',
    'Presas',
    'Plantas de Tratamiento de Agua',
    'Puentes y Estructuras',
    'Pavimentos',
    'Tren Alta Velocidad',
  ],
};

function parseFlexibleDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = String(value).trim();
  if (!normalized) return null;

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const localMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (localMatch) {
    const [, day, month, year] = localMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getArrayFilter(filtros, primaryKey, fallbackKey) {
  const primary = filtros?.[primaryKey];
  if (Array.isArray(primary)) return primary;
  if (typeof primary === 'string' && primary.trim()) return [primary];

  const fallback = filtros?.[fallbackKey];
  if (Array.isArray(fallback)) return fallback;
  if (typeof fallback === 'string' && fallback.trim()) return [fallback];

  return [];
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseFilterNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const numeric = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getNumericRangeFilterValue(filtros, primaryKeys = [], fallbackKeys = [], fallback = null) {
  const allKeys = [...primaryKeys, ...fallbackKeys];

  for (const key of allKeys) {
    if (!(key in (filtros || {}))) continue;
    const value = filtros?.[key];
    if (value === null || value === undefined || value === '') continue;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }

  return fallback;
}

function matchesTextList(value, list = []) {
  if (!list.length) return false;
  const normalizedValue = normalizeText(value);
  return list.some((item) => normalizeText(item) === normalizedValue);
}

export function getSelectedDateField(filtros = {}) {
  return (
    filtros.fechaConsulta ||
    filtros.selectedValues?.['Fecha de consulta'] ||
    'Fecha de publicación'
  );
}

export function getObraTimeByFilter(obra, selectedDateField) {
  if (selectedDateField === 'Fecha de inicio probable') {
    return obra.fechaInicioTime || parseFlexibleDate(obra.fechaInicio)?.getTime() || null;
  }

  if (selectedDateField === 'Fecha de término probable') {
    return obra.fechaTerminoTime || parseFlexibleDate(obra.fechaTermino)?.getTime() || null;
  }

  return obra.fechaPublicacionTime || parseFlexibleDate(obra.fechaPublicacion)?.getTime() || null;
}

function matchesSurfaceRange(superficie, range) {
  if (!Number.isFinite(superficie)) return false;

  if (!range) return false;

  if (range.includes('0 - 1,000') || range.includes('0 - 1000')) {
    return superficie <= 1000;
  }

  if (
    range.includes('1,000 - 5,000') ||
    range.includes('1000 - 5000')
  ) {
    return superficie > 1000 && superficie <= 5000;
  }

  if (
    range.includes('5,000 - 10,000') ||
    range.includes('5000 - 10000')
  ) {
    return superficie > 5000 && superficie <= 10000;
  }

  if (range.includes('> 10,000') || range.includes('> 10000')) {
    return superficie > 10000;
  }

  return false;
}

export function filterObrasByFilters(obras = [], filtros = {}) {
  let resultado = [...obras];

  const selectedDateField = getSelectedDateField(filtros);
  const periodIndex = Number(filtros.periodoIndex ?? -1);
  const fechaInicioFiltro =
    filtros.fechaInicio ||
    filtros.fechaRango?.desde ||
    '';
  const fechaFinFiltro =
    filtros.fechaFin ||
    filtros.fechaRango?.hasta ||
    '';

  const diasPorPeriodo = {
    0: 0,
    1: 1,
    2: 7,
    3: 30,
    4: 90,
    5: 180,
  };

  const diasSeleccionados = diasPorPeriodo[periodIndex];

  if (fechaInicioFiltro && fechaFinFiltro) {
    const fechaInicio = new Date(`${fechaInicioFiltro}T00:00:00`);
    const fechaFin = new Date(`${fechaFinFiltro}T23:59:59`);

    if (
      !Number.isNaN(fechaInicio.getTime()) &&
      !Number.isNaN(fechaFin.getTime())
    ) {
      const fechaInicioTime = fechaInicio.getTime();
      const fechaFinTime = fechaFin.getTime();

      resultado = resultado.filter((obra) => {
        const fechaObraTime = getObraTimeByFilter(obra, selectedDateField);
        if (!fechaObraTime) return false;
        return fechaObraTime >= fechaInicioTime && fechaObraTime <= fechaFinTime;
      });
    }
  } else if (typeof diasSeleccionados === 'number' && diasSeleccionados >= 0) {
    const hoy = new Date();
    const fechaInicio = new Date(hoy);
    const fechaFin = new Date(hoy);

    if (selectedDateField === 'Fecha de publicación') {
      fechaInicio.setDate(hoy.getDate() - diasSeleccionados);
    } else {
      fechaFin.setDate(hoy.getDate() + diasSeleccionados);
    }

    fechaInicio.setHours(0, 0, 0, 0);
    fechaFin.setHours(23, 59, 59, 999);
    const fechaInicioTime = fechaInicio.getTime();
    const fechaFinTime = fechaFin.getTime();

    resultado = resultado.filter((obra) => {
      const fechaObraTime = getObraTimeByFilter(obra, selectedDateField);
      if (!fechaObraTime) return false;
      return fechaObraTime >= fechaInicioTime && fechaObraTime <= fechaFinTime;
    });
  }

  const regiones = getArrayFilter(filtros, 'regiones', 'selectedRegiones');
  const estados = getArrayFilter(filtros, 'estados', 'selectedEstados');
  const generos = getArrayFilter(filtros, 'generos', 'selectedGeneros');
  const subgeneros = getArrayFilter(filtros, 'subgeneros', 'selectedSubgeneros');
  const sectores = getArrayFilter(filtros, 'sectores', 'selectedSectores');
  const etapas = getArrayFilter(filtros, 'etapas', 'selectedEtapas');
  const desarrollos = getArrayFilter(filtros, 'desarrollos', 'selectedDesarrollos');
  const tipoObra = getArrayFilter(filtros, 'tipoObra', 'selectedTipoObra');
  const tiposProyecto = getArrayFilter(filtros, 'tiposProyecto', 'selectedTiposProyecto');

  if (regiones.length) {
    resultado = resultado.filter((obra) =>
      matchesTextList(obra.region, regiones)
    );
  }

  if (estados.length) {
    resultado = resultado.filter((obra) =>
      matchesTextList(obra.estado, estados)
    );
  }

  if (generos.length) {
    resultado = resultado.filter((obra) =>
      matchesTextList(obra.genero, generos)
    );
  }

  if (tipoObra.length) {
    resultado = resultado.filter((obra) =>
      matchesTextList(obra.tipoObra, tipoObra)
    );
  }

  if (desarrollos.length) {
    resultado = resultado.filter((obra) =>
      matchesTextList(obra.tipoDesarrollo, desarrollos)
    );
  }

  if (etapas.length) {
    resultado = resultado.filter((obra) =>
      matchesTextList(obra.etapa, etapas)
    );
  }

  if (tiposProyecto.length) {
    resultado = resultado.filter((obra) =>
      matchesTextList(obra.tipoProyecto, tiposProyecto)
    );
  }

  if (subgeneros.length) {
    const tiposObraPermitidos = subgeneros.flatMap(
      (subgenero) => TIPO_OBRA_POR_SUBGENERO[subgenero] || []
    );

    if (tiposObraPermitidos.length) {
      resultado = resultado.filter((obra) =>
        matchesTextList(obra.tipoObra, tiposObraPermitidos)
      );
    }
  }

  const investmentMinPesos = parseFilterNumber(filtros.investmentMin ?? filtros.inversionMin, 0);
  const investmentMaxPesos = parseFilterNumber(filtros.investmentMax ?? filtros.inversionMax, null);

  const hasValidInvestmentRange =
    Number.isFinite(investmentMinPesos) &&
    Number.isFinite(investmentMaxPesos) &&
    investmentMaxPesos >= investmentMinPesos;

  if (hasValidInvestmentRange && investmentMinPesos > 0) {
    resultado = resultado.filter((obra) => Number(obra.inversion) >= investmentMinPesos);
  }

  if (hasValidInvestmentRange && investmentMaxPesos > 0) {
    resultado = resultado.filter((obra) => Number(obra.inversion) <= investmentMaxPesos);
  }

  const superficieMin = getNumericRangeFilterValue(
    filtros,
    ['superficieMin', 'surfaceMin'],
    ['superficie_min', 'surface_min'],
    null
  );
  const superficieMax = getNumericRangeFilterValue(
    filtros,
    ['superficieMax', 'surfaceMax'],
    ['superficie_max', 'surface_max'],
    null
  );

  if (Number.isFinite(superficieMin) && Number.isFinite(superficieMax) && superficieMax >= superficieMin) {
    resultado = resultado.filter((obra) => {
      const superficie = Number(obra.superficie);
      if (!Number.isFinite(superficie)) return false;
      return superficie >= superficieMin && superficie <= superficieMax;
    });
  } else {
    const superficieSeleccionada = Array.isArray(filtros.superficie)
      ? filtros.superficie
      : [];

    if (superficieSeleccionada.length) {
      resultado = resultado.filter((obra) =>
        superficieSeleccionada.some((range) => matchesSurfaceRange(Number(obra.superficie), range))
      );
    }
  }

  if (sectores.length) {
    resultado = resultado.filter((obra) =>
      matchesTextList(obra.sector, sectores)
    );
  }

  return resultado;
}

export function aggregateObrasByMetric(obras = [], keyGetter, metric = 'proyectos') {
  const map = new Map();

  obras.forEach((obra, index) => {
    const key = typeof keyGetter === 'function'
      ? keyGetter(obra, index)
      : obra?.[keyGetter];

    const safeKey = key ? String(key).trim() : 'Sin dato';
    const current = map.get(safeKey) || {
      key: safeKey,
      label: safeKey,
      count: 0,
      inversion: 0,
      superficie: 0,
    };

    current.count += 1;
    current.inversion += Number(obra.inversion) || 0;
    current.superficie += Number(obra.superficie) || 0;
    map.set(safeKey, current);
  });

  return [...map.values()]
    .map((item) => ({
      ...item,
      value:
        metric === 'inversion'
          ? item.inversion
          : metric === 'superficie'
            ? item.superficie
            : item.count,
    }))
    .sort((a, b) => b.value - a.value);
}

export function formatGraphMetricValue(value, metric = 'proyectos') {
  if (metric === 'inversion') {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(
      Math.round((Number(value) || 0) / 1000000)
    );
  }

  if (metric === 'superficie') {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(
      Math.round(Number(value) || 0)
    );
  }

  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(
    Math.round(Number(value) || 0)
  );
}

export function formatGraphMetricSuffix(metric = 'proyectos') {
  if (metric === 'inversion') return 'MDP';
  if (metric === 'superficie') return 'm²';
  return '';
}

export function getMetricLabel(metric = 'proyectos') {
  if (metric === 'inversion') return 'Inversión';
  if (metric === 'superficie') return 'm² Construidos';
  return 'Proyectos';
}

export function getMetricValueFromObra(obra, metric = 'proyectos') {
  if (metric === 'inversion') return Number(obra.inversion) || 0;
  if (metric === 'superficie') return Number(obra.superficie) || 0;
  return 1;
}

export function getMonthKeyFromObra(obra, selectedDateField) {
  const time = getObraTimeByFilter(obra, selectedDateField);
  if (!time) return 'Sin fecha';
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthLabel(monthKey) {
  if (monthKey === 'Sin fecha') return 'Sin fecha';

  const [year, month] = String(monthKey).split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat('es-MX', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}
