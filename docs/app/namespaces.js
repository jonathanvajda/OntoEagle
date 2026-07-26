import { normalizeText } from './normalize.js';
import {
  compactIriToCurie,
  expandCurieToIri,
  findLongestPrefixMatch,
  namespacePrefixMapFromRegistry
} from './shared/namespace-registry/index.js';

export const COMMON_PREFIXES = namespacePrefixMapFromRegistry();

export function shortIri(iri) {
  if (typeof iri !== 'string') return '';

  const curie = compactIriToCurie(iri, COMMON_PREFIXES);
  if (curie.ok) return curie.value;

  const match = findLongestPrefixMatch(iri, COMMON_PREFIXES);
  if (match.ok) return `${match.prefix}:${iri.slice(match.namespaceIri.length)}`;

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
    const expanded = expandCurieToIri(raw, COMMON_PREFIXES, { allowEmptyLocalName: true });
    if (expanded.ok) candidates.push(expanded.value);
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
