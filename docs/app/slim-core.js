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

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function isNamedIri(value) {
  return typeof value === 'string' && /^(https?:|urn:)/i.test(value);
}

function isBlankId(value) {
  return typeof value === 'string' && value.startsWith('_:');
}

function valueId(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof value['@id'] === 'string') return value['@id'];
  return '';
}

function allBlankNodesForDocs(docsByIri) {
  const blankNodes = new Map();
  for (const doc of docsByIri.values()) {
    for (const [id, node] of Object.entries(doc.blankNodeMap || {})) {
      if (!blankNodes.has(id)) blankNodes.set(id, node);
    }
  }
  return blankNodes;
}

function collectIrisFromValue(value, blankNodes, visited = new Set()) {
  const found = [];
  const id = valueId(value);
  if (isNamedIri(id)) found.push(id);

  if (isBlankId(id) && !visited.has(id)) {
    visited.add(id);
    const blankNode = blankNodes.get(id);
    if (blankNode) found.push(...collectIrisFromObject(blankNode, blankNodes, visited));
  } else if (value && typeof value === 'object' && !id) {
    found.push(...collectIrisFromObject(value, blankNodes, visited));
  }

  return found;
}

function collectIrisFromObject(object, blankNodes, visited = new Set()) {
  const found = [];
  if (!object || typeof object !== 'object') return found;
  for (const [key, raw] of Object.entries(object)) {
    if (key === '@id') continue;
    if (key === '@type') {
      for (const typeValue of asArray(raw)) {
        if (isNamedIri(typeValue)) found.push(typeValue);
      }
      continue;
    }
    for (const value of asArray(raw)) {
      found.push(...collectIrisFromValue(value, blankNodes, visited));
    }
  }
  return found;
}

function collectAxiomTargets(doc, strategy, mode, blankNodes, traversedBlankIds) {
  if (!shouldFollowParent(doc, strategy)) return [];
  const axioms = strategy === 'sco' ? doc.subClassOfAxioms || [] : doc.subPropertyOfAxioms || [];
  const targets = [];

  for (const axiom of axioms) {
    const id = valueId(axiom);
    if (isNamedIri(id)) {
      targets.push(id);
      continue;
    }
    if (mode === 'maximal') {
      if (isBlankId(id)) traversedBlankIds.add(id);
      targets.push(...collectIrisFromValue(axiom, blankNodes));
    }
  }

  return targets.filter((iri) => !iri.startsWith(COMMON_PREFIXES.owl));
}

export function expandSlimTerms(docs, seeds, options = {}) {
  const docsByIri = docsArrayToMap(docs);
  const scoMode = options.scoMode || options.mode || 'minimal';
  const spoMode = options.spoMode || options.mode || 'minimal';
  const includeHierarchy = options.includeHierarchy !== false;
  const blankNodes = allBlankNodesForDocs(docsByIri);
  const traversedBlankIds = new Set();
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
    if (!doc || !includeHierarchy) continue;

    for (const strategy of ['sco', 'spo']) {
      const mode = strategy === 'sco' ? scoMode : spoMode;
      for (const target of collectAxiomTargets(doc, strategy, mode, blankNodes, traversedBlankIds)) {
        if (!included.has(target)) queue.push(target);
      }
    }
  }

  return {
    iris: Array.from(included).sort(),
    missing: Array.from(new Set(missing)).sort(),
    traversedBlankIds: Array.from(traversedBlankIds).sort()
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

function cloneJson(value) {
  if (value == null || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value));
}

function axiomReferencesIncludedIri(axiom, included, blankNodes) {
  const id = valueId(axiom);
  if (isNamedIri(id)) return included.has(id);
  return collectIrisFromValue(axiom, blankNodes).some((iri) => included.has(iri));
}

function collectBlankNodeClosure(blankId, blankNodes, out = new Map(), seen = new Set()) {
  if (!isBlankId(blankId) || seen.has(blankId)) return out;
  seen.add(blankId);
  const node = blankNodes.get(blankId);
  if (!node) return out;
  out.set(blankId, cloneJson(node));
  for (const raw of Object.values(node)) {
    for (const value of asArray(raw)) {
      const id = valueId(value);
      if (isBlankId(id)) collectBlankNodeClosure(id, blankNodes, out, seen);
      if (value && typeof value === 'object' && Array.isArray(value['@list'])) {
        for (const listValue of value['@list']) {
          const listId = valueId(listValue);
          if (isBlankId(listId)) collectBlankNodeClosure(listId, blankNodes, out, seen);
        }
      }
    }
  }
  return out;
}

function includedHierarchyAxioms(doc, key, iris, mode, blankNodes, traversedBlankIds) {
  const included = new Set(iris);
  const axioms = key === 'rdfs:subClassOf' ? doc?.subClassOfAxioms || [] : doc?.subPropertyOfAxioms || [];
  const out = [];
  for (const axiom of axioms) {
    const id = valueId(axiom);
    if (isNamedIri(id) && included.has(id)) out.push(cloneJson(axiom));
    if (mode === 'maximal' && isBlankId(id) && (traversedBlankIds.has(id) || axiomReferencesIncludedIri(axiom, included, blankNodes))) {
      out.push(cloneJson(axiom));
    }
  }
  return out;
}

export function buildSlimJsonLd(docs, iris, options = {}) {
  const docsByIri = docsArrayToMap(docs);
  const annotationMode = options.annotationMode || 'minimal';
  const provenanceMode = options.provenanceMode || 'lite';
  const scoMode = options.scoMode || options.mode || 'minimal';
  const spoMode = options.spoMode || options.mode || 'minimal';
  const traversedBlankIds = new Set(options.traversedBlankIds || []);
  const blankNodes = allBlankNodesForDocs(docsByIri);
  const derivedAt = options.derivedAt || new Date().toISOString();
  const graph = [];

  for (const iri of [...iris].sort()) {
    const doc = docsByIri.get(iri);
    const node = {
      '@id': iri,
      '@type': doc?.type === 'Class' ? ['owl:Class'] : doc?.type ? [`owl:${doc.type}`] : []
    };

    addIf(node, 'rdfs:label', doc?.label || shortIri(iri));
    const scoAxioms = includedHierarchyAxioms(doc, 'rdfs:subClassOf', iris, scoMode, blankNodes, traversedBlankIds);
    const spoAxioms = includedHierarchyAxioms(doc, 'rdfs:subPropertyOf', iris, spoMode, blankNodes, traversedBlankIds);
    if (scoAxioms.length) node['rdfs:subClassOf'] = scoAxioms;
    if (spoAxioms.length) node['rdfs:subPropertyOf'] = spoAxioms;

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

  const blankClosure = new Map();
  for (const blankId of traversedBlankIds) {
    collectBlankNodeClosure(blankId, blankNodes, blankClosure);
  }
  for (const node of graph) {
    for (const value of [...asArray(node['rdfs:subClassOf']), ...asArray(node['rdfs:subPropertyOf'])]) {
      const id = valueId(value);
      if (isBlankId(id)) collectBlankNodeClosure(id, blankNodes, blankClosure);
    }
  }
  graph.push(...Array.from(blankClosure.values()).sort((a, b) => String(a['@id']).localeCompare(String(b['@id']))));

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
  if (value && typeof value === 'object' && value['@id']) {
    return isBlankId(value['@id']) ? value['@id'] : `<${value['@id']}>`;
  }
  if (value && typeof value === 'object' && Array.isArray(value['@list'])) {
    return `( ${value['@list'].map(turtleTerm).join(' ')} )`;
  }
  const raw = value && typeof value === 'object' && '@value' in value ? value['@value'] : value;
  return `"${String(raw ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

function turtleSubject(id) {
  return isBlankId(id) ? id : `<${id}>`;
}

function turtlePredicate(key) {
  if (key === '@type') return 'rdf:type';
  return isNamedIri(key) ? `<${key}>` : key;
}

function typeToTurtleTerm(value) {
  const raw = typeof value === 'string' ? value : valueId(value);
  if (isNamedIri(raw)) return { '@id': raw };
  return { '@id': COMMON_PREFIXES.owl + String(raw).replace(/^owl:/, '') };
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
      const pred = turtlePredicate(key);
      for (const value of values) statements.push(`  ${pred} ${turtleTerm(key === '@type' ? typeToTurtleTerm(value) : value)}`);
    }
    if (!statements.length) continue;
    lines.push(turtleSubject(node['@id']));
    lines.push(`${statements.join(' ;\n')} .`);
    lines.push('');
  }

  return lines.join('\n');
}

export function buildSlimFromSeeds(docs, seedText, options = {}) {
  const seeds = parseSeedText(seedText);
  const expanded = expandSlimTerms(docs, seeds, options);
  const jsonld = buildSlimJsonLd(docs, expanded.iris, { ...options, traversedBlankIds: expanded.traversedBlankIds });
  return {
    seeds,
    ...expanded,
    jsonld,
    turtle: serializeSlimTurtle(jsonld)
  };
}
