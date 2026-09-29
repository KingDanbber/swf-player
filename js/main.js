/**
 * SWF Player — Punto de entrada
 * Aplicación web modular para reproducir juegos Flash (.swf) localmente
 * usando Ruffle.
 */

import { initTheme } from './theme.js';
import { initUI } from './ui.js';

/**
 * Configura Ruffle con la ruta correcta de los archivos WASM.
 * Debe ejecutarse antes de crear cualquier player.
 */
function setupRuffleConfig() {
  window.RufflePlayer = window.RufflePlayer || {};

  // Detectar la URL base de ruffle.js (donde también están los .wasm)
  let publicPath = 'lib/ruffle/';
  try {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].getAttribute('src') || scripts[i].src || '';
      if (src.includes('ruffle.js')) {
        // Convertir a URL absoluta para evitar problemas de rutas relativas
        const absolute = new URL(src, window.location.href);
        publicPath = absolute.href.substring(0, absolute.href.lastIndexOf('/') + 1);
        break;
      }
    }
  } catch (e) {
    console.warn('No se pudo detectar publicPath, usando valor por defecto', e);
  }

  window.RufflePlayer.config = {
    publicPath: publicPath,
    autoplay: 'on',
    unmuteOverlay: 'hidden',
    splashScreen: false,
    contextMenu: 'on',
  };

  console.log('[SWF Player] Ruffle publicPath =', publicPath);
}

document.addEventListener('DOMContentLoaded', () => {
  setupRuffleConfig();

  // Inicializar tema (claro/oscuro)
  initTheme();

  // Inicializar interfaz
  initUI();

  // Comprobar que Ruffle esté disponible
  if (typeof window.RufflePlayer === 'undefined' || typeof window.RufflePlayer.newest !== 'function') {
    console.error('Ruffle no se cargó correctamente. Revisa la carpeta lib/ruffle/');
  } else {
    console.log('SWF Player listo · Ruffle cargado');
  }
});
