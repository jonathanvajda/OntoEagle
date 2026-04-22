/* docs/sw.js */
/* Offline-first-ish SW:
   - app/documents/assets: network-first
   - graph.jsonld: stale-while-revalidate
*/

const SW_VERSION = '__BUILD_ID__-details-fields-v1';
const CACHE_SHELL = `ontoeagle-shell-${SW_VERSION}`;
const CACHE_DATA = `ontoeagle-data-${SW_VERSION}`;

// Keep this list tight and explicit.
const SHELL_ASSETS = [
  './index.html',
  './bundler.html',
  './styles/skeleton.css',
  './styles/app-base.css',
  './styles/search-app.css',
  './styles/bundler.css',
  './app/search-main.js',
  './app/search.js',
  './app/normalize.js',
  './app/namespaces.js',
  './app/rdf_io.js',
  './app/slim-core.js',
  './app/rdf_extract.js',
  './app/indexeddb.min.js',
  './app/types.js',
  './app/bundler-core.js',
  './app/bundler-ui.js',
  './app/n3.min.js',
  './app/jsonld.min.js',
  './app/rdflib.min.js',
  './images/add-to-cart.svg',
  './images/default-logo.png',
  './images/block-logo.png',
];

// Single consolidated dataset produced by Python
const DATA_ASSETS = [
  './data/graph.jsonld',
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
  if (path.endsWith('/data/graph.jsonld')) {
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
