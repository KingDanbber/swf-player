/**
 * Service Worker — sirve assets desde Cache API
 * Prefijo: /__swf_assets__/
 */

const PREFIX = '/__swf_assets__/';
const CACHE_NAME = 'swf-player-assets-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('swf-player-assets-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith(PREFIX)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      let res = await cache.match(event.request);
      if (res) return res;

      const rel = decodeURIComponent(url.pathname.slice(PREFIX.length)).replace(/^\/+/, '');
      res = await cache.match(PREFIX + rel);
      if (res) return res;

      const base = rel.split('/').pop();
      if (base) {
        res = await cache.match(PREFIX + base);
        if (res) return res;
        // Absolute URL variants
        res = await cache.match(self.location.origin + PREFIX + rel);
        if (res) return res;
        res = await cache.match(self.location.origin + PREFIX + base);
        if (res) return res;
      }

      return new Response('Asset not found: ' + rel, {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
