const MAX_MEASUREMENTS = 240;
const MAX_LONG_TASKS = 80;

const measurements = [];
const latestMeasurements = new Map();
const longTasks = [];
const listeners = new Set();
const wsStats = new Map();
let wsTraceSequence = 0;
let longTaskObserver = null;

function getBrowserWindow() {
  return typeof window === 'undefined' ? null : window;
}

export function isPerformanceAuditEnabled() {
  const browserWindow = getBrowserWindow();
  if (!browserWindow) return false;

  const queryEnabled = new URLSearchParams(browserWindow.location.search).get('perf') === '1';
  return queryEnabled || import.meta.env.VITE_PERFORMANCE_AUDIT === 'true';
}

function emit() {
  const snapshot = getPerformanceSnapshot();
  listeners.forEach((listener) => listener(snapshot));
}

function addMeasurement(measurement) {
  measurements.unshift(measurement);
  if (measurements.length > MAX_MEASUREMENTS) measurements.length = MAX_MEASUREMENTS;
  latestMeasurements.set(measurement.name, measurement);
  emit();
}

export function recordPerformanceMeasurement(name, duration, metadata = {}) {
  if (!isPerformanceAuditEnabled()) return;
  addMeasurement({
    name,
    duration: Number(Number(duration).toFixed(1)),
    timestamp: Date.now(),
    metadata,
  });
}

function getHeapMegabytes() {
  const memory = getBrowserWindow()?.performance?.memory;
  return Number.isFinite(memory?.usedJSHeapSize)
    ? Math.round(memory.usedJSHeapSize / 1024 / 1024)
    : null;
}

export function getPerformanceSnapshot() {
  return {
    measurements: measurements.slice(0, 32),
    latestMeasurements: [...latestMeasurements.values()],
    longTaskCount: longTasks.length,
    latestLongTask: longTasks[0] || null,
    heapMegabytes: getHeapMegabytes(),
    wsStats: [...wsStats.entries()].map(([service, stats]) => ({ service, ...stats })),
  };
}

export function traceWsRequest(service, event, metadata = {}) {
  const current = wsStats.get(service) || { requests: 0, cacheHits: 0, inFlightReused: 0 };
  if (event === 'request') current.requests += 1;
  if (event === 'cache-hit') current.cacheHits += 1;
  if (event === 'in-flight-reused') current.inFlightReused += 1;
  wsStats.set(service, current);
  if (isPerformanceAuditEnabled()) {
    wsTraceSequence += 1;
    console.debug('[WS TRACE]', { service, requestId: wsTraceSequence, event, route: getBrowserWindow()?.location?.pathname, ...metadata });
  }
  emit();
}

export function subscribeToPerformanceSnapshot(listener) {
  listeners.add(listener);
  listener(getPerformanceSnapshot());
  return () => listeners.delete(listener);
}

export function startPerformanceMonitoring() {
  if (!isPerformanceAuditEnabled() || longTaskObserver || typeof PerformanceObserver === 'undefined') {
    return () => {};
  }

  try {
    longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        longTasks.unshift({
          duration: Number(entry.duration.toFixed(1)),
          timestamp: Date.now(),
        });
      });
      if (longTasks.length > MAX_LONG_TASKS) longTasks.length = MAX_LONG_TASKS;
      emit();
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch {
    longTaskObserver = null;
  }

  return () => {
    longTaskObserver?.disconnect();
    longTaskObserver = null;
  };
}

const NOOP_SPAN = Object.freeze({ end: () => {} });

export function startPerformanceSpan(name, metadata = {}) {
  if (!isPerformanceAuditEnabled() || typeof performance === 'undefined') return NOOP_SPAN;

  const startedAt = performance.now();
  let hasEnded = false;

  return {
    end(extraMetadata = {}) {
      if (hasEnded) return;
      hasEnded = true;
      addMeasurement({
        name,
        duration: Number((performance.now() - startedAt).toFixed(1)),
        timestamp: Date.now(),
        metadata: { ...metadata, ...extraMetadata },
      });
    },
  };
}

export function measurePerformance(name, metadata, operation) {
  const span = startPerformanceSpan(name, metadata);
  try {
    const result = operation();
    span.end();
    return result;
  } catch (error) {
    span.end({ error: true });
    throw error;
  }
}

// La entrada Resource Timing no siempre está disponible (CORS/TAO), por eso
// conserva el reloj local y enriquece el resultado cuando el navegador puede.
export function startNetworkSpan(name, metadata = {}) {
  const startedAt = performance.now();
  let ended = false;
  return {
    end(response, extraMetadata = {}) {
      if (ended) return;
      ended = true;
      const endedAt = performance.now();
      const url = response?.url;
      const entry = url ? performance.getEntriesByName(url, 'resource').at(-1) : null;
      const responseStart = Number(entry?.responseStart);
      const responseEnd = Number(entry?.responseEnd);
      startPerformanceSpan(name, metadata).end({
        ...extraMetadata,
        duration: Number((endedAt - startedAt).toFixed(1)),
        ttfb: Number.isFinite(responseStart) && responseStart > 0 ? Number((responseStart - (entry.startTime || startedAt)).toFixed(1)) : null,
        download: Number.isFinite(responseStart) && Number.isFinite(responseEnd) && responseEnd >= responseStart
          ? Number((responseEnd - responseStart).toFixed(1)) : null,
        transferSize: Number(entry?.transferSize) || null,
        decodedBodySize: Number(entry?.decodedBodySize) || null,
      });
    },
  };
}
