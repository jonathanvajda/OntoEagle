## File Structure
```
/
  .github/
    workflows/
      lookup.yml
  docs/                          # 🚨 GitHub Pages root
    search.html                  # formerly index.html
    styles/
      search-app.css
    scripts/
      search-main.js             # DOM + orchestration
      search.js                  # pure scoring + ranking
      indexer.js                 # pure inverted-index builder
      normalize.js               # pure normalize + tokenize
      rdf_extract.js             # pure JSON-LD -> Document extraction (once implemented)
      indexeddb.min.js           # IndexedDB wrapper (side effects)
      types.js                   # JSDoc typedefs
    data/
      graph.jsonld               # ONLY Python output
      graph.nq
      index.json                 # optional
    admin/
      coverage/
    assets/
      svg/
      icons/
    sw.js

  scripts/
    build_dataset.py             # ONLY consolidates -> graph.jsonld
    build_index.py               # optional

  tests/                         # Jest unit tests for pure modules
    normalize.test.js
    search.test.js
    indexer.test.js
    rdf_extract.test.js

  package.json
  jest.config.js
```