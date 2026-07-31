const DATABASE_NAME = 'construleads-performance-cache';
const STORE_NAME = 'obras';
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

export async function readCachedObras(userId) {
  if (!userId || !('indexedDB' in window)) return null;

  try {
    const database = await openDatabase();
    const cached = await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(String(userId));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    database.close();

    // La última respuesta válida siempre sirve para el primer pintado. La red
    // la actualiza después, sin dejar al usuario mirando un mapa vacío.
    if (!cached) return null;
    return Array.isArray(cached.obras) ? cached.obras : null;
  } catch {
    return null;
  }
}

export async function writeCachedObras(userId, obras) {
  if (!userId || !Array.isArray(obras) || !('indexedDB' in window)) return;

  try {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(
        { savedAt: Date.now(), obras },
        String(userId)
      );
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch {
    // La caché es una mejora de rendimiento y nunca debe bloquear la aplicación.
  }
}
