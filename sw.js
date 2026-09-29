/**
 * Service Worker — sirve assets locales del juego (SWF + lib/ + etc.)
 * Las rutas relativas (lib/m1.swf) se resuelven bajo /__swf_assets__/
 */

const PREFIX = '/__swf_assets__/';
/** @type {Map<string, { buffer: ArrayBuffer, type: string }>} */
const store = new Map();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'CLEAR') {
    store.clear();
    event.source?.postMessage({ type: 'CLEARED' });
    return;
  }

  if (data.type === 'SET_FILES' && Array.isArray(data.files)) {
    store.clear();
    for (const entry of data.files) {
      if (!entry || !entry.path || !entry.buffer) continue;
      const path = normalizePath(entry.path);
      const type = guessType(path);
      store.set(path, { buffer: entry.buffer, type });
      // También indexar solo el nombre de archivo (fallback)
      const base = path.split('/').pop();
      if (base && !store.has(base)) {
        store.set(base, { buffer: entry.buffer, type });
      }
    }
    event.source?.postMessage({ type: 'READY', count: store.size });
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith(PREFIX)) return;

  let rel = decodeURIComponent(url.pathname.slice(PREFIX.length));
  rel = normalizePath(rel);

  let entry = store.get(rel);
  if (!entry) {
    // Probar sin carpetas intermedias o con variantes
    const base = rel.split('/').pop();
    entry = store.get(base);
  }

  if (entry) {
    event.respondWith(
      new Response(entry.buffer.slice(0), {
        status: 200,
        headers: {
          'Content-Type': entry.type,
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      })
    );
    return;
  }

  event.respondWith(new Response('Not found: ' + rel, { status: 404 }));
});

function normalizePath(p) {
  return String(p)
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/\/+/g, '/');
}

function guessType(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.swf')) return 'application/x-shockwave-flash';
  if (lower.endsWith('.xml')) return 'application/xml';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.txt')) return 'text/plain';
  return 'application/octet-stream';
}
