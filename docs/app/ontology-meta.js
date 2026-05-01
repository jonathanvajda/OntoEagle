import {
  extractDocumentsFromJsonLd,
  mapByIri,
  parseGraphJsonLdText,
  valueToDisplayValues,
  valueToIris,
  valueToStrings
} from './rdf_extract.js';
import {
  idbGetDatasetMeta,
  idbGetEnabledDocuments,
  idbInit,
  idbPutDatasetMeta,
  idbPutDocuments
} from './indexeddb.min.js';

const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const OWL = 'http://www.w3.org/2002/07/owl#';
const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const DCTERMS = 'http://purl.org/dc/terms/';
const DC = 'http://purl.org/dc/elements/1.1/';
const CCO = 'https://www.commoncoreontologies.org/';
const OBO = 'http://purl.obolibrary.org/obo/';
const DATASET_SCHEMA_VERSION = 2;
const REGISTRY_STORAGE_KEY = 'ontoeagle:ontologyRegistryOverrides';
const ONTOLOGY_SNAPSHOT_KEY = 'ontoeagle:ontologyMetadataSnapshot:v1';
const ONTOLOGY_SNAPSHOT_MAX_AGE_MS = 1000 * 60 * 60 * 24;

export const ONTOLOGY_LEVELS = Object.freeze([
  { key: 'top', label: 'Top-Level Ontologies' },
  { key: 'mid', label: 'Mid-Level Ontologies' },
  { key: 'dom', label: 'Domain Ontologies' },
  { key: 'app', label: 'Application Ontologies' },
  { key: 'kg', label: 'Knowledge Graphs' },
  { key: 'unsorted', label: 'Unsorted Ontologies' }
]);

const P = Object.freeze({
  type: [`${RDF}type`, 'rdf:type', '@type'],
  label: [`${DCTERMS}title`, 'dcterms:title', `${DC}title`, 'dc:title', `${RDFS}label`, 'rdfs:label'],
  description: [`${DCTERMS}description`, 'dcterms:description', `${DC}description`, 'dc:description', `${SKOS}definition`, 'skos:definition', `${RDFS}comment`, 'rdfs:comment'],
  versionIri: [`${OWL}versionIRI`, 'owl:versionIRI'],
  versionInfo: [`${OWL}versionInfo`, 'owl:versionInfo'],
  imports: [`${OWL}imports`, 'owl:imports'],
  license: [`${DCTERMS}license`, 'dcterms:license', `${DC}license`, 'dc:license'],
  rightsHolder: [`${DCTERMS}rightsHolder`, 'dcterms:rightsHolder', `${DCTERMS}rights`, 'dcterms:rights', `${DC}rights`, 'dc:rights'],
  creator: [`${DCTERMS}creator`, 'dcterms:creator', `${DC}creator`, 'dc:creator'],
  contributor: [`${DCTERMS}contributor`, 'dcterms:contributor', `${DC}contributor`, 'dc:contributor'],
  comment: [`${RDFS}comment`, 'rdfs:comment'],
  created: [`${DCTERMS}created`, 'dcterms:created'],
  modified: [`${DCTERMS}modified`, 'dcterms:modified'],
  publisher: [`${DCTERMS}publisher`, 'dcterms:publisher'],
  citation: [`${DCTERMS}bibliographicCitation`, 'dcterms:bibliographicCitation'],
  priorVersion: [`${OWL}priorVersion`, 'owl:priorVersion'],
  backwardCompatibleWith: [`${OWL}backwardCompatibleWith`, 'owl:backwardCompatibleWith'],
  incompatibleWith: [`${OWL}incompatibleWith`, 'owl:incompatibleWith'],
  curatedIn: [`${CCO}ont00001760`, `${RDFS}isDefinedBy`, 'rdfs:isDefinedBy']
});

function getGraph(jsonld) {
  if (Array.isArray(jsonld)) return jsonld;
  if (Array.isArray(jsonld?.['@graph'])) return jsonld['@graph'];
  return [];
}

function getAny(node, keys) {
  if (!node || typeof node !== 'object') return undefined;
  for (const key of keys) {
    if (key in node) return node[key];
  }
  return undefined;
}

function valuesForKeys(node, keys) {
  const values = [];
  for (const key of keys) {
    const raw = getAny(node, [key]);
    if (raw == null) continue;
    values.push(...(Array.isArray(raw) ? raw : [raw]));
    if (values.length) break;
  }
  return values;
}

function languageRank(value) {
  if (!value || typeof value !== 'object') return 1;
  const lang = String(value['@language'] || '').toLowerCase();
  if (lang === 'en') return 0;
  if (!lang) return 1;
  return 2;
}

function sortLanguagePreferred(values) {
  return [...values].sort((a, b) => languageRank(a) - languageRank(b));
}

function hasOntologyType(node) {
  return valueToStrings(getAny(node, P.type)).includes(`${OWL}Ontology`)
    || valueToIris(getAny(node, P.type)).includes(`${OWL}Ontology`);
}

function firstString(node, keys) {
  const values = sortLanguagePreferred(valuesForKeys(node, keys));
  return valueToStrings(values)[0] || valueToDisplayValues(values)[0]?.value || '';
}

function displayValues(node, keys) {
  return valueToDisplayValues(sortLanguagePreferred(valuesForKeys(node, keys)));
}

function uniqueStrings(values) {
  return [...new Set((values || []).map((v) => String(v || '').trim()).filter(Boolean))];
}

function normalizeLogo(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'github' || v === 'gitlab' || v === 'git') return v;
  return 'git';
}

function normalizeRegistryEntry(entry) {
  if (!entry || typeof entry !== 'object' || !entry.iri) return null;
  return {
    iri: String(entry.iri),
    ontology_level: String(entry.ontology_level || 'unsorted').toLowerCase(),
    git_repo_url: String(entry.git_repo_url || ''),
    git_logo: normalizeLogo(entry.git_logo),
    issue_tracker_url: String(entry.issue_tracker_url || ''),
    file: String(entry.file || '')
  };
}

async function sha256Hex(text) {
  if (!globalThis.crypto?.subtle) return String(text.length);
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function annotateDocs(docs, meta) {
  return docs.map((doc) => ({
    ...doc,
    datasetId: meta.datasetId,
    source: meta.source,
    ontologyName: meta.ontologyName,
    fileName: meta.fileName,
    addedByUser: meta.source === 'user' || !!doc.addedByUser
  }));
}

export async function fetchGraphJsonLd() {
  const res = await fetch('./data/graph.jsonld', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch graph.jsonld: ${res.status}`);
  const text = await res.text();
  return { text, jsonld: parseGraphJsonLdText(text), fingerprint: await sha256Hex(text) };
}

export async function ensureBuiltinDataset() {
  await idbInit();
  const cachedDocs = await idbGetEnabledDocuments();
  const { text, jsonld, fingerprint } = await fetchGraphJsonLd();
  const meta = await idbGetDatasetMeta('builtin');
  const stale = !meta || meta.fingerprint !== fingerprint || meta.schemaVersion !== DATASET_SCHEMA_VERSION;

  if (!cachedDocs.length || stale) {
    const docs = annotateDocs(extractDocumentsFromJsonLd(jsonld), {
      datasetId: 'builtin',
      source: 'builtin',
      ontologyName: 'OntoEagle built-in graph',
      fileName: 'graph.jsonld'
    });
    await idbPutDocuments('builtin', docs);
    await idbPutDatasetMeta('builtin', {
      fingerprint,
      enabled: true,
      source: 'builtin',
      ontologyName: 'OntoEagle built-in graph',
      fileName: 'graph.jsonld',
      documentCount: docs.length,
      schemaVersion: DATASET_SCHEMA_VERSION,
      updatedAt: Date.now()
    });
  }

  return { text, jsonld, fingerprint };
}

function loadOntologySnapshot() {
  try {
    const raw = globalThis.localStorage?.getItem(ONTOLOGY_SNAPSHOT_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw);
    if (!snapshot || !Array.isArray(snapshot.records)) return null;
    if (Date.now() - Number(snapshot.updatedAt || 0) > ONTOLOGY_SNAPSHOT_MAX_AGE_MS) return null;
    const records = snapshot.records;
    return {
      records,
      byIri: new Map(records.map((record) => [record.iri, record])),
      versionToOntologyIri: new Map(Object.entries(snapshot.versionToOntologyIri || {})),
      fromSnapshot: true
    };
  } catch (_err) {
    return null;
  }
}

function saveOntologySnapshot(ontologyIndex) {
  try {
    const versionToOntologyIri = {};
    for (const [versionIri, ontologyIri] of ontologyIndex.versionToOntologyIri.entries()) {
      versionToOntologyIri[versionIri] = ontologyIri;
    }
    globalThis.localStorage?.setItem(ONTOLOGY_SNAPSHOT_KEY, JSON.stringify({
      updatedAt: Date.now(),
      records: ontologyIndex.records,
      versionToOntologyIri
    }));
  } catch (_err) {
    // Snapshot caching is opportunistic.
  }
}

export function extractOntologyRecordsFromJsonLd(jsonld) {
  const graph = getGraph(jsonld);
  const records = [];
  const versionToOntologyIri = new Map();

  for (const node of graph) {
    if (!node || typeof node !== 'object' || typeof node['@id'] !== 'string') continue;
    if (!hasOntologyType(node)) continue;

    const iri = node['@id'];
    const versionIris = valueToIris(getAny(node, P.versionIri));
    const record = {
      iri,
      label: firstString(node, P.label) || iri,
      description: firstString(node, P.description),
      versionIri: versionIris[0] || '',
      versionIriCount: versionIris.length,
      versionInfo: uniqueStrings(valueToStrings(getAny(node, P.versionInfo))),
      imports: uniqueStrings(valueToIris(getAny(node, P.imports))),
      license: displayValues(node, P.license),
      rightsHolder: displayValues(node, P.rightsHolder),
      creators: displayValues(node, P.creator),
      contributors: displayValues(node, P.contributor),
      comments: displayValues(node, P.comment),
      created: displayValues(node, P.created),
      modified: displayValues(node, P.modified),
      publisher: displayValues(node, P.publisher),
      citations: displayValues(node, P.citation),
      priorVersion: valueToIris(getAny(node, P.priorVersion)),
      backwardCompatibleWith: valueToIris(getAny(node, P.backwardCompatibleWith)),
      incompatibleWith: valueToIris(getAny(node, P.incompatibleWith)),
      registry: null,
      ontology_level: 'unsorted',
      registered: false,
      addedByUser: false
    };

    records.push(record);
    for (const versionIri of versionIris) versionToOntologyIri.set(versionIri, iri);
  }

  return { records, byIri: new Map(records.map((record) => [record.iri, record])), versionToOntologyIri };
}

export function loadRegistryOverrides() {
  try {
    const raw = globalThis.localStorage?.getItem(REGISTRY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeRegistryEntry).filter(Boolean) : [];
  } catch (_err) {
    return [];
  }
}

export function saveRegistryOverride(entry) {
  const normalized = normalizeRegistryEntry(entry);
  if (!normalized) return [];
  const existing = loadRegistryOverrides().filter((item) => item.iri !== normalized.iri);
  const next = [...existing, normalized].sort((a, b) => a.iri.localeCompare(b.iri));
  globalThis.localStorage?.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(next, null, 2));
  return next;
}

export function exportRegistryJson(entries) {
  return JSON.stringify((entries || []).map(normalizeRegistryEntry).filter(Boolean), null, 2);
}

export async function loadDefaultRegistry() {
  try {
    const res = await fetch('./data/ontology-registry.json', { cache: 'no-store' });
    if (!res.ok) return [];
    const parsed = await res.json();
    return Array.isArray(parsed) ? parsed.map(normalizeRegistryEntry).filter(Boolean) : [];
  } catch (_err) {
    return [];
  }
}

export function mergeRegistryEntries(defaultEntries, overrideEntries) {
  const byIri = new Map();
  for (const entry of defaultEntries || []) {
    const normalized = normalizeRegistryEntry(entry);
    if (normalized) byIri.set(normalized.iri, normalized);
  }
  for (const entry of overrideEntries || []) {
    const normalized = normalizeRegistryEntry(entry);
    if (normalized) byIri.set(normalized.iri, normalized);
  }
  return [...byIri.values()].sort((a, b) => a.iri.localeCompare(b.iri));
}

export function mergeOntologyRecordsWithRegistry(records, registryEntries) {
  const registryByIri = new Map((registryEntries || []).map((entry) => [entry.iri, entry]));
  return (records || []).map((record) => {
    const registry = registryByIri.get(record.iri) || null;
    return {
      ...record,
      registry,
      registered: !!registry,
      ontology_level: registry?.ontology_level || 'unsorted',
      git_repo_url: registry?.git_repo_url || '',
      git_logo: normalizeLogo(registry?.git_logo),
      issue_tracker_url: registry?.issue_tracker_url || '',
      file: registry?.file || ''
    };
  });
}

export function resolveOntologyIri(iri, ontologyIndex) {
  if (!iri) return '';
  if (ontologyIndex?.byIri?.has(iri)) return iri;
  return ontologyIndex?.versionToOntologyIri?.get(iri) || iri;
}

export function buildImportGraph(rootIri, ontologyIndex) {
  const edges = [];
  const visited = new Set();
  const nodes = new Set();

  function visit(iri) {
    const ontologyIri = resolveOntologyIri(iri, ontologyIndex);
    if (!ontologyIri || visited.has(ontologyIri)) return;
    visited.add(ontologyIri);
    nodes.add(ontologyIri);
    const record = ontologyIndex.byIri.get(ontologyIri);
    for (const imported of record?.imports || []) {
      const target = resolveOntologyIri(imported, ontologyIndex);
      nodes.add(target);
      edges.push({ source: ontologyIri, target, predicate: 'owl:imports', importedIri: imported });
      if (ontologyIndex.byIri.has(target)) visit(target);
    }
  }

  visit(rootIri);
  const uniqueEdges = [];
  const edgeKeys = new Set();
  for (const edge of edges) {
    const key = `${edge.source} -> ${edge.target}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    uniqueEdges.push(edge);
  }
  return { nodes: [...nodes], edges: uniqueEdges };
}

export function buildMermaidImportSyntax(rootIri, ontologyIndex) {
  const graph = buildImportGraph(rootIri, ontologyIndex);
  const ids = new Map(graph.nodes.map((iri, index) => [iri, `node${index + 1}`]));
  const lines = ['flowchart BT;'];
  for (const edge of graph.edges) {
    const sourceLabel = ontologyIndex.byIri.get(edge.source)?.label || edge.source;
    const targetLabel = ontologyIndex.byIri.get(edge.target)?.label || edge.target;
    lines.push(`${ids.get(edge.source)}(${JSON.stringify(sourceLabel)}) -- "owl:imports" --> ${ids.get(edge.target)}(${JSON.stringify(targetLabel)});`);
  }
  for (const iri of graph.nodes) {
    if (!graph.edges.some((edge) => edge.source === iri || edge.target === iri)) {
      lines.push(`${ids.get(iri)}(${JSON.stringify(ontologyIndex.byIri.get(iri)?.label || iri)});`);
    }
  }
  return { syntax: lines.join('\n'), graph, ids };
}

export async function loadOntologyWorkspace(options = {}) {
  await idbInit();
  const includeDocs = options.includeDocs !== false;
  let docs = includeDocs ? await idbGetEnabledDocuments() : [];
  const snapshot = options.preferSnapshot ? loadOntologySnapshot() : null;
  let ontologyIndex = snapshot;

  if (includeDocs && !docs.length) {
    await ensureBuiltinDataset();
    docs = await idbGetEnabledDocuments();
  }

  if (!ontologyIndex) {
    const { jsonld } = await ensureBuiltinDataset();
    ontologyIndex = extractOntologyRecordsFromJsonLd(jsonld);
    saveOntologySnapshot(ontologyIndex);
  }

  const docsByIri = mapByIri(docs);

  for (const doc of docs) {
    if (doc.addedByUser && doc.type === 'Ontology' && !ontologyIndex.byIri.has(doc.iri)) {
      const record = {
        iri: doc.iri,
        label: doc.label || doc.iri,
        description: doc.definition || '',
        versionIri: '',
        versionIriCount: 0,
        versionInfo: [],
        imports: [],
        license: [],
        rightsHolder: [],
        creators: [],
        contributors: [],
        comments: doc.comments || [],
        registry: null,
        ontology_level: 'unsorted',
        registered: false,
        addedByUser: true
      };
      ontologyIndex.records.push(record);
      ontologyIndex.byIri.set(record.iri, record);
    }
  }

  const registry = mergeRegistryEntries(await loadDefaultRegistry(), loadRegistryOverrides());
  const records = mergeOntologyRecordsWithRegistry(ontologyIndex.records, registry);
  ontologyIndex.records = records;
  ontologyIndex.byIri = new Map(records.map((record) => [record.iri, record]));
  return { records, registry, ontologyIndex, docs, docsByIri, fromSnapshot: !!snapshot };
}

function ontologyTermPrefixHints(ontologyIri) {
  const iri = String(ontologyIri || '');
  const hints = [iri];
  if (iri.endsWith('#') || iri.endsWith('/')) hints.push(iri);
  else hints.push(`${iri}#`, `${iri}/`);

  const oboMatch = iri.match(/^https?:\/\/purl\.obolibrary\.org\/obo\/([a-z0-9_-]+)\.owl$/i);
  if (oboMatch) hints.push(`http://purl.obolibrary.org/obo/${oboMatch[1].toUpperCase()}_`);

  return [...new Set(hints)];
}

export function termsForOntology(ontologyIri, docs) {
  const prefixHints = ontologyTermPrefixHints(ontologyIri);
  return (docs || [])
    .filter((doc) => doc.type !== 'Ontology')
    .filter((doc) => (doc.curated_in || []).includes(ontologyIri)
      || doc.ontologyName === ontologyIri
      || prefixHints.some((prefix) => String(doc.iri || '').startsWith(prefix)))
    .map((doc) => ({
      iri: doc.iri,
      type: (doc.typeIris?.length ? doc.typeIris : [doc.type]).join(', '),
      label: doc.label || '',
      synonym: (doc.altLabels || []).join('; '),
      definition: doc.definition || ''
    }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.iri.localeCompare(b.iri));
}

export function truncateText(text, maxWords = 300, maxChars = 500) {
  const raw = String(text || '').trim();
  const words = raw.split(/\s+/).filter(Boolean);
  if (raw.length <= maxChars && words.length <= maxWords) return { text: raw, truncated: false };
  const byChars = raw.slice(0, maxChars).trim();
  const byWords = words.slice(0, maxWords).join(' ');
  const preview = byChars.length <= byWords.length ? byChars : byWords;
  return { text: preview.replace(/[,\s;:.]+$/, ''), truncated: true };
}
