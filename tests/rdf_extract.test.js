import {
  parseGraphJsonLdText,
  extractDocumentsFromJsonLd,
  inferElementType,
  computeNamespace,
  valueToStrings,
  valueToIris,
  ADDED_BY_USER_IRI
} from '../docs/app/rdf_extract.js';

describe('rdf_extract.js', () => {
  test('parseGraphJsonLdText parses valid JSON', () => {
    const obj = parseGraphJsonLdText('{"@graph": []}');
    expect(obj).toEqual({ '@graph': [] });
  });

  test('valueToStrings handles strings, @value, arrays', () => {
    expect(valueToStrings('x')).toEqual(['x']);
    expect(valueToStrings({ '@value': 'y' })).toEqual(['y']);
    expect(valueToStrings(['a', { '@value': 'b' }])).toEqual(['a', 'b']);
  });

  test('valueToIris handles named JSON-LD references and skips blank nodes', () => {
    expect(valueToIris([{ '@id': 'http://example.org/A' }, { '@id': '_:b1' }])).toEqual(['http://example.org/A']);
  });

  test('computeNamespace splits on # or /', () => {
    expect(computeNamespace('http://x.org/a#B')).toBe('http://x.org/a#');
    expect(computeNamespace('http://x.org/a/b/C')).toBe('http://x.org/a/b/');
  });

  test('inferElementType detects OWL class/property types', () => {
    expect(inferElementType(['owl:Class'])).toBe('Class');
    expect(inferElementType(['http://www.w3.org/2002/07/owl#ObjectProperty'])).toBe('ObjectProperty');
    expect(inferElementType(['http://www.w3.org/2002/07/owl#Ontology'])).toBe('Ontology');
  });

  test('extractDocumentsFromJsonLd extracts docs from @graph', () => {
    const json = {
      '@graph': [
        {
          '@id': 'http://example.org/ont#Vehicle',
          '@type': ['owl:Class'],
          'rdfs:label': [{ '@value': 'Vehicle' }],
          'skos:definition': [{ '@value': 'A thing that transports.' }],
          'skos:altLabel': [{ '@value': 'Conveyance' }]
        },
        {
          '@id': 'http://example.org/ont#hasPart',
          '@type': ['owl:ObjectProperty'],
          'rdfs:label': 'has part'
        }
      ]
    };

    const docs = extractDocumentsFromJsonLd(json);
    expect(docs.length).toBe(2);

    const vehicle = docs.find(d => d.iri.endsWith('#Vehicle'));
    expect(vehicle.type).toBe('Class');
    expect(vehicle.label).toBe('Vehicle');
    expect(vehicle.definition).toBe('A thing that transports.');
    expect(vehicle.altLabels).toContain('Conveyance');
  });

  test('extractDocumentsFromJsonLd extracts hierarchy links and user-added flag', () => {
    const json = {
      '@graph': [
        {
          '@id': 'http://example.org/Parent',
          '@type': ['owl:Class'],
          'rdfs:label': 'Parent',
          'skos:narrower': [{ '@id': 'http://example.org/SkosChild' }]
        },
        {
          '@id': 'http://example.org/Child',
          '@type': ['owl:Class'],
          'rdfs:label': 'Child',
          'rdfs:subClassOf': [{ '@id': 'http://example.org/Parent' }],
          [ADDED_BY_USER_IRI]: [{ '@value': 'TRUE' }]
        },
        {
          '@id': 'http://example.org/SkosChild',
          '@type': ['owl:Class'],
          'rdfs:label': 'SKOS Child'
        },
        {
          '@id': 'http://example.org/BroaderChild',
          '@type': ['owl:Class'],
          'rdfs:label': 'Broader Child',
          'skos:broader': [{ '@id': 'http://example.org/Parent' }]
        }
      ]
    };

    const docs = extractDocumentsFromJsonLd(json);
    const parent = docs.find(d => d.iri.endsWith('/Parent'));
    const child = docs.find(d => d.iri.endsWith('/Child'));
    const skosChild = docs.find(d => d.iri.endsWith('/SkosChild'));
    const broaderChild = docs.find(d => d.iri.endsWith('/BroaderChild'));

    expect(child.parents).toContain('http://example.org/Parent');
    expect(child.addedByUser).toBe(true);
    expect(skosChild.parents).toContain('http://example.org/Parent');
    expect(broaderChild.parents).toContain('http://example.org/Parent');
    expect(parent.children).toEqual(expect.arrayContaining([
      'http://example.org/Child',
      'http://example.org/SkosChild',
      'http://example.org/BroaderChild'
    ]));
  });
});
