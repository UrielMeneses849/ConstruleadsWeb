const MAX_MEASUREMENTS = 240;
const MAX_LONG_TASKS = 80;

const measurements = [];
const longTasks = [];
const listeners = new Set();
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
  emit();
}

function getHeapMegabytes() {
  const memory = getBrowserWindow()?.performance?.memory;
  return Number.isFinite(memory?.usedJSHeapSize)
    ? Math.round(memory.usedJSHeapSize / 1024 / 1024)
    : null;
}

export function getPerformanceSnapshot() {
  return {
    measurements: measurements.slice(0, 16),
    longTaskCount: longTasks.length,
    latestLongTask: longTasks[0] || null,
    heapMegabytes: getHeapMegabytes(),
  };
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
