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
  const requestedAt = new Date().toISOString();
  const requestUrl = `${CONSTRULEADS_WS_BASE_URL}/${method}`;
  const response = await fetch(requestUrl, { method: 'POST', body: getSessionBody(), signal });
  const headersMs = performance.now() - startedAt;
  const responseHeaders = Object.fromEntries(response.headers.entries());

  const reader = response.body?.getReader?.();
  let receivedBytes = 0;
  let firstByteMs = null;
  const chunks = [];
  const chunkEvents = [];
  let previousChunkMs = headersMs;
  onProgress?.({
    phase: 'Esperando el primer bloque del body',
    headersMs,
    receivedBytes,
    elapsedMs: headersMs,
    chunkCount: 0,
  });
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const receivedAtMs = performance.now() - startedAt;
      if (firstByteMs === null) firstByteMs = receivedAtMs;
      receivedBytes += value.byteLength;
      if (collectChunks) chunks.push(value);
      const event = {
        index: chunkEvents.length + 1,
        receivedAtMs,
        gapMs: receivedAtMs - previousChunkMs,
        bytes: value.byteLength,
        cumulativeBytes: receivedBytes,
      };
      chunkEvents.push(event);
      previousChunkMs = receivedAtMs;
      onProgress?.({
        phase: 'Recibiendo el body XML',
        headersMs,
        firstByteMs,
        receivedBytes,
        elapsedMs: receivedAtMs,
        chunkCount: chunkEvents.length,
        lastChunkBytes: value.byteLength,
        lastChunkGapMs: event.gapMs,
      });
    }
  } else {
    const buffer = await response.arrayBuffer();
    receivedBytes = buffer.byteLength;
    firstByteMs = performance.now() - startedAt;
    if (collectChunks) chunks.push(new Uint8Array(buffer));
    chunkEvents.push({
      index: 1,
      receivedAtMs: firstByteMs,
      gapMs: firstByteMs - headersMs,
      bytes: receivedBytes,
      cumulativeBytes: receivedBytes,
    });
  }
  const completeMs = performance.now() - startedAt;
  const resourceEntry = performance
    .getEntriesByName(new URL(requestUrl, window.location.href).href, 'resource')
    .at(-1);

  return {
    method,
    status: response.status,
    ok: response.ok,
    statusText: response.statusText,
    requestUrl,
    requestedAt,
    headersMs,
    firstByteMs: firstByteMs ?? headersMs,
    completeMs,
    receivedBytes,
    contentType: response.headers.get('content-type') || '—',
    contentEncoding: response.headers.get('content-encoding') || 'sin encabezado',
    contentLength: response.headers.get('content-length'),
    transferEncoding: response.headers.get('transfer-encoding') || 'no expuesto',
    responseHeaders,
    chunkEvents,
    resourceTiming: resourceEntry ? {
      nextHopProtocol: resourceEntry.nextHopProtocol || 'no expuesto',
      transferSize: resourceEntry.transferSize || 0,
      encodedBodySize: resourceEntry.encodedBodySize || 0,
      decodedBodySize: resourceEntry.decodedBodySize || 0,
      responseStartMs: resourceEntry.responseStart - resourceEntry.startTime,
      durationMs: resourceEntry.duration,
    } : null,
    chunks: collectChunks ? chunks : undefined,
  };
}
