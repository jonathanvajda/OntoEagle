import {
  parseGraphJsonLdText,
  extractDocumentsFromJsonLd,
  inferElementType,
  computeNamespace,
  valueToStrings
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
});
