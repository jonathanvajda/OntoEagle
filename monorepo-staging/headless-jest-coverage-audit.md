# Headless Jest Coverage Audit

## Scope

- **Headless step:** 18.14
- **Date updated:** 2026-08-16
- **Goal:** Confirm promoted package public APIs have Node/Jest coverage that does not require a browser DOM unless testing explicit browser adapters with mocks.

## Coverage Summary

| Package | Test file | Public surface covered | Browser/runtime handling | Status |
| --- | --- | --- | --- | --- |
| `browser-file-io` | `packages/browser-file-io/__tests__/browser-file-io.test.js` | File text/array-buffer reading, Blob creation, download adapter, filename helpers, accept attributes | Uses mock Blob/FileReader/document/URL adapters | Complete for promoted browser adapter boundary |
| `format-registry` | `packages/format-registry/__tests__/mime-registry.test.js` | MIME/extension/format descriptors, RDF parser formats, RDF content detection | Pure Node tests | Complete |
| `namespace-registry` | `packages/namespace-registry/__tests__/namespace-registry.test.js` | Prefix registry, full IRI map, CURIE compaction/expansion, namespace stems, prefix extraction, serializer prefix selection | Pure Node tests with mock stores where needed | Complete |
| `normalization-utils` | `packages/normalization-utils/__tests__/normalization-utils.test.js` | Case normalization, case detection, labels, timestamps, filename timestamps | Pure Node tests with injected dates | Complete |
| `ontology-utils` | `packages/ontology-utils/__tests__/ontology-utils.test.js` | IRI/blank-node checks, RDF/JS term role checks, ontology input classification, vocabulary namespace checks, XSD datatype helpers, secure UUIDs | Pure Node tests with injected crypto/date | Complete |
| `tabular-io` | `packages/tabular-io/__tests__/tabular-io.test.js` | CSV/TSV parsing and serialization, row/header normalization, query record exchange, IRI mapping rows | Pure Node tests | Complete |
| `rdf-io` | `packages/rdf-io/__tests__/rdf-io.test.js` | RDF/JS model normalization, object-to-RDF, JSON-LD projection, graph-scoped export, N3/jsonld/rdflib adapters | Pure and injected vendor-adapter tests | Complete |
| `indexeddb-data-management` | `packages/indexeddb-data-management/__tests__/indexeddb-data-management.test.js`, `file-system-access.test.js` | Record models, JSON-LD projections, stores over injected adapters, portfolio DB, graph/quad rows, legacy migration, exports, FSA paths/locks/sync | Mock IndexedDB, mock FSA handles, injected Blob/JSZip/download | Complete for package boundary |
| `ontology-metadata` | `packages/ontology-metadata/__tests__/ontology-metadata.test.js` | Metadata settings, canonical full-IRI records, RDF metadata read/write, import target derivation, JSON-LD metadata reads, IRI provisioning | Pure Node tests | Complete |
| `sparql-utils` | `packages/sparql-utils/__tests__/sparql-utils.test.js` | Prologue handling, lexical scan, query kind, IRI rewrite, query graph extraction, SPARQL update materialization | Pure and injected parser/update executor tests | Complete |
| `report-export` | `packages/report-export/__tests__/report-export.test.js` | YAML serialization, HTML document serialization, text export descriptors, print adapter, HTML escaping | Mock print window for adapter tests | Complete |
| `ui-feedback` | `packages/ui-feedback/__tests__/ui-feedback.test.js` | Status presentation/rendering, toasts, logger, theme preference | Mock DOM/settings/logger adapters | Complete for promoted UI adapter boundary |
| `cytoscape-visualization` | `packages/cytoscape-visualization/__tests__/cytoscape-visualization.test.js` | RDF/SPARQL GraphState projection, Cytoscape element/style/layout descriptors, filters, selection, inspector, drag helpers | Pure Node tests; no live Cytoscape required | Complete |

## Regression Coverage Notes

- Legacy app-facing tests under `tests/` still cover OntoEagle search, bundler, ontology metadata, vocabulary extraction, RDF extraction, normalization, and SPARQL utility integration.
- Adapter tests use mocks rather than real browser APIs, which is correct for headless CI.
- Playwright/manual browser checks remain useful for product validation but are not a replacement for package-level headless API tests.

## 18.14 Closeout

18.14 is complete for the promoted package set. All packages have Jest coverage that runs under Node. Browser-specific behavior is tested through injected mocks where practical.

