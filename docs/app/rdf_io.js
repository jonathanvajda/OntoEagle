import {
  SUPPORTED_MIME_DESCRIPTORS,
  getSupportedMimeTypeForFilename
} from './shared/format-registry/index.js';
import { readFileAsText as readBrowserFileAsText } from './shared/browser-file-io/index.js';
import {
  parseRdfTextWithAdapters,
  rdfDatasetToJsonLdGraph
} from './shared/rdf-io/index.js';

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
  return readBrowserFileAsText(file);
}

export function getRdfRuntime() {
  return {
    N3: globalThis.N3,
    jsonld: globalThis.jsonld,
    $rdf: globalThis.$rdf
  };
}

export async function parseRdfToStore(text, fileName, options = {}) {
  const format = detectRdfFormat(fileName);
  const parsed = await parseRdfTextWithAdapters(text, {
    format,
    baseIri: options.baseIRI || options.baseIri || null,
    runtime: options.runtime || getRdfRuntime()
  });
  return parsed.dataset;
}

export function storeToJsonLdGraph(store) {
  return {
    '@graph': rdfDatasetToJsonLdGraph(store)
      .sort((a, b) => String(a['@id']).localeCompare(String(b['@id'])))
  };
}

export async function parseRdfTextToJsonLd(text, fileName, options = {}) {
  const store = await parseRdfToStore(text, fileName, options);
  return storeToJsonLdGraph(store);
}
