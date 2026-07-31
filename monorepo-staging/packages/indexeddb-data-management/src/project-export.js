import { StorageError } from './storage-error.js';

const DEFAULT_PROJECT_ZIP_MIME = 'application/zip';
const DEFAULT_JSON_MIME = 'application/json';

const ARTIFACT_KIND_DEFAULTS = Object.freeze({
  'mermaid-diagram': Object.freeze({ extension: 'mmd', mimeType: 'text/mermaid' }),
  'sparql-query': Object.freeze({ extension: 'rq', mimeType: 'application/sparql-query' }),
  'sparql-update': Object.freeze({ extension: 'ru', mimeType: 'application/sparql-update' }),
  'sql-query': Object.freeze({ extension: 'sql', mimeType: 'application/sql' }),
  'nosql-query': Object.freeze({ extension: 'json', mimeType: DEFAULT_JSON_MIME }),
  'rdf-file': Object.freeze({ extension: 'ttl', mimeType: 'text/turtle' }),
  'rdf-dataset': Object.freeze({ extension: 'jsonld', mimeType: 'application/ld+json' }),
  'quad-rows': Object.freeze({ extension: 'nq', mimeType: 'application/n-quads' }),
  'tabular-file': Object.freeze({ extension: 'csv', mimeType: 'text/csv' }),
  'tabular-records': Object.freeze({ extension: 'csv', mimeType: 'text/csv' }),
  'iri-mapping-table': Object.freeze({ extension: 'csv', mimeType: 'text/csv' }),
  'shacl-shapes': Object.freeze({ extension: 'ttl', mimeType: 'text/turtle' }),
  'r2rml-mapping': Object.freeze({ extension: 'ttl', mimeType: 'text/turtle' }),
  'diagnostic-report': Object.freeze({ extension: 'json', mimeType: DEFAULT_JSON_MIME }),
  'ontology-slim': Object.freeze({ extension: 'ttl', mimeType: 'text/turtle' }),
  'search-index': Object.freeze({ extension: 'json', mimeType: DEFAULT_JSON_MIME }),
  'jsonld-graph': Object.freeze({ extension: 'jsonld', mimeType: 'application/ld+json' }),
  'ontology-documents': Object.freeze({ extension: 'json', mimeType: DEFAULT_JSON_MIME })
});

/**
 * Stores a project artifact through the portfolio artifact store.
 *
 * @param {object} stores Store set returned by `createProjectPortfolioStores`.
 * @param {object} record Artifact metadata record.
 * @param {unknown} [payload=null] Artifact payload.
 * @returns {Promise<object>} Stored artifact metadata.
 */
export function storeProjectArtifactData(stores, record, payload = null) {
  if (!stores?.artifacts?.storeProjectArtifact) {
    throw new StorageError('storeProjectArtifactData expected portfolio artifact stores.', { code: 'INVALID_PROJECT_PORTFOLIO_STORES' });
  }
  return stores.artifacts.storeProjectArtifact(record, payload);
}

/**
 * Stores a project run through the portfolio run store.
 *
 * @param {object} stores Store set returned by `createProjectPortfolioStores`.
 * @param {object} record Run record.
 * @returns {Promise<object>} Stored run record.
 */
export function storeProjectRunData(stores, record) {
  if (!stores?.runs?.storeRunRecord) {
    throw new StorageError('storeProjectRunData expected portfolio run stores.', { code: 'INVALID_PROJECT_PORTFOLIO_STORES' });
  }
  return stores.runs.storeRunRecord(record);
}

/**
 * Resolves the preferred download extension and MIME type for an artifact.
 *
 * Explicit artifact `extension` and `mediaType` values win. When those are not
 * present, artifact kind defaults cover common RDF, tabular, query, Mermaid,
 * mapping, report, and JSON-LD cases.
 *
 * @param {object} artifact Artifact metadata or metadata plus payload.
 * @returns {{extension: string, mimeType: string}} Download format details.
 */
export function resolveArtifactDownloadFormat(artifact) {
  const defaults = ARTIFACT_KIND_DEFAULTS[artifact?.artifactKind] || Object.freeze({ extension: 'json', mimeType: DEFAULT_JSON_MIME });
  return {
    extension: normalizeExtension(artifact?.extension || defaults.extension),
    mimeType: artifact?.mediaType || defaults.mimeType
  };
}

/**
 * Builds a safe artifact filename from label/id plus resolved extension.
 *
 * @param {object} artifact Artifact metadata or metadata plus payload.
 * @param {object} [options]
 * @param {string} [options.fallbackName='artifact'] Fallback basename.
 * @returns {string} Filename with extension.
 */
export function createArtifactDownloadFileName(artifact, { fallbackName = 'artifact' } = {}) {
  const { extension } = resolveArtifactDownloadFormat(artifact);
  const sourceName = artifact?.source?.fileName || artifact?.label || artifact?.artifactId || fallbackName;
  const safeBase = safeFilenameBase(stripKnownExtension(sourceName));
  return `${safeBase}.${extension}`;
}

/**
 * Creates a browser Blob for an artifact payload.
 *
 * @param {object} artifact Artifact metadata or metadata plus payload.
 * @param {object} [options]
 * @param {typeof Blob} [options.BlobConstructor=globalThis.Blob] Blob constructor.
 * @returns {Blob} Artifact blob.
 */
export function createArtifactDownloadBlob(artifact, { BlobConstructor = globalThis.Blob } = {}) {
  if (typeof BlobConstructor !== 'function') {
    throw new StorageError('Blob is not available for artifact download.', { code: 'BLOB_UNAVAILABLE' });
  }
  const { mimeType } = resolveArtifactDownloadFormat(artifact);
  const payload = artifact?.payload ?? artifact?.content ?? artifact?.text ?? artifact ?? {};
  if (isBlobLike(payload)) return payload;
  return new BlobConstructor([serializeArtifactPayload(payload)], { type: mimeType });
}

/**
 * Downloads a single project artifact through an injected browser download
 * function.
 *
 * @param {object} artifact Artifact metadata or metadata plus payload.
 * @param {object} options
 * @param {(fileName: string, blob: Blob, options?: object) => unknown} options.downloadBlob Browser download function.
 * @param {typeof Blob} [options.BlobConstructor=globalThis.Blob] Blob constructor.
 * @returns {unknown} Result returned by `downloadBlob`.
 */
export function downloadProjectArtifact(artifact, { downloadBlob, BlobConstructor = globalThis.Blob, ...downloadOptions } = {}) {
  if (typeof downloadBlob !== 'function') {
    throw new StorageError('downloadProjectArtifact expected a downloadBlob function.', { code: 'DOWNLOAD_FUNCTION_REQUIRED' });
  }
  return downloadBlob(createArtifactDownloadFileName(artifact), createArtifactDownloadBlob(artifact, { BlobConstructor }), downloadOptions);
}

/**
 * Creates a ZIP Blob for one project and its artifacts.
 *
 * @param {object} project Project metadata.
 * @param {object[]} artifacts Project artifacts, optionally with payloads.
 * @param {object} options
 * @param {typeof import('jszip')} [options.JSZipConstructor=globalThis.JSZip] JSZip constructor.
 * @returns {Promise<Blob>} ZIP blob.
 */
export async function createProjectArchiveBlob(project, artifacts, { JSZipConstructor = globalThis.JSZip } = {}) {
  if (typeof JSZipConstructor !== 'function') {
    throw new StorageError('JSZip is not available for project archive creation.', { code: 'JSZIP_UNAVAILABLE' });
  }
  const zip = new JSZipConstructor();
  zip.file('project.json', JSON.stringify(project || {}, null, 2));
  for (const artifact of Array.isArray(artifacts) ? artifacts : []) {
    zip.file(`artifacts/${createArtifactDownloadFileName(artifact)}`, serializeArtifactPayload(artifact?.payload ?? artifact));
  }
  return zip.generateAsync({ type: 'blob' });
}

/**
 * Downloads a whole project as a ZIP file.
 *
 * @param {object} project Project metadata.
 * @param {object[]} artifacts Project artifacts, optionally with payloads.
 * @param {object} options
 * @param {typeof import('jszip')} [options.JSZipConstructor=globalThis.JSZip] JSZip constructor.
 * @param {(fileName: string, blob: Blob, options?: object) => unknown} options.downloadBlob Browser download function.
 * @returns {Promise<unknown>} Result returned by `downloadBlob`.
 */
export async function downloadProjectArchive(project, artifacts, { JSZipConstructor = globalThis.JSZip, downloadBlob, ...downloadOptions } = {}) {
  if (typeof downloadBlob !== 'function') {
    throw new StorageError('downloadProjectArchive expected a downloadBlob function.', { code: 'DOWNLOAD_FUNCTION_REQUIRED' });
  }
  const blob = await createProjectArchiveBlob(project, artifacts, { JSZipConstructor });
  const fileName = `${safeFilenameBase(project?.label || project?.projectId || 'project')}.zip`;
  return downloadBlob(fileName, blob, downloadOptions);
}

function serializeArtifactPayload(payload) {
  if (typeof payload === 'string') return payload;
  if (payload instanceof ArrayBuffer || ArrayBuffer.isView(payload)) return payload;
  return JSON.stringify(payload ?? {}, null, 2);
}

function normalizeExtension(extension) {
  return String(extension || 'json').trim().toLowerCase().replace(/^\./, '') || 'json';
}

function stripKnownExtension(name) {
  return String(name || '').replace(/\.[A-Za-z0-9_-]{1,12}$/, '');
}

function safeFilenameBase(value) {
  return String(value || 'artifact')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
    || 'artifact';
}

function isBlobLike(value) {
  return value && typeof value === 'object' && typeof value.arrayBuffer === 'function' && typeof value.type === 'string';
}
