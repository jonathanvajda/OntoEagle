/* docs/sw.js */
/* Offline-first SW: cache app shell + graph.jsonld */

const SW_VERSION = 'v1';
const CACHE_SHELL = `ontoeagle-shell-${SW_VERSION}`;
const CACHE_DATA = `ontoeagle-data-${SW_VERSION}`;

// Keep this list tight and explicit (no globbing).
const SHELL_ASSETS = [
  './index.html',
  './styles/search-app.css',
  './app/search-main.js',
  './app/search.js',
// INDEX FEATURE:  './scripts/indexer.js',
  './app/normalize.js',
  './app/rdf_extract.js',
  './app/indexeddb.min.js',
  './app/types.js',
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

// Cache strategy:
// - Shell assets: cache-first
// - graph.jsonld: stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const path = url.pathname;

  // Dataset SWR
  if (path.endsWith('/data/graph.jsonld')) {
    event.respondWith(staleWhileRevalidate(req, CACHE_DATA));
    return;
  }

  // Everything else (shell assets): cache-first
  event.respondWith(cacheFirst(req, CACHE_SHELL));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;

  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);

  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  // Prefer cached immediately; update in background.
  return hit || (await fetchPromise) || new Response('Offline', { status: 503 });
}
