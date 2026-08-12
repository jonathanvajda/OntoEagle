# Maturity Assessment

- **Capability family:** Visualization of RDF in Cytoscape
- **Current maturity:** Level 2-4 depending on layer.

|Layer|Maturity|Reason|
|:---|:---:|:---|
|D3 baseline behavior|3|Usable baseline exists in Visual Lynx, but it is renderer-specific.|
|GraphState ID helpers|4|Pure, deterministic, tested.|
|Ontology classification|4|Pure, deterministic, tested for `rdf:type` metadata policy, precedence, unknown resources, and OWL restriction/axiom support blank nodes.|
|RDF-to-GraphState projection|4|Pure, deterministic, tested for named nodes, literals, blank nodes, duplicate IDs, named graphs, and Phase 2 ontology classification.|
|Cytoscape element projection|3|Pure and tested, including default hiding of blank nodes and axiom-support nodes, but not yet fully styled/interacted across all Phase 4/5 requirements.|
|Browser Cytoscape app|2|Parallel page exists for manual comparison and exposes Phase 2 blank-node/axiom-support filters; interaction parity is not implemented.|
