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
- [X] Precache app shell + dataset
- [X] Store settings in IDB
- [X] Store index/docs in IDB for offline + fast subsequent loads

## Stage G — Polish CSS (Skeleton + scoped, muted cool palette)
- [X] app- prefixed classes only
- [X] WCAG contrast checks
- [X] Reduced-motion support

## Stage H — Admin dashboard (coverage)
- [X] Jest coverage artifact + static HTML report in deploy

## Stage I — User-supplied graphs (stretch)
- [ ] Import TTL/OWL/RDF/XML/JSON-LD in browser
- [ ] Convert to docs/index and merge into IDB dataset registry
- [ ] Toggle datasets included in search



## Tutorials

### CQ  Ferret Screenshot Checklist

Use this as the working checklist for tutorial screenshot coverage.

| Tutorial need | Screenshot file | Covered? | Notes |
| --- | --- | --- | --- |
| CQ list showing multiple competency questions | `screenshots/cq-list.png` | Yes | Inserted in [Open the App](#open-the-app). |
| CQ upload and download/export buttons | `screenshots/cq-list.png` | Yes | Covered by the CQ list screenshot; buttons are visible without a callout. |
| Question formulation | `screenshots/formulation-of-question.png` | Yes | Inserted in [Create or Import Competency Questions](#create-or-import-competency-questions). |
| Question context / operational context | `screenshots/cq-operational-context.png` | Yes | Inserted in [Create or Import Competency Questions](#create-or-import-competency-questions). |
| Contributor section with name, role, contact, and notes | `screenshots/cq-contributors.png` | Yes | Inserted in [Add Contributors and Roles](#add-contributors-and-roles). |
| CQ decomposition: subquestions and decision logic | `screenshots/decomposition-of-question.png` | Yes | Inserted in [Decompose the Question](#decompose-the-question). |
| Data sources and data quality notes | `screenshots/relevant-data-sources.png` | Yes | Inserted in [Attach Data Sources and Data Quality Notes](#attach-data-sources-and-data-quality-notes). |
| Mermaid syntax area | `screenshots/cq-operational-context.png` | Yes | Covered by the operational context screenshot. |
| Rendered Mermaid diagram | `screenshots/mermaid-diagram.png` | Yes | Inserted in [Attach Mermaid Diagrams](#attach-mermaid-diagrams). |
| Query area with SQL or SPARQL attached to the CQ | `screenshots/cq-operational-context.png` | Yes | Covered by the operational context screenshot. |
| Vocabulary table after rebuild | `screenshots/vocabulary-list.png` | Yes | Inserted in [Rebuild and Export Vocabulary](#rebuild-and-export-vocabulary). |
| Vocabulary rebuild and export actions | `screenshots/vocabulary-list.png` | Yes | Covered by the vocabulary list screenshot; buttons are visible without a callout. |
