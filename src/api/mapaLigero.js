import { CONSTRULEADS_TOKEN } from './obras';
import { normalizeMapProject } from '../utils/mapProjects';
import { startNetworkSpan, startPerformanceSpan } from '../utils/performanceMonitor';

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

function getRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.obras)) return payload.obras;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.obras)) return payload.data.obras;
  if (Array.isArray(payload?.resultado)) return payload.resultado;
  return [];
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
  const networkSpan = startNetworkSpan('map.light-network');
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
    if (!response.ok) {
      networkSpan.end(response, { status: response.status });
      throw new Error(`HTTP ${response.status}`);
    }

    const records = (await parseResponse(response))
      .map(normalizeMapProject)
      .filter((obra) => obra.hasValidCoordinates);
    span.end({ records: records.length, status: 'success' });
    networkSpan.end(response, { status: response.status, records: records.length });
    return records;
  } catch (error) {
    networkSpan.end(null, { error: true });
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
