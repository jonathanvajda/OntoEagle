/**
 * docs/app/search-main.js
 * DOM + orchestration for the Ontology Lookup app.
 *
 * Responsibilities (side-effects):
 * - Fetch consolidated dataset (docs/data/graph.jsonld)
 * - Register service worker (docs/sw.js)
 * - Hydrate/load IndexedDB caches (settings, docs, index) [Stage E minimal]
 * - Handle form events and render results/details
 *
 * Pure logic lives in:
 * - normalize.js
 * - rdf_extract.js
 * - search.js
 * - types.js
 */

import { ADDED_BY_USER_IRI, extractDocumentsFromJsonLd, mapByIri, parseGraphJsonLdText } from './rdf_extract.js';
import { searchDocuments } from './search.js';
import { defaultSearchOptions } from './types.js';
import { mintBundleIri, BUNDLE_LS_KEY, setShoppingCartCount, loadSlimBundleDoc, getShoppingCartCountFromStorage} from './bundler-core.js';
import { parseRdfTextToJsonLd, readFileAsText } from './rdf_io.js';
import { shortIri } from './namespaces.js';
  

// Minimal IDB wrappers (you can expand these in indexeddb.min.js later)
import {
  idbInit,
  idbGetActiveSettings,
  idbPutActiveSettings,
  idbGetDatasetMeta,
  idbGetAllDatasetMeta,
  idbPutDatasetMeta,
  idbGetEnabledDocuments,
  idbPutDocuments,
  idbSetDatasetEnabled,
  idbDeleteDataset
} from './indexeddb.min.js';

/* -----------------------------
 * DOM refs
 * ----------------------------- */

const elStatusText = document.getElementById('ontStatusText');

const form = document.getElementById('ontSearchForm');
const inputQuery = document.getElementById('ontQuery');

const optExact = document.getElementById('optExact');
const optWildcard = document.getElementById('optWildcard');

const optIncludeDefinition = document.getElementById('optIncludeDefinition');
const optIncludeCitation = document.getElementById('optIncludeCitation');
const optIncludeExamples = document.getElementById('optIncludeExamples');
const optIncludeClarifications = document.getElementById('optIncludeClarifications');

const optNamespaces = document.getElementById('optNamespaces');

const btnSaveSettings = document.getElementById('ontSaveSettingsBtn');
const btnResetSettings = document.getElementById('ontResetSettingsBtn');

const elResultsCount = document.getElementById('ontResultsCount');
const elResultsTime = document.getElementById('ontResultsTime');
const elResultsList = document.getElementById('ontResultsList');
const elEmptyState = document.getElementById('ontEmptyState');

const elDetails = document.getElementById('ontDetails');
const ontUserOntologyFile = document.getElementById('ontUserOntologyFile');
const ontUserOntologyList = document.getElementById('ontUserOntologyList');
const ontUserOntologyStatus = document.getElementById('ontUserOntologyStatus');

const typeCheckboxes = /** @type {NodeListOf<HTMLInputElement>} */ (document.querySelectorAll('.optType'));

/* -----------------------------
 * App state (in-memory)
 * ----------------------------- */

let docsByIri = new Map();   // Map<string, OntologyDocument>
let options = structuredClone(defaultSearchOptions);

/* -----------------------------
 * Utilities
 * ----------------------------- */

/**
 * Update the top status line (aria-live).
 * @param {string} s
 */
function setStatus(s) {
  if (elStatusText) elStatusText.textContent = s;
}

/**
 * @param {any} err
 * @returns {string}
 */
function errToString(err) {
  if (!err) return 'Unknown error';
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Compute SHA-256 fingerprint of a text (used to detect dataset changes).
 * @param {string} text
 * @returns {Promise<string>}
 */
async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function stableDatasetId(fileName, fingerprint) {
  const safeName = String(fileName || 'ontology')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'ontology';
  return `user:${safeName}:${fingerprint.slice(0, 16)}`;
}

function annotateDocs(docs, meta) {
  return docs.map((doc) => ({
    ...doc,
    datasetId: meta.datasetId,
    source: meta.source,
    ontologyName: meta.ontologyName || meta.fileName || meta.datasetId,
    fileName: meta.fileName || '',
    addedByUser: meta.source === 'user' || !!doc.addedByUser
  }));
}

function annotateUserJsonLd(jsonld) {
  const graph = Array.isArray(jsonld?.['@graph']) ? jsonld['@graph'] : [];
  for (const node of graph) {
    if (node && typeof node === 'object' && typeof node['@id'] === 'string' && node['@id'].startsWith('http')) {
      node[ADDED_BY_USER_IRI] = [{ '@value': 'TRUE' }];
    }
  }
  return jsonld;
}

function labelForIri(iri) {
  const doc = docsByIri.get(iri);
  return doc?.label || shortIri(iri) || iri;
}

function sortIrisByLabel(iris) {
  return [...new Set(iris || [])].sort((a, b) => labelForIri(a).localeCompare(labelForIri(b)));
}

/**
 * Read the current UI controls into `options`.
 * @returns {import('./types.js').SearchOptions}
 */
function readOptionsFromUI() {
  const selectedTypes = Array.from(typeCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  const ns = (optNamespaces?.value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return {
    exact: !!optExact?.checked,
    wildcard: !!optWildcard?.checked,
    types: /** @type {any} */ (selectedTypes),
    namespaces: ns,
    includeDefinition: !!optIncludeDefinition?.checked,
    includeCitation: !!optIncludeCitation?.checked,
    includeExamples: !!optIncludeExamples?.checked,
    includeClarifications: !!optIncludeClarifications?.checked
  };
}

/**
 * Apply options to the UI controls.
 * @param {import('./types.js').SearchOptions} o
 */
function applyOptionsToUI(o) {
  if (optExact) optExact.checked = !!o.exact;
  if (optWildcard) optWildcard.checked = !!o.wildcard;

  if (optIncludeDefinition) optIncludeDefinition.checked = !!o.includeDefinition;
  if (optIncludeCitation) optIncludeCitation.checked = !!o.includeCitation;
  if (optIncludeExamples) optIncludeExamples.checked = !!o.includeExamples;
  if (optIncludeClarifications) optIncludeClarifications.checked = !!o.includeClarifications;

  if (optNamespaces) optNamespaces.value = (o.namespaces || []).join(', ');

  const set = new Set(o.types || []);
  for (const cb of typeCheckboxes) {
    cb.checked = set.has(cb.value);
  }
}

/**
 * Escape unsafe HTML for rendering.
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  return (s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* -----------------------------
 * Rendering
 * ----------------------------- */

/**
 * Render result list.
 * Uses role="listbox" and role="option" semantics as set in the HTML.
 *
 * @param {Array<{
 *   doc: import('./types.js').OntologyDocument,
 *   score: number,
 *   matchedTokenCount: number
 * }>} results
 */
function renderResults(results) {
  elResultsList.innerHTML = '';

  if (!results.length) {
    elEmptyState.hidden = false;
    elResultsList.setAttribute('aria-activedescendant', '');
    return;
  }

  elEmptyState.hidden = true;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const id = `ontOpt_${i}`;

    const li = document.createElement('li');
    li.className = 'ont-search__result';
    li.id = id;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', i === 0 ? 'true' : 'false');

    // Button for focus/activation
   
    const resultDiv = document.createElement('div');
    resultDiv.className = 'ont-search__result';
    resultDiv.dataset.iri = r.doc.iri;

    resultDiv.innerHTML = `
      <div class="ont-search__resultTitle">${escapeHtml(r.doc.label || r.doc.iri)}</div>
      <div class="ont-search__resultMeta">
        <span class="ont-search__pill">${escapeHtml(r.doc.type)}</span>
        ${r.doc.addedByUser ? '<span class="ont-search__pill ont-search__pill--user">added by user</span>' : ''}
        <br />
      </div>
      <div class="ont-search__resultIri">${escapeHtml(r.doc.iri)}</div>
    `.trim();

    resultDiv.addEventListener('click', () => {
      selectResultByIri(r.doc.iri);
    });

    li.appendChild(resultDiv);
    elResultsList.appendChild(li);
  }

  // Set initial active descendant to first item (but focus stays where it is)
  elResultsList.setAttribute('aria-activedescendant', 'ontOpt_0');
}

function renderTaxonomyNode(iri, className = '') {
  const label = labelForIri(iri);
  return `<li class="ont-search__treeItem ${className}">
    <span class="ont-search__treeNode" title="${escapeHtml(iri)}">${escapeHtml(label)}</span>
  </li>`;
}

function renderTaxonomy(doc) {
  const parents = sortIrisByLabel(doc.parents || []).slice(0, 6);
  const siblings = sortIrisByLabel(
    parents.flatMap((parent) => (docsByIri.get(parent)?.children || []).filter((iri) => iri !== doc.iri))
  ).slice(0, 8);
  const children = sortIrisByLabel(doc.children || []).slice(0, 8);

  if (!parents.length && !siblings.length && !children.length) return '';

  const parentHtml = parents.length
    ? `<ul class="ont-search__treeLevel ont-search__treeLevel--parents">${parents.map((iri) => renderTaxonomyNode(iri)).join('')}</ul>`
    : '';
  const siblingHtml = siblings.length
    ? `<ul class="ont-search__treeLevel ont-search__treeLevel--siblings">${siblings.map((iri) => renderTaxonomyNode(iri, 'ont-search__treeItem--sibling')).join('')}</ul>`
    : '';
  const childHtml = children.length
    ? `<ul class="ont-search__treeLevel ont-search__treeLevel--children">${children.map((iri) => renderTaxonomyNode(iri)).join('')}</ul>`
    : '';

  return `
    <section class="ont-search__taxonomy" aria-label="Taxonomy context">
      <h3 class="ont-search__detailsSubhead">Taxonomy</h3>
      <div class="ont-search__tree" role="tree">
        ${parentHtml}
        ${siblingHtml}
        <ul class="ont-search__treeLevel ont-search__treeLevel--focus">
          ${renderTaxonomyNode(doc.iri, 'ont-search__treeItem--focus')}
        </ul>
        ${childHtml}
      </div>
    </section>
  `.trim();
}

/**
 * @param {any} doc
 */
function saveSlimBundleDoc(doc) {
  localStorage.setItem(BUNDLE_LS_KEY, JSON.stringify(doc, null, 2));
}

/**
 * Find or create the bundle (skos:Collection) in @graph.
 * @param {any} bundleDoc
 * @returns {any} the collection node
 */
function ensureSlimCollection(bundleDoc) {
  if (!bundleDoc['@graph']) bundleDoc['@graph'] = [];

  let col = bundleDoc['@graph'].find(
    (n) => n && n['@type'] === 'skos:Collection'
  );

  if (!col) {
    col = {
      "@id": mintBundleIri(),
      "@type": "skos:Collection",
      "skos:member": []
    };
    bundleDoc['@graph'].unshift(col);
  }

  if (!Array.isArray(col['skos:member'])) col['skos:member'] = [];
  return col;
}

/**
 * Upsert the member node and membership edge.
 * @param {any} bundleDoc
 * @param {any} itemNode JSON-LD node with @id, @type, label/definition/etc.
 * @returns {{memberCount:number, changed:boolean}}
 */
function addItemToSlimBundle(bundleDoc, itemNode) {
  if (!itemNode || typeof itemNode !== 'object' || !itemNode['@id']) {
    return { memberCount: 0, changed: false };
  }

  const col = ensureSlimCollection(bundleDoc);

  const iri = itemNode['@id'];
  const members = col['skos:member'];

  const alreadyMember = members.some((m) => m && m['@id'] === iri);
  if (!alreadyMember) {
    members.push({ "@id": iri });
  }

  // Upsert full node into @graph (by @id)
  const g = bundleDoc['@graph'];
  const idx = g.findIndex((n) => n && n['@id'] === iri);

  if (idx >= 0) {
    // merge (bundle version gets updated fields if present on itemNode)
    g[idx] = { ...g[idx], ...itemNode };
  } else {
    g.push(itemNode);
  }

  const changed = !alreadyMember || idx < 0;
  return { memberCount: members.length, changed };
}



/**
 * Render details panel for a doc.
 * @param {import('./types.js').OntologyDocument} doc
 */
function renderDetails(doc) {
  if (!doc) {
    elDetails.innerHTML = `<p class="ont-search__help">Select a result to view details.</p>`;
    return;
  }

  const def = doc.definition ? `<p class="ont-search__detailsMeta"><strong>Definition:</strong><br />${escapeHtml(doc.definition)}</p>` : '';
  const alts = (doc.altLabels && doc.altLabels.length)
    ? `<p class="ont-search__detailsMeta"><strong>Alt labels:</strong><br />${escapeHtml(doc.altLabels.join(', '))}</p>`
    : '';

  const citations = (doc.citations && doc.citations.length)
    ? `<p class="ont-search__detailsMeta"><strong>Citations:</strong><br />${escapeHtml(doc.citations.join('; '))}</p>`
    : '';

  const examples = (doc.examples && doc.examples.length)
    ? `<p class="ont-search__detailsMeta"><strong>Examples:</strong><br />${escapeHtml(doc.examples.join('; '))}</p>`
    : '';

  const clarifications = (doc.clarifications && doc.clarifications.length)
    ? `<p class="ont-search__detailsMeta"><strong>Notes:</strong><br />${escapeHtml(doc.clarifications.join('; '))}</p>`
    : '';

  const curated_in = (doc.curated_in && doc.curated_in.length)
    ? `<p class="ont-search__detailsMeta"><strong>Curated in:</strong><br />${escapeHtml(doc.curated_in.join('; '))}</p>`
    : '';
  const userPill = doc.addedByUser ? '<span class="ont-search__pill ont-search__pill--user">added by user</span>' : '';
  const taxonomy = renderTaxonomy(doc);

    
  elDetails.innerHTML = `
    <div class="ont-search__detailsHeader">
      <div class="ont-search__detailsTitle"><strong>Label:</strong> <span style="font-size: 2rem; font-weight: 600">${escapeHtml(doc.label || doc.iri)}</span></div>
      <div class="ont-search__detailsMeta"><strong>Type:</strong> <span class="ont-search__pill">${escapeHtml(doc.type)}</span> ${userPill}
      </div>
      <div class="ont-search__detailsIri"><strong>IRI:</strong> <code>${escapeHtml(doc.iri)}</code>
      </div>
      <div class="ont-search__detailsIri"><strong>Namespace:</strong> <code>${escapeHtml(doc.namespace || '')}</code>
      </div>
    </div>
    ${def}
    ${alts}
    ${citations}
    ${examples}
    ${clarifications}
    ${curated_in}
    ${taxonomy}
    <div class="ont-search__row" style="margin-top:0.75rem;">
      <button id="ontAddToSlimBundleBtn" class="ont-search__btn" type="button">
        Add to bundle for slim
      </button>
    </div>
  `.trim();

  {const btn = document.getElementById('ontAddToSlimBundleBtn');

  if (btn) {
    btn.onclick = () => {
      // Build the JSON-LD node to store. Use your doc object as the source of truth.
      // Map your OntologyDocument-ish object into JSON-LD node shape.
      const itemNode = {
        "@id": doc.iri,
        "@type": Array.isArray(doc.type)
          ? doc.type
          : doc.type
            ? [`owl:${doc.type}`] // simple mapping; ok for your example
            : [],
        "rdfs:label": doc.label || doc.iri
      };

      // Optional fields (only write if present)
      if (doc.definition) itemNode["skos:definition"] = doc.definition;
      if (doc.curatedIn) itemNode["rdfs:isDefinedBy"] = { "@id": doc.curatedIn }; // if you store that
      // If you store citations/examples/clarifications, you can map them too.

      const bundleDoc = loadSlimBundleDoc();
      const { memberCount } = addItemToSlimBundle(bundleDoc, itemNode);
      saveSlimBundleDoc(bundleDoc);
      setShoppingCartCount(memberCount);

      // Optional: give the user feedback
      btn.textContent = 'Added ✓';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = 'Add to bundle for slim';
        btn.disabled = false;
      }, 800);
    };
  }
}
}

/**
 * Mark a result as selected and update aria-selected + details panel.
 * @param {string} iri
 */
function selectResultByIri(iri) {
  const doc = docsByIri.get(iri);
  if (!doc) return;

  // Update aria-selected on listbox options
  const items = elResultsList.querySelectorAll('[role="option"]');
  for (const el of items) {
    const result = el.querySelector('.ont-search__result[data-iri]');
    const isSelected = result?.dataset?.iri === iri;
    el.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  }

  renderDetails(doc);
}

/* -----------------------------
 * Keyboard navigation for results list
 * ----------------------------- */

function setupResultsKeyboardNav() {
  elResultsList.addEventListener('keydown', (e) => {
    const items = Array.from(elResultsList.querySelectorAll('[role="option"]'));
    if (!items.length) return;

    const activeId = elResultsList.getAttribute('aria-activedescendant');
    let idx = items.findIndex(el => el.id === activeId);
    if (idx < 0) idx = 0;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      idx = Math.min(items.length - 1, idx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      idx = Math.max(0, idx - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const result = items[idx].querySelector('.ont-search__result[data-iri]');
      if (result?.dataset?.iri) selectResultByIri(result.dataset.iri);
      return;
    } else {
      return;
    }

    const next = items[idx];
    elResultsList.setAttribute('aria-activedescendant', next.id);

    // Move focus to the button inside the option for a good keyboard UX
    next.scrollIntoView({ block: 'nearest' });
  });
}

/* -----------------------------
 * Dataset load + caching
 * ----------------------------- */

/**
 * Fetch graph.jsonld (service worker will cache it).
 * @returns {Promise<{text:string, fingerprint:string}>}
 */
async function fetchGraph() {
  const res = await fetch('./data/graph.jsonld', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch graph.jsonld: ${res.status}`);
  const text = await res.text();
  const fingerprint = await sha256Hex(text);
  return { text, fingerprint };
}

/**
 * Hydrate in-memory docs+index from IndexedDB.
 * @returns {Promise<boolean>} true if loaded from cache
 */
async function tryLoadFromIdb() {
  const cachedDocs = await idbGetEnabledDocuments();
  if (cachedDocs && cachedDocs.length) {
    docsByIri = mapByIri(cachedDocs);
    return true;
  }
  return false;
}

/**
 * Build docs+index from graph.jsonld, persist to IDB.
 * @param {string} graphText
 * @param {string} fingerprint
 */
async function buildFromGraphAndPersist(graphText, fingerprint) {
  const json = parseGraphJsonLdText(graphText);
  const docs = annotateDocs(extractDocumentsFromJsonLd(json), {
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
    updatedAt: Date.now()
  });
  docsByIri = mapByIri(await idbGetEnabledDocuments());
}

async function refreshDocsFromEnabledDatasets() {
  docsByIri = mapByIri(await idbGetEnabledDocuments());
}

async function renderUserOntologyManager() {
  if (!ontUserOntologyList) return;
  const metas = (await idbGetAllDatasetMeta())
    .filter((m) => m && m.source === 'user')
    .sort((a, b) => String(a.ontologyName || a.fileName || '').localeCompare(String(b.ontologyName || b.fileName || '')));

  ontUserOntologyList.innerHTML = '';
  if (!metas.length) {
    ontUserOntologyList.innerHTML = '<p class="ont-search__help">No user ontologies loaded yet.</p>';
    if (ontUserOntologyStatus) ontUserOntologyStatus.textContent = '';
    return;
  }

  for (const meta of metas) {
    const row = document.createElement('div');
    row.className = 'ont-search__ontologyRow';
    row.innerHTML = `
      <div class="ont-search__ontologyMain">
        <div class="ont-search__ontologyName">${escapeHtml(meta.ontologyName || meta.fileName || meta.datasetId)}</div>
        <div class="ont-search__ontologyMeta">${escapeHtml(meta.fileName || '')} - ${Number(meta.documentCount || 0)} resources</div>
      </div>
      <label class="ont-search__ontologyToggle">
        <input type="checkbox" ${meta.enabled !== false ? 'checked' : ''} />
        <span>Enabled</span>
      </label>
      <button class="ont-search__btn ont-search__btn--ghost" type="button">Remove</button>
    `.trim();

    const toggle = row.querySelector('input');
    toggle?.addEventListener('change', async () => {
      await idbSetDatasetEnabled(meta.datasetId, toggle.checked);
      await refreshDocsFromEnabledDatasets();
      setStatus(toggle.checked ? 'User ontology enabled.' : 'User ontology disabled.');
    });

    const remove = row.querySelector('button');
    remove?.addEventListener('click', async () => {
      await idbDeleteDataset(meta.datasetId);
      await refreshDocsFromEnabledDatasets();
      await renderUserOntologyManager();
      setStatus('User ontology removed.');
    });

    ontUserOntologyList.appendChild(row);
  }

  if (ontUserOntologyStatus) ontUserOntologyStatus.textContent = `${metas.length} user ontolog${metas.length === 1 ? 'y' : 'ies'} loaded.`;
}

async function importUserOntologyFile(file) {
  if (!file) return;
  setStatus(`Reading ${file.name}...`);
  const text = await readFileAsText(file);
  const fingerprint = await sha256Hex(text);
  const datasetId = stableDatasetId(file.name, fingerprint);

  setStatus(`Parsing ${file.name}...`);
  const jsonld = annotateUserJsonLd(await parseRdfTextToJsonLd(text, file.name, { baseIRI: `urn:ontoeagle:upload:${encodeURIComponent(file.name)}` }));
  const docs = annotateDocs(extractDocumentsFromJsonLd(jsonld), {
    datasetId,
    source: 'user',
    ontologyName: file.name.replace(/\.[^.]+$/, ''),
    fileName: file.name
  });

  await idbPutDocuments(datasetId, docs);
  await idbPutDatasetMeta(datasetId, {
    fingerprint,
    enabled: true,
    source: 'user',
    ontologyName: file.name.replace(/\.[^.]+$/, ''),
    fileName: file.name,
    documentCount: docs.length,
    updatedAt: Date.now()
  });
  await refreshDocsFromEnabledDatasets();
  await renderUserOntologyManager();
  setStatus(`Loaded ${docs.length} resources from ${file.name}.`);
}

/* -----------------------------
 * App init + search execution
 * ----------------------------- */

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch (err) {
    // Non-fatal; app still works online
    console.warn('Service worker registration failed:', err);
  }
}

/**
 * Perform a search and render.
 * @param {string} query
 */
function runSearch(query) {
  const opts = readOptionsFromUI();
  options = opts;

  const t0 = performance.now();
  const { results } = searchDocuments(docsByIri, query, opts, 75);
  const t1 = performance.now();

  elResultsCount.textContent = String(results.length);
  elResultsTime.textContent = `${Math.round(t1 - t0)} ms`;

  renderResults(results);

  // Auto-select first result (if any)
  if (results.length) {
    selectResultByIri(results[0].doc.iri);
  } else {
    renderDetails(null);
  }
}

async function ontoEagleInit() {
  setStatus('Initializing…');

  await registerServiceWorker();
  await idbInit();

  // Load settings
  const saved = await idbGetActiveSettings();
  options = saved || structuredClone(defaultSearchOptions);
  applyOptionsToUI(options);

  // Prefer IDB cache; fall back to graph fetch if needed or outdated
  setStatus('Loading cached index…');
  const cacheOk = await tryLoadFromIdb();

  setStatus('Checking dataset…');
  const { text, fingerprint } = await fetchGraph();
  const meta = await idbGetDatasetMeta('builtin');

  const fingerprintChanged = !meta || meta.fingerprint !== fingerprint;

  if (!cacheOk || fingerprintChanged) {
    setStatus('Building index (first run or updated dataset)…');
    await buildFromGraphAndPersist(text, fingerprint);
  } else {
    await refreshDocsFromEnabledDatasets();
  }

  setStatus('Ready.');
  setShoppingCartCount(getShoppingCartCountFromStorage());
  await renderUserOntologyManager();

  // Initial UI state
  elResultsCount.textContent = '0';
  elResultsTime.textContent = '0 ms';
  renderDetails(null);

  // Wire events
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch(inputQuery.value || '');
  });

  inputQuery.addEventListener('input', () => {
    // Optional: live search as you type (debounce later)
    // For now, do nothing to keep Stage E stable.
  });

  btnSaveSettings?.addEventListener('click', async () => {
    const o = readOptionsFromUI();
    await idbPutActiveSettings(o);
    setStatus('Settings saved.');
  });

  btnResetSettings?.addEventListener('click', async () => {
    options = structuredClone(defaultSearchOptions);
    applyOptionsToUI(options);
    await idbPutActiveSettings(options);
    setStatus('Settings reset.');
  });

  ontUserOntologyFile?.addEventListener('change', async () => {
    const files = Array.from(ontUserOntologyFile.files || []);
    for (const file of files) {
      try {
        await importUserOntologyFile(file);
      } catch (err) {
        console.error(err);
        setStatus(`Ontology import failed: ${errToString(err)}`);
      }
    }
    ontUserOntologyFile.value = '';
  });

  setupResultsKeyboardNav();
}

ontoEagleInit().catch((err) => {
  console.error(err);
  setStatus(`Error: ${errToString(err)}`);
});
