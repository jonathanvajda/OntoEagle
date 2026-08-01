# Tabular Ontology Maker IndexedDB Migration Plan

## Scope

- **Source app:** Tabular Ontology Maker (`D:\GitHub\tabular-ontology-maker`)
- **Capability family:** IndexedDB and app data management
- **Status:** Planning documentation only. No app code should be rewired from this file alone.
- **Target package:** `@ontoeagle/indexeddb-data-management`

This plan moves TOM from a single app-local session database to the shared project portfolio model while preserving existing user sessions long enough for export or migration.

## Current Legacy Storage

|Legacy DB|Legacy store|Legacy purpose|Observed shape|Primary callers|
|:---|:---|:---|:---|:---|
|`TabularOntologyDB`|`rdfStore`|Saved generated RDF output.|Auto-increment records containing serialized RDF output and timestamps.|`saveRDFtoIndexedDB()`, `loadLatestFromIndexedDB()`|
|`TabularOntologyDB`|`workspaceStore`|Saved TOM workspace snapshot.|Auto-increment records containing table state, predicate registry, axiom state, and timestamps.|`buildWorkspaceSnapshot()`, `applyWorkspaceSnapshot()`, `loadLatestFromIndexedDB()`|
|`TabularOntologyDB`|`ontologySettingsStore`|Single ontology/project settings object.|Singleton key `ontologySettings` with settings payload and timestamp.|`settingsLoad()`, `saveOntologySettings()`, settings modal|

Important current behavior to preserve:

- TOM feels like a single active ontology project.
- On load, TOM restores the latest workspace snapshot when present.
- If no workspace snapshot is available, TOM can fall back to the latest saved RDF record.
- Ontology metadata, prefixes, imports, and related settings are part of the user's project state.
- The UI/grid state is central to TOM and should not be treated as a generic storage concern.

## Target Storage Model

|TOM concept|Target record/store|Target role|
|:---|:---|:---|
|Single active TOM project|`ProjectRecord` in `projects`|Default project initially; named project later|
|Uploaded tabular source|`ArtifactRecord` in `artifacts`|`artifactKind: 'ontology-table'`, `role: 'source'`|
|Normalized working table/session|`ArtifactRecord` in `artifacts`|`artifactKind: 'ontology-table'`, `role: 'staged'`|
|Generated ontology RDF|`ArtifactRecord` in `artifacts`|`artifactKind: 'ontology-rdf'`, `role: 'generated'` or `transformed`|
|Generated RDF graph rows, when materialized|`GraphRecord` plus `QuadRow` records|`role: 'generated'`|
|Ontology settings object|`SettingRecord` in `settings`|Scope `project:<projectId>`, key `ontologySettings`|
|Save/export/generation event|`RunRecord` in `runs`|`runKind: 'ontology-generation'` or `export`|

TOM should initially remain a single-project app. The shared package should provide the storage substrate; TOM should continue to own the ontology table model, grid rendering, settings modal, and RDF generation UI.

## Migration Mapping

|Legacy data|Target conversion|Target write|
|:---|:---|:---|
|Latest `workspaceStore` snapshot|Normalize as TOM-owned project snapshot payload|`artifactStore.storeProjectArtifact()` with `artifactKind: 'tom-workspace-snapshot'`, `role: 'staged'`|
|All `workspaceStore` snapshots, if retained|Store as historical staged artifacts or run payloads|Prefer latest-only for initial migration unless user requests history|
|Latest `rdfStore` record|Store serialized RDF as artifact payload|`artifactKind: 'ontology-rdf'`, `role: 'generated'`|
|Generated RDF parsed into triples/quads|Optional materialization through `rdf-io` then `storeGraphQuadRows()`|Only after parse success; do not block restoring TOM UI|
|`ontologySettingsStore.ontologySettings`|`normalizeSettingRecord({ scope: projectId, key: 'ontologySettings', value })`|`settingsStore.storeSettingRecord()`|

## Migration Workflow

1. On TOM startup, open the shared project portfolio database and ensure the default project exists.
2. Inspect `TabularOntologyDB` with `inspectLegacyIndexedDbDatabase()`.
3. If no legacy stores contain rows, use shared project storage silently.
4. If legacy rows are present, show a migration/export panel before replacing the old restore path.
5. Read `rdfStore`, `workspaceStore`, and `ontologySettingsStore`.
6. Prefer the latest valid workspace snapshot as the primary migrated artifact.
7. Preserve latest generated RDF as a separate generated ontology artifact.
8. Preserve ontology settings as project-scoped settings.
9. Validate the migrated project by restoring the snapshot into TOM's existing UI state.
10. Delete `TabularOntologyDB` only after explicit user confirmation.

## Required App Changes

|File|Change|
|:---|:---|
|`docs/app/tom-core.js`|Remove direct `indexedDB.open('TabularOntologyDB')` persistence once the migration path is validated. Use shared project/artifact/settings stores instead.|
|`docs/app/tom-core.js`|Keep TOM-specific pure functions such as workspace snapshot normalization and UI application in TOM unless/until they prove useful across apps.|
|`docs/app/tom-core.js`|Replace `settingsLoad()`/`saveOntologySettings()` storage internals with `readSettingValue()`/`writeSettingValue()` or full setting records.|
|`docs/app/tom-core.js`|Replace `saveRDFtoIndexedDB()` with a TOM-named save operation that writes project artifacts and optional graph rows through shared package stores.|
|Tests|Add memory-adapter or mock IndexedDB tests for TOM snapshot persistence, settings persistence, generated RDF artifact persistence, and legacy migration.|

## Function Naming Targets

App-local names should describe TOM operations; shared package calls should use canonical names.

|Current local name|Target shared function or app-level replacement|
|:---|:---|
|`ensureDb`|`openProjectPortfolioDatabase()` plus `createProjectPortfolioStores()`|
|`settingsLoad`|`settingsStore.readSettingValue('ontologySettings', defaultValue)`|
|`saveOntologySettings`|`settingsStore.writeSettingValue('ontologySettings', settings)`|
|`hasPriorSavedSession`|Migration-specific legacy inspection plus shared artifact listing|
|`saveRDFtoIndexedDB`|App-level `storeTomWorkspaceProjectState()` using artifact/settings/graph stores|
|`loadLatestFromIndexedDB`|App-level `restoreLatestTomProjectState()` using artifact/settings stores|
|`getLatestSavedRecord`|Shared artifact/run listing with explicit sort and filtering|

## Validation Plan

Minimum Jest coverage before rewiring:

- A legacy TOM settings row becomes a project-scoped `SettingRecord`.
- A legacy workspace snapshot becomes a staged TOM workspace artifact.
- A legacy RDF record becomes a generated ontology RDF artifact with media type and extension preserved.
- Latest snapshot selection is deterministic when multiple snapshots exist.
- Invalid or partial legacy snapshots produce warnings and do not overwrite valid project data.
- Restoring migrated settings preserves ontology IRI, prefixes, imports, and metadata.
- Generated RDF can optionally be parsed and materialized as graph rows without changing the canonical serialized artifact.

Manual browser validation before old DB deletion:

- Load a browser with existing TOM saved session data.
- Migrate into the default project.
- Reload TOM and confirm the table/grid state is restored.
- Open ontology settings and confirm metadata, prefixes, and imports survived.
- Generate RDF and confirm export output is unchanged or documented where different.
- Save again and confirm no new writes go to `TabularOntologyDB`.
- Export the project archive and verify `project-manifest.json`.

## Risks And Open Decisions

- TOM's workspace snapshot is UI-rich and app-specific. It should not be promoted prematurely as a generic project snapshot unless another app needs the same shape.
- Storing every historical workspace snapshot may create clutter. Initial migration should preserve the latest valid snapshot plus latest generated RDF. Historical snapshot preservation can be added as an advanced import option.
- Generated RDF should remain a serialized ontology artifact even if also materialized into `quadRows`. This avoids making RDF parser success a prerequisite for restoring TOM's working table.
- TOM-specific artifact kinds should be added to the package vocabulary before migration: `ontology-table`, `tom-workspace-snapshot`, and `ontology-rdf`.

## Success Criteria

- TOM starts from shared project storage after migration.
- Existing user sessions can be migrated or exported before old data is deleted.
- Ontology settings are stored as scoped project settings.
- Generated ontology RDF is stored as a project artifact and can be downloaded through shared file/export utilities.
- App-local persistence code is removed after tests and manual validation prove the shared stores cover the old inputs and outputs.
