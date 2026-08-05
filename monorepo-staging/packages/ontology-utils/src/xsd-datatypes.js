import {
  COMMON_NAMESPACE_IRIS,
  namespacePrefixMapFromRegistry,
  compactIriToCurie
} from '../../namespace-registry/src/index.js';

const REGISTERED_PREFIXES = namespacePrefixMapFromRegistry();

const INTEGER_TYPE_NAMES = Object.freeze([
  'integer',
  'nonPositiveInteger',
  'negativeInteger',
  'long',
  'int',
  'short',
  'byte',
  'nonNegativeInteger',
  'unsignedLong',
  'unsignedInt',
  'unsignedShort',
  'unsignedByte',
  'positiveInteger'
]);

const NUMBER_TYPE_NAMES = Object.freeze([
  'decimal',
  'float',
  'double'
]);

/**
 * Return the XSD datatype local name for a datatype IRI.
 *
 * Unknown or non-XSD datatypes return an empty string instead of throwing.
 *
 * @param {unknown} datatypeIri - Candidate datatype IRI.
 * @returns {string} XSD local name such as `string`, `integer`, or `dateTime`.
 */
export function getXsdDatatypeLocalName(datatypeIri) {
  const iri = String(datatypeIri || COMMON_NAMESPACE_IRIS.xsd.string).trim();
  const compact = compactIriToCurie(iri, REGISTERED_PREFIXES);
  return compact.ok && compact.value.startsWith('xsd:') ? compact.value.slice('xsd:'.length) : '';
}

/**
 * Format a datatype IRI using the common namespace registry when possible.
 *
 * @param {unknown} datatypeIri - Candidate datatype IRI.
 * @returns {string} CURIE for registered datatype IRIs, otherwise the input IRI.
 */
export function formatDatatypeIriForDisplay(datatypeIri) {
  const iri = String(datatypeIri || COMMON_NAMESPACE_IRIS.xsd.string).trim();
  const compact = compactIriToCurie(iri, REGISTERED_PREFIXES);
  return compact.ok ? compact.value : iri;
}

/**
 * Describe an XSD datatype as a JSON Schema fragment.
 *
 * This is intentionally a practical schema description, not a complete XSD
 * validator. Date/time-like values remain JSON strings with a format hint.
 *
 * @param {unknown} datatypeIri - XSD datatype IRI.
 * @returns {Readonly<Record<string, string>>} JSON Schema type/format fragment.
 */
export function describeXsdDatatypeForJsonSchema(datatypeIri) {
  const local = getXsdDatatypeLocalName(datatypeIri);

  if (INTEGER_TYPE_NAMES.includes(local)) return Object.freeze({ type: 'integer' });
  if (NUMBER_TYPE_NAMES.includes(local)) return Object.freeze({ type: 'number' });
  if (local === 'boolean') return Object.freeze({ type: 'boolean' });
  if (local === 'date') return Object.freeze({ type: 'string', format: 'date' });
  if (local === 'dateTime') return Object.freeze({ type: 'string', format: 'date-time' });
  if (local === 'time') return Object.freeze({ type: 'string', format: 'time' });
  if (local === 'anyURI') return Object.freeze({ type: 'string', format: 'uri' });

  return Object.freeze({ type: 'string' });
}

/**
 * Coerce a lexical string into the JavaScript primitive implied by an XSD
 * datatype when doing so is unambiguous.
 *
 * Invalid lexical values return their trimmed string so callers do not lose
 * the source value. Empty values return `undefined`.
 *
 * @param {unknown} value - Lexical value to coerce.
 * @param {unknown} datatypeIri - XSD datatype IRI.
 * @returns {string | number | boolean | undefined} Coerced primitive or source
 * string when coercion is not safe.
 */
export function coerceLexicalValueForXsdDatatype(value, datatypeIri) {
  const local = getXsdDatatypeLocalName(datatypeIri);
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return undefined;

  if (INTEGER_TYPE_NAMES.includes(local)) {
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) ? parsed : trimmed;
  }

  if (NUMBER_TYPE_NAMES.includes(local)) {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : trimmed;
  }

  if (local === 'boolean') {
    if (trimmed === 'true' || trimmed === '1') return true;
    if (trimmed === 'false' || trimmed === '0') return false;
  }

  return trimmed;
}
