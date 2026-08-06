import { parseObrasXml } from './parseObrasXml';

export function parseObrasOffMainThread(xml, signal) {
  if (typeof Worker === 'undefined') {
    return Promise.resolve(parseObrasXml(xml));
  }

  return new Promise((resolve, reject) => {
    let worker;
    let settled = false;
    let timeoutId;

    const parseOnMainThread = () => {
      try {
        resolve(parseObrasXml(xml));
      } catch (error) {
        reject(error);
      }
    };

    try {
      worker = new Worker(
        new URL('../workers/parseObrasWorker.js', import.meta.url),
        { type: 'module' }
      );
    } catch {
      parseOnMainThread();
      return;
    }

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      worker?.terminate();
      signal?.removeEventListener('abort', handleAbort);
    };
    const handleAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new DOMException('La carga fue cancelada.', 'AbortError'));
    };

    const fallback = () => {
      if (settled) return;
      settled = true;
      cleanup();
      parseOnMainThread();
    };

    worker.onmessage = (event) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (event.data?.error) {
        parseOnMainThread();
        return;
      }
      resolve(Array.isArray(event.data?.obras) ? event.data.obras : []);
    };
    worker.onerror = fallback;
    worker.onmessageerror = fallback;
    signal?.addEventListener('abort', handleAbort, { once: true });
    timeoutId = window.setTimeout(fallback, 15000);
    worker.postMessage({ xml });
  });
}
