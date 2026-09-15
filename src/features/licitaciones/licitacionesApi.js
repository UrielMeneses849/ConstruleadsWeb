import { CONSTRULEADS_TOKEN, CONSTRULEADS_WS_BASE_URL } from '../../api/obras';
import { normalizeLicitacion } from './licitacionesUtils';
import { startPerformanceSpan, traceWsRequest } from '../../utils/performanceMonitor';
import { writeCachedLicitaciones } from '../../utils/licitacionesCache';

const licitacionesCache = new Map();
// Una navegación puede ocurrir mientras la precarga sigue en curso. Mantener
// la promesa por sesión evita abrir una segunda conexión al mismo WS y hace
// que la vista se conecte a la descarga que ya comenzó en segundo plano.
const licitacionesRequests = new Map();

function cacheKey(userId, sessionId) {
  return `${String(userId)}:${String(sessionId)}`;
}

export function leerLicitacionesCache(userId, sessionId) {
  return licitacionesCache.get(cacheKey(userId, sessionId)) || null;
}

export const buildLicitacionKeys = (licitaciones = []) =>
  [...new Set(
    licitaciones
      .map((licitacion) => String(licitacion?.clave || '').trim())
      .filter(Boolean)
  )].join(',');

function parseServiceRow(responseText) {
  const parser = new DOMParser();
  let xml = parser.parseFromString(responseText, 'text/xml');
  if (xml.querySelector('parsererror')) throw new Error('El servicio devolvió una respuesta inválida.');

  let row = xml.getElementsByTagName('row')[0];
  if (!row) {
    const embedded = xml.documentElement?.textContent?.trim();
    if (embedded?.startsWith('<')) {
      xml = parser.parseFromString(embedded, 'text/xml');
      if (xml.querySelector('parsererror')) throw new Error('El servicio devolvió una respuesta inválida.');
      row = xml.getElementsByTagName('row')[0];
    }
  }
  return row;
}

function normalizeLicitacionFragment(fragment, parser) {
  const xml = parser.parseFromString(fragment, 'text/xml');
  if (xml.querySelector('parsererror')) return null;
  const node = xml.getElementsByTagName('datos')[0];
  return node ? normalizeLicitacion(node) : null;
}

async function readLicitacionesProgressively(response, onBatch, onSnapshot) {
  const reader = response.body?.getReader?.();
  if (!reader) return null;

  const decoder = new TextDecoder();
  const parser = new DOMParser();
  const all = [];
  let pending = [];
  let buffer = '';
  let hasPublished = false;
  const publish = () => {
    if (!pending.length) return;
    const batch = pending;
    pending = [];
    hasPublished = true;
    // Publicamos una instantánea acumulada en memoria antes de avisar a la
    // vista. Si el usuario entra a Licitaciones entre dos paquetes, verá lo
    // ya disponible en lugar de iniciar desde una pantalla vacía.
    onSnapshot?.(all.slice());
    onBatch?.(batch);
  };
  const extractRows = () => {
    while (true) {
      const start = buffer.search(/<datos(?:\s[^>]*)?>/i);
      if (start < 0) {
        if (buffer.length > 4096) buffer = buffer.slice(-4096);
        return;
      }
      const end = buffer.toLowerCase().indexOf('</datos>', start);
      if (end < 0) {
        if (start > 0) buffer = buffer.slice(start);
        return;
      }
      const fragmentEnd = end + '</datos>'.length;
      const item = normalizeLicitacionFragment(buffer.slice(start, fragmentEnd), parser);
      if (item) {
        all.push(item);
        pending.push(item);
      }
      buffer = buffer.slice(fragmentEnd);
      if (pending.length >= (hasPublished ? 500 : 15)) publish();
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    extractRows();
  }
  buffer += decoder.decode();
  extractRows();
  publish();
  return all;
}

export async function solicitarExcelLicitaciones({ userId, sessionId, claves, signal } = {}) {
  if (!userId || !sessionId) throw new Error('La sesión del usuario no está disponible.');
  if (!claves) throw new Error('No hay licitaciones válidas para descargar.');

  const response = await fetch(`${CONSTRULEADS_WS_BASE_URL}/ws_cl_xlicitacion`, {
    method: 'POST',
    body: new URLSearchParams({
      sId_usuario: String(userId),
      sId_session: String(sessionId),
      sClaves: claves,
      sTk: CONSTRULEADS_TOKEN,
    }),
    signal,
  });
  if (!response.ok) throw new Error(`No fue posible generar el Excel (HTTP ${response.status}).`);

  const row = parseServiceRow(await response.text());
  if (!row) throw new Error('El servicio devolvió una respuesta inválida.');
  const status = row.getAttribute('Estatus') || row.getAttribute('estatus');
  const message = row.getAttribute('Mensaje') || row.getAttribute('mensaje') || '';
  const fileUrl = row.getAttribute('URL') || row.getAttribute('Url') || row.getAttribute('url') || '';
  if (status !== '1' || !fileUrl) throw new Error(message || 'No fue posible generar el Excel.');
  return { fileUrl, message };
}

async function requestLicitaciones({ key, userId, sessionId, signal, onBatch }) {
  const loadSpan = startPerformanceSpan('licitaciones.load', { cached: false });
  try {
    const response = await fetch(`${CONSTRULEADS_WS_BASE_URL}/ws_cl_licitaciones`, {
      method: 'POST',
      body: new URLSearchParams({
        sId_usuario: String(userId),
        sId_session: String(sessionId),
        sTk: CONSTRULEADS_TOKEN,
      }),
      signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isChrome = /Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent) && !/OPR\//i.test(userAgent);
    if (isChrome && response.body?.getReader) {
      const progressive = await readLicitacionesProgressively(
        response,
        onBatch,
        (snapshot) => licitacionesCache.set(key, snapshot)
      );
      if (progressive) {
        licitacionesCache.set(key, progressive);
        loadSpan.end({ records: progressive.length, source: 'stream' });
        return progressive;
      }
    }

    const parser = new DOMParser();
    let xml = parser.parseFromString(await response.text(), 'text/xml');
    if (xml.querySelector('parsererror')) throw new Error('XML inválido');
    if (!xml.getElementsByTagName('datos').length) {
      const embedded = xml.documentElement?.textContent?.trim();
      if (embedded?.startsWith('<')) xml = parser.parseFromString(embedded, 'text/xml');
    }
    if (xml.querySelector('parsererror')) throw new Error('XML inválido');
    const normalized = Array.from(xml.getElementsByTagName('datos')).map(normalizeLicitacion);
    licitacionesCache.set(key, normalized);
    loadSpan.end({ records: normalized.length, source: 'document' });
    return normalized;
  } catch (error) {
    // Una instantánea parcial no es una caché válida si el WS falló. Al
    // quitarla, el siguiente intento podrá volver a solicitar la respuesta.
    licitacionesCache.delete(key);
    loadSpan.end({ error: true, aborted: signal?.aborted === true });
    throw error;
  }
}

export async function obtenerLicitaciones({ userId, sessionId, signal, onBatch, caller = 'unknown', reason = 'load' } = {}) {
  if (!userId || !sessionId) throw new Error('La sesión del usuario no está disponible.');

  const key = cacheKey(userId, sessionId);
  const pendingRequest = licitacionesRequests.get(key);
  if (pendingRequest) {
    traceWsRequest('ws_cl_licitaciones', 'in-flight-reused', { caller, reason });
    const partial = licitacionesCache.get(key);
    if (partial?.length) onBatch?.(partial);
    return pendingRequest;
  }

  const cached = licitacionesCache.get(key);
  if (cached) {
    traceWsRequest('ws_cl_licitaciones', 'cache-hit', { caller, reason });
    const loadSpan = startPerformanceSpan('licitaciones.load', { cached: true });
    loadSpan.end({ records: cached.length, source: 'memory-cache' });
    return cached;
  }

  traceWsRequest('ws_cl_licitaciones', 'request', { caller, reason, cacheState: 'MISS' });
  const request = requestLicitaciones({ key, userId, sessionId, signal, onBatch });
  licitacionesRequests.set(key, request);
  try {
    return await request;
  } finally {
    if (licitacionesRequests.get(key) === request) {
      licitacionesRequests.delete(key);
    }
  }
}

export async function precargarLicitaciones({ userId, sessionId } = {}) {
  try {
    const licitaciones = await obtenerLicitaciones({ userId, sessionId, caller: 'Construleads', reason: 'prefetch' });
    if (licitaciones?.length) void writeCachedLicitaciones(userId, licitaciones);
    return licitaciones;
  } catch {
    // La precarga nunca debe alterar la navegación ni mostrar un error antes
    // de que el usuario entre al módulo.
    return null;
  }
}
