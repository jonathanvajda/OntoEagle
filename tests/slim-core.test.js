import {
  buildSlimFromSeeds,
  parseSeedText,
  serializeSlimTurtle
} from '../docs/app/slim-core.js';

const docs = [
  {
    iri: 'http://example.org/Parent',
    type: 'Class',
    label: 'Parent',
    altLabels: [],
    namespace: 'http://example.org/',
    parents: [],
    children: ['http://example.org/Child'],
    curated_in: ['http://example.org/ontology']
  },
  {
    iri: 'http://example.org/Child',
    type: 'Class',
    label: 'Child',
    altLabels: ['Kid'],
    namespace: 'http://example.org/',
    definition: 'A child class.',
    parents: ['http://example.org/Parent'],
    children: []
  }
];

describe('slim-core.js', () => {
  test('parseSeedText reads one IRI per line and ignores comments', () => {
    expect(parseSeedText('http://example.org/A # label\n\nnot an iri\nhttp://example.org/B\n')).toEqual([
      'http://example.org/A',
      'http://example.org/B'
    ]);
  });

  test('buildSlimFromSeeds expands class parents and serializes JSON-LD/Turtle', () => {
    const slim = buildSlimFromSeeds(docs, 'http://example.org/Child\n', {
      strategy: 'sco',
      annotationMode: 'maximal',
      provenanceMode: 'lite'
    });

    expect(slim.iris).toEqual(['http://example.org/Child', 'http://example.org/Parent']);
    expect(slim.jsonld['@graph'].map((n) => n['@id'])).toEqual([
      'http://example.org/Child',
      'http://example.org/Parent'
    ]);
    expect(slim.turtle).toContain('<http://example.org/Child>');
    expect(slim.turtle).toContain('skos:definition');
  });

  test('serializeSlimTurtle is deterministic for sorted graph nodes', () => {
    const ttl = serializeSlimTurtle({
      '@graph': [
        { '@id': 'http://example.org/B', 'rdfs:label': { '@value': 'B' } },
        { '@id': 'http://example.org/A', 'rdfs:label': { '@value': 'A' } }
      ]
    });
    expect(ttl.indexOf('<http://example.org/B>')).toBeLessThan(ttl.length);
    expect(ttl).toContain('rdfs:label "A"');
  });
});
