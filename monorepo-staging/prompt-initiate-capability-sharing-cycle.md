Follow the specs in the monorepo-staging folder, make a copy of the markdown template for the next capability family, indexedDB and app data management. And I would like you to check the folders for the repositories:
OntoEagle
tabular-ontology-maker
axiolotl
visual-lynx
sparql-pattern-visualizer
ontology-curation-manager (aka Ontology Compliance Diagnostic)
ontology-tabulator
iri-swapper
table-nova

And I want you to follow the steps to document candidate functions
    current name,
    proposed action-oriented name,
    source app,
    file path,
    capability family,
    input contract,
    output contract,
    sync or async behavior,
    error and warning model,
    side effects,
    environment assumptions,
    vendor dependencies,
    known callers,
    equivalent or overlapping functions,
    test fixture availability,
    promotion maturity rating.

In documenting, I don't want you to change any of the code base for any of those repositories, but merely document details according to [monorepo-roadmap.md](d:/GitHub/OntoEagle/monorepo-staging/monorepo-roadmap.md) spec, and according to the instructions for each of those markdowns. Populate those different markdown template documents in the folder where that capability would exist with packages and vendor code and all that per the recommended path.