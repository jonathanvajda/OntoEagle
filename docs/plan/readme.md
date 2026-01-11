# A4. IndexedDB schema (MVP + stretch-compatible)

## Object stores:
* settings (key: "active") → SearchOptions + UI prefs
* datasets (key: datasetId)
  * builtin dataset: {datasetId:'builtin', fingerprint, enabled:true, updatedAt}
* documents (key: ${datasetId}::${iri}) → OntologyDocument
* index (key: token) → postings like [{ key:'datasetId::iri', freq, fieldsMask }]

This supports the stretch goal (user datasets) without changing the core model later.

# A5. Matching modes
* Exact: token must match field exactly (normalized)
* Wildcard: token contained within field string (normalized)
* Phrase: quoted strings treated as a single token (“act of location change”)

# A6. Scoring weights (initial, simple, tunable)
For each query token:

## Exact matches
* exact IRI match: +120
* exact label match: +100
* exact altLabel match: +70

## Contains / wildcard
* label contains token: +40
* IRI contains token: +25
* altLabel contains token: +20
* definition contains token (if enabled): +10
* citations/examples/clarifications contains token (if enabled): +5

## Tie-breakers
1. Higher score
2. More distinct tokens matched
3. Prefer label hits over definition-only hits
4. Shorter label (slight preference)
5. Alphabetical by label as final stable sort

# A7. Filters (applied before scoring or after candidate generation)
* element types filter
* namespaces filter (prefix or namespace IRI)
* include/exclude fields (definition/citation/examples/clarifications)