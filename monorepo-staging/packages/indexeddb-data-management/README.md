# IndexedDB and App Data Management

Shared ESM package for project, artifact, dataset, run, settings-adjacent, and RDF quad storage boundaries.

This package intentionally separates:

- Pure record normalization and id generation.
- Minimal IndexedDB promise helpers.
- Store APIs over injected adapters.
- App-specific DOM, parser, serializer, logging, and event behavior.

## Public API

```js
import {
  createStableRecordId,
  createTimestampRecordId,
  normalizeProjectRecord,
  normalizeArtifactRecord,
  normalizeDatasetRecord,
  normalizeGraphRecord,
  normalizeRunRecord,
  normalizeWorkspaceInclusionRecord,
  normalizeQuadRow,
  openIndexedDbStore,
  resolveIdbRequest,
  waitForIdbTransaction,
  runObjectStoreTransaction,
  deleteIndexedDbDatabase,
  openProjectPortfolioDatabase,
  createProjectPortfolioStores,
  ensureProjectPortfolioProject,
  PROJECT_ARCHIVE_MANIFEST_FILE,
  PROJECT_MANIFEST_KIND,
  PROJECT_MANIFEST_SCHEMA_VERSION,
  createProjectExportManifest,
  normalizeProjectImportManifest,
  storeProjectArtifactData,
  storeProjectRunData,
  resolveArtifactDownloadFormat,
  createArtifactDownloadFileName,
  createArtifactDownloadBlob,
  downloadProjectArtifact,
  createProjectArchiveBlob,
  downloadProjectArchive,
  createMemoryRecordAdapter,
  createIndexedDbRecordAdapter,
  createProjectStore,
  createArtifactStore,
  createDatasetStore,
  createSettingsStore,
  createRunRecordStore,
  createWorkspaceInclusionStore,
  createGraphStore,
  createQuadRowStore
} from '@ontoeagle/indexeddb-data-management';
```

## Boundary Decisions

- Store RDF as quads. Triple-only workflows use `graph: null`.
- Track materialized graph metadata in `graphs`; store actual RDF statements in `quadRows`.
- Store user work as project-scoped artifacts, datasets, and runs.
- Use workspace inclusions to decide which reference datasets or project artifacts participate in an active workspace graph.
- Export project ZIP archives with `project-manifest.json` as the canonical import/export manifest.
- Download individual artifacts with kind-aware file extensions and download whole projects as ZIP archives through injected browser download and JSZip dependencies.
- Keep parsers in `rdf-io` and `tabular-io`.
- Keep file read/download behavior in `browser-file-io`.
- Keep DOM rendering, events, toasts, and status labels in each app.
- Keep File System Access as a later backend adapter, inspired by Mermaid.

## Test

```powershell
npm test
```
