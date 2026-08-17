# Milestone 20 Package Distribution Discussion

## Purpose

Milestone 20 concerns package distribution, minification, CDN exporting/importing, and app distribution.

The core question is how to let different audiences consume the work:

1. Developers who want one SDK package.
2. Developers who want the full SDK.
3. Developers who want one browser app.
4. Developers who want several browser apps.
5. End users who just want hosted apps in the browser.

## Recommended End State

Use a true monorepo as the source of truth.

The monorepo should contain both reusable SDK packages and deployable apps:

```text
ontoeagle-monorepo/
  package.json
  packages/
    format-registry/
    namespace-registry/
    browser-file-io/
    tabular-io/
    rdf-io/
    indexeddb-data-management/
    ontology-utils/
    normalization-utils/
    sparql-utils/
    ontology-metadata/
    report-export/
    ui-feedback/
    cytoscape-visualization/
  apps/
    ontoeagle/
    tabular-ontology-maker/
    axiolotl/
    visual-lynx/
    ontology-curation-manager/
    sparql-pattern-visualizer/
    ontology-tabulator/
    table-nova/
    iri-swapper/
  docs/
    agent-headless-docs/
    package-reference/
  tools/
    build/
    release/
    deploy/
```

This allows one repository to do double duty:

- SDK source of truth.
- App portfolio source of truth.
- npm publishing source.
- app deployment source.
- package documentation source.
- agent/headless API documentation source.

## Why Not A Foundation-Only Repo

A separate foundation-only repo would make the SDK identity cleaner, but it would split app and package changes across repos.

That split is premature while the apps are still being rewired around shared packages.

The better end state is a single monorepo where `packages/*` are first-class publishable SDK packages and `apps/*` are first-class deployable app packages.

## Distribution Channels

Use four distribution channels, each for a different job:

| Channel | Purpose |
| --- | --- |
| GitHub monorepo | source of truth, issues, pull requests, CI, releases |
| npm | package registry for SDK packages and app static artifacts |
| jsDelivr/unpkg | CDN delivery of npm package files |
| GitHub Pages or static hosting | canonical hosted user-facing apps |

Recommended flow:

```text
monorepo source
  -> npm packages
      -> jsDelivr/unpkg CDN delivery
  -> GitHub Pages/static app deployment
```

GitHub Releases should remain useful for provenance, changelogs, and source archives, but npm should be the primary JavaScript package distribution channel.

## SDK Package Distribution

Each SDK package should be individually publishable.

Example packages:

```text
@ontoeagle/format-registry
@ontoeagle/namespace-registry
@ontoeagle/browser-file-io
@ontoeagle/tabular-io
@ontoeagle/rdf-io
@ontoeagle/indexeddb-data-management
@ontoeagle/ontology-utils
@ontoeagle/normalization-utils
@ontoeagle/sparql-utils
@ontoeagle/ontology-metadata
@ontoeagle/report-export
@ontoeagle/ui-feedback
@ontoeagle/cytoscape-visualization
```

A developer who only needs RDF helpers should be able to install only:

```powershell
npm install @ontoeagle/rdf-io
```

A developer who wants the whole SDK can install a meta-package:

```powershell
npm install @ontoeagle/sdk
```

The `@ontoeagle/sdk` package would depend on all SDK packages, but apps inside the monorepo should not use it by default.

## App Package Distribution

Apps can also be published to npm, but they should be treated as versioned static app artifacts, not as libraries.

Recommended app package names:

```text
@ontoeagle/app-ontoeagle
@ontoeagle/app-tabular-ontology-maker
@ontoeagle/app-axiolotl
@ontoeagle/app-visual-lynx
@ontoeagle/app-ontology-curation-manager
@ontoeagle/app-sparql-pattern-visualizer
@ontoeagle/app-ontology-tabulator
@ontoeagle/app-table-nova
@ontoeagle/app-iri-swapper
```

A developer who wants one app can install:

```powershell
npm install @ontoeagle/app-table-nova
```

A developer who wants several apps can install:

```powershell
npm install @ontoeagle/app-table-nova @ontoeagle/app-axiolotl
```

A developer who wants the full portfolio can install a meta-package:

```powershell
npm install @ontoeagle/apps
```

The `@ontoeagle/apps` package would depend on all app packages.

## What An App Package Contains

An app package should publish built static files:

```text
apps/table-nova/
  package.json
  dist/
    index.html
    assets/
      app.js
      app.css
      vendor/
```

npm does not automatically "run" static browser apps. Installing an app package gives the user files.

To run an installed app, a developer can serve the `dist/` folder:

```powershell
npx serve node_modules/@ontoeagle/app-table-nova/dist
```

Later, each app package could provide an optional launcher:

```powershell
npx @ontoeagle/app-table-nova
```

That launcher would start a small local static server. This is useful, but not required for the first package distribution milestone.

## Should Apps Depend On The Whole SDK

No.

Each app should list only the SDK packages it directly imports.

Example for Table Nova:

```json
{
  "name": "@ontoeagle/app-table-nova",
  "dependencies": {
    "@ontoeagle/tabular-io": "workspace:*",
    "@ontoeagle/rdf-io": "workspace:*",
    "@ontoeagle/namespace-registry": "workspace:*",
    "@ontoeagle/ontology-metadata": "workspace:*",
    "@ontoeagle/format-registry": "workspace:*"
  }
}
```

Example for SPARQL Pattern Visualizer:

```json
{
  "name": "@ontoeagle/app-sparql-pattern-visualizer",
  "dependencies": {
    "@ontoeagle/sparql-utils": "workspace:*",
    "@ontoeagle/cytoscape-visualization": "workspace:*",
    "@ontoeagle/namespace-registry": "workspace:*",
    "@ontoeagle/ui-feedback": "workspace:*"
  }
}
```

Example for Axiolotl:

```json
{
  "name": "@ontoeagle/app-axiolotl",
  "dependencies": {
    "@ontoeagle/rdf-io": "workspace:*",
    "@ontoeagle/sparql-utils": "workspace:*",
    "@ontoeagle/indexeddb-data-management": "workspace:*",
    "@ontoeagle/namespace-registry": "workspace:*",
    "@ontoeagle/ontology-utils": "workspace:*",
    "@ontoeagle/browser-file-io": "workspace:*",
    "@ontoeagle/format-registry": "workspace:*"
  }
}
```

Rule:

```text
If an app imports a package API directly, add that package to the app package.json.
If an app does not import it directly, do not add it.
Use @ontoeagle/sdk only as an external convenience meta-package.
```

This keeps app/package boundaries visible and avoids unnecessary dependency bloat.

## npm Workspaces

The root monorepo should use workspaces.

Example root `package.json`:

```json
{
  "name": "ontoeagle-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "test": "npm test --workspaces",
    "build": "npm run build --workspaces"
  }
}
```

During local development, workspace dependencies use:

```json
{
  "dependencies": {
    "@ontoeagle/rdf-io": "workspace:*"
  }
}
```

When publishing, release tooling should convert workspace references to real versions.

## CDN Distribution

CDN support still makes sense in a monorepo.

The monorepo is the source. npm is the registry. jsDelivr/unpkg serve the npm package files.

Example SDK CDN import:

```html
<script type="module">
  import { parseDelimitedText } from
    "https://cdn.jsdelivr.net/npm/@ontoeagle/tabular-io@1.0.0/dist/browser/index.min.js";
</script>
```

For apps, CDN is useful for versioned static app artifacts, but direct CDN app URLs require care:

- relative asset paths
- service worker scope reviewed
- no GitHub Pages path assumptions
- local vendor files included or intentionally externalized
- package imports resolved correctly

The hosted app URL should remain the canonical user-facing surface. npm/CDN app packages are for developers, mirrors, and self-hosting.

## Build Outputs

SDK packages should likely produce two builds:

```text
dist/index.js
dist/browser/index.js
dist/browser/index.min.js
```

Recommended meaning:

| File | Purpose |
| --- | --- |
| `dist/index.js` | npm/bundler ESM build |
| `dist/browser/index.js` | browser ESM build |
| `dist/browser/index.min.js` | minified browser/CDN build |

For browser/CDN builds, internal OntoEagle package dependencies may need to be bundled or rewritten to CDN imports.

Large optional vendors should not be bundled into every package unless necessary.

## Package Metadata

Each SDK package should have a `package.json` similar to:

```json
{
  "name": "@ontoeagle/rdf-io",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": "./dist/index.js"
  },
  "jsdelivr": "./dist/browser/index.min.js",
  "unpkg": "./dist/browser/index.min.js",
  "files": [
    "dist",
    "README.md"
  ]
}
```

Each app package should publish static app artifacts:

```json
{
  "name": "@ontoeagle/app-table-nova",
  "version": "1.0.0",
  "type": "module",
  "files": [
    "dist",
    "README.md"
  ],
  "dependencies": {
    "@ontoeagle/tabular-io": "1.0.0",
    "@ontoeagle/rdf-io": "1.0.0"
  }
}
```

## Versioning Recommendation

Start with synchronized suite versions across SDK packages:

```text
@ontoeagle/rdf-io@1.0.0
@ontoeagle/tabular-io@1.0.0
@ontoeagle/sparql-utils@1.0.0
```

This makes early adoption easier.

Later, if the ecosystem grows, package versions can become independent.

App packages can either share the same suite version or use app-specific versions. For the first release, synchronized versions are simpler.

## Recommended Tooling

Minimal path:

- npm workspaces
- one build tool, such as `tsup`, `rollup`, or `esbuild`
- GitHub Actions for test/build/publish/deploy

More mature path:

- npm or pnpm workspaces
- Changesets for versioning and publishing
- Rollup/tsup for dual npm/browser builds
- generated API docs from JSDoc later

Do not over-engineer this initially. The first goal is a predictable package layout, build output, and npm/CDN publication path.

## Recommended Milestone 20 Deliverables

1. Define target monorepo structure.
2. Define SDK package naming.
3. Define app package naming.
4. Define npm workspace setup.
5. Define build outputs for SDK packages.
6. Define build outputs for app packages.
7. Define CDN import conventions.
8. Define app static artifact convention.
9. Define optional future app launcher pattern.
10. Define release/versioning policy.
11. Define GitHub Actions release flow.
12. Add package distribution docs for humans and agents.

## Bottom Line

The preferred architecture is:

```text
monorepo = source of truth
npm = package registry
jsDelivr/unpkg = CDN delivery
GitHub Releases = provenance and changelog
GitHub Pages/static hosting = canonical hosted apps
```

SDK packages should be individually installable.

Apps should be individually installable as static artifacts.

Meta-packages can provide convenience:

```text
@ontoeagle/sdk
@ontoeagle/apps
```

Apps inside the monorepo should depend on only the SDK packages they directly use, not the whole SDK meta-package.

