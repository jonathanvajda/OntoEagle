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
|Node labels|D3 visualizer derives labels during graph-specific processing.|Shared `buildLabelIndex` prefers `rdfs:label`, then registered label/title predicates, then graph projection falls back to registry compaction/local names.|
|Properties panel|Existing behavior is renderer/page-specific.|Shared `buildNodePropertyIndex` and `buildInspectorViewModel` group types, annotations, datatype properties, and optional object properties.|
|Literals|Often graph-specific display behavior.|Stored as node annotations by default; optional literal nodes later.|
|Cytoscape element payloads|D3 visual objects can become practical state.|Cytoscape element `data` preserves source RDF terms and quad payloads for display/debug, while GraphState remains canonical.|
|Parallel edges and self-loops|Handled by D3 link rendering behavior.|Projected as distinct Cytoscape edges with stable quad-derived IDs.|
|Datatype properties as edges|Varies by page/view.|Default keeps literals in properties; `renderLiteralsAsNodes` projects datatype edges to literal nodes.|
|Renderer|SVG/D3 force simulation.|Cytoscape `cose` baseline; renderer is not canonical state.|
|Testing|Existing tests cover parts of JSON-LD visualizer core.|New Jest tests snapshot graph-state and Cytoscape element contracts.|
