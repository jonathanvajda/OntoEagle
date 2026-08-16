# Headless Interface Matrix

## Scope

- **Headless step:** 18.15
- **Date updated:** 2026-08-16
- **Policy:** JavaScript APIs are the canonical capability contracts. Browser apps are the canonical user product surfaces. CLI, CI, and agent/tool adapters should be added later where automation value is clear.

## Package Matrix

| Capability family | Package | JS API | Browser adapter | CLI | CI | Agent/tool | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| MIME type/format/extension registry | `format-registry` | Yes | Via app controls | Later | Via Jest now | Later | Pure registry and RDF format detection. |
| Namespace prefix registry | `namespace-registry` | Yes | Via app import maps/modules | Later | Via Jest now | Later | Canonical full IRI and prefix contract. |
| Browser file/download utilities | `browser-file-io` | Yes | Yes | Not planned | Via mock-adapter Jest | Later | Intentionally browser-adapter focused. |
| Tabular parsing and serialization | `tabular-io` | Yes | Via app file/table adapters | Likely | Via Jest now | Later | CSV/TSV/query-record/IRI-mapping core. |
| RDF parsing and serialization | `rdf-io` | Yes | Via injected N3/jsonld/rdflib browser vendors | Likely | Via Jest now | Later | Parser/runtime injection is the boundary. |
| IndexedDB/project/graph/settings data management | `indexeddb-data-management` | Yes | Yes | Likely for manifest validation | Via mock IDB/FSA Jest | Later | Storage/FSA/download side effects are explicit adapters. |
| Ontology-related utilities | `ontology-utils` | Yes | Via app validators | Likely | Via Jest now | Later | Secure UUIDs require Web Crypto or injected crypto. |
| Normalization utilities | `normalization-utils` | Yes | Via app naming/date controls | Likely | Via Jest now | Later | Deterministic except injected/default date helpers. |
| SPARQL query pattern extraction | `sparql-utils` | Yes | Via SPV/Axiolotl/IRI Swapper adapters | Likely | Via Jest now | Later | Query graph extraction remains read-only. |
| SPARQL update pattern implementation | `sparql-utils` | Yes | Via Axiolotl/OCD adapters | Likely | Via Jest now | Later | Execution/persistence requires injected graph-store adapter. |
| Ontology metadata read/write and IRI provisioning | `ontology-metadata` | Yes | Via TOM/OntoEagle/Table-Nova/OCD adapters | Likely | Via Jest now | Later | Canonical metadata record uses full IRI JSON-LD-compatible keys. |
| YAML, HTML, and print export | `report-export` | Yes | Yes for print | Likely | Via Jest now | Later | Print window is browser adapter; YAML/HTML serializers are pure. |
| Toast/logging/status/theme | `ui-feedback` | Yes | Yes | Not planned | Via mock-adapter Jest | Later | Theme persistence uses injected settings store, not localStorage. |
| RDF visualization in Cytoscape | `cytoscape-visualization` | Yes | Via Visual Lynx Cytoscape page | Not planned initially | Via Jest now | Later | Produces GraphState and renderer descriptors, not live canvas. |
| SPARQL visualization in Cytoscape | `cytoscape-visualization` | Yes | Via SPV/Axiolotl adapters | Not planned initially | Via Jest now | Later | Consumes `sparql-utils` graph models. |

## Interface Rows

| Capability | JS API | Browser | CLI | CI | Agent/Tool | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Parse/inspect | Yes | Yes | Later where valuable | Jest now | Later | RDF/tabular/SPARQL parse helpers are package APIs; browser reads files separately. |
| Validate | Yes | Yes | Later where valuable | Jest now | Later | Registry, ontology utility, metadata, storage, and report validation are covered. |
| Convert/transform | Yes | Yes | Later where valuable | Jest now | Later | RDF, tabular, SPARQL rewrite/update, metadata, and visualization projection are headless. |
| Serialize/export | Yes | Yes | Later where valuable | Jest now | Later | Browser download/print are adapters; content generation is package-level where feasible. |
| Diagnostics/report | Partial | Yes | Later | Jest now | Later | Structured errors exist by package; cross-package diagnostic envelope remains a future hardening item. |
| Persist/sync | Yes through adapters | Yes | Later for manifest checks | Mock IDB/FSA Jest now | Later | IndexedDB/FSA are explicit side-effect adapters. |
| Render/visualize | Data descriptors | Yes | Not planned initially | Projection Jest now | Later | Headless output is GraphState/element/style/layout JSON. |

## Closeout Decision

Milestone 18 is complete for the current monorepo standardization phase. Later milestones should add distribution bundles/CDN support, CLI adapters, CI examples, and agent/tool interfaces over these JavaScript APIs without changing the browser apps into the capability contract.

