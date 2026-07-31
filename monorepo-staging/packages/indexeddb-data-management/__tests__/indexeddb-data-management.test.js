import {
  StorageError,
  createArtifactStore,
  createIndexedDbRecordAdapter,
  createDatasetStore,
  createGraphStore,
  createMemoryRecordAdapter,
  createProjectPortfolioSchema,
  createProjectPortfolioStores,
  createProjectArchiveBlob,
  createProjectExportManifest,
  createArtifactDownloadBlob,
  createArtifactDownloadFileName,
  createProjectStore,
  createQuadRowStore,
  createRunRecordStore,
  createSettingsStore,
  createWorkspaceInclusionStore,
  createStableRecordId,
  createTimestampRecordId,
  deleteIndexedDbDatabase,
  DEFAULT_PROJECT_PORTFOLIO_DB_NAME,
  DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
  downloadProjectArchive,
  downloadProjectArtifact,
  ensureProjectPortfolioProject,
  normalizeArtifactRecord,
  normalizeDatasetRecord,
  normalizeGraphRecord,
  normalizeProjectRecord,
  normalizeProjectImportManifest,
  normalizeQuadRow,
  normalizeRunRecord,
  normalizeWorkspaceInclusionRecord,
  resolveArtifactDownloadFormat,
  storeProjectArtifactData,
  storeProjectRunData,
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
  const stores = new Map();
  const recordsFor = (storeName) => {
    if (!stores.has(storeName)) stores.set(storeName, new Map());
    return stores.get(storeName);
  };
  const makeRequest = (result, tx) => {
    const request = { result, error: null, onsuccess: null, onerror: null };
    queueMicrotask(() => {
      request.onsuccess?.();
      if (!tx.completionQueued) {
        tx.completionQueued = true;
        setTimeout(() => tx.oncomplete?.(), 0);
      }
    });
    return request;
  };
  return {
    stores,
    transaction(storeNames, mode) {
      const tx = {
        storeNames,
        mode,
        oncomplete: null,
        onerror: null,
        onabort: null,
        error: null,
        objectStore(storeName) {
          const records = recordsFor(storeName);
          return {
            get(key) {
              return makeRequest(records.get(key) || null, tx);
            },
            put(value, key) {
              const resolvedKey = key || value.artifactId || value.runId || value.inclusionId || (value.graphId && !value.subject ? value.graphId : '') || value.projectId || value.id || [
                value.projectId || '',
                value.graphId || '',
                value.subject || '',
                value.predicate || '',
                value.object || '',
                value.objectLang || '',
                value.objectDatatype || '',
                value.graph || ''
              ].join('\u001f');
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

class FakeZip {
  constructor() {
    this.files = [];
  }

  file(name, content) {
    this.files.push({ name, content });
  }

  async generateAsync(options) {
    return new Blob([JSON.stringify({ options, files: this.files })], { type: 'application/zip' });
  }
}

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

  test('normalizeWorkspaceInclusionRecord makes graph participation explicit', () => {
    expect(normalizeWorkspaceInclusionRecord({
      projectId: 'project:one',
      targetType: 'reference-dataset',
      targetId: 'reference:bfo',
      role: 'imported-reference',
      graphIri: 'urn:graph:reference:bfo'
    }, { now: FIXED_NOW })).toMatchObject({
      inclusionId: 'inclusion:project-one-reference-dataset-reference-bfo',
      projectId: 'project:one',
      targetType: 'reference-dataset',
      targetId: 'reference:bfo',
      role: 'imported-reference',
      enabled: true,
      includeMode: 'read-only',
      graphIri: 'urn:graph:reference:bfo'
    });
  });

  test('normalizeGraphRecord tracks graph metadata separately from quad rows', () => {
    expect(normalizeGraphRecord({
      projectId: 'project:one',
      graphIri: '',
      artifactId: 'artifact:source',
      role: 'source',
      label: 'Default source graph',
      materialization: {
        strategy: 'materialized-on-import',
        status: 'ready',
        quadCount: 2,
        indexedAt: FIXED_NOW()
      }
    }, { now: FIXED_NOW })).toMatchObject({
      projectId: 'project:one',
      graphIri: null,
      artifactId: 'artifact:source',
      role: 'source',
      label: 'Default source graph',
      materialization: {
        strategy: 'materialized-on-import',
        status: 'ready',
        quadCount: 2,
        indexedAt: FIXED_NOW()
      }
    });
  });

  test('normalizeQuadRow treats triples as default-graph quads', () => {
    expect(normalizeQuadRow({
      projectId: 'project:one',
      graphId: 'graph:default',
      subject: 'http://example.test/s',
      predicate: 'http://example.test/p',
      object: 'value',
      objectType: 'Literal',
      objectLang: 'en'
    })).toMatchObject({
      projectId: 'project:one',
      graphId: 'graph:default',
      subject: 'http://example.test/s',
      subjectType: 'NamedNode',
      predicate: 'http://example.test/p',
      predicateType: 'NamedNode',
      object: 'value',
      objectType: 'Literal',
      objectLang: 'en',
      objectDatatype: '',
      graph: null,
      graphIri: null,
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

  test('workspace inclusion store lists active project graph inputs explicitly', async () => {
    const store = createWorkspaceInclusionStore(createMemoryRecordAdapter(), { now: FIXED_NOW });
    const bfo = await store.storeWorkspaceInclusion({
      projectId: 'project:one',
      targetType: 'reference-dataset',
      targetId: 'reference:bfo',
      role: 'imported-reference',
      graphIri: 'urn:graph:reference:bfo'
    });
    await store.storeWorkspaceInclusion({
      projectId: 'project:one',
      targetType: 'artifact',
      targetId: 'artifact:user-source',
      role: 'project-source',
      includeMode: 'editable',
      enabled: false
    });

    await expect(store.listWorkspaceInclusions('project:one', { enabledOnly: true })).resolves.toEqual([
      expect.objectContaining({ targetId: 'reference:bfo' })
    ]);
    await expect(store.setWorkspaceInclusionEnabled(bfo.inclusionId, false)).resolves.toMatchObject({ enabled: false });
    await expect(store.listWorkspaceInclusions('project:one', { enabledOnly: true })).resolves.toHaveLength(0);
  });

  test('graph store manages materialized graph metadata by project', async () => {
    const store = createGraphStore(createMemoryRecordAdapter(), { now: FIXED_NOW });
    const source = await store.storeGraphRecord({
      graphId: 'graph:source',
      projectId: 'project:one',
      graphIri: 'urn:graph:source',
      artifactId: 'artifact:source',
      role: 'source',
      label: 'Source graph',
      materialization: { status: 'ready', quadCount: 10 }
    });
    await store.storeGraphRecord({
      graphId: 'graph:inferred',
      projectId: 'project:one',
      graphIri: 'urn:graph:inferred',
      role: 'inferred-overlay',
      label: 'Inference overlay',
      materialization: { status: 'pending' }
    });

    await expect(store.listGraphRecords('project:one', { role: 'source' })).resolves.toEqual([
      expect.objectContaining({ graphId: 'graph:source', artifactId: 'artifact:source' })
    ]);
    await expect(store.updateGraphMaterialization(source.graphId, {
      status: 'ready',
      quadCount: 12,
      indexedAt: FIXED_NOW()
    })).resolves.toMatchObject({
      materialization: {
        status: 'ready',
        quadCount: 12,
        indexedAt: FIXED_NOW()
      }
    });
  });

  test('quad store handles default graph, named graphs, filters, and exact deletion', async () => {
    const store = createQuadRowStore(createMemoryRecordAdapter());
    const defaultRow = {
      projectId: 'project:one',
      graphId: 'graph:default',
      subject: 's1',
      predicate: 'p',
      object: 'o',
      graph: ''
    };
    const namedRow = {
      projectId: 'project:one',
      graphId: 'graph:named',
      subject: 's2',
      predicate: 'p',
      object: 'o',
      graph: 'http://example.test/graph'
    };
    const otherProjectRow = {
      projectId: 'project:two',
      graphId: 'graph:other',
      subject: 's3',
      predicate: 'p',
      object: 'o',
      graph: 'http://example.test/graph'
    };

    await expect(store.upsertQuadRows([defaultRow, namedRow, otherProjectRow])).resolves.toBe(3);
    await expect(store.listNamedGraphs({ projectId: 'project:one' })).resolves.toEqual(['http://example.test/graph']);
    await expect(store.countQuadRows({ projectId: 'project:one', graph: null })).resolves.toBe(1);
    await expect(store.countQuadRows({ graphId: 'graph:named' })).resolves.toBe(1);
    await expect(store.deleteQuadRows([defaultRow])).resolves.toBe(1);
    await expect(store.countQuadRows({ projectId: 'project:one' })).resolves.toBe(1);
  });

  test('quad store accepts legacy Axiolotl rows with empty-string default graph', async () => {
    const store = createQuadRowStore(createMemoryRecordAdapter());
    await store.upsertQuadRows([{
      subject: 'http://example.test/s',
      predicate: 'http://example.test/p',
      object: 'literal',
      objectType: 'Literal',
      graph: ''
    }]);

    await expect(store.listQuadRows({ graph: null })).resolves.toEqual([
      expect.objectContaining({
        graph: null,
        graphIri: null,
        objectType: 'Literal'
      })
    ]);
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

describe('cross-app project portfolio stores', () => {
  test('createProjectPortfolioSchema uses the shared portfolio database and stores', () => {
    expect(createProjectPortfolioSchema()).toEqual({
      name: DEFAULT_PROJECT_PORTFOLIO_DB_NAME,
      version: 3,
      stores: [
        { name: 'projects', options: { keyPath: 'projectId' } },
        { name: 'artifacts', options: { keyPath: 'artifactId' } },
        { name: 'runs', options: { keyPath: 'runId' } },
        { name: 'workspaceInclusions', options: { keyPath: 'inclusionId' } },
        expect.objectContaining({ name: 'graphs', options: { keyPath: 'graphId' } }),
        expect.objectContaining({ name: 'quadRows' }),
        { name: 'settings' }
      ]
    });
  });

  test('portfolio stores let different apps contribute artifacts to one project', async () => {
    const db = createMockObjectStoreDb();
    const stores = createProjectPortfolioStores(db);
    await ensureProjectPortfolioProject(stores, {
      label: 'Shared ontology project'
    });

    await stores.artifacts.storeProjectArtifact({
      artifactId: 'artifact:ontoeagle:catalog',
      projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
      artifactKind: 'ontology-documents',
      role: 'loaded',
      label: 'OntoEagle catalog'
    });
    await stores.inclusions.storeWorkspaceInclusion({
      projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
      targetType: 'artifact',
      targetId: 'artifact:ontoeagle:catalog',
      role: 'imported-reference',
      graphIri: 'urn:graph:reference:ontoeagle-catalog'
    });
    await stores.graphs.storeGraphRecord({
      graphId: 'graph:ontoeagle:catalog',
      projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
      graphIri: 'urn:graph:reference:ontoeagle-catalog',
      artifactId: 'artifact:ontoeagle:catalog',
      role: 'reference',
      label: 'OntoEagle catalog graph',
      materialization: { status: 'ready', quadCount: 1 }
    });
    await stores.quadRows.upsertQuadRows([{
      projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
      graphId: 'graph:ontoeagle:catalog',
      subject: 's',
      predicate: 'p',
      object: 'o',
      graph: 'urn:graph:reference:ontoeagle-catalog'
    }]);
    await stores.artifacts.storeProjectArtifact({
      artifactId: 'artifact:axiolotl:query',
      projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
      artifactKind: 'sparql-query',
      role: 'staged',
      label: 'Axiolotl query'
    });

    await expect(stores.projects.getProject(DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID))
      .resolves.toMatchObject({ label: 'Shared ontology project' });
    await expect(stores.artifacts.listProjectArtifacts(DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID, { includePayload: false }))
      .resolves.toEqual(expect.arrayContaining([
        expect.objectContaining({ artifactId: 'artifact:axiolotl:query' }),
        expect.objectContaining({ artifactId: 'artifact:ontoeagle:catalog' })
      ]));
    await expect(stores.inclusions.listWorkspaceInclusions(DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID, { enabledOnly: true }))
      .resolves.toEqual([
        expect.objectContaining({ targetId: 'artifact:ontoeagle:catalog' })
      ]);
    await expect(stores.graphs.listGraphRecords(DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID))
      .resolves.toEqual([expect.objectContaining({ graphId: 'graph:ontoeagle:catalog' })]);
    await expect(stores.quadRows.countQuadRows({ graphId: 'graph:ontoeagle:catalog' }))
      .resolves.toBe(1);
  });
});

describe('project artifact and archive export helpers', () => {
  test('createProjectExportManifest describes records and archive files without payload duplication', () => {
    const manifest = createProjectExportManifest({
      project: { projectId: 'project:one', label: 'One' },
      artifacts: [{
        artifactId: 'artifact:ontology',
        projectId: 'project:one',
        artifactKind: 'ontology-rdf',
        role: 'source',
        label: 'source.ttl',
        payload: '@prefix ex: <https://example.org/> .'
      }],
      runs: [{ runId: 'run:import', projectId: 'project:one', runKind: 'import', payload: { internal: true } }],
      workspaceInclusions: [{ inclusionId: 'inclusion:one', projectId: 'project:one', targetType: 'artifact', targetId: 'artifact:ontology' }],
      settings: [{ scope: 'project:one', key: 'activeArtifactId', value: 'artifact:ontology' }]
    }, {
      now: FIXED_NOW,
      appId: 'test-app',
      archiveFiles: [{
        path: 'artifacts/source.ttl',
        artifactId: 'artifact:ontology',
        mediaType: 'text/turtle',
        extension: 'ttl'
      }]
    });

    expect(manifest).toMatchObject({
      manifestKind: 'ontoeagle-project-archive',
      manifestVersion: 1,
      exportedAt: FIXED_NOW(),
      generator: { appId: 'test-app' },
      project: { projectId: 'project:one' },
      contents: {
        artifacts: [expect.objectContaining({
          artifactId: 'artifact:ontology',
          archivePath: 'artifacts/source.ttl'
        })],
        runs: [expect.objectContaining({ runId: 'run:import' })],
        workspaceInclusions: [expect.objectContaining({ inclusionId: 'inclusion:one' })],
        settings: [expect.objectContaining({ key: 'activeArtifactId' })]
      },
      files: [expect.objectContaining({ path: 'artifacts/source.ttl' })]
    });
    expect(manifest.contents.artifacts[0]).not.toHaveProperty('payload');
    expect(manifest.contents.runs[0]).not.toHaveProperty('payload');
  });

  test('normalizeProjectImportManifest validates project archive manifest shape', () => {
    const manifest = createProjectExportManifest({
      project: { projectId: 'project:one', label: 'One' },
      artifacts: []
    }, { now: FIXED_NOW });

    expect(normalizeProjectImportManifest(manifest)).toMatchObject({
      manifestKind: 'ontoeagle-project-archive',
      manifestVersion: 1,
      project: { projectId: 'project:one' },
      contents: {
        artifacts: [],
        runs: [],
        workspaceInclusions: [],
        settings: []
      },
      files: []
    });
    expect(() => normalizeProjectImportManifest({ manifestKind: 'wrong', manifestVersion: 1 }))
      .toThrow('unsupported kind');
  });

  test('resolveArtifactDownloadFormat assigns common artifact extensions and MIME types', () => {
    expect(resolveArtifactDownloadFormat({ artifactKind: 'mermaid-diagram' })).toEqual({
      extension: 'mmd',
      mimeType: 'text/mermaid'
    });
    expect(resolveArtifactDownloadFormat({ artifactKind: 'sparql-query' })).toEqual({
      extension: 'rq',
      mimeType: 'application/sparql-query'
    });
    expect(resolveArtifactDownloadFormat({ artifactKind: 'rdf-dataset' })).toEqual({
      extension: 'jsonld',
      mimeType: 'application/ld+json'
    });
    expect(resolveArtifactDownloadFormat({ artifactKind: 'rdf-file', extension: 'owl', mediaType: 'application/rdf+xml' })).toEqual({
      extension: 'owl',
      mimeType: 'application/rdf+xml'
    });
  });

  test('downloadProjectArtifact creates a file name and blob from artifact payload', async () => {
    const downloads = [];
    const result = downloadProjectArtifact({
      artifactId: 'artifact:query',
      artifactKind: 'sparql-query',
      label: 'Class query',
      payload: 'SELECT * WHERE { ?s ?p ?o }'
    }, {
      downloadBlob(fileName, blob) {
        downloads.push({ fileName, blob });
        return { fileName };
      }
    });

    expect(result).toEqual({ fileName: 'Class query.rq' });
    expect(downloads[0].blob.type).toBe('application/sparql-query');
    await expect(downloads[0].blob.text()).resolves.toBe('SELECT * WHERE { ?s ?p ?o }');
  });

  test('createProjectArchiveBlob creates project JSON plus artifact files', async () => {
    const blob = await createProjectArchiveBlob({
      projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
      label: 'Shared Project'
    }, [
      { artifactId: 'artifact:mmd', artifactKind: 'mermaid-diagram', label: 'Flow', payload: 'graph TD; A-->B' },
      { artifactId: 'artifact:rdf', artifactKind: 'jsonld-graph', label: 'Graph', payload: { '@graph': [] } }
    ], {
      JSZipConstructor: FakeZip
    });

    const zipDescription = JSON.parse(await blob.text());
    expect(zipDescription.options).toEqual({ type: 'blob', mimeType: 'application/zip' });
    expect(zipDescription.files).toEqual([
      expect.objectContaining({ name: 'project.json' }),
      expect.objectContaining({ name: 'artifacts/Flow.mmd', content: 'graph TD; A-->B' }),
      expect.objectContaining({ name: 'artifacts/Graph.jsonld', content: '{\n  "@graph": []\n}' }),
      expect.objectContaining({ name: 'project-manifest.json' })
    ]);
    const manifestFile = zipDescription.files.find((file) => file.name === 'project-manifest.json');
    const manifest = JSON.parse(manifestFile.content);
    expect(manifest.files).toEqual([
      expect.objectContaining({ path: 'artifacts/Flow.mmd', artifactKind: 'mermaid-diagram' }),
      expect.objectContaining({ path: 'artifacts/Graph.jsonld', artifactKind: 'jsonld-graph' })
    ]);
  });

  test('downloadProjectArchive downloads a zip using injected JSZip and download function', async () => {
    const result = await downloadProjectArchive({
      projectId: 'project:test',
      label: 'Demo Project'
    }, [], {
      JSZipConstructor: FakeZip,
      downloadBlob(fileName, blob) {
        return { fileName, mimeType: blob.type };
      }
    });

    expect(result).toEqual({
      fileName: 'Demo Project.zip',
      mimeType: 'application/zip'
    });
  });

  test('storeProjectArtifactData and storeProjectRunData add records to portfolio stores', async () => {
    const stores = createProjectPortfolioStores(createMockObjectStoreDb());
    await ensureProjectPortfolioProject(stores);
    const artifact = await storeProjectArtifactData(stores, {
      artifactId: 'artifact:csv',
      projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
      artifactKind: 'tabular-file',
      role: 'source',
      label: 'terms.csv'
    }, 'id,label\nx,X');
    const run = await storeProjectRunData(stores, {
      runId: 'run:csv-to-rdf',
      projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
      runKind: 'tabular-to-rdf',
      label: 'CSV to RDF',
      inputArtifactIds: [artifact.artifactId]
    });

    await expect(stores.artifacts.getProjectArtifact('artifact:csv')).resolves.toMatchObject({
      artifactId: 'artifact:csv',
      payload: 'id,label\nx,X'
    });
    expect(run.inputArtifactIds).toEqual(['artifact:csv']);
  });

  test('createArtifactDownloadFileName sanitizes names and createArtifactDownloadBlob serializes objects', async () => {
    const artifact = {
      artifactId: 'artifact:report',
      artifactKind: 'diagnostic-report',
      label: 'Bad / Report',
      payload: { status: 'ok' }
    };
    expect(createArtifactDownloadFileName(artifact)).toBe('Bad - Report.json');
    const blob = createArtifactDownloadBlob(artifact);
    await expect(blob.text()).resolves.toBe('{\n  "status": "ok"\n}');
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
