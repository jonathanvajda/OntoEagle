# Functional Specification: Cytoscape RDF and SPARQL Visualization

## 1. Overview and Architecture Strategy

This document outlines the design and implementation requirements for a lightweight, client-side RDF and SPARQL graph visualizer using **Cytoscape.js**.

The core architectural pattern is **strict unidirectional state flow**:

```text
RDF triples/quads or SPARQL triple patterns
  -> in-memory application state
  -> pure projection/map functions
  -> Cytoscape Core API
  -> canvas painting
  -> user output
```

The shorter RDF-only version is:

```text
RDF Triples (In-Memory State)
  -> Pure Map Function
  -> Cytoscape Core API
  -> Canvas Painting
  -> User Output
```

* **Single Source of Truth:** An in-memory JavaScript store, such as an array of RDF/JS quads, `N3.Store`, canonical quad rows, or a SPARQL graph model.
* **Decoupled Renderer:** Cytoscape acts strictly as an imperative view layer. The DOM is never read to establish application state. User interactions, such as node addition, deletion, dragging, hiding, and selection, dispatch state updates first. Those updates then trigger targeted, deterministic Cytoscape mutations through APIs such as `cy.batch()`, `cy.add()`, `cy.remove()`, `cy.json()`, layout calls, and style updates.

The visualizer should support ontology and SPARQL pattern browsing first. Editing-oriented workflows are deferred to a separate authoring-app capability plan. The expanded target architecture is:

```text
RDF/SPARQL input
  -> normalized graph state
  -> ontology-aware graph projection
  -> Cytoscape element model
  -> Cytoscape canvas rendering
```

Cytoscape is the rendering engine, not the source of truth. The DOM and canvas are never read to infer ontology state. User actions dispatch graph-state or RDF-state updates first; reconciliation functions then update Cytoscape with `cy.batch()`, `cy.add()`, `cy.remove()`, `cy.json()`, or style/layout calls.

This reverses the fragile D3 pattern where rendered DOM objects become a practical source for later reads. In the new engine, the RDF dataset, derived graph model, selected elements, hidden elements, and layout preferences live in application state. The canvas is a projection of that state.

## 2. Functional Equivalence Scope

The initial Cytoscape visualizer should restore the important behavior users already rely on:

1. Render RDF resources as nodes when they appear in subject or object position.
2. Render non-`rdf:type` predicate IRIs as directed, labeled edges.
3. Treat `rdf:type` statements as node classification metadata, not ordinary graph edges.
4. Color-code ontology entity types using the same semantic categories as the D3 visualizer.
5. Show node labels using `rdfs:label` when available, with IRI/CURIE fallback.
6. Size node bubbles to fit labels.
7. Show node properties in an inspector panel.
8. Filter visible subjects, predicates, objects, types, blank nodes, and axiom-like structures.
9. Allow selection, multi-selection, node dragging, hiding/canceling nodes, and restoring hidden nodes.
10. Preserve enough force-directed layout behavior that hubs fan out and edges remain readable.
11. Support both RDF data visualization and SPARQL triple-pattern visualization through shared graph-model contracts.

## 3. Driving Use Cases

The visualization milestone is scoped to read-only inspection and renderer reuse. Editing, SPARQL authoring, RDF-to-SPARQL abstraction, and observed-schema generation are valid capabilities, but they are deferred to [RDF and SPARQL Authoring App Capability Notes](./rdf-sparql-authoring-app.md).

### Use Case 1: Inspect RDF Graphs

A user loads RDF and visually explores ontology entities, relationships, labels, annotations, and graph neighborhoods without mutating the RDF dataset.

Required user actions:

1. Load RDF through shared `rdf-io`.
2. Render ontology-aware graph nodes and edges.
3. Filter, hide, select, drag, and inspect graph elements.
4. Copy IRIs, CURIEs, and selected triple IDs.
5. Preserve source RDF quads even when the visualization excludes support structures.

Architectural implication:

The RDF dataset remains the source of truth. Cytoscape elements are a disposable projection for rendering and interaction.

### Use Case 2: Inspect SPARQL Query Patterns

A user loads or writes SPARQL text in a SPARQL-focused app, and the visualizer renders the query pattern as a graph without becoming a query editor.

Required user actions:

1. Parse SPARQL through `sparql-utils`.
2. Project supported SPARQL.js AST patterns into the shared `GraphState` contract.
3. Render variables, concrete terms, literals, and triple-pattern edges.
4. Preserve diagnostics for unsupported or partially rendered constructs.

Architectural implication:

SPARQL visualization should reuse the Cytoscape renderer and state/filter/inspector patterns developed for RDF. Editing SPARQL query state is deferred to the authoring-app plan.

## 4. Capability Plan

### Phase 1: Canonical Graph State

Create a renderer-independent graph state model that can be tested without Cytoscape.

Required capabilities:

1. Accept RDF/JS quads from the shared `rdf-io` package.
2. Accept SPARQL graph models from `sparql-utils`, especially `buildSparqlGraphModelFromAst`.
3. Normalize triples/quads into stable IDs for subjects, predicates, objects, literals, blank nodes, and named graphs.
4. Keep raw RDF terms separate from display labels.
5. Preserve quad graph names even when the initial visualizer renders the default graph only.
6. Track UI state separately from RDF state:
   - selected node IDs
   - selected edge IDs
   - hidden node IDs
   - hidden edge IDs
   - active filters
   - current layout name and layout options
   - pinned/manual node positions
   - active inspector target
   - projection policy for blank nodes and axiom-support structures

Deliverables:

1. `GraphState` data contract.
2. `GraphNode` and `GraphEdge` data contracts.
3. Stable ID helpers for RDF terms and triple/quad edges.
4. Quad-row conversion boundary for graph-state inputs and outputs.
5. Unit tests for ID stability, duplicate handling, literals, blank nodes, named nodes, and graph terms.

### Phase 2: Ontology Classification

Add ontology-aware classification before Cytoscape rendering.

Required capabilities:

1. Detect `rdf:type` statements and remove them from the rendered edge set by default.
2. Store all `rdf:type` values on the subject node as a type array.
3. Classify nodes by explicit type:
   - `owl:Class` / `rdfs:Class` -> class
   - `owl:ObjectProperty` -> object property
   - `owl:DatatypeProperty` -> datatype property
   - `owl:AnnotationProperty` -> annotation property
   - `owl:Ontology` -> ontology
   - `owl:NamedIndividual` -> named individual
   - blank node -> blank node / axiom support node
   - literal -> literal value node
4. Apply a deterministic precedence rule when a node has multiple types.
5. Detect common OWL axiom and restriction blank-node patterns so they can be hidden by default but displayed on request.
6. Allow unknown resources to render with a neutral fallback style.

Recommended type precedence:

```text
ontology
  > class
  > object property
  > datatype property
  > annotation property
  > named individual
  > blank node
  > literal
  > resource
```

Deliverables:

1. `classifyOntologyNode(node, rdfIndex)` helper.
2. `isRenderedPredicate(predicateIri, options)` helper.
3. `isAxiomSupportNode(node, rdfIndex)` helper.
4. Tests using BFO-like class/property/ontology examples.

### Phase 3: Label and Property Indexes

Build indexes that make labels and the Node Properties panel deterministic.

Required capabilities:

1. Prefer `rdfs:label` for node labels.
2. Fall back to known annotation label predicates such as `skos:prefLabel`, `dcterms:title`, or selected OBO/IAO label-like properties.
3. Fall back to CURIE/local-name compaction through the shared namespace registry.
4. Preserve full IRI for inspector display.
5. Build a node property index containing:
   - `iri`
   - `rdf:type` array
   - annotation property labels and values
   - datatype property labels and values
   - optional raw predicate IRI for each property row
6. Keep object-property graph edges out of the properties panel unless the UI explicitly asks for all triples.
7. Add overflow scrolling to the Node Properties panel.

Deliverables:

1. `buildLabelIndex(quads, prefixes)` helper.
2. `buildNodePropertyIndex(quads, classificationIndex)` helper.
3. Inspector view model with grouped property rows.
4. Tests for multiline labels, repeated annotations, language-tagged literals, and typed literals.

### Phase 4: RDF-to-Cytoscape Projection

Convert graph state into Cytoscape element objects through a pure projection function.

Required capabilities:

1. Generate one Cytoscape node per visible graph node.
2. Generate one Cytoscape edge per visible rendered predicate statement.
3. Preserve original RDF terms in element `data`, not only display labels.
4. Store visual category as `data(kind)` so styles can use selectors.
5. Generate edge labels from compacted predicate IRIs or predicate labels.
6. Support multiple edges between the same subject and object.
7. Support self-loops.
8. Support display policies for literals:
   - default: datatype and annotation literal values appear in Node Properties.
   - optional: datatype properties render as green edges to literal value nodes.
9. Do not render `rdf:type` as ordinary edges unless a debug/all-triples mode is active.

Deliverables:

1. `projectRdfToGraphState(quads, options)` helper.
2. `projectGraphStateToCytoscapeElements(graphState, options)` helper.
3. Golden fixture tests for a small ontology sample.
4. Fixture for datatype-property-as-edge mode.

### Phase 5: Visual Styling Parity

Define Cytoscape styles that match the current D3 semantic color language.

Required node styles:

| Node kind | Fill | Outline | Shape |
| --- | --- | --- | --- |
| Class | light yellow | dark yellow | rounded rectangle sized to label |
| Object property | light blue / cyan | dark blue | rounded rectangle sized to label |
| Ontology | light red / rosa | dark red / crimson | rounded rectangle sized to label |
| Annotation property | light orange | dark orange | rounded rectangle sized to label |
| Datatype property | light green | dark green | rounded rectangle sized to label |
| Named individual | light purple / lilac | dark purple | rounded rectangle sized to label |
| Blank node / axiom node | light gray | dark gray | rounded rectangle sized to label |
| Literal value | very light green | dark green | box/rectangle sized to value |

Required edge styles:

1. Directed edges with target arrows.
2. Predicate labels placed on edges.
3. Edge text background so labels remain readable over lines.
4. Curved or bundled routing for parallel edges.
5. Green datatype-property edges in datatype-as-edge mode.
6. Muted gray default edge color for normal object/property relations.
7. Selection and hover states for nodes and edges.

Implementation notes:

1. Use Cytoscape `width: label`, `height: label`, and `padding` for label-sized node bubbles.
2. Use `text-wrap`, `text-max-width`, and tooltip/full-label access for very long values.
3. Use data-driven selectors such as `node[kind = "class"]` and `edge[kind = "datatype"]`.

### Phase 6: Layout and Edge Deconfliction

Match the useful parts of the D3 layout behavior without relying on continuous DOM physics.

How to describe the D3 behavior:

The existing D3 visualizer uses a force-directed layout. Nodes exert repulsive force, linked nodes exert spring-like force, and dragging a node temporarily changes the simulation. This does not strictly solve edge crossings, but it tends to spread hub-and-spoke neighborhoods enough that edges fan out and labels become readable.

How to mimic it in Cytoscape:

1. Use `cose` as the built-in first implementation for force-directed layout.
2. Evaluate `fcose` or `cola` when stronger label-aware spacing and collision avoidance are needed.
3. Tune layout options around:
   - node repulsion
   - ideal edge length
   - edge elasticity
   - gravity
   - number of iterations
   - whether node dimensions include labels
   - overlap avoidance
4. Run layouts on initial load and significant topology changes.
5. Do not keep a continuous simulation running during normal interaction.
6. After drag, persist the moved node position in UI state.
7. Provide a command to re-layout the visible graph.
8. Optionally provide a neighborhood re-layout mode for selected nodes and their immediate neighbors.

Edge deconfliction requirements:

1. Use `curve-style: bezier` or `curve-style: unbundled-bezier` for multiple edges.
2. Assign deterministic control-point distances for parallel edges.
3. Use self-loop styling for same-source-target triples.
4. Hide or fade edges attached to hidden nodes.
5. Keep edge labels readable with text backgrounds and autorotation.

Deliverables:

1. Layout preset registry.
2. BFO-sized test fixture.
3. Screenshots comparing D3 and Cytoscape results.
4. Performance notes for small, medium, and large ontologies.

### Phase 7: Filtering and Visibility

Rebuild the D3 filter box as a state-driven panel.

Required capabilities:

1. Hide blank nodes by default.
2. Hide axiom/restriction support structures by default.
3. Filter by node type.
4. Filter by predicate.
5. Filter by subject.
6. Filter by object.
7. Support single selection.
8. Support Ctrl-click additive selection.
9. Support Shift-click range selection.
10. Add overflow scrolling when option lists exceed panel height.
11. Show visible/hidden counts.
12. Provide reset filters and show all commands.

Implementation notes:

1. Filters mutate visibility state, not the Cytoscape canvas directly.
2. The renderer reconciles visibility by adding/removing elements or toggling display classes.
3. The original RDF state remains intact even when elements are hidden.

Deliverables:

1. Filter option index builders.
2. Filter reducer/state update helpers.
3. Filter panel view model.
4. Interaction tests for single, Ctrl, and Shift selection behavior.

### Phase 8: Selection, Dragging, Hiding, and Inspector

Restore graph interaction behavior through Cytoscape events routed into state.

Required capabilities:

1. Select node on click/tap.
2. Select edge on click/tap.
3. Multi-select with keyboard modifiers where platform support permits.
4. Drag nodes.
5. Persist manual node positions.
6. Hide/cancel selected nodes.
7. Restore hidden nodes.
8. Populate Node Properties panel from state indexes.
9. Add scrolling to the Node Properties panel.
10. Support copy IRI, copy CURIE, and copy selected triple IDs.

Event policy:

```text
Cytoscape event
  -> controller action
  -> state update
  -> graph projection/reconciliation
  -> Cytoscape visual update
```

Avoid policies:

1. Do not infer RDF triples from canvas elements.
2. Do not store business state only in Cytoscape `data`.
3. Do not treat selected DOM/canvas elements as canonical application state.

### Phase 9: SPARQL Visualization Reuse

Use the same graph rendering package for RDF datasets and SPARQL query patterns. This phase updates SPARQL Pattern Visualizer support in light of the Cytoscape graph-state, projection, styling, filtering, selection, and inspector work.

Required capabilities:

1. Accept SPARQL.js AST output through `sparql-utils`.
2. Project SPARQL graph models into the same `GraphState` shape.
3. Represent variables as a separate visual node kind.
4. Represent constants, blank nodes, and literals with the same term ID helpers used for RDF.
5. Style SPARQL-only features without forking the Cytoscape renderer.
6. Preserve diagnostics for constructs that are present in query state but not graphically rendered.
7. Keep SPARQL editing and query serialization out of the visualization milestone.

Deliverables:

1. `projectSparqlGraphModelToGraphState(sparqlGraphModel, options)` helper.
2. Shared Cytoscape renderer that accepts graph state, not RDF-specific input.
3. Tests proving RDF and SPARQL projections both feed the same renderer contract.
4. SPV browser rewiring plan that preserves current read-only SPARQL graph visualization behavior.

Implementation note:

SPARQL Pattern Visualizer should keep parsing and AST graph-model derivation in `sparql-utils`, then project that graph model through `cytoscape-visualization`. App code should not reintroduce local `toCytoscapeElements`, local Cytoscape styles, or local layout presets unless a later visualization package change proves the shared renderer contract is insufficient.

### Deferred Authoring Capabilities

The following capabilities are deferred to [RDF and SPARQL Authoring App Capability Notes](./rdf-sparql-authoring-app.md):

1. RDF editing workflow.
2. SPARQL authoring state and SPARQL editing workflow.
3. RDF-to-SPARQL abstraction bridge.
4. Instance data to observed schema/pattern graph derivation.

## 5. Proposed Package Boundaries

The visualization engine should be split into small adapters and pure helpers.

Recommended package modules:

```text
packages/cytoscape-visualization/
  src/
    graph-state.js
    graph-ids.js
    graph-selection.js
    graph-visibility.js
    graph-reducer.js
    rdf-to-graph.js
    sparql-to-graph.js
    ontology-classification.js
    label-index.js
    property-index.js
    cytoscape-elements.js
    cytoscape-styles.js
    cytoscape-layouts.js
    cytoscape-reconcile.js
    inspector-model.js
    filter-model.js
    index.js
  __tests__/
    graph-ids.test.js
    rdf-to-graph.test.js
    sparql-to-graph.test.js
    ontology-classification.test.js
    property-index.test.js
    filter-model.test.js
```

Dependency direction:

```text
rdf-io
namespace-registry
ontology-utils
sparql-utils
  -> cytoscape-visualization pure projection helpers
  -> app controller
  -> Cytoscape adapter
```

The pure projection helpers should not import browser DOM APIs. The Cytoscape adapter may import Cytoscape and manipulate the canvas.

## 6. Cytoscape Adapter Responsibilities

The Cytoscape adapter should own only renderer-specific concerns:

1. Create and destroy Cytoscape instances.
2. Apply stylesheet arrays.
3. Convert `GraphState` elements into Cytoscape element JSON.
4. Batch add/remove/update operations.
5. Register Cytoscape event listeners.
6. Run layout presets.
7. Fit, zoom, pan, center, and export images.
8. Expose selected renderer events back to the app controller.

It should not:

1. Parse RDF.
2. Parse SPARQL.
3. Decide ontology entity type semantics.
4. Own the canonical selected/hidden/filter state.
5. Mutate RDF triples directly.

## 7. Minimum Viable Milestones

### Milestone 1: Read-Only BFO Parity

1. Load RDF/JS quads.
2. Classify node kinds.
3. Render nodes and non-`rdf:type` edges.
4. Apply D3-equivalent color styles.
5. Show labels.
6. Show node properties.
7. Hide blank nodes and axioms by default.
8. Run `cose` layout.

Exit criterion: BFO can be loaded and visually inspected with class, property, ontology, and annotation-property nodes recognizable.

### Milestone 2: Interaction Parity

1. Select nodes and edges.
2. Drag nodes.
3. Persist node positions.
4. Hide and restore nodes.
5. Use filter panel with multi-select behavior.
6. Add scrolling to filter and property panels.

Exit criterion: users can explore and declutter the graph at least as effectively as in the D3 visualizer.

### Milestone 3: Layout Quality

1. Tune `cose` presets.
2. Add parallel-edge routing.
3. Add self-loop styling.
4. Evaluate `fcose` or `cola`.
5. Add layout switcher for force, concentric, and preset/manual layouts.

Exit criterion: hub neighborhoods fan out, labels are readable, and edge overlaps are no worse than the D3 baseline for BFO-sized graphs.

### Milestone 4: Projection Fidelity and Performance

1. Keep parsed RDF/JS quads or canonical quad rows attached to graph state.
2. Support projection-time exclusion of blank nodes and axiom-support structures.
3. Ensure exclusions reduce Cytoscape workload without deleting source RDF.
4. Add performance notes for parse, projection, Cytoscape construction, and layout timing.

Exit criterion: users can suppress noisy support structures for practical rendering while the full RDF dataset remains available for serialization or future authoring handoff.

### Milestone 5: Shared SPARQL/RDF Rendering

1. Feed RDF graph state and SPARQL pattern graph state into the same Cytoscape renderer.
2. Style variables and query-pattern constructs.
3. Reuse selection, filter, layout, and inspector components.
4. Preserve diagnostics for SPARQL constructs that are parsed but not graphically rendered.
5. Keep SPARQL editing and serialization deferred to the authoring-app plan.

Exit criterion: RDF visualization and SPARQL pattern visualization share the same Cytoscape rendering engine without turning the renderer into a query editor.

## 8. Open Decisions

1. Whether datatype properties should default to the Node Properties panel only, or whether datatype-as-edge mode should be exposed as a user toggle from the start.
2. Whether `rdf:type` edges should be available only in debug/all-triples mode or also as a normal display mode.
3. Whether `fcose` or `cola` should be accepted as an external dependency after `cose` baseline testing.
4. Whether hidden node state should be saved in project storage or treated as session-only UI state.
5. Whether property labels should prefer ontology-provided labels over namespace/local-name compaction in every case.
6. Which additional SPARQL constructs should be rendered graphically versus reported as diagnostics in a read-only visualization.

Settled decision:

SPARQL Pattern Visualizer is rewired directly to reuse `sparql-utils` for SPARQL AST graph-model derivation and `cytoscape-visualization` for GraphState projection, styles, layouts, and Cytoscape element JSON. SPARQL editing remains deferred to the authoring-app plan.

## 9. Testing Strategy

1. Unit-test every pure projection helper.
2. Use small RDF fixtures for each node kind.
3. Use BFO-like fixtures for high-degree class/property layout behavior.
4. Use SPARQL fixtures for SELECT, ASK, CONSTRUCT, variables, blank nodes, and literals.
5. Use SPARQL fixtures for `OPTIONAL`, `UNION`, `GRAPH`, `FILTER`, `FILTER NOT EXISTS`, and unsupported construct diagnostics.
6. Snapshot Cytoscape element JSON, not canvas pixels, for normal tests.
7. Use browser/screenshot tests only for layout smoke tests and visual regressions.

## 10. Success Criteria

The Cytoscape visualizer reaches practical functional equivalence when:

1. BFO renders with recognizable D3-equivalent semantic styling.
2. Node labels and node bubble sizing are readable.
3. Predicate labels are visible on directed edges.
4. `rdf:type` drives classification and inspector metadata rather than cluttering the graph.
5. Blank nodes and OWL axiom support structures are hidden by default but recoverable.
6. Filters, selection, dragging, hiding, and property inspection work from state.
7. Datatype values can be shown in the inspector and optionally as green literal nodes.
8. Projection-time exclusions reduce visual noise without deleting source RDF quads.
9. RDF and SPARQL inputs share the same renderer contract.
10. SPARQL constructs that cannot be rendered are reported as diagnostics rather than silently dropped.
