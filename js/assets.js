/**
 * Gestión de assets locales (carpeta / múltiples archivos)
 * Usa Service Worker para servir rutas relativas al SWF principal.
 */

const SW_URL = './sw.js';
const ASSETS_PREFIX = '/__swf_assets__/';

let swRegistration = null;
let lastMainSwfPath = null;

/**
 * Registra el Service Worker (necesario en HTTPS / localhost)
 */
export async function registerAssetWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker no soportado');
    return false;
  }
  try {
    swRegistration = await navigator.serviceWorker.register(SW_URL, { scope: './' });
    await navigator.serviceWorker.ready;
    console.log('[Assets] Service Worker listo');
    return true;
  } catch (err) {
    console.error('[Assets] No se pudo registrar SW:', err);
    return false;
  }
}

/**
 * Envía la lista de archivos al Service Worker
 * @param {Array<{ path: string, buffer: ArrayBuffer }>} files
 */
export async function publishAssets(files) {
  const reg = swRegistration || (await navigator.serviceWorker.getRegistration());
  if (!reg) throw new Error('Service Worker no disponible');

  const worker = reg.active || reg.waiting || reg.installing;
  if (!worker) throw new Error('Service Worker no activo');

  // Esperar a que esté active
  if (!reg.active) {
    await new Promise((resolve) => {
      const check = () => {
        if (reg.active) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
  }

  reg.active.postMessage({ type: 'CLEAR' });
  reg.active.postMessage({ type: 'SET_FILES', files });

  // Pequeña espera para que el SW procese
  await new Promise((r) => setTimeout(r, 80));
}

/**
 * Procesa una lista de File (de input webkitdirectory o multiple)
 * y devuelve { mainFile, mainPath, files: [{path, buffer}] }
 */
export async function processFileList(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) throw new Error('No se seleccionaron archivos');

  // Normalizar rutas (webkitRelativePath en carpetas)
  const entries = [];
  for (const file of files) {
    const rel = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
    // Quitar el primer segmento (nombre de la carpeta raíz) si existe
    const parts = rel.split('/');
    const path = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
    const buffer = await file.arrayBuffer();
    entries.push({
      file,
      path: path || file.name,
      size: file.size,
      buffer,
    });
  }

  return finalizeEntries(entries);
}

/**
 * Extrae un ZIP en memoria y prepara los assets
 * @param {File} zipFile
 */
export async function processZipFile(zipFile) {
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip no está cargado. Recarga la página.');
  }

  const zip = await JSZip.loadAsync(zipFile);
  const entries = [];

  const names = Object.keys(zip.files);
  for (const name of names) {
    const entry = zip.files[name];
    if (entry.dir) continue;

    const path = normalizeZipPath(name);
    if (!path) continue;

    const buffer = await entry.async('arraybuffer');
    entries.push({
      path,
      buffer,
      size: buffer.byteLength,
      // Fake File-like for display
      file: new File([buffer], path.split('/').pop() || 'file', {
        type: 'application/octet-stream',
      }),
    });
  }

  if (!entries.length) throw new Error('El ZIP está vacío o no se pudo leer');

  return finalizeEntries(entries);
}

function normalizeZipPath(name) {
  let path = String(name).replace(/\\/g, '/').replace(/^\/+/, '');
  // Quitar un único segmento raíz común (ej. assets/LostLife.swf → LostLife.swf
  // pero conservar lib/...)
  // Si TODOS los archivos comparten un prefijo de una carpeta, lo quitamos en finalize
  return path;
}

/**
 * Elige SWF principal y construye el payload
 */
function finalizeEntries(entries) {
  // Si todos comparten el mismo primer directorio (ej. "assets/"), quitarlo
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
  if (!swfs.length) {
    throw new Error('No se encontró ningún archivo .swf en el ZIP/carpeta');
  }

  let main = swfs.find((e) => /^lostlife\.swf$/i.test(e.path.split('/').pop()));
  if (!main) main = swfs.find((e) => !e.path.includes('/'));
  if (!main) main = swfs.sort((a, b) => (b.size || 0) - (a.size || 0))[0];

  const payload = entries.map((e) => ({
    path: e.path,
    buffer: e.buffer || null,
  }));

  // Si aún no hay buffer (viene de File), se rellenará fuera — processFileList ya lee
  lastMainSwfPath = main.path;

  return {
    mainFile: main.file,
    mainPath: main.path,
    files: payload,
    count: payload.length,
    needsBufferRead: payload.some((p) => !p.buffer),
    _entries: entries,
  };
}

/**
 * Completa buffers si processFileList no los leyó aún (compat)
 */
export async function ensureBuffers(result) {
  if (!result.needsBufferRead) return result;
  const files = [];
  for (const e of result._entries) {
    const buffer = e.buffer || (await e.file.arrayBuffer());
    files.push({ path: e.path, buffer });
  }
  return {
    mainFile: result.mainFile,
    mainPath: result.mainPath,
    files,
    count: files.length,
  };
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

/**
 * URL virtual del SWF principal para cargar en Ruffle
 */
export function getMainSwfUrl(mainPath) {
  const path = mainPath || lastMainSwfPath || 'movie.swf';
  // URL absoluta respecto al origen (el SW intercepta)
  return new URL(ASSETS_PREFIX + path.replace(/^\//, ''), window.location.origin).href;
}

export function getLastMainPath() {
  return lastMainSwfPath;
}
