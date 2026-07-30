// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Jonathan Vajda

import {
  createIndexedDbRecordAdapter,
  openIndexedDbStore,
  resolveIdbRequest,
  runObjectStoreTransaction
} from './shared/indexeddb-data-management/index.js';

const CQ_DB_NAME = 'CQDatabase';
const CQ_DB_VERSION = 1;
const CQ_STORE = 'CQStore';

const CQ_DB_SCHEMA = Object.freeze({
  name: CQ_DB_NAME,
  version: CQ_DB_VERSION,
  stores: Object.freeze([
    Object.freeze({ name: CQ_STORE, options: Object.freeze({ keyPath: 'id' }) })
  ])
});

let cqDbPromise = null;

/**
 * Opens CQ Ferret's IndexedDB database.
 *
 * @returns {Promise<IDBDatabase>} Open CQ database.
 */
export async function initIndexedDB() {
  if (!cqDbPromise) cqDbPromise = openIndexedDbStore(CQ_DB_SCHEMA);
  return cqDbPromise;
}

async function cqAdapter() {
  return createIndexedDbRecordAdapter(await initIndexedDB(), CQ_STORE, { keyPath: 'id' });
}

function nodeId(node) {
  return node?.id || node?.['@id'] || '';
}

function normalizeStoredNode(node) {
  const id = nodeId(node);
  return id ? { ...node, id } : null;
}

/**
 * Reads all CQ graph nodes and restores `@id` from the IndexedDB key path.
 *
 * @returns {Promise<object[]>} CQ graph nodes.
 */
export async function readCompetencyQuestionNodes() {
  const nodes = await (await cqAdapter()).list();
  return nodes.map((node) => ({ ...node, '@id': node['@id'] || node.id }));
}

/**
 * Stores CQ graph nodes.
 *
 * @param {object[]} nodes CQ graph nodes.
 * @returns {Promise<number>} Number of stored nodes.
 */
export async function storeCompetencyQuestionNodes(nodes) {
  const adapter = await cqAdapter();
  let count = 0;
  for (const rawNode of Array.isArray(nodes) ? nodes : []) {
    const node = normalizeStoredNode(rawNode);
    if (!node) continue;
    await adapter.put(node.id, node);
    count += 1;
  }
  return count;
}

/**
 * Deletes all nodes whose key contains the CQ unique suffix.
 *
 * @param {string} cqId Competency question IRI/id.
 * @returns {Promise<number>} Number of deleted nodes.
 */
export async function deleteCompetencyQuestionById(cqId) {
  const uniqueId = String(cqId || '').split('_').pop();
  if (!uniqueId) return 0;
  const db = await initIndexedDB();
  return runObjectStoreTransaction(db, CQ_STORE, 'readwrite', async (store) => {
    const keys = await resolveIdbRequest(store.getAllKeys());
    let count = 0;
    for (const key of keys || []) {
      if (String(key).includes(`_${uniqueId}`)) {
        store.delete(key);
        count += 1;
      }
    }
    return count;
  });
}

/**
 * Deletes CQ graph nodes by exact IndexedDB keys.
 *
 * @param {string[]} ids Node ids to delete.
 * @returns {Promise<number>} Number of delete requests issued.
 */
export async function deleteCompetencyQuestionNodesByIds(ids) {
  const adapter = await cqAdapter();
  let count = 0;
  for (const id of Array.isArray(ids) ? ids : []) {
    if (!id) continue;
    await adapter.delete(id);
    count += 1;
  }
  return count;
}

/**
 * Installs the unqualified global binding required by vendor `POSTaggerGraph.js`.
 *
 * ES module exports and `globalThis` properties are not equivalent to a classic
 * script global variable in every browser execution path. The indirect eval
 * creates the classic binding without editing the vendor file.
 *
 * @returns {void}
 */
function installPostaggerGraphIndexedDbGlobal() {
  globalThis.initIndexedDB = initIndexedDB;
  try {
    globalThis.eval?.('var initIndexedDB = globalThis.initIndexedDB;');
  } catch (_error) {
    // The globalThis property above still supports callers using window.initIndexedDB.
  }
}

installPostaggerGraphIndexedDbGlobal();
