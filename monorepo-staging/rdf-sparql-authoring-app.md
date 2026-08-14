# RDF and SPARQL Authoring App Capability Notes

## Purpose

This document captures capabilities that were intentionally deferred from the Cytoscape visualization milestone because they are authoring, editing, transformation, or schema-discovery capabilities rather than visualization capabilities.

The visualization package should remain focused on read-only graph projection, styling, filtering, selection, layout, inspection, and renderer reuse. Authoring should be handled by a distinct app or capability family that can own RDF mutation, SPARQL query mutation, provenance, validation, persistence, undo/redo, and serialization.

## Boundary Decision

Deferred out of `visualization.md`:

1. RDF graph editing from a canvas.
2. SPARQL query editing from a canvas.
3. RDF-to-SPARQL query-pattern abstraction.
4. Instance-data-to-observed-schema or observed-pattern graph generation.

Still in visualization scope:

1. Projecting RDF datasets into `GraphState`.
2. Projecting SPARQL query-pattern models into `GraphState`.
3. Rendering `GraphState` through Cytoscape.
4. Preserving enough source identity in projected nodes and edges for copy, inspection, traceability, and future handoff to authoring tools.
5. Keeping hidden/excluded canvas nodes from mutating canonical RDF or SPARQL state.

## Shared Fidelity Policy

1. Parsed RDF/JS quads or canonical quad rows are the RDF source of truth.
2. SPARQL query-pattern state is the SPARQL source of truth.
3. Cytoscape nodes and edges are renderable projections, not durable semantic records.
4. Projection-time exclusions for blank nodes, RDF list nodes, OWL restriction nodes, and other axiom-support structures must not delete or mutate source quads.
5. Serialization must use canonical RDF/quad state or canonical SPARQL pattern state after explicit edit commands, not the currently visible Cytoscape element set.
6. Visibility filters, hidden selected nodes, focus-node projection, and layout abstractions are view state only.
7. If an authoring app supports collapsed anonymous structures, the collapse operation must retain enough source quad identity to expand, edit, serialize, and undo without losing RDF fidelity.

## RDF Editing Capability

### Target User Workflow

A user loads or starts an RDF graph, then adds and edits assertions through an interface that may include a canvas, form panels, tables, or guided commands.

Required capabilities:

1. Add node draft from UI actions or forms.
2. Assert or change a node's `rdf:type`.
3. Add, edit, or remove annotation-property values.
4. Add, edit, or remove datatype-property values.
5. Add, edit, or remove object-property edges.
6. Add datatype-property-as-edge mode for users who want literal value nodes.
7. Validate RDF terms before committing to RDF state.
8. Normalize edits into canonical quad rows.
9. Commit quad rows to the workspace store and IndexedDB boundary.
10. Serialize updated RDF through shared export utilities.
11. Recompute graph projections from updated RDF state.
12. Reconcile any canvas from the new projection.
13. Keep undo/redo history at the RDF-state operation level.

### Editing Architecture

```text
UI action
  -> RDF edit command
  -> validation and normalization
  -> add/remove/update quad-row operations
  -> canonical workspace store
  -> IndexedDB / optional FSA backing
  -> serialization and visualization projections
```

RDF edit commands should not be inferred by reading Cytoscape elements. Canvas events may create commands, but the command must be validated against RDF state before persistence.

### Deliverables

1. `RdfEditCommand` model.
2. Quad-row add/remove/update helpers.
3. Node creation workflow for typed resources.
4. Annotation, datatype, and object-property edit workflows.
5. Export bridge from current RDF state to RDF serialization and Mermaid output.

## SPARQL Authoring Capability

### Target User Workflow

A user builds or modifies a SPARQL query pattern through graph interactions or structured forms rather than writing every clause by hand.

Required capabilities:

1. Represent concrete RDF terms, variables, blank nodes, and literals.
2. Represent triple patterns separately from asserted RDF triples.
3. Represent projected variables for `SELECT`.
4. Represent query forms such as `SELECT`, `ASK`, `CONSTRUCT`, and `DESCRIBE`.
5. Represent pattern groups: basic graph patterns, `OPTIONAL`, `UNION`, `GRAPH`, `FILTER`, `FILTER NOT EXISTS`, and `MINUS`.
6. Preserve query-specific metadata: query type, selected variables, prefixes, base IRI, union/group membership, graph clauses, and source text when round-tripping is partial.
7. Serialize supported query state to SPARQL text.
8. Parse SPARQL text into query state through `sparql-utils` where feasible.
9. Record unsupported or lossy constructs as diagnostics rather than silently dropping them.

### Architecture

SPARQL needs its own durable internal state object. It cannot be treated as RDF with variables added informally. Triple patterns, variables, filters, groups, optionals, unions, path expressions, and negated patterns need explicit representation so complex queries remain editable after visualization.

### Deliverables

1. `SparqlPatternState` data contract.
2. `SparqlTerm` and `SparqlPatternGroup` data contracts.
3. SPARQL serializer boundary for supported query state.
4. SPARQL parser/import boundary from `sparql-utils`.
5. Tests for variables, filters, optional groups, unions, graph clauses, and `FILTER NOT EXISTS`.

## RDF-to-SPARQL Abstraction Capability

### Target User Workflow

A user loads RDF, selects concrete examples, and asks the app to create an editable SPARQL query pattern from those examples.

Required capabilities:

1. Convert selected RDF triples into SPARQL triple patterns.
2. Convert selected concrete subjects, predicates, objects, or literals into variables.
3. Convert all individuals of a selected class into a class-constrained variable.
4. Preserve useful `rdf:type` constraints when abstracting individuals.
5. Let users choose whether predicates stay concrete or become predicate variables.
6. Let users choose whether literals stay fixed, become variables, or become datatype/lang-constrained variables.
7. Preserve provenance from each generated query pattern back to source RDF triples.
8. Support abstraction presets: concrete example query, variables for selected nodes, class-level query from individuals, predicate-discovery query, and neighborhood query around selected node.

### Deliverables

1. `createSparqlPatternFromRdfSelection(graphState, selection, options)` helper.
2. Abstraction-policy data contract.
3. Provenance mapping from SPARQL patterns to source quad IDs.
4. Tests for individual-to-variable, individual-to-class-variable, literal abstraction, and predicate abstraction.

## Observed Schema / Pattern Graph Capability

### Boundary Decision

Observed schema or observed pattern generation is not a visualization responsibility. Visualization can render an observed-pattern graph once another package derives it, but the derivation itself belongs to authoring, analysis, or schema-discovery work.

### Target User Workflow

A user drops RDF instance data into the workspace and asks for a more general pattern view.

Required capabilities:

1. Identify named individuals in loaded RDF.
2. Resolve each individual's `rdf:type`.
3. Collapse individuals into class nodes.
4. Generalize object-property assertions into class-to-class edges.
5. Optionally generalize datatype properties into class-to-datatype or literal-value constraints.
6. Recursively follow object-property paths to a configurable depth.
7. Count supporting triples for each generalized edge.
8. Preserve evidence links back to source individuals and quad IDs.
9. Mark edges as observed-in-data rather than logically entailed.
10. Optionally enrich the pattern with ontology domain/range declarations when available.
11. Export the observed pattern as Cytoscape graph state, Mermaid, RDF/OWL design pattern assertions, or SPARQL query template.

### Deliverables

1. `deriveObservedPatternGraphFromInstances(quads, options)` helper.
2. `ObservedPatternNode` and `ObservedPatternEdge` contracts.
3. Evidence/provenance index.
4. Recursion-depth and traversal-policy options.
5. Tests for simple class collapse, multi-type individuals, object-property paths, datatype-property summaries, and evidence counts.

## Open Decisions For A Future Authoring Milestone

1. Which SPARQL constructs are first-class editable graph objects versus text-only clauses with diagnostics.
2. How much source-text formatting should be preserved when SPARQL is parsed, edited graphically, and serialized again.
3. Whether RDF-to-SPARQL abstraction should default to individual variables, class-constrained variables, or explicit user choice each time.
4. Whether observed schema/design-pattern abstraction should use only asserted sample data or also ontology domain/range and reasoning results.
5. Whether the authoring app should be a new standalone app, a Visual Lynx mode, or shared components consumed by multiple apps.
