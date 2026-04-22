# OntoEagle Search, Import, and Slim Builder Progress

## Search Weighting

- [x] Exact label/IRI/alt-label matches are boosted during normal wildcard search.
- [x] Unquoted multi-word label queries receive a full-phrase boost.
- [x] Exact-only mode remains available as a hard matching mode.
- [x] Search tests cover exact boosts and exact-only behavior.

## Taxonomy Details

- [x] Extract direct named-IRI hierarchy links from `rdfs:subClassOf`, `skos:broader`, and inverse `skos:narrower`.
- [x] Derive child links during document extraction.
- [x] Render parent/sibling/focus/child mini-tree in the details card.

## Namespace Filtering

- [x] Add shared namespace/prefix normalization helpers.
- [x] Accept common prefixes, namespace IRIs, and full resource IRIs consistently.
- [x] Add namespace filter tests.

## Styling

- [x] Fix Save settings button color in dark mode.

## User Ontology Management

- [x] Add strict dataset metadata/document separation in IndexedDB.
- [x] Add user ontology upload/list/enable/remove UI.
- [x] Support common RDF upload formats through browser parser libraries.
- [x] Display `added by user` pills.

## Slim Builder

- [x] Add seed import/paste support.
- [x] Add deterministic slim term expansion.
- [x] Export generated slims as Turtle and JSON-LD.
- [x] Run SCO and SPO together with independent minimal/maximal settings.
- [x] Limit maximal expansion to named IRIs reached through `rdfs:subClassOf`/`rdfs:subPropertyOf` blank-node axiom paths.
- [x] Preserve traversed blank-node axiom shapes in slim JSON-LD/Turtle output.

## Verification

- [x] Run `npm test`.
- [ ] Perform browser smoke checks for search, details tree, user imports, and slim exports.
