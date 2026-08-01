import { compactIriToCurie, iriForNamespaceId, namespacePrefixMapFromRegistry } from '../../namespace-registry/src/index.js';
import {
  normalizeArtifactRecord,
  normalizeDatasetRecord,
  normalizeGraphRecord,
  normalizeProjectRecord,
  normalizeRunRecord,
  normalizeSettingRecord,
  normalizeWorkspaceInclusionRecord
} from './records.js';

const PREFIXES = namespacePrefixMapFromRegistry();

export const PROJECT_RECORD_JSONLD_CONTEXT = Object.freeze({
  cceo: PREFIXES.cceo,
  cco2: PREFIXES.cco2,
  dcterms: PREFIXES.dcterms,
  rdf: PREFIXES.rdf,
  rdfs: PREFIXES.rdfs,
  xsd: PREFIXES.xsd,
  okea: PREFIXES.okea
});

function curieForRegisteredTerm(prefix, id) {
  const iri = iriForNamespaceId(prefix, id);
  if (!iri.ok) throw new Error(`Unknown namespace registry term: ${prefix}:${id}`);

  const curie = compactIriToCurie(iri.value, PREFIXES);
  if (!curie.ok) throw new Error(`Unable to compact registered namespace term: ${iri.value}`);

  return curie.value;
}

const DCTERMS_CREATED = curieForRegisteredTerm('dcterms', 'created');
const DCTERMS_FORMAT = curieForRegisteredTerm('dcterms', 'format');
const DCTERMS_IDENTIFIER = curieForRegisteredTerm('dcterms', 'identifier');
const DCTERMS_IS_PART_OF = curieForRegisteredTerm('dcterms', 'isPartOf');
const DCTERMS_MODIFIED = curieForRegisteredTerm('dcterms', 'modified');
const DCTERMS_PROVENANCE = curieForRegisteredTerm('dcterms', 'provenance');
const DCTERMS_SOURCE = curieForRegisteredTerm('dcterms', 'source');
const DCTERMS_TITLE = curieForRegisteredTerm('dcterms', 'title');
const RDF_VALUE = curieForRegisteredTerm('rdf', 'value');
const RDFS_LABEL = curieForRegisteredTerm('rdfs', 'label');
const XSD_STRING = curieForRegisteredTerm('xsd', 'string');

const CCEO_COMPUTER_PROGRAM_EXECUTION = curieForRegisteredTerm('cceo', 'ComputerProgramExecution');
const CCO2_INFORMATION_CONTENT_ENTITY = curieForRegisteredTerm('cco2', 'informationContentEntity');
const OKEA_ACTIVE_ARTIFACT = curieForRegisteredTerm('okea', 'activeArtifact');
const OKEA_APP_ID = curieForRegisteredTerm('okea', 'appId');
const OKEA_ARTIFACT = curieForRegisteredTerm('okea', 'artifact');
const OKEA_ARTIFACT_KIND = curieForRegisteredTerm('okea', 'artifactKind');
const OKEA_DOCUMENT_COUNT = curieForRegisteredTerm('okea', 'documentCount');
const OKEA_ENABLED = curieForRegisteredTerm('okea', 'enabled');
const OKEA_FILE_EXTENSION = curieForRegisteredTerm('okea', 'fileExtension');
const OKEA_FILE_NAME = curieForRegisteredTerm('okea', 'fileName');
const OKEA_FINGERPRINT = curieForRegisteredTerm('okea', 'fingerprint');
const OKEA_GRAPH = curieForRegisteredTerm('okea', 'Graph');
const OKEA_GRAPH_IRI = curieForRegisteredTerm('okea', 'graphIri');
const OKEA_INCLUDE_MODE = curieForRegisteredTerm('okea', 'includeMode');
const OKEA_INPUT_ARTIFACT = curieForRegisteredTerm('okea', 'inputArtifact');
const OKEA_MATERIALIZATION = curieForRegisteredTerm('okea', 'materialization');
const OKEA_METADATA = curieForRegisteredTerm('okea', 'metadata');
const OKEA_ONTOLOGY_COUNT = curieForRegisteredTerm('okea', 'ontologyCount');
const OKEA_OUTPUT_ARTIFACT = curieForRegisteredTerm('okea', 'outputArtifact');
const OKEA_PAYLOAD = curieForRegisteredTerm('okea', 'payload');
const OKEA_PROJECT = curieForRegisteredTerm('okea', 'Project');
const OKEA_ROLE = curieForRegisteredTerm('okea', 'role');
const OKEA_RUN_KIND = curieForRegisteredTerm('okea', 'runKind');
const OKEA_SCHEMA_VERSION = curieForRegisteredTerm('okea', 'schemaVersion');
const OKEA_SCOPE = curieForRegisteredTerm('okea', 'scope');
const OKEA_SETTING = curieForRegisteredTerm('okea', 'Setting');
const OKEA_SETTING_KEY = curieForRegisteredTerm('okea', 'settingKey');
const OKEA_STORAGE_BACKEND = curieForRegisteredTerm('okea', 'storageBackend');
const OKEA_STORAGE_REF = curieForRegisteredTerm('okea', 'storageRef');
const OKEA_SUMMARY = curieForRegisteredTerm('okea', 'summary');
const OKEA_TAG = curieForRegisteredTerm('okea', 'tag');
const OKEA_TARGET = curieForRegisteredTerm('okea', 'target');
const OKEA_TARGET_TYPE = curieForRegisteredTerm('okea', 'targetType');
const OKEA_UI_STATE = curieForRegisteredTerm('okea', 'uiState');
const OKEA_WORKSPACE_INCLUSION = curieForRegisteredTerm('okea', 'WorkspaceInclusion');

function compactDateTime(value) {
  return value ? { '@value': value, '@type': 'xsd:dateTime' } : null;
}

function compactIdentifier(value) {
  return value ? { '@value': value, '@type': XSD_STRING } : null;
}

function compactReference(value, type = null) {
  if (!value) return null;
  return stripNullishEntries({
    '@id': value,
    '@type': type,
    [DCTERMS_IDENTIFIER]: compactIdentifier(value)
  });
}

function stripNullishEntries(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== null && value !== undefined));
}

/**
 * Reads the first present value from a JSON-LD object using compact IRI keys,
 * full IRI keys, or legacy DTO aliases.
 *
 * @param {object} record Source record.
 * @param {string[]} keys Candidate property keys.
 * @param {unknown} [fallback=null] Fallback value.
 * @returns {unknown} Resolved value.
 */
export function readJsonLdRecordValue(record, keys, fallback = null) {
  for (const key of keys) {
    if (record && Object.prototype.hasOwnProperty.call(record, key)) {
      const value = record[key];
      if (value && typeof value === 'object' && !Array.isArray(value) && '@value' in value) return value['@value'];
      if (value && typeof value === 'object' && !Array.isArray(value) && '@id' in value) return value['@id'];
      return value;
    }
  }
  return fallback;
}

/**
 * Converts a ProjectRecord into a compact JSON-LD object.
 *
 * @param {object} record ProjectRecord or compatible DTO.
 * @param {object} [options]
 * @param {() => string} [options.now] Clock function.
 * @returns {object} JSON-LD ProjectRecord.
 */
export function convertProjectRecordToJsonLd(record, options = {}) {
  const project = normalizeProjectRecord(record, options);
  return stripNullishEntries({
    '@context': PROJECT_RECORD_JSONLD_CONTEXT,
    '@id': project.projectId,
    '@type': OKEA_PROJECT,
    [DCTERMS_IDENTIFIER]: compactIdentifier(project.projectId),
    [DCTERMS_TITLE]: project.label,
    [DCTERMS_CREATED]: compactDateTime(project.createdAt),
    [DCTERMS_MODIFIED]: compactDateTime(project.updatedAt),
    'okea:storageBackend': project.storageBackend,
    'okea:activeArtifact': compactReference(project.activeArtifactId, CCO_INFORMATION_CONTENT_ENTITY),
    'okea:tag': project.tags,
    'okea:metadata': project.metadata
  });
}

/**
 * Converts an ArtifactRecord into a compact JSON-LD object.
 *
 * @param {object} record ArtifactRecord or compatible DTO.
 * @param {object} [options]
 * @param {() => string} [options.now] Clock function.
 * @returns {object} JSON-LD ArtifactRecord.
 */
export function convertArtifactRecordToJsonLd(record, options = {}) {
  const artifact = normalizeArtifactRecord(record, options);
  return stripNullishEntries({
    '@context': PROJECT_RECORD_JSONLD_CONTEXT,
    '@id': artifact.artifactId,
    '@type': CCO_INFORMATION_CONTENT_ENTITY,
    [DCTERMS_IDENTIFIER]: compactIdentifier(artifact.artifactId),
    [DCTERMS_IS_PART_OF]: compactReference(artifact.projectId, OKEA_PROJECT),
    'okea:artifactKind': artifact.artifactKind,
    'okea:role': artifact.role,
    [DCTERMS_TITLE]: artifact.label,
    'dcterms:format': artifact.mediaType,
    'okea:fileExtension': artifact.extension,
    [DCTERMS_CREATED]: compactDateTime(artifact.createdAt),
    [DCTERMS_MODIFIED]: compactDateTime(artifact.updatedAt),
    [DCTERMS_SOURCE]: artifact.source,
    'okea:storageRef': artifact.storageRef,
    [DCTERMS_PROVENANCE]: artifact.provenance,
    'okea:summary': artifact.summary
  });
}

/**
 * Converts a DatasetRecord into a compact JSON-LD object.
 *
 * @param {object} record DatasetRecord or compatible DTO.
 * @param {object} [options]
 * @param {() => string} [options.now] Clock function.
 * @returns {object} JSON-LD DatasetRecord.
 */
export function convertDatasetRecordToJsonLd(record, options = {}) {
  const dataset = normalizeDatasetRecord(record, options);
  return stripNullishEntries({
    '@context': PROJECT_RECORD_JSONLD_CONTEXT,
    '@id': dataset.datasetId,
    '@type': CCO_INFORMATION_CONTENT_ENTITY,
    [DCTERMS_IDENTIFIER]: compactIdentifier(dataset.datasetId),
    [DCTERMS_IS_PART_OF]: compactReference(dataset.projectId, OKEA_PROJECT),
    [DCTERMS_SOURCE]: dataset.source,
    'okea:enabled': dataset.enabled,
    [DCTERMS_TITLE]: dataset.label,
    'okea:schemaVersion': dataset.schemaVersion,
    'okea:fingerprint': dataset.fingerprint,
    'okea:fileName': dataset.fileName,
    'okea:documentCount': dataset.documentCount,
    'okea:ontologyCount': dataset.ontologyCount,
    [DCTERMS_CREATED]: compactDateTime(dataset.createdAt),
    [DCTERMS_MODIFIED]: compactDateTime(dataset.updatedAt),
    'okea:metadata': dataset.metadata
  });
}

/**
 * Converts a RunRecord into a compact JSON-LD object.
 *
 * @param {object} record RunRecord or compatible DTO.
 * @param {object} [options]
 * @param {() => string} [options.now] Clock function.
 * @returns {object} JSON-LD RunRecord.
 */
export function convertRunRecordToJsonLd(record, options = {}) {
  const run = normalizeRunRecord(record, options);
  return stripNullishEntries({
    '@context': PROJECT_RECORD_JSONLD_CONTEXT,
    '@id': run.runId,
    '@type': CCE_COMPUTER_PROGRAM_EXECUTION,
    [DCTERMS_IDENTIFIER]: compactIdentifier(run.runId),
    [DCTERMS_IS_PART_OF]: compactReference(run.projectId, OKEA_PROJECT),
    'okea:runKind': run.runKind,
    [DCTERMS_TITLE]: run.label,
    [DCTERMS_CREATED]: compactDateTime(run.createdAt),
    [DCTERMS_MODIFIED]: compactDateTime(run.updatedAt),
    'okea:inputArtifact': run.inputArtifactIds.map((artifactId) => compactReference(artifactId, CCO_INFORMATION_CONTENT_ENTITY)),
    'okea:outputArtifact': run.outputArtifactIds.map((artifactId) => compactReference(artifactId, CCO_INFORMATION_CONTENT_ENTITY)),
    'okea:payload': run.payload,
    'okea:uiState': run.uiState,
    'okea:metadata': run.metadata
  });
}

/**
 * Converts a SettingRecord into a compact JSON-LD object.
 *
 * @param {object} record SettingRecord or compatible DTO.
 * @param {object} [options]
 * @param {() => string} [options.now] Clock function.
 * @returns {object} JSON-LD SettingRecord.
 */
export function convertSettingRecordToJsonLd(record, options = {}) {
  const setting = normalizeSettingRecord(record, options);
  return stripNullishEntries({
    '@context': PROJECT_RECORD_JSONLD_CONTEXT,
    '@id': setting.settingId,
    '@type': OKEA_SETTING,
    [DCTERMS_IDENTIFIER]: compactIdentifier(setting.settingId),
    'okea:scope': setting.scope,
    'okea:settingKey': setting.key,
    'rdf:value': setting.value,
    'okea:schemaVersion': setting.schemaVersion,
    'okea:appId': setting.appId,
    [DCTERMS_CREATED]: compactDateTime(setting.createdAt),
    [DCTERMS_MODIFIED]: compactDateTime(setting.updatedAt),
    'okea:metadata': setting.metadata
  });
}

/**
 * Converts a WorkspaceInclusionRecord into a compact JSON-LD object.
 *
 * @param {object} record WorkspaceInclusionRecord or compatible DTO.
 * @param {object} [options]
 * @param {() => string} [options.now] Clock function.
 * @returns {object} JSON-LD WorkspaceInclusionRecord.
 */
export function convertWorkspaceInclusionRecordToJsonLd(record, options = {}) {
  const inclusion = normalizeWorkspaceInclusionRecord(record, options);
  return stripNullishEntries({
    '@context': PROJECT_RECORD_JSONLD_CONTEXT,
    '@id': inclusion.inclusionId,
    '@type': OKEA_WORKSPACE_INCLUSION,
    [DCTERMS_IDENTIFIER]: compactIdentifier(inclusion.inclusionId),
    [DCTERMS_IS_PART_OF]: compactReference(inclusion.projectId, OKEA_PROJECT),
    'okea:targetType': inclusion.targetType,
    'okea:target': compactReference(inclusion.targetId),
    'okea:role': inclusion.role,
    'okea:enabled': inclusion.enabled,
    'okea:graphIri': inclusion.graphIri,
    'okea:includeMode': inclusion.includeMode,
    [DCTERMS_CREATED]: compactDateTime(inclusion.createdAt),
    [DCTERMS_MODIFIED]: compactDateTime(inclusion.updatedAt),
    'okea:metadata': inclusion.metadata
  });
}

/**
 * Converts a GraphRecord into a compact JSON-LD object.
 *
 * @param {object} record GraphRecord or compatible DTO.
 * @param {object} [options]
 * @param {() => string} [options.now] Clock function.
 * @returns {object} JSON-LD GraphRecord.
 */
export function convertGraphRecordToJsonLd(record, options = {}) {
  const graph = normalizeGraphRecord(record, options);
  return stripNullishEntries({
    '@context': PROJECT_RECORD_JSONLD_CONTEXT,
    '@id': graph.graphId,
    '@type': OKEA_GRAPH,
    [DCTERMS_IDENTIFIER]: compactIdentifier(graph.graphId),
    [DCTERMS_IS_PART_OF]: compactReference(graph.projectId, OKEA_PROJECT),
    'okea:graphIri': graph.graphIri,
    'okea:artifact': compactReference(graph.artifactId, CCO_INFORMATION_CONTENT_ENTITY),
    'okea:role': graph.role,
    [RDFS_LABEL]: graph.label,
    [DCTERMS_CREATED]: compactDateTime(graph.createdAt),
    [DCTERMS_MODIFIED]: compactDateTime(graph.updatedAt),
    [DCTERMS_SOURCE]: graph.source,
    'okea:materialization': graph.materialization,
    [DCTERMS_PROVENANCE]: graph.provenance,
    'okea:metadata': graph.metadata
  });
}

/**
 * Creates JSON-LD metadata terms for common RDF ontology metadata.
 *
 * @returns {object} Common IRI constants used by record JSON-LD mappings.
 */
export function createRecordJsonLdVocabulary() {
  return Object.freeze({
    title: iriForNamespaceId('dcterms', 'title').value,
    created: iriForNamespaceId('dcterms', 'created').value,
    identifier: iriForNamespaceId('dcterms', 'identifier').value,
    modified: iriForNamespaceId('dcterms', 'modified').value,
    format: iriForNamespaceId('dcterms', 'format').value,
    label: iriForNamespaceId('rdfs', 'label').value,
    value: iriForNamespaceId('rdf', 'value').value,
    informationContentEntity: iriForNamespaceId('cco2', 'informationContentEntity').value,
    computerProgramExecution: iriForNamespaceId('cceo', 'ComputerProgramExecution').value,
    okea: iriForNamespaceId('okea', 'OntologyOfKnowledgeEngineeringArtifacts').value
  });
}
