// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Jonathan Vajda

describe("vocab-extract-core CSV export", () => {
  beforeAll(async () => {
    global.window = global;
    await import("../docs/app/vocab-extract-core.js");
  });

  test("exports rows with the prior CSV newline and escaping contract", () => {
    const csv = window.VOCAB_EXTRACT.exportRowsToCsv([
      {
        iri: "http://example.org/Term",
        label: "Term, with comma",
        elementType: "Class",
        definition: "line 1\nline 2",
        isA: "Parent",
        isDefinedBy: 'He said "yes"',
      },
    ]);

    expect(csv).toBe(
      'iri,label,element type,definition,is a,is defined by\nhttp://example.org/Term,"Term, with comma",Class,"line 1\nline 2",Parent,"He said ""yes"""'
    );
  });
});
