/**
 * @file Common namespace registry data and registry-derived prefix maps.
 *
 * This module owns common namespace facts. Project/user prefixes should extend
 * this registry through `mergeProjectPrefixes`, not mutate this object.
 */

/**
 * @typedef {Readonly<{
 *   prefix: string,
 *   namespaceIri: string,
 *   ids: Readonly<Record<string, string>>
 * }>} NamespaceRegistryEntry
 */

const defineEntry = (entry) => Object.freeze({
  ...entry,
  ids: Object.freeze(entry.ids || {})
});

/**
 * Common ontology namespace registry.
 *
 * The `ids` object records frequently referenced local identifiers inside a
 * namespace without requiring every app to hard-code the same IRI fragments.
 *
 * @type {Readonly<Record<string, NamespaceRegistryEntry>>}
 */
export const COMMON_NAMESPACE_REGISTRY = Object.freeze({
  rdf: defineEntry({
    prefix: 'rdf',
    namespaceIri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    ids: { type: 'type', first: 'first', rest: 'rest', nil: 'nil' }
  }),
  rdfs: defineEntry({
    prefix: 'rdfs',
    namespaceIri: 'http://www.w3.org/2000/01/rdf-schema#',
    ids: { label: 'label', comment: 'comment', subClassOf: 'subClassOf', subPropertyOf: 'subPropertyOf' }
  }),
  owl: defineEntry({
    prefix: 'owl',
    namespaceIri: 'http://www.w3.org/2002/07/owl#',
    ids: { Class: 'Class', Ontology: 'Ontology', imports: 'imports', versionIRI: 'versionIRI' }
  }),
  xsd: defineEntry({
    prefix: 'xsd',
    namespaceIri: 'http://www.w3.org/2001/XMLSchema#',
    ids: { string: 'string', integer: 'integer', decimal: 'decimal', boolean: 'boolean', date: 'date', dateTime: 'dateTime' }
  }),
  skos: defineEntry({
    prefix: 'skos',
    namespaceIri: 'http://www.w3.org/2004/02/skos/core#',
    ids: { prefLabel: 'prefLabel', altLabel: 'altLabel', definition: 'definition' }
  }),
  dcterms: defineEntry({
    prefix: 'dcterms',
    namespaceIri: 'http://purl.org/dc/terms/',
    ids: { title: 'title', description: 'description', license: 'license', rights: 'rights' }
  }),
  dc: defineEntry({
    prefix: 'dc',
    namespaceIri: 'http://purl.org/dc/elements/1.1/',
    ids: { title: 'title', description: 'description', rights: 'rights' }
  }),
  obo: defineEntry({
    prefix: 'obo',
    namespaceIri: 'http://purl.obolibrary.org/obo/',
    ids: {}
  }),
  cco: defineEntry({
    prefix: 'cco',
    namespaceIri: 'http://www.ontologyrepository.com/CommonCoreOntologies/',
    ids: {}
  }),
  cco2: defineEntry({
    prefix: 'cco2',
    namespaceIri: 'https://www.commoncoreontologies.org/',
    ids: {}
  })
});

/**
 * Converts a namespace registry into the package's plain prefix-map shape.
 *
 * @param {Readonly<Record<string, NamespaceRegistryEntry>>} [registry]
 * Registry entries keyed by any stable name.
 * @returns {Readonly<Record<string, string>>} Frozen prefix-to-namespace map.
 */
export function namespacePrefixMapFromRegistry(registry = COMMON_NAMESPACE_REGISTRY) {
  return Object.freeze(Object.fromEntries(
    Object.values(registry).map((entry) => [entry.prefix, entry.namespaceIri])
  ));
}

/**
 * Derives a namespace-to-prefix reverse map from a prefix map.
 *
 * @param {Record<string, string>} prefixes - Prefix-to-namespace map.
 * @returns {Readonly<Record<string, string>>} Frozen namespace-to-prefix map.
 */
export function namespaceToPrefixMap(prefixes = namespacePrefixMapFromRegistry()) {
  return Object.freeze(Object.fromEntries(
    Object.entries(prefixes || {}).map(([prefix, namespaceIri]) => [namespaceIri, prefix])
  ));
}

/**
 * Builds a full IRI from a registry entry and one of its known local IDs.
 *
 * @param {string} registryKey - Key in `COMMON_NAMESPACE_REGISTRY`.
 * @param {string} idKey - Key in the entry's `ids` object.
 * @param {Readonly<Record<string, NamespaceRegistryEntry>>} [registry]
 * Registry to read from.
 * @returns {Readonly<{ok: true, value: string}> | Readonly<{ok: false, error: 'unknown namespace'|'unknown namespace id', input: string}>}
 */
export function iriForNamespaceId(registryKey, idKey, registry = COMMON_NAMESPACE_REGISTRY) {
  const entry = registry?.[registryKey];
  if (!entry) return Object.freeze({ ok: false, error: 'unknown namespace', input: String(registryKey || '') });
  const local = entry.ids?.[idKey];
  if (!local) return Object.freeze({ ok: false, error: 'unknown namespace id', input: String(idKey || '') });
  return Object.freeze({ ok: true, value: `${entry.namespaceIri}${local}` });
}
