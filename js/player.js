/**
 * Lógica del reproductor Ruffle
 */

let currentPlayer = null;
let currentFile = null;
let currentObjectUrl = null;

/**
 * Crea e inserta el reproductor Ruffle con el archivo SWF
 * @param {File} file
 */
export async function loadSwf(file) {
  const container = document.getElementById('player-container');
  const loading = document.getElementById('loading-overlay');
  const fileNameEl = document.getElementById('file-name');

  if (!container) return;

  currentFile = file;
  loading?.classList.remove('hidden');
  destroyPlayer();

  if (fileNameEl) {
    fileNameEl.textContent = file.name;
    fileNameEl.title = file.name;
  }

  try {
    if (typeof window.RufflePlayer === 'undefined') {
      throw new Error('Ruffle no está cargado. Recarga la página.');
    }

    const ruffle = window.RufflePlayer.newest();
    const player = ruffle.createPlayer();

    player.style.width = '100%';
    player.style.height = '100%';
    player.style.display = 'block';

    // Configuración compatible (sin forzar webgpu — falla en muchos móviles)
    player.config = {
      autoplay: 'on',
      unmuteOverlay: 'hidden',
      splashScreen: false,
      contextMenu: 'on',
      // preferredRenderer se deja en auto (null) para máxima compatibilidad
    };

    container.appendChild(player);
    currentPlayer = player;

    // Método 1 (recomendado por Ruffle): data + swfFileName
    // swfFileName es importante para muchos juegos AS2/AS3
    const buffer = await file.arrayBuffer();

    try {
      await player.load({
        data: buffer,
        swfFileName: file.name,
      });
    } catch (dataErr) {
      console.warn('Carga por data falló, intentando Object URL...', dataErr);

      // Método 2 (fallback): Object URL — más compatible en algunos navegadores
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
      currentObjectUrl = URL.createObjectURL(file);

      await player.load({
        url: currentObjectUrl,
        // Algunos juegos necesitan el nombre
        swfFileName: file.name,
      });
    }

    loading?.classList.add('hidden');
    return player;
  } catch (err) {
    console.error('Error al cargar SWF:', err);
    loading?.classList.add('hidden');
    // Propagar el mensaje real para poder mostrarlo
    const message = err?.message || err?.toString?.() || 'Error desconocido';
    const enriched = new Error(message);
    enriched.original = err;
    throw enriched;
  }
}

/**
 * Recarga el archivo actual
 */
export async function reloadSwf() {
  if (!currentFile) return;
  return loadSwf(currentFile);
}

/**
 * Destruye el player actual
 */
export function destroyPlayer() {
  const container = document.getElementById('player-container');
  if (container) {
    container.innerHTML = '';
  }
  currentPlayer = null;

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

/**
 * Entra / sale de pantalla completa
 */
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

/**
 * Devuelve el archivo actual
 */
export function getCurrentFile() {
  return currentFile;
}
