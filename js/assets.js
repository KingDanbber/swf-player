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
    entries.push({ file, path: path || file.name });
  }

  // Preferir LostLife.swf / el .swf en la raíz / el más grande
  const swfs = entries.filter((e) => e.path.toLowerCase().endsWith('.swf'));
  if (!swfs.length) throw new Error('No se encontró ningún archivo .swf en la carpeta');

  let main = swfs.find((e) => /^lostlife\.swf$/i.test(e.path.split('/').pop()));
  if (!main) main = swfs.find((e) => !e.path.includes('/'));
  if (!main) main = swfs.sort((a, b) => b.file.size - a.file.size)[0];

  const payload = [];
  for (const e of entries) {
    const buffer = await e.file.arrayBuffer();
    payload.push({ path: e.path, buffer });
  }

  lastMainSwfPath = main.path;

  return {
    mainFile: main.file,
    mainPath: main.path,
    files: payload,
    count: payload.length,
  };
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
