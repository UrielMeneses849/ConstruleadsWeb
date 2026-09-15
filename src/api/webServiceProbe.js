import { CONSTRULEADS_TOKEN, CONSTRULEADS_WS_BASE_URL } from './obras';

export const WEB_SERVICE_PROBES = [
  { id: 'obras', label: 'Obras', method: 'ws_cl_obras' },
  { id: 'licitaciones', label: 'Licitaciones', method: 'ws_cl_licitaciones' },
  { id: 'companias', label: 'Compañías', method: 'ws_cl_companias' },
];

function getSessionBody() {
  const user = JSON.parse(localStorage.getItem('construleadsUser') || '{}');
  if (!user.idUsuario || !user.idSession) throw new Error('Inicia sesión antes de ejecutar una prueba.');
  return new URLSearchParams({ sId_usuario: String(user.idUsuario), sId_session: String(user.idSession), sTk: CONSTRULEADS_TOKEN });
}

export async function probeWebService({ method, signal, onProgress, collectChunks = false } = {}) {
  const startedAt = performance.now();
  const response = await fetch(`${CONSTRULEADS_WS_BASE_URL}/${method}`, { method: 'POST', body: getSessionBody(), signal });
  const headersMs = performance.now() - startedAt;
  if (!response.ok) throw new Error(`${method} respondió HTTP ${response.status}.`);

  const reader = response.body?.getReader?.();
  let receivedBytes = 0;
  let firstByteMs = null;
  const chunks = [];
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (firstByteMs === null) firstByteMs = performance.now() - startedAt;
      receivedBytes += value.byteLength;
      if (collectChunks) chunks.push(value);
      onProgress?.({ receivedBytes, elapsedMs: performance.now() - startedAt });
    }
  } else {
    const buffer = await response.arrayBuffer();
    receivedBytes = buffer.byteLength;
    firstByteMs = performance.now() - startedAt;
    if (collectChunks) chunks.push(new Uint8Array(buffer));
  }
  return {
    method,
    status: response.status,
    headersMs,
    firstByteMs: firstByteMs ?? headersMs,
    completeMs: performance.now() - startedAt,
    receivedBytes,
    contentType: response.headers.get('content-type') || '—',
    contentEncoding: response.headers.get('content-encoding') || 'sin encabezado',
    contentLength: response.headers.get('content-length'),
    chunks: collectChunks ? chunks : undefined,
  };
}
