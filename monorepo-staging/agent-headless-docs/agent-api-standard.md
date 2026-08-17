# Agent API Standard

## Why This Is Not OpenAPI

OpenAPI is appropriate for networked HTTP services. The promoted OntoEagle capabilities are local ESM JavaScript modules, so documenting them as HTTP endpoints would add false structure.

Use this lighter standard instead:

- Markdown for human judgment.
- JSON manifest for discovery.
- Public `src/index.js` exports for executable entrypoints.
- Jest files as runnable examples.
- Future `.d.ts` or generated API docs may be added during distribution work, but they are not required for this milestone.

## Agent Selection Rules

1. Choose the package by capability, not by app name.
2. Import only from public `src/index.js` entrypoints in staging.
3. Prefer canonical full IRI data models where semantic records are durable.
4. Prefer explicit format/media type options from `format-registry`.
5. Keep browser, CLI, CI, and agent/tool protocol behavior outside core package calls.
6. Use package errors/diagnostics as machine signals. Do not parse human messages when stable codes are available.
7. For expected operational failures, prefer result objects when the package provides them.
8. For invalid programmer usage or missing adapters, expect thrown package-specific errors.

## Common Shapes

### Operation Result

```js
{
  ok,
  value,
  artifact,
  diagnostics,
  execution
}
```

Small deterministic helpers may return plain values.

### Artifact

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

### Diagnostic

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

## Import Rules

During monorepo staging:

```js
import { functionName } from '../monorepo-staging/packages/package-name/src/index.js';
```

Inside browser app mirrors:

```js
import { functionName } from './shared/package-name/index.js';
```

Do not import package internals unless you are changing the package itself.

## Validation Rules

An agent should validate a package before relying on it by checking:

1. `package-entrypoints.md` has a card for the package.
2. `package-manifest.json` contains the package id.
3. The package has `src/index.js`.
4. The package has at least one Jest file under `__tests__`.
5. The package-specific `headless-api-audit.md` exists where required by milestone 18.

