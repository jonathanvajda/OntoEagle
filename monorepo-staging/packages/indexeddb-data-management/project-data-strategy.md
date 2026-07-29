# Project Data Management Strategy

## Objective

Create a shared storage architecture that can support:

- Project portfolios.
- Projects containing ontologies, loaded data, staged work, transformed data, reports, queries, diagrams, mappings, and settings.
- Multiple artifact formats: RDF, tabular, Mermaid, SPARQL, SHACL, R2RML, SQL, NoSQL query definitions, reports, and binary/source files.
- RDF datasets represented as quads, with triple-only views treated as default-graph projections.

## Recommended Concept Model

```text
Portfolio
  Project
    ProjectSettings
    Dataset
      SourceArtifact
      LoadedArtifact
      StagedArtifact
      TransformedArtifact
    GraphStore
      QuadRows
      NamedGraphs
    QueryArtifact
    DiagramArtifact
    ReportArtifact
    OperationRun
```

## Record Types

### ProjectRecord

```js
{
  projectId: 'project:...',
  label: 'Ontology cleanup workspace',
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
  storageBackend: 'indexeddb', // indexeddb | fsa | opfs
  activeArtifactId: 'artifact:...',
  tags: [],
  metadata: {}
}
```

### ArtifactRecord

```js
{
  artifactId: 'artifact:...',
  projectId: 'project:...',
  artifactKind: 'ontology' // ontology | rdf-dataset | tabular-dataset | sparql-query | sql-query | shacl | r2rml | mermaid-diagram | report | mapping | export
  role: 'source',          // source | loaded | staged | transformed | report | setting
  label: 'uploaded ontology.ttl',
  mediaType: 'text/turtle',
  extension: 'ttl',
  createdAt: '...',
  updatedAt: '...',
  source: {
    origin: 'upload',      // builtin | upload | generated | imported-folder | remote
    fileName: 'ontology.ttl',
    fingerprint: 'sha256:...'
  },
  storageRef: {
    backend: 'indexeddb',
    storeName: 'artifacts',
    key: 'artifact:...'
  },
  provenance: {
    derivedFrom: ['artifact:source'],
    operationId: 'run:...'
  },
  summary: {
    rowCount: 0,
    quadCount: 0,
    namedGraphCount: 0
  }
}
```

### DatasetRecord

```js
{
  datasetId: 'dataset:...',
  projectId: 'project:...',
  source: 'builtin',       // builtin | user | generated
  enabled: true,
  label: 'OntoEagle built-in graph',
  schemaVersion: 1,
  fingerprint: 'sha256:...',
  documentCount: 0,
  ontologyCount: 0,
  updatedAt: 0
}
```

### QuadRow

```js
{
  subject: 'http://example.org/s',
  subjectType: 'NamedNode',
  predicate: 'http://example.org/p',
  predicateType: 'NamedNode',
  object: 'literal or iri',
  objectType: 'Literal',
  objectLang: '',
  objectDatatype: 'http://www.w3.org/2001/XMLSchema#string',
  graph: null              // null/default graph, or named graph IRI
}
```

Decision: use `null` or a formal default-graph sentinel at the canonical boundary. App adapters can migrate Axiolotl’s current empty-string default graph representation.

### RunRecord

```js
{
  runId: 'run:...',
  projectId: 'project:...',
  runKind: 'diagnostic',   // diagnostic | transformation | import | export | inference | query | generation
  label: 'IRI swap 2026-07-28',
  createdAt: '...',
  inputArtifactIds: [],
  outputArtifactIds: [],
  payload: {},
  uiState: null
}
```

## Package Split

```text
packages/indexeddb-data-management/
  src/
    core/
      project-record.js
      artifact-record.js
      dataset-record.js
      run-record.js
      quad-row.js
      id-generation.js
      validation-result.js
    indexeddb/
      open-indexed-db-store.js
      run-object-store-transaction.js
      request.js
      schema.js
    stores/
      project-store.js
      artifact-store.js
      dataset-store.js
      run-store.js
      settings-store.js
      quad-store.js
    browser/
      storage-events.js
      local-storage-key-value-store.js
    fsa/
      file-system-project-store.js
```

## Canonical Function Set

### Low-level IndexedDB adapter

```js
openIndexedDbStore(schema)
runObjectStoreTransaction(db, storeName, mode, operation)
resolveIdbRequest(request)
waitForIdbTransaction(transaction)
deleteIndexedDbDatabase(name)
```

### Project and artifact store

```js
createProject(record, options)
updateProject(projectId, patch)
listProjects(options)
getProject(projectId)
deleteProject(projectId, options)

storeProjectArtifact(record, payload, options)
getProjectArtifact(artifactId, options)
listProjectArtifacts(projectId, filter)
deleteProjectArtifact(artifactId, options)
```

### Dataset and graph store

```js
storeDatasetRecord(record)
listDatasetRecords(projectId, filter)
setDatasetEnabled(datasetId, enabled)
deleteDataset(datasetId)

upsertQuadRows(projectId, rows, options)
listQuadRows(projectId, filter)
listNamedGraphs(projectId)
countQuadRows(projectId, filter)
deleteQuadRows(projectId, rows)
clearQuadRows(projectId, filter)
```

### Run and settings store

```js
storeRunRecord(record)
listRunRecords(projectId, options)
getRunRecord(runId)
deleteRunRecord(runId)
getLastRunId(projectId, runKind)
setLastRunId(projectId, runKind, runId)

getProjectSettings(projectId)
setProjectSettings(projectId, settings)
getAppSetting(key)
setAppSetting(key, value)
```

## Pilot Recommendation

1. **Simple pilot:** IRI Swapper run history.
   - Replace duplicated RDF/SPARQL `openDb/putRun/getRun/listRuns/deleteRun/clearAllRuns`.
   - Confirms the generic run store is ergonomic.

2. **Demanding pilot:** Axiolotl quad store.
   - Characterize default graph, named graph, query artifact, settings, deletion, and workspace status behavior.
   - Confirms the storage model can support RDF graph workloads.

3. **Dataset pilot:** OntoEagle.
   - Characterize built-in/user dataset preload, enabled datasets, metadata freshness, and search workspace hydration.
   - Confirms the project data model supports source/loaded dataset distinction.

4. **Project pilot:** TOM or Mermaid-informed new adapter.
   - TOM becomes a single default project with settings, imports, predicates, axioms, rows, and exported RDF.
   - Mermaid remains reference architecture for multi-project nested artifacts.

## Mermaid-Inspired Requirements

The promoted storage package should satisfy these Mermaid-derived requirements before project/artifact CRUD is considered mature:

- Project records can be created, listed, updated/renamed, selected, and deleted.
- Artifacts are scoped to projects and can be created, listed, loaded, updated/renamed, and deleted independently.
- Deleting a project has explicit artifact behavior: cascade delete, block when non-empty, or archive. The caller must choose; it should not be implicit.
- Storage backends are adapters. IndexedDB should be the first backend, but the same project/artifact contract should allow File System Access or OPFS later.
- Tests cover backend migration/open behavior, project CRUD, artifact CRUD, nested listing, delete behavior, and invalid input handling.

## Key Decisions

- Treat all RDF as quads at storage boundaries. Triple-only workflows are default-graph projections.
- Treat user files as artifacts. The artifact can have source bytes/text, loaded normalized records, staged state, and transformed outputs.
- Do not store “current UI” as the canonical data model. Store project records, artifact records, run records, settings, and normalized payloads; UI state is optional metadata.
- Keep parsers out of storage. Storage accepts normalized records and payloads; RDF/tabular/SPARQL/Mermaid parsing belongs to their own capability packages.
- Keep DOM events out of storage core. Apps can subscribe to storage results and dispatch UI notifications.
- Support multiple backends later. IndexedDB should be first; File System Access and OPFS should implement the same project/artifact interface when needed.

## Fixtures Needed

- `project-basic.json`: one project with settings and two artifacts.
- `artifact-rdf-source.json`: uploaded Turtle source artifact metadata.
- `artifact-rdf-loaded-quads.json`: loaded quad rows with default and named graphs.
- `artifact-tabular-source.json`: uploaded CSV source artifact metadata.
- `run-transformation.json`: transformation run with input/output artifacts.
- `run-diagnostic.json`: diagnostic run with report artifact.
- `query-artifacts.json`: SPARQL, SQL, and NoSQL query artifacts.
- `mermaid-project.json`: project with two Mermaid diagrams.
- `migration-axiolotl-default-graph.json`: empty-string graph rows converted to canonical default graph representation.
