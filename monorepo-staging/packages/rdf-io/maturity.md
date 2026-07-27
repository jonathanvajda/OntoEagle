# RDF Parsing and Serialization Maturity

## Maturity Ladder

```text
0 - Local only
1 - Candidate
2 - Characterized
3 - Reusable
4 - Package ready
5 - Canonical
```

## Ratings

|Candidate IDs|Primary source|Rating|Rationale|Promotion blockers|
|:---|:---|:---:|:---|:---|
|RDF-024, RDF-025|Ontology Compliance Diagnostic `rdf-io.js`|4|Environment-neutral API, runtime injection, broad format support, JSDoc, parse and serialize dispatchers, focused test file present.|Needs extraction into `packages/rdf-io`, shared fixture suite, canonical result/error classes, and adoption by consumers.|
|RDF-020, RDF-021, RDF-022, RDF-023|Visual Lynx transformer core|3|Broad practical behavior, transform workflow, logger hooks, RDF/XML repair path, and prefix preservation.|Runtime model and result shape differ from OCM; logger side effects need structured warning output; XML repair needs opt-in contract.|
|RDF-034, RDF-035, RDF-036|Table Nova RDF serializer|3|Focused serializer module with tests and a useful multi-format export wrapper.|Module depends on globals at load time; no parse side; batch serializer should wrap a canonical single-format serializer.|
|RDF-026|OCM term conversion helpers|3|Mostly pure adapter functions with explicit runtime dependency and direct relevance to RDF/XML bridge.|Needs shared RDFJS/rdflib term fixture tests, especially collections and blank nodes.|
|RDF-001 through RDF-004|OntoEagle `rdf_io.js` parser helpers|2|Compact and easy to understand; covers N3-like, JSON-LD, and RDF/XML inputs.|Bare store output, no structured warnings, less complete format metadata, global runtime fallback.|
|RDF-008 through RDF-014|TOM parser/serializer helpers|2|Several useful N3/JSON-LD snippets and enhanced N-Quads error context.|Embedded in a large UI/workspace file; app row builders and IndexedDB/session behavior are mixed with core RDF I/O.|
|RDF-016 through RDF-019|Axiolotl graph/store serializer helpers|2|Useful coverage for rdflib and N3 stores, including JSON-LD fallback behavior.|Storage, workspace, and UI coupling around callers; inconsistent output models; fallback JSON-LD needs explicit option.|
|RDF-027|Ontology Tabulator parser|2|Clear parse-only function used for ontology-to-table import; covers common RDF inputs.|No serializer side, dynamic/global vendor loading, limited structured error model.|
|RDF-028 through RDF-033|IRI Swapper RDF page helpers|1-2|Important named-graph ingest/export behavior and useful N3/rdflib/jsonld snippets.|Browser File, run id, IndexedDB, prefix UI state, and graph rehoming are workflow concerns; only inner parser/serializer helpers should be shared.|
|RDF-005, RDF-006|OntoEagle JSON-LD graph projection|1|Useful local projection of parsed RDF/JSON-LD into app records.|Not generic RDF I/O; belongs in ontology metadata extraction or graph projection.|
|RDF-007, RDF-011, RDF-037|TOM/Table Nova domain ontology builders|0-1|They generate RDF from app-specific row/schema models.|Domain mapping should remain outside RDF I/O; only final RDF serialization should use the shared package.|

## Strongest Promotion Path

1. Use OCM `parseRdfInput` / `serializeRdfStore` as the structural baseline because it already separates runtime libraries from core behavior.
2. Pull Visual Lynx behavior into the comparison for format transform, logger/warning expectations, RDF/XML prefix extraction, and optional repair mode.
3. Pull Table Nova `writeWithN3` and `datasetToSerializations` tests/fixtures into serializer characterization.
4. Treat IRI Swapper named-graph assignment, Axiolotl workspace export, TOM row export, and OntoEagle JSON-LD graph projection as app adapters.

## Target Maturity For First Package

The first extracted package should reach **4 - Package ready** before app rewiring:

- Core parse and serialize functions are environment-neutral.
- Vendor libraries are passed through a runtime object or imported through explicit package adapters.
- Browser File, Blob, download, DOM, IndexedDB, and UI logging are outside core.
- Errors are typed or at least consistently shaped.
- Warnings are returned as data, not only logged.
- Fixtures cover TTL, TriG, N-Triples, N-Quads, JSON-LD, RDF/XML, malformed text, empty graph, prefixes, literals, blank nodes, named graphs, and RDF lists.

The package becomes **5 - Canonical** only after every intended consumer adopts it and duplicate app-local parser/serializer implementations are removed.
