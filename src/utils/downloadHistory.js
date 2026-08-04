let downloadHistory = [];

export function getDownloadHistory() {
  return [...downloadHistory];
}

export function addDownloadHistoryItem(item) {
  downloadHistory = [item, ...downloadHistory].slice(0, 100);
  return getDownloadHistory();
}
