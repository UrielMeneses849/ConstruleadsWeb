const DATABASE_NAME = 'construleads-licitaciones-cache';
const STORE_NAME = 'licitaciones';
const DATABASE_VERSION = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readCachedLicitaciones(userId) {
  if (!userId || typeof window === 'undefined' || !('indexedDB' in window)) return null;

  try {
    const database = await openDatabase();
    const cached = await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(String(userId));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    database.close();

    return Array.isArray(cached?.licitaciones) ? cached.licitaciones : null;
  } catch {
    return null;
  }
}

export async function writeCachedLicitaciones(userId, licitaciones) {
  if (
    !userId ||
    !Array.isArray(licitaciones) ||
    !licitaciones.length ||
    typeof window === 'undefined' ||
    !('indexedDB' in window)
  ) return;

  try {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(
        { savedAt: Date.now(), licitaciones },
        String(userId)
      );
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch {
    // La caché sólo mejora el primer pintado; no debe afectar a la vista.
  }
}
