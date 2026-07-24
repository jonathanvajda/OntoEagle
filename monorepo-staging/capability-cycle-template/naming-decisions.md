# Naming Decisions

## How to Fill This Out

Create one copy of this file for each capability family before defining the canonical API.

Use this file to document old names, proposed names, rejected names, and the reasoning behind the final shared package names. Names should describe what the function does, not the source app, UI screen, file format accident, or one current workflow.

Long names are acceptable when they make the function's action, domain, and range clear.

## Naming Principles

- Name functions by action and data boundary.
- Avoid app-specific names.
- Avoid format-specific names when a MIME type, format option, or serializer argument is more reusable.
- Avoid vague verbs such as `handle`, `process`, `manage`, or `do`.
- Prefer names that remain correct across browser, worker, and Node adapters.
- Prefer changing a narrow existing function into a reusable one over creating a duplicate wrapper.

## Decision Table

|Decision ID|Old name(s)|Proposed canonical name|Accepted?|Reason|Rejected alternatives|Migration notes|
|:---|:---|:---|:---:|:---|:---|:---|
|NAME-001|||||||

## Naming Review Questions

Use these questions before accepting a canonical name.

- Can a developer understand the action without knowing the source app?
- Does the name describe the input domain and output range clearly enough?
- Would the name still make sense if used by a different app?
- Does the name avoid unnecessary format specificity?
- Does the name avoid UI, DOM, storage, or download assumptions unless those are the function's actual boundary?
- Is the name distinct enough to avoid collision with nearby utilities?

## Examples

Avoid:

```js
downloadRDF();
exportRDF();
handleFile();
processData();
```

Prefer:

```js
downloadBlob(data, mimeType, filename);
serializeGraph(quads, format, options);
readFileAsText(file, options);
parseDelimitedText(text, options);
```

## Notes

- 

