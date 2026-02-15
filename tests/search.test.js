// tests/search.test.js
import { searchDocuments, docPassesFilters } from '../docs/app/search.js';

/** @type {import('../docs/app/types.js').OntologyDocument[]} */
const docs = [
  {
    iri: 'http://example.org/ont#Vehicle',
    type: 'Class',
    label: 'Vehicle',
    altLabels: ['Conveyance'],
    namespace: 'http://example.org/ont#',
    definition: 'A material entity designed to transport people or goods.',
    citations: ['Example Citation 2026'],
    examples: ['Car', 'Truck'],
    clarifications: ['Not a biological organism.']
  },
  {
    iri: 'http://example.org/ont#hasPart',
    type: 'ObjectProperty',
    label: 'has part',
    altLabels: ['hasPart'],
    namespace: 'http://example.org/ont#',
    definition: 'Relates a whole to one of its parts.',
    citations: [],
    examples: [],
    clarifications: []
  },
  {
    iri: 'http://example.org/ont#Person',
    type: 'Class',
    label: 'Person',
    altLabels: ['Human being'],
    namespace: 'http://example.org/ont#',
    definition: 'A human individual.',
    citations: [],
    examples: [],
    clarifications: []
  }
];

const docsByIri = new Map(docs.map((d) => [d.iri, d]));

/** @type {import('../docs/app/types.js').SearchOptions} */
const BASE_OPTS = {
  exact: false,
  wildcard: true,
  types: ['Ontology','Class','ObjectProperty','DatatypeProperty','AnnotationProperty','NamedIndividual','Other'],
  namespaces: [],
  includeDefinition: true,
  includeCitation: false,
  includeExamples: false,
  includeClarifications: false
};

describe('search.js', () => {
  test('docPassesFilters: type filtering works', () => {
    const opts = { ...BASE_OPTS, types: ['Class'] };
    expect(docPassesFilters(docsByIri.get('http://example.org/ont#Vehicle'), opts)).toBe(true);
    expect(docPassesFilters(docsByIri.get('http://example.org/ont#hasPart'), opts)).toBe(false);
  });

  test('docPassesFilters: namespace filtering works by namespace IRI prefix', () => {
    const opts = { ...BASE_OPTS, namespaces: ['http://example.org/ont#'] };
    expect(docPassesFilters(docsByIri.get('http://example.org/ont#Vehicle'), opts)).toBe(true);
  });

  test('searchDocuments: wildcard finds label match', () => {
    const opts = { ...BASE_OPTS, wildcard: true, exact: false };
    const { results } = searchDocuments(docsByIri, 'vehicle', opts, 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].doc.iri).toBe('http://example.org/ont#Vehicle');
  });

  test('searchDocuments: wildcard finds IRI match', () => {
    const opts = { ...BASE_OPTS, wildcard: true, exact: false };
    const { results } = searchDocuments(docsByIri, 'hasPart', opts, 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].doc.iri).toBe('http://example.org/ont#hasPart');
  });

  test('searchDocuments: exact mode requires exact field equality (label)', () => {
    const opts = { ...BASE_OPTS, exact: true, wildcard: false };
    const { results } = searchDocuments(docsByIri, 'vehicle', opts, 10);
    // label is "Vehicle" -> normalized matches exactly
    expect(results.length).toBe(1);
    expect(results[0].doc.iri).toBe('http://example.org/ont#Vehicle');

    const { results: results2 } = searchDocuments(docsByIri, 'veh', opts, 10);
    expect(results2.length).toBe(0);
  });

  test('searchDocuments: quoted phrases are treated as a single token', () => {
    const opts = { ...BASE_OPTS, wildcard: true, exact: false, includeDefinition: true };
    const { results } = searchDocuments(docsByIri, '"material entity"', opts, 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].doc.iri).toBe('http://example.org/ont#Vehicle');
  });

  test('searchDocuments: definition field can be excluded', () => {
    const optsInclude = { ...BASE_OPTS, includeDefinition: true };
    const optsExclude = { ...BASE_OPTS, includeDefinition: false };

    const { results: a } = searchDocuments(docsByIri, 'transport', optsInclude, 10);
    expect(a.length).toBeGreaterThan(0);

    const { results: b } = searchDocuments(docsByIri, 'transport', optsExclude, 10);
    // "transport" only appears in Vehicle definition in this fixture
    expect(b.length).toBe(0);
  });

  test('searchDocuments: type filter can exclude otherwise matching docs', () => {
    const opts = { ...BASE_OPTS, types: ['ObjectProperty'] };
    const { results } = searchDocuments(docsByIri, 'vehicle', opts, 10);
    expect(results.length).toBe(0);
  });

  test('searchDocuments: tie-breakers are stable (score then label)', () => {
    const opts = { ...BASE_OPTS, wildcard: true, exact: false, includeDefinition: false };
    const { results } = searchDocuments(docsByIri, 'person', opts, 10);
    expect(results.length).toBeGreaterThan(0);
    // "Person" should win on label
    expect(results[0].doc.iri).toBe('http://example.org/ont#Person');
  });
});
