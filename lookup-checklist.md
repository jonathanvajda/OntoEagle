# Feature checklist by stage

## Stage A — Plan + skeleton
- [X] Define Document schema + search options schema
- [X] Define relevance model (label weight > exact IRI > altLabel > definition)
- [X] Repo layout + tooling: node, jest, eslint (optional), prettier (optional)

## Stage B — CI dataset build (Python)

- [X] Read all ontology files from a folder
- [X] Parse with RDFLib (format guessed)
- [X] Merge into one graph
- [X] Serialize JSON-LD (and optionally N-Quads)
- [ ] (optional) Generate index.json in CI for faster first-load

Stage C — Wireframed HTML (semantic + accessible)

- [X] Search bar + options panel
- [X] Results list (cards) + details panel
- [ ] Keyboard navigation + ARIA for live results

Stage D — GitHub Actions deploy static site + data files
- [X] Build step runs python scripts to produce data artifacts
- [X] Test step runs Jest
- [X] Deploy step publishes /app + /data

## Stage E — Pure JS core + Jest
- [X] Parse/load dataset
- [X] Extract Document[]
- [X] Build / load index
- [X] Implement search(query, options) → ranked results
- [X] Unit tests for each pure function

## Stage F — Add service worker + IndexedDB
- [ ] Precache app shell + dataset
- [ ] Store settings in IDB
- [ ] Store index/docs in IDB for offline + fast subsequent loads

## Stage G — Polish CSS (Skeleton + scoped, muted cool palette)
- [ ] app- prefixed classes only
- [ ] WCAG contrast checks
- [ ] Reduced-motion support

## Stage H — Admin dashboard (coverage)
- [ ] Jest coverage artifact + static HTML report in deploy

## Stage I — User-supplied graphs (stretch)
- [ ] Import TTL/OWL/RDF/XML/JSON-LD in browser
- [ ] Convert to docs/index and merge into IDB dataset registry
- [ ] Toggle datasets included in search