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

/** Common predicate keys (full IRIs + compact forms) */
const P = Object.freeze({
  type: [`${RDF}type`, 'rdf:type', '@type'],
  label: [`${RDFS}label`, 'rdfs:label', 'label'],
  prefLabel: [`${SKOS}prefLabel`, 'skos:prefLabel', 'prefLabel'],
  altLabel: [`${SKOS}altLabel`, 'skos:altLabel', 'altLabel'],
  definition: [`${SKOS}definition`, 'skos:definition', 'definition', `${OWL}IAO_0000115`, 'IAO_0000115'],
  citation: [
    'dcterms:bibliographicCitation',
    'dc:bibliographicCitation',
    `${RDFS}seeAlso`,
    'rdfs:seeAlso'
  ],
  example: [`${SKOS}example`, 'skos:example', 'example'],
  note: [`${SKOS}note`, 'skos:note', 'note'],
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
      // If you’re still carrying `text` elsewhere, you can omit it in Stage E.
      text: ''
    });
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
