import { CONSTRULEADS_TOKEN } from './obras';
import { getObraSource } from '../utils/obrasSources';
import { startPerformanceSpan } from '../utils/performanceMonitor';

const MAP_REQUEST_TIMEOUT_MS = 2800;
const previewCache = new Map();
const previewRequests = new Map();

function getEndpoint() {
  const configuredEndpoint = String(import.meta.env.VITE_MAP_OBRAS_ENDPOINT || '').trim();
  return configuredEndpoint || null;
}

function cacheKey(userId, sessionId) {
  return `${String(userId || '')}:${String(sessionId || '')}`;
}

function parseNumber(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/,/g, '')
    .replace(/[^0-9.eE+-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function valueOf(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

function getRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.obras)) return payload.obras;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.obras)) return payload.data.obras;
  if (Array.isArray(payload?.resultado)) return payload.resultado;
  return [];
}

function normalizeMapRecord(record, index) {
  const lat = parseNumber(record?.lat ?? record?.latitud ?? record?.proy_ubicacionlatitud);
  const lng = parseNumber(record?.lng ?? record?.longitud ?? record?.proy_ubicacionlongitud);
  const clave = valueOf(record, 'clave', 'Clave_Proyecto', 'clave_proyecto');
  const fechaPublicacion = valueOf(record, 'fechaPublicacion', 'Fecha_Publicacion', 'fecha_publicacion');
  const fechaInicio = valueOf(record, 'fechaInicio', 'Fecha_Inicio', 'fecha_inicio');
  const fechaTermino = valueOf(record, 'fechaTermino', 'Fecha_Terminacion', 'fecha_terminacion');

  return {
    id: valueOf(record, 'id', 'Id_Obra', 'ID_OBRA') || clave || `${lat}-${lng}-${index}`,
    clave,
    origen: getObraSource(record),
    proyecto: valueOf(record, 'proyecto', 'Proyecto'),
    region: valueOf(record, 'region', 'Region'),
    estado: valueOf(record, 'estado', 'Estado_Proyecto'),
    genero: valueOf(record, 'genero', 'Genero'),
    subgenero: valueOf(record, 'subgenero', 'Subgenero'),
    tipoObra: valueOf(record, 'tipoObra', 'Tipo_Obra', 'tipo_obra'),
    tipoDesarrollo: valueOf(record, 'tipoDesarrollo', 'Tipo_Desarrollo', 'tipo_desarrollo'),
    tipoProyecto: valueOf(record, 'tipoProyecto', 'Tipo_Proyecto', 'tipo_proyecto'),
    etapa: valueOf(record, 'etapa', 'Etapa'),
    sector: valueOf(record, 'sector', 'Sector'),
    inversion: parseNumber(record?.inversion ?? record?.Inversion),
    superficie: parseNumber(record?.superficie ?? record?.Sup_Construida ?? record?.sup_construida),
    fechaPublicacion,
    fechaInicio,
    fechaTermino,
    fechaTerminacion: fechaTermino,
    fechaFin: fechaTermino,
    lat,
    lng,
    hasValidCoordinates: Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0,
  };
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text.trim()) return [];

  try {
    return getRecords(JSON.parse(text));
  } catch {
    // Algunos servicios ASMX envuelven el JSON como texto XML. Lo soportamos
    // para que el contrato pueda convivir con la infraestructura actual.
    const document = new DOMParser().parseFromString(text, 'text/xml');
    const embeddedJson = document.documentElement?.textContent?.trim() || '';
    return getRecords(JSON.parse(embeddedJson));
  }
}

async function requestMapPreview({ endpoint, userId, sessionId, signal }) {
  const span = startPerformanceSpan('map.light-request');
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), MAP_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new URLSearchParams({
        sId_usuario: String(userId),
        sId_session: String(sessionId),
        sTk: CONSTRULEADS_TOKEN,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const records = (await parseResponse(response))
      .map(normalizeMapRecord)
      .filter((obra) => obra.hasValidCoordinates);
    span.end({ records: records.length, status: 'success' });
    return records;
  } catch (error) {
    span.end({ status: controller.signal.aborted ? 'timeout-or-aborted' : 'error' });
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

export function isMapPreviewEndpointEnabled() {
  return Boolean(getEndpoint());
}

export async function obtenerObrasMapaLigero({ userId, sessionId, signal } = {}) {
  const endpoint = getEndpoint();
  if (!endpoint || !userId || !sessionId) return null;

  const key = cacheKey(userId, sessionId);
  const cached = previewCache.get(key);
  if (cached) return cached;

  const pending = previewRequests.get(key);
  if (pending) return pending;

  const request = requestMapPreview({ endpoint, userId, sessionId, signal })
    .then((obras) => {
      previewCache.set(key, obras);
      return obras;
    })
    .finally(() => {
      if (previewRequests.get(key) === request) previewRequests.delete(key);
    });
  previewRequests.set(key, request);
  return request;
}

export function precargarObrasMapaLigero({ userId, sessionId } = {}) {
  return obtenerObrasMapaLigero({ userId, sessionId }).catch(() => null);
}
