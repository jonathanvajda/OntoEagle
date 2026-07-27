# RDF I/O Promoted Function Proposal

## Decision

Promote RDF parsing/serialization as two layers:

1. **Core RDF/JS data functions** that are dependency-free and testable now.
2. **Vendor adapters** for full Turtle, TriG, JSON-LD expansion/compaction, and RDF/XML parse/serialize.

GRP-008 and GRP-009 are promoted into the first layer instead of being deferred. The reusable target is not "TOM rows" or "OntoEagle graph documents"; it is a mapping-driven function that turns an app's in-memory objects into RDF quads. JSON-LD output must depend on those quads and the shared serializer, not on a separate app-specific JSON-LD branch.

## Deep Comparison

|Capability|Current candidates|Consolidation decision|
|:---|:---|:---|
|Generic RDF parse dispatch|OCM `parseRdfInput`, Visual Lynx `parseToStore`, OntoEagle `parseRdfToStore`, TOM `parseOntologyText`, Ontology Tabulator parser, IRI Swapper parser|Promote `parseRdfText(text, options)`. OCM supplies the contract baseline; Visual Lynx supplies transform and RDF/XML repair lessons.|
|Generic RDF serialize dispatch|OCM `serializeRdfStore`, Visual Lynx `serializeFromStore`, Table Nova serializers, TOM `serializeQuads`, Axiolotl workspace serializers|Promote `serializeRdfDataset(dataset, options)`. Single-format output is the primitive; batch export composes it.|
|App object to RDF|TOM row-to-quads, Table Nova schema-to-ontology, OntoEagle/CQ JSON-LD graph builders|Promote `createRdfQuadsFromObjects(objects, mapping)`. Apps keep their object models and provide declarative mappings.|
|JSON-LD graph projection|OntoEagle JSON-LD graph extraction, CQ-style JSON-LD exports, Table Nova JSON-LD export|Promote `rdfDatasetToJsonLdGraph(dataset, options)` and `serializeRdfDatasetToJsonLd(dataset, options)`. JSON-LD depends on RDF quads.|
|JSON-LD graph ingest|OntoEagle graph extraction and app-local JSON-LD records|Promote `createRdfQuadsFromJsonLdGraph(graph, options)` for simple JSON-LD-like app objects. Full JSON-LD parsing remains a jsonld adapter.|
|Named graph assignment|IRI Swapper and Axiolotl named graph workflows|Keep as app/graph adapter. It can call `parseRdfText` first, then assign graph names.|
|Domain ontology modeling|TOM ontology row rules and Table Nova column schema rules|Keep domain-specific mapping decisions local, but express final mapping through `createRdfQuadsFromObjects` where practical.|

## Proposed JS Functions

### `createRdfQuadsFromObjects(objects, options)`

Converts arbitrary app records into RDF/JS quads.

- **Input domain:** in-memory app objects, mapping with `subject`, `type`, `properties`, optional `graph`.
- **Output range:** `{ quads, warnings, subjects }`.
- **Error model:** throws for invalid mapping shape; returns warnings for missing subjects and invalid property values.
- **Logging:** none.
- **Side effects:** none.
- **Promotion use:** TOM rows, Table Nova column schemas/records, CQ Ferret records, OntoEagle graph/document records where the object shape is already known.

### `serializeRdfDataset(dataset, options)`

Serializes RDF/JS dataset-like values to one target syntax.

- **Input domain:** array/iterable/dataset-like quads.
- **Output range:** `{ text, format, mimeType, warnings }`.
- **Current implementation:** dependency-free `ntriples`, `nquads`, and simple JSON-LD projection.
- **Future adapter implementation:** Turtle/TriG via N3, RDF/XML via rdflib, canonical JSON-LD via jsonld.js.
- **Error model:** throws unsupported-format and invalid-dataset errors.
- **Logging:** none.
- **Side effects:** none.

### `parseRdfText(text, options)`

Parses RDF text.

- **Input domain:** RDF text and format/MIME/file metadata.
- **Output range:** `{ dataset, quads, sourceFormat, prefixes, baseIri, warnings }`.
- **Current implementation:** dependency-free N-Triples/N-Quads subset for tests and fallback.
- **Future adapter implementation:** Turtle/TriG/N3 via N3, JSON-LD via jsonld.js, RDF/XML via rdflib.
- **Error model:** throws unsupported-format and parse errors with line context where available.
- **Logging:** none.
- **Side effects:** none.

### `rdfDatasetToJsonLdGraph(dataset, options)`

Projects quads to simple JSON-LD graph objects.

- **Input domain:** RDF/JS dataset-like values.
- **Output range:** JSON-LD `@graph` node array.
- **Error model:** throws invalid dataset/term errors.
- **Logging:** none.
- **Side effects:** none.
- **Important constraint:** app JSON-LD export should call this or `serializeRdfDataset(..., { format: 'jsonld' })` after quads are built.

### `createRdfQuadsFromJsonLdGraph(graph, options)`

Converts simple JSON-LD-like app graph objects into quads.

- **Input domain:** object, array, or document with `@graph`.
- **Output range:** `{ quads, warnings, subjects }`.
- **Error model:** throws for invalid mapping only through the object mapper; warnings for skipped records.
- **Logging:** none.
- **Side effects:** none.
- **Limit:** not a full JSON-LD parser. Full expansion belongs to the jsonld adapter.

## Conditional App Changes

|App|Change if promoted package is adopted|
|:---|:---|
|OntoEagle|Replace local parse dispatch with `parseRdfText` once vendor adapters land. Convert app JSON-LD graph exports/projections to build quads first, then call `serializeRdfDataset(..., { format: 'jsonld' })` where the output is RDF data rather than search-specific metadata.|
|CQ Ferret|Use `createRdfQuadsFromObjects` for competency question records and metadata. JSON-LD export should serialize those quads instead of maintaining a separate JSON-LD construction path.|
|tabular-ontology-maker|Keep TOM row interpretation and axiom rules local. Use `createRdfQuadsFromObjects` for straightforward row-to-triple mappings where possible, then use `serializeRdfDataset`; remove local `serializeQuads`/JSON-LD conversion after adapter parity is reached.|
|axiolotl|Keep IndexedDB, Comunica, workspace, and named graph orchestration local. Use shared parser/serializer for pure RDF text boundaries.|
|visual-lynx|Replace transformer internals with shared parse/serialize plus adapter hooks. Keep D3 and Mermaid projections outside RDF I/O.|
|ontology-curation-manager|Likely source/pilot. Move `rdf-io.js` behavior into adapters and keep compatibility exports.|
|ontology-tabulator|Replace parse core with `parseRdfText`; keep table extraction local.|
|iri-swapper|Parse uploaded ontology through shared parser, then apply named graph/run mapping locally. Serialize filtered run quads through shared serializer.|
|table-nova|Use `createRdfQuadsFromObjects` or local dataset builders for schema/instance data, then use `serializeRdfDataset`; JSON-LD comes from the same quads.|

## File Structure Created

```text
packages/rdf-io/
  src/
    index.js
    object-to-rdf.js
    rdf-model.js
    serialize-rdf.js
  __tests__/
    rdf-io.test.js
  package.json
  promoted-function-proposal.md
```

## Adapter Work Still Required Before Full Migration

- Add N3 adapter for Turtle, TriG, N3, N-Triples, and N-Quads parsing/serialization.
- Add jsonld.js adapter for real JSON-LD expansion, compaction, and RDF conversion.
- Add rdflib adapter for RDF/XML parsing/serialization and RDF/JS term conversion.
- Decide whether Visual Lynx RDF/XML repair is strict opt-in or an app-specific preprocessor.
- Add fixtures shared with OCM and Visual Lynx before rewiring full RDF import/export pages.
