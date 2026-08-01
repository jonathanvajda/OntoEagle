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
  normalizeSettingRecord,
  createScopedSettingKey,
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
  PROJECT_RECORD_JSONLD_CONTEXT,
  createRecordJsonLdVocabulary,
  readJsonLdRecordValue,
  convertProjectRecordToJsonLd,
  convertArtifactRecordToJsonLd,
  convertDatasetRecordToJsonLd,
  convertRunRecordToJsonLd,
  convertSettingRecordToJsonLd,
  convertWorkspaceInclusionRecordToJsonLd,
  convertGraphRecordToJsonLd,
  PROJECT_FILE_MAX_SEGMENT_LENGTH,
  PROJECT_FILE_MAX_PATH_LENGTH,
  sanitizeProjectFileName,
  splitProjectRelativePath,
  createProjectFileLockKey,
  guardWritableProjectPath,
  runWithProjectFileLock,
  resetProjectFileLockQueuesForTests,
  detectFileSystemAccessSupport,
  selectProjectFolder,
  readProjectFolderPermission,
  requestProjectFolderPermission,
  createProjectFolderStore,
  initializeProjectFolderAccess,
  normalizeProjectFolderHandleRecord,
  createProjectFolderHandleStore,
  createMemoryRecordAdapter,
  createIndexedDbRecordAdapter,
  createProjectStore,
  createArtifactStore,
  createDatasetStore,
  createSettingsStore,
  createRunRecordStore,
  createWorkspaceInclusionStore,
  createGraphStore,
  createQuadRowStore,
  createActiveWorkspaceGraphPlan,
  readActiveWorkspaceGraphPlan,
  storeGraphQuadRows,
  replaceGraphQuadRows,
  clearGraphQuadRows,
  deleteGraphRecordWithQuadRows,
  convertRdfJsQuadsToQuadRows,
  convertQuadRowsToRdfJsQuads,
  createRdfJsStoreFromQuadRows,
  inspectLegacyIndexedDbDatabase,
  readLegacyObjectStoreRows,
  convertLegacyTripleRowsToQuadRows,
  convertLegacySettingsToSettingRecords,
  createLegacyMigrationReport
} from '@ontoeagle/indexeddb-data-management';
```

## Boundary Decisions

- Store RDF as quads. Triple-only workflows use `graph: null`.
- Track materialized graph metadata in `graphs`; store actual RDF statements in `quadRows`.
- Preserve the Axiolotl/Comunica path by converting `quadRows` to RDF/JS quads and in-memory RDF/JS stores.
- Store user work as project-scoped artifacts, datasets, and runs.
- Store settings as scoped records using keys such as `app:axiolotl::endpoint` and `project:default-workspace::activeArtifactId`.
- Treat compact JSON-LD as the canonical storage/import-export shape for project records where possible. Use `dcterms:title`, `dcterms:created`, `dcterms:modified`, `dcterms:format`, `rdfs:label`, and `rdf:value` instead of inventing local field names at boundaries.
- Keep DTO aliases such as `label`, `createdAt`, and `updatedAt` as temporary JS convenience inputs during migration. They should not be the final cross-app interchange vocabulary.
- Treat legacy migration helpers as non-destructive: detect, read, normalize, and report first; deletion requires app/user policy.
- Use workspace inclusions to decide which reference datasets or project artifacts participate in an active workspace graph.
- Export project ZIP archives with `project-manifest.json` as the canonical import/export manifest.
- Download individual artifacts with kind-aware file extensions and download whole projects as ZIP archives through injected browser download and JSZip dependencies.
- Keep parsers in `rdf-io` and `tabular-io`.
- Keep file read/download behavior in `browser-file-io`.
- Keep DOM rendering, events, toasts, and status labels in each app.
- Promote File System Access as an optional local-folder backend adapter, inspired by Mermaid.

## JSON-LD Record Boundary

The current store APIs still normalize plain JS records so existing apps can migrate incrementally. The promoted boundary is compact JSON-LD:

```js
{
  "@context": {
    "cceo": "http://www.ontologyrepository.com/CommonCoreOntologies/",
    "cco2": "https://www.commoncoreontologies.org/",
    "dcterms": "http://purl.org/dc/terms/",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "okea": "https://github.com/jonathanvajda/okea/"
  },
  "@id": "project:default-workspace",
  "@type": "okea:Project",
  "dcterms:identifier": {
    "@value": "project:default-workspace",
    "@type": "xsd:string"
  },
  "dcterms:title": "Default Cross-App Workspace",
  "dcterms:created": {
    "@value": "2026-07-31T00:00:00.000Z",
    "@type": "xsd:dateTime"
  },
  "dcterms:modified": {
    "@value": "2026-07-31T00:00:00.000Z",
    "@type": "xsd:dateTime"
  }
}
```

Before pure JSON-LD objects are written directly to IndexedDB stores, the schema needs a deliberate migration away from DTO keyPaths such as `projectId` and `artifactId`, or the stores need JSON-LD-compatible keyPaths/out-of-line keys. Until then, `convert*RecordToJsonLd()` functions make the intended shape visible and testable without risking existing user data.

Use established vocabularies first. The `okea:` terms are anchored in the Ontology of Knowledge Engineering Artifacts namespace and are only for uncovered knowledge-engineering/project concepts, such as `okea:Project`, `okea:WorkspaceInclusion`, or `okea:storageBackend`. Generic information artifacts use CCO information content entity, operation runs use CCO computer program execution, and bibliographic/record metadata uses DCTERMS.

## Pilot Migration Plans

- [Axiolotl IndexedDB Migration Plan](./axiolotl-migration-plan.md)
- [Tabular Ontology Maker IndexedDB Migration Plan](./tom-migration-plan.md)
- [File System Access Promotion Plan](./file-system-access-promotion-plan.md)

## Test

```powershell
npm test
```

