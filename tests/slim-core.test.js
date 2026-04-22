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
    children: [],
    subClassOfAxioms: [{ '@id': 'http://example.org/Parent' }]
  },
  {
    iri: 'http://example.org/Grandchild',
    type: 'Class',
    label: 'Grandchild',
    altLabels: [],
    namespace: 'http://example.org/',
    parents: ['http://example.org/Child'],
    children: [],
    subClassOfAxioms: [{ '@id': 'http://example.org/Child' }]
  },
  {
    iri: 'http://example.org/RestrictedNinja',
    type: 'Class',
    label: 'Restricted Ninja',
    altLabels: [],
    namespace: 'http://example.org/',
    parents: [],
    children: [],
    subClassOfAxioms: [{ '@id': '_:restriction1' }],
    blankNodeMap: {
      '_:restriction1': {
        '@id': '_:restriction1',
        '@type': ['http://www.w3.org/2002/07/owl#Restriction'],
        'http://www.w3.org/2002/07/owl#onProperty': [{ '@id': 'http://example.org/bearerOf' }],
        'http://www.w3.org/2002/07/owl#someValuesFrom': [{ '@id': 'http://example.org/Role' }]
      },
      '_:union1': {
        '@id': '_:union1',
        '@type': ['http://www.w3.org/2002/07/owl#Class'],
        'http://www.w3.org/2002/07/owl#unionOf': [{
          '@list': [
            { '@id': 'http://example.org/Role' },
            { '@id': 'http://example.org/Parent' }
          ]
        }]
      }
    }
  },
  {
    iri: 'http://example.org/Role',
    type: 'Class',
    label: 'Role',
    altLabels: [],
    namespace: 'http://example.org/',
    parents: ['http://example.org/Parent'],
    children: [],
    subClassOfAxioms: [{ '@id': 'http://example.org/Parent' }]
  },
  {
    iri: 'http://example.org/bearerOf',
    type: 'ObjectProperty',
    label: 'bearer of',
    altLabels: [],
    namespace: 'http://example.org/',
    parents: ['http://example.org/relatedTo'],
    children: [],
    subPropertyOfAxioms: [{ '@id': 'http://example.org/relatedTo' }]
  },
  {
    iri: 'http://example.org/relatedTo',
    type: 'ObjectProperty',
    label: 'related to',
    altLabels: [],
    namespace: 'http://example.org/',
    parents: [],
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
      scoMode: 'minimal',
      spoMode: 'minimal',
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

  test('maximal mode follows only blank nodes on SCO/SPO paths and does not grab children', () => {
    const slim = buildSlimFromSeeds(docs, 'http://example.org/RestrictedNinja\n', {
      scoMode: 'maximal',
      spoMode: 'maximal',
      annotationMode: 'minimal',
      provenanceMode: 'lite'
    });

    expect(slim.iris).toEqual([
      'http://example.org/Parent',
      'http://example.org/RestrictedNinja',
      'http://example.org/Role',
      'http://example.org/bearerOf',
      'http://example.org/relatedTo'
    ]);
    expect(slim.iris).not.toContain('http://example.org/Grandchild');
    expect(slim.jsonld['@graph'].some((n) => n['@id'] === '_:restriction1')).toBe(true);
    expect(slim.turtle).toContain('_:restriction1');
    expect(slim.turtle).toContain('http://www.w3.org/2002/07/owl#onProperty');
  });

  test('serializeSlimTurtle emits JSON-LD lists as Turtle collections', () => {
    const slim = buildSlimFromSeeds([{
      iri: 'http://example.org/ListCarrier',
      type: 'Class',
      label: 'List Carrier',
      altLabels: [],
      namespace: 'http://example.org/',
      parents: [],
      children: [],
      subClassOfAxioms: [{ '@id': '_:union1' }],
      blankNodeMap: {
        '_:union1': {
          '@id': '_:union1',
          '@type': ['http://www.w3.org/2002/07/owl#Class'],
          'http://www.w3.org/2002/07/owl#unionOf': [{
            '@list': [
              { '@id': 'http://example.org/A' },
              { '@id': 'http://example.org/B' }
            ]
          }]
        }
      }
    }], 'http://example.org/ListCarrier\n', {
      scoMode: 'maximal',
      spoMode: 'minimal'
    });

    expect(slim.turtle).toContain('<http://www.w3.org/2002/07/owl#unionOf> ( <http://example.org/A> <http://example.org/B> )');
    expect(slim.turtle).not.toContain('[object Object]');
  });

  test('minimal mode does not traverse restriction blank nodes', () => {
    const slim = buildSlimFromSeeds(docs, 'http://example.org/RestrictedNinja\n', {
      scoMode: 'minimal',
      spoMode: 'minimal'
    });

    expect(slim.iris).toEqual(['http://example.org/RestrictedNinja']);
    expect(slim.jsonld['@graph'].some((n) => n['@id'] === '_:restriction1')).toBe(false);
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
