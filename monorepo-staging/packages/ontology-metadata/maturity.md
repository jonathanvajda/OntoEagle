# Reuse Maturity Ratings

## Capability Family

- **Capability family:** Ontology metadata read/write and IRI provisioning
- **Date updated:** 2026-08-09

## Rating Table

|ID|Function or package|Current level|Target level|Evidence|Blockers|Next action|Owner|Date updated|
|:---|:---|:---:|:---:|:---|:---|:---|:---|:---|
|MAT-001|Ontology metadata reader package|4|5|`readOntologyRecordsFromJsonLd` is implemented in `docs/app/shared/ontology-metadata` and `monorepo-staging/packages/ontology-metadata/src`; OntoEagle now imports it instead of local predicate tables; Jest covers JSON-LD object/graph forms and DCTERMS/DC/RDFS/OWL aliases.|Reader output still preserves OntoEagle catalog field names for app compatibility; full-IRI-keyed durable records remain a follow-up.|Add canonical full-IRI metadata record writer before wider repo rollout.|Codex|2026-08-10|
|MAT-002|Ontology metadata writer/settings package|4|5|`generateOntologySettings`, `normalizeOntologyMetadataRecord`, `createOntologySettingsViewFromMetadataRecord`, `writeOntologyMetadataQuads`, `appendOntologyMetadataQuads`, and `readOntologyMetadataRecordFromQuads` are promoted. TOM stores ontology metadata settings under `okea:OntologyMetadataProfile`, and TOM RDF export now appends ontology metadata through the shared writer instead of a local predicate loop.|TOM UI still consumes a view object until DOM fields are migrated.|Use the writer in additional generated ontology workflows as those apps expose ontology metadata input/defaults.|Codex|2026-08-10|
|MAT-003|IRI provisioning package|4|5|Opaque/readable IRI provisioning functions are promoted; TOM row creation/backfill paths now use `buildOpaqueOntologyIri`, `buildReadableOntologyIri`, `collectUsedOpaqueOntologyIriNumbers`, `findMaxOpaqueOntologyIriNumber`, and `findNextAvailableOpaqueOntologyIriNumber`; Jest covers collision and next-number cases.|Only TOM is wired so far; other apps have not adopted the package.|Survey other repos for IRI provisioning duplicates before rating canonical.|Codex|2026-08-10|
|MAT-004|Ontology import target package|4|5|`deriveOntologyImportTarget` is promoted; TOM imports it directly and the local fallback was deleted; Jest covers versionIRI-preferred and ontology-IRI fallback behavior.|Only TOM is wired so far.|Adopt in other ontology import workflows when found.|Codex|2026-08-10|
|MAT-005|OKEA metadata URL predicates|3|5|`has_git_repository_url` existed; issue tracker, ontology download, and QA report URL predicates were added to the source OKEA ontology repo and registered in namespace-registry.|Apps are not yet writing/reading those predicates as full-IRI metadata fields.|Use these predicates in the canonical metadata writer/reader record shape; remove local field-name semantics during app rewiring.|Codex|2026-08-10|
|MAT-006|Generated ontology metadata composition|3|5|Table-Nova's `buildOntologyDataset` now accepts optional `metadataRecord` and appends ontology metadata through `appendOntologyMetadataQuads`; Jest covers the opt-in metadata path.|Table-Nova UI/export does not yet auto-populate ontology metadata for generated TBox/combined output by default.|Decide Table-Nova's generated ontology IRI/default metadata policy before turning this on in the UI.|Codex|2026-08-10|

## Promotion Checklist

- [ ] Function name describes the action, not the source app or one current use case.
- [ ] Inputs and outputs are explicit and documented.
- [ ] Core logic is pure or mostly pure.
- [ ] DOM, storage, file, download, and vendor side effects are behind adapters.
- [ ] Error and warning behavior is predictable.
- [ ] Representative fixtures exist.
- [ ] Jest tests cover happy paths, edge cases, and known invalid inputs.
- [ ] Browser, worker, and Node assumptions are documented.
- [ ] Dependency and vendor provenance is documented.

## Notes

- Initial package promotion has started. OntoEagle, TOM, Table-Nova, and OCD are pilot consumers, but this is not canonical until duplicate deletion across intended consumers is complete.
- Table-Nova should be used as a writer/composition validation case before wider rollout: generated TBox and combined RDF need ontology declaration and metadata injection, while ABox-only output should remain unchanged by default.
- TOM now follows the durable storage rule for ontology metadata settings: the setting key is `okea:OntologyMetadataProfile`, and the setting value uses full IRI keys for ontology metadata and IRI policy. The current TOM DOM still receives an adapter view with legacy field names until the UI itself is migrated.
