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

const TAG_PATTERN = /<([^\s/>]+)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;

function normalizeTagName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Antes cada campo recorría el XML completo con una RegExp nueva. Para una
// obra con 30 campos eso repetía la misma búsqueda ~30 veces. Aquí leemos los
// hijos directos una vez y conservamos el texto crudo; sólo se decodifican los
// valores efectivamente consumidos abajo.
function buildValueMap(fragment) {
  const firstContentCharacter = fragment.indexOf('>') + 1;
  const lastContentCharacter = fragment.lastIndexOf('</');
  const content = firstContentCharacter > 0 && lastContentCharacter > firstContentCharacter
    ? fragment.slice(firstContentCharacter, lastContentCharacter)
    : '';
  const values = Object.create(null);
  TAG_PATTERN.lastIndex = 0;
  let match;
  while ((match = TAG_PATTERN.exec(content))) {
    const key = normalizeTagName(match[1]);
    if (values[key] === undefined) values[key] = match[2];
  }
  return values;
}

function getValue(values, ...tags) {
  for (const tag of tags) {
    const raw = values[normalizeTagName(tag)];
    if (raw) return decodeXml(raw);
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
    const values = buildValueMap(fragment);
    const get = (...tags) => getValue(values, ...tags);
    const clave = get('Clave_Proyecto');
    const region = cleanText(get('Region'));
    const estado = cleanText(get('Estado_Proyecto'));
    const inversion = parseNumber(get('Inversion'));
    const superficie = parseNumber(get('Sup_Construida'));
    const lat = parseNumber(get('proy_ubicacionlatitud'));
    const lng = parseNumber(get('proy_ubicacionlongitud'));
    const fechaPublicacion = getValue(
      values,
      'Fecha_publicacion', 'Fecha_Publicacion', 'FECHA_PUBLICACION', 'Fecha_Publicación'
    );
    const fechaInicio = get('Fecha_Inicio', 'FECHA_INICIO', 'Fecha_inicio');
    const fechaTermino = getValue(
      values,
      'Fecha_Terminacion', 'Fecha_Termino', 'Fecha_Terminación', 'Fecha_Término',
      'FECHA_TERMINACION', 'FECHA_TERMINO', 'fecha_terminacion', 'fecha_termino',
      'FechaTerminacion', 'FechaTermino', 'Fecha_Fin', 'FECHA_FIN', 'fecha_fin'
    );
    const fechaPublicacionDate = parseDate(fechaPublicacion);
    const fechaInicioDate = parseDate(fechaInicio);
    const fechaTerminoDate = parseDate(fechaTermino);
    const compania = cleanText(get('Compania'));
    const rfcCompania = cleanText(get('RFC_Compania', 'RFC_Proveedor', 'RFC'));
    const claveCompania = cleanText(get('Clave_Compania', 'Clave_Empresa', 'Empresa_Clave'));

    return {
      id: clave || `${lat}-${lng}-${index}`,
      clave,
      origen: getObraSource(get('Origen')),
      proyecto: cleanText(get('Proyecto')),
      region,
      estado,
      genero: cleanText(get('Genero')),
      subgenero: cleanText(get('Subgenero')),
      tipoObra: cleanText(get('Tipo_Obra')),
      tipoDesarrollo: cleanText(get('Tipo_Desarrollo')),
      tipoProyecto: cleanText(get('Tipo_Proyecto')),
      etapa: cleanText(get('Etapa')),
      sector: cleanText(get('Sector')),
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
      localizacion: get('Localizacion1'),
      descripcion: get('Descripcion'),
      compania,
      rfcCompania,
      claveCompania,
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
