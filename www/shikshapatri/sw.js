const CACHE_NAME = 'shikshapatri-pwa-v2';
const urlsToCache = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './manifest.json',
    './assets/data/shikshapatri.db',
    './assets/data.json',
    './assets/images/icon-192.png',
    './assets/images/icon-512.png',
    './assets/images/favicon.ico',
    './assets/images/app-icon.png',
    './assets/images/harikrishna-maharaj-bg.png',
    './assets/images/navbar-image.png',
    '../js/sql-wasm.js',
    '../js/sql-wasm.wasm'
];

// Add all sloka images (1.png to 212.png)
for (let i = 1; i <= 212; i++) {
    urlsToCache.push(`./assets/pictorial/${i}.png`);
}

// Install SW
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Fetch
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

// Activate
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});