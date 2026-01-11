// docs/scripts/types.js

/**
 * @typedef {Object} OntologyDocument
 * @property {string} iri
 * @property {('Ontology'|'Class'|'ObjectProperty'|'DatatypeProperty'|'AnnotationProperty'|'NamedIndividual'|'Other')} type
 * @property {string} label
 * @property {string[]} altLabels
 * @property {string} namespace        // namespace IRI (or prefix token, but pick one and stick to it)
 * @property {string=} definition
 * @property {string[]=} citations
 * @property {string[]=} examples
 * @property {string[]=} clarifications
 */

/**
 * @typedef {Object} SearchOptions
 * @property {boolean} exact
 * @property {boolean} wildcard
 * @property {Array<OntologyDocument['type']>} types
 * @property {string[]} namespaces
 * @property {boolean} includeDefinition
 * @property {boolean} includeCitation
 * @property {boolean} includeExamples
 * @property {boolean} includeClarifications
 */
