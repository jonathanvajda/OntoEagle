import {
  buildSparqlRewritePreviewRows,
  classifySparqlOperationFamily,
  countAppliedSparqlIriRewrites,
  extractSparqlPrologueDeclarations,
  extractSparqlRewriteTokens,
  formatSparqlIriToken,
  formatSparqlPrefixDeclarations,
  prependSparqlPrologue,
  readBalancedSparqlBraceBlock,
  rewriteSparqlIris,
  scanSparqlLexicalTokens,
  splitSparqlPrologueFromBody,
  stripSparqlLineComments
} from '../docs/app/shared/sparql-utils/index.js';

describe('sparql-utils prologue handling', () => {
  test('extracts namespace prefixes and keeps BASE separate from prefix maps', () => {
    const query = [
      'BASE <http://example.org/base/>',
      'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
      'PREFIX ex: <http://example.org/>',
      '',
      'SELECT * WHERE { ex:a rdfs:label ?label }'
    ].join('\n');

    const result = extractSparqlPrologueDeclarations(query);

    expect(result.ok).toBe(true);
    expect(result.baseIri).toBe('http://example.org/base/');
    expect(result.prefixes).toEqual({
      ex: 'http://example.org/',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#'
    });
    expect(result.bodyText).toBe('SELECT * WHERE { ex:a rdfs:label ?label }');
  });

  test('formats and prepends sorted prefix declarations', () => {
    const formatted = formatSparqlPrefixDeclarations({
      skos: 'http://www.w3.org/2004/02/skos/core#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
    });
    const prepended = prependSparqlPrologue('ASK { ?s ?p ?o }', {
      skos: 'http://www.w3.org/2004/02/skos/core#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
    });

    expect(formatted.value).toBe([
      'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>',
      'PREFIX skos: <http://www.w3.org/2004/02/skos/core#>'
    ].join('\n'));
    expect(prepended.value).toContain('ASK { ?s ?p ?o }');
  });

  test('splits only leading prologue declarations from body text', () => {
    const result = splitSparqlPrologueFromBody([
      'PREFIX ex: <http://example.org/>',
      'SELECT * WHERE {',
      '  ?s ?p ?o .',
      '}'
    ].join('\n'));

    expect(result.prologueText).toBe('PREFIX ex: <http://example.org/>');
    expect(result.bodyText).toBe('SELECT * WHERE {\n  ?s ?p ?o .\n}');
  });
});

describe('sparql-utils lexical scanning', () => {
  test('extracts IRI refs and prefixed names while ignoring comments and strings', () => {
    const query = [
      'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
      'SELECT * WHERE {',
      '  ?s rdfs:label "do not stage skos:prefLabel" .',
      '  # do not stage owl:Class',
      '  ?s <http://example.org/p> ?o .',
      '}'
    ].join('\n');

    const result = scanSparqlLexicalTokens(query);

    expect(result.iriRefs).toContain('http://www.w3.org/2000/01/rdf-schema#');
    expect(result.iriRefs).toContain('http://example.org/p');
    expect(result.prefixedNames).toContain('rdfs:label');
    expect(result.prefixedNames).not.toContain('skos:prefLabel');
    expect(result.prefixedNames).not.toContain('owl:Class');
  });

  test('strips comments without removing hash fragments or quoted hashes', () => {
    const query = '<http://example.org/a#frag> "literal # text" . # comment';

    expect(stripSparqlLineComments(query)).toBe('<http://example.org/a#frag> "literal # text" . ');
  });

  test('reads balanced brace blocks and ignores braces in strings', () => {
    const result = readBalancedSparqlBraceBlock('{ ?s ?p "{not a block}" . OPTIONAL { ?s ?p ?o } }', 0);

    expect(result.ok).toBe(true);
    expect(result.content).toContain('OPTIONAL { ?s ?p ?o }');
  });
});

describe('sparql-utils query kind', () => {
  test('classifies read and update operations after comments and prologue', () => {
    expect(classifySparqlOperationFamily('PREFIX ex: <http://example.org/>\n# comment\nSELECT * WHERE {}')).toBe('READ');
    expect(classifySparqlOperationFamily('PREFIX ex: <http://example.org/>\nINSERT DATA { ex:a ex:b ex:c }')).toBe('UPDATE');
    expect(classifySparqlOperationFamily('')).toBe('UNKNOWN');
  });
});

describe('sparql-utils IRI rewrite', () => {
  const prefixes = {
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    ex: 'http://example.org/'
  };

  test('extracts rewrite tokens from body but not prefix declarations', () => {
    const query = [
      'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
      'PREFIX ex: <http://example.org/>',
      'SELECT * WHERE { ex:a rdfs:label ?label }'
    ].join('\n');

    const result = extractSparqlRewriteTokens(query, prefixes);

    expect(result.tokens).toEqual([
      { token: 'ex:a', kind: 'PrefixedName', expandedIri: 'http://example.org/a' },
      { token: 'rdfs:label', kind: 'PrefixedName', expandedIri: 'http://www.w3.org/2000/01/rdf-schema#label' }
    ]);
  });

  test('builds rewrite preview rows for direct IRI and prefix-namespace mappings', () => {
    const mapping = new Map([
      ['http://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2000/01/rdf-schema#comment']
    ]);

    const result = buildSparqlRewritePreviewRows({
      prefixes,
      tokens: [{ token: 'rdfs:label', kind: 'PrefixedName', expandedIri: 'http://www.w3.org/2000/01/rdf-schema#label' }]
    }, mapping);

    expect(result.proposedChangeCount).toBe(1);
    expect(result.rows[0]).toMatchObject({
      targetIri: 'http://www.w3.org/2000/01/rdf-schema#comment',
      status: 'Change'
    });
  });

  test('rewrites prefix declarations, IRI refs, and prefixed names without touching strings or comments', () => {
    const query = [
      'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
      'PREFIX ex: <http://example.org/>',
      'SELECT * WHERE {',
      '  ?s rdfs:label "rdfs:label should stay literal" .',
      '  # rdfs:label should stay comment',
      '  <http://example.org/a> rdfs:label ?label .',
      '}'
    ].join('\n');
    const mapping = new Map([
      ['http://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2000/01/rdf-schema#comment'],
      ['http://example.org/a', 'http://example.org/b']
    ]);

    const result = rewriteSparqlIris(query, prefixes, mapping);

    expect(result.value).toContain('rdfs:comment ?label');
    expect(result.value).toContain('<http://example.org/b>');
    expect(result.value).toContain('"rdfs:label should stay literal"');
    expect(result.value).toContain('# rdfs:label should stay comment');
    expect(countAppliedSparqlIriRewrites(result)).toBe(3);
  });

  test('formats target IRIs as prefixed names when active prefixes support them', () => {
    expect(formatSparqlIriToken('http://www.w3.org/2000/01/rdf-schema#comment', prefixes)).toBe('rdfs:comment');
    expect(formatSparqlIriToken('http://other.example/x', prefixes)).toBe('<http://other.example/x>');
  });
});
