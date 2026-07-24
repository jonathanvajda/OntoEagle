# Side-Effect Boundaries

## How to Fill This Out

Create one copy of this file for each capability family while separating pure core logic from adapters.

Use this file to document which functions are pure and which functions are allowed to touch browser APIs, storage, files, downloads, DOM, workers, vendor libraries, or Node.js. The goal is to keep shared packages reusable and predictable.

## Boundary Categories

|Category|Description|Allowed examples|
|:---|:---|:---|
|Pure core|Deterministic transformation of explicit inputs into explicit outputs.|Parse text, normalize rows, serialize quads, validate object shape.|
|Browser adapter|Thin wrapper around browser APIs.|`FileReader`, `Blob`, `URL.createObjectURL`, `AbortController`.|
|Storage adapter|Controlled persistence boundary.|IndexedDB, File System Access API, OPFS.|
|DOM adapter|Rendering or event collection boundary.|Read event payloads, paint view models, attach listeners.|
|Vendor adapter|Stable wrapper around third-party library APIs.|N3.js, jsonld.js, PapaParse, xlsx, Mermaid, Cytoscape.|
|Node adapter|Optional server-side processing boundary.|File system, streams, scheduled jobs, API routes.|

## Boundary Table

|ID|Function|Current category|Target category|Side effects|Reads from|Writes to|Adapter needed?|Worker-safe?|Node-safe?|Notes|
|:---|:---|:---|:---|:---|:---|:---|:---:|:---:|:---:|:---|
|BOUND-001|||||||||||

## Side-Effect Rules

- Pure core functions must not reference `window`, `document`, DOM nodes, `localStorage`, IndexedDB, File System Access API, OPFS, network APIs, or Node globals.
- DOM functions must not parse ontology data, mutate project data, or write directly to persistent storage.
- Storage functions must be called through a storage adapter, not directly from business logic.
- Vendor APIs should be wrapped so app code depends on stable local contracts.
- Browser-only and Node-only behavior must stay behind explicit adapters.
- Shared package contracts should identify whether each function is browser-safe, worker-safe, and Node-safe.

## Refactor Plan

|Refactor ID|Problem|Target boundary|Affected functions|Required tests|Migration notes|
|:---|:---|:---|:---|:---|:---|
|REF-001||||||

## Notes

- 

