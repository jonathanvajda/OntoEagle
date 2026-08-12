# Side-Effect Boundaries

## Pure

- `createGraphTermId`
- `createGraphEdgeId`
- `createDefaultGraphUiState`
- `createGraphState`
- `classifyNodeKind`
- `projectRdfToGraphState`
- `projectGraphStateToCytoscapeElements`
- `createDefaultCytoscapeStylesheet`

## Browser Adapter

- The Visual Lynx Cytoscape page controller reads files, parses RDF, creates Cytoscape, registers events, and renders inspector status.

## Explicit Boundary

Cytoscape canvas state is never read to infer RDF state. User actions must update graph/RDF state first, then reconcile Cytoscape.
