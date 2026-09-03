import { getObraSource } from '../utils/obrasSources';

// La información ya está normalizada por el ETL. El worker sólo limpia los
// espacios exteriores; no debe quitar acentos ni reescribir etiquetas.
const cleanText = (value = '') => String(value).trim();

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
  const normalized = String(value)
    .replace(/,/g, '')
    // Las inversiones del WS pueden venir en notación científica.
    .replace(/[^0-9.eE+-]/g, '');
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
    const region = cleanText(getValue(fragment, 'Region'));
    const estado = cleanText(getValue(fragment, 'Estado_Proyecto'));
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
      origen: getObraSource(getValue(fragment, 'Origen')),
      proyecto: cleanText(getValue(fragment, 'Proyecto')),
      region,
      estado,
      genero: cleanText(getValue(fragment, 'Genero')),
      subgenero: cleanText(getValue(fragment, 'Subgenero')),
      tipoObra: cleanText(getValue(fragment, 'Tipo_Obra')),
      tipoDesarrollo: cleanText(getValue(fragment, 'Tipo_Desarrollo')),
      tipoProyecto: cleanText(getValue(fragment, 'Tipo_Proyecto')),
      etapa: cleanText(getValue(fragment, 'Etapa')),
      sector: cleanText(getValue(fragment, 'Sector')),
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
