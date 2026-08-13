# Maturity Assessment

- **Capability family:** Visualization of RDF in Cytoscape
- **Current maturity:** Level 2-4 depending on layer.

|Layer|Maturity|Reason|
|:---|:---:|:---|
|D3 baseline behavior|3|Usable baseline exists in Visual Lynx, but it is renderer-specific.|
|GraphState ID helpers|4|Pure, deterministic, tested.|
|Ontology classification|4|Pure, deterministic, tested for `rdf:type` metadata policy, precedence, unknown resources, and OWL restriction/axiom support blank nodes.|
|Label and property indexes|4|Pure, deterministic, tested for label precedence, repeated annotations, language-tagged literals, typed literals, and grouped inspector rows.|
|RDF-to-GraphState projection|4|Pure, deterministic, tested for named nodes, literals, blank nodes, duplicate IDs, named graphs, Phase 2 ontology classification, and Phase 3 labels/properties.|
|Cytoscape element projection|4|Pure and tested for visible nodes, rendered predicate edges, RDF term preservation, predicate-label edge labels, parallel edges, self-loops, literal-node mode, and debug `rdf:type` edges.|
|Visual styling parity|4|Shared stylesheet is data-driven by node/edge kind and tested for semantic node categories, directed readable edge labels, datatype edge styling, hover selectors, and selected states.|
|Layout and edge deconfliction|3|Layout preset registry, deterministic edge routing metadata, and dampened neighbor-drag helpers are implemented and tested. Browser controls expose overview/wide/readable/compact/grid/hierarchy relayout, fit, and optional neighbor nudging. Screenshot comparison and real performance benchmarks remain manual deliverables.|
|Filtering and visibility|4|Filter option indexes, visibility calculation, filter state updates, filter panel view model, and single/Ctrl/Shift selection helpers are implemented and tested. Browser page exposes blank-node, axiom-support, kind, predicate, subject, object, reset, show-all, and visible/hidden count controls.|
|Selection, dragging, hiding, and inspector|4|Selection reducers, clear-selection, hide selected, restore hidden, pinned node positions, inspector target state, copy payloads, and neighbor-drag helpers are implemented and tested. Browser page wires node/edge selection, modifier-aware selection state, hiding/restoring, drag position pinning, inspector rows, and copy buttons.|
|Browser Cytoscape app|3|Parallel page exists for manual comparison and exposes Phase 2 filters, Phase 3 grouped inspector rows, Phase 5 hover styling, Phase 6 layout controls, Phase 7 filter controls, and Phase 8 selection/hide/restore/copy interactions; RDF edit workflow is not implemented.|

## Performance Note

Manual testing with the merged Common Core Ontologies Turtle file produced about 2,624 nodes and 3,194 edges, but Cytoscape rendering took roughly 2.5 minutes. D3 reportedly handled comparable input in about 10-15 seconds. This is not acceptable for the target experience. Likely causes to investigate in a later phase include `cose` layout cost, label-sized node measurement, edge label rendering, full graph rendering without focus/windowing, and repeated destroy/recreate cycles.

Phase 6 added layout presets so manual testing can compare `overview`, `wide`, `readable`, `compact`, `grid`, and `hierarchy`. `overview` and `readable` now use stronger repulsion, longer ideal edges, lower gravity, and component spacing because hub-heavy graphs were still collapsing into a narrow vertical band despite available horizontal canvas space. The next performance checkpoint should record parse time, projection time, Cytoscape construction time, and layout time separately; otherwise the bottleneck will remain ambiguous.
