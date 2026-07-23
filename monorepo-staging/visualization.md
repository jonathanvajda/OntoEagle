**Visualization Markdown**

# Functional Specification: In-Memory Client-Side Linked-data (e.g., RDF) Graph Visualizer

## 1. Overview & Architecture Strategy

This document outlines the design and implementation requirements for a lightweight, client-side RDF graph visualizer using **Cytoscape.js**.

The core architectural pattern is **strict unidirectional state flow**:


$$\text{RDF Triples (In-Memory State)} \xrightarrow{\quad\text{Pure Pure Map Function}\quad} \text{Cytoscape Core API} \xrightarrow{\quad\text{Canvas Painting}\quad} \text{User Output}$$

* **Single Source of Truth:** An in-memory JavaScript store (e.g., array of triples or `N3.js` Store).
* **Decoupled Renderer:** Cytoscape acts strictly as an imperative view layer. The DOM is never read to establish application state. User interactions (e.g., node addition, deletion, dragging) dispatch state updates first, which then trigger targeted, deterministic Cytoscape mutations via `cy.add()` or `cy.remove()`.

---

## 2. Requirement-to-Feature Mapping Matrix

| Requirement / Architectural Goal | Cytoscape Feature / Implementation Strategy | Rationale & Trade-offs |
| --- | --- | --- |
| **Pure Client-Side / Minified Bundle** | `cytoscape.min.js` (~90 KB gzipped) via UMD/ESM distribution. | Zero external server dependencies or WebGL setup overhead. |
| **State Decoupling (Pure Functions)** | Headless `cy` instance with `cy.add()`, `cy.remove()`, `cy.batch()`. | Prevents DOM thrashing; state remains testable in isolated JavaScript functions without canvas context. |
| **Full Interactive Manipulation** | Canvas event listeners: `cy.on('tap')`, `cy.on('dragfree')`, `cy.on('cxttap')`. | Low-friction node/edge creation, dragging, deletion, and selection. |
| **First-Class RDF Predicate Labels** | Edge text properties + `text-background-padding` + `text-rotation: autorotate`. | Prevents edge text from overlapping or becoming obscured by intersecting line segments. |
| **Parallel Edges (Multi-graph)** | Curved routing: `'curve-style': 'bezier'` or `'unbundled-bezier'`. | Prevents multiple predicates connecting the same Subject and Object from stacking vertically on top of one another. |
| **Distinction: Resource vs. Literal** | Shape and color mapping via selector engine (`node[type = 'literal']`). | Provides clear, instant visual hierarchy between IRIs and literal values. |

---

## 3. Physics & Layout Engine Evaluation

RDF graphs present unique physics challenges due to "hub-and-spoke" topology (e.g., high degree for `rdf:type` nodes). Continuous spring physics can cause jitter and high CPU usage.

### Layout Comparison Matrix

| Layout Algorithm | Cytoscape Type | Pros | Cons | Recommendation |
| --- | --- | --- | --- | --- |
| **`cose`** (Compound Spring Embedder) | Built-in | Handles clustered & nested structures cleanly; stable force-directed physics. | Slower on 1,000+ nodes; requires tuning to avoid overlapping labels. | **Primary Choice** for small/medium graphs. |
| **`concentric`** | Built-in | Fast, deterministic; organizes nodes in concentric circles based on degree. | Lacks "organic" visual feel; non-force-directed. | Best for immediate structural overview of large topologies. |
| **`fcose` / `cola**` | External Plugin | Superior edge length control and collision avoidance; avoids overlap completely. | Adds ~15–20 KB extra bundle footprint. | Recommended upgrade if label collisions become problematic. |

A user might be able to switch layout views.


### Physics Configuration Policy

To maintain high performance and avoid continuous node bouncing:

1. **Disable Continuous Simulation:** Run the layout algorithm for a fixed number of iterations upon initial load or topology change.
2. **Freeze on Drag:** When a user drags a node (`dragfree`), freeze its position (`node.position()`) while keeping surrounding nodes fixed unless explicitly re-laid out.

---

## 4. UI/UX Polishing & Styling Specification

To move away from default high-contrast "demo" visuals and establish a modern, eye-friendly design system, below is a non-normative example as a reference implementation,  with the following **Cytoscape CSS (`cycss`) ruleset**:

```javascript
const cyStyleSheet = [
  // --- CORE CANVAS & DEFAULT NODE STYLE ---
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'font-family': 'Inter, system-ui, -apple-system, sans-serif',
      'font-size': '11px',
      'font-weight': '500',
      'color': '#334155', // Slate 700 (Avoid pure black)
      'text-valign': 'center',
      'text-halign': 'center',
      'background-color': '#f8fafc', // Slate 50
      'border-width': 2,
      'border-color': '#38bdf8', // Sky 400 (Resource URI accent)
      'width': 'label',
      'height': 'label',
      'padding': '12px',
      'shape': 'round-rectangle',
      'corner-radius': '6px',
      'overlay-opacity': 0 // Removes harsh default tap/click highlight boxes
    }
  },

  // --- LITERAL NODE OVERRIDE ---
  {
    selector: 'node[type = "literal"]',
    style: {
      'border-color': '#a78bfa', // Violet 400 (Literal accent)
      'background-color': '#f5f3ff', // Violet 50
      'shape': 'rectangle'
    }
  },

  // --- EDGE & PREDICATE STYLING ---
  {
    selector: 'edge',
    style: {
      'label': 'data(label)',
      'font-family': 'Inter, system-ui, sans-serif',
      'font-size': '10px',
      'color': '#64748b', // Slate 500
      'text-background-color': '#ffffff',
      'text-background-opacity': 1,
      'text-background-padding': '4px',
      'text-background-shape': 'roundrectangle',
      'text-rotation': 'autorotate',
      
      // Curved edge handling for multi-triples
      'curve-style': 'bezier',
      'control-point-step-size': 40, 
      
      'width': 1.5,
      'line-color': '#cbd5e1', // Slate 300
      'target-arrow-color': '#94a3b8', // Slate 400
      'target-arrow-shape': 'triangle',
      'arrow-scale': 0.8
    }
  },

  // --- INTERACTION STATES ---
  {
    selector: 'node:selected',
    style: {
      'border-width': 3,
      'border-color': '#0284c7', // Sky 600
      'background-color': '#e0f2fe'
    }
  },
  {
    selector: 'edge:selected',
    style: {
      'width': 2.5,
      'line-color': '#0284c7',
      'target-arrow-color': '#0284c7'
    }
  }
];

```

---

## 5. Pure State Sync Implementation Pattern

Below is a non-normative example as a reference implementation, showing how to translate in-memory triple mutations directly into Cytoscape core operations without DOM intervention:

```javascript
// State Transformer: Maps raw IRI/Literal triples into Cytoscape Core format
function createCytoscapeElement(subject, predicate, object, isObjectLiteral = false) {
  const shortSubj = shortenIRI(subject);
  const shortPred = shortenIRI(predicate);
  const shortObj = shortenIRI(object);

  return [
    // Subject Node
    { data: { id: subject, label: shortSubj, type: 'resource' } },
    // Object Node
    { data: { id: object, label: shortObj, type: isObjectLiteral ? 'literal' : 'resource' } },
    // Predicate Edge
    { 
      data: { 
        id: `${subject}-${predicate}-${object}`, 
        source: subject, 
        target: object, 
        label: shortPred 
      } 
    }
  ];
}

// Unidirectional Store Sync Function
function syncTripleToGraph(cy, triple) {
  cy.batch(() => {
    const elements = createCytoscapeElement(
      triple.subject, 
      triple.predicate, 
      triple.object, 
      triple.isLiteral
    );

    elements.forEach(elem => {
      // Add node/edge only if it does not already exist in the memory core
      if (cy.getElementById(elem.data.id).length === 0) {
        cy.add(elem);
      }
    });
  });
}

// Utility: Prefixes / IRI Shortener
function shortenIRI(iri) {
  if (iri.startsWith('http://www.w3.org/1999/02/22-rdf-syntax-ns#')) {
    return iri.replace('http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'rdf:');
  }
  if (iri.startsWith('http://www.w3.org/2000/01/rdf-schema#')) {
    return iri.replace('http://www.w3.org/2000/01/rdf-schema#', 'rdfs:');
  }
  return iri.length > 30 ? iri.substring(0, 27) + '...' : iri;
}

```