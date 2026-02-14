/**
 * docs/scripts/search-main.js
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
 * - indexer.js // INDEX FEATURE: 
 * - search.js
 * - types.js
 */

import { extractDocumentsFromJsonLd, mapByIri, parseGraphJsonLdText } from './rdf_extract.js';
 // INDEX FEATURE: import { buildIndex } from './indexer.js';
import { searchDocuments } from './search.js';
import { defaultSearchOptions } from './types.js';

// Minimal IDB wrappers (you can expand these in indexeddb.min.js later)
import {
  idbInit,
  idbGetActiveSettings,
  idbPutActiveSettings,
  idbGetDatasetMeta,
  idbPutDatasetMeta,
  idbGetAllDocuments,
  idbPutDocuments,
  idbGetIndex,
  idbPutIndex
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

const typeCheckboxes = /** @type {NodeListOf<HTMLInputElement>} */ (document.querySelectorAll('.optType'));

/* -----------------------------
 * App state (in-memory)
 * ----------------------------- */

let docsByIri = new Map();   // Map<string, OntologyDocument>
 // INDEX FEATURE: let index = null;            // Inverted index object (shape from indexer.js)
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
        <br />
        <span class="ont-search__muted">Namespace: ${escapeHtml(r.doc.namespace || '')}</span>
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

/**
 * Render details panel for a doc.
 * @param {import('./types.js').OntologyDocument} doc
 */
function renderDetails(doc) {
  if (!doc) {
    elDetails.innerHTML = `<p class="ont-search__help">Select a result to view details.</p>`;
    return;
  }

  const def = doc.definition ? `<p><strong>Definition:</strong><br />${escapeHtml(doc.definition)}</p>` : '';
  const alts = (doc.altLabels && doc.altLabels.length)
    ? `<p><strong>Alt labels:</strong><br />${escapeHtml(doc.altLabels.join(', '))}</p>`
    : '';

  const citations = (doc.citations && doc.citations.length)
    ? `<p><strong>Citations:</strong><br />${escapeHtml(doc.citations.join('; '))}</p>`
    : '';

  const examples = (doc.examples && doc.examples.length)
    ? `<p><strong>Examples:</strong><br />${escapeHtml(doc.examples.join('; '))}</p>`
    : '';

  const clarifications = (doc.clarifications && doc.clarifications.length)
    ? `<p><strong>Notes:</strong><br />${escapeHtml(doc.clarifications.join('; '))}</p>`
    : '';

  elDetails.innerHTML = `
    <div class="ont-search__detailsHeader">
      <div class="ont-search__detailsTitle"><strong>${escapeHtml(doc.label || doc.iri)}</strong></div>
      <div class="ont-search__detailsMeta">
        <span class="ont-search__pill">${escapeHtml(doc.type)}</span>
        <span class="ont-search__muted">Namespace: ${escapeHtml(doc.namespace || '')}</span>
      </div>
      <div class="ont-search__detailsIri"><code>${escapeHtml(doc.iri)}</code></div>
    </div>
    ${def}
    ${alts}
    ${citations}
    ${examples}
    ${clarifications}
  `.trim();
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
    const btn = el.querySelector('button');
    const isSelected = btn?.dataset?.iri === iri;
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
      const btn = items[idx].querySelector('button');
      if (btn?.dataset?.iri) selectResultByIri(btn.dataset.iri);
      return;
    } else {
      return;
    }

    const next = items[idx];
    elResultsList.setAttribute('aria-activedescendant', next.id);

    // Move focus to the button inside the option for a good keyboard UX
    const btn = next.querySelector('button');
    btn?.focus({ preventScroll: false });
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
  const cachedDocs = await idbGetAllDocuments('builtin');
  const cachedIndex = await idbGetIndex('builtin');

  if (cachedDocs && cachedDocs.length && cachedIndex) {
    docsByIri = mapByIri(cachedDocs);
    index = cachedIndex;
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
  const docs = extractDocumentsFromJsonLd(json);

  docsByIri = mapByIri(docs);
 // INDEX FEATURE: index = buildIndex(docs); // your indexer.js should export this

  await idbPutDocuments('builtin', docs);
 // INDEX FEATURE:   await idbPutIndex('builtin', index);
  await idbPutDatasetMeta('builtin', { fingerprint, enabled: true, updatedAt: Date.now() });
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

async function init() {
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
  }

  setStatus('Ready.');

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

  setupResultsKeyboardNav();
}

init().catch((err) => {
  console.error(err);
  setStatus(`Error: ${errToString(err)}`);
});
