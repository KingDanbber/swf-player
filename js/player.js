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

    const rect = container.getBoundingClientRect();
    const w = Math.max(Math.floor(rect.width) || window.innerWidth, 320);
    const h = Math.max(
      Math.floor(rect.height) || Math.floor(window.innerHeight * 0.55),
      280
    );

    player.style.width = w + 'px';
    player.style.height = h + 'px';
    player.style.display = 'block';
    player.style.maxWidth = '100%';
    player.style.maxHeight = '100%';

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
    currentPlayer = player;

    if (source.kind === 'folder') {
      // Cargar por URL virtual — las rutas relativas (lib/...) las resuelve el SW
      const url = getMainSwfUrl(source.mainPath);
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
        const r = container.getBoundingClientRect();
        player.style.width = Math.max(r.width, 320) + 'px';
        player.style.height = Math.max(r.height, 280) + 'px';
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
