const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const RDF_FIRST = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first';
const RDF_REST = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest';
const RDF_NIL = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil';

import {
  SUPPORTED_MIME_DESCRIPTORS,
  getN3ParserFormatForMimeType,
  getSupportedMimeTypeForFilename
} from './shared/format-registry/index.js';

export const RDF_FORMATS = Object.freeze({
  TURTLE: SUPPORTED_MIME_DESCRIPTORS.turtle.mimeType,
  N3: SUPPORTED_MIME_DESCRIPTORS.n3.mimeType,
  N_TRIPLES: SUPPORTED_MIME_DESCRIPTORS.nTriples.mimeType,
  N_QUADS: SUPPORTED_MIME_DESCRIPTORS.nQuads.mimeType,
  TRIG: SUPPORTED_MIME_DESCRIPTORS.trig.mimeType,
  JSON_LD: SUPPORTED_MIME_DESCRIPTORS.jsonLd.mimeType,
  RDF_XML: SUPPORTED_MIME_DESCRIPTORS.rdfXml.mimeType
});

export function detectRdfFormat(fileName) {
  const result = getSupportedMimeTypeForFilename(fileName);
  if (!result.ok || result.value.category !== 'rdf') {
    throw new Error(`Unsupported RDF file type: ${String(fileName || '') || '(unknown filename)'}`);
  }
  return result.value.mimeType;
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File read error'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsText(file);
  });
}

function getRuntime() {
  return {
    N3: globalThis.N3,
    jsonld: globalThis.jsonld,
    $rdf: globalThis.$rdf
  };
}

function requireN3() {
  const { N3 } = getRuntime();
  if (!N3?.Store || !N3?.Parser || !N3?.DataFactory) {
    throw new Error('N3 parser library is not loaded.');
  }
  return N3;
}

function rdflibTermToRdfJs(term, targetStore) {
  const N3 = requireN3();
  const DF = N3.DataFactory;
  if (!term) throw new Error('Invalid RDF term.');

  if (term.termType === 'NamedNode') return DF.namedNode(term.value);
  if (term.termType === 'BlankNode') return DF.blankNode(term.value);
  if (term.termType === 'Literal') {
    return term.language
      ? DF.literal(term.value, term.language)
      : DF.literal(term.value, DF.namedNode(term.datatype?.value || 'http://www.w3.org/2001/XMLSchema#string'));
  }

  if (term.termType === 'Collection') {
    const items = Array.isArray(term.elements) ? term.elements : [];
    if (!items.length) return DF.namedNode(RDF_NIL);
    const nodes = items.map((_item, i) => i === 0 && term.value ? DF.blankNode(term.value) : DF.blankNode());
    for (let i = 0; i < items.length; i += 1) {
      targetStore.addQuad(DF.quad(nodes[i], DF.namedNode(RDF_FIRST), rdflibTermToRdfJs(items[i], targetStore)));
      targetStore.addQuad(DF.quad(nodes[i], DF.namedNode(RDF_REST), i === items.length - 1 ? DF.namedNode(RDF_NIL) : nodes[i + 1]));
    }
    return nodes[0];
  }

  throw new Error(`Unsupported RDF/XML term type: ${term.termType}`);
}

function parseN3Like(text, format, baseIRI) {
  const N3 = requireN3();
  const parserFormat = getN3ParserFormatForMimeType(format);
  if (!parserFormat.ok) throw new Error(`Unsupported N3 parser format: ${format}`);
  const store = new N3.Store();
  const parser = new N3.Parser({
    format: parserFormat.value,
    ...(baseIRI ? { baseIRI } : {})
  });
  let parseError = null;
  parser.parse(text, (error, quad) => {
    if (error) {
      parseError = error;
      return;
    }
    if (quad) store.addQuad(quad);
  });
  if (parseError) throw parseError;
  return store;
}

async function parseJsonLd(text, baseIRI) {
  const { jsonld } = getRuntime();
  if (!jsonld?.toRDF) throw new Error('JSON-LD parser library is not loaded.');
  const doc = JSON.parse(text);
  const nquads = await jsonld.toRDF(doc, {
    format: RDF_FORMATS.N_QUADS,
    ...(baseIRI ? { base: baseIRI } : {})
  });
  return parseN3Like(nquads, RDF_FORMATS.N_QUADS, baseIRI);
}

async function parseRdfXml(text, baseIRI) {
  const { $rdf } = getRuntime();
  if (!$rdf?.graph || !$rdf?.parse) throw new Error('RDF/XML parser library is not loaded.');
  const N3 = requireN3();
  const graph = $rdf.graph();
  const store = new N3.Store();
  await new Promise((resolve, reject) => {
    try {
      $rdf.parse(text, graph, baseIRI || 'urn:ontoeagle:upload', RDF_FORMATS.RDF_XML, (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    } catch (err) {
      reject(err);
    }
  });
  for (const st of graph.statements || []) {
    store.addQuad(N3.DataFactory.quad(
      rdflibTermToRdfJs(st.subject, store),
      rdflibTermToRdfJs(st.predicate, store),
      rdflibTermToRdfJs(st.object, store)
    ));
  }
  return store;
}

export async function parseRdfToStore(text, fileName, options = {}) {
  const format = detectRdfFormat(fileName);
  if (format === RDF_FORMATS.JSON_LD) return parseJsonLd(text, options.baseIRI || null);
  if (format === RDF_FORMATS.RDF_XML) return parseRdfXml(text, options.baseIRI || null);
  return parseN3Like(text, format, options.baseIRI || null);
}

function termToJsonLdValue(term) {
  if (term.termType === 'NamedNode') return { '@id': term.value };
  if (term.termType === 'BlankNode') return { '@id': `_:${term.value}` };
  if (term.termType === 'Literal') {
    const out = { '@value': term.value };
    if (term.language) out['@language'] = term.language;
    else if (term.datatype?.value && term.datatype.value !== 'http://www.w3.org/2001/XMLSchema#string') {
      out['@type'] = term.datatype.value;
    }
    return out;
  }
  return { '@value': String(term.value || '') };
}

export function storeToJsonLdGraph(store) {
  const nodes = new Map();
  for (const q of store.getQuads(null, null, null, null)) {
    if (q.subject.termType !== 'NamedNode' && q.subject.termType !== 'BlankNode') continue;
    const id = q.subject.termType === 'BlankNode' ? `_:${q.subject.value}` : q.subject.value;
    if (!nodes.has(id)) nodes.set(id, { '@id': id });
    const node = nodes.get(id);
    if (q.predicate.value === RDF_TYPE) {
      if (!Array.isArray(node['@type'])) node['@type'] = [];
      node['@type'].push(q.object.value);
      continue;
    }
    if (!Array.isArray(node[q.predicate.value])) node[q.predicate.value] = [];
    node[q.predicate.value].push(termToJsonLdValue(q.object));
  }
  return { '@graph': Array.from(nodes.values()).sort((a, b) => String(a['@id']).localeCompare(String(b['@id']))) };
}

export async function parseRdfTextToJsonLd(text, fileName, options = {}) {
  const store = await parseRdfToStore(text, fileName, options);
  return storeToJsonLdGraph(store);
}
