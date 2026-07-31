const normalizeText = (value = '') =>
  String(value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function decodeXml(value = '') {
  return String(value)
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getValue(fragment, ...tags) {
  for (const tag of tags) {
    const match = new RegExp(
      `<${escapeRegExp(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`,
      'i'
    ).exec(fragment);
    if (match?.[1]) return decodeXml(match[1]);
  }
  return '';
}

function parseNumber(value = 0) {
  const normalized = String(value).replace(/,/g, '').replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value = '') {
  const normalized = String(value).trim();
  if (!normalized) return null;
  const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const local = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (local) return new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1]));
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseObras(xml = '') {
  const fragments = String(xml).match(/<datos(?:\s[^>]*)?>[\s\S]*?<\/datos>/gi) || [];
  return fragments.map((fragment, index) => {
    const clave = getValue(fragment, 'Clave_Proyecto');
    const region = normalizeText(getValue(fragment, 'Region'));
    const estadoValue = normalizeText(getValue(fragment, 'Estado_Proyecto'));
    const estadoComparable = estadoValue.toLowerCase();
    const estado = estadoComparable === 'edo. de mexico' || estadoComparable === 'edo de mexico'
      ? 'Estado de Mexico'
      : estadoValue;
    const inversion = parseNumber(getValue(fragment, 'Inversion'));
    const superficie = parseNumber(getValue(fragment, 'Sup_Construida'));
    const lat = parseNumber(getValue(fragment, 'proy_ubicacionlatitud'));
    const lng = parseNumber(getValue(fragment, 'proy_ubicacionlongitud'));
    const fechaPublicacion = getValue(
      fragment,
      'Fecha_publicacion', 'Fecha_Publicacion', 'FECHA_PUBLICACION', 'Fecha_Publicación'
    );
    const fechaInicio = getValue(fragment, 'Fecha_Inicio', 'FECHA_INICIO', 'Fecha_inicio');
    const fechaTermino = getValue(
      fragment,
      'Fecha_Terminacion', 'Fecha_Termino', 'Fecha_Terminación', 'Fecha_Término',
      'FECHA_TERMINACION', 'FECHA_TERMINO', 'fecha_terminacion', 'fecha_termino',
      'FechaTerminacion', 'FechaTermino', 'Fecha_Fin', 'FECHA_FIN', 'fecha_fin'
    );
    const fechaPublicacionDate = parseDate(fechaPublicacion);
    const fechaInicioDate = parseDate(fechaInicio);
    const fechaTerminoDate = parseDate(fechaTermino);

    return {
      id: clave || `${lat}-${lng}-${index}`,
      clave,
      proyecto: normalizeText(getValue(fragment, 'Proyecto')),
      region,
      estado,
      genero: normalizeText(getValue(fragment, 'Genero')),
      subgenero: normalizeText(getValue(fragment, 'Subgenero')),
      tipoObra: normalizeText(getValue(fragment, 'Tipo_Obra')),
      tipoDesarrollo: normalizeText(getValue(fragment, 'Tipo_Desarrollo')),
      tipoProyecto: normalizeText(getValue(fragment, 'Tipo_Proyecto')),
      etapa: normalizeText(getValue(fragment, 'Etapa')),
      sector: normalizeText(getValue(fragment, 'Sector')),
      inversion,
      superficie,
      fechaPublicacion,
      fechaInicio,
      fechaTermino,
      fechaTerminacion: fechaTermino,
      fechaFin: fechaTermino,
      fechaPublicacionDate,
      fechaInicioDate,
      fechaTerminoDate,
      fechaTerminacionDate: fechaTerminoDate,
      fechaFinDate: fechaTerminoDate,
      fechaPublicacionTime: fechaPublicacionDate?.getTime() || null,
      fechaInicioTime: fechaInicioDate?.getTime() || null,
      fechaTerminoTime: fechaTerminoDate?.getTime() || null,
      fechaTerminacionTime: fechaTerminoDate?.getTime() || null,
      fechaFinTime: fechaTerminoDate?.getTime() || null,
      lat,
      lng,
      hasValidCoordinates:
        Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0,
      localizacion: getValue(fragment, 'Localizacion1'),
      descripcion: getValue(fragment, 'Descripcion'),
      compania: getValue(fragment, 'Compania'),
    };
  });
}

self.onmessage = (event) => {
  try {
    self.postMessage({ obras: parseObras(event.data?.xml || '') });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'No fue posible procesar las obras.',
    });
  }
};
