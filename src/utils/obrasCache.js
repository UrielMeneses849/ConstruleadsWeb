const DATABASE_NAME = 'construleads-performance-cache';
const STORE_NAME = 'obras';
const COMPANIES_STORE_NAME = 'companias';
const DATABASE_VERSION = 2;
const OBRAS_CACHE_VERSION = 2;
const COMPANY_RELATIONSHIPS_CACHE_VERSION = 3;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
      if (!database.objectStoreNames.contains(COMPANIES_STORE_NAME)) {
        database.createObjectStore(COMPANIES_STORE_NAME);
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
    if (!cached || cached.version !== OBRAS_CACHE_VERSION) return null;
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
        { version: OBRAS_CACHE_VERSION, savedAt: Date.now(), obras },
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

export async function readCachedCompanyRelationships(userId) {
  if (!userId || !('indexedDB' in window)) return null;

  try {
    const database = await openDatabase();
    const cached = await new Promise((resolve, reject) => {
      const transaction = database.transaction(COMPANIES_STORE_NAME, 'readonly');
      const request = transaction.objectStore(COMPANIES_STORE_NAME).get(String(userId));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return cached?.version === COMPANY_RELATIONSHIPS_CACHE_VERSION && Array.isArray(cached.relationships)
      ? cached.relationships
      : null;
  } catch {
    return null;
  }
}

export async function writeCachedCompanyRelationships(userId, relationships) {
  if (!userId || !Array.isArray(relationships) || !('indexedDB' in window)) return;

  try {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(COMPANIES_STORE_NAME, 'readwrite');
      transaction.objectStore(COMPANIES_STORE_NAME).put(
        { version: COMPANY_RELATIONSHIPS_CACHE_VERSION, savedAt: Date.now(), relationships },
        String(userId)
      );
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch {
    // La caché de perfiles acelera el módulo, pero jamás bloquea la respuesta viva.
  }
}
