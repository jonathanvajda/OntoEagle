
## Roadmap overview
1. Define standards and target package structure.
1. Survey all apps and build a capability matrix.
1. Build a function inventory with reuse maturity ratings.
1. Establish a minimal common Jest setup in all apps.
1. Rank shared capability families.
1. Select one capability family.
1. Survey that capability across all apps.
1. Deeply compare the best 2–4 implementations.
1. Write characterization and fixture tests.
1. Define a canonical API.
1. Extract a tested, documented shared package.
1. Pilot it in one simple and one demanding app.
1. Roll it out two apps at a time.
1. Delete local duplicates immediately.
1. Repeat for the next capability family. (Step 6)
1. Modernize remaining app-local code after shared boundaries stabilize.


## Phase 0: Migration Rules
Define:
    the supported browser baseline,
    ESM conventions,
    function naming conventions,
    JSDoc expectations,
    error-handling conventions,
    testing conventions,
    package naming conventions,
    rules for when code belongs in a shared package.

## Phase 1: Portfolio Census
Perform one relatively shallow pass through all applications. Do not refactor during this pass.

For every candidate implementation, record:
    file and function name,
    purpose,
    inputs and outputs,
    dependencies,
    known callers,
    side effects,
    browser, DOM, and storage assumptions,
    error behavior,
    supported formats,
    tests,
    documentation,
    apparent equivalent functions,
    maturity rating for reuse.

The census should produce a function inventory, not just an app inventory. The goal is to identify which functions are duplicates, which are near-duplicates, which are better treated as adapters, and which are mature enough to become shared package candidates.

## Phase 1.5: Function Inventory and Reuse Readiness

Create a reusable inventory artifact before choosing canonical implementations.

For each candidate function, document:
    current name,
    proposed action-oriented name,
    source app,
    file path,
    capability family,
    input contract,
    output contract,
    sync or async behavior,
    error and warning model,
    side effects,
    environment assumptions,
    vendor dependencies,
    known callers,
    equivalent or overlapping functions,
    test fixture availability,
    promotion maturity rating.

### Reuse maturity ladder

Use explicit maturity levels:

```
0 - Local only
    App-specific, unclear contract, or tightly coupled to DOM/storage.

1 - Candidate
    Useful behavior exists, but it is under-tested, underspecified, or partially coupled.

2 - Characterized
    Current behavior is documented with representative fixtures and comparison notes.

3 - Reusable
    Function is pure or mostly pure, named by action, has clear JSDoc, and has focused tests.

4 - Package ready
    Function is environment-neutral, has predictable error handling, and separates adapters from core logic.

5 - Canonical
    Shared package is adopted by all intended consumers and local duplicates have been deleted.
```

### Naming principles

Promoted functions should be named for what they do, not for the original app, screen, file format, or one current use case.

The name must be clear without deep knowledge of the source app. Long names are acceptable when they make the function's action, domain, and range unambiguous.

Avoid names such as:
```
downloadRDF()
exportRDF()
handleFile()
processData()
```

Prefer names such as:
```
downloadBlob(data, mimeType, filename)
serializeGraph(quads, format, options)
parseDelimitedText(text, options)
readFileAsText(file, options)
```

If an existing function can be made more reusable without breaking its intended behavior, modify the original function and cascade the refactor. Do not preserve narrow or ambiguous functions merely because they already exist.

### Required inventory artifacts

Each capability family should maintain:
    inventory.md,
    maturity.md,
    equivalence-matrix.md,
    naming-decisions.md,
    side-effect-boundaries.md.

The equivalence matrix should compare implementations across behavior, inputs, outputs, formats, error handling, side effects, dependencies, browser assumptions, and test coverage.

## Phase 2: Common Testing Foundation
The goal is not comprehensive coverage. The goal is to make every repo capable of running tests consistently.

This phase must be complete before any deep implementation comparison becomes binding. Without a shared testing and fixture convention, comparison can become taste-driven rather than evidence-driven.

Standardize:
    Jest version,
    Jest configuration,
    test directory conventions,
    fixture conventions,
    coverage output,
    ESM handling,
    test command names.

## Phase 3: Rank capability families

After the census, rank capabilities rather than apps.

A good extraction score can use these factors:

Factor	Question
Reuse	How many apps use it?
Stability	Is the expected behavior understood?
Testability	Can it be tested without a browser UI?
Purity	Can DOM, storage, and download side effects be separated?
Variation	Are implementations genuinely equivalent?
Payoff	Would one fix benefit several apps?
Maturity	Is there a clear path to maturity level 4 or 5?
Boundary fit	Can core logic be separated from browser, storage, vendor, and DOM adapters?

Start with capabilities that are:
    repeated in several apps,
    mostly pure,
    easy to fixture-test,
    already reasonably mature,
    costly to maintain in duplicate.

A likely order would be:
    string and data normalization,
    filename and MIME helpers,
    browser file/download utilities,
    browser storage boundary utilities,
    CSV parsing and serialization,
    RDF parsing and serialization,
    IndexedDB wrappers,
    validation,
    DOM components,
    app-specific orchestration.

Browser platform utilities should be stabilized early because file reading, Blob creation, MIME handling, download behavior, IndexedDB, File System Access, and OPFS boundaries influence many later packages.

## Phase 4: Consolidation Cycle for one Capability Family
This becomes the repeating unit of work.

For example, choose CSV parsing and serialization.

Step 4.1 — Survey all relevant apps

Look through all 8 apps, but only for CSV-related behavior.

You are looking for:
    parser functions,
    serializer functions,
    delimiter detection,
    BOM handling,
    newline handling,
    header normalization,
    file-reading code,
    download code,
    validation,
    app-specific transformations.

This is where you may discover that app 6 contains the strongest implementation.

Do not choose the canonical implementation before completing this survey.

App-touch frequency
Touch all 8 apps lightly.
Apps with no relevant implementation receive no further work in this cycle.
Deeply examine only the 2–4 strongest or most distinctive implementations.
Step 4.2 — Write characterization tests around the variants

Before combining anything, test the behavior that currently matters.

For CSV, fixtures might include:
    simple.csv
    quoted-commas.csv
    embedded-newlines.csv
    utf8-bom.csv
    empty-cells.csv
    duplicate-headers.csv
    crlf.csv
    malformed-row.csv

Create tests against the existing implementations where practical.

The purpose is not to prove that every current behavior is desirable. It is to document:
    what is shared,
    what differs,
    which differences are bugs,
    which differences are legitimate options.

This is especially important when functionally equivalent functions have different names.

After characterization, assign or update each candidate function's maturity rating. Do not define the canonical API until the strongest candidates have been characterized and rated.

Step 4.3 — Separate the layers

A shared package should not collapse several concerns into one large function.

For CSV, distinguish:
```
Browser File
    ↓
readFileAsText()
    ↓
parseCsvText()
    ↓
normalizeTabularDataset()
    ↓
application-specific interpretation
```
And for export:
```
application data
    ↓
serializeCsv()
    ↓
createTextBlob()
    ↓
downloadBlob()
```
The most reusable package may therefore be several small packages or layers:

@workspace/tabular
@workspace/file-io
@workspace/download

This separation makes it easier to share the correct parts without forcing all applications into identical workflows.

Step 4.4 — Define the canonical contract

Do not simply move app 6’s function unchanged.

First define the API you want all applications to depend upon:
```
/**
 * Parse delimited text into a normalized tabular dataset.
 *
 * @param {string} text
 * @param {object} [options]
 * @param {string} [options.delimiter]
 * @param {boolean} [options.hasHeader=true]
 * @param {boolean} [options.trimHeaders=true]
 * @returns {{headers: string[], rows: string[][], warnings: object[]}}
 */
export function parseDelimitedText(text, options = {}) {
  // ...
}
```
The canonical contract may use:

app 6’s implementation,
app 2’s error reporting,
app 4’s option naming,
and newly written normalization behavior.

The result can be a synthesis rather than a winner copied verbatim.

The contract document should include:
    canonical function name,
    rejected names and why,
    input schema,
    output schema,
    options schema,
    error and warning model,
    sync or async behavior,
    side-effect classification,
    browser, worker, and Node compatibility expectations,
    examples,
    migration notes for old app-local names.

Step 4.5 — Create the shared package

Move the canonical implementation into a package with:
    JSDoc,
    focused exports,
    Jest tests,
    fixtures,
    error definitions,
    package-level README,
    explicit dependency versions.

For example:
```
packages/tabular/
  src/
    parse-delimited-text.js
    serialize-delimited-text.js
    normalize-headers.js
    index.js
  test/
    fixtures/
    parse-delimited-text.test.js
    serialize-delimited-text.test.js
  README.md
  package.json
```
At this point, the package exists, but it is not yet proven as a replacement.

Every shared package should include:
    README.md,
    contract.md,
    migration.md,
    decision-log.md,
    fixtures/README.md,
    package-level test command,
    explicit package exports,
    dependency and vendor provenance notes.

Step 4.6 — Pilot in two applications

Choose two pilot consumers:

the simplest application using the capability,
the most demanding application using the capability.

The simple app verifies that adoption is easy.

The demanding app verifies that the abstraction is sufficiently powerful.

Do not necessarily pilot in the app that supplied the original implementation. That can hide assumptions because the API may still fit its source app unusually well.

Use thin adapters where necessary:
    ```
    import { parseDelimitedText } from '@workspace/tabular';

    export function parseUploadedCsv(text) {
    return parseDelimitedText(text, {
        hasHeader: true,
        trimHeaders: true
    });
    }
    ```
The adapter preserves app-specific naming and behavior while centralizing the underlying logic.

Step 4.7 — Roll out in small waves

After the two pilots pass:

migrate two additional apps,
run all tests,
correct the shared API if a legitimate variation appears,
migrate the remaining relevant apps.

A reasonable rollout pattern for eight sites is:

Wave 1: 2 pilot apps
Wave 2: 2 apps
Wave 3: 2 apps
Wave 4: remaining relevant apps

This is safer than migrating all eight at once, but faster than one application per month.

Step 4.8 — Delete the duplicates

As soon as an app successfully consumes the shared package:
    remove the local implementation,
    remove obsolete tests,
    retain app-specific adapter tests,
    search for stale function names,
    document the package dependency.

After duplicate deletion, update the capability family's inventory and maturity files so the package is marked canonical only when all intended consumers have adopted it.

Do not leave old implementations “temporarily” available. That recreates uncertainty about which implementation is authoritative.

How many times should each app be revisited?

For a given capability family, an app will usually be touched between one and four times.

Apps that do not use the capability

They are touched once:

capability survey
Apps that use the capability but are straightforward

They are touched around three times:
    capability survey,
    migration,
    duplicate removal and verification.

Apps containing a leading implementation

They may be touched four times:
    capability survey,
    characterization testing,
    migration to the shared package,
    cleanup.

Pilot apps

They may also receive an additional refinement pass because they expose package-design problems first.

A useful rule is:

Every app is surveyed for every major capability family, but only relevant apps are deeply revisited.

You do not need to perform eight complete refactors during every cycle.

The repeated cadence

Your ongoing work can follow this rhythm:

Portfolio pass

Occasional and broad:
    identify new duplicate families,
    update the capability matrix,
    identify inconsistent naming,
    note stronger implementations.

Do this after major development periods, not after every commit.

### Capability cycle

Frequent and narrow:
1. compare the implementations,
1. identify the newest or most capable version,
1. rate candidate maturity,
1. add characterization tests,
1. define the canonical contract,
1. extract it,
1. migrate all known copies,
1. delete the copies.

Complete one capability cycle before beginning too many others. Otherwise, you can accumulate several half-extracted packages and adapters.

# Portfolio
Here are all of the apps:

- Data Exploration: 
    - OntoEagle Semantic Lookup -- loads ontologies, runs search queries for string matches, displays basic information for results. Also generates a catalog of the ontologies.
    - Ontology Bundler (seed generator and slim generator) (same repo as OntoEagle). Takes a txt file (seed), generates a minimal ontology file 'slim'. Export TTL, TriG, N-triple, N-Quad, JSON-LD, RDF-XML.
    - Ontology Tabulator -- makes a normal flat-file table of an ontology, with element's label, definition, alt terms, parent, etc. Read to export to table (csv, tsv, xls, xlsx) or print job to printer.
    Visual Lynx -- uses D3 to draw nodes and edges for some RDF (JSON-LD, Turtle, N-triples, etc.) 
- Domain Analysis:
    - Competency Question Ferret -- records competency questions, and metadata like data sources, SMEs, mermaid diagrams, SPARQL queries, etc. Export CSV, JSON-LD. 
    - CQ Ferret Term Extractor -- extracts terms from CQs, deduplicates them for export (CSV, JSONLD). 
    - Mermaid Diagram Builder -- draws mermaid diagrams on the fly from Mermaid syntax. Has project support for IndexedDB and local file system access. Export Markdown, Mermaid, bundled Zip.
-Building Tools:
    - Tabular Ontology Maker (TOM) -- takes CSV, TSV, XLS, XSLX as a normalized table, populates a table 'canvas' (using a minified distribution version of Glide Data Grid, a Modern react data grid component). Makes ontologies (iri, label, definition, OWL element type, etc.) from bulk term lists, and instance data with support for object properties too. Export TTL, TriG, N-triple, N-Quad, JSON-LD, RDF-XML. 
    - Table Nova - takes tabular data and converts it to RDF. Supports CSV, TSV, XLS, XLSX for input. Creates a naive ontology, generates the instance data, the ontology, or both -- as Export TTL, TriG, N-triple, N-Quad, JSON-LD, RDF-XML. 
- Data Manipulation: 
    - SPARQL Pattern Visualizer - visualizes SPARQL queries as edges and nodes, using Cytoscape.
    - Axiolotl SPARQL & Inference - indexed DB. Comes with a native quadstore and triplestore. Uses Comunica for SPARQL queries and updates. Has a short execution plan for EL inference -- runs forward chaining logical inferences until the triples 'settle' -- this inference can be previewed, exported as an overlay, or pushed back into the triplestore. Visualizes SPARQL queries (copy-paste code base of the SPARQL Pattern Visualizer app, different UI). Export TTL, TriG, N-triple, N-Quad, JSON-LD, RDF-XML. 
    - Linked-Data Transformer (same repo as Visual Lynx -- Visual Lynx depends on the LD transformer's code). Reserializes from many format options to many. (input: ttl, trig, nt, nq, jsonld, rdf, xml) . Export TTL, TriG, N-triple, N-Quad, JSON-LD, RDF-XML, D3 JSON, and Mermaid.
- Maintenance: 
    - Ontology Compliance Diagnostic. Inputs an ontology file, generates a compliance report. Supports modifying the ontology file to meet compliance. Input: ttl, trig, nt, nq, jsonld, rdf, xml. Export updated ontology file as TTL, TriG, N-triple, N-Quad, JSON-LD, RDF-XML. Export compliance report as CSV, TSV, YAML, HTML, or print. 
    - Myna RDF IRI Swapper. Inputs an ontology file (TTL, Trig, N-Triple, N-quad, JSON-LD). Inputs a mapping file (CSV, TSV). Export TTL, TriG, N-triple, N-Quad, JSON-LD, RDF-XML. 
    - Myna SPARQL IRI Swapper.  Inputs an sparql file (.sparql, .rq). Inputs a mapping file (CSV, TSV). Export sparql file (.sparql, .rq). (Same repo as Myna RDF IRI swapper).

- In summary:
    - 8 deployable GitHub Pages sites/repositories,
    - about 15 identifiable applications or tools,
    - perhaps 10–12 recurring technical capabilities.
    - That distinction matters:
    - The repository structure describes deployment. The package structure should describe reusable behavior.
    - Example
        - OntoEagle and Ontology Bundler may remain one deployable site while depending on separate shared libraries. Likewise, Visual Lynx and Linked-Data Transformer can remain colocated without retaining duplicate RDF-handling code.

Given this portfolio, I would prioritize:
1. [x] MIME type/format/extension registry
2. [x] Namespace prefix registry
3. [x] Browser file/download utilities
4. [x] Tabular parsing and serialization
5. [x] RDF parsing and serialization
6. [x] IndexedDB data storage conventions for project data
7. [x] IndexedDB data storage conventions for graph data
8. [x] IndexedDB data storage conventions for user/app settings

After these foundational capabilities, a large portion of your current duplicated infrastructure should already be centralized.
```
Application-specific workflow
    ↓
shared domain package
    ↓
shared RDF/tabular/storage package
    ↓
browser platform utilities
```

Then continuing onto:
1. [x] Ontology-related utils (is valid URN, is valid IRI, is blank node, is ontology file, xsd datatype detection/updating, etc.; make UUID/GUID)
2. [x] Normalization utils (toCamelCase, toPascalCase, toSnakeCase, etc.; getting datetime, appending datetime to filename)
3. [x] SPARQL query pattern extraction
4. [x] Ontology metadata read/write and IRI provisioning
5. [x] SPARQL update pattern implementation
6. [ ] YAML, HTML, and print export
7. [ ] Toast notifications, logging utils, status notifications, lightmode-darkmode
8. [ ] Visualization of RDF in Cytoscape
9. [ ] Visualization of SPARQL in Cytoscape
10. [ ] Standardized JS API to run headless
11. [ ] Package distribution, minification, and CDN exporting/importing
12. [ ] Documentation for an agent to run headless apps

# Promoting Code into Common library
Since many of these code bases have common parentage or common principles (and developers), deduplication should usually be easier than ordinary legacy consolidation. The primary challenge is less “discover whether these implementations are related” and more:
```Determine which differences are genuine improvements, which are application-specific extensions, and which are accidental divergence.```


## A promotion ladder for shared code

### Use explicit states for candidate functions:
```
Discovered
    ↓
Grouped with equivalents
    ↓
Characterized
    ↓
Maturity rated
    ↓
Contract defined
    ↓
Canonical implementation selected
    ↓
Shared package created
    ↓
Piloted
    ↓
Adopted by all consumers
    ↓
Local duplicates deleted
```
A function is not truly “shared” when it is copied into packages/. It becomes shared only when every intended consumer uses the package and the duplicate implementations are gone.

### Necessary steps to close out a capability-family
Document that each capability-family cleanup should include:
1. removal of old local duplicate functions,
1. representative regression tests in the promoted package,
1. `npm run check` passing in every migrated repo,
1. no `no-undef` failures after rewiring.

### Use this order of importance:
1. correct and complete behavior,
1. clear separation from UI and globals,
1. suitability for all consumers,
1. predictable error handling,
1. tests,
1. documentation,
1. performance,
1. ease of extraction.

Tests and documentation are promotion accelerators, but they do not automatically make an implementation the best architecture.

## Capability Families and Packages

Tentative families to start with:
1. Format and MIME Registry
    - RDF formats, tabular formats, extensions, MIME types, labels, import/export compatibility.
1. Namespace and Prefix Registry
    - RDF, RDFS, OWL, XSD, DCTERMS, SKOS, OBO, CCO, OKEA, app-specific defaults.
    - Future milestone: generate vocabulary catalogs from JSON-LD/RDF source vocabularies so common classes, properties, datatypes, labels, comments, and selected axioms are not hand-maintained in JavaScript. See `packages/namespace-registry/vocabulary-jsonld-catalog-milestone.md`.
1. Browser File I/O
    - Reading files as text/array buffer, Blob creation, downloads, file naming, extension handling.
1. Project Storage
    - IndexedDB project records, settings, recent projects, project metadata, FSA folder sync, OPFS boundary.
1. Tabular Parsing
    - CSV/TSV/XLS/XLSX ingestion, delimiter handling, headers, rows, empty cells, BOM/newlines.
1. Tabular Serialization
    - CSV/TSV/XLS/XLSX export, escaping, headers, sheet names, workbook generation.
1. RDF Parsing
    - TTL, TriG, N-Triples, N-Quads, JSON-LD, RDF/XML ingestion into quads/datasets.
1. RDF Serialization
    - Export quads/datasets to TTL, TriG, N-Triples, N-Quads, JSON-LD, RDF/XML.
1. IRI and CURIE Utilities
    - IRI validation, compact/expand CURIEs, prefix lookup, safe IRI generation, replacement.
1. Ontology Metadata Read/Write and IRI Provisioning
    - Read, normalize, write, and round-trip ontology IRI, version IRI, imports, title, description, license/access rights, creator, contributor, repository URLs, issue tracker URLs, download URLs, quality assurance report URLs, base IRI, IRI schema, local-name style, opaque/readable policy, and next-IRI provisioning.
1. RDF Graph Operations
    - Filtering quads, graph merging, graph diffing, graph overlays, graph validation helpers.
1. Project Data Model
    - Project entity, staged ontology RDF, staged instance RDF, provenance metadata, operation history.
1. Validation and Diagnostics
    - Structured validation results, warnings/errors, compliance reports, user-facing outcome payloads.
1. SPARQL Utilities
   - Query parsing, update parsing, pattern extraction, IRI replacement, query visualization input model.
1. Inference Utilities
   - EL-style forward chaining, closure preview, inference overlay generation, triplestore update helpers.
1. Visualization Data Models
   - RDF-to-node-edge transforms, SPARQL-to-node-edge transforms, Mermaid graph output, Cytoscape/D3 adapters.
1. Report Export
   - YAML, HTML, Markdown, CSV reports, print-friendly report models.
1. UI Rendering Adapters
   - Toasts, tabs, tables, graph canvases, settings panels. I’d keep this later and more conservative.


Initial 'armchair' prediction of packages:
```
packages/
    format-registry/
        rdf-formats.js
        tabular-formats.js
    namespace-registry/
        owl-ns.js
        rdf-ns.js
        rdfs-ns.js
        dcterms-ns.js
        skos-ns.js
        obo-ns.js
        commoncore-ns.js
        okea-ns.js
    tabular-io/
        vendor/
            papaparse.min.js
            xlsx.full.min.js
        adapter/
            parse-tabular.js
            serialize-tabular.js
            tabular-error.js
    rdf-io/
        vendor/
            n3.min.js
            jsonld.min.js
            rdflib.min.js
        adapter/
            n3-adapter.js
            jsonld-adapter.js
            rdflib-adapter.js
        core/
            parse-rdf.js
            serialize-rdf.js
            rdf-result.js
            rdf-error.js
    project-storage/
        vendor/
            idb.min.js
        adapter/
            triplestore-db.js
            quadstore-db.js
            user-settings-db.js
            file-system-access.js
    visualization/
        grid/
            vendor/
                glide-data-grid.min.js
            adapter/
                tabular-grid-canvas.js
        mermaid/
            vendor/
                mermaid.min.js
            adapter/
                mermaid-canvas.js
        cytoscape/
            vendor/
                cytoscape.min.js
            adapter/
                cytoscape-canvas.js
    report-export/
        core/
            create-report-model.js
            normalize-report-section.js
            normalize-report-table.js
            report-result.js
            report-error.js
        serializer/
            serialize-report-to-csv.js
            serialize-report-to-tsv.js
            serialize-report-to-yaml.js
            serialize-report-to-html.js
            serialize-report-to-markdown.js
        adapter/
            create-printable-report-document.js
            create-report-blob.js
    download-utils/
        core/
            create-blob-from-text.js
            create-blob-from-array-buffer.js
            get-extension-for-mime-type.js
            get-mime-type-for-extension.js
            normalize-download-filename.js
            create-download-descriptor.js
        browser/
            download-blob.js
            download-text.js
            revoke-object-url.js
        adapter/
            export-text-as-download.js
            export-array-buffer-as-download.js
            export-json-as-download.js
    test-fixtures/
        rdf/
            turtle/
            trig/
            n-triples/
            n-quads/
            json-ld/
            rdf-xml/
            malformed/
        tabular/
            csv/
            tsv/
            excel/
            malformed/
        sparql/
            query/
            update/
            malformed/
        reports/
            yaml/
            html/
            markdown/
            csv/
        projects/
            indexeddb-records/
            file-system-access/
            opfs/
        README.md
```
