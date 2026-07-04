const CACHE = 'guni-v1';
const FILES = [
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
  '/js/reports.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.startsWith('http')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetched = fetch(e.request).then(
          res => { const r = res.clone(); caches.open(CACHE).then(c => c.put(e.request, r)); return res; },
          () => cached
        );
        return fetched || cached;
      })
    );
  }
});
