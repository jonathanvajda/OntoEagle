# Semantic Data Modeling Constraint

## Purpose

This project intentionally rejects the common software practice of defining persisted data properties only inside local application code.

The goal of the monorepo migration is not only code reuse. It is semantic reuse: shared JavaScript packages should produce and consume data that uses the same reusable ontology-backed model across apps.

## Core Rule

Any persisted, exchanged, exported, imported, indexed, queried, or semantically meaningful data field must use a shared ontology-backed term.

Do not create local JavaScript-only data properties for app data unless the value is purely transient UI state and is not part of a persisted or exchanged model.

## Applies To

This rule applies to:

- IndexedDB records
- JSON-LD records
- RDF triples or quads
- project manifests
- import/export payloads
- app settings that persist across sessions
- artifact metadata
- run metadata
- graph metadata
- namespace/prefix profiles
- data passed between shared packages
- data expected to be reused across apps

This rule does not apply to:

- local variable names
- private function parameters
- DOM element IDs
- temporary UI state that is never persisted or exported
- implementation-only control flags that never become data

## Required Decision Path

Before adding a data property, class, artifact kind, role, or record key, follow this sequence:

1. Reuse an existing external ontology term if it fits.

   Prefer established vocabularies such as `rdf`, `rdfs`, `xsd`, `skos`, `dcterms`, `bfo`, `cco2`, `cceo`, or other approved shared vocabularies.

2. Reuse an existing project ontology term if available.

   If OKEA already defines the class or property, use that term through the namespace registry.

3. If no existing term fits, make an explicit ontology modeling decision.

   Do not silently invent a local JavaScript property. Decide whether a new OKEA term or another ontology extension is warranted.

4. Add the approved term to the shared namespace registry.

   Application code should reference the term through full-IRI registry helpers such as `COMMON_NAMESPACE_IRIS` or `iriForNamespaceId`. CURIE compaction belongs in serialization or display code, not in canonical data model construction.

5. Use the registry-backed term in application code.

   Local string constants are acceptable only as aliases derived from the registry, not as independent vocabulary definitions.

## Anti-Patterns

Avoid:

```js
const PROJECT_LABEL = 'projectLabel';
const RUN_KIND = 'runKind';
const ARTIFACT = 'okea:artifact';
const CREATED_AT = 'createdAt';
```

Prefer full IRIs:

```js
[COMMON_NAMESPACE_IRIS.dcterms.title]
[COMMON_NAMESPACE_IRIS.okea.artifactKind]
[COMMON_NAMESPACE_IRIS.rdf.value]
```

## Why This Constraint Exists

Local data models are fast to create, but they produce isolated data.

That causes three failures this project is explicitly trying to avoid:

1. The same concept gets defined repeatedly in different apps.
2. Reusable functions cannot safely share inputs and outputs.
3. Data from one app requires mappings before another app can use it.

This project assumes that carefully modeled ontology terms can and should support cross-domain reuse. That is an intentional architectural decision.

## Expected Developer Behavior

When adding or changing code:

- Treat local data-property strings as suspect by default.
- Check the namespace registry before defining any persisted or exchanged key.
- Promote reusable terms deliberately instead of creating app-local vocabulary.
- Prefer ontology-backed JSON-LD/RDF keys over ad hoc object keys for durable data.
- Preserve semantic interoperability even when local code would be simpler.
- Document any new modeling decision before using the term broadly.

## Review Checklist

For any new persisted or exchanged data field, reviewers should ask:

- Is this field backed by an ontology term?
- Is the term reused from an established vocabulary where possible?
- If it is an OKEA term, has that modeling decision been made explicitly?
- Is the term present in the shared namespace registry?
- Does the code use registry APIs instead of hard-coded vocabulary strings?
- Will another app be able to consume this data without creating a custom mapping?

If the answer to any of these is no, the change should be revised before promotion.
