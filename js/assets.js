/**
 * Assets locales vía Cache API + Service Worker
 */

const SW_URL = './sw.js';
const ASSETS_PREFIX = '/__swf_assets__/';
const CACHE_NAME = 'swf-player-assets-v1';

let swRegistration = null;
let lastMainSwfPath = null;

export async function registerAssetWorker() {
  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    console.warn('[Assets] SW o Cache API no soportados');
    return false;
  }
  try {
    swRegistration = await navigator.serviceWorker.register(SW_URL, { scope: './' });
    if (swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        const onChange = () => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.removeEventListener('controllerchange', onChange);
            resolve();
          }
        };
        navigator.serviceWorker.addEventListener('controllerchange', onChange);
        setTimeout(resolve, 1500);
      });
    }

    console.log('[Assets] SW listo, controller=', !!navigator.serviceWorker.controller);
    return true;
  } catch (err) {
    console.error('[Assets] Error registrando SW:', err);
    return false;
  }
}

export async function publishAssets(files) {
  const cache = await caches.open(CACHE_NAME);
  const origin = self.location.origin;

  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter((req) => {
        try {
          return new URL(req.url).pathname.startsWith(ASSETS_PREFIX);
        } catch {
          return false;
        }
      })
      .map((req) => cache.delete(req))
  );

  let stored = 0;
  for (const entry of files) {
    if (!entry || !entry.path || !entry.buffer) continue;
    const path = normalizePath(entry.path);
    const type = guessType(path);
    const url = origin + ASSETS_PREFIX + path;

    const headers = {
      'Content-Type': type,
      'Content-Length': String(entry.buffer.byteLength),
      'Cache-Control': 'no-cache',
    };

    // Un Response nuevo por cada put (no se puede reutilizar el body)
    await cache.put(
      url,
      new Response(entry.buffer.slice(0), { status: 200, headers })
    );
    stored++;

    const base = path.split('/').pop();
    if (base && base !== path) {
      await cache.put(
        origin + ASSETS_PREFIX + base,
        new Response(entry.buffer.slice(0), { status: 200, headers })
      );
    }
  }

  console.log('[Assets] Publicados en cache:', stored);
  return stored;
}

export async function processFileList(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) throw new Error('No se seleccionaron archivos');

  const entries = [];
  for (const file of files) {
    const rel = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
    const parts = rel.split('/');
    const path = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
    const buffer = await file.arrayBuffer();
    entries.push({ file, path: path || file.name, size: file.size, buffer });
  }

  return finalizeEntries(entries);
}

export async function processZipFile(zipFile) {
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip no está cargado. Recarga la página.');
  }

  const zip = await JSZip.loadAsync(zipFile);
  const entries = [];

  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];
    if (entry.dir) continue;
    const path = String(name).replace(/\\/g, '/').replace(/^\/+/, '');
    if (!path) continue;
    const buffer = await entry.async('arraybuffer');
    entries.push({
      path,
      buffer,
      size: buffer.byteLength,
      file: new File([buffer], path.split('/').pop() || 'file', {
        type: 'application/octet-stream',
      }),
    });
  }

  if (!entries.length) throw new Error('El ZIP está vacío o no se pudo leer');
  return finalizeEntries(entries);
}

function finalizeEntries(entries) {
  const withSlash = entries.filter((e) => e.path.includes('/'));
  if (withSlash.length === entries.length && entries.length > 0) {
    const roots = new Set(entries.map((e) => e.path.split('/')[0]));
    if (roots.size === 1) {
      const root = [...roots][0];
      entries = entries.map((e) => ({
        ...e,
        path: e.path.slice(root.length + 1) || e.path,
      }));
    }
  }

  const swfs = entries.filter((e) => e.path.toLowerCase().endsWith('.swf'));
  if (!swfs.length) throw new Error('No se encontró ningún archivo .swf');

  let main = swfs.find((e) => /^lostlife\.swf$/i.test(e.path.split('/').pop()));
  if (!main) main = swfs.find((e) => !e.path.includes('/'));
  if (!main) main = swfs.sort((a, b) => (b.size || 0) - (a.size || 0))[0];

  const payload = entries.map((e) => ({ path: e.path, buffer: e.buffer }));
  lastMainSwfPath = main.path;

  return {
    mainFile: main.file,
    mainPath: main.path,
    files: payload,
    count: payload.length,
  };
}

export async function ensureBuffers(result) {
  return result;
}

export function getMainSwfUrl(mainPath) {
  const path = normalizePath(mainPath || lastMainSwfPath || 'movie.swf');
  return new URL(ASSETS_PREFIX + path, window.location.origin).href;
}

export function getLastMainPath() {
  return lastMainSwfPath;
}

export function isZipFile(file) {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  return (
    name.endsWith('.zip') ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed'
  );
}

function normalizePath(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/+/g, '/');
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
