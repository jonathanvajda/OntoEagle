import {
  getD3JsonOutputMimeDescriptor,
  getFilenameExtension,
  getMermaidOutputMimeDescriptor,
  getN3ParserFormatForMimeType,
  getOutputMimeTypeForExtension,
  getPreferredExtensionForMimeType,
  getRdfAdapterDescriptorForMimeType,
  getSupportedMimeTypeForFilename,
  isMimeDescriptorCategory,
  rdfSerializationPreservesNamedGraphs,
  normalizeSupportedMimeType
} from '../src/index.js';

describe('format-registry MIME helpers', () => {
  test('getFilenameExtension returns a normalized final extension', () => {
    expect(getFilenameExtension('Example.TTL')).toBe('ttl');
    expect(getFilenameExtension('C:\\data\\source.final.JSONLD')).toBe('jsonld');
    expect(getFilenameExtension('/tmp/archive.rdf?download=1')).toBe('rdf');
    expect(getFilenameExtension('.env')).toBe('');
    expect(getFilenameExtension('no-extension')).toBe('');
  });

  test('getSupportedMimeTypeForFilename detects supported RDF extensions without file-picker assumptions', () => {
    expect(getSupportedMimeTypeForFilename('ontology.ttl')).toMatchObject({
      ok: true,
      value: { id: 'turtle', mimeType: 'text/turtle', category: 'rdf' }
    });
    expect(getSupportedMimeTypeForFilename('graph.trig')).toMatchObject({
      ok: true,
      value: { id: 'trig', mimeType: 'application/trig', category: 'rdf' }
    });
    expect(getSupportedMimeTypeForFilename('graph.nq')).toMatchObject({
      ok: true,
      value: { id: 'nQuads', mimeType: 'application/n-quads', category: 'rdf' }
    });
  });

  test('getSupportedMimeTypeForFilename detects tabular, document, query, and data extensions', () => {
    expect(getSupportedMimeTypeForFilename('table.csv')).toMatchObject({
      ok: true,
      value: { id: 'csv', mimeType: 'text/csv', category: 'tabular' }
    });
    expect(getSupportedMimeTypeForFilename('workbook.xlsx')).toMatchObject({
      ok: true,
      value: {
        id: 'xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        category: 'tabular'
      }
    });
    expect(getSupportedMimeTypeForFilename('query.rq')).toMatchObject({
      ok: true,
      value: { id: 'sparqlQuery', mimeType: 'application/sparql-query', category: 'query' }
    });
    expect(getSupportedMimeTypeForFilename('notes.json')).toMatchObject({
      ok: true,
      value: { id: 'json', mimeType: 'application/json', category: 'data' }
    });
  });

  test('unknown filename extensions return an explicit unknown-filetype result', () => {
    expect(getSupportedMimeTypeForFilename('ontology.weird')).toEqual({
      ok: false,
      error: 'unknown filetype',
      input: 'ontology.weird',
      extension: 'weird'
    });
  });

  test('getOutputMimeTypeForExtension resolves intended output extensions', () => {
    expect(getOutputMimeTypeForExtension('.jsonld')).toMatchObject({
      ok: true,
      value: { id: 'jsonLd', mimeType: 'application/ld+json' }
    });
    expect(getOutputMimeTypeForExtension('nt')).toMatchObject({
      ok: true,
      value: { id: 'nTriples', mimeType: 'application/n-triples' }
    });
    expect(getOutputMimeTypeForExtension('zzz')).toEqual({
      ok: false,
      error: 'unknown filetype',
      input: 'zzz',
      extension: 'zzz'
    });
  });

  test('normalizeSupportedMimeType handles aliases without silently accepting unknown values', () => {
    expect(normalizeSupportedMimeType('rdfxml')).toMatchObject({
      ok: true,
      value: { id: 'rdfXml', mimeType: 'application/rdf+xml' }
    });
    expect(normalizeSupportedMimeType('application/ld+json')).toMatchObject({
      ok: true,
      value: { id: 'jsonLd' }
    });
    expect(normalizeSupportedMimeType('application/x-private')).toEqual({
      ok: false,
      error: 'unknown filetype',
      input: 'application/x-private'
    });
  });

  test('preferred extension lookup is MIME-to-extension and remains separate from output extension lookup', () => {
    expect(getPreferredExtensionForMimeType('text/turtle')).toEqual({ ok: true, value: 'ttl' });
    expect(getPreferredExtensionForMimeType('jsonLd')).toEqual({ ok: true, value: 'jsonld' });
  });

  test('Mermaid and D3 JSON output descriptors are distinct from generic JSON detection', () => {
    expect(getMermaidOutputMimeDescriptor()).toMatchObject({
      id: 'mermaid',
      mimeType: 'text/mermaid',
      category: 'visualization'
    });
    expect(getD3JsonOutputMimeDescriptor()).toMatchObject({
      id: 'd3Json',
      mimeType: 'application/d3+json',
      category: 'visualization'
    });
    expect(getOutputMimeTypeForExtension('json')).toMatchObject({
      ok: true,
      value: { id: 'json', mimeType: 'application/json', category: 'data' }
    });
  });

  test('category predicate supports app-level picker filters without changing registry detection', () => {
    const result = getSupportedMimeTypeForFilename('spreadsheet.tsv');
    expect(result.ok).toBe(true);
    expect(isMimeDescriptorCategory(result.value, 'tabular')).toBe(true);
    expect(isMimeDescriptorCategory(result.value, 'rdf')).toBe(false);
  });

  test('N3 parser adapter support is separate from MIME detection', () => {
    expect(getN3ParserFormatForMimeType('ttl')).toEqual({ ok: true, value: 'Turtle' });
    expect(getN3ParserFormatForMimeType('application/n-quads')).toEqual({ ok: true, value: 'N-Quads' });
    expect(getN3ParserFormatForMimeType('application/ld+json')).toEqual({
      ok: false,
      error: 'unsupported parser format',
      input: 'application/ld+json'
    });
  });

  test('RDF adapter descriptors preserve the useful legacy rdf-formats metadata', () => {
    expect(getRdfAdapterDescriptorForMimeType('trig')).toEqual({
      ok: true,
      value: {
        parserAdapter: 'n3',
        serializerAdapter: 'n3',
        preservesNamedGraphs: true
      }
    });
    expect(getRdfAdapterDescriptorForMimeType('jsonld')).toEqual({
      ok: true,
      value: {
        parserAdapter: 'jsonld',
        serializerAdapter: 'jsonld',
        preservesNamedGraphs: true
      }
    });
    expect(getRdfAdapterDescriptorForMimeType('csv')).toEqual({
      ok: false,
      error: 'unsupported rdf format',
      input: 'text/csv'
    });
  });

  test('rdfSerializationPreservesNamedGraphs exposes graph-preservation decisions', () => {
    expect(rdfSerializationPreservesNamedGraphs('nq')).toBe(true);
    expect(rdfSerializationPreservesNamedGraphs('trig')).toBe(true);
    expect(rdfSerializationPreservesNamedGraphs('ttl')).toBe(false);
    expect(rdfSerializationPreservesNamedGraphs('rdf')).toBe(false);
    expect(rdfSerializationPreservesNamedGraphs('csv')).toBe(false);
  });
});
