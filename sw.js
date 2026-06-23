const CACHE_NAME = '1.4.0';

// ---- App shell (cached on install — blocks SW activation) -------------------
const APP_SHELL = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './manifest.json',
    './assets/chapter-mappings.json',
    './assets/youtube_videos.json',
    './images/logo-vachanamrut.png',
    './images/swaminarayan-bg.webp',
    './images/192.png',
    './images/app-icon.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@300;400;500;700&family=Poppins:wght@300;400;500;600;700&display=swap'
];

// ---- Full offline payload (cached in background after activation) ----------
const DATA_FILES = [
    './assets/data/gujarati/partharo.json',
    './assets/data/english/partharo.json',
    './assets/data/gujarati/khagol.json',
    './assets/data/english/khagol.json'
];
for (let i = 1; i <= 262; i++) {
    DATA_FILES.push(`./assets/data/gujarati/vachanamrut-${i}.json`);
    DATA_FILES.push(`./assets/data/english/vachanamrut-${i}.json`);
}

const AUDIO_FILES = [
    './assets/data/audio/1 Partharo.mp3',
    './assets/data/audio/264 Khagol Bhugol.mp3'
];
for (let i = 1; i <= 262; i++) {
    AUDIO_FILES.push(`./assets/data/audio/${i}.mp3`);
}

const EXTRA_IMAGES = [
    './images/vachanamrut-locations/gadhada-1.webp',
    './images/vachanamrut-locations/gadhada-2.jpg',
    './images/vachanamrut-locations/gadhada-3.webp',
    './images/vachanamrut-locations/sarangpur.webp',
    './images/vachanamrut-locations/kariyani.webp',
    './images/vachanamrut-locations/loya.webp',
    './images/vachanamrut-locations/panchala.jpg',
    './images/vachanamrut-locations/vadtal.jpg',
    './images/vachanamrut-locations/ahmedabad.jpg',
    './images/Partharo/swaminarayan-pragat.webp',
    './images/Partharo/swaminarayan-birth.webp',
    './images/Partharo/swaminarayan-balleela.webp',
    './images/Partharo/swaminarayan-vanvicharan.webp',
    './images/Partharo/swaminarayan-loj.webp',
    './images/Partharo/swaminarayan-samadhi.jpg',
    './images/Partharo/swaminarayan-aarti.webp',
    './images/Partharo/khagolbhugol.webp',
    './images/512.png',
    './images/SarthiAI.png'
];

const FULL_PAYLOAD = [...DATA_FILES, ...AUDIO_FILES, ...EXTRA_IMAGES];

// Install — cache only the shell so the SW activates quickly.
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
    );
});

// Activate — claim clients, drop old caches, then kick off background pre-cache.
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        await self.clients.claim();
        const names = await caches.keys();
        await Promise.all(names.map(n => n !== CACHE_NAME && caches.delete(n)));
        // Don't block activation on the big payload — fire and forget.
        precacheInBackground();
    })());
});

// Throttled background pre-cache. Skips anything already in the cache and
// silently ignores failures so a single 404/timeout doesn't abort the rest.
async function precacheInBackground() {
    const cache = await caches.open(CACHE_NAME);
    const queue = [...FULL_PAYLOAD];
    const CONCURRENCY = 6;

    async function worker() {
        while (queue.length) {
            const url = queue.shift();
            try {
                const existing = await cache.match(url, { ignoreSearch: true });
                if (existing) continue;
                const res = await fetch(url, { cache: 'no-cache' });
                if (res.ok) await cache.put(url, res);
            } catch (_) {
                // Network or quota error — skip silently; fetch handler will
                // try again on first real access.
            }
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    // Tell any open clients we're done so they can update UI if they want.
    const clientList = await self.clients.matchAll();
    clientList.forEach(c => c.postMessage({ type: 'precache-done' }));
}

// Allow the page to re-trigger pre-cache (e.g. after language switch).
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'precache') {
        precacheInBackground();
    }
});

// Fetch — cache-first, fall back to network and lazy-cache successful GETs.
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match('./index.html').then(r => r || fetch(event.request))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(res => {
                if (!res || res.status !== 200 || res.type !== 'basic') return res;
                const copy = res.clone();
                caches.open(CACHE_NAME).then(cache => {
                    if (event.request.url.startsWith('http')) {
                        cache.put(event.request, copy);
                    }
                });
                return res;
            }).catch(() => cached);
        })
    );
});
