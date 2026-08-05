import { isAbsoluteIri, normalizeIriToken } from './iri.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Create a UUID string with deterministic injection points for tests.
 *
 * @param {object} [options] - UUID generation options.
 * @param {() => string} [options.uuidSource] - Optional source function. Useful
 * for deterministic tests and migrations that already have a UUID provider.
 * @param {boolean} [options.removeHyphens=false] - Return a compact UUID
 * string with hyphens removed.
 * @returns {string} UUID string.
 */
export function createUuid(options = {}) {
  const { uuidSource, removeHyphens = false } = options;
  const value = typeof uuidSource === 'function'
    ? String(uuidSource())
    : createDefaultUuid();
  return removeHyphens ? value.replaceAll('-', '') : value;
}

/**
 * Returns whether a value is a canonical UUID string.
 *
 * @param {unknown} value - Candidate UUID.
 * @returns {boolean} True for canonical version-4 UUID strings.
 */
export function isUuid(value) {
  return UUID_PATTERN.test(String(value || ''));
}

/**
 * Create a timestamped graph IRI from a base IRI and UUID.
 *
 * The clock and UUID source are injectable so callers can write stable Jest
 * assertions. Invalid base IRIs throw because graph IRIs must be safe to use as
 * RDF named nodes.
 *
 * @param {unknown} baseIri - Absolute base IRI for the graph.
 * @param {object} [options] - Identifier options.
 * @param {() => Date} [options.clock] - Clock provider.
 * @param {() => string} [options.uuidSource] - UUID provider.
 * @returns {string} Timestamped graph IRI.
 */
export function createTimestampedGraphIri(baseIri, options = {}) {
  const base = normalizeIriToken(baseIri).replace(/\/+$/, '');
  if (!isAbsoluteIri(base, { allowedSchemes: null, normalizeToken: false })) {
    throw new TypeError('createTimestampedGraphIri() requires an absolute base IRI.');
  }

  const clock = typeof options.clock === 'function' ? options.clock : () => new Date();
  const timestamp = formatUtcTimestampForIri(clock());
  const uuid = createUuid({ uuidSource: options.uuidSource });
  return `${base}/${timestamp}/${uuid}`;
}

function createDefaultUuid() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : ((random & 0x3) | 0x8);
    return value.toString(16);
  });
}

function formatUtcTimestampForIri(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.valueOf())) {
    throw new TypeError('Timestamp clock must return a valid Date.');
  }
  return value.toISOString().replace(/[:.]/g, '-');
}
