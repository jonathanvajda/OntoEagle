/**
 * docs/app/rdf_extract.js
 * Pure functions:
 * - parseGraphJsonLdText(text) -> json object
 * - extractDocumentsFromJsonLd(json) -> OntologyDocument[]
 *
 * This is a pragmatic extractor that works on:
 * - JSON-LD with @graph
 * - compacted keys (rdfs:label) OR full IRI keys
 * - values as strings, {"@value": "..."} objects, or arrays of those
 */

const OWL = 'http://www.w3.org/2002/07/owl#';
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const CCEO = 'http://www.ontologyrepository.com/CommonCoreOntologies/';
const CCO2 = 'https://www.commoncoreontologies.org/';
const DCTERMS = 'http://purl.org/dc/terms/';
export const ADDED_BY_USER_IRI = 'https://jonathanvajda.github.io/OntoEagle/added_by_user';

/** Common predicate keys (full IRIs + compact forms) */
const P = Object.freeze({
  type: [`${RDF}type`, 'rdf:type', '@type'],
  label: [`${RDFS}label`, 'rdfs:label', 'label'],
  prefLabel: [`${SKOS}prefLabel`, 'skos:prefLabel', 'prefLabel'],
  altLabel: [`${SKOS}altLabel`, 'skos:altLabel', 'altLabel'],
  definition: [`${SKOS}definition`, 'skos:definition', 'definition', `${OWL}IAO_0000115`, 'IAO_0000115', `${CCEO}definition`],
  citation: [
    `${DCTERMS}bibliographicCitation`,
    'dc:bibliographicCitation',
    `${RDFS}seeAlso`,
    'rdfs:seeAlso',
    `${CCEO}definition_source`,
  ],
  example: [`${SKOS}example`, 'skos:example', 'example', `${CCEO}example_of_usage`],
  note: [`${SKOS}note`, 'skos:note', 'note'],
  curated_in: [`${CCEO}is_curated_in_ontology`, `${RDFS}isDefinedBy`, `${CCO2}ont00001760`],
  subClassOf: [`${RDFS}subClassOf`, 'rdfs:subClassOf'],
  subPropertyOf: [`${RDFS}subPropertyOf`, 'rdfs:subPropertyOf'],
  broader: [`${SKOS}broader`, 'skos:broader'],
  narrower: [`${SKOS}narrower`, 'skos:narrower'],
  addedByUser: [ADDED_BY_USER_IRI, 'added_by_user'],
});

/**
 * @param {string} text
 * @returns {any}
 */
export function parseGraphJsonLdText(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  return JSON.parse(text);
}

/**
 * Safely get a value from a node using multiple possible keys.
 * @param {any} node
 * @param {string[]} keys
 * @returns {any}
 */
function getAny(node, keys) {
  if (!node || typeof node !== 'object') return undefined;
  for (const k of keys) {
    if (k in node) return node[k];
  }
  return undefined;
}

/**
 * Convert JSON-LD value(s) to string array.
 * Handles:
 * - "str"
 * - {"@value":"str"}
 * - {"@id":"..."} (ignored unless you want IRIs as strings)
 * - arrays of any of the above
 *
 * @param {any} v
 * @returns {string[]}
 */
export function valueToStrings(v) {
  if (v == null) return [];
  if (typeof v === 'string') return [v];

  if (Array.isArray(v)) {
    return v.flatMap(valueToStrings).filter(Boolean);
  }

  if (typeof v === 'object') {
    if (typeof v['@value'] === 'string') return [v['@value']];
    // If you want @id values as strings, uncomment:
    // if (typeof v['@id'] === 'string') return [v['@id']];
  }

  return [];
}

/**
 * Convert JSON-LD value(s) to named IRI strings.
 *
 * @param {any} v
 * @returns {string[]}
 */
export function valueToIris(v) {
  if (v == null) return [];
  if (typeof v === 'string' && /^(https?:|urn:)/i.test(v)) return [v];
  if (Array.isArray(v)) return v.flatMap(valueToIris).filter(Boolean);
  if (typeof v === 'object' && typeof v['@id'] === 'string' && !v['@id'].startsWith('_:')) {
    return [v['@id']];
  }
  return [];
}

/**
 * Determine a normalized OntologyElementType from JSON-LD @type values.
 * @param {any} typeValue
 * @returns {import('./types.js').OntologyElementType}
 */
export function inferElementType(typeValue) {
  const types = valueToStrings(typeValue);

  // types might be CURIE-like or full IRIs.
  const has = (t) => types.includes(t) || types.includes(`owl:${t}`) || types.includes(`${OWL}${t}`);

  if (has('Ontology')) return 'Ontology';
  if (has('Class')) return 'Class';
  if (has('ObjectProperty')) return 'ObjectProperty';
  if (has('DatatypeProperty')) return 'DatatypeProperty';
  if (has('AnnotationProperty')) return 'AnnotationProperty';
  if (has('NamedIndividual')) return 'NamedIndividual';

  // Sometimes RDFLib JSON-LD uses full IRIs only; this still catches them.
  if (types.some(t => t === `${OWL}Ontology`)) return 'Ontology';
  if (types.some(t => t === `${OWL}Class`)) return 'Class';

  return 'Other';
}

/**
 * Compute a namespace token from an IRI.
 * @param {string} iri
 * @returns {string}
 */
export function computeNamespace(iri) {
  if (typeof iri !== 'string') return '';
  const hash = iri.lastIndexOf('#');
  if (hash >= 0) return iri.slice(0, hash + 1);
  const slash = iri.lastIndexOf('/');
  if (slash >= 0) return iri.slice(0, slash + 1);
  return iri;
}

/**
 * Extract OntologyDocument[] from consolidated JSON-LD object.
 *
 * @param {any} jsonld
 * @returns {import('./types.js').OntologyDocument[]}
 */
export function extractDocumentsFromJsonLd(jsonld) {
  if (!jsonld) return [];

  const graph = Array.isArray(jsonld)
    ? jsonld
    : Array.isArray(jsonld['@graph'])
      ? jsonld['@graph']
      : [];

  /** @type {import('./types.js').OntologyDocument[]} */
  const docs = [];
  /** @type {Map<string, Set<string>>} */
  const skosNarrowerParentsByChild = new Map();

  for (const node of graph) {
    if (!node || typeof node !== 'object') continue;

    const iri = node['@id'];
    if (typeof iri !== 'string' || !iri.startsWith('http')) continue; // keep it simple for now

    const type = inferElementType(getAny(node, P.type));

    const pref = valueToStrings(getAny(node, P.prefLabel));
    const lab = valueToStrings(getAny(node, P.label));
    const label = (pref[0] || lab[0] || iri);

    const altLabels = [
      ...valueToStrings(getAny(node, P.altLabel)),
      // Sometimes label appears multiple times; keep extras as alts
      ...lab.slice(1),
      ...pref.slice(1),
    ].filter(Boolean);

    const definition = valueToStrings(getAny(node, P.definition))[0];

    const citations = valueToStrings(getAny(node, P.citation));
    const examples = valueToStrings(getAny(node, P.example));
    const clarifications = valueToStrings(getAny(node, P.note)); // treat skos:note as clarifications for now
    const curated_in = valueToStrings(getAny(node, P.curated_in));
    const subClassParents = valueToIris(getAny(node, P.subClassOf));
    const broaderParents = valueToIris(getAny(node, P.broader));
    const subPropertyParents = valueToIris(getAny(node, P.subPropertyOf));
    const hierarchyPredicates = [];
    if (subClassParents.length) hierarchyPredicates.push('rdfs:subClassOf');
    if (broaderParents.length) hierarchyPredicates.push('skos:broader');
    if (subPropertyParents.length) hierarchyPredicates.push('rdfs:subPropertyOf');

    for (const child of valueToIris(getAny(node, P.narrower))) {
      if (!skosNarrowerParentsByChild.has(child)) skosNarrowerParentsByChild.set(child, new Set());
      skosNarrowerParentsByChild.get(child).add(iri);
    }

    const addedByUserValues = valueToStrings(getAny(node, P.addedByUser));
    const addedByUser = addedByUserValues.some((v) => String(v).toLowerCase() === 'true');

    docs.push({
      iri,
      type,
      label,
      altLabels,
      namespace: computeNamespace(iri),
      definition,
      citations: citations.length ? citations : undefined,
      examples: examples.length ? examples : undefined,
      clarifications: clarifications.length ? clarifications : undefined,
      curated_in: curated_in.length ? curated_in : undefined,
      parents: Array.from(new Set([...subClassParents, ...broaderParents, ...subPropertyParents])),
      children: [],
      hierarchyPredicates,
      addedByUser,
      // If you’re still carrying `text` elsewhere, you can omit it in Stage E.
      text: ''
    });
  }

  const byIri = new Map(docs.map((d) => [d.iri, d]));
  for (const [child, parents] of skosNarrowerParentsByChild.entries()) {
    const doc = byIri.get(child);
    if (!doc) continue;
    doc.parents = Array.from(new Set([...(doc.parents || []), ...parents]));
    doc.hierarchyPredicates = Array.from(new Set([...(doc.hierarchyPredicates || []), 'skos:narrower']));
  }

  for (const doc of docs) {
    for (const parent of doc.parents || []) {
      const parentDoc = byIri.get(parent);
      if (!parentDoc) continue;
      parentDoc.children = Array.from(new Set([...(parentDoc.children || []), doc.iri]));
    }
  }

  return docs;
}

/**
 * Convenience: Map docs by IRI.
 * @param {import('./types.js').OntologyDocument[]} docs
 * @returns {Map<string, import('./types.js').OntologyDocument>}
 */
export function mapByIri(docs) {
  const m = new Map();
  for (const d of docs) m.set(d.iri, d);
  return m;
}
