// CLAWD OS1 Service Worker - DISABLED
// Service worker is disabled for development.
// This file self-unregisters and clears caches if loaded.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', async () => {
  // Unregister this service worker
  const registration = await self.registration.unregister();
  console.log('[SW] Service worker disabled and unregistered:', registration);
  
  // Clear all caches
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  if (cacheNames.length) {
    console.log('[SW] Caches cleared:', cacheNames);
  }
});
