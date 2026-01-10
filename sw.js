// CLAWD OS1 Service Worker
// Lightweight runtime caching for a static, no-build site.

const CACHE_VERSION = 'v1';
const CACHE_NAME = `clawd-os1-${CACHE_VERSION}`;

function isCacheableRequest(request) {
  if (request.method !== 'GET') return false;
  // Range requests (common for audio/video) don't mix well with Cache Storage.
  if (request.headers.has('range')) return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isCacheableRequest(request)) return;

  const url = new URL(request.url);

  // Never intercept the service worker script itself.
  if (url.pathname === '/sw.js') return;

  // Navigation: network-first, fallback to cached index.html (offline).
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put('/index.html', response.clone());
        return response;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  // Static assets: cache-first, update cache in background.
  const isStaticAsset =
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/audio/') ||
    url.pathname.startsWith('/vendor/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.wasm') ||
    url.pathname.endsWith('.json') ||
    url.pathname === '/manifest.json';

  if (isStaticAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) {
        event.waitUntil((async () => {
          try {
            const fresh = await fetch(request);
            if (fresh && fresh.ok) await cache.put(request, fresh.clone());
          } catch {
            // ignore
          }
        })());
        return cached;
      }

      try {
        const response = await fetch(request);
        if (response && response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return Response.error();
      }
    })());
    return;
  }

  // Default: passthrough
  event.respondWith(fetch(request));
});
