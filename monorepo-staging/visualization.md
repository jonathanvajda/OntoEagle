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

The visualizer should support ontology browsing first, then editing-oriented workflows. The expanded target architecture is:

```text
RDF/SPARQL input
  -> normalized graph state
  -> ontology-aware graph projection
  -> Cytoscape element model
  -> Cytoscape canvas rendering
```

Cytoscape is the rendering engine, not the source of truth. The DOM and canvas are never read to infer ontology state. User actions dispatch graph-state or RDF-state updates first; reconciliation functions then update Cytoscape with `cy.batch()`, `cy.add()`, `cy.remove()`, `cy.json()`, or style/layout calls.

This reverses the fragile D3 pattern where rendered DOM objects become a practical source for later reads, additions, deletions, and edits. In the new engine, the RDF dataset, derived graph model, selected elements, hidden elements, layout preferences, and edit drafts live in application state. The canvas is a projection of that state.

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

The milestone order should be driven by workflows users will actually perform, not only by renderer parity.

### Use Case 1: Edit RDF Visually

A user loads or starts an RDF graph, then adds and edits assertions through the visual interface.

Required user actions:

1. Add a node.
2. Assert the node's `rdf:type`.
3. Add or edit annotation properties.
4. Add or edit object-property edges to other resources.
5. Add or edit datatype-property values.
6. Optionally visualize datatype-property values as literal box nodes.
7. Save the resulting assertions as canonical quad rows in IndexedDB.
8. Serialize the graph in the user's chosen export format, such as Turtle, N-Triples, JSON-LD, or Mermaid.

Architectural implication:

The visual editor should produce RDF edit commands that normalize into `QuadRow` records. Persistence and export should route through shared data-management and RDF serialization packages. Cytoscape should never be the persistence shape.

### Use Case 2: Author SPARQL Visually

A user builds a SPARQL query pattern through graph interactions rather than writing every clause by hand.

Required user actions:

1. Add subject, predicate, object, and literal pattern terms.
2. Convert concrete terms into variables.
3. Add or edit triple patterns.
4. Mark variables as projected result variables.
5. Add constraints such as filters, optional patterns, unions, named graph clauses, and `FILTER NOT EXISTS`.
6. Serialize the query to SPARQL text.
7. Parse SPARQL text back into the same internal query-pattern state when feasible.

Architectural implication:

SPARQL needs its own durable internal state object. It cannot be treated as RDF with variables sprinkled in. Triple patterns, variables, filters, groups, optionals, unions, path expressions, and negated patterns need explicit representation so complex queries remain editable after visualization.

### Use Case 3: Convert RDF Data Into SPARQL Query Patterns

A user loads RDF, then switches to SPARQL authoring by abstracting selected subjects, predicates, objects, classes, individuals, or literals.

Examples:

1. Replace one selected individual with `?s`.
2. Replace all individuals of a class with a class-constrained variable.
3. Replace a concrete object value with `?o`.
4. Replace selected predicates with predicate variables.
5. Preserve useful type constraints as `?s rdf:type ex:Class`.
6. Keep selected concrete IRIs fixed while abstracting surrounding terms.

Architectural implication:

The system needs bridges from RDF graph state into SPARQL pattern state. These bridges should be explicit transformation helpers with abstraction policies, not one-off UI shortcuts.

### Use Case 4: Abstract Instance Data Into a Schema or Design Pattern Shape

A user drops RDF instance data into the workspace and asks for a more general pattern view.

Example target behavior:

1. Discover named individuals.
2. Read each individual's `rdf:type`.
3. Collapse individuals into their classes.
4. Discover object properties used between individuals.
5. Generalize those object-property edges into class-to-class pattern edges.
6. Recursively follow discovered object-property paths to show how objects can relate in the data sample.
7. Preserve evidence links back to the concrete triples that justify each generalized edge.

Architectural implication:

The system needs a data-abstraction layer that can derive observed schema/design-pattern graphs from instance data. This is not the same as OWL reasoning or ontology import closure, although those may later enrich it. The first target is an evidence-backed "observed pattern" projection from sample data.

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
   - pending RDF edit draft
   - pending SPARQL edit draft
   - active abstraction policy

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

### Phase 9: Editing Workflow

Prepare for RDF editing without making the renderer responsible for RDF semantics.

Required capabilities:

1. Add node draft from UI actions or forms.
2. Assert or change a node's `rdf:type`.
3. Add, edit, or remove annotation-property values.
4. Add, edit, or remove datatype-property values.
5. Add, edit, or remove object-property edges.
6. Add datatype-property-as-edge mode for users who want literal value nodes.
7. Validate terms before committing to RDF state.
8. Normalize edits into canonical quad rows.
9. Commit quad rows to the workspace store and IndexedDB boundary.
10. Serialize updated RDF through shared export utilities.
11. Recompute graph projection from updated RDF state.
12. Reconcile Cytoscape from the new projection.
13. Keep undo/redo history at the RDF-state operation level.

Editing architecture:

1. Forms produce RDF edit commands.
2. RDF edit commands normalize to add/remove/update quad-row operations.
3. Quad-row operations update the canonical workspace store.
4. Persistence writes the updated quad rows to IndexedDB.
5. Serialization exports RDF in Turtle, N-Triples, JSON-LD, or other supported formats.
6. Projection functions rebuild affected graph indexes.
7. Cytoscape receives minimal add/remove/update operations.

This keeps ontology correctness outside the canvas layer.

Deliverables:

1. `RdfEditCommand` model.
2. Quad-row add/remove/update helpers.
3. Node creation workflow for typed resources.
4. Annotation, datatype, and object-property edit workflows.
5. Export bridge from current graph state to RDF serialization and Mermaid output.

### Phase 10: SPARQL Authoring State

Create a durable internal state model for SPARQL query authoring and visualization.

Required capabilities:

1. Represent concrete RDF terms, variables, blank nodes, and literals.
2. Represent triple patterns separately from asserted RDF triples.
3. Represent projected variables for `SELECT`.
4. Represent query forms such as `SELECT`, `ASK`, `CONSTRUCT`, and `DESCRIBE`.
5. Represent pattern groups:
   - basic graph patterns
   - `OPTIONAL`
   - `UNION`
   - `GRAPH`
   - `FILTER`
   - `FILTER NOT EXISTS`
   - `MINUS`
6. Preserve query-specific metadata:
   - query type
   - selected variables
   - prefixes
   - base IRI
   - union/group membership where supported
   - graph clauses where supported
   - source text when round-tripping is partial
7. Serialize supported query state to SPARQL text.
8. Parse SPARQL text into query state through `sparql-utils` where feasible.
9. Record unsupported or lossy constructs as diagnostics rather than silently dropping them.

Deliverables:

1. `SparqlPatternState` data contract.
2. `SparqlTerm` and `SparqlPatternGroup` data contracts.
3. SPARQL serializer boundary for supported query state.
4. SPARQL parser/import boundary from `sparql-utils`.
5. Tests for variables, filters, optional groups, unions, graph clauses, and `FILTER NOT EXISTS`.

### Phase 11: RDF-to-SPARQL Abstraction Bridge

Support conversion from loaded RDF data into editable SPARQL query patterns.

Required capabilities:

1. Convert selected RDF triples into SPARQL triple patterns.
2. Convert selected concrete subjects, predicates, objects, or literals into variables.
3. Convert all individuals of a selected class into a class-constrained variable.
4. Preserve useful `rdf:type` constraints when abstracting individuals.
5. Let users choose whether predicates stay concrete or become predicate variables.
6. Let users choose whether literals stay fixed, become variables, or become datatype/lang-constrained variables.
7. Preserve provenance from each generated query pattern back to source RDF triples.
8. Support abstraction presets:
   - concrete example query
   - variables for selected nodes
   - class-level query from individuals
   - predicate-discovery query
   - neighborhood query around selected node

Deliverables:

1. `createSparqlPatternFromRdfSelection(graphState, selection, options)` helper.
2. Abstraction-policy data contract.
3. Provenance mapping from SPARQL patterns to source quad IDs.
4. Tests for individual-to-variable, individual-to-class-variable, literal abstraction, and predicate abstraction.

### Phase 12: Instance Data to Observed Schema/Pattern Graph

Derive an evidence-backed schema or design-pattern shape from concrete RDF instance data.

Required capabilities:

1. Identify named individuals in loaded RDF.
2. Resolve each individual's `rdf:type`.
3. Collapse individuals into class nodes.
4. Generalize object-property assertions into class-to-class edges.
5. Optionally generalize datatype properties into class-to-datatype/literal-value constraints.
6. Recursively follow object-property paths to a configurable depth.
7. Count supporting triples for each generalized edge.
8. Preserve evidence links back to source individuals and quad IDs.
9. Mark edges as observed-in-data rather than logically entailed.
10. Optionally enrich the pattern with ontology domain/range declarations when available.
11. Export the observed pattern as Cytoscape graph state, Mermaid, RDF/OWL design pattern assertions, or SPARQL query template.

Deliverables:

1. `deriveObservedPatternGraphFromInstances(quads, options)` helper.
2. `ObservedPatternNode` and `ObservedPatternEdge` contracts.
3. Evidence/provenance index.
4. Recursion-depth and traversal-policy options.
5. Tests for simple class collapse, multi-type individuals, object-property paths, datatype-property summaries, and evidence counts.

### Phase 13: SPARQL Visualization Reuse

Use the same graph rendering package for RDF datasets, observed pattern graphs, and SPARQL query patterns.

Required capabilities:

1. Accept SPARQL.js AST output through `sparql-utils`.
2. Project SPARQL pattern state into the same `GraphState` shape.
3. Represent variables as a separate visual node kind.
4. Represent constants, blank nodes, and literals with the same term ID helpers used for RDF.
5. Style SPARQL-only features without forking the Cytoscape renderer.
6. Preserve diagnostics for constructs that are present in query state but not graphically rendered.

Deliverables:

1. `projectSparqlPatternStateToGraphState(sparqlPatternState, options)` helper.
2. Shared Cytoscape renderer that accepts graph state, not RDF-specific input.
3. Tests proving RDF, observed-pattern, and SPARQL projections all feed the same renderer contract.

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
    rdf-edit-commands.js
    rdf-to-graph.js
    sparql-to-graph.js
    sparql-pattern-state.js
    rdf-to-sparql-abstraction.js
    observed-pattern-graph.js
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
    rdf-to-sparql-abstraction.test.js
    observed-pattern-graph.test.js
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

### Milestone 4: Editing-Ready State Flow

1. Add RDF edit command model.
2. Add add/remove quad-row operations.
3. Add annotation/datatype value editing.
4. Add object-property edge editing.
5. Persist edited quad rows through the IndexedDB boundary.
6. Export edited graph through RDF serializers and Mermaid output where supported.
7. Recompute affected graph indexes after edits.
8. Reconcile Cytoscape from updated state.

Exit criterion: edits happen against RDF state first and are then reflected in Cytoscape without reading the canvas as data.

### Milestone 5: SPARQL Authoring Model

1. Define durable SPARQL pattern state.
2. Support variables, concrete terms, literals, triple patterns, selected variables, and query type.
3. Add first support for `OPTIONAL`, `UNION`, `GRAPH`, `FILTER`, and `FILTER NOT EXISTS`.
4. Serialize supported state to SPARQL text.
5. Import supported SPARQL text through `sparql-utils`.

Exit criterion: a graph-authored query can round-trip through internal query state without collapsing into renderer-only data.

### Milestone 6: RDF-to-SPARQL Bridge

1. Convert selected RDF triples into SPARQL triple patterns.
2. Abstract selected concrete nodes and literals into variables.
3. Preserve selected `rdf:type` statements as class constraints.
4. Track provenance from generated SPARQL patterns back to source quad rows.

Exit criterion: users can load RDF, select concrete examples, and produce an editable SPARQL query pattern from those examples.

### Milestone 7: Instance-to-Pattern Abstraction

1. Identify named individuals and their classes.
2. Collapse individuals into class-level nodes.
3. Generalize observed object-property assertions into class-to-class edges.
4. Follow object-property paths to configurable depth.
5. Preserve evidence counts and source quad IDs.

Exit criterion: users can drop RDF instance data into the workspace and generate an evidence-backed schema/design-pattern shape.

### Milestone 8: Shared SPARQL/RDF Rendering

1. Feed RDF graph state, observed pattern graph state, and SPARQL pattern graph state into the same Cytoscape renderer.
2. Style variables and query-pattern constructs.
3. Reuse selection, filter, layout, and inspector components.

Exit criterion: RDF visualization, observed-pattern visualization, and SPARQL pattern visualization share the same Cytoscape rendering engine.

## 8. Open Decisions

1. Whether datatype properties should default to the Node Properties panel only, or whether datatype-as-edge mode should be exposed as a user toggle from the start.
2. Whether `rdf:type` edges should be available only in debug/all-triples mode or also as a normal display mode.
3. Whether `fcose` or `cola` should be accepted as an external dependency after `cose` baseline testing.
4. Whether hidden node state should be saved in project storage or treated as session-only UI state.
5. Whether property labels should prefer ontology-provided labels over namespace/local-name compaction in every case.
6. Which SPARQL constructs are first-class editable graph objects versus text-only clauses with diagnostics.
7. How much source-text formatting should be preserved when SPARQL is parsed, edited graphically, and serialized again.
8. Whether RDF-to-SPARQL abstraction should default to individual variables, class-constrained variables, or ask the user each time.
9. Whether observed schema/design-pattern abstraction should use only asserted sample data or also ontology domain/range and reasoning results.

## 9. Testing Strategy

1. Unit-test every pure projection helper.
2. Use small RDF fixtures for each node kind.
3. Use BFO-like fixtures for high-degree class/property layout behavior.
4. Use SPARQL fixtures for SELECT, ASK, CONSTRUCT, variables, blank nodes, and literals.
5. Use SPARQL fixtures for `OPTIONAL`, `UNION`, `GRAPH`, `FILTER`, `FILTER NOT EXISTS`, and unsupported construct diagnostics.
6. Use RDF instance-data fixtures for class collapse, recursive object-property traversal, and evidence counts.
7. Snapshot Cytoscape element JSON, not canvas pixels, for normal tests.
8. Use browser/screenshot tests only for layout smoke tests and visual regressions.

## 10. Success Criteria

The Cytoscape visualizer reaches practical functional equivalence when:

1. BFO renders with recognizable D3-equivalent semantic styling.
2. Node labels and node bubble sizing are readable.
3. Predicate labels are visible on directed edges.
4. `rdf:type` drives classification and inspector metadata rather than cluttering the graph.
5. Blank nodes and OWL axiom support structures are hidden by default but recoverable.
6. Filters, selection, dragging, hiding, and property inspection work from state.
7. Datatype values can be shown in the inspector and optionally as green literal nodes.
8. The graph can be edited by mutating quad-row/RDF state first, then reconciling Cytoscape from that state.
9. Edited RDF can be saved to IndexedDB and serialized in supported export formats.
10. RDF examples can be abstracted into editable SPARQL query patterns.
11. Instance data can be abstracted into evidence-backed schema/design-pattern graphs.
12. RDF, observed-pattern, and SPARQL inputs share the same renderer contract.
