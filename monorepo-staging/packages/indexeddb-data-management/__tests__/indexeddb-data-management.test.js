import {
  StorageError,
  createArtifactStore,
  createIndexedDbRecordAdapter,
  createDatasetStore,
  createMemoryRecordAdapter,
  createProjectStore,
  createQuadRowStore,
  createRunRecordStore,
  createSettingsStore,
  createStableRecordId,
  createTimestampRecordId,
  deleteIndexedDbDatabase,
  normalizeArtifactRecord,
  normalizeDatasetRecord,
  normalizeProjectRecord,
  normalizeQuadRow,
  normalizeRunRecord,
  inspectIndexedDbDatabase,
  openIndexedDbStore,
  resolveIdbRequest,
  waitForIdbTransaction
} from '../src/index.js';

const FIXED_NOW = () => '2026-07-29T12:00:00.000Z';

function createAsyncRequest({ result, error, event = 'success' }) {
  const request = { result, error, onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null };
  queueMicrotask(() => {
    if (event === 'success') request.onsuccess?.();
    if (event === 'error') request.onerror?.();
    if (event === 'blocked') request.onblocked?.();
  });
  return request;
}

function makeNameList(values) {
  return {
    values,
    contains(name) {
      return this.values.includes(name);
    }
  };
}

function createMockIndexedDB() {
  const createdStores = [];
  const createdIndexes = [];
  const stores = new Map();
  const db = {
    objectStoreNames: makeNameList([]),
    close() {},
    createObjectStore(name, options) {
      createdStores.push({ name, options });
      const store = {
        indexNames: makeNameList([]),
        createIndex(indexName, keyPath, indexOptions) {
          createdIndexes.push({ indexName, keyPath, indexOptions });
        }
      };
      stores.set(name, store);
      db.objectStoreNames.values.push(name);
      return store;
    }
  };
  return {
    createdStores,
    createdIndexes,
    open(name, version) {
      const request = { result: db, onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null, name, version };
      queueMicrotask(() => {
        request.transaction = {
          objectStore(storeName) {
            return stores.get(storeName);
          }
        };
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
    databases() {
      return Promise.resolve([{ name: 'ProjectData' }]);
    },
    deleteDatabase() {
      return createAsyncRequest({ result: undefined });
    }
  };
}

function createMockObjectStoreDb() {
  const records = new Map();
  const makeRequest = (result, tx) => {
    const request = { result, error: null, onsuccess: null, onerror: null };
    queueMicrotask(() => {
      request.onsuccess?.();
      setTimeout(() => tx.oncomplete?.(), 0);
    });
    return request;
  };
  return {
    records,
    transaction(storeNames, mode) {
      const tx = {
        storeNames,
        mode,
        oncomplete: null,
        onerror: null,
        onabort: null,
        error: null,
        objectStore() {
          return {
            get(key) {
              return makeRequest(records.get(key) || null, tx);
            },
            put(value, key) {
              const resolvedKey = key || value.runId || value.id;
              records.set(resolvedKey, value);
              return makeRequest(resolvedKey, tx);
            },
            delete(key) {
              records.delete(key);
              return makeRequest(undefined, tx);
            },
            clear() {
              records.clear();
              return makeRequest(undefined, tx);
            },
            getAll() {
              return makeRequest([...records.values()], tx);
            }
          };
        }
      };
      return tx;
    }
  };
}

describe('record id helpers', () => {
  test('createStableRecordId normalizes app-neutral ids', () => {
    expect(createStableRecordId('Dataset', [' User File.ttl ', 'SHA:1234 ']))
      .toBe('dataset:user-file-ttl-sha-1234');
  });

  test('createTimestampRecordId supports deterministic test clocks and suffixes', () => {
    expect(createTimestampRecordId('run', { now: FIXED_NOW, suffix: 'abc' }))
      .toBe('run:2026-07-29t12-00-00-000z:abc');
  });
});

describe('record normalizers', () => {
  test('normalizeProjectRecord creates a portfolio-ready project record', () => {
    expect(normalizeProjectRecord({ label: 'Ontology Work', tags: ['rdf', 'rdf', ''] }, { now: FIXED_NOW }))
      .toMatchObject({
        projectId: 'project:ontology-work',
        label: 'Ontology Work',
        storageBackend: 'indexeddb',
        tags: ['rdf'],
        createdAt: '2026-07-29T12:00:00.000Z'
      });
  });

  test('normalizeArtifactRecord scopes typed artifacts to projects', () => {
    expect(normalizeArtifactRecord({
      projectId: 'project:one',
      artifactKind: 'sparql-query',
      role: 'staged',
      label: 'Competency query',
      provenance: { derivedFrom: ['artifact:source', 'artifact:source'] }
    }, { now: FIXED_NOW })).toMatchObject({
      projectId: 'project:one',
      artifactKind: 'sparql-query',
      role: 'staged',
      provenance: { derivedFrom: ['artifact:source'] }
    });
  });

  test('normalizeDatasetRecord preserves OntoEagle built-in/user distinctions', () => {
    expect(normalizeDatasetRecord({
      projectId: 'project:eagle',
      source: 'builtin',
      label: 'Built in graph',
      enabled: false,
      documentCount: 12
    }, { now: FIXED_NOW })).toMatchObject({
      source: 'builtin',
      enabled: false,
      documentCount: 12
    });
  });

  test('normalizeRunRecord supports diagnostics, transformations, and query runs', () => {
    expect(normalizeRunRecord({
      projectId: 'project:one',
      kind: 'diagnostic',
      label: 'OCD report',
      inputArtifactIds: ['artifact:a']
    }, { now: FIXED_NOW })).toMatchObject({
      runKind: 'diagnostic',
      label: 'OCD report',
      inputArtifactIds: ['artifact:a'],
      outputArtifactIds: []
    });
  });

  test('normalizeQuadRow treats triples as default-graph quads', () => {
    expect(normalizeQuadRow({
      subject: 'http://example.test/s',
      predicate: 'http://example.test/p',
      object: 'value',
      objectType: 'Literal',
      objectLang: 'en'
    })).toEqual({
      subject: 'http://example.test/s',
      subjectType: 'NamedNode',
      predicate: 'http://example.test/p',
      predicateType: 'NamedNode',
      object: 'value',
      objectType: 'Literal',
      objectLang: 'en',
      objectDatatype: '',
      graph: null,
      graphType: 'DefaultGraph'
    });
  });

  test('normalizers reject invalid records with StorageError', () => {
    expect(() => normalizeProjectRecord(null)).toThrow(StorageError);
    expect(() => normalizeArtifactRecord({ projectId: 'p' })).toThrow('artifact.artifactKind');
    expect(() => normalizeQuadRow({ subject: 's', predicate: 'p' })).toThrow('quad.object');
  });
});

describe('store factories over injected adapters', () => {
  test('project store creates, updates, lists, gets, and deletes projects', async () => {
    const store = createProjectStore(createMemoryRecordAdapter(), { now: FIXED_NOW });
    const project = await store.createProject({ label: 'Mermaid-style Portfolio' });
    await store.updateProject(project.projectId, { label: 'Renamed Portfolio' });

    await expect(store.getProject(project.projectId)).resolves.toMatchObject({ label: 'Renamed Portfolio' });
    await expect(store.listProjects()).resolves.toHaveLength(1);
    await expect(store.deleteProject(project.projectId)).resolves.toBe(true);
    await expect(store.getProject(project.projectId)).resolves.toBeNull();
  });

  test('artifact store filters project artifacts without loading payloads when requested', async () => {
    const store = createArtifactStore(createMemoryRecordAdapter(), { now: FIXED_NOW });
    await store.storeProjectArtifact({
      artifactId: 'artifact:one',
      projectId: 'project:one',
      artifactKind: 'rdf-dataset',
      role: 'loaded',
      label: 'Loaded quads'
    }, { rows: [1] });
    await store.storeProjectArtifact({
      artifactId: 'artifact:two',
      projectId: 'project:one',
      artifactKind: 'sparql-query',
      role: 'staged',
      label: 'Query'
    }, 'SELECT * WHERE {}');

    await expect(store.listProjectArtifacts('project:one', {
      artifactKind: 'rdf-dataset',
      includePayload: false
    })).resolves.toEqual([
      expect.not.objectContaining({ payload: expect.anything() })
    ]);
  });

  test('dataset store lists enabled records and updates enablement', async () => {
    const store = createDatasetStore(createMemoryRecordAdapter(), { now: FIXED_NOW });
    const dataset = await store.storeDatasetRecord({
      datasetId: 'dataset:one',
      projectId: 'project:one',
      source: 'user',
      label: 'User ontology'
    });
    await store.storeDatasetRecord({
      datasetId: 'dataset:two',
      projectId: 'project:one',
      source: 'builtin',
      label: 'Builtin ontology',
      enabled: false
    });

    await expect(store.listDatasetRecords('project:one', { enabledOnly: true })).resolves.toHaveLength(1);
    await expect(store.setDatasetEnabled(dataset.datasetId, false)).resolves.toMatchObject({ enabled: false });
    await expect(store.listDatasetRecords('project:one', { enabledOnly: true })).resolves.toHaveLength(0);
  });

  test('settings store separates app and project scoped values', async () => {
    const adapter = createMemoryRecordAdapter();
    const appSettings = createSettingsStore(adapter);
    const projectSettings = createSettingsStore(adapter, { scope: 'project:one' });

    await appSettings.setSetting('theme', 'dark');
    await projectSettings.setSetting('theme', 'light');

    await expect(appSettings.getSetting('theme')).resolves.toBe('dark');
    await expect(projectSettings.getSetting('theme')).resolves.toBe('light');
    await expect(projectSettings.listSettings()).resolves.toEqual([{ key: 'theme', value: 'light' }]);
    await expect(projectSettings.setSetting('', 'x')).rejects.toThrow('Setting key must be a non-empty string.');
  });

  test('run store sorts, limits, filters, and tracks latest run id by scope', async () => {
    const store = createRunRecordStore(createMemoryRecordAdapter());
    await store.storeRunRecord({
      runId: 'run:old',
      projectId: 'project:one',
      runKind: 'transformation',
      label: 'Old',
      createdAt: '2026-07-29T10:00:00.000Z'
    });
    await store.storeRunRecord({
      runId: 'run:new',
      projectId: 'project:one',
      runKind: 'transformation',
      label: 'New',
      createdAt: '2026-07-29T11:00:00.000Z'
    });

    await expect(store.listRunRecords({ projectId: 'project:one', runKind: 'transformation', limit: 1 }))
      .resolves.toMatchObject([{ runId: 'run:new' }]);
    expect(store.getLastRunId('project:one', 'transformation')).toBe('run:new');
  });

  test('quad store handles default graph, named graphs, filters, and exact deletion', async () => {
    const store = createQuadRowStore(createMemoryRecordAdapter());
    const defaultRow = {
      subject: 's1',
      predicate: 'p',
      object: 'o',
      graph: ''
    };
    const namedRow = {
      subject: 's2',
      predicate: 'p',
      object: 'o',
      graph: 'http://example.test/graph'
    };

    await expect(store.upsertQuadRows([defaultRow, namedRow])).resolves.toBe(2);
    await expect(store.listNamedGraphs()).resolves.toEqual(['http://example.test/graph']);
    await expect(store.countQuadRows({ graph: null })).resolves.toBe(1);
    await expect(store.deleteQuadRows([defaultRow])).resolves.toBe(1);
    await expect(store.countQuadRows()).resolves.toBe(1);
  });

  test('IndexedDB record adapter can back the shared store factories', async () => {
    const db = createMockObjectStoreDb();
    const adapter = createIndexedDbRecordAdapter(db, 'runs', { keyPath: 'runId' });
    const store = createRunRecordStore(adapter);

    await store.storeRunRecord({
      runId: 'run:indexeddb',
      projectId: 'project:one',
      runKind: 'diagnostic',
      label: 'IndexedDB backed',
      createdAt: '2026-07-29T12:00:00.000Z'
    });

    await expect(store.getRunRecord('run:indexeddb')).resolves.toMatchObject({
      runId: 'run:indexeddb',
      runKind: 'diagnostic'
    });
    await expect(store.listRunRecords({ projectId: 'project:one' })).resolves.toHaveLength(1);
  });
});

describe('IndexedDB adapter helpers', () => {
  test('resolveIdbRequest resolves results and rejects native errors', async () => {
    await expect(resolveIdbRequest(createAsyncRequest({ result: 'ok' }))).resolves.toBe('ok');
    await expect(resolveIdbRequest(createAsyncRequest({
      error: new Error('request failed'),
      event: 'error'
    }))).rejects.toMatchObject({
      code: 'IDB_REQUEST_FAILED',
      message: 'request failed'
    });
  });

  test('waitForIdbTransaction resolves completion and rejects aborts', async () => {
    const tx = { oncomplete: null, onerror: null, onabort: null, error: null };
    const promise = waitForIdbTransaction(tx);
    tx.oncomplete();
    await expect(promise).resolves.toBe(true);

    const aborted = { oncomplete: null, onerror: null, onabort: null, error: new Error('aborted') };
    const abortPromise = waitForIdbTransaction(aborted);
    aborted.onabort();
    await expect(abortPromise).rejects.toMatchObject({ code: 'IDB_TRANSACTION_ABORTED' });
  });

  test('openIndexedDbStore creates missing stores and indexes from schema', async () => {
    const indexedDBRef = createMockIndexedDB();
    const db = await openIndexedDbStore({
      name: 'ProjectData',
      version: 1,
      stores: [
        {
          name: 'runs',
          options: { keyPath: 'runId' },
          indexes: [{ name: 'projectId', keyPath: 'projectId' }]
        }
      ]
    }, { indexedDBRef });

    expect(db).toBeTruthy();
    expect(indexedDBRef.createdStores).toEqual([{ name: 'runs', options: { keyPath: 'runId' } }]);
    expect(indexedDBRef.createdIndexes).toEqual([{ indexName: 'projectId', keyPath: 'projectId', indexOptions: undefined }]);
  });

  test('inspectIndexedDbDatabase reports unavailable IndexedDB without throwing', async () => {
    await expect(inspectIndexedDbDatabase('ProjectData', { indexedDBRef: null })).resolves.toEqual({
      available: false,
      exists: null,
      stores: []
    });
  });

  test('inspectIndexedDbDatabase reports absent databases and existing stores', async () => {
    let openCalls = 0;
    const missingIndexedDBRef = {
      open() {
        openCalls += 1;
      },
      databases: () => Promise.resolve([{ name: 'OtherData' }])
    };
    await expect(inspectIndexedDbDatabase('ProjectData', { indexedDBRef: missingIndexedDBRef })).resolves.toEqual({
      available: true,
      exists: false,
      stores: []
    });
    expect(openCalls).toBe(0);

    const indexedDBRef = createMockIndexedDB();
    await openIndexedDbStore({
      name: 'ProjectData',
      version: 1,
      stores: [
        { name: 'settings' },
        { name: 'datasets' }
      ]
    }, { indexedDBRef });

    await expect(inspectIndexedDbDatabase('ProjectData', { indexedDBRef })).resolves.toEqual({
      available: true,
      exists: true,
      stores: ['settings', 'datasets']
    });
  });

  test('deleteIndexedDbDatabase rejects blocked deletes clearly', async () => {
    const indexedDBRef = {
      deleteDatabase() {
        return createAsyncRequest({ event: 'blocked' });
      }
    };

    await expect(deleteIndexedDbDatabase('ProjectData', { indexedDBRef }))
      .rejects.toMatchObject({ code: 'IDB_DELETE_BLOCKED' });
  });
});
