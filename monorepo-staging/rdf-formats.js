export const RDF_FORMATS = Object.freeze({
  nt: {
    extensions: ['nt'],
    mimeTypes: ['application/n-triples'],
    parserAdapter: 'n3',
    serializerAdapter: 'n3',
    preservesNamedGraphs: false
  },
  nq: {
    extensions: ['nq'],
    mimeTypes: ['application/n-quads'],
    parserAdapter: 'n3',
    serializerAdapter: 'n3',
    preservesNamedGraphs: true
  },
  turtle: {
    extensions: ['ttl'],
    mimeTypes: ['text/turtle'],
    parserAdapter: 'n3',
    serializerAdapter: 'n3',
    preservesNamedGraphs: false
  },
  trig: {
    extensions: ['trig'],
    mimeTypes: ['application/trig'],
    parserAdapter: 'n3',
    serializerAdapter: 'n3',
    preservesNamedGraphs: true
  },
  jsonld: {
    extensions: ['jsonld'],
    mimeTypes: ['application/ld+json'],
    parserAdapter: 'jsonld',
    serializerAdapter: 'jsonld',
    preservesNamedGraphs: true
  },
  rdfxml: {
    extensions: ['rdf', 'xml'],
    mimeTypes: ['application/rdf+xml'],
    parserAdapter: 'rdflib',
    serializerAdapter: 'rdflib',
    preservesNamedGraphs: false
  }
});