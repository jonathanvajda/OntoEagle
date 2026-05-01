import {
  buildImportGraph,
  buildMermaidImportSyntax,
  exportRegistryJson,
  extractOntologyRecordsFromJsonLd,
  mergeOntologyRecordsWithRegistry,
  mergeRegistryEntries,
  resolveOntologyIri,
  termsForOntology,
  truncateText
} from '../docs/app/ontology-meta.js';

describe('ontology-meta.js', () => {
  const jsonld = [
    {
      '@id': 'https://example.org/ontology1',
      '@type': ['http://www.w3.org/2002/07/owl#Ontology'],
      'http://purl.org/dc/terms/title': [{ '@value': 'Ontology 1' }],
      'http://purl.org/dc/terms/description': [{ '@value': 'A useful ontology.' }],
      'http://www.w3.org/2002/07/owl#imports': [
        { '@id': 'https://example.org/ontology2' },
        { '@id': 'https://example.org/2026-04-01/ontology3' }
      ]
    },
    {
      '@id': 'https://example.org/ontology2',
      '@type': ['http://www.w3.org/2002/07/owl#Ontology'],
      'http://purl.org/dc/elements/1.1/title': [{ '@value': 'Ontology 2' }],
      'http://www.w3.org/2002/07/owl#imports': [{ '@id': 'https://example.org/ontology4' }]
    },
    {
      '@id': 'https://example.org/ontology3',
      '@type': ['http://www.w3.org/2002/07/owl#Ontology'],
      'http://www.w3.org/2000/01/rdf-schema#label': [{ '@value': 'Ontology 3' }],
      'http://www.w3.org/2002/07/owl#versionIRI': [{ '@id': 'https://example.org/2026-04-01/ontology3' }],
      'http://www.w3.org/2002/07/owl#imports': [{ '@id': 'https://example.org/ontology4' }]
    },
    {
      '@id': 'https://example.org/ontology4',
      '@type': ['http://www.w3.org/2002/07/owl#Ontology'],
      'http://purl.org/dc/terms/title': [{ '@value': 'Ontology 4' }]
    }
  ];

  test('extractOntologyRecordsFromJsonLd handles top-level arrays and fallback labels', () => {
    const index = extractOntologyRecordsFromJsonLd(jsonld);
    expect(index.records).toHaveLength(4);
    expect(index.byIri.get('https://example.org/ontology1').label).toBe('Ontology 1');
    expect(index.byIri.get('https://example.org/ontology2').label).toBe('Ontology 2');
    expect(index.byIri.get('https://example.org/ontology3').label).toBe('Ontology 3');
    expect(index.versionToOntologyIri.get('https://example.org/2026-04-01/ontology3')).toBe('https://example.org/ontology3');
  });

  test('registry merge prefers overrides and applies records', () => {
    const defaults = [{ iri: 'https://example.org/ontology1', ontology_level: 'top', git_logo: 'github', file: './ontologies/one.ttl' }];
    const overrides = [{ iri: 'https://example.org/ontology1', ontology_level: 'mid', git_logo: 'gitlab', git_repo_url: 'https://gitlab.example/repo' }];
    const registry = mergeRegistryEntries(defaults, overrides);
    expect(registry).toHaveLength(1);
    expect(registry[0].ontology_level).toBe('mid');

    const records = mergeOntologyRecordsWithRegistry(extractOntologyRecordsFromJsonLd(jsonld).records, registry);
    expect(records.find((record) => record.iri.endsWith('ontology1')).git_logo).toBe('gitlab');
  });

  test('import graph resolves version IRIs transitively', () => {
    const index = extractOntologyRecordsFromJsonLd(jsonld);
    expect(resolveOntologyIri('https://example.org/2026-04-01/ontology3', index)).toBe('https://example.org/ontology3');
    const graph = buildImportGraph('https://example.org/ontology1', index);
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'https://example.org/ontology1', target: 'https://example.org/ontology2' }),
      expect.objectContaining({ source: 'https://example.org/ontology1', target: 'https://example.org/ontology3' }),
      expect.objectContaining({ source: 'https://example.org/ontology2', target: 'https://example.org/ontology4' }),
      expect.objectContaining({ source: 'https://example.org/ontology3', target: 'https://example.org/ontology4' })
    ]));
  });

  test('buildMermaidImportSyntax emits flowchart BT', () => {
    const index = extractOntologyRecordsFromJsonLd(jsonld);
    const { syntax } = buildMermaidImportSyntax('https://example.org/ontology1', index);
    expect(syntax).toContain('flowchart BT;');
    expect(syntax).toContain('owl:imports');
    expect(syntax).toContain('Ontology 3');
  });

  test('termsForOntology filters by curated_in', () => {
    const rows = termsForOntology('https://example.org/ontology1', [
      { iri: 'https://example.org/A', type: 'Class', label: 'A', altLabels: ['Alpha'], definition: 'First', curated_in: ['https://example.org/ontology1'] },
      { iri: 'https://example.org/B', type: 'Class', label: 'B', altLabels: [], definition: 'Second', curated_in: ['https://example.org/ontology2'] },
      { iri: 'https://example.org/O', type: 'Ontology', label: 'O', curated_in: ['https://example.org/ontology1'] }
    ]);
    expect(rows).toEqual([{ iri: 'https://example.org/A', type: 'Class', label: 'A', synonym: 'Alpha', definition: 'First' }]);
  });

  test('truncateText and exportRegistryJson are deterministic', () => {
    expect(truncateText('short text').truncated).toBe(false);
    expect(truncateText('word '.repeat(400)).truncated).toBe(true);
    expect(exportRegistryJson([{ iri: 'x', ontology_level: 'top', git_logo: 'github' }])).toContain('"iri": "x"');
  });
});
