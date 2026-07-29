# Naming Decisions

## Capability Family

- **Capability family:** IndexedDB and app data management
- **Decision date:** 2026-07-28

## Decision Table

|Decision ID|Old name(s)|Proposed canonical name|Accepted?|Reason|Rejected alternatives|Migration notes|
|:---|:---|:---|:---:|:---|:---|:---|
|NAME-001|`openDb`, `ensureDb`, `initIndexedDB`, `initTripleStore`, `openTableNovaDb`|`openIndexedDbStore(schema)`|Tentative|Action and boundary are clear; accepts schema rather than app constants.|`initDb`, `openDb`, `ensureDb`|App adapters can expose narrower names such as `openAxiolotlWorkspaceDb`.|
|NAME-002|`idbRequest`, `requestToPromise`|`resolveIdbRequest(request)`|Tentative|Names the action and input shape.|`promisifyRequest`, `requestToPromise`|Should live in low-level adapter only.|
|NAME-003|`idbTransactionDone`, `transactionToPromise`, `tx`|`waitForIdbTransaction(transaction)`|Tentative|Names lifecycle boundary clearly.|`txDone`, `finishTransaction`|A higher-level `runIdbTransaction` may supersede direct use.|
|NAME-004|`runInStore`, `tx`|`runObjectStoreTransaction(db, storeName, mode, operation)`|Tentative|Explicit store, mode, operation contract.|`withStore`, `transaction`|Should close DB only if function opened DB itself; clarify ownership.|
|NAME-005|`saveRun`, `putRun`|`storeRunRecord(run)`|Tentative|Generic run persistence without app-specific “diagnostic” or “transformation”.|`saveRun`, `putRun`|App adapters can expose `storeDiagnosticRun` or `storeTransformationRun`.|
|NAME-006|`listRuns`|`listRunRecords(options)`|Tentative|Allows limit, sort, project scope.|`getRuns`, `loadRuns`|Return metadata-only by default; full payload optional.|
|NAME-007|`getRun`, `getRunDataset`|`getRunRecord(runId)`|Tentative|Stable record retrieval action.|`loadRun`|For Table Nova, graph IRI may be a run id.|
|NAME-008|`deleteRun`, `clearAllRuns`|`deleteRunRecord(runId)`, `clearRunRecords(filter)`|Tentative|Single vs batch deletion is explicit.|`removeRun`, `wipeRuns`|`clearRunRecords` should require explicit scope/filter to avoid accidental full deletes.|
|NAME-009|`getSetting`, `saveSetting`|`getAppSetting(key)`, `setAppSetting(key, value)`|Tentative|Small key-value setting boundary.|`loadSetting`, `saveSetting`|Project-scoped settings should use `getProjectSetting(projectId,key)`.|
|NAME-010|`settingsLoad`, `saveOntologySettings`|`getProjectSettings(projectId)`, `setProjectSettings(projectId, settings)`|Tentative|Moves TOM singleton settings toward portfolio project scope.|`loadOntologySettings`, `saveOntologySettings`|TOM can pass a default single-project id during migration.|
|NAME-011|`buildWorkspaceSnapshot`, `normalizeWorkspaceSnapshot`|`createProjectSnapshot(state)`, `normalizeProjectSnapshot(snapshot)`|Tentative|Applies across TOM, Axiolotl, and future project resume.|`saveWorkspace`, `loadWorkspace`|Domain-specific snapshot builders can wrap generic project snapshots.|
|NAME-012|`idbPutDocuments`, `idbGetEnabledDocuments`|`storeDatasetDocuments(datasetId, docs)`, `listEnabledDatasetDocuments(projectId?)`|Tentative|Names dataset behavior rather than IDB implementation.|`saveDocs`, `loadDocs`|OntoEagle’s built-in/user distinction should be metadata, not separate APIs.|
|NAME-013|`storeTriplesInNamedGraph`|`upsertQuadRows(rows, options)`|Tentative|The store is quad-capable; “triples” is too narrow.|`storeTriples`, `saveGraph`|Support default graph as a graph term option.|
|NAME-014|`getAllTriples`, `getAllGraphNames`|`listQuadRows(filter)`, `listNamedGraphs()`|Tentative|Makes filter shape and graph distinction explicit.|`loadGraph`, `getTriples`|A `loadRdfDataset()` adapter can convert rows into RDF/JS dataset.|
|NAME-015|`deleteExactTriples`, `clearTriples`|`deleteQuadRows(rows)`, `clearQuadRows(filter)`|Tentative|Exact row deletion vs scoped clear is explicit.|`dropTriples`, `wipeGraph`|Require filter/confirmation at app adapter for destructive operations.|
|NAME-016|`saveSavedQuery`, `getAllSavedQueries`|`storeQueryArtifact(record)`, `listQueryArtifacts(filter)`|Tentative|Supports SPARQL/SQL/NoSQL query artifacts across Axiolotl and CQ Ferret.|`saveSavedQuery`, `listSavedQueries`|Use `artifactKind` and `queryLanguage`.|
|NAME-017|Mermaid `createProject`, `saveDiagram`, `deleteDiagram`|`createProject`, `storeProjectArtifact`, `deleteProjectArtifact`|Tentative|Project and artifact language generalizes diagrams, ontologies, reports, queries.|`saveDiagram` as canonical|Mermaid can keep diagram-specific app adapters.|
|NAME-018|Mermaid FSA `writeText`, `readText`, `list`|`writeProjectFile`, `readProjectFile`, `listProjectFiles`|Tentative|Names project file boundary and avoids leaking raw root handle.|`writeText`, `readText`|Only for file-system backend, not IndexedDB core.|

## Notes

- Promoted names should avoid `idb` unless the function is truly a low-level IndexedDB adapter.
- Domain packages should not expose `DB_NAME`, `STORE_NAME`, or browser globals.
- App adapters may retain user-facing names such as “saved runs” or “active workspace” while calling canonical project/data-store functions.
