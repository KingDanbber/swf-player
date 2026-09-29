/**
 * Manejo de la interfaz de usuario
 */

import { showToast, isSwfFile, formatFileSize } from './utils.js';
import { loadSwf, reloadSwf, destroyPlayer, toggleFullscreen } from './player.js';
import { toggleTheme } from './theme.js';

export function initUI() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const btnSelect = document.getElementById('btn-select');
  const btnTheme = document.getElementById('btn-theme');
  const btnReload = document.getElementById('btn-reload');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnClose = document.getElementById('btn-close');
  const playerSection = document.getElementById('player-section');

  // Tema
  btnTheme?.addEventListener('click', toggleTheme);

  // Seleccionar archivo
  btnSelect?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput?.click();
  });

  // Click en toda la drop-zone también abre el selector
  dropZone?.addEventListener('click', () => {
    fileInput?.click();
  });

  // Cambio de archivo
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input para poder cargar el mismo archivo otra vez
    e.target.value = '';
  });

  // Drag & Drop
  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone?.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });

  // Controles del player
  btnReload?.addEventListener('click', async () => {
    try {
      showToast('Recargando...', 'info', 1500);
      await reloadSwf();
      showToast('Juego recargado', 'success');
    } catch {
      showToast('Error al recargar', 'error');
    }
  });

  btnFullscreen?.addEventListener('click', toggleFullscreen);

  btnClose?.addEventListener('click', () => {
    destroyPlayer();
    playerSection?.classList.add('hidden');
    dropZone?.classList.remove('hidden');
    showToast('Juego cerrado', 'info');
  });

  // Prevenir drag de archivos fuera de la zona
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());
}

/**
 * Procesa un archivo seleccionado
 */
async function handleFile(file) {
  if (!isSwfFile(file)) {
    showToast('Solo se permiten archivos .swf', 'error');
    return;
  }

  const dropZone = document.getElementById('drop-zone');
  const playerSection = document.getElementById('player-section');

  // Cambiar a vista de player
  dropZone?.classList.add('hidden');
  playerSection?.classList.remove('hidden');

  try {
    showToast(`Cargando ${file.name} (${formatFileSize(file.size)})...`, 'info', 2000);
    await loadSwf(file);
    showToast('¡Listo para jugar!', 'success');
  } catch (err) {
    console.error('Error detallado:', err);
    const msg = (err?.message || '').toLowerCase();

    let toastMsg;
    if (msg.includes('wasm') || msg.includes('failed to load ruffle')) {
      toastMsg = 'Error WASM: el servidor no sirve bien los archivos .wasm. Usa un servidor que soporte MIME application/wasm (ver README).';
    } else if (msg.includes('network') || msg.includes('fetch')) {
      toastMsg = 'Error de red al cargar Ruffle. Sirve la carpeta completa con un servidor local.';
    } else {
      const detail = err?.message ? ` (${err.message.slice(0, 55)})` : '';
      toastMsg = `No se pudo cargar el archivo${detail}.`;
    }

    showToast(toastMsg, 'error', 6500);

    // Volver a la drop zone si falla
    playerSection?.classList.add('hidden');
    dropZone?.classList.remove('hidden');
    destroyPlayer();
  }
}
