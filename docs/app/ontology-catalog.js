import {
  ONTOLOGY_LEVELS,
  exportRegistryJson,
  loadOntologyWorkspace,
  saveRegistryOverride,
  truncateText
} from './ontology-meta.js';
import { iconSvg } from './ontology-icons.js';

const statusText = document.getElementById('ontStatusText');
const loading = document.getElementById('ontologyCatalogLoading');
const tableBody = document.getElementById('ontologyCatalogBody');
const tableWrap = document.getElementById('ontologyCatalogTableWrap');
const exportBtn = document.getElementById('ontologyRegistryExportBtn');
const modal = document.getElementById('ontologyRegistryModal');
const form = document.getElementById('ontologyRegistryForm');
const cancelBtn = document.getElementById('ontologyRegistryCancelBtn');

let workspace = null;
let editingIri = '';

function setStatus(text) {
  if (statusText) statusText.textContent = text;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function viewerHref(iri) {
  return `./ontology-viewer.html?iri=${encodeURIComponent(iri)}`;
}

function externalLink(href, label, html, className = '') {
  if (!href) return '';
  return `<a class="${className}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${html}</a>`;
}

function renderRepo(record) {
  if (!record.git_repo_url) {
    return `<button class="ont-catalog__iconBtn" type="button" data-edit-registry="${escapeHtml(record.iri)}">Add<span class="ont-catalog__sr"> repository data</span></button>`;
  }
  return externalLink(record.git_repo_url, 'Open repository', iconSvg(record.git_logo), 'ont-catalog__iconBtn');
}

function renderDownload(record) {
  if (!record.file) {
    return `<button class="ont-catalog__iconBtn" type="button" data-edit-registry="${escapeHtml(record.iri)}">Add<span class="ont-catalog__sr"> download data</span></button>`;
  }
  return `<a class="ont-catalog__iconBtn" href="${escapeHtml(record.file)}" download title="Download ontology" aria-label="Download ontology">${iconSvg('download')}</a>`;
}

function renderRow(record) {
  const description = truncateText(record.description || '');
  const desc = description.text ? `${escapeHtml(description.text)}${description.truncated ? '&hellip;' : ''}` : '';
  return `<tr>
    <td>
      <div class="ont-catalog__label"><a href="${escapeHtml(viewerHref(record.iri))}">${escapeHtml(record.label || record.iri)}</a></div>
    </td>
    <td class="ont-catalog__description">${desc}</td>
    <td><div class="ont-catalog__actions">${renderRepo(record)}</div></td>
    <td><div class="ont-catalog__actions">${renderDownload(record)}</div></td>
  </tr>`;
}

function renderCatalog(records) {
  const rows = [];
  const levelMap = new Map(ONTOLOGY_LEVELS.map((level) => [level.key, level.label]));

  for (const level of ONTOLOGY_LEVELS) {
    const sectionRecords = records
      .filter((record) => (record.ontology_level || 'unsorted') === level.key)
      .sort((a, b) => String(a.label || a.iri).localeCompare(String(b.label || b.iri)));
    if (!sectionRecords.length) continue;
    rows.push(`<tr class="ont-catalog__sectionRow"><th colspan="4">${escapeHtml(levelMap.get(level.key))}</th></tr>`);
    rows.push(...sectionRecords.map(renderRow));
  }

  tableBody.innerHTML = rows.join('') || '<tr><td colspan="4">No ontologies were found in the active graph.</td></tr>';
  tableWrap.hidden = false;
  loading.hidden = true;
  setStatus(`${records.length} ontologies ready.`);

  tableBody.querySelectorAll('[data-edit-registry]').forEach((button) => {
    button.addEventListener('click', () => openRegistryModal(button.getAttribute('data-edit-registry') || ''));
  });
}

function openRegistryModal(iri) {
  const record = workspace?.records.find((item) => item.iri === iri);
  editingIri = iri;
  form.elements.iri.value = iri;
  form.elements.ontology_level.value = record?.ontology_level === 'unsorted' ? 'mid' : (record?.ontology_level || 'mid');
  form.elements.git_repo_url.value = record?.git_repo_url || '';
  form.elements.git_logo.value = record?.git_logo || 'git';
  form.elements.issue_tracker_url.value = record?.issue_tracker_url || '';
  form.elements.file.value = record?.file || '';
  if (modal?.showModal) modal.showModal();
}

function downloadTextFile(fileName, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function refresh() {
  const started = performance.now();
  loading.hidden = false;
  tableWrap.hidden = true;
  setStatus('Loading ontology catalog...');
  workspace = await loadOntologyWorkspace({ preferSnapshot: true, includeDocs: false });
  renderCatalog(workspace.records);
  const elapsed = Math.round(performance.now() - started);
  if (workspace.fromSnapshot) setStatus(`${workspace.records.length} ontologies ready from local snapshot in ${elapsed} ms.`);
  else setStatus(`${workspace.records.length} ontologies ready in ${elapsed} ms.`);
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const entry = Object.fromEntries(new FormData(form).entries());
  entry.iri = editingIri || entry.iri;
  saveRegistryOverride(entry);
  modal?.close();
  await refresh();
  setStatus('Registry entry saved in this browser.');
});

cancelBtn?.addEventListener('click', () => modal?.close());

exportBtn?.addEventListener('click', () => {
  if (!workspace) return;
  downloadTextFile('ontology-registry.json', exportRegistryJson(workspace.registry));
});

refresh().catch((err) => {
  console.error(err);
  setStatus(`Catalog failed: ${err.message || err}`);
  loading.innerHTML = `<p class="ont-viewer__empty">Catalog failed to load. ${escapeHtml(err.message || err)}</p>`;
});
