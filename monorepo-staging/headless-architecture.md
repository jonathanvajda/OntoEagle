# Headless Architecture Specification

The central idea is:

> **A runtime-neutral, headless JavaScript core with a stable programmatic API, surrounded by thin adapters for browser UI, CLI/CI, and agent/tool interfaces.**

Architecturally, this is very close to **Ports and Adapters / Hexagonal Architecture**, combined with the **Functional Core, Imperative Shell** pattern.

The important consequence is that you are *not* primarily building separate CLI versions, MCP versions, and browser versions of your tools. You are building **one capability** and giving it several entry points.

## 1. Some lay of the land

Several terms apply, but at different levels.

| Term                                   | What it describes                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| **Headless library**                   | Core capability does not require a GUI or DOM                                     |
| **Programmatic API**                   | Other JavaScript can call the capability directly                                 |
| **Public API**                         | The intentionally supported functions/types exposed by the package                |
| **Library API**                        | Same idea, emphasizing that this is an imported software library rather than HTTP |
| **Runtime-neutral core**               | Core does not inherently depend upon browser or Node-specific facilities          |
| **Ports and Adapters**                 | Browser UI, CLI, MCP, etc. sit outside the core                                   |
| **Functional Core / Imperative Shell** | Deterministic transformation logic is separated from file/network/UI operations   |
| **CLI adapter**                        | Command-line interface to the programmatic API                                    |
| **Tool/Agent adapter**                 | MCP, agent-tool, or similar machine-oriented interface                            |
| **Browser adapter**                    | DOM/file-picker/download integration                                              |
| **Capability API**                     | Useful umbrella term when thinking about what a package actually *does*           |

I would therefore avoid saying merely:

> “I want to turn my library into an API.”

That can make developers think you want an HTTP REST API.

I would instead write in your architecture documents:

> **Each package SHALL expose a stable, headless programmatic API. Browser interfaces, CLI commands, CI integrations, and agent/tool interfaces SHALL be implemented as adapters over that API.**

That captures what you are after very closely.

---

# 2. The architectural shape

Conceptually, I would structure the system like this:

```text
                         ┌─────────────────────┐
                         │     Browser UI      │
                         │ DOM / file picker   │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   Browser Adapter   │
                         └──────────┬──────────┘
                                    │
                                    │
┌─────────────┐          ┌──────────▼──────────┐          ┌─────────────┐
│     CLI     │─────────▶│                     │◀─────────│ MCP / Agent │
│   Adapter   │          │  PUBLIC PACKAGE API │          │   Adapter   │
└─────────────┘          │                     │          └─────────────┘
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │    Core Library     │
                         │                    │
                         │ parse              │
                         │ validate           │
                         │ transform          │
                         │ infer              │
                         │ serialize          │
                         │ analyze            │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │ Vendor Libraries    │
                         │ N3 / XLSX / etc.    │
                         └─────────────────────┘
```

The really important boundary is the horizontal line underneath the **public package API**.

Everything below it should ideally have no idea whether it was invoked by:

* a button,
* a command line,
* GitHub Actions,
* another JS package,
* an AI agent,
* MCP,
* a test runner,
* or something you have not invented yet.

That is what gives you the reuse you are looking for.

---

# 3. “Headless” is necessary, but it is not the whole requirement

A library can technically be headless and still be miserable to integrate.

For your purposes, I would specify **six properties**.

### 1. UI independence

The core must not expect:

```javascript
document.querySelector(...)
window.alert(...)
inputElement.files
downloadButton.click()
```

Those belong in adapters.

### 2. Explicit inputs

Instead of:

```javascript
function convertFile() {
    const file = document.querySelector("#file").files[0];
    ...
}
```

you want something conceptually like:

```javascript
async function convert(input, options) {
    ...
}
```

### 3. Explicit outputs

Instead of automatically downloading something:

```javascript
saveAs(blob, "ontology.ttl");
```

the core returns the artifact:

```javascript
return {
    data: turtle,
    mediaType: "text/turtle",
    suggestedFilename: "ontology.ttl"
};
```

Then the caller decides what to do with it.

A browser may download it.

A CLI may write it to stdout or disk.

An agent may pass it into another tool.

A test may simply inspect the string.

That distinction is **extremely important**.

### 4. Determinism where appropriate

For a transformation like:

```text
CSV → RDF
RDF → Turtle
OWL → report
RDF + inference rules → inferred RDF
```

the same:

```text
input
+ options
+ package version
```

should produce the same output.

I would actually make this a formal contract:

> For deterministic operations, output MUST be a pure function of normalized input, options, dependency versions, and explicitly supplied environment parameters.

That makes these capabilities particularly valuable to AI agents.

The agent doesn't need to “write Turtle.”

It needs to say:

```text
convert this dataset using these parameters
```

and your deterministic software handles the syntax.

That is a much better division of labor.

---

# 4. Your AI-agent point is especially important

What you are doing can be understood as creating a library of **deterministic computational tools for stochastic orchestrators**.

The AI handles things like:

* deciding which transformation is appropriate,
* identifying intended semantics,
* choosing parameters,
* interpreting ambiguous user requirements,
* chaining operations.

Your code handles things like:

* parsing,
* validation,
* serialization,
* datatype conversion,
* escaping,
* RDF syntax,
* spreadsheet creation,
* inference rules,
* graph transformation,
* deterministic reports.

So instead of an agent generating:

```turtle
@prefix ...
```

token by token, it could conceptually invoke:

```javascript
convertTableToRdf(table, mapping, options)
```

That gives you several benefits simultaneously:

**fewer tokens, fewer hallucinations, syntactic validity, repeatability, testability, and substantially easier auditing.**

This is one of the strongest reasons to do the architectural work you are describing.

---

# 5. I would define a standard package contract

This could become a convention across your entire ecosystem.

Every mature package should answer the same questions.

## A. What capabilities does it expose?

For example:

```text
parse
serialize
convert
validate
infer
query
analyze
normalize
```

Not every package needs every operation.

Your `rdf-io` package might expose:

```javascript
parseRdf()
serializeRdf()
convertRdf()
detectRdfFormat()
validateRdfSyntax()
```

Whereas a tabular package might expose:

```javascript
parseTable()
serializeTable()
convertTable()
inspectTable()
validateTable()
```

The key is that these represent **domain capabilities**, not UI actions.

Bad core API:

```javascript
handleUpload()
handleConvertButton()
downloadResult()
displayErrors()
```

Good core API:

```javascript
parse()
convert()
validate()
serialize()
```

---

# 6. Standardize the input boundary

This deserves special attention because browsers and Node represent files differently.

You do **not** want the deepest functions saying:

```javascript
function parse(file) { ... }
```

if `file` secretly means a browser `File`.

Instead distinguish logical data from transport containers.

For text:

```javascript
parseTurtle(text, options)
```

For binary data:

```javascript
parseWorkbook(bytes, options)
```

And potentially standardize on:

```javascript
string
Uint8Array
ArrayBuffer
```

at the core boundary.

Then adapters handle things like:

```text
Browser File → ArrayBuffer
Node filesystem → Uint8Array
HTTP response → ArrayBuffer
Agent blob → Uint8Array
```

Your core doesn't care where it came from.

---

# 7. Standardize the output boundary too

I think it would be worthwhile for your ecosystem to establish something like an **Artifact Result** convention.

Conceptually:

```javascript
{
    data,
    mediaType,
    format,
    encoding,
    suggestedFilename,
    metadata,
    warnings
}
```

For example:

```javascript
{
    data: "... turtle ...",
    mediaType: "text/turtle",
    format: "turtle",
    encoding: "utf-8",
    suggestedFilename: "output.ttl",
    warnings: []
}
```

Spreadsheet operation:

```javascript
{
    data: uint8Array,
    mediaType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    format: "xlsx",
    suggestedFilename: "report.xlsx",
    warnings: []
}
```

This becomes extraordinarily useful once you have 10–20 packages.

The CLI knows how to handle the result.

The browser knows how to handle the result.

An MCP server knows how to handle the result.

None needs RDF-specific or XLSX-specific logic beyond media handling.

---

# 8. Errors should be values intended for machines, not merely messages intended for people

This is another major requirement for headless operation.

Instead of only:

```text
Could not parse file.
```

you want structured errors conceptually like:

```javascript
{
    code: "RDF_PARSE_ERROR",
    message: "Unexpected token",
    line: 32,
    column: 14,
    severity: "error",
    source: "parser"
}
```

Then:

Browser:

```text
Line 32: Unexpected token
```

CLI:

```text
ERROR RDF_PARSE_ERROR 32:14 Unexpected token
```

CI:

```text
exit code 1
```

Agent:

```json
{
  "code": "RDF_PARSE_ERROR",
  "line": 32,
  "column": 14
}
```

Same error.

Different presentation.

That is Ports and Adapters working exactly as intended.

---

# 9. I would also standardize diagnostics separately from results

For many of your tools, there are three different kinds of output:

```text
Artifact
Diagnostics
Execution metadata
```

For example:

```javascript
{
    artifact: {...},

    diagnostics: [
        {
            severity: "warning",
            code: "UNDECLARED_PREFIX",
            ...
        }
    ],

    execution: {
        operation: "convert",
        packageVersion: "3.2.1"
    }
}
```

That distinction becomes valuable for CI.

You might want:

```bash
rdf-tool validate ontology.ttl
```

to produce diagnostics without producing another file.

Or:

```bash
rdf-tool convert data.rdf --to turtle
```

to produce both an artifact and warnings.

---

# 10. Define configuration as data

Avoid core functions whose operation depends upon UI state.

Instead of:

```javascript
const checkbox = document.querySelector("#infer-subclasses");

if (checkbox.checked) ...
```

the adapter should produce something like:

```javascript
{
    inference: {
        subclass: true,
        subproperty: true,
        inverse: false,
        domain: true,
        range: true
    }
}
```

Then:

```javascript
infer(dataset, options);
```

This is enormously important for reproducibility.

The browser, CLI, configuration file, CI pipeline, and agent can all express the exact same operation.

---

# 11. Your public API should be smaller than your codebase

One architectural trap to avoid is simply exporting everything.

Suppose internally you have:

```text
normalizePrefix()
escapeLiteral()
inspectToken()
sortQuads()
makeWriter()
processDatatype()
normalizeLanguage()
```

Those might remain implementation details.

Your supported interface might only be:

```javascript
parseRdf()
serializeRdf()
convertRdf()
validateRdf()
```

This distinction gives you freedom to refactor internals without breaking every consumer.

Think:

```text
internal functions
       ↓
stable capability layer
       ↓
public API
```

The **public API is a contract**, not merely a list of everything someone could import.

---

# 12. Then build adapters

Once the programmatic API exists, the other interfaces should become surprisingly small.

For example:

```text
packages/
    rdf-io/
        src/
            core/
            api/
            adapters/
                browser/
                node/
                cli/
                mcp/
        test/
        docs/
```

Or, if you want stronger separation:

```text
packages/
    rdf-io/
    rdf-io-cli/
    rdf-io-browser/
    rdf-io-mcp/
```

I slightly prefer the second model once things become large, because it prevents environment-specific dependencies from leaking into the core package.

Conceptually:

```text
@your-scope/rdf-io
@your-scope/rdf-io-cli
@your-scope/rdf-io-browser
@your-scope/rdf-io-mcp
```

But you don't have to start there.

---

# 13. The CLI should be extremely boring

That is a compliment.

A good CLI mostly does this:

```text
parse arguments
↓
read input
↓
convert input to core representation
↓
call public API
↓
serialize/write result
↓
choose exit code
```

It should **not reimplement RDF conversion**.

For example:

```bash
rdf-tool convert input.rdf --to turtle --output output.ttl
```

ultimately becomes approximately:

```javascript
const input = await readFile(...);

const result = await convertRdf(input, {
    inputFormat,
    outputFormat: "turtle"
});

await writeFile(result.artifact.data);
```

CI is then almost free.

```yaml
- run: rdf-tool validate ontology.ttl
```

A nonzero exit code fails the pipeline.

---

# 14. MCP should also be an adapter

Likewise, an MCP implementation should ideally contain almost no ontology logic.

Conceptually an MCP tool might advertise:

```text
convert_rdf
validate_rdf
infer_rdf
convert_table
```

The MCP handler receives structured arguments and calls:

```javascript
convertRdf(...)
```

The important architecture is:

```text
                 RDF API
                /   |   \
               /    |    \
          Browser  CLI   MCP
```

Not:

```text
Browser RDF implementation
CLI RDF implementation
MCP RDF implementation
```

That difference will save you an enormous amount of maintenance.

---

# 15. I would create a “headless readiness” specification

For each existing package, I would evaluate it against approximately these requirements.

1. **No required DOM access in the core.**
2. **No required browser globals in the core.**
3. **No implicit filesystem access in transformation functions.**
4. **No automatic downloading or presentation.**
5. **Inputs are explicit arguments.**
6. **Outputs are returned rather than displayed.**
7. **Configuration is explicit data.**
8. **Errors are structured.**
9. **Warnings/diagnostics are structured.**
10. **Deterministic operations are documented as deterministic.**
11. **Side effects are isolated.**
12. **Vendor-library dependencies are behind your own capability API.**
13. **Public exports are explicitly defined.**
14. **Types or JSDoc describe the API contract.**
15. **Node-compatible tests exercise the headless API without a browser.**
16. **Browser tests verify the browser adapter.**
17. **CLI tests verify argument/input/output behavior.**
18. **Example inputs and outputs exist.**
19. **Package version is discoverable.**
20. **Breaking public API changes follow semantic versioning.**

If a package satisfies these, I would consider it genuinely **headless-ready**, rather than merely “not currently using a GUI.”

---

# 16. Your JSDoc work gives you a major head start

If your functions already have good JSDoc or TypeScript declarations, much of your interface contract already exists.

I would make the documentation pipeline roughly:

```text
Implementation
      │
      ├── JSDoc / TypeScript types
      │
      ├── API reference
      │
      ├── examples
      │
      └── machine-readable schemas
```

An operation might be described in four complementary ways.

**Human conceptual documentation**

> Converts an RDF serialization into another RDF serialization.

**JavaScript API**

```javascript
convertRdf(input, options)
```

**CLI**

```bash
rdf convert input.rdf --to turtle
```

**Agent tool**

```text
convert_rdf(
    input,
    input_format,
    output_format
)
```

Those should all describe the **same capability**.

That will keep your ecosystem coherent.

---

# 17. I would distinguish three levels of documentation

This will help a lot as your packages multiply.

### Package README

Answers:

> What does this package do, and how do I start?

Example:

```text
Install
Quick example
Supported formats
Public API
Compatibility
Links
```

### API reference

Answers:

> Exactly what does this function accept and return?

Generated substantially from JSDoc/TypeScript.

### Integration guide

Answers:

> How do I use this capability from a particular environment?

For example:

```text
docs/
    javascript.md
    browser.md
    cli.md
    ci.md
    agent-tools.md
    mcp.md
```

That separation prevents your README from becoming a 2,000-line monster.

---

# 18. I'd establish one canonical “JavaScript-first” interface

This is important.

Don't make CLI the canonical interface.

Don't make MCP canonical.

Don't even make the browser canonical.

Make:

```javascript
import { capability } from "@scope/package";
```

the canonical interface.

Everything else translates to it.

Your dependency chain becomes:

```text
                     ┌── Browser
                     │
Vendor → Core → API ─┼── CLI → CI
                     │
                     ├── MCP → AI agent
                     │
                     └── Other JS applications
```

This means that even if MCP is eventually replaced by some new agent protocol, you have lost almost nothing.

You replace an adapter.

Your ontology/RDF/tabular implementation remains unchanged.

---

# 19. On-ramping each existing mature package

I would do this incrementally rather than attempting a repo-wide rewrite.

For each package, use the same sequence.

### Phase 1 — Inventory

Identify:

```text
public capabilities
vendor dependencies
DOM dependencies
browser dependencies
filesystem dependencies
side effects
inputs
outputs
configuration
errors
```

Do **not** start refactoring yet.

You are identifying boundaries.

### Phase 2 — Declare the capability API

Decide:

```javascript
export {
    parseSomething,
    convertSomething,
    validateSomething,
    serializeSomething
};
```

Make this intentionally small.

### Phase 3 — Extract environment dependencies

Convert:

```javascript
readFile()
→
coreFunction(contents)
→
downloadFile()
```

into:

```text
adapter reads file

        ↓

core receives data

        ↓

core returns artifact

        ↓

adapter saves artifact
```

This is probably the most important refactoring step.

### Phase 4 — Normalize contracts

Standardize:

```text
input representations
options objects
result objects
diagnostics
errors
```

### Phase 5 — Add headless tests

The critical test becomes:

> Can this package execute successfully under Node without a DOM?

For deterministic functions, add fixture tests:

```text
input fixture
+
options
=
expected output fixture
```

These are ideal regression tests.

### Phase 6 — Publish the programmatic API

Make your package's supported exports explicit.

### Phase 7 — Add CLI adapter

Implement only:

```text
arguments
stdin/files
stdout/files
exit status
```

### Phase 8 — Add CI examples

Examples for:

```text
validation
conversion
report generation
failure thresholds
```

### Phase 9 — Add machine/tool adapter

Expose selected operations through MCP or another agent interface.

### Phase 10 — Refactor the browser

Finally make your existing web interface use the exact same public API.

At that point:

```text
the browser becomes one consumer among many.
```

That is the architectural milestone I would aim for.

---

# 20. I'd give every package an “interface matrix”

This can make migration management extremely easy.

For example:

| Capability    | JS API | Browser | CLI | CI | MCP |
| ------------- | -----: | ------: | --: | -: | --: |
| Parse RDF     |      ✓ |       ✓ |   ✓ |  ✓ |   ✓ |
| Convert RDF   |      ✓ |       ✓ |   ✓ |  ✓ |   ✓ |
| Validate RDF  |      ✓ |       ✓ |   ✓ |  ✓ |   ✓ |
| Serialize RDF |      ✓ |       ✓ |   ✓ |  — |   ✓ |
| Detect format |      ✓ |       ✓ |   ✓ |  ✓ |   ✓ |

Another package:

| Capability       | JS API | Browser | CLI | CI | MCP |
| ---------------- | -----: | ------: | --: | -: | --: |
| Parse XLSX       |      ✓ |       ✓ |   ✓ |  ✓ |   ✓ |
| Parse CSV        |      ✓ |       ✓ |   ✓ |  ✓ |   ✓ |
| Convert CSV→XLSX |      ✓ |       ✓ |   ✓ |  ✓ |   ✓ |
| Preview rows     |      ✓ |       ✓ |   — |  — |   — |

Notice that not every capability needs every entry point.

The **JS API is the foundation**.

The others are optional adapters.

---

# 21. One additional layer may become valuable: capability manifests

As this ecosystem gets larger, you may eventually want machine-readable descriptions of what each package can do.

Conceptually:

```json
{
  "package": "@scope/rdf-io",
  "version": "3.1.0",
  "capabilities": [
    {
      "id": "rdf.convert",
      "inputs": [
        "text/turtle",
        "application/ld+json",
        "application/rdf+xml"
      ],
      "outputs": [
        "text/turtle",
        "application/ld+json"
      ],
      "deterministic": true
    }
  ]
}
```

That opens an interesting possibility.

An agent does not have to know:

> “Jonathan has some particular function buried in `rdf-io`.”

It can discover:

```text
I need:
application/ld+json
      ↓
text/turtle
```

and discover that:

```text
rdf.convert
```

can perform it.

You are now moving from merely a collection of libraries toward a **capability platform**.

That is probably a later-stage goal rather than something I'd make mandatory immediately.

---

# 22. I would establish one governing architecture rule

If you adopt only one rule across all of these packages, I would make it:

> **Core functions accept data and configuration and return data, diagnostics, or artifacts. They do not acquire input, present output, or determine how results are transported.**

That one rule gets you most of the way toward:

* headless operation,
* browser reuse,
* CLI reuse,
* CI reuse,
* MCP reuse,
* testability,
* deterministic execution,
* composability,
* easier agent integration.

And it fits extremely well with the kind of mature, narrowly focused utility functions you are describing.

## The overall architecture you are really heading toward

I would describe the project as:

> **A modular JavaScript capability ecosystem built around runtime-neutral, deterministic cores and stable programmatic APIs, with interchangeable adapters for browser applications, command-line tools, CI pipelines, and agent/tool protocols.**

Or, as a short internal label:

> **Headless Capability Architecture**

with:

```text
             Human
               │
        ┌──────┴──────┐
        │ Browser UI  │
        └──────┬──────┘
               │
            Adapter
               │
               ▼
┌─────┐    ┌───────────────┐    ┌─────────┐
│ CLI │───▶│ Capability API│◀───│ MCP/API │
└─────┘    └───────┬───────┘    └─────────┘
                   │
                   ▼
          ┌────────────────┐
          │ Deterministic  │
          │      Core      │
          └───────┬────────┘
                  │
                  ▼
          ┌────────────────┐
          │ Vendor Engines │
          └────────────────┘
```

There is a particularly useful next step from here: define a **single normative “Headless Package Specification”** for your ecosystem—perhaps a 2–4 page Markdown standard saying exactly what every package MUST, SHOULD, and MAY expose, including the standard result object, diagnostics format, error model, exports, determinism requirements, browser/Node separation, CLI conventions, and documentation requirements. Once that exists, you can migrate each existing package against a checklist rather than deciding the architecture again every time.
