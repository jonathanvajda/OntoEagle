import {
  clearOntologyMetadataSnapshot,
  exportRegistryJson,
  importUserOntologyFile,
  loadDefaultRegistry,
  loadRegistryOverrides,
  mergeRegistryEntries,
  removeStoredUserOntologyRecordsForDataset
} from './ontology-meta.js';
import {
  idbDeleteDataset,
  idbGetAllDatasetMeta,
  idbSetDatasetEnabled
} from './indexeddb.min.js';

const modalId = 'ontCatalogDataManagerModal';
const fileInputId = 'ontCatalogDataManagerFile';
const listId = 'ontCatalogDataManagerList';
const statusId = 'ontCatalogDataManagerStatus';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setManagerStatus(message) {
  const el = document.getElementById(statusId);
  if (el) el.textContent = message || '';
}

function emitUpdated() {
  window.dispatchEvent(new CustomEvent('ontoeagle:catalog-data-updated'));
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

function ensureModal() {
  let modal = document.getElementById(modalId);
  if (modal) return modal;

  modal = document.createElement('dialog');
  modal.id = modalId;
  modal.className = 'ont-catalog__modal ont-catalog__modal--wide';
  modal.innerHTML = `
    <form method="dialog">
      <div class="ont-catalog__toolbar">
        <h2 class="ont-viewer__title">Manage Catalog Data</h2>
        <button class="ont-search__btn ont-search__btn--ghost" type="submit">Close</button>
      </div>
    </form>
    <div class="ont-catalog__managerActions">
      <input
        id="${fileInputId}"
        class="ont-catalog__fileInput"
        type="file"
        hidden
        multiple
        accept=".ttl,.turtle,.n3,.nt,.ntriples,.nq,.trig,.jsonld,.json-ld,.rdf,.owl,.xml"
      />
      <button class="ont-search__btn ont-search__btn--secondary" type="button" data-manager-action="add">Add ontology</button>
      <button class="ont-search__btn ont-search__btn--secondary" type="button" data-manager-action="refresh">Refresh local snapshot</button>
      <button class="ont-search__btn ont-search__btn--secondary" type="button" data-manager-action="export">Export registry JSON</button>
      <button class="ont-search__btn ont-search__btn--secondary" type="button" data-manager-action="missing">Missing metadata</button>
    </div>
    <div id="${statusId}" class="ont-search__help" aria-live="polite"></div>
    <section>
      <h3 class="ont-search__detailsSubhead">Browser-loaded ontologies</h3>
      <div id="${listId}" class="ont-catalog__missingList"></div>
    </section>
  `;
  document.body.appendChild(modal);

  modal.querySelector('[data-manager-action="add"]')?.addEventListener('click', () => {
    document.getElementById(fileInputId)?.click();
  });

  modal.querySelector('[data-manager-action="refresh"]')?.addEventListener('click', async () => {
    clearOntologyMetadataSnapshot();
    setManagerStatus('Local catalog snapshot cleared.');
    emitUpdated();
  });

  modal.querySelector('[data-manager-action="export"]')?.addEventListener('click', async () => {
    const registry = mergeRegistryEntries(await loadDefaultRegistry(), loadRegistryOverrides());
    downloadTextFile('ontology-registry.json', exportRegistryJson(registry));
    setManagerStatus('Registry JSON exported.');
  });

  modal.querySelector('[data-manager-action="missing"]')?.addEventListener('click', () => {
    if (typeof window.ontoeagleOpenMissingMetadata === 'function') {
      modal.close();
      window.ontoeagleOpenMissingMetadata();
    } else {
      setManagerStatus('Missing metadata review is available on the ontology catalog page.');
    }
  });

  modal.querySelector(`#${fileInputId}`)?.addEventListener('change', async (event) => {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    for (const file of files) {
      try {
        setManagerStatus(`Loading ${file.name}...`);
        const result = await importUserOntologyFile(file);
        setManagerStatus(`Loaded ${result.documentCount} resources from ${file.name}.`);
      } catch (err) {
        console.error(err);
        setManagerStatus(`Failed loading ${file.name}: ${err.message || err}`);
      }
    }
    input.value = '';
    await renderUserDatasets();
    emitUpdated();
  });

  return modal;
}

async function renderUserDatasets() {
  const list = document.getElementById(listId);
  if (!list) return;
  const metas = (await idbGetAllDatasetMeta())
    .filter((meta) => meta?.source === 'user')
    .sort((a, b) => String(a.ontologyName || a.fileName || '').localeCompare(String(b.ontologyName || b.fileName || '')));

  if (!metas.length) {
    list.innerHTML = '<p class="ont-viewer__empty">No browser-loaded ontologies yet.</p>';
    return;
  }

  list.innerHTML = metas.map((meta) => `
    <div class="ont-catalog__missingItem">
      <div>
        <div class="ont-catalog__missingTitle">${escapeHtml(meta.ontologyName || meta.fileName || meta.datasetId)}</div>
        <div class="ont-catalog__iri">${escapeHtml(meta.fileName || meta.datasetId)}</div>
        <div>${Number(meta.documentCount || 0)} resources${meta.ontologyCount ? `, ${Number(meta.ontologyCount)} ontology record${Number(meta.ontologyCount) === 1 ? '' : 's'}` : ''}</div>
      </div>
      <div class="ont-catalog__actions">
        <label class="ont-catalog__managerToggle">
          <input type="checkbox" data-dataset-toggle="${escapeHtml(meta.datasetId)}" ${meta.enabled !== false ? 'checked' : ''} />
          <span>Enabled</span>
        </label>
        <button class="ont-search__btn ont-search__btn--ghost" type="button" data-dataset-remove="${escapeHtml(meta.datasetId)}">Remove</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-dataset-toggle]').forEach((toggle) => {
    toggle.addEventListener('change', async () => {
      await idbSetDatasetEnabled(toggle.getAttribute('data-dataset-toggle'), toggle.checked);
      clearOntologyMetadataSnapshot();
      setManagerStatus(toggle.checked ? 'User ontology enabled.' : 'User ontology disabled.');
      emitUpdated();
    });
  });

  list.querySelectorAll('[data-dataset-remove]').forEach((button) => {
    button.addEventListener('click', async () => {
      const datasetId = button.getAttribute('data-dataset-remove');
      await idbDeleteDataset(datasetId);
      removeStoredUserOntologyRecordsForDataset(datasetId);
      await renderUserDatasets();
      setManagerStatus('User ontology removed.');
      emitUpdated();
    });
  });
}

async function openManager() {
  const modal = ensureModal();
  await renderUserDatasets();
  setManagerStatus('');
  modal.showModal();
}

document.querySelectorAll('[data-manage-catalog-data]').forEach((button) => {
  button.addEventListener('click', openManager);
});
