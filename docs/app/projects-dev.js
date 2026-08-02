// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Jonathan Vajda

import {
  DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
  convertArtifactRecordToJsonLd,
  convertDatasetRecordToJsonLd,
  convertGraphRecordToJsonLd,
  convertProjectRecordToJsonLd,
  convertRunRecordToJsonLd,
  convertSettingRecordToJsonLd,
  convertWorkspaceInclusionRecordToJsonLd,
  createArtifactRecordFromProjectFolderFile,
  createProjectFolderStore,
  detectFileSystemAccessSupport,
  ensureProjectPortfolioProject,
  openProjectPortfolioDatabase,
  createProjectPortfolioStores,
  inspectLegacyIndexedDbDatabase,
  readLegacyObjectStoreRows,
  readProjectManifestFromFolder,
  reconcileProjectFolderScan,
  scanProjectFolder,
  selectProjectFolder
} from './shared/indexeddb-data-management/index.js';

const ONTOEAGLE_DB_NAME = 'OntoEagleDB';
const PORTFOLIO_DB_NAME = 'OntologyWorkbenchProjects';
const root = document.getElementById('app');
const statusEl = document.getElementById('projectStatus');
const refreshBtn = document.getElementById('refreshProjectsBtn');
const selectFolderBtn = document.getElementById('selectProjectFolderBtn');
const scanFolderBtn = document.getElementById('scanProjectFolderBtn');
const fsaState = {
  handle: null,
  folderStore: null,
  folderName: '',
  lastScan: null
};

function setStatus(message, kind = 'info') {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.kind = kind;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function codeBlock(value) {
  return el('pre', { className: 'project-dev__code' }, [
    document.createTextNode(JSON.stringify(value, null, 2))
  ]);
}

function metric(label, value) {
  return el('div', { className: 'project-dev__metric' }, [
    el('strong', { text: String(value) }),
    el('span', { text: label })
  ]);
}

function section(title, children) {
  return el('section', { className: 'project-dev__section' }, [
    el('h3', { text: title }),
    ...children
  ]);
}

function recordList(records, labelKey, emptyText, toJsonLd = null) {
  if (!records.length) return el('p', { className: 'project-dev__empty', text: emptyText });
  return el('ul', { className: 'project-dev__list' }, records.map((record) => {
    const label = record[labelKey] || record.label || record.name || record.id || record.datasetId || record.artifactId || record.runId || record.settingId;
    return el('li', {}, [
      el('details', {}, [
        el('summary', { text: String(label) }),
        ...(toJsonLd ? [
          el('h4', { text: 'JSON-LD' }),
          codeBlock(toJsonLd(record)),
          el('h4', { text: 'Current DTO' })
        ] : []),
        codeBlock(record)
      ])
    ]);
  }));
}

async function safeReadLegacyRows(dbName, storeName) {
  try {
    return await readLegacyObjectStoreRows(dbName, storeName);
  } catch (error) {
    return [{ error: error?.message || String(error), storeName }];
  }
}

async function readPortfolio() {
  const db = await openProjectPortfolioDatabase();
  const stores = createProjectPortfolioStores(db, { projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID });
  await ensureProjectPortfolioProject(stores, {
    projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID,
    label: 'Default Cross-App Workspace',
    tags: ['cross-app', 'dev-preview']
  });
  const projects = await stores.projects.listProjects();
  const artifacts = await stores.artifacts.listProjectArtifacts(DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID);
  const runs = await stores.runs.listRunRecords({ projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID });
  const settings = await stores.settings.listSettingRecords();
  const datasets = await stores.datasets.listDatasetRecords(DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID);
  const inclusions = await stores.inclusions.listWorkspaceInclusions(DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID);
  const graphs = await stores.graphs.listGraphRecords(DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID);
  const quadCount = await stores.quadRows.countQuadRows({ projectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID });
  return { projects, artifacts, runs, settings, datasets, inclusions, graphs, quadCount };
}

async function readOntoEagleAppDb() {
  const status = await inspectLegacyIndexedDbDatabase(ONTOEAGLE_DB_NAME);
  if (!status.exists) return { status, settings: [], datasets: [], documents: [], index: [] };
  const [settings, datasets, documents, index] = await Promise.all([
    safeReadLegacyRows(ONTOEAGLE_DB_NAME, 'settings'),
    safeReadLegacyRows(ONTOEAGLE_DB_NAME, 'datasets'),
    safeReadLegacyRows(ONTOEAGLE_DB_NAME, 'documents'),
    safeReadLegacyRows(ONTOEAGLE_DB_NAME, 'index')
  ]);
  return { status, settings, datasets, documents, index };
}

function renderPortfolio(portfolio) {
  return section('Shared Project Portfolio', [
    el('div', { className: 'project-dev__metrics' }, [
      metric('projects', portfolio.projects.length),
      metric('artifacts', portfolio.artifacts.length),
      metric('runs', portfolio.runs.length),
      metric('settings', portfolio.settings.length),
      metric('datasets', portfolio.datasets.length),
      metric('workspace inclusions', portfolio.inclusions.length),
      metric('graphs', portfolio.graphs.length),
      metric('quad rows', portfolio.quadCount)
    ]),
    recordList(portfolio.projects, 'label', 'No shared projects found.', convertProjectRecordToJsonLd),
    recordList(portfolio.artifacts, 'label', 'No shared artifacts found.', convertArtifactRecordToJsonLd),
    recordList(portfolio.runs, 'label', 'No shared runs found.', convertRunRecordToJsonLd),
    recordList(portfolio.datasets, 'label', 'No shared dataset records found.', convertDatasetRecordToJsonLd),
    recordList(portfolio.inclusions, 'inclusionId', 'No workspace inclusions found.', convertWorkspaceInclusionRecordToJsonLd),
    recordList(portfolio.graphs, 'label', 'No graph records found.', convertGraphRecordToJsonLd),
    recordList(portfolio.settings, 'key', 'No project-scoped settings found.', convertSettingRecordToJsonLd)
  ]);
}

function renderOntoEagleDb(appDb) {
  return section('OntoEagle App Database', [
    el('p', {
      className: 'project-dev__note',
      text: appDb.status.exists
        ? `${ONTOEAGLE_DB_NAME} is present. These stores include Catalog/search/Bundler-adjacent app data and migration-era records.`
        : `${ONTOEAGLE_DB_NAME} was not found in this browser profile.`
    }),
    el('div', { className: 'project-dev__metrics' }, [
      metric('settings', appDb.settings.length),
      metric('datasets', appDb.datasets.length),
      metric('documents', appDb.documents.length),
      metric('index rows', appDb.index.length)
    ]),
    recordList(appDb.datasets, 'label', 'No OntoEagle dataset metadata found.'),
    recordList(appDb.settings, 'key', 'No OntoEagle app settings found.')
  ]);
}

function renderFolderScan(scanState) {
  if (!scanState) return el('p', { className: 'project-dev__empty', text: 'No project folder scan has been run in this page session.' });
  const discovered = scanState.reconciliation.results
    .filter((result) => result.status === 'discovered')
    .map((result) => createArtifactRecordFromProjectFolderFile(DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID, result.folderEntry));
  return el('div', {}, [
    el('div', { className: 'project-dev__metrics' }, [
      metric('folder', scanState.folderName || 'selected'),
      metric('entries', scanState.entries.length),
      metric('manifest', scanState.manifest ? 'found' : 'missing'),
      metric('issues', scanState.reconciliation.results.filter((result) => result.status !== 'synced').length)
    ]),
    recordList(scanState.reconciliation.results, 'path', 'No folder sync results found.'),
    recordList(discovered, 'label', 'No discovered file candidates found.', convertArtifactRecordToJsonLd)
  ]);
}

function renderLocalFolderCapability(portfolio) {
  const support = detectFileSystemAccessSupport();
  return section('Local Folder Capability', [
    el('div', { className: 'project-dev__metrics' }, [
      metric('FSA support', support.ok ? 'available' : 'unavailable'),
      metric('folder', fsaState.folderName || 'none')
    ]),
    el('p', {
      className: 'project-dev__note',
      text: support.ok
        ? 'Choose a local folder to scan it against the shared project manifest and current IndexedDB artifacts. Scanning is read-only.'
        : 'This browser does not expose showDirectoryPicker. IndexedDB and ZIP export remain the fallback.'
    }),
    renderFolderScan(fsaState.lastScan),
    portfolio ? codeBlock({ activeProjectId: DEFAULT_PROJECT_PORTFOLIO_PROJECT_ID }) : el('span')
  ]);
}

async function render() {
  if (!root) return;
  setStatus('Reading browser project stores...');
  try {
    const [portfolio, appDb] = await Promise.all([
      readPortfolio(),
      readOntoEagleAppDb()
    ]);
    root.replaceChildren(
      renderPortfolio(portfolio),
      renderOntoEagleDb(appDb),
      renderLocalFolderCapability(portfolio)
    );
    setStatus(`Loaded ${portfolio.projects.length} shared project(s) and ${appDb.datasets.length} OntoEagle dataset record(s).`, 'ok');
  } catch (error) {
    console.error(error);
    root.replaceChildren(section('Project Explorer Error', [codeBlock({ message: error?.message || String(error), stack: error?.stack })]));
    setStatus('Failed to load project stores. See console for details.', 'error');
  }
}

refreshBtn?.addEventListener('click', render);
selectFolderBtn?.addEventListener('click', async () => {
  setStatus('Opening project folder picker...');
  const selected = await selectProjectFolder();
  if (!selected.ok) {
    setStatus('No project folder selected.', 'error');
    return;
  }
  fsaState.handle = selected.value;
  fsaState.folderName = selected.value.name || 'selected folder';
  fsaState.folderStore = await createProjectFolderStore(selected.value, { dataPath: 'ontology-workbench' }).initialize();
  setStatus(`Selected ${fsaState.folderName}.`, 'ok');
  await scanActiveProjectFolder();
});
scanFolderBtn?.addEventListener('click', scanActiveProjectFolder);
render();

async function scanActiveProjectFolder() {
  if (!fsaState.folderStore) {
    setStatus('Choose a project folder before scanning.', 'error');
    return;
  }
  setStatus('Scanning selected project folder...');
  const portfolio = await readPortfolio();
  const [entries, manifest] = await Promise.all([
    scanProjectFolder(fsaState.folderStore),
    readProjectManifestFromFolder(fsaState.folderStore)
  ]);
  fsaState.lastScan = {
    folderName: fsaState.folderName,
    entries,
    manifest,
    reconciliation: reconcileProjectFolderScan({
      manifest,
      artifacts: portfolio.artifacts,
      folderEntries: entries
    })
  };
  await render();
}
