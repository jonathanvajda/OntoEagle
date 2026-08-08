# Normalization Utils Deep Comparison

## Capability Family

Normalization utilities: word splitting, case conversion, label/key/slug normalization, date parts, timestamp formatting, and filename timestamp composition.

This document supplements `normalization-utils.md` without replacing it.

## Recommendation

Yes, the core functions in `normalization-utils.md` should be promoted to a shared package. The strongest promotion target is a new package:

`packages/normalization-utils`

The package should provide generic, domain-neutral normalization primitives. App-specific functions should then compose those primitives rather than reimplementing their own regexes.

## Proposed Promoted Function Set

| Proposed function | Promote? | Notes |
|---|---:|---|
| `splitStringToWords(value)` | Yes | Canonical tokenizer for case conversion and identifier generation. Should preserve acronym runs as proposed: `HTTPRequest -> ["HTTP", "Request"]`. |
| `normalizeStringToFlatCase(value)` | Yes | Generic case conversion. |
| `normalizeStringToUpperFlatCase(value)` | Yes | Generic case conversion. |
| `normalizeStringToCamelCase(value)` | Yes | Replaces TOM `toCamelCase`; useful for generated object/property local names. |
| `normalizeStringToPascalCase(value)` | Yes | Replaces TOM and Ontology Tabulator `toPascalCase`; useful for ontology names and file stems. |
| `normalizeStringToSnakeCase(value)` | Yes | Replaces TOM `toSnakeCase`; useful for stable keys and some local names. |
| `normalizeStringToShoutingSnakeCase(value)` | Yes | Generic case conversion. |
| `normalizeStringToKebabCase(value)` | Yes | Replaces many `slugify` variants when hyphenated output is wanted. |
| `normalizeStringToTrainCase(value)` | Yes | Include now even if not yet used. It is coherent with the case-family API. |
| `normalizeStringToCobolCase(value)` | Yes | Include now even if not yet used. It avoids future one-off implementation. |
| `getCurrentDateParts(date)` | Yes, with name revision | Prefer `getLocalDateParts(date)` because it uses local time, not UTC. Add `getUtcDateParts(date)` if UTC filenames/graph IRIs are needed. |
| `isValidOntology(content)` | No | Already covered by `ontology-utils` as `classifyOntologyInput({ text }).isOntologyCandidate`; do not reintroduce a wrapper. |

## Naming Notes

The normalized names in `normalization-utils.md` mostly fit the roadmap because they describe action and output.

Recommended tweaks:

- Keep `normalizeStringTo...Case` for case conversion.
- Use `splitStringToWords`, not `tokenizeWords`, for the generic primitive. `tokenize` is already overloaded by search/NLP code.
- Use `getLocalDateParts` rather than `getCurrentDateParts`, because callers may pass a date and because timezone behavior matters.
- Add `getUtcDateParts` if the output is for stable graph IRIs or cross-timezone run IDs.
- Add filename timestamp helpers separately from case helpers, because they have a browser/file export contract.

## Inventory By Repo

| Candidate | Source app | File | Current contract | Overlap | Maturity |
|---|---|---|---|---|---:|
| `normalizeText` | OntoEagle | `docs/app/normalize.js` | Lowercase search text, normalize smart quotes, keep ontology-friendly symbols, collapse whitespace. | Related but not a case-conversion primitive. Should remain search-oriented or move to `search-utils`. | 4 |
| `tokenizeForIndex` / `tokenizeQuery` / `normalizeQuery` | OntoEagle | `docs/app/normalize.js` | Search index/query tokenization with quote handling. | Not a replacement for `splitStringToWords`; different punctuation policy. | 4 |
| `createSafeFilenameBase` / `stripFileExtension` / `normalizeFileExtension` | Shared browser file IO | `docs/app/shared/browser-file-io/filename-utils.js` | Browser download filename helpers. | Related; should remain in browser-file-io but can use normalization primitives internally. | 5 |
| `normalizeIdPart` | Shared indexedDB data management | `docs/app/shared/indexeddb-data-management/id-generation.js` | Lowercase hyphen slug for stable record IDs, max 80 chars. | Related to kebab-case but has ID-specific truncation/fallback rules. Keep local or compose `normalizeStringToKebabCase`. | 4 |
| `toCamelCase` / `toPascalCase` / `toSnakeCase` | TOM | `docs/app/tom-core-utils.js` | Simple regex case conversion for ontology settings and IRI local names. | Direct replacement by proposed functions. | 4 |
| `toCamelCase` / `toPascalCase` / `toSnakeCase` wrappers | TOM | `docs/app/tom-core.js` | Compatibility wrappers over `CoreUtils`. | Should be deleted during rewiring. | 2 |
| `fromLabelWithCase` | TOM | `docs/app/tom-core.js` | Selects case conversion based on UI option. | Should become `normalizeStringToCase(value, caseStyle)` or local UI adapter over promoted functions. | 3 |
| `slugify` | TOM | `docs/app/tom-grid-glide.js` | Lowercase underscore slug, fallback `column`. | Related to snake-case, but output is column-field-specific. Could compose `normalizeStringToSnakeCase`. | 3 |
| `slugify` | Table Nova | `docs/app/rdf/schema.js` | Lowercase hyphen slug, dots become separators, fallback `file`. | Mostly `normalizeStringToKebabCase`, with dot behavior compatible with proposed splitter. | 4 |
| `splitHeaderTokens` | Table Nova | `docs/app/rdf/schema.js` | Splits human/snake/shout/kebab/camel/Pascal headers into normalized tokens. | Strongest existing implementation; should inform `splitStringToWords`. | 5 |
| `detectHeaderStyle` | Table Nova | `docs/app/rdf/schema.js` | Detects human, snake, shouting snake, shout, camel, Pascal. | Should be promoted or added as a second function in normalization-utils. Extend to flatcase, upperflatcase, kebab-case, Train-Case, COBOL-CASE. | 4 |
| `buildPredicateLocalNameFromTokens` | Table Nova | `docs/app/rdf/schema.js` | Builds RDF predicate local names with optional `has` prefix and casing. | Domain-specific. Should stay in RDF/schema logic but call promoted case functions. | 4 |
| `buildHumanLabel` / `capitalize` | Table Nova | `docs/app/rdf/schema.js` | Display label from tokens. | Generic enough for promotion as `normalizeStringToTitleCase` or `buildLabelFromWords`, but less urgent. | 3 |
| `toPascalCase` | Ontology Tabulator | `docs/app/core.js` | Converts free-text name to PascalCase for CSV/print filenames, fallback `Ontology`, with logging. | Direct replacement plus local fallback policy. | 3 |
| `normalizeTokenForNlpQaLexicon` | OCM | `docs/app/nlp-qa-model.js` | NLP lexicon normalization; strips punctuation and lowercases for spell/grammar QA. | Related but domain-specific. Should not be merged with case conversion. | 4 |
| `safeFilePart` / `getTimestampForFileName` | OCM | `docs/app/main.js` | File export naming and timestamp composition. | Should be inventoried for a filename timestamp helper in browser-file-io or normalization-utils. | 3 |
| `slugifyStepLabel` | Axiolotl | `public/app/playbook-builder-main.js` | Converts playbook step labels to slug-ish IDs. | Likely compose `normalizeStringToKebabCase` or `normalizeStringToSnakeCase` after inspection during rewiring. | 3 |
| `normalizeHeader` | Shared tabular IO | `docs/app/shared/tabular-io/iri-mapping.js`, `query-records.js` | Header matching normalization. | Related, but tabular matching has its own equivalence rules. Could compose `splitStringToWords`. | 4 |
| `normalizeToken` | Shared format registry | `docs/app/shared/format-registry/mime-registry.js` | Lowercase trim for MIME aliases. | Too narrow; leave in format-registry. | 5 |

## Deep Comparison

### Naming

Existing names are inconsistent:

- TOM uses short names: `toCamelCase`, `toPascalCase`, `toSnakeCase`.
- Table Nova uses more descriptive names: `splitHeaderTokens`, `buildPredicateLocalNameFromTokens`, `detectHeaderStyle`.
- Shared package internals use generic but overloaded names like `normalizeToken`.
- OCM uses domain names such as `normalizeTokenForNlpQaLexicon`.

Recommended promoted convention:

- `splitStringToWords(value)`
- `normalizeStringToCamelCase(value)`
- `normalizeStringToPascalCase(value)`
- `normalizeStringToSnakeCase(value)`
- `normalizeStringToKebabCase(value)`
- `normalizeStringToCase(value, caseStyle)`
- `detectStringCaseStyle(value)`
- `getLocalDateParts(date)`
- `getUtcDateParts(date)`
- `formatDatePartsForFilename(dateParts)`
- `appendTimestampToFilename(fileName, options)`
- `normalizeStringToAsciiSlug(value, options)`

### Inputs

Current inputs are usually permissive and accept `null`, `undefined`, numbers, and strings by coercion.

Recommended contract:

- Accept `unknown`.
- Coerce with `String(value ?? '')`.
- Return empty string or empty array for empty input.
- Do not throw for ordinary coercion failures.
- Throw only for invalid options, such as unknown case style when `strict: true`.

### Outputs

Case functions should return strings.

`splitStringToWords` should return an array of original-ish word segments preserving acronym case. Case functions then choose lower/title/upper behavior.

Storage slug functions should not split camel/acronym boundaries. This is a
separate contract from case conversion: `2026-07-29T12:00:00.000Z` should become
`2026-07-29t12-00-00-000z`, not `2026-07-29-t12-00-00-000-z`.

Date functions should return plain objects:

```js
{ year: '2026', month: '08', day: '08' }
```

Returning strings for year/month/day avoids inconsistent downstream padding.

### Error Handling

Current functions generally do not throw. This is appropriate for normalization.

Recommended model:

- Pure functions return deterministic fallback values.
- No logging.
- No DOM.
- No IndexedDB.
- Optional strict mode for unsupported case-style values.

### Logging

Ontology Tabulator wraps normalization in `logEvent`/`logError`. That should not be promoted. Normalization utilities should be pure and silent.

Apps can log around the call if needed.

### Side Effects

None should be allowed.

### Environment Assumptions

Browser and Node safe. No DOM. No vendor dependency.

### Unicode

The draft currently uses ASCII regex ranges. That matches most current app behavior, but OntoEagle search already uses Unicode property escapes.

Recommendation:

- Start with ASCII-safe semantics for case/identifier generation because ontology local names and filenames often need conservative output.
- Add an explicit option later if Unicode word preservation is needed: `{ unicode: true }`.

### Acronyms

Table Nova already has a `SIMPLE_ACRONYMS` list for labels. The proposed `splitStringToWords` preserves acronym segments, which is useful.

Recommendation:

- Keep acronym preservation in splitting.
- Do not add app-specific acronym dictionaries to the generic package yet.
- Let apps maintain display-specific acronym maps if they need them.

## Proposed Package Structure

```text
packages/normalization-utils/
  README.md
  inventory.md
  maturity.md
  promoted-function-proposal.md
  src/
    case-conversion.js
    date-parts.js
    filename-timestamps.js
    index.js
  __tests__/
    case-conversion.test.js
    date-parts.test.js
    filename-timestamps.test.js
```

Mirrored app path:

```text
docs/app/shared/normalization-utils/
```

## Rewiring Plan

1. Promote case conversion and word splitting first.
2. Rewire TOM `tom-core-utils.js` and `tom-core.js`.
3. Rewire Table Nova `schema.js` to use `splitStringToWords` and promoted case conversion while keeping predicate-local-name functions local.
4. Rewire Ontology Tabulator `toPascalCase`.
5. Rewire Axiolotl `slugifyStepLabel`.
6. Review OCM filename timestamp functions and decide whether timestamp helpers belong in `normalization-utils` or `browser-file-io`.
7. Leave OntoEagle search normalization, OCM NLP normalization, MIME alias normalization, and RDF term normalization in their current packages unless a later capability cycle targets search/NLP/token matching.

## Regression Tests To Preserve

Use the Jest cases already drafted in `normalization-utils.md`, plus app-derived cases:

- TOM:
  - `"Example Ontology" -> "exampleOntology"`
  - `"example ontology" -> "ExampleOntology"`
  - `"Example Ontology Value" -> "example_ontology_value"`
- Table Nova:
  - `"HTTP Response Code"`, `"HTTPRequest"`, `"XMLHttpRequest"`
  - `"customer_id"`, `"CUSTOMER_ID"`, `"customer-id"`, `"customerId"`, `"CustomerId"`
  - predicate-local-name casing with and without `has` prefix should remain covered in Table Nova tests.
- Ontology Tabulator:
  - null/empty input fallback should remain app-local unless promoted options include a fallback parameter.
- Axiolotl:
  - playbook labels should keep deterministic slug output.

## Open Decisions

1. Should the package use only ASCII-safe word detection initially?
2. Should `normalizeStringToCase(value, caseStyle)` throw on unknown style or default to `camelCase`/`PascalCase`?
3. Should filename timestamp helpers live here or in `browser-file-io`?
4. Should `detectStringCaseStyle` be included in this cycle, or deferred until Table Nova rewiring?
5. Should `getCurrentDateParts` be replaced by both `getLocalDateParts` and `getUtcDateParts` immediately?

## Bottom Line

Promote the case conversion and word splitting functions. Do not promote `isValidOntology` into this package. Keep domain-specific normalization in its owning package, but rewire it to compose shared primitives where that reduces duplicate regex logic.
