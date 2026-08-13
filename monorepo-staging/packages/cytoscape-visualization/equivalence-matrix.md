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
|Semantic colors|D3 uses a broad ontology color language.|Shared Cytoscape style preserves the same categories: yellow classes, cyan object properties, green datatype/literal values, red ontologies, orange annotation properties, purple individuals, and gray support structures.|
|Selection and hover|D3 has direct DOM interaction states.|Cytoscape uses data-driven selectors plus `.is-hovered`, `node:selected`, and `edge:selected` styles; the parallel page now adds/removes hover classes.|
|Layout|D3 uses a continuous force simulation that spreads hub-and-spoke neighborhoods.|Cytoscape now exposes deterministic layout presets: overview, wide, readable, compact, grid, and hierarchy. Layout runs on render or explicit relayout, not continuously.|
|Parallel edges and loops|D3 layout/link drawing separates some overlaps incidentally.|Cytoscape projection now assigns deterministic routing metadata for parallel edges and self-loops; styles consume those data fields.|
|Renderer|SVG/D3 force simulation.|Cytoscape `cose` baseline; renderer is not canonical state.|
|Testing|Existing tests cover parts of JSON-LD visualizer core.|New Jest tests snapshot graph-state and Cytoscape element contracts.|
