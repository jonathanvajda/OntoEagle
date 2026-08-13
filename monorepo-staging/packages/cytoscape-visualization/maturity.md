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
|Cytoscape element projection|3|Pure and tested, including default hiding of blank nodes and axiom-support nodes plus property-record payloads, but not yet fully styled/interacted across all Phase 4/5 requirements.|
|Browser Cytoscape app|2|Parallel page exists for manual comparison and exposes Phase 2 filters plus Phase 3 grouped inspector rows; interaction parity and large-graph performance tuning are not implemented.|

## Performance Note

Manual testing with the merged Common Core Ontologies Turtle file produced about 2,624 nodes and 3,194 edges, but Cytoscape rendering took roughly 2.5 minutes. D3 reportedly handled comparable input in about 10-15 seconds. This is not acceptable for the target experience. Likely causes to investigate in a later phase include `cose` layout cost, label-sized node measurement, edge label rendering, full graph rendering without focus/windowing, and repeated destroy/recreate cycles.
