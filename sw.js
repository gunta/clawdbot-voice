// CLAWD OS1 Service Worker
// Provides offline support and caching

const CACHE_NAME = 'clawd-os1-v4';

// Core assets that MUST work offline
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  // Styles
  '/src/styles/index.css',
  '/src/styles/variables.css',
  '/src/styles/base.css',
  '/src/styles/layout.css',
  '/src/styles/components.css',
  '/src/styles/animations.css',
  // Component styles
  '/src/components/styles/voice-card.css',
  '/src/components/styles/wave-form.css',
  '/src/components/styles/speak-button.css',
  '/src/components/styles/status-display.css',
  '/src/components/styles/transcription-display.css',
  '/src/components/styles/os-header.css',
  '/src/components/styles/app-footer.css',
  // JavaScript modules
  '/src/app.js',
  '/src/components/index.js',
  '/src/components/voice-card.js',
  '/src/components/wave-form.js',
  '/src/components/speak-button.js',
  '/src/components/status-display.js',
  '/src/components/transcription-display.js',
  '/src/components/os-header.js',
  '/src/components/app-footer.js',
  '/src/controllers/index.js',
  '/src/controllers/voice-controller.js',
  '/src/controllers/speech-controller.js',
  '/src/controllers/keyboard-controller.js',
  '/src/services/index.js',
  '/src/services/audio-analyzer.js',
  '/src/services/audio-player.js',
  '/src/services/speech-recognition.js',
  '/src/services/speech-synthesis.js',
  '/src/services/response-generator.js',
  '/src/services/haptic.js',
  '/src/services/wake-lock.js',
  '/src/services/storage.js',
  '/src/services/chimes.js',
  // Fonts (self-hosted, no CDN dependency)
  '/src/fonts/fonts.css',
  '/src/fonts/bodoni-moda-regular.woff2',
  '/src/fonts/bodoni-moda-italic.woff2',
  '/src/fonts/cormorant-garamond-regular.woff2',
  '/src/fonts/cormorant-garamond-italic.woff2',
  // Audio files
  '/audio/assistant.mp3',
  '/audio/lobster.mp3',
  // Icons
  '/icons/icon.svg',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  '/favicon.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing CLAWD OS1 service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] All assets cached');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Cache failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating CLAWD OS1 service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests (like fonts from Google)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Add to cache for future
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Network failed, return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return null;
          });
      })
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
