import { parseObrasXml } from './parseObrasXml';

export function parseObrasOffMainThread(xml, signal) {
  if (typeof Worker === 'undefined') {
    return Promise.resolve(parseObrasXml(xml));
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/parseObrasWorker.js', import.meta.url),
      { type: 'module' }
    );

    const cleanup = () => {
      worker.terminate();
      signal?.removeEventListener('abort', handleAbort);
    };
    const handleAbort = () => {
      cleanup();
      reject(new DOMException('La carga fue cancelada.', 'AbortError'));
    };

    worker.onmessage = (event) => {
      cleanup();
      if (event.data?.error) {
        reject(new Error(event.data.error));
        return;
      }
      resolve(Array.isArray(event.data?.obras) ? event.data.obras : []);
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error('No fue posible procesar las obras en segundo plano.'));
    };
    signal?.addEventListener('abort', handleAbort, { once: true });
    worker.postMessage({ xml });
  });
}
