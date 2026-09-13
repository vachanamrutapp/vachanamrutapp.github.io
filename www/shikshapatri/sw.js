const CACHE_NAME = 'shikshapatri-pwa-v12';

// Core shell cached synchronously on install — blocks SW activation but is fast & 100% reliable
const CORE_SHELL = [
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
    '../images/yellow-bg.webp',
    '../js/sql-wasm.js',
    '../js/sql-wasm.wasm',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@300;400;500;600;700&family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap'
];

// All sloka pictorial illustrations (cached asynchronously in background)
const PICTORIAL_IMAGES = [];
for (let i = 1; i <= 212; i++) {
    PICTORIAL_IMAGES.push(`./assets/pictorial/${i}.png`);
}

// Install SW
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_SHELL))
    );
});

// Activate SW
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        await self.clients.claim();
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(name => {
                if (name !== CACHE_NAME) {
                    return caches.delete(name);
                }
            })
        );
        precacheImagesInBackground();
    })());
});

// Throttled background pre-cache for sloka illustrations
async function precacheImagesInBackground() {
    const cache = await caches.open(CACHE_NAME);
    const queue = [...PICTORIAL_IMAGES];
    const CONCURRENCY = 4;

    async function worker() {
        while (queue.length) {
            const url = queue.shift();
            try {
                const existing = await cache.match(url, { ignoreSearch: true });
                if (existing) continue;
                const res = await fetch(url, { cache: 'no-cache' });
                if (res.ok) await cache.put(url, res);
            } catch (_) {}
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

// Fetch handler
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    // Handle HTML navigations (e.g. ?id=5) with the cached index.html
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match('./index.html', { ignoreSearch: true })
                .then(cached => cached || fetch(event.request))
        );
        return;
    }

    // Cache-first with ignoreSearch and runtime caching fallback
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (!response || response.status !== 200) return response;
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    if (event.request.url.startsWith('http')) {
                        cache.put(event.request, responseToCache);
                    }
                });
                return response;
            }).catch(() => cached);
        })
    );
});