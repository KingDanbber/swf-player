/**
 * Lógica del reproductor Ruffle
 */

import { getMainSwfUrl } from './assets.js';

let currentPlayer = null;
let currentFile = null;
let currentObjectUrl = null;
let currentMode = 'file'; // 'file' | 'folder'
let currentMainPath = null;

/**
 * Carga un único archivo SWF (sin assets externos)
 * @param {File} file
 */
export async function loadSwf(file) {
  currentMode = 'file';
  currentMainPath = null;
  currentFile = file;
  return loadInternal({ kind: 'file', file });
}

/**
 * Carga un juego desde carpeta de assets (SWF + lib/ etc.)
 * @param {{ mainFile: File, mainPath: string }} opts
 */
export async function loadSwfWithAssets(opts) {
  currentMode = 'folder';
  currentMainPath = opts.mainPath;
  currentFile = opts.mainFile;
  return loadInternal({ kind: 'folder', mainPath: opts.mainPath, file: opts.mainFile });
}

async function loadInternal(source) {
  const container = document.getElementById('player-container');
  const loading = document.getElementById('loading-overlay');
  const fileNameEl = document.getElementById('file-name');

  if (!container) return;

  loading?.classList.remove('hidden');
  destroyPlayer(false);

  if (fileNameEl) {
    const label =
      source.kind === 'folder'
        ? `${source.file.name} (+ assets)`
        : source.file.name;
    fileNameEl.textContent = label;
    fileNameEl.title = label;
  }

  try {
    if (typeof window.RufflePlayer === 'undefined') {
      throw new Error('Ruffle no está cargado. Recarga la página.');
    }

    const ruffle = window.RufflePlayer.newest();
    const player = ruffle.createPlayer();

    // Llenar el contenedor al 100% (el CSS posiciona absolute)
    player.style.position = 'absolute';
    player.style.inset = '0';
    player.style.width = '100%';
    player.style.height = '100%';
    player.style.display = 'block';
    player.style.maxWidth = 'none';
    player.style.maxHeight = 'none';

    const baseConfig = {
      autoplay: 'on',
      unmuteOverlay: 'hidden',
      splashScreen: false,
      contextMenu: 'on',
      scale: 'showAll',
      forceScale: true,
      letterbox: 'on',
      quality: 'high',
      allowNetworking: 'all',
    };

    player.config = baseConfig;
    container.appendChild(player);
    player.tabIndex = 0;
    player.setAttribute('tabindex', '0');
    currentPlayer = player;

    if (source.kind === 'folder') {
      await new Promise((r) => setTimeout(r, 150));
      const url = getMainSwfUrl(source.mainPath);
      try {
        const probe = await fetch(url, { cache: 'no-store' });
        if (!probe.ok) {
          throw new Error(
            'Asset no disponible (' + probe.status + '). Recarga la página y vuelve a intentar.'
          );
        }
      } catch (fetchErr) {
        console.error('Probe falló:', fetchErr);
        throw new Error(
          'No se pudo servir el SWF. Recarga UNA vez (activa el Service Worker) y vuelve a abrir el ZIP/carpeta.'
        );
      }
      await player.load({
        url,
        ...baseConfig,
      });
    } else {
      const buffer = await source.file.arrayBuffer();
      try {
        await player.load({
          data: buffer,
          swfFileName: source.file.name,
          ...baseConfig,
        });
      } catch (dataErr) {
        console.warn('Carga por data falló, Object URL...', dataErr);
        if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = URL.createObjectURL(source.file);
        await player.load({
          url: currentObjectUrl,
          swfFileName: source.file.name,
          ...baseConfig,
        });
      }
    }

    requestAnimationFrame(() => {
      try {
        player.style.width = '100%';
        player.style.height = '100%';
        window.dispatchEvent(new Event('resize'));
      } catch (_) {}
    });

    loading?.classList.add('hidden');
    return player;
  } catch (err) {
    console.error('Error al cargar SWF:', err);
    loading?.classList.add('hidden');
    const message = err?.message || err?.toString?.() || 'Error desconocido';
    const enriched = new Error(message);
    enriched.original = err;
    throw enriched;
  }
}

export async function reloadSwf() {
  if (!currentFile) return;
  if (currentMode === 'folder' && currentMainPath) {
    return loadSwfWithAssets({ mainFile: currentFile, mainPath: currentMainPath });
  }
  return loadSwf(currentFile);
}

export function destroyPlayer(clearFile = true) {
  const container = document.getElementById('player-container');
  if (container) container.innerHTML = '';
  currentPlayer = null;
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
  if (clearFile) {
    currentFile = null;
    currentMainPath = null;
    currentMode = 'file';
  }
}

export function toggleFullscreen() {
  const section = document.getElementById('player-section');
  if (!section) return;

  if (!document.fullscreenElement) {
    section.requestFullscreen?.() ||
      section.webkitRequestFullscreen?.() ||
      section.msRequestFullscreen?.();
  } else {
    document.exitFullscreen?.() ||
      document.webkitExitFullscreen?.() ||
      document.msExitFullscreen?.();
  }
}

export function getCurrentFile() {
  return currentFile;
}
