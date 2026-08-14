# Portfolio
Here are all of the apps:

- Data Exploration: 
    - OntoEagle Semantic Lookup -- loads ontologies, runs search queries for string matches, displays basic information for results. Also generates a catalog of the ontologies.
    - Ontology Bundler (seed generator and slim generator) (same repo as OntoEagle). Takes a txt file (seed), generates a minimal ontology file 'slim'. Export TTL, TriG, N-triple, N-Quad, JSON-LD, RDF-XML.
    - Ontology Tabulator -- makes a normal flat-file table of an ontology, with element's label, definition, alt terms, parent, etc. Read to export to table (csv, tsv, xls, xlsx) or print job to printer.
    Visual Lynx -- uses D3 to draw nodes and edges for some RDF (JSON-LD, Turtle, N-triples, etc.) 
- Domain Analysis:
    - Competency Question Ferret -- records competency questions, and metadata like data sources, SMEs, mermaid diagrams, SPARQL queries, etc. Export CSV, JSON-LD. 
    - CQ Ferret Term Extractor -- extracts terms from CQs, deduplicates them for export (CSV, JSONLD). 
    - Mermaid Diagram Builder -- draws mermaid diagrams on the fly from Mermaid syntax. Has project support for IndexedDB and local file system access. Export Markdown, Mermaid, bundled Zip.
-Building Tools:
    - Tabular Ontology Maker (TOM) -- takes CSV, TSV, XLS, XSLX as a normalized table, populates a table 'canvas' (using a minified distribution version of Glide Data Grid, a Modern react data grid component). Makes ontologies (iri, label, definition, OWL element type, etc.) from bulk term lists, and instance data with support for object properties too. Export TTL, TriG, N-triple, N-Quad, JSON-LD, RDF-XML. 
    - Table Nova - takes tabular data and converts it to RDF. Supports CSV, TSV, XLS, XLSX for input. Creates a naive ontology, generates the instance data, the ontology, or both -- as Export TTL, TriG, N-triple, N-Quad, JSON-LD, RDF-XML. 
- Data Manipulation: 
    - SPARQL Pattern Visualizer - visualizes SPARQL queries as edges and nodes, using Cytoscape.
    - Axiolotl SPARQL & Inference - indexed DB. Comes with a native quadstore and triplestore. Uses Comunica for SPARQL queries and updates. Has a short execution plan for EL inference -- runs forward chaining logical inferences until the triples 'settle' -- this inference can be previewed, exported as an overlay, or pushed back into the triplestore. Visualizes SPARQL queries (copy-paste code base of the SPARQL Pattern Visualizer app, different UI). Export TTL, TriG, N-triple, N-Quad, JSON-LD, RDF-XML. 
    - Linked-Data Transformer (same repo as Visual Lynx -- Visual Lynx depends on the LD transformer's code). Reserializes from many format options to many. (input: ttl, trig, nt, nq, jsonld, rdf, xml) . Export TTL, TriG, N-triple, N-Quad, JSON-LD, RDF-XML, D3 JSON, and Mermaid.
- Maintenance: 
    - Ontology Compliance Diagnostic. Inputs an ontology file, generates a compliance report. Supports modifying the ontology file to meet compliance. Input: ttl, trig, nt, nq, jsonld, rdf, xml. Export updated ontology file as TTL, TriG, N-triple, N-Quad, JSON-LD, RDF-XML. Export compliance report as CSV, TSV, YAML, HTML, or print. 
    - Myna RDF IRI Swapper. Inputs an ontology file (TTL, Trig, N-Triple, N-quad, JSON-LD). Inputs a mapping file (CSV, TSV). Export TTL, TriG, N-triple, N-Quad, JSON-LD, RDF-XML. 
    - Myna SPARQL IRI Swapper.  Inputs an sparql file (.sparql, .rq). Inputs a mapping file (CSV, TSV). Export sparql file (.sparql, .rq). (Same repo as Myna RDF IRI swapper).

- In summary:
    - 8 deployable GitHub Pages sites/repositories,
    - about 15 identifiable applications or tools,
    - perhaps 10–12 recurring technical capabilities.
    - That distinction matters:
    - The repository structure describes deployment. The package structure should describe reusable behavior.
    - Example
        - OntoEagle and Ontology Bundler may remain one deployable site while depending on separate shared libraries. Likewise, Visual Lynx and Linked-Data Transformer can remain colocated without retaining duplicate RDF-handling code.

After these foundational capabilities, a large portion of your current duplicated infrastructure should already be centralized.
```
Application-specific workflow
    ↓
shared domain package
    ↓
shared RDF/tabular/storage package
    ↓
browser platform utilities
```

Given this portfolio, I would prioritize these epics:
- [x] 1. MIME type/format/extension registry
- [x] 2.Namespace prefix registry
- [x] 3. Browser file/download utilities
- [x] 4. Tabular parsing and serialization
- [x] 5. RDF parsing and serialization
- [x] 6. IndexedDB data storage conventions for project data
- [x] 7. IndexedDB data storage conventions for graph data
- [x] 8. IndexedDB data storage conventions for user/app settings
- [x] 9. Ontology-related utils (is valid URN, is valid IRI, is blank node, is ontology file, xsd datatype detection/updating, etc.; make UUID/GUID)
- [x] 10. Normalization utils (toCamelCase, toPascalCase, toSnakeCase, etc.; getting datetime, appending datetime to filename)
- [x] 11. SPARQL query pattern extraction
- [x] 12. Ontology metadata read/write and IRI provisioning
- [x] 13. SPARQL update pattern implementation
- [X] 14. YAML, HTML, and print export
- [x] 15. Toast notifications, logging utils, status notifications, lightmode-darkmode
- [x] 16. Visualization of RDF in Cytoscape
- [x] 17. Visualization of SPARQL in Cytoscape
- [ ] 18. Standardized JS API to run headless
- [ ] 19. Package distribution, minification, and CDN exporting/importing
- [ ] 20. Documentation for an agent to run headless apps
