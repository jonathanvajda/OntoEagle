# Agent Headless Documentation

## Purpose

This folder documents the headless package APIs in a form useful to both humans and LLM agents.

The goal is not to create an HTTP API. These packages are ESM JavaScript modules. OpenAPI/Swagger would be the wrong primary format because there are no routes, methods, status codes, or request bodies. The closest appropriate pattern is:

1. Human-readable Markdown landing pages.
2. Package entrypoint cards with canonical inputs, outputs, side-effect boundaries, and examples.
3. A small machine-readable manifest for discovery.
4. Jest tests as executable contract examples.

## How A Human Should Use This

1. Start with `package-entrypoints.md`.
2. Find the package for the capability.
3. Import from that package's `src/index.js` during monorepo staging, or the mirrored `docs/app/shared/.../index.js` in browser apps.
4. Check the canonical input and output rows before writing adapter code.
5. Look at the listed Jest file for executable examples.

## How An Agent Should Use This

1. Read `agent-api-standard.md`.
2. Load `package-manifest.json`.
3. Select the package by capability id or tags.
4. Import only from the package public entrypoint.
5. Do not call internal files unless the manifest or package docs explicitly identify the export.
6. Keep DOM, storage, file picker, download, CLI, CI, and renderer behavior in adapters.

## Documentation Files

- `agent-api-standard.md`: rules for interpreting headless package APIs.
- `package-entrypoints.md`: human-readable package cards.
- `package-manifest.json`: machine-readable package/capability manifest.

## Contract Rule

If the work can run from data/options and return data/artifacts/diagnostics, it belongs in a package API.

If the work reads files, mutates DOM, opens IndexedDB/FSA, downloads files, instantiates renderers, logs to a console, parses CLI args, or talks to an agent protocol, it is an adapter over a package API.

