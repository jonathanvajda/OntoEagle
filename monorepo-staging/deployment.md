# Deployment Constraints

This document defines the deployment expectations for ontology-related apps in the monorepo. Apps should be local-native and edge-canonical first, with static hosting as a required secondary target and server-side processing as an optional tertiary target.

## Deployment Priority

1. **Primary:** Local-native browser deployment.
2. **Secondary:** Static edge deployment through GitHub Pages, GitLab Pages, or equivalent static hosting.
3. **Tertiary:** Optional Node.js server-side processing for teams that need it.

The browser/edge version is the canonical product surface. A server deployment may extend processing capacity, but it must not become a required dependency for core app behavior.

## Primary Deployment: Local-Native Browser App

The primary deployment must run as a basic local web service on the user's own machine, typically at `localhost` on an arbitrary available port.

Primary deployment requirements:

- The app must be usable from ready-made static `HTML`, `CSS`, and browser-native `JavaScript` assets.
- Core app functions must not require a backend server, database server, cloud API, hosted queue, or account-based platform service.
- The final runnable artifact must not require command-line build steps, CI jobs, transpilation, or bundling before use.
- The required deployment path must use committed, deployable `HTML`, `CSS`, and browser JavaScript directly; TypeScript, JSX, framework-specific single-file components, and other compile-only source formats are out of scope for runtime delivery.
- All runtime configuration must be injectable or read from local/static configuration. Do not hardcode machine-specific paths, fixed ports, API endpoints, credentials, or deployment-only assumptions.

Local-native behavior requirements:

- State mutations must follow a local-first pattern. UI code should read from and write to a local transactional cache layer asynchronously so the interface remains responsive during parsing, serialization, validation, and export workflows.
- Business logic must not directly mutate `localStorage` or `IndexedDB`. Persistence should flow through a unified cache/storage manager that handles quotas, serialization errors, and other storage concerns consistently.
- Large ontology, RDF, tabular, JSON-LD, Excel, or source-bundle processing must avoid unnecessary full-memory loading. Prefer chunked, streamed, or iterative parsing where available.
- Raw data utilities must be safe to run in a Web Worker or Service Worker. They should not reference `window`, `document`, DOM nodes, or UI-specific globals.

## Secondary Deployment: Static Edge Hosting

Every app must also support deployment as static assets on GitHub Pages, GitLab Pages, or an equivalent static file host/CDN. The priority is for a local-save of the CDN that is deployed from app origin, rather than calling an external site.

Secondary deployment requirements:

- The deployed app must function from static files alone.
- Static hosting must preserve the same core behavior as the local-native deployment.
- Routing must be compatible with static hosts. Prefer hash routing or static-safe fallback patterns when client-side routing is needed.
- Asset paths must be relative or configurable so the app can run from a repository subpath, custom domain, or local preview without code changes.
- The app must not assume writable server storage, server sessions, server-side environment variables, or server-side redirects.
- Offline-capable behavior should be supported where practical through Service Worker-compatible asset caching and local cache recovery.

GitHub/GitLab Pages support is secondary because the app should still be owned and runnable by the user locally. Edge hosting is a distribution target, not the source of truth for application capability.

## Tertiary Deployment: Optional Node.js Processing

Node.js server-side processing is recommended only as an optional extension for workflows that exceed practical browser limits or require controlled automation.

Acceptable Node.js use cases:

- Processing very large RDF graphs, Excel workbooks, JSON-LD documents, or source bundles.
- Running scheduled validation, conversion, or export jobs.
- Integrating with private institutional infrastructure.
- Providing collaboration features that cannot be represented as local-only state.

Tertiary deployment requirements:

- Server-side processing must be optional and replaceable. The browser/edge app must still provide its core workflow without Node.js.
- Shared logic should live in environment-neutral modules where possible, with thin adapters for browser, worker, and Node execution.
- Node-specific code must stay behind explicit boundaries and must not leak into browser-only modules.
- Any server API must use explicit request/response contracts, runtime validation at boundaries, structured errors, and clear user-facing outcomes.
- Server configuration must be supplied through environment configuration or dependency injection, not hardcoded constants.

## Development Implications

These deployment constraints should shape app architecture from the beginning:

- Prefer standard browser APIs, Web Workers, Service Workers, IndexedDB-backed storage abstractions, and static assets.
- Keep DOM/event handlers thin. They should orchestrate named functions rather than contain inline business logic.
- Keep parsing, validation, mapping, serialization, and export logic deterministic and reusable across browser, worker, and Node contexts.
- Use established libraries for ontology and data processing, such as `N3.js`, `jsonld.js`, `rdf-parse.js`, `PapaParse`, and `xlsx`, when they fit the task.
- Treat server capabilities as progressive enhancement, never as the baseline contract.
