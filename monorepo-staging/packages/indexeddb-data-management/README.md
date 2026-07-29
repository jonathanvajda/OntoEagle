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
  normalizeRunRecord,
  normalizeQuadRow,
  openIndexedDbStore,
  resolveIdbRequest,
  waitForIdbTransaction,
  runObjectStoreTransaction,
  deleteIndexedDbDatabase,
  createMemoryRecordAdapter,
  createIndexedDbRecordAdapter,
  createProjectStore,
  createArtifactStore,
  createDatasetStore,
  createSettingsStore,
  createRunRecordStore,
  createQuadRowStore
} from '@ontoeagle/indexeddb-data-management';
```

## Boundary Decisions

- Store RDF as quads. Triple-only workflows use `graph: null`.
- Store user work as project-scoped artifacts, datasets, and runs.
- Keep parsers in `rdf-io` and `tabular-io`.
- Keep file read/download behavior in `browser-file-io`.
- Keep DOM rendering, events, toasts, and status labels in each app.
- Keep File System Access as a later backend adapter, inspired by Mermaid.

## Test

```powershell
npm test
```
