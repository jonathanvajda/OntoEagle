## File Structure
```
/
  docs/                          # 🚨 GitHub Pages root
    search.html                  # formerly index.html
    styles/
      search-app.css             # formerly app.css
    scripts/
      search-main.js             # formerly main.js (DOM + wiring only)
      search.js                  # core search logic (pure)
      indexer.js                 # index construction (pure)
      normalize.js               # text normalization/tokenization (pure)
      rdf_extract.js             # RDF → document cards (pure)
      indexeddb.min.js           # IndexedDB wrapper (side effects)
      types.js                   # JSDoc typedefs only
    data/
      graph.jsonld
      graph.nq
      index.json                 # optional
    admin/
      coverage/
    assets/
      svg/
      icons/
    sw.js

  scripts/
    build_dataset.py
    build_index.py               # optional

  tests/
    normalize.test.js
    search.test.js
    indexer.test.js
    rdf_extract.test.js

  package.json
  jest.config.js
  .github/workflows/ci.yml
```