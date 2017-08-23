var CACHE_NAME = 'trntxt-cache-v1';
var OFFLINE_URL = '/offline.html';

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.add(OFFLINE_URL);
      })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.mode === 'navigate' ||
      (event.request.method === 'GET' &&
       event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request).catch(error => {
        return caches.match(OFFLINE_URL);
      })
    );
  }
});
