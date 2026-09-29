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

    // Tamaño explícito para evitar pantalla negra en móvil
    const rect = container.getBoundingClientRect();
    const w = Math.max(Math.floor(rect.width) || window.innerWidth, 320);
    const h = Math.max(Math.floor(rect.height) || Math.floor(window.innerHeight * 0.55), 280);

    player.style.width = w + 'px';
    player.style.height = h + 'px';
    player.style.display = 'block';
    player.style.maxWidth = '100%';
    player.style.maxHeight = '100%';

    // Configuración orientada a que el contenido se vea
    player.config = {
      autoplay: 'on',
      unmuteOverlay: 'hidden',
      splashScreen: false,
      contextMenu: 'on',
      scale: 'showAll',
      forceScale: true,
      letterbox: 'on',
      quality: 'high',
    };

    container.appendChild(player);
    currentPlayer = player;

    const buffer = await file.arrayBuffer();
    const loadOptions = {
      data: buffer,
      swfFileName: file.name,
      autoplay: 'on',
      scale: 'showAll',
      forceScale: true,
      letterbox: 'on',
    };

    try {
      await player.load(loadOptions);
    } catch (dataErr) {
      console.warn('Carga por data falló, intentando Object URL...', dataErr);
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = URL.createObjectURL(file);
      await player.load({
        url: currentObjectUrl,
        swfFileName: file.name,
        autoplay: 'on',
        scale: 'showAll',
        forceScale: true,
        letterbox: 'on',
      });
    }

    // Forzar redimensionado tras cargar (algunos móviles necesitan esto)
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
