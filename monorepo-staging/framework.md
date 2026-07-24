**Framework Markdown**

# Architectural Blueprint: No-Build Vanilla JS with Canvas Engines

## Core Principle
The application maximizes raw runtime performance and development simplicity by completely bypassing the frontend framework layer. Because the interface is composed of two independent, stateful canvas systems (Cytoscape for graphs and a dedicated data canvas for tables), a framework would only introduce unnecessary architectural overhead and memory layout costs.

## Key Architectural Choices

* Single Source of Truth (Application Controller)
* Implementation: A global, immutable-style plain JavaScript object (AppState) holds properties like selected node IDs, layout modes, or filtering states.
   * Benefit: Functions remain clean and easy to test. Components do not guess what the other is doing; they read from the state layer. 
* Downstream Projection (Unidirectional Rendering Flow)
* Implementation: Canvas systems do not interact directly. Instead, interactions trigger state updates, which are immediately passed into the dedicated APIs of each canvas (e.g., cy.batch() or tableCanvas.setData()).
   * Benefit: Bypasses complex framework re-renders. This ensures that user interactions—like zooming or sorting—do not accidentally tear down, reset, or redraw the underlying HTML wrapper elements.
* Bypassing the Build Toolchain
* Implementation: Source code is written in clean, modern ECMAScript standard files and linked via standard HTML scripts. External engines are loaded instantly via production Content Delivery Networks (CDNs) or local static files.
   * Benefit: Complete removal of compilers, configurations, and massive dependency folders. The application loads instantly with zero compilation overhead.
* Native Event Orchestration
* Implementation: The application relies on Cytoscape’s native .on() event system and standard browser events (addEventListener) to catch user intents and route them through the Controller.
   * Benefit: Event execution happens on the fast path of the browser’s engine without the overhead of framework event delegation systems or complex hook dependency tracking.

## Component Integration Matrix

| Interface Component | Rendering Layer | State Ownership | Framework Justification |
|---|---|---|---|
| Network Graph | HTML5 Canvas (Cytoscape.js) | Self-managed internal node/edge layout tree. | None. A framework risks forcing canvas layout reflows during unrelated state mutations. |
| Data Tables | High-Performance Data Canvas | Self-managed internal sorting, virtualization, and page tracking. | None. Tabular canvas libraries already have highly optimized internal structures for dataset rendering. |
| Control Panels / Sidebars | Native HTML DOM | Reads properties downstream from the main application controller. | None. Simple text and property substitutions are handled cleanly with template literals and element properties. |