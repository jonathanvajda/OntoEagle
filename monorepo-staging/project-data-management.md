# Project Data Management

This document defines how ontology-related apps manage project data, session state, persistence, and UI rendering. The default model is fully client-side: app data is processed in the browser, session state is held in browser memory, and durable data is saved through browser-native storage.

## Data Management Priority

1. **Primary:** IndexedDB-backed browser-native project storage.
2. **Secondary:** User-selected folder synchronization through the File System Access API.
3. **Tertiary:** Origin Private File System (OPFS) storage for browser-private file workloads.

All three options are client-side. None of the core project data model requires a server, account service, cloud database, or build-time deployment step.

## Processing Model

All app functions should be designed as pure functions wherever possible.

Core processing requirements:

- Functions must receive explicit input objects and return explicit output objects.
- Functions must not directly mutate DOM nodes, browser storage, global app state, or external services.
- Data transformations should return fresh session-state objects or structured state patches.
- Parsing, validation, mapping, ontology staging, RDF generation, serialization, and export logic must be independent from UI rendering.
- Boundary adapters are responsible for controlled side effects such as reading files, writing IndexedDB records, requesting a directory handle, or painting the DOM.

The intended flow is:

1. A user action or storage event creates an input payload.
2. A thin event handler passes the payload to named orchestration logic.
3. Pure functions validate and transform the payload.
4. The orchestration layer produces the next session-state object.
5. Persistence adapters save the relevant project data.
6. UI state management derives view models from session state.
7. DOM painting renders those view models.

## Session State Management

Session state is the in-memory source of truth for the running app. It contains the active project, staged data, validation results, user selections, pending operations, and derived UI-ready state.

Session-state requirements:

- Session state must be represented as explicit objects with documented schemas.
- All changes to session state must happen through named state transition functions.
- State transition functions should be deterministic and testable.
- Session state should preserve enough metadata to audit what changed, when it changed, and which app operation produced the change.
- UI state and DOM rendering must be downstream of session state, not competing sources of truth.

## UI State Management

UI state is derived from session state. It may include selected tabs, active panels, filters, sort order, transient form values, loading indicators, toast messages, and validation display state.

UI-state requirements:

- UI state must not contain the canonical project data when that data belongs in session state or durable storage.
- UI state updates should be produced by named functions, not inline DOM event logic.
- User-facing messages should be generated from structured operation outcomes.
- UI state may be persisted only when it represents user settings or useful session restoration data.

## DOM Painting and Management

DOM painting is a rendering step, not a business-logic layer.

DOM requirements:

- DOM functions must consume session-derived view models.
- DOM functions must not parse ontology data, mutate project data, or write directly to persistent storage.
- Event handlers must remain thin. They should collect browser event data, call named functions, and request a render after state changes.
- Rendering should be repeatable from the current session state so views can be refreshed without data loss.

## Primary Storage: IndexedDB

IndexedDB is the canonical durable storage target for browser-native project persistence.

IndexedDB requirements:

- Store project data in IndexedDB through a single app storage adapter.
- Do not read or write IndexedDB directly from business logic.
- Use native IndexedDB APIs or a committed browser-ready adapter such as `./public/app/scripts/vendor/idb.min.js`.
- Store enough metadata to support project listing, versioning, modification dates, validation status, and recovery after browser reload.
- Write operations must be explicit, transactional where practical, and resilient to quota or serialization errors.
- Large data should be chunked or stored in records that avoid unnecessary memory pressure.

## Secondary Storage: File System Access API

Users may choose a local folder and allow the app to synchronize project files with that folder through the File System Access API.

The intended browser capability is:

```js
window.showDirectoryPicker({ mode: 'readwrite' });
```

File System Access requirements:

- Folder access must be user-initiated and permission-based.
- The app must handle browsers that do not support `window.showDirectoryPicker`.
- The selected folder is a synchronization target, not a replacement for the session-state model.
- Reads and writes must flow through the storage adapter boundary.
- Project files should use predictable names and documented formats so users can inspect and back up their work.
- The app must detect permission loss, missing files, conflicting changes, and failed writes gracefully.

## Tertiary Storage: Origin Private File System

OPFS is tertiary support for browser-private file storage when the app benefits from file-like APIs, large intermediate artifacts, or worker-friendly persistence.

OPFS requirements:

- OPFS must remain an implementation option behind the storage adapter.
- OPFS must not be the only way to access or export user project data.
- Data stored in OPFS should be recoverable, exportable, or synchronized to IndexedDB or a user-selected folder when appropriate.
- OPFS should be considered for large generated artifacts, temporary processing files, and browser-local caches that do not need direct user folder visibility.

## User Data Inventory

Overview:

- Project
- Common ontologies
- Staged ontology RDF
- Staged instance RDF
- Project metadata
- Validation and processing metadata
- Platform settings
- App settings
- UI restoration settings

**Project Entity and its Metadata:**

|Key|Description|Schema required|Example|
|:---:|:---|:---:|:---|
|IRI|Internationalized Resource Identifier of the project.|`true`|`<https://semanticweb.org/project-xxxx-xxxx-xxxx-xxxx-xxxx>`|
|`dcterms:title`|A name given to the project.|`true`|Customer Project|
|`dcterms:description`|An account of the project.|`true`|This project represents the domain of customers.|
|`dcterms:created`|Date on which project was created.|`true`|`YYYY-MM-DDThh:mmTZD`|
|`dcterms:modified`|Date on which the project was changed.|`false`|`YYYY-MM-DDThh:mmTZD`|
|`dcterms:creator`|An entity responsible for making the project.|`false`|Barry Guarino|
|`dcterms:contributor`|Person or organization that created the project.|`false`|Melanie Sowa|
|`dcterms:license`|A legal document giving official permission to do something with the project.|`false`|MIT 2.0|

**Staged RDF**

|Key|Description|Schema required|Example|
|:---:|:---|:---:|:---|
|subject|IRI of some subject of some semantic statement.|`true`|`<https://semanticweb.org/ind-xxxx-xxxx-xxxx-xxxx-xxxx>`|
|predicate|IRI of some predicate of some semantic statement.|`true`|`<https://semanticweb.org/prop-xxxx-xxxx-xxxx-xxxx-xxxx>`|
|object|An IRI or literal that is the object of some semantic statement|`true`|`YYYY-MM-DDThh:mmTZD` or `<https://semanticweb.org/class-xxxx-xxxx-xxxx-xxxx-xxxx>`|
|graph|IRI naming the graph to which the triple belongs.|`false`|`<https://semanticweb.org/graph-xxxx-xxxx-xxxx-xxxx-xxxx>`|


Metadata:

|Key|Description|Schema required|Example|
|:---:|:---|:---:|:---|
|event|Act of Information Processing.|`true`||
|agent|Artifact that processed information.|`true`|App that generated the data|
|datetime|The date and time that the information processing completed.|`true`|`YYYY-MM-DDThh:mmTZD`|


**Ontology and its Metadata:**

|Key|Description|Schema required|Example|
|:---:|:---|:---:|:---|
|IRI|Internationalized Resource Identifier of the ontology.|`true`|`<https://semanticweb.org/DomainOntology>`|
|`owl:versionIRI`|IRI that identifies the version of the ontology.|`true`|`<https://semanticweb.org/2026-02-15T12:34/DomainOntology>`|
|`dcterms:title`|A name given to the ontology.|`true`|Customer Ontology|
|`dcterms:description`|An account of the ontology.|`true`|This ontology represents the domain of customers.|
|`dcterms:created`|Date on which ontology was created.|`true`|`YYYY-MM-DDThh:mmTZD`|
|`dcterms:modified`|Date on which the ontology was changed.|`false`|`YYYY-MM-DDThh:mmTZD`|
|`dcterms:creator`|An entity responsible for making the ontology.|`false`|Neil Ruttenberg|
|`dcterms:contributor`|Person or organization that created the ontology.|`false`|Brian Lebo|
|`dcterms:license`|A legal document giving official permission to do something with the ontology.|`false`|MIT 2.0|

**Platform Settings**

- Light and dark mode (default: light)
- Language (default: English)
- Time zone (default: Eastern, UTC-05:00 standard time / UTC-04:00 daylight time)

**App Settings**

- Per-app preferences
- Recent project references
- Storage preference and folder-sync status
