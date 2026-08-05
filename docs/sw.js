/* docs/sw.js */
/* Offline-first-ish SW:
   - app/documents/assets: network-first
   - graph.jsonld: stale-while-revalidate
*/

const SW_VERSION = '__BUILD_ID__-ontology-utils-v1';
const CACHE_SHELL = `ontoeagle-shell-${SW_VERSION}`;
const CACHE_DATA = `ontoeagle-data-${SW_VERSION}`;

// Keep this list tight and explicit.
const SHELL_ASSETS = [
  './index.html',
  './ontology-catalog.html',
  './ontology-viewer.html',
  './bundler.html',
  './styles/skeleton.css',
  './styles/app-base.css',
  './styles/search-app.css',
  './styles/ontology-pages.css',
  './styles/site-header.css',
  './styles/tabulator.min.css',
  './styles/bundler.css',
  './app/ontology-catalog.js',
  './app/ontology-viewer.js',
  './app/site-header.js',
  './app/ontology-meta.js',
  './app/ontology-icons.js',
  './app/catalog-data-manager.js',
  './app/search-main.js',
  './app/search.js',
  './app/normalize.js',
  './app/namespaces.js',
  './app/slim-core.js',
  './app/rdf_extract.js',
  './app/ontoeagle-indexeddb-store.js',
  './app/cq-ferret-indexeddb-store.js',
  './app/types.js',
  './app/bundler-core.js',
  './app/bundler-ui.js',
  './app/shared/vendor/tabulator.min.js',
  './app/shared/vendor/mermaid.min.js',
  './app/shared/vendor/n3.min.js',
  './app/shared/vendor/jsonld.min.js',
  './app/shared/vendor/rdflib.min.js',
  './app/shared/browser-file-io/create-accept-attribute.js',
  './app/shared/browser-file-io/create-text-blob.js',
  './app/shared/browser-file-io/download-blob.js',
  './app/shared/browser-file-io/download-text-file.js',
  './app/shared/browser-file-io/index.js',
  './app/shared/browser-file-io/read-file-as-array-buffer.js',
  './app/shared/browser-file-io/read-file-as-text.js',
  './app/shared/format-registry/index.js',
  './app/shared/format-registry/browser-file-actions.js',
  './app/shared/format-registry/mime-registry.js',
  './app/shared/format-registry/rdf-parser-formats.js',
  './app/shared/indexeddb-data-management/id-generation.js',
  './app/shared/indexeddb-data-management/index.js',
  './app/shared/indexeddb-data-management/indexeddb-adapter.js',
  './app/shared/indexeddb-data-management/record-store.js',
  './app/shared/indexeddb-data-management/records.js',
  './app/shared/indexeddb-data-management/run-output-export.js',
  './app/shared/indexeddb-data-management/storage-error.js',
  './app/shared/namespace-registry/curie.js',
  './app/shared/namespace-registry/index.js',
  './app/shared/namespace-registry/namespace-registry.js',
  './app/shared/namespace-registry/namespace-stems.js',
  './app/shared/namespace-registry/prefix-map.js',
  './app/shared/namespace-registry/rdf-prefixes.js',
  './app/shared/namespace-registry/rdf-serialization-prefixes.js',
  './app/shared/namespace-registry/sparql-prefixes.js',
  './app/shared/ontology-utils/identifiers.js',
  './app/shared/ontology-utils/index.js',
  './app/shared/ontology-utils/iri.js',
  './app/shared/ontology-utils/ontology-input.js',
  './app/shared/ontology-utils/ontology-namespace.js',
  './app/shared/ontology-utils/rdf-terms.js',
  './app/shared/ontology-utils/xsd-datatypes.js',
  './app/shared/rdf-io/index.js',
  './app/shared/rdf-io/graph-export.js',
  './app/shared/rdf-io/jsonld-adapter.js',
  './app/shared/rdf-io/n3-adapter.js',
  './app/shared/rdf-io/object-to-rdf.js',
  './app/shared/rdf-io/rdf-model.js',
  './app/shared/rdf-io/rdflib-adapter.js',
  './app/shared/rdf-io/runtime.js',
  './app/shared/rdf-io/serialize-rdf.js',
  './app/shared/tabular-io/delimited-text.js',
  './app/shared/tabular-io/index.js',
  './app/shared/tabular-io/iri-mapping.js',
  './app/shared/tabular-io/query-records.js',
  './images/add-to-cart.svg',
  './images/default-logo.png',
  './images/block-logo.png',
];

// Single consolidated dataset produced by Python
const DATA_ASSETS = [
  './data/graph.jsonld',
  './data/ontology-registry.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(CACHE_SHELL);
    await shell.addAll(SHELL_ASSETS);

    const data = await caches.open(CACHE_DATA);
    await data.addAll(DATA_ASSETS);

    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => ![CACHE_SHELL, CACHE_DATA].includes(k))
        .map((k) => caches.delete(k))
    );

    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only same-origin GET requests
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const path = url.pathname;

  // Dataset: stale-while-revalidate
  if (path.endsWith('/data/graph.jsonld') || path.endsWith('/data/ontology-registry.json')) {
    event.respondWith(staleWhileRevalidate(req, CACHE_DATA));
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(req, CACHE_SHELL));
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const res = await fetch(req);
    if (res && res.ok) {
      await cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);

  const fetchPromise = fetch(req)
    .then(async (res) => {
      if (res && res.ok) {
        await cache.put(req, res.clone());
      }
      return res;
    })
    .catch(() => null);

  return hit || (await fetchPromise) || new Response('Offline', { status: 503 });
}
