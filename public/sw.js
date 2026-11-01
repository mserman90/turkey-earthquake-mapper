const CACHE_NAME = 'tr-earthquake-mapper-v2.5-tamp';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './pwa-icon.svg',
  './status-snapshot.json',
  './events-snapshot.json',
  './afad-events-snapshot.json',
];

self.addEventListener('install', (event) => {
  // Immediately activate new service worker without waiting
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // Delete all older caches or any carto caches
            .filter((key) => key !== CACHE_NAME)
            .map((oldKey) => caches.delete(oldKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache Carto tiles (Carto now blocks unauthenticated requests)
  if (url.hostname.includes('cartocdn.com') || url.hostname.includes('carto.com')) {
    return;
  }

  // Network-first for navigation (index.html), API, and telemetry snapshots
  // This guarantees fresh HTML/JS bundle hashes upon reload
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('index.html') ||
    url.pathname === '/' ||
    url.pathname.includes('/api/') ||
    url.pathname.endsWith('-snapshot.json') ||
    url.hostname.includes('udesquake.com.tr') ||
    url.hostname.includes('afad.gov.tr')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Stale-while-revalidate for static assets & OpenStreetMap tiles
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
