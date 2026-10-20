// Shikshapatri now lives inside the main Vachanamrut app (../index.html?s=shikshapatri).
// This replaces the old standalone service worker: it clears its caches and removes itself.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(n => n.startsWith('shikshapatri-pwa')).map(n => caches.delete(n)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => client.navigate('../?s=shikshapatri'));
    })());
});
