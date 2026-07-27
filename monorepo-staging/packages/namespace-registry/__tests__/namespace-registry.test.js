import {
  COMMON_NAMESPACE_REGISTRY,
  applyPrefixesToRdflibStore,
  compactIriToCurie,
  createN3WriterOptionsWithPrefixes,
  deriveNamespaceStemFromIri,
  discoverBaseIriOrNamespaceStem,
  expandCurieToIri,
  extractJsonLdContextPrefixes,
  extractRdfPrefixesFromText,
  extractSparqlPrefixesFromText,
  extractTurtlePrefixDeclarations,
  extractXmlNamespacePrefixes,
  findLongestPrefixMatch,
  formatSparqlPrefixDeclarations,
  iriForNamespaceId,
  listNamespaceStemsInStore,
  mergeProjectPrefixes,
  namespacePrefixMapFromRegistry,
  namespaceToPrefixMap,
  normalizePrefixMap,
  prependSparqlPrefixes,
  saveProjectPrefixes
} from '../src/index.js';

describe('namespace-registry package', () => {
  test('COMMON_NAMESPACE_REGISTRY exposes immutable common namespace facts and IDs', () => {
    expect(COMMON_NAMESPACE_REGISTRY.rdf.namespaceIri).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
    expect(COMMON_NAMESPACE_REGISTRY.rdfs.ids.label).toBe('label');
    expect(Object.isFrozen(COMMON_NAMESPACE_REGISTRY.owl.ids)).toBe(true);

    expect(namespacePrefixMapFromRegistry()).toMatchObject({
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      owl: 'http://www.w3.org/2002/07/owl#',
      cco: 'http://www.ontologyrepository.com/CommonCoreOntologies/',
      bfo: 'http://purl.obolibrary.org/obo/BFO_',
      iao: 'http://purl.obolibrary.org/obo/IAO_',
      oboInOwl: 'http://www.geneontology.org/formats/oboInOwl#',
      foaf: 'http://xmlns.com/foaf/0.1/',
      prov: 'http://www.w3.org/ns/prov#',
      dcat: 'http://www.w3.org/ns/dcat#',
      geo: 'http://www.w3.org/2003/01/geo/wgs84_pos#',
      geojson: 'https://purl.org/geojson/vocab#',
      vcard: 'http://www.w3.org/2006/vcard/ns#'
    });
    expect(namespaceToPrefixMap({ rdf: COMMON_NAMESPACE_REGISTRY.rdf.namespaceIri })).toEqual({
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf'
    });
    expect(iriForNamespaceId('rdf', 'type')).toEqual({
      ok: true,
      value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
    });
  });

  test('COMMON_NAMESPACE_REGISTRY covers common OWL, SKOS, XSD, and DCTERMS IDs', () => {
    expect(COMMON_NAMESPACE_REGISTRY.owl.ids).toMatchObject({
      ObjectProperty: 'ObjectProperty',
      DatatypeProperty: 'DatatypeProperty',
      AnnotationProperty: 'AnnotationProperty',
      Restriction: 'Restriction',
      inverseOf: 'inverseOf',
      someValuesFrom: 'someValuesFrom',
      versionInfo: 'versionInfo'
    });
    expect(COMMON_NAMESPACE_REGISTRY.skos.ids).toMatchObject({
      Concept: 'Concept',
      ConceptScheme: 'ConceptScheme',
      hiddenLabel: 'hiddenLabel',
      scopeNote: 'scopeNote',
      exactMatch: 'exactMatch'
    });
    expect(COMMON_NAMESPACE_REGISTRY.xsd.ids).toMatchObject({
      anyURI: 'anyURI',
      normalizedString: 'normalizedString',
      nonNegativeInteger: 'nonNegativeInteger',
      unsignedInt: 'unsignedInt'
    });
    expect(COMMON_NAMESPACE_REGISTRY.dcterms.ids).toMatchObject({
      created: 'created',
      modified: 'modified',
      creator: 'creator',
      contributor: 'contributor',
      bibliographicCitation: 'bibliographicCitation',
      conformsTo: 'conformsTo'
    });

    expect(iriForNamespaceId('owl', 'ObjectProperty')).toEqual({
      ok: true,
      value: 'http://www.w3.org/2002/07/owl#ObjectProperty'
    });
    expect(iriForNamespaceId('skos', 'scopeNote')).toEqual({
      ok: true,
      value: 'http://www.w3.org/2004/02/skos/core#scopeNote'
    });
    expect(iriForNamespaceId('xsd', 'nonNegativeInteger')).toEqual({
      ok: true,
      value: 'http://www.w3.org/2001/XMLSchema#nonNegativeInteger'
    });
    expect(iriForNamespaceId('dcterms', 'modified')).toEqual({
      ok: true,
      value: 'http://purl.org/dc/terms/modified'
    });
    expect(iriForNamespaceId('iao', 'definition')).toEqual({
      ok: true,
      value: 'http://purl.obolibrary.org/obo/IAO_0000115'
    });
    expect(iriForNamespaceId('oboInOwl', 'hasDbXref')).toEqual({
      ok: true,
      value: 'http://www.geneontology.org/formats/oboInOwl#hasDbXref'
    });
  });

  test('normalizePrefixMap and mergeProjectPrefixes validate and merge user/file prefixes', () => {
    const normalized = normalizePrefixMap({
      ex: ' https://example.org/ ',
      'bad prefix': 'https://example.org/bad/',
      nope: 'not an iri'
    });

    expect(normalized.prefixes).toEqual({ ex: 'https://example.org/' });
    expect(normalized.warnings).toEqual([
      'Ignored invalid prefix "bad prefix".',
      'Ignored prefix "nope" with invalid namespace IRI.'
    ]);

    const merged = mergeProjectPrefixes(
      { ex: 'https://example.org/old/', rdf: COMMON_NAMESPACE_REGISTRY.rdf.namespaceIri },
      { ex: 'https://example.org/new/' }
    );
    expect(merged.prefixes).toEqual({
      ex: 'https://example.org/new/',
      rdf: COMMON_NAMESPACE_REGISTRY.rdf.namespaceIri
    });
  });

  test('saveProjectPrefixes persists only normalized prefixes through an adapter', async () => {
    const calls = [];
    const adapter = {
      async saveProjectPrefixes(projectId, prefixes) {
        calls.push({ projectId, prefixes });
      }
    };

    const result = await saveProjectPrefixes(adapter, 'project-1', {
      ex: 'https://example.org/',
      bad: 'relative/path'
    });

    expect(result.prefixes).toEqual({ ex: 'https://example.org/' });
    expect(calls).toEqual([{ projectId: 'project-1', prefixes: { ex: 'https://example.org/' } }]);
  });

  test('RDF prefix extraction keeps Turtle, XMLNS, JSON-LD, and parser paths distinct', () => {
    expect(extractTurtlePrefixDeclarations('@prefix ex: <https://example.org/> .\nPREFIX owl: <http://www.w3.org/2002/07/owl#>')).toEqual({
      ex: 'https://example.org/',
      owl: 'http://www.w3.org/2002/07/owl#'
    });
    expect(extractXmlNamespacePrefixes('<rdf:RDF xmlns:rdf="http://rdf/" xmlns:ex="https://example.org/"></rdf:RDF>')).toEqual({
      rdf: 'http://rdf/',
      ex: 'https://example.org/'
    });

    const jsonld = extractJsonLdContextPrefixes('{"@context":{"ex":"https://example.org/","term":{"@id":"ex:term"}}}');
    expect(jsonld.ok).toBe(true);
    expect(jsonld.prefixes).toEqual({ ex: 'https://example.org/' });
    expect(jsonld.warnings).toEqual([
      'Ignored JSON-LD context term "term" because only string term values are supported.'
    ]);
    expect(extractJsonLdContextPrefixes('{"@context":["https://schema.org/",{"ex":"https://example.org/"}]}')).toMatchObject({
      ok: true,
      prefixes: {},
      warnings: ['Ignored JSON-LD array @context because only plain object contexts are supported.']
    });
    expect(extractJsonLdContextPrefixes('{bad json')).toMatchObject({
      ok: false,
      error: 'invalid jsonld'
    });

    expect(extractRdfPrefixesFromText('@prefix ex: <https://example.org/> .', { mimeType: 'text/turtle' })).toMatchObject({
      ok: true,
      prefixes: { ex: 'https://example.org/' },
      source: 'turtle-text'
    });
    expect(extractRdfPrefixesFromText('<rdf:RDF xmlns:ex="https://example.org/"></rdf:RDF>', { mimeType: 'application/rdf+xml' })).toMatchObject({
      ok: true,
      prefixes: { ex: 'https://example.org/' },
      source: 'xml-namespace'
    });
  });

  test('RDF parser prefix extraction adapter captures callback prefixes and reports parser errors', () => {
    const parser = {
      parse(text, callback) {
        callback(null, { subject: {} }, null);
        callback(null, null, { ex: 'https://example.org/' });
      }
    };
    expect(extractRdfPrefixesFromText('ignored', { n3Parser: parser })).toMatchObject({
      ok: true,
      prefixes: { ex: 'https://example.org/' },
      source: 'n3-parser'
    });

    const badParser = {
      parse(text, callback) {
        callback(new Error('bad rdf'), null, null);
      }
    };
    expect(extractRdfPrefixesFromText('ignored', { n3Parser: badParser })).toMatchObject({
      ok: false,
      error: 'rdf prefix parser error',
      message: 'bad rdf'
    });
  });

  test('SPARQL prefix helpers extract, format, and prepend prologues without logging', () => {
    const query = `
      BASE <https://example.org/base/>
      PREFIX ex: <https://example.org/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      SELECT * WHERE { ?s rdfs:label ?o }
    `;
    const extracted = extractSparqlPrefixesFromText(query);
    expect(extracted).toMatchObject({
      ok: true,
      baseIri: 'https://example.org/base/',
      prefixes: {
        ex: 'https://example.org/',
        rdfs: 'http://www.w3.org/2000/01/rdf-schema#'
      }
    });

    expect(formatSparqlPrefixDeclarations({ rdfs: COMMON_NAMESPACE_REGISTRY.rdfs.namespaceIri, ex: 'https://example.org/' }).value)
      .toBe('PREFIX ex: <https://example.org/>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>');

    expect(prependSparqlPrefixes('SELECT * WHERE { ?s ?p ?o }', { ex: 'https://example.org/' }, { baseIri: 'https://example.org/base/' }).value)
      .toBe('BASE <https://example.org/base/>\nPREFIX ex: <https://example.org/>\n\nSELECT * WHERE { ?s ?p ?o }');
  });

  test('SPARQL prefix helpers preserve duplicate/invalid-prefix warnings', () => {
    const extracted = extractSparqlPrefixesFromText(`
      PREFIX ex: <https://example.org/old/>
      PREFIX ex: <https://example.org/new/>
      PREFIX bad: <relative/path>
      SELECT * WHERE { ?s ?p ?o }
    `);
    expect(extracted.prefixes).toEqual({ ex: 'https://example.org/new/' });
    expect(extracted.warnings).toEqual([
      'Duplicate SPARQL prefix "ex" found; using the last declaration.',
      'Ignored prefix "bad" with invalid namespace IRI.'
    ]);

    expect(prependSparqlPrefixes('', { good: 'https://example.org/', bad: 'relative' })).toEqual({
      ok: true,
      value: 'PREFIX good: <https://example.org/>',
      warnings: ['Ignored prefix "bad" with invalid namespace IRI.']
    });
  });

  test('CURIE compaction uses longest prefix matches and structured errors', () => {
    const prefixes = {
      ex: 'https://example.org/',
      exont: 'https://example.org/ontology/'
    };

    expect(findLongestPrefixMatch('https://example.org/ontology/Thing', prefixes)).toEqual({
      ok: true,
      prefix: 'exont',
      namespaceIri: 'https://example.org/ontology/'
    });
    expect(compactIriToCurie('https://example.org/ontology/Thing', prefixes)).toEqual({
      ok: true,
      value: 'exont:Thing',
      prefix: 'exont',
      namespaceIri: 'https://example.org/ontology/',
      localName: 'Thing'
    });
    expect(compactIriToCurie('not an iri', prefixes)).toEqual({
      ok: false,
      error: 'invalid iri',
      input: 'not an iri'
    });
    expect(compactIriToCurie('https://unknown.example/Thing', prefixes)).toEqual({
      ok: false,
      error: 'unknown namespace',
      input: 'https://unknown.example/Thing'
    });
  });

  test('CURIE expansion returns explicit results for valid and invalid tokens', () => {
    const prefixes = { rdfs: COMMON_NAMESPACE_REGISTRY.rdfs.namespaceIri };
    expect(expandCurieToIri('rdfs:label', prefixes)).toEqual({
      ok: true,
      value: 'http://www.w3.org/2000/01/rdf-schema#label',
      prefix: 'rdfs',
      namespaceIri: 'http://www.w3.org/2000/01/rdf-schema#',
      localName: 'label'
    });
    expect(expandCurieToIri('missing:Thing', prefixes)).toEqual({
      ok: false,
      error: 'unknown prefix',
      input: 'missing:Thing',
      prefix: 'missing'
    });
    expect(expandCurieToIri('rdfs:', prefixes)).toEqual({
      ok: false,
      error: 'empty curie local name',
      input: 'rdfs:',
      prefix: 'rdfs'
    });
  });

  test('RDF serialization prefix adapters normalize N3 options and apply rdflib prefixes', () => {
    expect(createN3WriterOptionsWithPrefixes({
      format: 'Turtle',
      prefixes: { ex: 'https://example.org/', bad: 'relative' }
    })).toMatchObject({
      ok: true,
      value: { format: 'Turtle', prefixes: { ex: 'https://example.org/' } },
      warnings: ['Ignored prefix "bad" with invalid namespace IRI.']
    });

    const calls = [];
    const store = {
      setPrefixForURI(prefix, namespaceIri) {
        calls.push([prefix, namespaceIri]);
      }
    };
    expect(applyPrefixesToRdflibStore(store, { ex: 'https://example.org/', '': 'https://default.example/' })).toMatchObject({
      ok: true,
      warnings: []
    });
    expect(calls).toEqual([['ex', 'https://example.org/']]);
    expect(applyPrefixesToRdflibStore({}, { ex: 'https://example.org/' })).toMatchObject({
      ok: false,
      error: 'unsupported prefix target'
    });
  });

  test('namespace stem helpers derive and discover base namespace evidence', () => {
    expect(deriveNamespaceStemFromIri('https://example.org/ont#Thing')).toEqual({
      ok: true,
      value: 'https://example.org/ont#',
      source: 'hash'
    });
    expect(deriveNamespaceStemFromIri('https://example.org/ont/Thing')).toEqual({
      ok: true,
      value: 'https://example.org/ont/',
      source: 'slash'
    });

    const store = {
      getQuads() {
        return [
          {
            subject: { termType: 'NamedNode', value: 'https://example.org/a#S' },
            predicate: { termType: 'NamedNode', value: 'https://example.org/p/P' },
            object: { termType: 'Literal', value: 'label' },
            graph: { termType: 'DefaultGraph', value: '' }
          }
        ];
      }
    };
    expect(listNamespaceStemsInStore(store)).toEqual({
      ok: true,
      value: ['https://example.org/a#', 'https://example.org/p/']
    });
    expect(discoverBaseIriOrNamespaceStem({ ontologyIri: 'https://example.org/ont#Ontology' })).toEqual({
      ok: true,
      value: 'https://example.org/ont#',
      source: 'ontologyIri'
    });
    expect(deriveNamespaceStemFromIri('not an iri')).toEqual({
      ok: false,
      error: 'invalid iri',
      input: 'not an iri'
    });
    expect(listNamespaceStemsInStore(null)).toEqual({
      ok: true,
      value: []
    });
    expect(discoverBaseIriOrNamespaceStem({ baseIri: 'relative', store: null })).toEqual({
      ok: false,
      error: 'base iri not found',
      input: ''
    });
  });
});
