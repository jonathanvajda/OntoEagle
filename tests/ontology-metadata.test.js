import {
  buildOpaqueOntologyIri,
  buildReadableOntologyIri,
  createOntologySettingsViewFromMetadataRecord,
  collectUsedOpaqueOntologyIriNumbers,
  deriveOntologyImportTarget,
  findMaxOpaqueOntologyIriNumber,
  findNextAvailableOpaqueOntologyIriNumber,
  generateOntologySettings,
  getJsonLdGraphNodes,
  normalizeOntologyMetadataRecord,
  ONTOLOGY_METADATA_PROFILE_SETTING_KEY,
  readOntologyMetadataRecordFromQuads,
  writeOntologyMetadataQuads,
  readOntologyRecordsFromJsonLd
} from '../docs/app/shared/ontology-metadata/index.js';
import { COMMON_NAMESPACE_IRIS } from '../docs/app/shared/namespace-registry/index.js';
import { createRdfDataset } from '../docs/app/shared/rdf-io/rdf-model.js';

describe('ontology-metadata shared package', () => {
  test('reads ontology metadata from JSON-LD object and graph forms', () => {
    const jsonld = {
      '@graph': [
        {
          '@id': 'https://example.org/ont',
          '@type': [{ '@id': COMMON_NAMESPACE_IRIS.owl.Ontology }],
          [COMMON_NAMESPACE_IRIS.dcterms.title]: [
            { '@value': 'Ontologia', '@language': 'pt' },
            { '@value': 'Example Ontology', '@language': 'en' }
          ],
          [COMMON_NAMESPACE_IRIS.dc.description]: { '@value': 'Scope statement', '@language': 'en' },
          [COMMON_NAMESPACE_IRIS.owl.versionIRI]: { '@id': 'https://example.org/2026/ont' },
          [COMMON_NAMESPACE_IRIS.owl.imports]: [{ '@id': 'https://example.org/imported' }],
          [COMMON_NAMESPACE_IRIS.dcterms.creator]: [
            { '@id': 'https://orcid.org/0000-0000-0000-0000' },
            { '@value': 'Text Creator' }
          ]
        }
      ]
    };

    expect(getJsonLdGraphNodes(jsonld)).toHaveLength(1);
    const result = readOntologyRecordsFromJsonLd(jsonld);

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      iri: 'https://example.org/ont',
      label: 'Example Ontology',
      description: 'Scope statement',
      versionIri: 'https://example.org/2026/ont',
      imports: ['https://example.org/imported']
    });
    expect(result.records[0].creators).toEqual([
      { value: 'https://orcid.org/0000-0000-0000-0000', type: 'iri', language: '' },
      { value: 'Text Creator', type: 'literal', language: '' }
    ]);
    expect(result.versionToOntologyIri.get('https://example.org/2026/ont')).toBe('https://example.org/ont');
  });

  test('generates canonical ontology settings with registry-backed predicates', () => {
    const settings = generateOntologySettings({
      base: 'https://example.org',
      label: 'Test Ontology',
      creator: 'Jonathan Vajda',
      description: 'A test ontology',
      dateParts: { year: '2026', month: '08', day: '10' }
    });

    expect(settings).toMatchObject({
      '@id': 'https://example.org/TestOntology',
      [COMMON_NAMESPACE_IRIS.owl.versionIRI]: [{ '@id': 'https://example.org/2026-08-10/TestOntology' }],
      [COMMON_NAMESPACE_IRIS.owl.versionInfo]: [{ '@value': '2026-08-10' }],
      [COMMON_NAMESPACE_IRIS.dcterms.title]: [{ '@value': 'Test Ontology', '@language': 'en' }],
      [COMMON_NAMESPACE_IRIS.dcterms.creator]: [{ '@value': 'Jonathan Vajda' }],
      [COMMON_NAMESPACE_IRIS.dcterms.description]: [{ '@value': 'A test ontology', '@language': 'en' }],
      [COMMON_NAMESPACE_IRIS.okea.hasIriPolicyModeTextValue]: [{ '@value': 'opaque' }],
      [COMMON_NAMESPACE_IRIS.okea.hasOpaqueIriLocalNamePrefixTextValue]: [{ '@value': 'ont' }],
      [COMMON_NAMESPACE_IRIS.okea.hasOpaqueIriLocalNameIntegerWidthValue]: [{ '@value': 6, '@type': COMMON_NAMESPACE_IRIS.xsd.nonNegativeInteger }],
      [COMMON_NAMESPACE_IRIS.okea.hasOpaqueIriLocalNameIntegerStartValue]: [{ '@value': 1, '@type': COMMON_NAMESPACE_IRIS.xsd.integer }],
      [COMMON_NAMESPACE_IRIS.okea.hasIriLocalNameStyleTextValue]: [{ '@value': 'PascalCase' }]
    });
    expect(settings.iriMode).toBeUndefined();

    expect(createOntologySettingsViewFromMetadataRecord(settings)).toMatchObject({
      iri: 'https://example.org/TestOntology',
      iriMode: 'opaque',
      opaqueLeading: 'ont',
      opaqueDigits: 6,
      opaqueStart: 1,
      readableCase: 'PascalCase'
    });
  });

  test('normalizes legacy settings into canonical full-IRI ontology metadata records', () => {
    const record = normalizeOntologyMetadataRecord({
      iri: 'https://example.org/ExampleOntology',
      base: 'https://example.org',
      label: 'Example Ontology',
      creator: ['https://orcid.org/0000-0000-0000-0000', 'Text Creator'],
      contributors: ['Contributor'],
      iriMode: 'readable',
      delimiter: '#',
      opaqueLeading: 'ONT_',
      opaqueDigits: 5,
      opaqueStart: 10,
      readableCase: 'snake_case'
    });

    expect(ONTOLOGY_METADATA_PROFILE_SETTING_KEY).toBe(COMMON_NAMESPACE_IRIS.okea.OntologyMetadataProfile);
    expect(record).toMatchObject({
      '@id': 'https://example.org/ExampleOntology',
      '@type': [COMMON_NAMESPACE_IRIS.owl.Ontology],
      [COMMON_NAMESPACE_IRIS.dcterms.title]: [{ '@value': 'Example Ontology', '@language': 'en' }],
      [COMMON_NAMESPACE_IRIS.dcterms.creator]: [
        { '@id': 'https://orcid.org/0000-0000-0000-0000' },
        { '@value': 'Text Creator' }
      ],
      [COMMON_NAMESPACE_IRIS.dcterms.contributor]: [{ '@value': 'Contributor' }],
      [COMMON_NAMESPACE_IRIS.okea.hasOntologyBaseIri]: [{ '@value': 'https://example.org', '@type': COMMON_NAMESPACE_IRIS.xsd.anyURI }],
      [COMMON_NAMESPACE_IRIS.okea.hasIriPolicyModeTextValue]: [{ '@value': 'readable' }],
      [COMMON_NAMESPACE_IRIS.okea.hasIriLocalNameDelimiterTextValue]: [{ '@value': '#' }],
      [COMMON_NAMESPACE_IRIS.okea.hasOpaqueIriLocalNamePrefixTextValue]: [{ '@value': 'ONT_' }],
      [COMMON_NAMESPACE_IRIS.okea.hasOpaqueIriLocalNameIntegerWidthValue]: [{ '@value': 5, '@type': COMMON_NAMESPACE_IRIS.xsd.nonNegativeInteger }],
      [COMMON_NAMESPACE_IRIS.okea.hasOpaqueIriLocalNameIntegerStartValue]: [{ '@value': 10, '@type': COMMON_NAMESPACE_IRIS.xsd.integer }],
      [COMMON_NAMESPACE_IRIS.okea.hasIriLocalNameStyleTextValue]: [{ '@value': 'snake_case' }]
    });

    expect(createOntologySettingsViewFromMetadataRecord(record)).toMatchObject({
      iri: 'https://example.org/ExampleOntology',
      [COMMON_NAMESPACE_IRIS.rdfs.label]: 'Example Ontology',
      [COMMON_NAMESPACE_IRIS.dcterms.creator]: 'https://orcid.org/0000-0000-0000-0000',
      [COMMON_NAMESPACE_IRIS.dcterms.contributor]: ['Contributor'],
      base: 'https://example.org',
      delimiter: '#',
      iriMode: 'readable',
      opaqueLeading: 'ONT_',
      opaqueDigits: 5,
      opaqueStart: 10,
      readableCase: 'snake_case'
    });
  });

  test('writes ontology metadata records to RDF quads and reads them back', () => {
    const record = normalizeOntologyMetadataRecord({
      iri: 'https://example.org/ExampleOntology',
      base: 'https://example.org',
      label: 'Example Ontology',
      description: 'A reusable test ontology.',
      createdAtIso: '2026-08-10T15:32:45.000Z',
      [COMMON_NAMESPACE_IRIS.dcterms.format]: 'text/turtle',
      [COMMON_NAMESPACE_IRIS.dcterms.source]: 'source-file.csv',
      [COMMON_NAMESPACE_IRIS.owl.imports]: ['https://example.org/imported'],
      [COMMON_NAMESPACE_IRIS.dcterms.creator]: [
        'https://orcid.org/0000-0000-0000-0000',
        'Text Creator'
      ],
      [COMMON_NAMESPACE_IRIS.okea.hasGeneratingSoftwareApplicationName]: 'Table-Nova',
      [COMMON_NAMESPACE_IRIS.okea.hasGenerationRunIdentifier]: 'run:table-nova:test',
      [COMMON_NAMESPACE_IRIS.okea.hasGitRepositoryUrl]: 'https://github.com/example/ontology'
    });

    const quads = writeOntologyMetadataQuads(record, { graph: 'https://example.org/metadataGraph' });

    expect(quads).toEqual(expect.arrayContaining([
      expect.objectContaining({
        subject: expect.objectContaining({ value: 'https://example.org/ExampleOntology' }),
        predicate: expect.objectContaining({ value: COMMON_NAMESPACE_IRIS.rdf.type }),
        object: expect.objectContaining({ value: COMMON_NAMESPACE_IRIS.owl.Ontology }),
        graph: expect.objectContaining({ value: 'https://example.org/metadataGraph' })
      }),
      expect.objectContaining({
        predicate: expect.objectContaining({ value: COMMON_NAMESPACE_IRIS.dcterms.title }),
        object: expect.objectContaining({ value: 'Example Ontology', language: 'en' })
      }),
      expect.objectContaining({
        predicate: expect.objectContaining({ value: COMMON_NAMESPACE_IRIS.owl.imports }),
        object: expect.objectContaining({ termType: 'NamedNode', value: 'https://example.org/imported' })
      }),
      expect.objectContaining({
        predicate: expect.objectContaining({ value: COMMON_NAMESPACE_IRIS.okea.hasGitRepositoryUrl }),
        object: expect.objectContaining({ value: 'https://github.com/example/ontology' })
      }),
      expect.objectContaining({
        predicate: expect.objectContaining({ value: COMMON_NAMESPACE_IRIS.dcterms.format }),
        object: expect.objectContaining({ value: 'text/turtle' })
      }),
      expect.objectContaining({
        predicate: expect.objectContaining({ value: COMMON_NAMESPACE_IRIS.dcterms.source }),
        object: expect.objectContaining({ value: 'source-file.csv' })
      }),
      expect.objectContaining({
        predicate: expect.objectContaining({ value: COMMON_NAMESPACE_IRIS.okea.hasGenerationRunIdentifier }),
        object: expect.objectContaining({ value: 'run:table-nova:test' })
      })
    ]));

    const dataset = createRdfDataset(quads);
    const roundTrip = readOntologyMetadataRecordFromQuads(dataset);
    expect(roundTrip['@id']).toBe('https://example.org/ExampleOntology');
    expect(roundTrip[COMMON_NAMESPACE_IRIS.dcterms.title]).toEqual([{ '@value': 'Example Ontology', '@language': 'en' }]);
    expect(roundTrip[COMMON_NAMESPACE_IRIS.owl.imports]).toEqual([{ '@id': 'https://example.org/imported' }]);
    expect(roundTrip[COMMON_NAMESPACE_IRIS.dcterms.creator]).toEqual([
      { '@id': 'https://orcid.org/0000-0000-0000-0000' },
      { '@value': 'Text Creator' }
    ]);
    expect(roundTrip[COMMON_NAMESPACE_IRIS.dcterms.created]).toEqual([{ '@value': '2026-08-10T15:32:45.000Z', '@type': COMMON_NAMESPACE_IRIS.xsd.dateTime }]);
    expect(roundTrip[COMMON_NAMESPACE_IRIS.dcterms.source]).toEqual([{ '@value': 'source-file.csv' }]);
    expect(roundTrip[COMMON_NAMESPACE_IRIS.okea.hasGeneratingSoftwareApplicationName]).toEqual([{ '@value': 'Table-Nova' }]);
  });

  test('requires ontology metadata @id before writing quads', () => {
    expect(() => writeOntologyMetadataQuads({ label: 'Missing IRI' })).toThrow(/@id/);
  });

  test('derives import target from ontology quads and prefers owl:versionIRI', () => {
    const quads = [
      {
        subject: { value: 'https://example.org/ont' },
        predicate: { value: COMMON_NAMESPACE_IRIS.rdf.type },
        object: { value: COMMON_NAMESPACE_IRIS.owl.Ontology }
      },
      {
        subject: { value: 'https://example.org/ont' },
        predicate: { value: COMMON_NAMESPACE_IRIS.owl.versionIRI },
        object: { value: 'https://example.org/2026/ont' }
      }
    ];

    expect(deriveOntologyImportTarget(quads)).toEqual({
      ontologyIri: 'https://example.org/ont',
      importIri: 'https://example.org/2026/ont'
    });
  });

  test('provisions opaque and readable ontology IRIs', () => {
    const settings = {
      base: 'https://example.org',
      delimiter: '/',
      opaqueLeading: 'ont',
      opaqueDigits: 6,
      opaqueStart: 1,
      readableCase: 'snake_case'
    };

    const used = collectUsedOpaqueOntologyIriNumbers([
      'https://example.org/ont000001',
      'https://example.org/ont000003',
      'https://example.org/not-a-match'
    ], settings);

    expect([...used].sort()).toEqual([1, 3]);
    expect(findMaxOpaqueOntologyIriNumber(used, settings)).toBe(3);
    expect(findNextAvailableOpaqueOntologyIriNumber(used, settings, 1)).toBe(2);
    expect(buildOpaqueOntologyIri(2, settings)).toBe('https://example.org/ont000002');
    expect(buildReadableOntologyIri('Example Entity', settings, new Set(['https://example.org/example_entity']))).toBe('https://example.org/example_entity_2');
  });
});
