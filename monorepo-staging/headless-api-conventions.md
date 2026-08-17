# Headless API Conventions

## Status

Accepted for the current headless standardization milestone. Decisions 1-8 from `headless-capability-migration-checklist.md` are accepted.

Canonicality rule:

The JavaScript API is the canonical capability contract. Browser apps are the canonical user product surface and must call the JavaScript API through adapters.

## Scope

These conventions apply to new or stabilized public package APIs created during the headless migration milestone. Existing mature function names should be preserved unless they are unclear, browser-coupled, too broad, or inconsistent with the roadmap naming conventions.

## Operation Result

Public headless operations SHOULD return this shape when an operation can produce expected failures, diagnostics, artifacts, or execution metadata:

```js
{
  ok,
  value,
  artifact,
  diagnostics,
  execution
}
```

Rules:

1. `ok` is a boolean.
2. `value` is the primary non-file return value.
3. `artifact` is present when the operation produces a file-like output.
4. `diagnostics` is an array of structured warnings, errors, or informational findings.
5. `execution` records operation metadata useful for CI, agents, and audit logs.

Small deterministic helpers MAY continue returning plain values when failure is not expected and no diagnostics are useful.

## Artifact Result

File-like outputs SHOULD use:

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

Rules:

1. `data` is `string`, `Uint8Array`, `ArrayBuffer`, or another documented runtime-neutral value.
2. `mediaType` uses the shared format registry.
3. `format` uses the shared format registry key or package-defined stable format key.
4. `encoding` is explicit for text outputs.
5. `suggestedFilename` is advisory; adapters decide whether and where to write/download.
6. `metadata` uses semantic full-IRI keys where the value is durable data.
7. `warnings` is preserved for compatibility but new code should prefer top-level `diagnostics`.

## Diagnostic

Diagnostics SHOULD use:

```js
{
  severity,
  code,
  message,
  source,
  location,
  details
}
```

Rules:

1. `severity` is one of `info`, `warning`, or `error`.
2. `code` is stable and machine-readable.
3. `message` is human-readable but not the only machine signal.
4. `location` may include line, column, row, columnName, IRI, graph IRI, or file-relative path.
5. `details` may include package-specific structured data.

## Error Policy

Expected operational failures SHOULD return `{ ok: false, diagnostics }` or `{ ok: false, error, diagnostics }`.

Throw only for:

1. Invalid programmer usage.
2. Missing required adapter/runtime dependency.
3. Impossible internal invariants.
4. Security-sensitive refusal conditions where continuing would be unsafe.

## Execution Metadata

Execution metadata SHOULD use:

```js
{
  operation,
  packageName,
  packageVersion,
  deterministic,
  startedAt,
  completedAt,
  durationMs
}
```

Dates should be injected by adapters or options when deterministic output matters.

## Adapter Rule

Adapters MAY read files, write files, touch the DOM, download artifacts, persist to IndexedDB/FSA, parse CLI args, or speak agent protocols.

Core APIs MUST NOT acquire input or present output. They receive data/options and return values/artifacts/diagnostics.

## Capability Manifest

Machine-readable manifests should eventually use:

```json
{
  "package": "@scope/package-name",
  "version": "0.0.0",
  "capabilities": [
    {
      "id": "family.operation",
      "label": "Human readable operation",
      "description": "Short description.",
      "deterministic": true,
      "inputs": [],
      "outputs": [],
      "jsApi": {
        "exportName": "functionName"
      },
      "adapters": {
        "browser": false,
        "cli": false,
        "ci": false,
        "agent": false
      }
    }
  ]
}
```

Manifests should stay lightweight. They are discovery aids for humans, CI, and agents, not a replacement for JSDoc, package tests, or full typed declarations.
