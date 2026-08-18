const HISTORY_PREFIX = 'construleads-download-history';
let downloadHistory = [];

function getHistoryKey() {
  try {
    const user = JSON.parse(localStorage.getItem('construleadsUser') || '{}');
    return `${HISTORY_PREFIX}-${user.idUsuario || 'guest'}`;
  } catch {
    return `${HISTORY_PREFIX}-guest`;
  }
}

function readHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(getHistoryKey()) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function persistHistory(items) {
  try {
    localStorage.setItem(getHistoryKey(), JSON.stringify(items));
  } catch {
    // El historial es una mejora de experiencia: una cuota llena no debe bloquear descargas.
  }
}

export function getDownloadHistory() {
  downloadHistory = readHistory();
  return [...downloadHistory];
}

export function addDownloadHistoryItem(item) {
  const normalizedItem = { ...item, createdAt: item?.createdAt || new Date().toISOString() };
  downloadHistory = [normalizedItem, ...readHistory()].slice(0, 100);
  persistHistory(downloadHistory);
  window.dispatchEvent(new Event('construleads-download-history-updated'));
  return getDownloadHistory();
}
