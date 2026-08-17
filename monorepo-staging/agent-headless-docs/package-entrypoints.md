# Package Entrypoints

## Import Policy

Use public package entrypoints only:

```js
import { exportName } from '../monorepo-staging/packages/<package>/src/index.js';
```

Browser app mirrors use:

```js
import { exportName } from './shared/<package>/index.js';
```

## `format-registry`

- **Capability:** MIME type, extension, format, and RDF parser format registry.
- **Canonical inputs:** file names, extensions, MIME strings, format keys, RDF text snippets.
- **Canonical outputs:** descriptors, normalized MIME results, preferred extensions, parser format descriptors, RDF content detection result.
- **Primary exports:** `getSupportedMimeTypeForFilename`, `getOutputMimeTypeForExtension`, `normalizeSupportedMimeType`, `getPreferredExtensionForMimeType`, `getN3ParserFormatForMimeType`, `detectRdfMimeTypeFromText`.
- **Side effects:** none.
- **Tests:** `packages/format-registry/__tests__/mime-registry.test.js`.

## `namespace-registry`

- **Capability:** Canonical namespace prefixes, full IRIs, CURIE conversion, RDF prefix extraction, namespace stems, serialization prefix selection.
- **Canonical inputs:** registry keys, id keys, full IRIs, CURIE strings, prefix maps, RDF text.
- **Canonical outputs:** full IRIs, CURIEs, prefix maps, namespace stems, selected prefix maps.
- **Primary exports:** `COMMON_NAMESPACE_IRIS`, `iriForNamespaceId`, `curieForNamespaceId`, `expandCurieToIri`, `compactIriToCurie`, `namespacePrefixMapFromRegistry`, `selectPrefixesUsedByRdfTerms`.
- **Side effects:** none; `applyPrefixesToRdflibStore` mutates the supplied rdflib store as an explicit serializer adapter.
- **Tests:** `packages/namespace-registry/__tests__/namespace-registry.test.js`.

## `browser-file-io`

- **Capability:** Browser File/Blob reading, Blob creation, downloads, safe filenames, accept attributes.
- **Canonical inputs:** File/Blob-like objects, text, filenames, MIME descriptors.
- **Canonical outputs:** text, ArrayBuffer, Blob, normalized filenames, accept strings.
- **Primary exports:** `readFileAsText`, `readFileAsArrayBuffer`, `createTextBlob`, `downloadBlob`, `downloadTextFile`, `createAcceptAttribute`, `normalizeFileExtension`, `createSafeFilenameBase`, `isBlobLike`.
- **Side effects:** explicit browser adapter behavior for FileReader/Blob/download.
- **Tests:** `packages/browser-file-io/__tests__/browser-file-io.test.js`.

## `tabular-io`

- **Capability:** Delimited text parsing/serialization, records/rows conversion, query-record exchange, IRI mapping rows.
- **Canonical inputs:** CSV/TSV text, row arrays, record arrays, mapping rows.
- **Canonical outputs:** parsed rows, records, serialized delimited text, IRI mapping objects.
- **Primary exports:** `parseDelimitedText`, `serializeDelimitedRows`, `serializeDelimitedRecords`, `rowsToRecords`, `parseQueryRecordsFromDelimitedText`, `serializeQueryRecordsToDelimitedText`, `createIriMappingFromRows`.
- **Side effects:** none.
- **Tests:** `packages/tabular-io/__tests__/tabular-io.test.js`.

## `rdf-io`

- **Capability:** RDF/JS model normalization, RDF parsing/serialization, JSON-LD projection, graph-scoped export, vendor adapter layer.
- **Canonical inputs:** RDF text with explicit MIME/format options, RDF/JS quads, quad-like rows, object-to-RDF mappings, injected parser/serializer adapters.
- **Canonical outputs:** RDF/JS quads, JSON-LD graph objects, serialized RDF text, graph export artifacts.
- **Primary exports:** `quad`, `normalizeQuad`, `datasetToQuads`, `parseRdfText`, `serializeRdfDataset`, `serializeRdfDatasetWithAdapters`, `serializeRdfDatasetForGraphScope`, `rdfDatasetToJsonLdGraph`, `projectObjectToRdfQuads`.
- **Side effects:** none in core; vendor parsers/serializers are injected or wrapped as adapters.
- **Tests:** `packages/rdf-io/__tests__/rdf-io.test.js`.

## `indexeddb-data-management`

- **Capability:** Project/artifact/dataset/run/settings/graph records, quad rows, IndexedDB/FSA adapters, project manifests, exports, legacy migration.
- **Canonical inputs:** project records, artifact records, dataset records, run records, setting records, graph records, quad rows, RDF/JS quads, manifest objects, injected stores/adapters.
- **Canonical outputs:** normalized records, JSON-LD record projections, graph plans, persisted records, manifests, folder sync reports, archive/download artifacts.
- **Primary exports:** `normalizeProjectRecord`, `normalizeArtifactRecord`, `normalizeSettingRecord`, `normalizeQuadRow`, `createProjectStore`, `createSettingsStore`, `createQuadRowStore`, `openProjectPortfolioDatabase`, `createProjectPortfolioStores`, `convertRdfJsQuadsToQuadRows`, `createProjectExportManifest`, `createProjectFolderStore`, `reconcileProjectFolderScan`.
- **Side effects:** explicit IndexedDB, FSA, Blob/JSZip, download, crypto, and Web Locks adapters.
- **Tests:** `packages/indexeddb-data-management/__tests__/indexeddb-data-management.test.js`, `packages/indexeddb-data-management/__tests__/file-system-access.test.js`.

## `ontology-utils`

- **Capability:** IRI, blank node, RDF term, ontology input, namespace, XSD datatype, UUID, and graph IRI utilities.
- **Canonical inputs:** strings, RDF/JS terms/quads, datatype IRIs, ontology input descriptors, injected crypto/date where deterministic behavior matters.
- **Canonical outputs:** booleans, normalized strings, classification records, JSON Schema fragments, coerced lexical values, UUIDs, graph IRIs.
- **Primary exports:** `isAbsoluteIri`, `normalizeIriToken`, `isBlankNodeId`, `isRdfTerm`, `canUseTermAsSubject`, `classifyOntologyInput`, `isRegisteredVocabularyIri`, `getXsdDatatypeLocalName`, `coerceLexicalValueForXsdDatatype`, `createUuid`, `createTimestampedGraphIri`.
- **Side effects:** `createUuid` requires secure Web Crypto or injected deterministic crypto. No insecure RNG fallback.
- **Tests:** `packages/ontology-utils/__tests__/ontology-utils.test.js`.

## `normalization-utils`

- **Capability:** String case normalization, labels, datetime parts, filename timestamps.
- **Canonical inputs:** strings, dates, filenames, case-style keys.
- **Canonical outputs:** normalized strings, detected case styles, label strings, date parts, timestamped filenames.
- **Primary exports:** `splitStringToWords`, `normalizeStringToCase`, `normalizeStringToPascalCase`, `normalizeStringToSnakeCase`, `normalizeStringToAsciiSlug`, `detectStringCaseStyle`, `buildLabelFromWords`, `getUtcDateTimeParts`, `appendTimestampToFilename`.
- **Side effects:** none; date helpers use injected/default Date.
- **Tests:** `packages/normalization-utils/__tests__/normalization-utils.test.js`.

## `sparql-utils`

- **Capability:** SPARQL prologue handling, lexical scan, query kind detection, IRI rewrite, query graph extraction, update pattern implementation.
- **Canonical inputs:** SPARQL text, prefix maps, IRI mappings, injected parser or graph-store/update executor adapters.
- **Canonical outputs:** prologue records, lexical tokens, operation classifications, rewrite preview rows, rewritten SPARQL text, graph models, update materialization results.
- **Primary exports:** `extractSparqlPrologue`, `scanSparqlLexicalTokens`, `classifySparqlOperationFamily`, `extractSparqlRewriteTokens`, `buildSparqlRewritePreviewRows`, `rewriteSparqlIris`, `extractSparqlQueryPatterns`, `materializeSparqlUpdateOperation`.
- **Side effects:** none in core; execution/persistence requires injected adapters.
- **Tests:** `packages/sparql-utils/__tests__/sparql-utils.test.js`.

## `ontology-metadata`

- **Capability:** Ontology metadata records, RDF metadata read/write, JSON-LD metadata read, import target derivation, IRI provisioning.
- **Canonical inputs:** full-IRI metadata records, RDF/JS quads, JSON-LD objects, IRI policy settings, existing IRI sets.
- **Canonical outputs:** normalized metadata records, ontology settings views, RDF/JS metadata quads, import targets, generated ontology IRIs, next available opaque numbers.
- **Primary exports:** `generateOntologySettings`, `normalizeOntologyMetadataRecord`, `writeOntologyMetadataQuads`, `readOntologyMetadataRecordFromQuads`, `readOntologyRecordsFromJsonLd`, `deriveOntologyImportTarget`, `buildOpaqueOntologyIri`, `buildReadableOntologyIri`, `findNextAvailableOpaqueOntologyIriNumber`.
- **Side effects:** none.
- **Tests:** `packages/ontology-metadata/__tests__/ontology-metadata.test.js`.

## `report-export`

- **Capability:** YAML serialization, HTML report serialization, text export descriptors, print-window adapter.
- **Canonical inputs:** report values, report document descriptors, export descriptors, HTML strings.
- **Canonical outputs:** YAML text, HTML text, export descriptors, printable HTML.
- **Primary exports:** `serializeReportValueToYaml`, `serializeReportDocumentToHtml`, `createReportTextExportDescriptor`, `appendPrintScript`, `openPrintableHtmlDocument`, `escapeHtmlText`.
- **Side effects:** `openPrintableHtmlDocument` is an explicit browser print adapter.
- **Tests:** `packages/report-export/__tests__/report-export.test.js`.

## `ui-feedback`

- **Capability:** Status presentations, toast notifications, scoped logging, light/dark theme preference.
- **Canonical inputs:** severity/message descriptors, DOM targets for adapters, logger handles, settings stores, theme values.
- **Canonical outputs:** presentation records, rendered adapter results, logger functions, normalized theme settings.
- **Primary exports:** `createStatusPresentation`, `renderStatusMessage`, `clearStatusMessage`, `inferToastSeverity`, `renderToastNotification`, `createScopedConsoleLogger`, `runLoggedAsyncAction`, `normalizeThemePreference`, `applyThemePreference`, `readThemePreference`, `writeThemePreference`, `toggleThemePreference`.
- **Side effects:** explicit DOM, console, and injected settings-store adapters.
- **Tests:** `packages/ui-feedback/__tests__/ui-feedback.test.js`.

## `cytoscape-visualization`

- **Capability:** Read-only RDF/SPARQL graph projection and Cytoscape renderer descriptors.
- **Canonical inputs:** RDF/JS quads, SPARQL graph models, projection/filter/layout options.
- **Canonical outputs:** `GraphState`, Cytoscape element JSON, stylesheet descriptors, layout descriptors, filter panel view models, inspector view models, copy payloads, updated UI state records.
- **Primary exports:** `projectRdfToGraphState`, `projectSparqlGraphModelToGraphState`, `projectGraphStateToCytoscapeElements`, `createDefaultCytoscapeStylesheet`, `createCytoscapeLayoutOptions`, `buildInspectorViewModel`, `calculateVisibleGraphElementIds`, `updateGraphElementSelection`, `createGraphElementCopyPayload`.
- **Side effects:** none. Live Cytoscape construction is a browser adapter responsibility.
- **Tests:** `packages/cytoscape-visualization/__tests__/cytoscape-visualization.test.js`.

