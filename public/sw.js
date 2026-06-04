const CACHE_NAME = 'rusunawa-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force the waiting service worker to become active immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Take control of all pages immediately
  event.waitUntil(self.clients.claim());

  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass cache for HTML documents and API requests to ensure real-time updates when online
  const isHtml = url.pathname === '/' || url.pathname.endsWith('.html');
  const isApi = url.hostname.includes('supabase') || url.hostname.includes('googleapis') || url.pathname.includes('/api/');

  if (isHtml || isApi) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Only return cached fallback for HTML if offline
        if (isHtml) {
          return caches.match('/index.html') || caches.match('/');
        }
      })
    );
    return;
  }

  // Standard Network-First, fallback to Cache for static assets (js, css, images)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If it's a valid response, cache a clone of it
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fall back to cache if network request fails (offline)
        return caches.match(event.request);
      })
  );
});
