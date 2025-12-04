const CACHE_NAME = '1.0.8';

// Generate list of vachanamrut data files (1 to 262)
const DATA_FILES = [];
for (let i = 1; i <= 262; i++) {
    DATA_FILES.push(`./assets/data/vachanamrut-${i}.json`);
}

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './manifest.json',
    './assets/youtube_videos.json',
    './assets/chapter-mappings.json',
    './images/logo-vachanamrut.png',
    './images/swaminarayan-bg.jpg',
    './images/192.png',
    './images/512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@300;400;500;700&family=Poppins:wght@300;400;500;600;700&display=swap',
    ...DATA_FILES
];

// Install event - cache assets
self.addEventListener('install', event => {
    // Force waiting service worker to become active
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    // Claim any clients immediately, so they're controlled by this new SW
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
    // App Shell pattern: serve index.html for all navigation requests
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match('./index.html').then(response => {
                return response || fetch(event.request);
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true })
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request).then(
                    response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                // Don't cache data files dynamically here to avoid filling cache with 262 files immediately
                                // unless explicitly requested. For now, let's cache visited pages/assets.
                                // Filtering out chrome-extension requests or other non-http schemes
                                if (event.request.url.startsWith('http')) {
                                    cache.put(event.request, responseToCache);
                                }
                            });

                        return response;
                    }
                );
            })
    );
});
