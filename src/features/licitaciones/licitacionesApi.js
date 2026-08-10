import { CONSTRULEADS_TOKEN, CONSTRULEADS_WS_BASE_URL } from '../../api/obras';
import { normalizeLicitacion } from './licitacionesUtils';

const licitacionesCache = new Map();

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

function normalizeLicitacionFragment(fragment) {
  const xml = new DOMParser().parseFromString(fragment, 'text/xml');
  if (xml.querySelector('parsererror')) return null;
  const node = xml.getElementsByTagName('datos')[0];
  return node ? normalizeLicitacion(node) : null;
}

async function readLicitacionesProgressively(response, onBatch) {
  const reader = response.body?.getReader?.();
  if (!reader) return null;

  const decoder = new TextDecoder();
  const all = [];
  let pending = [];
  let buffer = '';
  let hasPublished = false;
  const publish = () => {
    if (!pending.length) return;
    onBatch?.(pending);
    pending = [];
    hasPublished = true;
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
      const item = normalizeLicitacionFragment(buffer.slice(start, fragmentEnd));
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

export async function obtenerLicitaciones({ userId, sessionId, signal, onBatch } = {}) {
  if (!userId || !sessionId) throw new Error('La sesión del usuario no está disponible.');
  const key = cacheKey(userId, sessionId);
  const cached = licitacionesCache.get(key);
  if (cached) return cached;
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
    const progressive = await readLicitacionesProgressively(response, onBatch);
    if (progressive) {
      licitacionesCache.set(key, progressive);
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
  return normalized;
}
