import {
  RDF_TYPE,
  createRdfDataset,
  createRdfQuadsFromJsonLdGraph,
  createRdfQuadsFromObjects,
  literal,
  namedNode,
  parseRdfText,
  quad,
  rdfDatasetToJsonLdGraph,
  serializeRdfDataset,
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
