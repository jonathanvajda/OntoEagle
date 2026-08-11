# Maturity Assessment

## Capability Family

- **Capability family:** YAML, HTML, and print export
- **Survey date:** 2026-08-10
- **Assessment date:** 2026-08-10
- **Survey owner:** Codex

## Maturity Summary

|Area|Current level|Target level|Assessment|
|:---|:---:|:---:|:---|
|YAML serialization|4|5|Promoted serializer exists and replaces OCD hand-rolled YAML paths. Full YAML parser round-trip is not yet included, so keep at level 4 until we decide whether to vendor a YAML parser/emitter.|
|HTML document serialization|4|5|Promoted document/table/section serializer exists and is piloted. OCD measures now uses the shared serializer. OCD main still has a rich app-specific HTML projection, but escaping and print mechanics are shared.|
|Print adapter|4|5|Duplicated popup/print code has been replaced in OCD and Ontology Tabulator. OntoEagle ontology viewer no longer delegates print to Tabulator directly.|
|Export descriptors|5|5|Report downloads now compose with `format-registry`, `browser-file-io`, and `normalization-utils`. YAML is registered in `format-registry`.|

## Replacement Status

|Old implementation|Replacement|Status|
|:---|:---|:---|
|OCD `buildOntologyReportYaml` hand-built YAML lines|`serializeReportValueToYaml`|Rewired; wrapper retained as app-specific projection.|
|OCD measures `buildMeasuresYaml` and `buildAllMeasuresYaml` hand-built YAML lines|`serializeReportValueToYaml`|Rewired; wrappers retained as app-specific projections.|
|OCD measures hand-built HTML document strings|`serializeReportDocumentToHtml`|Rewired; wrappers retained as app-specific projections.|
|OCD report/measures local HTML escaping|`escapeHtmlText`|Rewired.|
|OCD `handlePrintReport` inline popup/print script|`openPrintableHtmlDocument`|Rewired.|
|Ontology Tabulator `printTableOnly` popup/document writer|`serializeReportDocumentToHtml` plus `openPrintableHtmlDocument`|Deleted and rewired.|
|OntoEagle ontology viewer Tabulator CSV/print direct calls|`serializeDelimitedRows`, `createReportTextExportDescriptor`, `serializeReportDocumentToHtml`, `openPrintableHtmlDocument`|Rewired.|

## Remaining Work Before Level 5 Closeout

- Decide whether “valid YAML” means strict parser-round-trippable YAML for every export. If yes, use or vendor a YAML library; if no, document the supported YAML subset.
- Consider replacing OCD’s remaining bespoke HTML string assembly with `serializeReportDocumentToHtml` after a report-document projection is defined.
- Add browser/manual validation for OCD report HTML/YAML download, OCD print, Ontology Tabulator print, and OntoEagle ontology viewer CSV/print.
