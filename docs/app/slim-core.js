import { COMMON_PREFIXES, shortIri } from './namespaces.js';

export function parseSeedText(text) {
  return Array.from(new Set(
    String(text || '')
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+#.*$/, '').trim())
      .filter((line) => /^(https?:|urn:)/i.test(line))
  ));
}

export function docsArrayToMap(docs) {
  return docs instanceof Map ? docs : new Map((docs || []).map((d) => [d.iri, d]));
}

function shouldFollowParent(doc, strategy) {
  if (!doc) return false;
  if (strategy === 'sco' && doc.type === 'Class') return true;
  if (strategy === 'spo' && /Property$/.test(doc.type || '')) return true;
  return false;
}

export function expandSlimTerms(docs, seeds, options = {}) {
  const docsByIri = docsArrayToMap(docs);
  const strategy = options.strategy || 'sco';
  const includeHierarchy = options.includeHierarchy !== false;
  const includeChildren = !!options.includeChildren;
  const included = new Set();
  const missing = [];
  const queue = [...parseSeedText(seeds.join('\n'))];

  for (const iri of queue) {
    if (!docsByIri.has(iri)) missing.push(iri);
  }

  while (queue.length) {
    const iri = queue.shift();
    if (!iri || included.has(iri)) continue;
    included.add(iri);

    const doc = docsByIri.get(iri);
    if (!doc || !includeHierarchy || !shouldFollowParent(doc, strategy)) continue;

    for (const parent of doc.parents || []) {
      if (!included.has(parent)) queue.push(parent);
    }
    if (includeChildren) {
      for (const child of doc.children || []) {
        if (!included.has(child)) queue.push(child);
      }
    }
  }

  return {
    iris: Array.from(included).sort(),
    missing: Array.from(new Set(missing)).sort()
  };
}

function valueObject(value) {
  if (value == null || value === '') return null;
  return { '@value': String(value) };
}

function addIf(node, key, value) {
  if (Array.isArray(value)) {
    if (value.length) node[key] = value.map((v) => typeof v === 'string' && /^(https?:|urn:)/i.test(v) ? { '@id': v } : valueObject(v)).filter(Boolean);
    return;
  }
  const obj = typeof value === 'string' && /^(https?:|urn:)/i.test(value) ? { '@id': value } : valueObject(value);
  if (obj) node[key] = obj;
}

export function buildSlimJsonLd(docs, iris, options = {}) {
  const docsByIri = docsArrayToMap(docs);
  const annotationMode = options.annotationMode || 'minimal';
  const provenanceMode = options.provenanceMode || 'lite';
  const derivedAt = options.derivedAt || new Date().toISOString();
  const graph = [];

  for (const iri of [...iris].sort()) {
    const doc = docsByIri.get(iri);
    const node = {
      '@id': iri,
      '@type': doc?.type === 'Class' ? ['owl:Class'] : doc?.type ? [`owl:${doc.type}`] : []
    };

    addIf(node, 'rdfs:label', doc?.label || shortIri(iri));
    if (doc?.parents?.length) {
      const hierarchyKey = doc.type === 'Class' ? 'rdfs:subClassOf' : /Property$/.test(doc.type || '') ? 'rdfs:subPropertyOf' : 'rdfs:subClassOf';
      node[hierarchyKey] = doc.parents.filter((p) => iris.includes(p)).map((p) => ({ '@id': p }));
    }

    if (annotationMode === 'maximal') {
      addIf(node, 'skos:definition', doc?.definition);
      addIf(node, 'skos:example', doc?.examples || []);
      addIf(node, 'skos:note', doc?.clarifications || []);
      addIf(node, 'dcterms:bibliographicCitation', doc?.citations || []);
      addIf(node, 'skos:altLabel', doc?.altLabels || []);
    }

    if (provenanceMode === 'lite' || provenanceMode === 'full') {
      addIf(node, 'rdfs:isDefinedBy', doc?.curated_in || []);
    }
    if (provenanceMode === 'full') {
      addIf(node, 'dcterms:created', derivedAt);
      addIf(node, 'dcterms:source', doc?.ontologyName || doc?.datasetId || '');
    }

    graph.push(node);
  }

  return {
    '@context': {
      rdf: COMMON_PREFIXES.rdf,
      rdfs: COMMON_PREFIXES.rdfs,
      owl: COMMON_PREFIXES.owl,
      skos: COMMON_PREFIXES.skos,
      dcterms: COMMON_PREFIXES.dcterms
    },
    '@graph': graph
  };
}

function turtleTerm(value) {
  if (value && typeof value === 'object' && value['@id']) return `<${value['@id']}>`;
  const raw = value && typeof value === 'object' && '@value' in value ? value['@value'] : value;
  return `"${String(raw ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

export function serializeSlimTurtle(jsonld) {
  const lines = [
    '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
    '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
    '@prefix owl: <http://www.w3.org/2002/07/owl#> .',
    '@prefix skos: <http://www.w3.org/2004/02/skos/core#> .',
    '@prefix dcterms: <http://purl.org/dc/terms/> .',
    ''
  ];

  for (const node of jsonld['@graph'] || []) {
    const predicates = Object.keys(node).filter((k) => k !== '@id').sort();
    const statements = [];
    for (const key of predicates) {
      const values = Array.isArray(node[key]) ? node[key] : [node[key]];
      const pred = key === '@type' ? 'rdf:type' : key;
      for (const value of values) statements.push(`  ${pred} ${turtleTerm(key === '@type' ? { '@id': COMMON_PREFIXES.owl + String(value).replace(/^owl:/, '') } : value)}`);
    }
    if (!statements.length) continue;
    lines.push(`<${node['@id']}>`);
    lines.push(`${statements.join(' ;\n')} .`);
    lines.push('');
  }

  return lines.join('\n');
}

export function buildSlimFromSeeds(docs, seedText, options = {}) {
  const seeds = parseSeedText(seedText);
  const expanded = expandSlimTerms(docs, seeds, options);
  const jsonld = buildSlimJsonLd(docs, expanded.iris, options);
  return {
    seeds,
    ...expanded,
    jsonld,
    turtle: serializeSlimTurtle(jsonld)
  };
}
