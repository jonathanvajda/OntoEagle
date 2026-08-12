# Equivalence Matrix

## D3 Baseline vs Cytoscape Parallel

|Concern|D3 Visual Lynx baseline|Cytoscape parallel decision|
|:---|:---|:---|
|Source of truth|Practical state is mixed between parsed graph structures and rendered SVG objects.|RDF/JS quads project into `GraphState`; Cytoscape receives projection only.|
|Node identity|D3 nodes use app-specific IDs from JSON-LD graph processing.|Stable RDF term IDs from `createGraphTermId`.|
|Edge identity|D3 links derive from predicate/path processing.|Stable quad-derived IDs from subject, predicate, object, and graph.|
|`rdf:type`|Visual category source.|Stored as node type metadata; not rendered as an edge by default.|
|Ontology class/property typing|Visual category source.|Classified by explicit type using deterministic precedence: ontology, class, object property, datatype property, annotation property, named individual, axiom support, blank node, literal, resource.|
|OWL restriction/list/axiom blank nodes|Can visually dominate ontology views when rendered naively.|Detected as `axiom-support` and hidden by default, with a Visual Lynx page toggle to show them.|
|Literals|Often graph-specific display behavior.|Stored as node annotations by default; optional literal nodes later.|
|Renderer|SVG/D3 force simulation.|Cytoscape `cose` baseline; renderer is not canonical state.|
|Testing|Existing tests cover parts of JSON-LD visualizer core.|New Jest tests snapshot graph-state and Cytoscape element contracts.|
