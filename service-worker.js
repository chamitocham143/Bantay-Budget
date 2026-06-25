const CACHE_NAME = 'expenses-tracker-v9.6.9';

const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
 const url =
  new URL(event.request.url);
 if(
   url.pathname.includes('reset.html')
   ||
   url.pathname.includes('reset.js')
 ){
   return;
 }
 event.respondWith(
   caches.match(event.request)
   .then(response=>{
     return response || fetch(event.request);
   })
 );
});


