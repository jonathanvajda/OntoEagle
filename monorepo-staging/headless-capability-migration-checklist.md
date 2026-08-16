# Headless Capability Migration Checklist

## Goal

Each package SHALL expose a stable, headless programmatic API. Browser interfaces, CLI commands, CI integrations, and agent/tool interfaces SHALL be implemented as adapters over that API.

This checklist operationalizes `headless-architecture.md` and `deployment.md` for iterative migration across the existing capability families.

The API examples in `headless-architecture.md` are illustrative. They were written without direct inspection of the promoted functions already developed in this codebase. Actual public APIs must be derived from the mature package exports, the package maturity documents, and the roadmap naming conventions. Do not rename mature functions merely to match generic examples unless the existing name is unclear, browser-coupled, too broad, or inconsistent with the naming rules.

## Governing Rule

Core functions accept data and configuration and return data, diagnostics, or artifacts. They do not acquire input, present output, mutate UI, write storage, download files, or determine transport.

## Recommended Capability Families To Audit

- [x] MIME type/format/extension registry
- [x] Namespace prefix registry
- [x] Browser file/download utilities
- [x] Tabular parsing and serialization
- [x] RDF parsing and serialization
- [x] IndexedDB/project/graph/settings data management
- [x] Ontology-related utilities
- [x] Normalization utilities
- [x] SPARQL query pattern extraction
- [x] Ontology metadata read/write and IRI provisioning
- [x] SPARQL update pattern implementation
- [x] YAML, HTML, and print export
- [x] Toast notifications, logging/status/theme utilities
- [x] RDF visualization in Cytoscape
- [x] SPARQL visualization in Cytoscape

## Iterative Per-Package Checklist

Use this sequence for each capability family. Do not start browser, CLI, CI, or agent adapters until the stable JavaScript API contract is explicit.

### 1. Inventory Current Surface

- [ ] Identify public functions currently imported by apps.
- [ ] Identify internal helpers that should remain private.
- [ ] Identify DOM dependencies.
- [ ] Identify browser-global dependencies such as `window`, `document`, `File`, `Blob`, `URL`, `localStorage`, and `indexedDB`.
- [ ] Identify Node-specific dependencies such as `fs`, `path`, `process`, and command-line argument parsing.
- [ ] Identify vendor-library dependencies and whether they are injected, imported, or global.
- [ ] Identify side effects: storage writes, downloads, logging, DOM mutation, network requests, worker messages.
- [ ] Identify expected inputs, outputs, errors, warnings, and deterministic behavior.
- [ ] Identify current Jest fixtures and browser/manual validation cases.

### 2. Define The Stable Programmatic API

- [ ] Select a small supported export set.
- [ ] Name operations as domain capabilities, not UI actions.
- [ ] Prefer action-oriented names from the roadmap naming conventions.
- [ ] Document each API function with JSDoc.
- [ ] Mark internal helpers as non-public by omission from `index.js`.
- [ ] Decide whether each operation is deterministic, nondeterministic, or side-effecting through an adapter.
- [ ] Define package version discoverability.

### 3. Normalize Input Contracts

- [ ] Replace browser `File` inputs in core with `string`, `Uint8Array`, `ArrayBuffer`, RDF/JS quads, canonical quad rows, records, or plain objects.
- [ ] Make format, media type, filename, language, profile, namespace map, and policy options explicit.
- [ ] Keep UI checkbox/state interpretation in browser adapters.
- [ ] Keep filesystem path handling in Node/CLI adapters.
- [ ] Keep remote URL fetching outside deterministic core functions unless the capability is explicitly a fetch adapter.

### 4. Normalize Output Contracts

- [ ] Return data instead of downloading, displaying, logging, or writing it.
- [ ] Use a common artifact shape when an operation produces a file-like output.
- [ ] Use structured diagnostics for warnings and recoverable issues.
- [ ] Use structured errors or stable thrown error classes for unrecoverable failures.
- [ ] Include execution metadata when useful for CI or agent auditing.

Recommended artifact shape:

```js
{
  data,
  mediaType,
  format,
  encoding,
  suggestedFilename,
  metadata,
  warnings
}
```

Recommended operation result shape:

```js
{
  ok,
  value,
  artifact,
  diagnostics,
  execution
}
```

### 5. Isolate Side Effects Behind Adapters

- [ ] Browser adapter reads files, writes downloads, updates DOM, and renders status/toasts.
- [ ] IndexedDB adapter persists records and returns storage results.
- [ ] FSA adapter reads/writes local folders.
- [ ] Node adapter reads/writes filesystem data.
- [ ] CLI adapter parses args, maps process exit codes, reads stdin/files, and writes stdout/files.
- [ ] CI adapter wraps CLI or JavaScript API and applies failure thresholds.
- [ ] Agent/tool adapter maps JSON tool arguments to the JavaScript API.

### 6. Vendor Boundary Check

- [ ] Core imports environment-neutral vendor packages only when safe.
- [ ] Browser-only vendor globals are wrapped by explicit runtime adapters.
- [ ] Tests can inject mock vendor runtimes.
- [ ] Vendor failures become structured errors/diagnostics.
- [ ] Browser runtime does not require network CDN access when local vendor copies exist.

### 7. Headless Tests

- [ ] Node/Jest tests call the public JavaScript API without DOM.
- [ ] Deterministic transformations use fixture input and expected output.
- [ ] Error and diagnostic cases are tested.
- [ ] Browser adapter tests cover DOM/file/download behavior separately where practical.
- [ ] CLI tests cover args, stdin/file input, stdout/file output, and exit codes once CLI exists.
- [ ] CI examples are tested or at least documented with expected pass/fail behavior.

### 8. Browser Rewire

- [ ] Existing app UI calls the public package API through thin browser adapters.
- [ ] DOM handlers no longer contain parsing, serialization, validation, or transformation logic.
- [ ] Local duplicate functions are deleted after successful rewiring.
- [ ] Browser output uses returned artifacts and diagnostics.
- [ ] Local-native browser and static edge deployment still work from committed assets.

### 9. CLI Adapter

- [ ] Define command name and subcommands.
- [ ] Define accepted input sources: file path, stdin, inline text, or folder.
- [ ] Define output targets: file path, stdout, folder, or JSON report.
- [ ] Define JSON diagnostics output mode.
- [ ] Define exit code policy.
- [ ] Ensure CLI delegates all domain logic to the public JavaScript API.

### 10. CI Adapter

- [ ] Provide documented GitHub Actions examples.
- [ ] Provide deterministic fixture examples.
- [ ] Provide validation/report thresholds where relevant.
- [ ] Ensure CI can emit machine-readable diagnostics.
- [ ] Ensure CI never depends on browser UI behavior.

### 11. Agent/Tool Adapter

- [ ] Define machine-oriented tool names and descriptions.
- [ ] Define JSON argument schemas.
- [ ] Define JSON result schemas.
- [ ] Return structured diagnostics and artifacts.
- [ ] Avoid large inline payloads when artifact handles or file paths are more appropriate.
- [ ] Keep all semantic logic in the JavaScript API.

### 12. Documentation

- [ ] Package README describes purpose, install/use, supported formats, public API, compatibility, and examples.
- [ ] API reference is generated from or aligned with JSDoc.
- [ ] Integration guides exist for JavaScript, browser, CLI, CI, and agent/tool use where applicable.
- [ ] Interface matrix records JS API, Browser, CLI, CI, and Agent support.
- [ ] Breaking change policy is stated.

## Interface Matrix Template

| Capability | JS API | Browser | CLI | CI | Agent/Tool | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Parse/inspect |  |  |  |  |  |  |
| Validate |  |  |  |  |  |  |
| Convert/transform |  |  |  |  |  |  |
| Serialize/export |  |  |  |  |  |  |
| Diagnostics/report |  |  |  |  |  |  |

## Early Decision Gates

Settle these before running migrations across all packages.

Decision status:

- [x] Decision 1 accepted: keep adapters inside each package initially.
- [x] Decision 2 accepted: standardize a shared operation result convention for new headless APIs.
- [x] Decision 3 accepted: return result objects for expected failures and throw only for programmer/configuration errors.
- [x] Decision 4 accepted: adopt the shared artifact shape for file-like outputs.
- [x] Decision 5 accepted: add CLIs only where practical automation value is clear.
- [x] Decision 6 accepted: defer protocol-specific package adapters in favor of a later aggregate agent/tool adapter.
- [x] Decision 7 accepted: define the capability manifest schema now, populate manifests after initial migrations stabilize it.
- [x] Decision 8 accepted: JavaScript API is the canonical capability contract; browser app is the canonical user product surface.

### Decision 1: Package Layout

Options:

1. Keep adapters inside each package under `src/adapters`.
2. Split adapters into sibling packages such as `rdf-io-cli`, `rdf-io-browser`, and `rdf-io-agent`.

Recommendation:

Start with adapters inside each package while the monorepo is still stabilizing. Move to sibling packages only when adapter dependencies become heavy or environment leakage becomes hard to control.

Status: accepted.

### Decision 2: Result Object Standard

Options:

1. Use current per-package result shapes.
2. Standardize a single `ok/value/artifact/diagnostics/execution` result convention.

Recommendation:

Standardize now for new headless APIs. Preserve existing app-facing shapes only in browser compatibility adapters while migrating.

Status: accepted.

### Decision 3: Error Model

Options:

1. Return `{ ok: false, error }` for expected operational failures and throw only for programmer errors.
2. Throw stable custom errors for all failures.
3. Keep existing mixed behavior.

Recommendation:

Use result objects for expected parse/validation/conversion failures. Throw only for invalid programmer usage, missing required adapters, or impossible invariants.

Status: accepted.

### Decision 4: Artifact Shape

Options:

1. Adopt the artifact shape in this checklist.
2. Keep specialized output contracts per package.

Recommendation:

Adopt the shared artifact shape for all file-like outputs. It will make browser downloads, CLI writes, CI artifacts, and agent/tool responses consistent.

Status: accepted.

### Decision 5: CLI Scope

Options:

1. Add CLIs for every package.
2. Add CLIs only for packages with practical automation value.

Recommendation:

Start with RDF IO, tabular IO, ontology metadata, SPARQL utils, report export, and data-management validation. Defer CLI for UI-feedback and visualization until there is a clear headless rendering/export use case.

Status: accepted.

### Decision 6: Agent/Tool Adapter Scope

Options:

1. Add MCP/tool adapters package-by-package.
2. Create one aggregate agent adapter that imports selected package APIs.

Recommendation:

Create one aggregate agent adapter later. It can expose coherent cross-package workflows without forcing every package to own protocol-specific code.

Status: accepted.

### Decision 7: Capability Manifest Timing

Options:

1. Create machine-readable manifests now.
2. Add manifests after JavaScript API and CLI contracts stabilize.

Recommendation:

Define the manifest schema now, but populate manifests after the first two or three package migrations prove the fields are stable.

Status: accepted.

### Decision 8: Browser Canonicality

Constraint:

`deployment.md` says browser/edge remains the canonical product surface, but `headless-architecture.md` says JavaScript API is the canonical capability interface.

Recommendation:

Treat the browser app as the canonical user product and the JavaScript API as the canonical capability contract. This resolves the apparent tension: users meet the browser first, but all durable behavior is implemented through package APIs.

Status: accepted. JavaScript API is the canonical capability contract. Browser app is the canonical user product surface and remains the primary deployed user surface under `deployment.md`.

## Recommended First Migration Order

1. Format registry: low side effects, already close to headless.
2. Namespace registry: low side effects, establishes API/export conventions.
3. Normalization utilities: deterministic and easy to verify.
4. Browser file IO: useful adapter boundary test because it is intentionally browser-facing.
5. RDF IO: validates artifact/result/diagnostic conventions.
6. Tabular IO: validates text/binary input boundaries.
7. Report export: validates artifact output conventions.
8. SPARQL utils: validates parser-runtime injection and diagnostics.
9. Ontology metadata: validates semantic full-IRI data contracts.
10. IndexedDB data management: validates side-effect boundaries.
11. Visualization: validates read-only renderer adapter boundaries.

## Done Definition For A Capability Family

- [ ] Stable programmatic API is documented.
- [ ] Core is free of required DOM access.
- [ ] Core is free of implicit storage, filesystem, and download side effects.
- [ ] Inputs are explicit and runtime-neutral where feasible.
- [ ] Outputs are returned as values, artifacts, diagnostics, or execution metadata.
- [ ] Expected failures are structured.
- [ ] Public exports are intentionally small.
- [ ] Headless Jest tests exercise the public API.
- [ ] Browser adapters use the public API.
- [ ] Local duplicate code is deleted after rewiring.
- [ ] Interface matrix is populated.
- [ ] Deployment constraints remain satisfied for local-native browser and static edge hosting.
