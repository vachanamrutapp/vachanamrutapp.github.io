const CACHE_NAME = '1.100.0';

// ---- App shell (cached on install — blocks SW activation) -------------------
const APP_SHELL = [
    './',
    './index.html',
    './css/styles.css',
    './js/sql-wasm.js',
    './js/sql-wasm.wasm',
    './js/app.js',
    './js/search-core.js',
    './js/search-worker.js',
    './js/search.js',
    './js/shikshapatri.js',
    './js/annotations.js',
    './js/background-audio.js',
    './js/audio-page.js',
    './js/reminders.js',
    './js/onboarding.js',
    './js/appearance.js',
    './manifest.json',
    './assets/data/vachanamrut.db',
    './images/logo-vachanamrut.png',
    './images/yellow-bg.webp',
    './images/192.png',
    './images/app-icon.png',
    './shikshapatri/',
    './shikshapatri/index.html',
    './shikshapatri/assets/data/shikshapatri.db',
    './shikshapatri/assets/data.json',
    './images/harikrishna-maharaj-bg.webp',
    './images/home-bg-dark.webp',
    './images/setup-art.webp',
    './shikshapatri/assets/images/navbar-image.webp',
    './css/fonts.css',
    './css/fontawesome.css',
    './assets/fonts/NotoSansGujarati-gujarati.woff2',
    './assets/fonts/NotoSansGujarati-latin.woff2',
    './assets/fonts/NotoSansGujarati-latin-ext.woff2',
    './assets/fonts/Poppins-latin-400.woff2',
    './assets/fonts/Poppins-latin-500.woff2',
    './assets/fonts/Poppins-latin-600.woff2',
    './assets/fonts/Poppins-latin-700.woff2',
    './assets/fonts/fa-solid-900.woff2',
    './assets/fonts/fa-regular-400.woff2'
];

// Audio (~650 MB) is NOT pre-cached any more: it is downloaded on request (Audio page / Settings →
// "Download all") into OFFLINE_AUDIO_CACHE, and played back from there with byte-range support.
const OFFLINE_AUDIO_CACHE = 'offline-audio-v1';

// ---- Full offline payload (cached in background after activation) ----------

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
    './images/facts/sun.webp',
    './images/facts/moon.webp',
    './images/facts/day.webp',
    './images/facts/spring-season.webp',
    './images/facts/rainy-season.webp',
    './images/facts/fall-season.webp',
    './images/facts/winter-season.webp',
    './images/facts/summer-season.webp',
    './images/facts/calendar.webp',
    './images/facts/festival.webp',
    './images/facts/shikshapatri.webp',
    './images/facts/acharya-gadi.webp',
    './images/facts/star-bye.webp',
    './images/facts/shakotsav.webp',
    './images/facts/authors/SwaminarayanBhagwaan.webp',
    './images/facts/authors/muktanandSwami.webp',
    './images/facts/authors/gopalanandSwami.webp',
    './images/facts/authors/nityanandSwami.webp',
    './images/facts/authors/shukanandSwami.webp'
];

// Shikshapatri illustrations (Shikshapatri is part of this app now)
const SHIKSHAPATRI_IMAGES = [];
for (let i = 1; i <= 212; i++) {
    SHIKSHAPATRI_IMAGES.push(`./shikshapatri/assets/pictorial/${i}.webp`);
}

const FULL_PAYLOAD = [...EXTRA_IMAGES, ...SHIKSHAPATRI_IMAGES];

// Install — cache only the shell so the SW activates quickly.
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL.map(u => new Request(u, { cache: 'reload' }))))
    );
});

// Activate — claim clients, drop old caches, then kick off background pre-cache.
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        await self.clients.claim();
        const names = await caches.keys();
        await Promise.all(names.map(n => n !== CACHE_NAME && n !== OFFLINE_AUDIO_CACHE && caches.delete(n)));
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
        const url = new URL(event.request.url);
        // Standalone pages, not app routes — let the browser fetch them normally.
        if (url.pathname.endsWith('/privacy.html')) return;
        if (url.pathname.includes('/shikshapatri')) {
            event.respondWith(
                caches.match('./shikshapatri/index.html', { ignoreSearch: true })
                    .then(r => r || fetch(event.request))
            );
            return;
        }
        event.respondWith(
            caches.match('./index.html', { ignoreSearch: true }).then(r => r || fetch(event.request))
        );
        return;
    }

    if (new URL(event.request.url).pathname.endsWith('.mp3')) {
        event.respondWith(serveAudio(event.request));
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

// Audio: play from the downloaded copy when there is one (answering Range requests, which iOS and
// Android media elements always send), otherwise stream from the network without caching it.
async function serveAudio(request) {
    const cache = await caches.open(OFFLINE_AUDIO_CACHE);
    const cached = await cache.match(request.url, { ignoreSearch: true });
    if (!cached) return fetch(request);

    const range = request.headers.get('range');
    if (!range) return cached;
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (!m) return cached;
    const blob = await cached.blob();
    const size = blob.size;
    let start = m[1] === '' ? Math.max(0, size - parseInt(m[2], 10)) : parseInt(m[1], 10);
    let end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(parseInt(m[2], 10), size - 1);
    if (isNaN(start) || start >= size || end < start) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    return new Response(blob.slice(start, end + 1), {
        status: 206,
        headers: {
            'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
            'Content-Length': String(end - start + 1),
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Accept-Ranges': 'bytes',
        },
    });
}
