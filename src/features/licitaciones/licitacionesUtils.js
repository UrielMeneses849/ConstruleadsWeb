const EMPTY = 'Sin información';
export const LICITACION_MISSING_FALLO_VALUE = '__sin_fallo_emitido__';
export const LICITACION_MISSING_FALLO_LABEL = 'Sin fallo emitido';
export const LICITACION_UNASSIGNED_LABEL = 'Sin asignación';
const licitacionCurrencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
});
const licitacionMonthFormatter = new Intl.DateTimeFormat('es-MX', { month: 'short' });

export function formatLicitacionProvider(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  const normalized = normalizeSearchText(text);

  if (
    !text ||
    ['sin informacion', 'sin asignacion', 'null', 'n/a', 'na', 'no disponible'].includes(normalized)
  ) {
    return LICITACION_UNASSIGNED_LABEL;
  }

  return text;
}

export function formatLicitacionState(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  const normalized = normalizeSearchText(text);

  if (
    !text ||
    ['sin informacion', 'sin asignacion', 'null', 'n/a', 'na', 'no disponible'].includes(normalized)
  ) {
    return LICITACION_UNASSIGNED_LABEL;
  }

  return text;
}

export const BIMSA_REGIONS = {
  Oeste: ['Jalisco', 'Colima', 'Michoacán', 'Nayarit', 'Aguascalientes'],
  Noroeste: ['Baja California', 'Baja California Sur', 'Sonora', 'Sinaloa', 'Chihuahua', 'Durango'],
  Centro: ['Ciudad de México', 'Estado de México', 'Hidalgo', 'Morelos', 'Puebla', 'Querétaro', 'Tlaxcala'],
  Sureste: ['Guerrero', 'Oaxaca', 'Veracruz', 'Tabasco', 'Chiapas', 'Campeche', 'Yucatán', 'Quintana Roo'],
  Noreste: ['Nuevo León', 'Coahuila', 'Tamaulipas', 'San Luis Potosí', 'Zacatecas'],
};

export function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeFieldName(value) {
  return normalizeSearchText(value).replace(/[^a-z0-9]/g, '');
}

function cleanValue(value, fallback = EMPTY) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text || /^(null|n\/a|na|sin informaci[oó]n|no disponible)$/i.test(text)) return fallback;
  return text;
}

export function parseLicitacionDate(value) {
  const text = cleanValue(value, '');
  if (!text) return null;
  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const local = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (local) return new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1]));
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseLicitacionAmount(value) {
  const text = cleanValue(value, '');
  if (!text) return null;
  const parsed = Number(text.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatLicitacionDate(value, fallback = 'Sin fecha') {
  const date = value instanceof Date ? value : parseLicitacionDate(value);
  if (!date) return fallback;

  const month = licitacionMonthFormatter.format(date).replace('.', '');
  const capitalizedMonth = `${month.charAt(0).toUpperCase()}${month.slice(1)}`;
  return `${capitalizedMonth} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatLicitacionAmount(value) {
  return Number.isFinite(value) ? licitacionCurrencyFormatter.format(value) : EMPTY;
}

export function normalizeLicitacion(node) {
  const fields = new Map();
  Array.from(node.children || []).forEach((child) => {
    fields.set(normalizeFieldName(child.localName || child.nodeName), child.textContent);
  });
  const read = (...names) => {
    for (const name of names) {
      const value = fields.get(normalizeFieldName(name));
      if (value !== undefined) return cleanValue(value);
    }
    return EMPTY;
  };
  const readOptional = (...names) => {
    const value = read(...names);
    return value === EMPTY ? '' : value;
  };

  const rawId = readOptional('id', 'id_licitacion', 'idlicitacion');
  const clave = read('clave');
  const codigoExpediente = read('codigo_del_expediente', 'codigo_expediente');
  const numeroProcedimiento = read('numero_de_procedimiento', 'numero_procedimiento');
  const stableComposite = [clave, codigoExpediente, numeroProcedimiento].join('|');
  const amount = parseLicitacionAmount(readOptional('monto_del_contrato_MXN', 'monto_del_contrato', 'monto'));

  return {
    id: rawId || stableComposite,
    clave,
    codigo_del_expediente: codigoExpediente,
    numero_de_procedimiento: numeroProcedimiento,
    codigo_del_contrato: read('codigo_del_contrato', 'codigo_contrato'),
    orden_de_gobierno: read('orden_de_gobierno'),
    descripcion_del_ramo: read('descripcion_del_ramo'),
    tipo_de_institucion: read('tipo_de_institucion'),
    institucion_convocante: read('institucion_convocante'),
    nombre_de_la_unidad_compradora: read('nombre_de_la_unidad_compradora'),
    expediente: read('expediente'),
    descripcion: read('descripcion'),
    fuente_de_la_descripcion: read('fuente_de_la_descripcion'),
    tipo_de_procedimiento: read('tipo_de_procedimiento'),
    caracter_del_procedimiento: read('caracter_del_procedimiento'),
    articulo_de_excepcion: read('articulo_de_excepcion'),
    descripcion_de_la_excepcion: read('descripcion_de_la_excepcion'),
    partida_especifica: read('partida_específica', 'partida_especifica'),
    estado: formatLicitacionState(readOptional('estado', 'entidad_federativa', 'entidad')),
    region: read('region', 'región'),
    estatus: read('estatus'),
    estatus_original_fuente: read('estatus_original_fuente'),
    fecha_de_publicacion: readOptional('fecha_de_publicacion'),
    fecha_de_apertura: readOptional('fecha_de_apertura'),
    fecha_de_fallo: readOptional('fecha_de_fallo'),
    monto_del_contrato_MXN: amount,
    proveedor_adjudicado: formatLicitacionProvider(readOptional('proveedor_adjudicado')),
    RFC_del_proveedor: read('RFC_del_proveedor', 'rfc_del_proveedor'),
    estratificacion_del_proveedor: read('estratificacion_del_proveedor'),
    fecha_de_inicio_del_contrato: readOptional('fecha_de_inicio_del_contrato'),
    fecha_de_fin_del_contrato: readOptional('fecha_de_fin_del_contrato'),
    fuente_del_registro: read('fuente_del_registro'),
    direccion_del_anuncio: readOptional('direccion_del_anuncio'),
  };
}

export function getUniqueOptions(data, key) {
  const values = new Map();
  data.forEach((item) => {
    const value = cleanValue(item[key], '');
    const normalized = normalizeSearchText(value);
    if (normalized && !values.has(normalized)) values.set(normalized, value);
  });
  return [...values.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

export function getLicitacionRegion(item) {
  if (item.region && item.region !== EMPTY) return item.region;
  const normalizedState = normalizeSearchText(item.estado);
  return Object.entries(BIMSA_REGIONS).find(([, states]) => (
    states.some((state) => normalizeSearchText(state) === normalizedState)
  ))?.[0] || EMPTY;
}

export { EMPTY as LICITACION_EMPTY_VALUE };
