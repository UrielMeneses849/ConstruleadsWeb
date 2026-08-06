import { CONSTRULEADS_TOKEN, CONSTRULEADS_WS_BASE_URL } from '../../api/obras';
import { normalizeLicitacion } from './licitacionesUtils';

const licitacionesCache = new Map();

function cacheKey(userId, sessionId) {
  return `${String(userId)}:${String(sessionId)}`;
}

export function leerLicitacionesCache(userId, sessionId) {
  return licitacionesCache.get(cacheKey(userId, sessionId)) || null;
}

export async function obtenerLicitaciones({ userId, sessionId, signal } = {}) {
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
