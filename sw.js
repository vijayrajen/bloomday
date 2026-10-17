const CACHE_NAME = 'bloomday-static-v8';
const APP_FILES = [
  './', './index.html', './styles.css?v=6', './app.js?v=7', './food-library.js?v=6', './google-config.js?v=6', './manifest.webmanifest',
  './apple-touch-icon.png', './apple-touch-icon-v2.png', './favicon-v2.ico', './assets/favicon-32-v2.png', './assets/icon-192-v2.png', './assets/icon-512-v2.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response && response.ok && new URL(event.request.url).origin === self.location.origin) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match('./index.html'))));
});
