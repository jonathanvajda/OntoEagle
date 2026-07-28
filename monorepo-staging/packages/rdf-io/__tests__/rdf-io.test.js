import { jest } from '@jest/globals';
import {
  RDF_TYPE,
  createRdfDataset,
  createRdfQuadsFromJsonLdGraph,
  createRdfQuadsFromObjects,
  literal,
  namedNode,
  parseRdfText,
  parseRdfTextWithAdapters,
  quad,
  rdfDatasetToJsonLdGraph,
  serializeRdfDataset,
  serializeRdfDatasetWithAdapters,
  serializeRdfDatasetToNQuads
} from '../src/index.js';

describe('RDF/JS dataset and line serialization', () => {
  test('serializes named nodes, literals, datatypes, languages, and graph names to N-Quads', () => {
    const dataset = createRdfDataset([
      quad('http://ex/s1', 'http://ex/p', literal('hello', { language: 'en' }), 'http://ex/g'),
      quad('http://ex/s1', 'http://ex/count', literal(7, { datatype: 'http://www.w3.org/2001/XMLSchema#integer' }))
    ]);

    expect(serializeRdfDatasetToNQuads(dataset)).toBe([
      '<http://ex/s1> <http://ex/p> "hello"@en <http://ex/g> .',
      '<http://ex/s1> <http://ex/count> "7"^^<http://www.w3.org/2001/XMLSchema#integer> .',
      ''
    ].join('\n'));
  });

  test('parses N-Quads and round-trips through the canonical serializer result shape', () => {
    const parsed = parseRdfText('<http://ex/s> <http://ex/p> "line\\n2" <http://ex/g> .\n', { format: 'nquads' });
    expect(parsed.quads).toHaveLength(1);
    expect(parsed.quads[0].object.value).toBe('line\n2');

    const serialized = serializeRdfDataset(parsed.dataset, { format: 'application/n-quads' });
    expect(serialized).toEqual({
      text: '<http://ex/s> <http://ex/p> "line\\n2" <http://ex/g> .\n',
      format: 'nquads',
      mimeType: 'application/n-quads',
      warnings: []
    });
  });

  test('throws clear errors for unsupported dependency-free parse formats', () => {
    expect(() => parseRdfText('@prefix ex: <http://ex/> .', { format: 'turtle' }))
      .toThrow('supports only N-Triples and N-Quads');
  });
});

describe('object-to-RDF projection', () => {
  test('converts app records to reusable RDF quads with a mapping', () => {
    const result = createRdfQuadsFromObjects([
      {
        id: 'http://ex/ClassA',
        label: 'Class A',
        definition: 'A test class',
        parent: 'http://ex/Parent'
      }
    ], {
      subject: 'id',
      type: 'http://www.w3.org/2002/07/owl#Class',
      properties: {
        label: {
          predicate: 'http://www.w3.org/2000/01/rdf-schema#label',
          language: 'en'
        },
        definition: 'http://purl.obolibrary.org/obo/IAO_0000115',
        parent: {
          predicate: 'http://www.w3.org/2000/01/rdf-schema#subClassOf',
          termType: 'iri'
        }
      }
    });

    expect(result.warnings).toEqual([]);
    expect(result.quads).toHaveLength(4);
    expect(result.quads).toEqual(expect.arrayContaining([
      expect.objectContaining({
        predicate: namedNode(RDF_TYPE),
        object: namedNode('http://www.w3.org/2002/07/owl#Class')
      }),
      expect.objectContaining({
        predicate: namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
        object: literal('Class A', { language: 'en' })
      }),
      expect.objectContaining({
        predicate: namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'),
        object: namedNode('http://ex/Parent')
      })
    ]));
  });

  test('warns and skips objects with missing subjects or invalid IRI object values', () => {
    const result = createRdfQuadsFromObjects([
      { id: '', label: 'No subject' },
      { id: 'http://ex/Good', related: '' }
    ], {
      subject: 'id',
      properties: {
        related: {
          predicate: 'http://ex/related',
          termType: 'iri'
        }
      },
      skipNullValues: false
    });

    expect(result.quads).toHaveLength(0);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'missing_subject',
      'invalid_property_value'
    ]);
  });
});

describe('JSON-LD projection depends on RDF quads', () => {
  test('serializes mapped object quads to JSON-LD without a separate app-specific branch', () => {
    const { quads } = createRdfQuadsFromObjects([
      { iri: 'http://ex/cq1', label: 'What assets exist?', source: 'SME' }
    ], {
      subject: 'iri',
      type: 'http://ex/CompetencyQuestion',
      properties: {
        label: 'http://www.w3.org/2000/01/rdf-schema#label',
        source: 'http://purl.org/dc/terms/source'
      }
    });

    const jsonld = serializeRdfDataset(quads, {
      format: 'jsonld',
      context: {
        label: 'http://www.w3.org/2000/01/rdf-schema#label',
        source: 'http://purl.org/dc/terms/source'
      }
    });

    expect(JSON.parse(jsonld.text)).toEqual({
      '@context': {
        label: 'http://www.w3.org/2000/01/rdf-schema#label',
        source: 'http://purl.org/dc/terms/source'
      },
      '@graph': [
        {
          '@id': 'http://ex/cq1',
          '@type': ['http://ex/CompetencyQuestion'],
          label: { '@value': 'What assets exist?' },
          source: { '@value': 'SME' }
        }
      ]
    });
  });

  test('converts simple JSON-LD graph objects back to RDF quads', () => {
    const result = createRdfQuadsFromJsonLdGraph({
      '@context': {
        label: 'http://www.w3.org/2000/01/rdf-schema#label',
        parent: { '@id': 'http://www.w3.org/2000/01/rdf-schema#subClassOf' }
      },
      '@graph': [
        {
          '@id': 'http://ex/A',
          '@type': 'http://www.w3.org/2002/07/owl#Class',
          label: { '@value': 'A', '@language': 'en' },
          parent: { '@id': 'http://ex/B' }
        }
      ]
    });

    expect(result.quads).toEqual(expect.arrayContaining([
      expect.objectContaining({
        predicate: namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
        object: literal('A', { language: 'en' })
      }),
      expect.objectContaining({
        predicate: namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'),
        object: namedNode('http://ex/B')
      })
    ]));
  });

  test('produces stable graph projection from raw quads', () => {
    const graph = rdfDatasetToJsonLdGraph([
      quad('http://ex/s', 'http://ex/p', 'literal value'),
      quad('http://ex/s', 'http://ex/ref', namedNode('http://ex/o'))
    ]);

    expect(graph).toEqual([
      {
        '@id': 'http://ex/s',
        'http://ex/p': { '@value': 'literal value' },
        'http://ex/ref': { '@id': 'http://ex/o' }
      }
    ]);
  });
});

describe('vendor adapter layer', () => {
  test('parses and serializes N3-backed formats through an injected N3 runtime', async () => {
    const runtime = { N3: createMockN3Runtime() };
    const parsed = await parseRdfTextWithAdapters('<http://ex/s> <http://ex/p> "v" .', {
      format: 'turtle',
      runtime
    });

    expect(parsed.sourceFormat).toBe('turtle');
    expect(parsed.quads).toHaveLength(1);
    expect(parsed.prefixes).toEqual({ ex: 'http://ex/' });

    const serialized = await serializeRdfDatasetWithAdapters(parsed.dataset, {
      format: 'turtle',
      runtime,
      prefixes: { ex: 'http://ex/' }
    });
    expect(serialized).toEqual({
      text: '<http://ex/s> <http://ex/p> "v" .\n',
      format: 'turtle',
      mimeType: 'text/turtle',
      warnings: []
    });
  });

  test('serializes N3-backed formats when the runtime only exposes Writer', async () => {
    const runtime = {
      N3: {
        Writer: createMockN3Runtime().Writer
      }
    };

    const serialized = await serializeRdfDatasetWithAdapters([
      quad('http://ex/s', 'http://ex/p', 'v')
    ], {
      format: 'application/n-triples',
      runtime
    });

    expect(serialized.text).toBe('<http://ex/s> <http://ex/p> "v" .\n');
  });

  test('parses line-based RDF without requiring N3 Parser from a partial runtime', async () => {
    const parsed = await parseRdfTextWithAdapters('<http://ex/s> <http://ex/p> "v" .', {
      format: 'application/n-triples',
      runtime: {
        N3: {
          Writer: createMockN3Runtime().Writer
        }
      }
    });

    expect(parsed.quads).toHaveLength(1);
    expect(parsed.quads[0].object.value).toBe('v');
  });

  test('parses and serializes JSON-LD through injected jsonld plus N3 runtimes', async () => {
    const runtime = {
      N3: createMockN3Runtime(),
      jsonld: {
        toRDF: jest.fn(async () => '<http://ex/s> <http://ex/p> "v" .\n'),
        fromRDF: jest.fn(async () => [{ '@id': 'http://ex/s', 'http://ex/p': [{ '@value': 'v' }] }]),
        compact: jest.fn(async (expanded, context) => ({ '@context': context, '@graph': expanded }))
      }
    };

    const parsed = await parseRdfTextWithAdapters('{"@id":"http://ex/s"}', {
      format: 'jsonld',
      runtime
    });
    expect(parsed.sourceFormat).toBe('jsonld');
    expect(parsed.quads).toHaveLength(1);
    expect(runtime.jsonld.toRDF).toHaveBeenCalled();

    const serialized = await serializeRdfDatasetWithAdapters(parsed.dataset, {
      format: 'jsonld',
      runtime,
      context: { p: 'http://ex/p' }
    });
    expect(JSON.parse(serialized.text)).toEqual({
      '@context': { p: 'http://ex/p' },
      '@graph': [{ '@id': 'http://ex/s', 'http://ex/p': [{ '@value': 'v' }] }]
    });
    expect(runtime.jsonld.fromRDF).toHaveBeenCalledWith(expect.stringContaining('<http://ex/s>'), { format: 'application/n-quads' });
  });

  test('parses and serializes RDF/XML through an injected rdflib runtime', async () => {
    const runtime = { $rdf: createMockRdflibRuntime() };
    const parsed = await parseRdfTextWithAdapters('<rdf:RDF />', {
      format: 'rdfxml',
      runtime,
      baseIri: 'http://ex/base'
    });

    expect(parsed.sourceFormat).toBe('rdfxml');
    expect(parsed.quads).toHaveLength(1);
    expect(parsed.quads[0]).toEqual(expect.objectContaining({
      subject: namedNode('http://ex/s'),
      predicate: namedNode('http://ex/p')
    }));

    const serialized = await serializeRdfDatasetWithAdapters(parsed.dataset, {
      format: 'rdfxml',
      runtime,
      baseIri: 'http://ex/base',
      prefixes: { ex: 'http://ex/' }
    });
    expect(serialized.text).toBe('<rdf:RDF />');
    expect(serialized.mimeType).toBe('application/rdf+xml');
  });

  test('expands rdflib Collection terms into RDF list quads', async () => {
    const runtime = {
      $rdf: {
        graph() {
          return { statements: [] };
        },
        parse(_text, graph, _baseIri, _mime, callback) {
          graph.statements.push({
            subject: { termType: 'NamedNode', value: 'http://ex/s' },
            predicate: { termType: 'NamedNode', value: 'http://ex/list' },
            object: {
              termType: 'Collection',
              value: 'items',
              elements: [
                { termType: 'NamedNode', value: 'http://ex/one' },
                { termType: 'NamedNode', value: 'http://ex/two' }
              ]
            }
          });
          callback(null);
        },
        serialize(_target, _graph, _baseIri, _mime, callback) {
          callback(null, '<rdf:RDF />');
        }
      }
    };

    const parsed = await parseRdfTextWithAdapters('<rdf:RDF />', {
      format: 'application/rdf+xml',
      runtime
    });

    expect(parsed.quads).toHaveLength(5);
    expect(parsed.quads).toEqual(expect.arrayContaining([
      expect.objectContaining({
        subject: expect.objectContaining({ value: 'items' }),
        predicate: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first'),
        object: namedNode('http://ex/one')
      }),
      expect.objectContaining({
        predicate: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
        object: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil')
      })
    ]));
  });

  test('accepts rdflib serializers that return RDF/XML text synchronously', async () => {
    const runtime = {
      $rdf: {
        graph() {
          return {
            statements: [],
            add(subject, predicate, object) {
              this.statements.push({ subject, predicate, object });
            }
          };
        },
        parse(_text, graph, _baseIri, _mime, callback) {
          graph.statements.push({
            subject: { termType: 'NamedNode', value: 'http://ex/s' },
            predicate: { termType: 'NamedNode', value: 'http://ex/p' },
            object: { termType: 'Literal', value: 'v' }
          });
          callback(null);
        },
        serialize(_target, graph) {
          expect(graph.statements).toHaveLength(1);
          return '<rdf:RDF />';
        },
        sym(value) {
          return { termType: 'NamedNode', value };
        },
        literal(value, language, datatype) {
          return { termType: 'Literal', value, language: language || '', datatype };
        },
        blankNode(value) {
          return { termType: 'BlankNode', value };
        }
      }
    };

    const parsed = await parseRdfTextWithAdapters('<rdf:RDF />', {
      format: 'rdfxml',
      runtime
    });
    const serialized = await serializeRdfDatasetWithAdapters(parsed.dataset, {
      format: 'rdfxml',
      runtime
    });

    expect(serialized.text).toBe('<rdf:RDF />');
  });
});

function createMockN3Runtime() {
  class Store {
    constructor() {
      this.items = [];
    }
    addQuad(item) {
      this.items.push(item);
    }
    addQuads(items) {
      this.items.push(...items);
    }
    getQuads() {
      return this.items.slice();
    }
    [Symbol.iterator]() {
      return this.items[Symbol.iterator]();
    }
  }

  return {
    Store,
    Parser: class {
      constructor() {
        this._prefixes = { ex: 'http://ex/' };
      }
      parse() {
        return [quad('http://ex/s', 'http://ex/p', 'v')];
      }
    },
    Writer: class {
      constructor() {
        this.items = [];
      }
      addQuads(items) {
        this.items.push(...items);
      }
      end(callback) {
        callback(null, serializeRdfDatasetToNQuads(this.items).replace(/ <[^>]+> \./g, ' .'));
      }
    }
  };
}

function createMockRdflibRuntime() {
  return {
    graph() {
      return {
        statements: [],
        add(subject, predicate, object) {
          this.statements.push({ subject, predicate, object });
        },
        setPrefixForURI(prefix, iri) {
          this.prefixes = { ...(this.prefixes || {}), [prefix]: iri };
        }
      };
    },
    parse(_text, graph, _baseIri, _mime, callback) {
      graph.statements.push({
        subject: { termType: 'NamedNode', value: 'http://ex/s' },
        predicate: { termType: 'NamedNode', value: 'http://ex/p' },
        object: { termType: 'Literal', value: 'v', datatype: { value: 'http://www.w3.org/2001/XMLSchema#string' } }
      });
      callback(null);
    },
    serialize(_target, _graph, _baseIri, _mime, callback) {
      callback(null, '<rdf:RDF />');
    },
    sym(value) {
      return { termType: 'NamedNode', value };
    },
    literal(value, language, datatype) {
      return { termType: 'Literal', value, language: language || '', datatype };
    },
    blankNode(value) {
      return { termType: 'BlankNode', value };
    }
  };
}
