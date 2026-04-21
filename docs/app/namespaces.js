import { normalizeText } from './normalize.js';

export const COMMON_PREFIXES = Object.freeze({
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  skos: 'http://www.w3.org/2004/02/skos/core#',
  dc: 'http://purl.org/dc/elements/1.1/',
  dcterms: 'http://purl.org/dc/terms/',
  obo: 'http://purl.obolibrary.org/obo/',
  bfo: 'http://purl.obolibrary.org/obo/BFO_',
  iao: 'http://purl.obolibrary.org/obo/IAO_',
  cco: 'http://www.ontologyrepository.com/CommonCoreOntologies/',
  cceo: 'http://www.ontologyrepository.com/CommonCoreOntologies/',
  cco2: 'https://www.commoncoreontologies.org/',
  foaf: 'http://xmlns.com/foaf/0.1/',
  prov: 'http://www.w3.org/ns/prov#',
  dcat: 'http://www.w3.org/ns/dcat#',
  geo: 'http://www.w3.org/2003/01/geo/wgs84_pos#',
  geojson: 'https://purl.org/geojson/vocab#',
  vcard: 'http://www.w3.org/2006/vcard/ns#'
});

export function shortIri(iri) {
  if (typeof iri !== 'string') return '';
  for (const [prefix, ns] of Object.entries(COMMON_PREFIXES)) {
    if (iri.startsWith(ns)) return `${prefix}:${iri.slice(ns.length)}`;
  }
  const hash = iri.lastIndexOf('#');
  if (hash >= 0) return iri.slice(hash + 1);
  const slash = iri.lastIndexOf('/');
  if (slash >= 0) return iri.slice(slash + 1);
  return iri;
}

export function namespaceFilterCandidates(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  const prefixToken = normalizeText(raw.replace(/:$/, ''));
  const candidates = [];
  if (COMMON_PREFIXES[prefixToken]) candidates.push(COMMON_PREFIXES[prefixToken]);
  candidates.push(raw);

  if (/^[a-z][\w.-]*:/i.test(raw) && !/^https?:/i.test(raw)) {
    const [prefix, local] = raw.split(/:(.*)/s);
    const ns = COMMON_PREFIXES[normalizeText(prefix)];
    if (ns) candidates.push(`${ns}${local || ''}`);
  }

  return Array.from(new Set(candidates.map((s) => normalizeText(s)).filter(Boolean)));
}

export function normalizeNamespaceFilters(values) {
  return (values || []).flatMap(namespaceFilterCandidates);
}

export function docMatchesNamespaceFilter(doc, filter) {
  const f = normalizeText(filter);
  if (!f) return true;

  const ns = normalizeText(doc.namespace || '');
  const iri = normalizeText(doc.iri || '');
  const dataset = normalizeText(doc.datasetId || '');
  const ontologyName = normalizeText(doc.ontologyName || '');

  return ns === f || ns.startsWith(f) || iri === f || iri.startsWith(f) || dataset === f || ontologyName === f;
}
