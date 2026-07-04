const CACHE = 'guni-v3';
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/db.js',
  '/js/utils.js',
  '/js/app.js',
  '/js/dashboard.js',
  '/js/persons.js',
  '/js/designs.js',
  '/js/chalans.js',
  '/js/production.js',
  '/js/dispatch.js',
  '/js/reports.js'
];

const CDN_CACHE = 'guni-cdn';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE && k !== CDN_CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(
      caches.open(CDN_CACHE).then(cache =>
        cache.match(e.request).then(cached =>
          (cached || fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          }))
        )
      )
    );
    return;
  }

  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fetched = fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetched;
        })
      )
    );
  }
});
