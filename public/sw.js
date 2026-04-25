/* sw.js — Service Worker for Vian Maps v2 (React Rebuild) */
const CACHE_NAME = 'vian-maps-v2';

// We skip pre-caching specific file names since Vite uses hashes in production.
// Instead, we use a dynamic caching strategy.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Clearing legacy cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip map tiles (handled by IndexedDB in OfflineLayer.ts)
  if (url.host.includes('tile.openstreetmap.org') || 
      url.host.includes('mt0.google.com') || 
      url.host.includes('mt1.google.com') ||
      url.host.includes('mt2.google.com') ||
      url.host.includes('mt3.google.com') ||
      url.host.includes('opentopomap.org')) {
    return;
  }

  // Network-first for everything else to ensure we don't serve stale assets during dev
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful GET requests
        if (response.ok && event.request.method === 'GET') {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});
