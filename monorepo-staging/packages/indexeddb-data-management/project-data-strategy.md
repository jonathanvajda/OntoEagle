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

storeProjectArtifactData(stores, record, payload)
resolveArtifactDownloadFormat(artifact)
createArtifactDownloadFileName(artifact)
createArtifactDownloadBlob(artifact)
downloadProjectArtifact(artifact, options)
createProjectArchiveBlob(project, artifacts, options)
downloadProjectArchive(project, artifacts, options)
```

### Dataset and graph store

```js
storeDatasetRecord(record)
listDatasetRecords(projectId, filter)
setDatasetEnabled(datasetId, enabled)
deleteDataset(datasetId)

storeWorkspaceInclusion(record)
getWorkspaceInclusion(inclusionId)
listWorkspaceInclusions(projectId, filter)
setWorkspaceInclusionEnabled(inclusionId, enabled)
deleteWorkspaceInclusion(inclusionId)

upsertQuadRows(projectId, rows, options)
listQuadRows(projectId, filter)
listNamedGraphs(projectId)
countQuadRows(projectId, filter)
deleteQuadRows(projectId, rows)
clearQuadRows(projectId, filter)

createActiveWorkspaceGraphPlan(projectId, inclusions, graphs, artifacts)
readActiveWorkspaceGraphPlan(stores, projectId)
storeGraphQuadRows(stores, graphRecord, rows, options)
replaceGraphQuadRows(stores, graphRecord, rows, options)
clearGraphQuadRows(stores, graphId, options)
deleteGraphRecordWithQuadRows(stores, graphId)

convertRdfJsQuadsToQuadRows(quads, options)
convertQuadRowsToRdfJsQuads(rows, DataFactory)
createRdfJsStoreFromQuadRows(rows, StoreConstructor, DataFactory)
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
normalizeSettingRecord(record)
createScopedSettingKey(scope, key)

inspectLegacyIndexedDbDatabase(name, options)
readLegacyObjectStoreRows(name, storeName, options)
convertLegacyTripleRowsToQuadRows(rows, options)
convertLegacySettingsToSettingRecords(rows, options)
createLegacyMigrationReport(input)
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

## Cross-App Project Portfolio Clarification

The project portfolio is intended to span apps. A project is not owned by OntoEagle, TOM, Axiolotl, Table Nova, IRI Swapper, Mermaid, or any other single app. Each app may contribute its own artifacts, runs, settings, and derived outputs to the same project.

Recommended storage split:

```text
OntologyWorkbenchProjects
  projects
  artifacts
  runs
  settings

App-local databases
  app-specific caches
  vendor-required legacy stores
  derived indexes
  transient acceleration structures
```

Examples:

- OntoEagle contributes selected ontology catalog artifacts, ontology slim artifacts, search/import runs, and project-level selection settings.
- CQ Ferret contributes competency-question JSON-LD artifacts, CSV import runs, Mermaid/query sub-artifacts, and generated vocabulary outputs.
- TOM contributes ontology workspace snapshots, prefix/import settings, table rows, axiom artifacts, and exported RDF artifacts.
- Axiolotl contributes RDF graph artifacts, quad rows, SPARQL query artifacts, query result artifacts, inference runs, and workspace state.
- Table Nova contributes source tabular files, parsed tabular records, RDF conversion outputs, and export artifacts.
- IRI Swapper contributes source ontology artifacts, IRI mapping artifacts, rewritten RDF artifacts, and replacement run records.
- Mermaid contributes diagram artifacts inside the same project portfolio rather than living in a separate mental model.

App-local databases are still valid, but they should be treated as implementation details unless the stored data is durable user work. For example, OntoEagle's extracted document cache and search indexes can stay app-local, while user-selected ontologies, imported files, transformed outputs, and runs should be represented in the shared project portfolio.

## Reference Catalogs Versus Project Work

Stock/default resources should not automatically become user project data. They should be modeled as reference resources that a project can explicitly use.

```text
ReferenceCatalog
  ReferenceDataset
  ReferenceArtifact

ProjectPortfolio
  Project
    ProjectArtifact
    WorkspaceInclusion
    RunRecord
    Settings
```

Reference resources include:

- OntoEagle's preloaded ontology catalog.
- Axiolotl's stock graphs that are ready to load but not automatically inserted into the user's active store.
- TOM's optimized parent lookup JSON, if promoted into a fuller ontology/reference catalog.
- Stock SHACL templates, SPARQL query templates, Mermaid templates, namespace catalogs, and other reusable resources.

Project resources include:

- User-uploaded ontology files.
- User-selected reference datasets added to a project workspace.
- Parsed tabular records.
- Loaded RDF datasets or quad rows.
- Staged transformations.
- Generated ontology slims, rewritten ontology files, diagnostic reports, diagrams, query results, and exports.

Decision:

```text
Reference data = available shared knowledge.
Project data = user-selected or user-created durable work.
App-local cache = performance/runtime implementation detail.
```

## Workspace Inclusion Records

Many ontology workflows need reference ontologies available in an active workspace for labels, taxonomy closure, superclass discovery, parent lookup, and validation. Reading every available reference graph implicitly would be confusing and could create hidden collisions. The project should therefore record explicit workspace inclusions.

```js
{
  inclusionId: 'inclusion:project-x:bfo',
  projectId: 'project:x',
  targetType: 'reference-dataset', // reference-dataset | artifact
  targetId: 'reference:bfo',
  role: 'imported-reference',      // imported-reference | project-source | generated-output
  enabled: true,
  graphIri: 'urn:graph:reference:bfo',
  includeMode: 'read-only',        // read-only | editable | generated
  createdAt: '2026-07-30T00:00:00.000Z',
  metadata: {
    reason: 'taxonomy closure and labels'
  }
}
```

For a user-loaded ontology artifact:

```js
{
  inclusionId: 'inclusion:project-x:user-domain-ontology',
  projectId: 'project:x',
  targetType: 'artifact',
  targetId: 'artifact:user-domain-ontology',
  role: 'project-source',
  enabled: true,
  graphIri: 'urn:graph:project:x:user-domain-ontology',
  includeMode: 'editable'
}
```

Workspace inclusions make it easy for users to add/remove reference ontologies from an active project without copying the reference catalog itself into every project. They also make graph visibility explicit: a project reads only enabled inclusions.

## Active Workspace Graph

An active workspace graph is a computed or materialized view over enabled workspace inclusions.

```text
ActiveWorkspaceGraph(projectId)
  = enabled reference datasets
  + enabled project source artifacts
  + enabled staged/generated artifacts
```

Named graphs should remain explicit:

```text
urn:graph:reference:bfo
urn:graph:reference:cco
urn:graph:project:x:user-source
urn:graph:project:x:generated-slim
```

This supports multiple graph views:

- Label/taxonomy view: all enabled reference and project graphs.
- Editable view: editable project graphs only.
- Export view: selected output graph(s).
- Reasoning/closure view: project graph plus selected references.
- Debug view: all enabled named graphs with provenance.

Collision handling should happen at named-graph and inclusion boundaries. The package should avoid flattening all reference and user data into one anonymous graph too early.

## Canonical Graph Store Schema

Decision: use Axiolotl's proven row-oriented RDF persistence model as the operational foundation, but add graph metadata and project scoping before promoting it across apps.

Recommended stores:

```text
graphs
quadRows
```

`graphs` stores metadata about a default or named graph:

```js
{
  graphId: 'graph:project-x:source',
  projectId: 'project:x',
  graphIri: null,                 // null default graph, or named graph IRI
  artifactId: 'artifact:source',
  role: 'source',                 // source | reference | loaded | generated | inferred-overlay
  label: 'User source graph',
  materialization: {
    strategy: 'materialized-on-import',
    status: 'ready',
    quadCount: 1000,
    indexedAt: '2026-07-30T00:00:00.000Z'
  },
  provenance: {
    derivedFrom: ['artifact:source']
  },
  metadata: {}
}
```

`quadRows` stores the RDF statements:

```js
{
  projectId: 'project:x',
  graphId: 'graph:project-x:source',
  artifactId: 'artifact:source',
  subject: 'http://example.org/s',
  subjectType: 'NamedNode',
  predicate: 'http://example.org/p',
  predicateType: 'NamedNode',
  object: 'value',
  objectType: 'Literal',
  objectLang: '',
  objectDatatype: 'http://www.w3.org/2001/XMLSchema#string',
  graph: null,
  graphIri: null,
  graphType: 'DefaultGraph'
}
```

Compatibility rule:

```text
Axiolotl-style rows with graph: '' are accepted at import/storage boundaries and normalize to graph: null.
```

This keeps the existing Comunica path viable:

```text
IndexedDB quadRows -> RDF/JS quads -> N3.Store -> Comunica rdfjsSource
```

It avoids building a custom lazy IndexedDB-backed Comunica source during this capability cycle. That can be reconsidered later if graph volume makes full in-memory RDF/JS loading the bottleneck.

## Artifact Lifecycle Buckets

A project artifact is any durable unit of user-relevant work, whether original, loaded, staged, transformed, generated, or exported.

Recommended artifact roles:

```text
reference
source
loaded
staged
transformed
generated
export
cache
```

Recommended artifact kinds:

```text
rdf-file
rdf-dataset
quad-rows
tabular-file
tabular-records
iri-mapping-table
sparql-query
sql-query
nosql-query
mermaid-diagram
shacl-shapes
r2rml-mapping
diagnostic-report
ontology-slim
search-index
```

Table Nova example:

```text
source CSV file
  -> loaded tabular records
  -> transformed RDF dataset
  -> exported Turtle/JSON-LD file
```

IRI Swapper example:

```text
source ontology file
source old-to-new IRI mapping
  -> loaded RDF dataset
  -> transformed rewritten RDF dataset
  -> exported rewritten ontology file
```

Each operation should also create a `RunRecord` connecting input and output artifact ids.

```js
{
  runKind: 'rdf-iri-rewrite',
  inputArtifactIds: [
    'artifact:source-ontology',
    'artifact:iri-mapping-table'
  ],
  outputArtifactIds: [
    'artifact:rewritten-rdf-dataset',
    'artifact:rewritten-rdf-file'
  ],
  payload: {
    replacementCount: 128,
    unmappedCount: 3,
    targetFormat: 'text/turtle'
  }
}
```

## File-Manager Style Navigation

The storage architecture should support a UI similar to Protege, Windows File Explorer, or a project explorer. The UI should expose a logical tree, not raw IndexedDB object stores.

Possible navigation model:

```text
Projects
  Diabetes Ontology Cleanup
    Active Workspace
      Included References
        BFO                  read-only
        CCO                  read-only
      Project Sources
        diabetes-source.ttl  editable
      Staged Work
        parent choices
        axiom draft table
      Transformed Outputs
        rewritten-output.ttl
        generated-slim.ttl
    Ontologies
    Tabular Data
    Mappings
    Queries
    Diagrams
    Reports
    Runs / History
    Settings

Reference Catalogs
  OntoEagle Built-ins
  Axiolotl Stock Graphs
  TOM Parent Lookup Catalog
  Query Templates
  SHACL Templates

Caches
  Search indexes
  Parsed lookup indexes
```

The tree can be generated from normalized records rather than folder paths:

```text
projectId
artifactKind
role
source.origin
workspace inclusion enabled/disabled state
provenance.derivedFrom
runKind
createdAt / updatedAt
```

A later shared utility can provide this as a pure UI-neutral projection:

```js
createProjectNavigationTree(records, options)
```

Apps can render that tree differently while preserving the same logical organization.

## Resolved Design Decisions For User Feedback

### Default Project Behavior

Each app should assume it is contributing to a shared active project. If the user has not chosen or named a project, the app should write to the default project.

Decision:

```text
Apps save durable user work to the active project.
If no active project exists, apps create/use the shared default project.
```

This avoids forcing project-management UI into every app before the storage model is useful. It also keeps the model compatible with later project selection, project rename, and cross-app project navigation.

### Reference Inclusion Records

Adding a reference dataset to a project should create a `WorkspaceInclusionRecord`. It should not create a full project artifact unless the user forks, annotates, edits, snapshots, or exports that reference data.

Recommended rule:

```text
Reference selected for use = WorkspaceInclusionRecord only.
Reference copied/mutated by user = ProjectArtifact plus WorkspaceInclusionRecord.
```

A lightweight project artifact that points to a reference can be useful later for project manifests, offline bundles, or exportable project packages. It should not be required for ordinary workspace inclusion, because that would make reference use look like user-created project data even when it is only a read-only dependency.

### Reference Mutation And Revert

Reference datasets should be immutable by default, but users should be allowed to fork them into editable project artifacts.

The forked artifact should preserve provenance and mutation status:

```js
{
  artifactKind: 'rdf-dataset',
  role: 'forked-reference',
  source: {
    origin: 'reference-fork',
    referenceId: 'reference:bfo',
    fingerprint: 'sha256:original-reference'
  },
  provenance: {
    derivedFrom: ['reference:bfo']
  },
  metadata: {
    mutatedFromReference: true,
    canRevertToReference: true
  }
}
```

Reverting should not mutate the reference catalog. It should either:

- Replace the forked project artifact payload with the current stock/reference payload.
- Disable/delete the forked artifact and re-enable the original read-only reference inclusion.

The second option is cleaner for provenance because it preserves the distinction between stock data and user-edited data.

### Active Workspace Materialization

Active workspace graph views should support both computed and materialized strategies. The strategy should be app-specific.

Recommended modes:

```text
computed-on-demand
materialized-on-import
materialized-on-first-use
materialized-on-run
```

OntoEagle should materialize selected built-in and user-added ontology datasets because search, IRI seed management, and slim generation depend on fast indexed access. Axiolotl can defer materialization until the user loads a graph into the active store or runs an operation that requires local quad access. Table Nova and IRI Swapper can usually materialize only around a transformation run.

The package should make this explicit on the workspace inclusion or artifact summary:

```js
{
  materialization: {
    strategy: 'materialized-on-import',
    status: 'ready',
    quadCount: 45000,
    indexedAt: '2026-07-30T00:00:00.000Z'
  }
}
```

### Collision Warnings

The project storage package should not produce user-facing collision warnings by default.

Decision:

```text
Storage records provenance and graph boundaries.
Specialized apps inspect conflicts when needed.
```

Ontology Compliance Diagnostic and related validation tools are better places to surface conflicting labels, subclass relations, domain/range assertions, or metadata. The storage layer should preserve enough named-graph and provenance information for those tools to inspect conflicts accurately.

### Cache Visibility

Caches should appear in the navigator only under advanced/debug mode.

Default project navigation should show durable user work:

- Projects.
- Active workspace inclusions.
- Source artifacts.
- Staged artifacts.
- Transformed/generated artifacts.
- Queries.
- Diagrams.
- Reports.
- Runs/history.
- Settings.

Advanced/debug navigation can show implementation details:

- Search indexes.
- Parsed lookup indexes.
- Materialized quad stores.
- Vendor-local stores.
- App-local acceleration caches.

This keeps the user mental model focused on work products, while still giving developers and advanced users a way to inspect storage behavior.

### Controlled Vocabulary Before TOM, Axiolotl, And Mermaid Migration

The controlled vocabulary should be broad enough for the next migrations, but not so broad that every app invents its own near-duplicate terms.

Recommended `artifactKind` values:

```text
ontology-rdf
ontology-table
rdf-file
rdf-dataset
quad-rows
tabular-file
tabular-records
iri-mapping-table
sparql-query
sparql-update
sql-query
nosql-query
query-results
mermaid-diagram
shacl-shapes
r2rml-mapping
diagnostic-report
measurement-report
ontology-slim
ontology-catalog
iri-bundle
reference-dataset
project-snapshot
app-settings
export-bundle
```

Use `artifactKind` for the durable data shape or domain-significant data class:

- `ontology-rdf`: ontology source or output serialized as RDF, such as Turtle, JSON-LD, RDF/XML, TriG, or N-Quads.
- `ontology-table`: TOM-style normalized spreadsheet/table intended to describe an ontology, not merely arbitrary tabular data.
- `rdf-file`: generic RDF file when ontology semantics are unknown or not relevant.
- `rdf-dataset` / `quad-rows`: loaded RDF graph data, including default-graph triples, named-graph quads, instance data, and inferred/materialized overlays.
- `tabular-file` / `tabular-records`: generic tabular source or parsed tabular records.
- `mermaid-diagram`, `sparql-query`, `sql-query`, `nosql-query`, and report/mapping kinds: durable side artifacts that can be project-wide without taking ownership of the primary RDF/ontology work.

Avoid one artifact kind per app. App ownership should be recorded in `source.appId`, `metadata.appId`, or run provenance. Purpose should be recorded in `role`, `runKind`, and optional semantic metadata.

Recommended `role` values:

```text
reference
source
loaded
staged
transformed
generated
forked-reference
inferred-overlay
query
report
setting
cache
export
```

Recommended `runKind` values:

```text
import
export
parse
load
query
transformation
rdf-iri-rewrite
tabular-to-rdf
diagnostic
inference
generation
materialization
migration
```

App-oriented examples:

- TOM: `ontology-table` with `role: staged/source`, or `ontology-rdf` with `role: export/generated`.
- Axiolotl: `rdf-dataset` or `quad-rows`; ontology, instance data, and inferred overlays are distinguished by `role`, graph IRI, provenance, and metadata rather than separate app-specific kinds.
- OntoEagle: mostly `ontology-rdf`, `ontology-catalog`, and `ontology-documents`; knowledge-graph instance data can remain `rdf-dataset`.
- CQ Ferret: RDF/JSON-LD domain/problem-area artifacts, plus optional `tabular-file`, `mermaid-diagram`, and query artifacts.
- Bundler: `ontology-slim`, `iri-bundle`, or `rdf-dataset` depending whether the artifact is the ROBOT seed text, generated ontology slim, or loaded graph data.
- OCD: `diagnostic-report` and `measurement-report` generated from `ontology-rdf` or `rdf-dataset` inputs.
- Table Nova: `tabular-file` or `tabular-records` inputs, `rdf-dataset` or `ontology-rdf` outputs when it generates a naive ontology from schema.
- IRI Swapper: `iri-mapping-table` plus `rdf-file`/`ontology-rdf` or query input; transformed output keeps the same broad kind with `role: transformed`.
- Ontology Tabulator: `ontology-rdf` input, `ontology-table` or `tabular-records` output.
- Linked Data Transformer / Visual Lynx: RDF inputs with generated RDF, Mermaid, D3 JSON, or visual artifacts.
- Mermaid: `mermaid-diagram` is a first-class project artifact.

Recommended `source.origin` values:

```text
builtin
reference-catalog
upload
generated
transformed
remote
imported-folder
legacy-migration
reference-fork
```

Recommended `WorkspaceInclusionRecord.role` values:

```text
imported-reference
project-source
staged-work
generated-output
forked-reference
query-context
validation-context
```

Recommended `includeMode` values:

```text
read-only
editable
generated
disabled
```

These values should be normalized in code rather than treated as loose strings. Unknown values can be allowed during early migration, but should trigger warnings in development tests so vocabulary drift does not reappear across apps.

