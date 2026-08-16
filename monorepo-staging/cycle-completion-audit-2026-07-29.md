# Capability Cycle Completion Audit

## Date

2026-07-29

## Scope

Audited the first five shared capability families against the roadmap requirement:

1. MIME type / format / extension registry
2. Namespace prefix / common IRI registry
3. Browser file/download utilities
4. Tabular parsing and serialization
5. RDF parsing and serialization

Target repos:

- OntoEagle
- tabular-ontology-maker
- axiolotl
- visual-lynx
- sparql-pattern-visualizer
- ontology-curation-manager
- ontology-tabulator
- iri-swapper
- table-nova

## Summary

|Capability family|Verified status|Maturity decision|Reason|
|:---|:---|:---:|:---|
|MIME type / format / extension registry|Active app-owned duplicate helpers removed for TOM, Axiolotl, and OCM. Shared registry now covers SPARQL query/update/result MIME types and legacy TOM format classifications.|5 for active app code, excluding deprecated Axiolotl artifacts and standalone graph analytics page.|All active app call sites found in this pass now call shared registry functions or package-derived app policy.|
|Namespace prefix / common IRI registry|OntoEagle bridge exports `COMMON_PREFIXES`/`shortIri` removed; Ontology Tabulator unused reverse constant removed; display fallback promoted as `formatIriForDisplay`.|5 for active namespace registry/helper duplicates found in this pass.|Remaining namespace use is registry-derived local variables or app-specific filter/model logic.|
|Browser file/download utilities|OCM, Visual Lynx, Axiolotl, and Table Nova old wrappers removed from active app code; callers use shared `browser-file-io` signature.|5 for active app code.|No active app-owned `readFileAsText`/`downloadTextFile` implementations found outside shared packages after cleanup.|
|Tabular parsing and serialization|OCM CSV helpers, TOM CSV escaping/string generation, OntoEagle vocabulary CSV escaping, and Table Nova CSV/TSV parser helpers moved to `tabular-io`; old app-local tests now target shared functions.|5 for CSV/TSV active app code. XLSX remains app/vendor adapter behavior.|CSV/TSV duplicated behavior is represented in shared Jest. XLSX parsing is not considered canonical until spreadsheet/vendor parsing is explicitly added to a future package.|
|RDF parsing and serialization|Shared `rdf-io` tests pass and remaining active direct parser/serializer branches in TOM, Axiolotl, Axiolotl `graph-analytics.html`, and Visual Lynx have been migrated to shared `rdf-io` package imports.|5 for active app code.|Active app-owned RDF parsing/serialization now routes through shared `rdf-io`; direct vendor parser/serializer calls are confined to the shared adapter layer.|

## Regression Coverage Moved or Confirmed

|Legacy source|Old expectation|New representative coverage|
|:---|:---|:---|
|TOM `parseFileExtension` tests|Final extension, uppercase, no extension, trailing dot, null.|`format-registry` `getFilenameExtension`; TOM test now imports shared registry.|
|TOM `detectFormatByExtension` tests|CSV/TSV/XLSX -> spreadsheet; RDF extensions -> ontology; unknown -> unsupported.|`format-registry` `getInputKindForExtension`; TOM test now imports shared registry.|
|TOM `guessMediaType` tests|JSON-LD before Turtle, Turtle, RDF/XML, N-Triples, plain text.|`format-registry` `detectRdfMimeTypeFromText`; TOM test now imports the shared structured detector.|
|OCM `csvEscape` / `rowsToCsv` tests|Commas, quotes, embedded newlines, trailing newline.|`tabular-io` `escapeDelimitedCell` and `serializeDelimitedRows`; OCM test now imports shared package copy.|
|Table Nova `detectDelimiterFromLine` tests|Comma vs tab detection.|`tabular-io` `detectCsvOrTsvDelimiter`; Table Nova test now imports shared package copy.|
|Table Nova `parseLine` tests|Quoted commas and escaped quotes.|`tabular-io` `parseDelimitedLine`; Table Nova test now imports shared package copy.|
|Table Nova `parseCsvOrTsvText` tests|Header plus rows shape.|`tabular-io` `parseDelimitedTextAsHeaderRows`; Table Nova test now imports shared package copy.|
|Table Nova `applyHeaderRowOptions` tests|Later 1-based header row and no-header identity behavior.|`tabular-io` `applyHeaderRowOptions`; Table Nova test now imports shared package copy.|
|Axiolotl MIME map|Turtle, N-Triples, JSON-LD, RDF/XML, N-Quads, TriG, SPARQL query/update/result MIME values.|`format-registry` descriptors and `getMimeTypeForFormatKey`; added SPARQL query/update/result descriptors.|
|Visual Lynx download extension map|RDF, Mermaid, and D3 JSON output extensions.|`format-registry` `getPreferredExtensionForMimeType`; added Mermaid/D3 preferred-extension coverage.|
|OntoEagle `shortIri`|CURIE when possible, local name fallback otherwise.|`namespace-registry` `formatIriForDisplay`; added Jest coverage.|
|TOM `escapeCsvField` / `generateCsvString`|Quote commas, quotes, and newlines; CRLF output without trailing newline.|`tabular-io` `escapeDelimitedCell` and `serializeDelimitedRows`; TOM tests now verify the old output contract through shared helpers.|
|OntoEagle vocabulary `escapeCsv` / `exportRowsToCsv`|LF output without trailing newline; quote commas, quotes, and embedded newlines.|`tabular-io` `serializeDelimitedRows`; added OntoEagle regression test for the app export function.|
|Axiolotl `downloadText` / `workspaceExportExtension`|Download text with MIME and choose RDF export extension by MIME.|`browser-file-io` `downloadTextFile` and `format-registry` `getPreferredExtensionForMimeType`; active callers import shared helpers directly.|

## RDF Completion Update

The prior RDF blockers were resolved after the initial audit:

- TOM `tom-core.js` raw axiom and saved-session RDF parsing now use shared `rdf-io`.
- Axiolotl `comunica-indexeddb-bridge.js` named-graph and rdflib graph parsing now use shared `rdf-io`, then convert RDF/JS terms into the app's rdflib graph shape.
- Axiolotl `axiolotl-query.js` JSON-LD and CONSTRUCT-preview parsing/serialization now use shared `rdf-io`.
- Axiolotl `graph-analytics.html` now uses shared `rdf-io` for all RDF file parsing and preserves the page's simple analytics quad shape as an adapter.
- Visual Lynx `linked-data-transformer-core.js`, `linked-data-transformer-functions.js`, and `n3-sugar-serial.js` now route RDF parsing/serialization through shared `rdf-io`; Mermaid/D3 and presentation-only formatting remain local.

Verification scan:

- No active app-owned matches remained for `new N3.Parser`, `N3.Writer`, `jsonld.toRDF`, `jsonld.fromRDF`, `$rdf.parse`, `$rdf.serialize`, or `rdflib.parse` outside `shared/rdf-io`, vendor folders, deprecated folders, and shared package source.
- Remaining non-shared matches are explanatory strings/comments, not executable parser/serializer branches.

## Tests Run

- `D:\GitHub\OntoEagle\monorepo-staging\packages\format-registry`: passed, 15 tests.
- `D:\GitHub\OntoEagle\monorepo-staging\packages\namespace-registry`: passed, 12 tests.
- `D:\GitHub\OntoEagle\monorepo-staging\packages\browser-file-io`: passed, 18 tests.
- `D:\GitHub\OntoEagle\monorepo-staging\packages\tabular-io`: passed, 18 tests.
- `D:\GitHub\OntoEagle\monorepo-staging\packages\rdf-io`: passed, 15 tests.
- `D:\GitHub\OntoEagle`: passed, 140 tests.
- `D:\GitHub\tabular-ontology-maker`: passed, 24 tests.
- `D:\GitHub\axiolotl`: passed, 14 tests.
- `D:\GitHub\ontology-curation-manager`: passed, 26 tests.
- `D:\GitHub\visual-lynx`: passed, 9 tests.
- `D:\GitHub\ontology-tabulator`: passed, 16 tests.
- `D:\GitHub\table-nova`: passed, 21 tests.
- `D:\GitHub\iri-swapper`: passed, 7 tests.
- `D:\GitHub\sparql-pattern-visualizer`: passed, 4 tests.

## Decision

Mark MIME/format, namespace, browser-file-io, CSV/TSV tabular behavior, and RDF parsing/serialization as level 5 for active app code after this cleanup.

Keep vendor parser/serializer calls inside `shared/rdf-io` adapter modules. App code should treat RDF parsing/serialization as a package capability, with local code limited to app-specific projection, graph storage, UI, and report/export workflows.
