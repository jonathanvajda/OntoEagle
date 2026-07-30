// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Jonathan Vajda

import {
  createIndexedDbRecordAdapter,
  openIndexedDbStore,
  resolveIdbRequest,
  runObjectStoreTransaction
} from './shared/indexeddb-data-management/index.js';

const DB_NAME = 'OntoEagleDB';
const DB_VERSION = 3;
const SETTINGS_STORE = 'settings';
const DATASETS_STORE = 'datasets';
const DOCUMENTS_STORE = 'documents';
const INDEX_STORE = 'index';
const ACTIVE_SETTINGS_KEY = 'active';

const ONTOEAGLE_DB_SCHEMA = Object.freeze({
  name: DB_NAME,
  version: DB_VERSION,
  stores: Object.freeze([
    Object.freeze({ name: SETTINGS_STORE }),
    Object.freeze({ name: DATASETS_STORE }),
    Object.freeze({ name: DOCUMENTS_STORE }),
    Object.freeze({ name: INDEX_STORE })
  ])
});

let dbPromise = null;

/**
 * Opens the OntoEagle application database.
 *
 * The schema intentionally preserves the old `OntoEagleDB` object stores so
 * existing browser data remains readable after the package migration.
 *
 * @returns {Promise<IDBDatabase>} Open IndexedDB database.
 */
export async function idbInit() {
  if (!dbPromise) dbPromise = openIndexedDbStore(ONTOEAGLE_DB_SCHEMA);
  return dbPromise;
}

async function adapterFor(storeName) {
  return createIndexedDbRecordAdapter(await idbInit(), storeName);
}

function docKey(datasetId, iri) {
  return `${datasetId}::${iri}`;
}

function normalizeDatasetMeta(datasetId, meta = {}) {
  const now = Date.now();
  return {
    datasetId,
    ...meta,
    enabled: meta.enabled !== false,
    updatedAt: meta.updatedAt || now
  };
}

/**
 * Reads the active OntoEagle search settings.
 *
 * @returns {Promise<object|null>} Saved settings or null.
 */
export async function idbGetActiveSettings() {
  return (await adapterFor(SETTINGS_STORE)).get(ACTIVE_SETTINGS_KEY);
}

/**
 * Stores the active OntoEagle search settings.
 *
 * @param {object} settingsObj Search settings object.
 * @returns {Promise<object>} Stored settings.
 */
export async function idbPutActiveSettings(settingsObj) {
  await (await adapterFor(SETTINGS_STORE)).put(ACTIVE_SETTINGS_KEY, settingsObj);
  return settingsObj;
}

/**
 * Reads one dataset metadata record.
 *
 * @param {string} datasetId Dataset id.
 * @returns {Promise<object|null>} Dataset metadata.
 */
export async function idbGetDatasetMeta(datasetId) {
  return (await adapterFor(DATASETS_STORE)).get(datasetId);
}

/**
 * Stores dataset metadata while preserving OntoEagle's existing meta shape.
 *
 * @param {string} datasetId Dataset id.
 * @param {object} meta Metadata patch.
 * @returns {Promise<object>} Stored metadata.
 */
export async function idbPutDatasetMeta(datasetId, meta) {
  const record = normalizeDatasetMeta(datasetId, meta);
  await (await adapterFor(DATASETS_STORE)).put(datasetId, record);
  return record;
}

/**
 * Lists all dataset metadata records.
 *
 * @returns {Promise<object[]>} Dataset metadata records.
 */
export async function idbGetAllDatasetMeta() {
  return (await adapterFor(DATASETS_STORE)).list();
}

/**
 * Deletes one dataset metadata record.
 *
 * @param {string} datasetId Dataset id.
 * @returns {Promise<boolean>} True when the delete request completes.
 */
export async function idbDeleteDatasetMeta(datasetId) {
  return (await adapterFor(DATASETS_STORE)).delete(datasetId);
}

/**
 * Stores extracted ontology documents for one dataset.
 *
 * @param {string} datasetId Dataset id.
 * @param {object[]} docs Extracted ontology documents.
 * @returns {Promise<number>} Number of stored documents.
 */
export async function idbPutDocuments(datasetId, docs) {
  const adapter = await adapterFor(DOCUMENTS_STORE);
  const sourceDocs = Array.isArray(docs) ? docs : [];
  let count = 0;
  for (const doc of sourceDocs) {
    if (!doc || typeof doc.iri !== 'string') continue;
    await adapter.put(docKey(datasetId, doc.iri), { datasetId, ...doc });
    count += 1;
  }
  return count;
}

/**
 * Lists all documents for one dataset.
 *
 * @param {string} datasetId Dataset id.
 * @returns {Promise<object[]>} Dataset documents.
 */
export async function idbGetAllDocuments(datasetId) {
  const docs = await (await adapterFor(DOCUMENTS_STORE)).list();
  return docs.filter((doc) => doc && typeof doc.iri === 'string' && doc.datasetId === datasetId);
}

/**
 * Clears every stored document.
 *
 * @returns {Promise<void>}
 */
export async function idbClearDocuments() {
  await (await adapterFor(DOCUMENTS_STORE)).clear();
}

/**
 * Deletes all documents for one dataset.
 *
 * @param {string} datasetId Dataset id.
 * @returns {Promise<number>} Number of deleted documents.
 */
export async function idbDeleteDatasetDocuments(datasetId) {
  const db = await idbInit();
  const prefix = `${datasetId}::`;
  return runObjectStoreTransaction(db, DOCUMENTS_STORE, 'readwrite', async (store) => {
    const keys = await resolveIdbRequest(store.getAllKeys());
    let count = 0;
    for (const key of keys || []) {
      if (String(key).startsWith(prefix)) {
        store.delete(key);
        count += 1;
      }
    }
    return count;
  });
}

/**
 * Lists documents belonging to enabled datasets.
 *
 * @returns {Promise<object[]>} Enabled ontology documents.
 */
export async function idbGetEnabledDocuments() {
  const metas = await idbGetAllDatasetMeta();
  const enabledIds = new Set(metas.filter((meta) => meta && meta.enabled !== false).map((meta) => meta.datasetId));
  const docs = await (await adapterFor(DOCUMENTS_STORE)).list();
  return docs.filter((doc) => doc && typeof doc.iri === 'string' && enabledIds.has(doc.datasetId));
}

/**
 * Enables or disables a dataset.
 *
 * @param {string} datasetId Dataset id.
 * @param {boolean} enabled Whether the dataset is enabled.
 * @returns {Promise<object|null>} Updated metadata or null.
 */
export async function idbSetDatasetEnabled(datasetId, enabled) {
  const meta = await idbGetDatasetMeta(datasetId);
  if (!meta) return null;
  return idbPutDatasetMeta(datasetId, { ...meta, enabled: !!enabled, updatedAt: Date.now() });
}

/**
 * Deletes a dataset's documents, metadata, and cached index.
 *
 * @param {string} datasetId Dataset id.
 * @returns {Promise<boolean>} True when complete.
 */
export async function idbDeleteDataset(datasetId) {
  await idbDeleteDatasetDocuments(datasetId);
  await idbDeleteDatasetMeta(datasetId);
  await (await adapterFor(INDEX_STORE)).delete(datasetId);
  return true;
}

/**
 * Reads a cached search index for one dataset.
 *
 * @param {string} datasetId Dataset id.
 * @returns {Promise<object|null>} Cached index.
 */
export async function idbGetIndex(datasetId) {
  return (await adapterFor(INDEX_STORE)).get(datasetId);
}

/**
 * Stores a cached search index for one dataset.
 *
 * @param {string} datasetId Dataset id.
 * @param {object} indexObj Index object.
 * @returns {Promise<object>} Stored index object.
 */
export async function idbPutIndex(datasetId, indexObj) {
  await (await adapterFor(INDEX_STORE)).put(datasetId, indexObj);
  return indexObj;
}

/**
 * Clears all cached search indexes.
 *
 * @returns {Promise<void>}
 */
export async function idbClearIndex() {
  await (await adapterFor(INDEX_STORE)).clear();
}
