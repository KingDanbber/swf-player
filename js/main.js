/**
 * SWF Player — Punto de entrada
 */

import { initTheme } from './theme.js';
import { initUI } from './ui.js';
import { registerAssetWorker } from './assets.js';

document.addEventListener('DOMContentLoaded', async () => {
  window.RufflePlayer = window.RufflePlayer || {};
  window.RufflePlayer.config = {
    ...(window.RufflePlayer.config || {}),
    autoplay: 'on',
    unmuteOverlay: 'hidden',
    splashScreen: false,
    contextMenu: 'on',
  };

  initTheme();
  initUI();

  // Service Worker para juegos con carpeta de assets (lib/, etc.)
  try {
    await registerAssetWorker();
  } catch (e) {
    console.warn('SW assets no disponible:', e);
  }

  if (
    typeof window.RufflePlayer === 'undefined' ||
    typeof window.RufflePlayer.newest !== 'function'
  ) {
    console.error('Ruffle no se cargó. Comprueba la conexión (CDN).');
  } else {
    console.log('SWF Player listo · Ruffle cargado');
  }
});
