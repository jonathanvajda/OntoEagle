import {
  parseGraphJsonLdText,
  extractDocumentsFromJsonLd,
  inferElementType,
  computeNamespace,
  valueToStrings,
  valueToIris,
  valueToDisplayValues,
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

  test('valueToDisplayValues preserves typed URI literals and named IRIs', () => {
    expect(valueToDisplayValues({ '@value': 'https://example.org/source', '@type': 'http://www.w3.org/2001/XMLSchema#anyURI' }))
      .toEqual([{ value: 'https://example.org/source', datatype: 'http://www.w3.org/2001/XMLSchema#anyURI' }]);
    expect(valueToDisplayValues({ '@id': 'http://example.org/A' }))
      .toEqual([{ value: 'http://example.org/A', iri: 'http://example.org/A' }]);
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
          'skos:altLabel': [{ '@value': 'Conveyance' }],
          'http://purl.org/dc/terms/bibliographicCitation': [{ '@value': 'https://example.org/citation', '@type': 'http://www.w3.org/2001/XMLSchema#anyURI' }],
          'http://www.ontologyrepository.com/CommonCoreOntologies/definition_source': [{ '@value': 'Source text' }],
          'http://purl.obolibrary.org/obo/IAO_0000600': [{ '@value': 'Clarifying note.' }],
          'http://purl.obolibrary.org/obo/IAO_0000112': [{ '@value': 'Vehicle example.' }],
          'rdfs:comment': [{ '@value': 'Comment text.' }],
          'http://purl.obolibrary.org/obo/IAO_0000232': [{ '@value': 'Curator note.' }],
          'rdfs:subClassOf': [{ '@id': 'http://example.org/ont#Artifact' }],
          'owl:disjointWith': [{ '@id': 'http://example.org/ont#Process' }]
        },
        {
          '@id': 'http://example.org/ont#hasPart',
          '@type': ['owl:ObjectProperty'],
          'rdfs:label': 'has part',
          'rdfs:domain': [{ '@id': 'http://example.org/ont#Whole' }],
          'rdfs:range': [{ '@id': 'http://example.org/ont#Part' }]
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
    expect(vehicle.citations[0].datatype).toBe('http://www.w3.org/2001/XMLSchema#anyURI');
    expect(vehicle.definitionSources[0].value).toBe('Source text');
    expect(vehicle.clarifications[0].value).toBe('Clarifying note.');
    expect(vehicle.examples[0].value).toBe('Vehicle example.');
    expect(vehicle.comments[0].value).toBe('Comment text.');
    expect(vehicle.curatorNotes[0].value).toBe('Curator note.');
    expect(vehicle.subClassOf).toContain('http://example.org/ont#Artifact');
    expect(vehicle.disjointWith).toContain('http://example.org/ont#Process');

    const hasPart = docs.find(d => d.iri.endsWith('#hasPart'));
    expect(hasPart.domains).toContain('http://example.org/ont#Whole');
    expect(hasPart.ranges).toContain('http://example.org/ont#Part');
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
