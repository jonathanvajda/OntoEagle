# Browser App Adapter Audit

## Scope

- **Headless step:** 18.13
- **Date updated:** 2026-08-16
- **Goal:** Confirm browser app code calls promoted package APIs through browser adapters instead of reimplementing capability logic locally.

## Audit Method

- Scanned OntoEagle browser code under `docs/` for imports from `docs/app/shared/*`.
- Scanned package source for browser-global side effects.
- Excluded committed vendor/minified files from interpretation.
- Reviewed remaining browser globals as UI adapter behavior rather than package logic.

## Findings

| Area | Adapter status | Evidence | Remaining risk |
| --- | --- | --- | --- |
| Format registry | Browser pages import `./shared/format-registry/index.js` for MIME/extension/format decisions. | `bundler-ui.js`, `catalog-data-manager.js`, `ferret.js`, `ontology-meta.js`, `extracted-vocabulary-page.js`. | App-specific file widgets still own DOM option rendering. |
| Namespace registry | App/domain modules import namespace registry rather than local RDF/RDFS/OWL/SKOS/XSD constants. | `bundler-core.js`, `rdf_extract.js`, `search-main.js`, `vocab-extract-core.js`, `namespaces.js`. | Serializer prefix maps remain display/serialization policy, not durable data-property definitions. |
| Browser file IO | Browser modules use shared file-read/download helpers. | `bundler-ui.js`, `catalog-data-manager.js`, `ferret.js`, `ontology-meta.js`, `ontology-viewer.js`, `extracted-vocabulary-page.js`. | UI code still owns file input clicks and error display, which is expected. |
| Tabular IO | CSV/TSV parsing and serialization call shared tabular helpers. | `bundler-ui.js`, `ferret.js`, `ontology-viewer.js`, `vocab-extract-core.js`. | Spreadsheet/XLSX adapters remain vendor/browser-specific where used. |
| RDF IO | RDF parse/serialize callers import shared RDF IO. | `ferret.js`, `ontology-meta.js`, `search-main.js`. | Live parser adapters still depend on local vendor bundles in browser apps. |
| IndexedDB/project storage | App storage wrappers import shared project/storage APIs. | `ontoeagle-indexeddb-store.js`, `cq-ferret-indexeddb-store.js`, `projects-dev.js`, `site-header.js`. | `ontoeagle-indexeddb-store.js` still contains legacy `localStorage` migration reads/removal. This is acceptable only as migration cleanup, not durable storage. |
| Ontology metadata | Metadata readers/writers use shared ontology metadata APIs. | `ontology-meta.js`, package tests, app metadata storage paths. | Feature rollout into all downstream generator apps remains outside this OntoEagle-only audit. |
| Ontology utilities | IRI validation, UUIDs, and ontology input decisions use shared utilities. | `bundler-core.js`, `bundler-ui.js`, `slim-core.js`, `vocab-extract-core.js`. | Future app passes should delete any remaining local IRI utility copies in other repos. |
| SPARQL utilities | SPARQL package APIs are used in tests and mirrored app packages. | `tests/sparql-utils.test.js`, shared package exports. | Browser app adapter audit across external repos remains part of their local migration passes. |
| Report export | HTML/YAML/print export helpers are shared. | `ontology-viewer.js`, report-export package tests. | Print window creation remains an explicit browser adapter. |
| UI feedback/theme | Status/theme code imports shared UI feedback and settings-backed theme helpers. | `bundler-ui.js`, `catalog-data-manager.js`, `ontology-catalog.js`, `ontology-viewer.js`, `search-main.js`, `site-header.js`. | Toast/status DOM rendering remains app adapter behavior. |
| Cytoscape visualization | Visualization package exports pure projection/style/layout descriptors. | Package source has no live Cytoscape or DOM globals. | Visual Lynx/SPV browser validation and performance tuning remain product-level tasks. |

## Boundary Decision

The browser app is the canonical user product surface. The JavaScript package API is the canonical capability contract. App controllers may read DOM state, call file pickers, show status/toasts, instantiate renderers, and trigger downloads. They must delegate domain behavior to shared package APIs.

## 18.13 Closeout

18.13 is complete for the current OntoEagle staging pass. The remaining work is not a blocker for headless API standardization:

- Continue repo-by-repo deletion passes when each external app is manually validated.
- Keep temporary legacy migration reads clearly scoped and remove them after user-data migration windows close.
- Avoid adding new local data models, IRI constants, parser branches, storage helpers, or visualization projections in app controllers.

