import { StorageError, toStorageError } from './storage-error.js';

/**
 * Resolve an IndexedDB request as a Promise while preserving native request
 * errors. This is the low-level equivalent of repeated `requestToPromise`
 * helpers across the apps.
 *
 * @param {IDBRequest} request IndexedDB request.
 * @returns {Promise<unknown>} Resolves to `request.result`.
 */
export function resolveIdbRequest(request) {
  if (!request || typeof request !== 'object') {
    return Promise.reject(new StorageError('resolveIdbRequest expected an IndexedDB request.', { code: 'INVALID_IDB_REQUEST' }));
  }
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(toStorageError(request.error, 'IndexedDB request failed.', 'IDB_REQUEST_FAILED'));
  });
}

/**
 * Resolve when an IndexedDB transaction completes and reject on abort/error.
 *
 * @param {IDBTransaction} transaction IndexedDB transaction.
 * @returns {Promise<boolean>} Resolves true on completion.
 */
export function waitForIdbTransaction(transaction) {
  if (!transaction || typeof transaction !== 'object') {
    return Promise.reject(new StorageError('waitForIdbTransaction expected an IndexedDB transaction.', { code: 'INVALID_IDB_TRANSACTION' }));
  }
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(toStorageError(transaction.error, 'IndexedDB transaction failed.', 'IDB_TRANSACTION_FAILED'));
    transaction.onabort = () => reject(toStorageError(transaction.error, 'IndexedDB transaction aborted.', 'IDB_TRANSACTION_ABORTED'));
  });
}

/**
 * Open an IndexedDB database from an explicit schema descriptor.
 *
 * @param {object} schema Database schema descriptor.
 * @param {string} schema.name Database name.
 * @param {number} schema.version Integer database version.
 * @param {Array<object>} schema.stores Object store descriptors.
 * @param {object} [options]
 * @param {IDBFactory} [options.indexedDBRef=globalThis.indexedDB] IndexedDB factory.
 * @returns {Promise<IDBDatabase>} Open database handle.
 */
export function openIndexedDbStore(schema, { indexedDBRef = globalThis.indexedDB } = {}) {
  if (!indexedDBRef || typeof indexedDBRef.open !== 'function') {
    return Promise.reject(new StorageError('IndexedDB is not available.', { code: 'INDEXEDDB_UNAVAILABLE' }));
  }
  if (!schema || typeof schema !== 'object' || !schema.name || !Number.isInteger(schema.version)) {
    return Promise.reject(new StorageError('openIndexedDbStore expected a schema with name and integer version.', { code: 'INVALID_IDB_SCHEMA' }));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDBRef.open(schema.name, schema.version);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const storeSchema of schema.stores || []) {
        const storeName = storeSchema.name;
        if (!storeName) continue;
        const hasStore = db.objectStoreNames && typeof db.objectStoreNames.contains === 'function'
          ? db.objectStoreNames.contains(storeName)
          : false;
        const store = hasStore
          ? request.transaction.objectStore(storeName)
          : db.createObjectStore(storeName, storeSchema.options || undefined);
        for (const indexSchema of storeSchema.indexes || []) {
          const hasIndex = store.indexNames && typeof store.indexNames.contains === 'function'
            ? store.indexNames.contains(indexSchema.name)
            : false;
          if (!hasIndex) store.createIndex(indexSchema.name, indexSchema.keyPath, indexSchema.options || undefined);
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(toStorageError(request.error, 'IndexedDB open failed.', 'IDB_OPEN_FAILED'));
    request.onblocked = () => reject(new StorageError('IndexedDB open was blocked by another connection.', { code: 'IDB_OPEN_BLOCKED' }));
  });
}

/**
 * Run a single object-store transaction and wait for completion.
 *
 * @param {IDBDatabase} db Open database handle.
 * @param {string|string[]} storeNames Store name or names.
 * @param {'readonly'|'readwrite'} mode Transaction mode.
 * @param {(stores: IDBObjectStore|Record<string, IDBObjectStore>, transaction: IDBTransaction) => unknown|Promise<unknown>} operation Store operation.
 * @returns {Promise<unknown>} Operation result after transaction completion.
 */
export async function runObjectStoreTransaction(db, storeNames, mode, operation) {
  if (!db || typeof db.transaction !== 'function') {
    throw new StorageError('runObjectStoreTransaction expected an open IndexedDB database.', { code: 'INVALID_IDB_DATABASE' });
  }
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  const transaction = db.transaction(names, mode);
  const stores = names.length === 1
    ? transaction.objectStore(names[0])
    : Object.fromEntries(names.map((name) => [name, transaction.objectStore(name)]));
  const result = await operation(stores, transaction);
  await waitForIdbTransaction(transaction);
  return result;
}

/**
 * Delete an IndexedDB database by name.
 *
 * @param {string} name Database name.
 * @param {object} [options]
 * @param {IDBFactory} [options.indexedDBRef=globalThis.indexedDB] IndexedDB factory.
 * @returns {Promise<boolean>} Resolves true when deletion succeeds.
 */
export function deleteIndexedDbDatabase(name, { indexedDBRef = globalThis.indexedDB } = {}) {
  if (!indexedDBRef || typeof indexedDBRef.deleteDatabase !== 'function') {
    return Promise.reject(new StorageError('IndexedDB deleteDatabase is not available.', { code: 'INDEXEDDB_UNAVAILABLE' }));
  }
  if (!name || typeof name !== 'string') {
    return Promise.reject(new StorageError('deleteIndexedDbDatabase expected a database name.', { code: 'INVALID_DATABASE_NAME' }));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDBRef.deleteDatabase(name);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(toStorageError(request.error, 'IndexedDB delete failed.', 'IDB_DELETE_FAILED'));
    request.onblocked = () => reject(new StorageError('IndexedDB delete was blocked by another connection.', { code: 'IDB_DELETE_BLOCKED' }));
  });
}
