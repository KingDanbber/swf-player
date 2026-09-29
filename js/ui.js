/**
 * Manejo de la interfaz de usuario
 */

import { showToast, isSwfFile, formatFileSize } from './utils.js';
import { loadSwf, loadSwfWithAssets, reloadSwf, destroyPlayer, toggleFullscreen } from './player.js';
import {
  processFileList,
  processZipFile,
  publishAssets,
  ensureBuffers,
  isZipFile,
} from './assets.js';
import { toggleTheme } from './theme.js';

export function initUI() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const folderInput = document.getElementById('folder-input');
  const btnSelect = document.getElementById('btn-select');
  const btnFolder = document.getElementById('btn-folder');
  const btnTheme = document.getElementById('btn-theme');
  const btnReload = document.getElementById('btn-reload');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnClose = document.getElementById('btn-close');
  const playerSection = document.getElementById('player-section');

  btnTheme?.addEventListener('click', toggleTheme);

  btnSelect?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput?.click();
  });

  btnFolder?.addEventListener('click', (e) => {
    e.stopPropagation();
    folderInput?.click();
  });

  // Click en drop-zone → archivo suelto (no carpeta)
  dropZone?.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    fileInput?.click();
  });

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isZipFile(file)) await handleZip(file);
      else await handleSingleFile(file);
    }
    e.target.value = '';
  });

  folderInput?.addEventListener('change', async (e) => {
    const list = e.target.files;
    if (list?.length) await handleFolder(list);
    e.target.value = '';
  });

  // Drag & Drop: archivos o carpetas
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

  dropZone?.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    const items = e.dataTransfer?.items;
    const files = e.dataTransfer?.files;

    // Si hay más de un archivo o alguno tiene webkitRelativePath → tratar como carpeta
    if (files && files.length > 1) {
      await handleFolder(files);
      return;
    }

    // Intentar leer directorio si el navegador lo soporta
    if (items && items.length === 1 && items[0].webkitGetAsEntry) {
      const entry = items[0].webkitGetAsEntry();
      if (entry?.isDirectory) {
        const list = await readDirectoryEntry(entry);
        if (list.length) {
          await handleFolder(list);
          return;
        }
      }
    }

    const file = files?.[0];
    if (file) {
      if (isZipFile(file)) await handleZip(file);
      else if (isSwfFile(file)) await handleSingleFile(file);
      else showToast('Suelta un .swf, .zip o una carpeta con el juego', 'error');
    }
  });

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

  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());
}

async function handleSingleFile(file) {
  if (!isSwfFile(file)) {
    showToast('Solo se permiten archivos .swf (o usa «Carpeta con assets»)', 'error');
    return;
  }

  const dropZone = document.getElementById('drop-zone');
  const playerSection = document.getElementById('player-section');

  dropZone?.classList.add('hidden');
  playerSection?.classList.remove('hidden');

  try {
    showToast(`Cargando ${file.name} (${formatFileSize(file.size)})...`, 'info', 2000);
    await loadSwf(file);
    showToast('¡Listo!', 'success');
  } catch (err) {
    console.error(err);
    showLoadError(err);
    playerSection?.classList.add('hidden');
    dropZone?.classList.remove('hidden');
    destroyPlayer();
  }
}

async function handleFolder(fileList) {
  const dropZone = document.getElementById('drop-zone');
  const playerSection = document.getElementById('player-section');

  dropZone?.classList.add('hidden');
  playerSection?.classList.remove('hidden');

  try {
    showToast('Procesando carpeta de assets...', 'info', 2500);
    let result = await processFileList(fileList);
    result = await ensureBuffers(result);
    await publishAssets(result.files);
    showToast(
      `Cargando ${result.mainFile.name} (${result.count} archivos)...`,
      'info',
      2500
    );
    await loadSwfWithAssets({
      mainFile: result.mainFile,
      mainPath: result.mainPath,
    });
    showToast('¡Listo! Assets cargados', 'success');
  } catch (err) {
    console.error(err);
    showLoadError(err);
    playerSection?.classList.add('hidden');
    dropZone?.classList.remove('hidden');
    destroyPlayer();
  }
}

async function handleZip(file) {
  const dropZone = document.getElementById('drop-zone');
  const playerSection = document.getElementById('player-section');

  dropZone?.classList.add('hidden');
  playerSection?.classList.remove('hidden');

  try {
    showToast(`Extrayendo ${file.name} (${formatFileSize(file.size)})...`, 'info', 3000);
    let result = await processZipFile(file);
    result = await ensureBuffers(result);
    await publishAssets(result.files);
    showToast(
      `Cargando ${result.mainFile.name} (${result.count} archivos del ZIP)...`,
      'info',
      2500
    );
    await loadSwfWithAssets({
      mainFile: result.mainFile,
      mainPath: result.mainPath,
    });
    showToast('¡Listo! ZIP cargado', 'success');
  } catch (err) {
    console.error(err);
    showLoadError(err);
    playerSection?.classList.add('hidden');
    dropZone?.classList.remove('hidden');
    destroyPlayer();
  }
}

function showLoadError(err) {
  const msg = (err?.message || '').toLowerCase();
  let toastMsg;
  if (msg.includes('wasm') || msg.includes('failed to load ruffle')) {
    toastMsg =
      'Error WASM: recarga la página. Si persiste, comprueba la conexión (CDN de Ruffle).';
  } else if (
    msg.includes('service worker') ||
    msg.includes('sw ') ||
    msg.includes('failed to fetch') ||
    msg.includes('__swf_assets__') ||
    msg.includes('no se pudo servir')
  ) {
    toastMsg =
      'Assets no listos. Recarga la página UNA vez y vuelve a abrir el ZIP/carpeta.';
  } else {
    const detail = err?.message ? ` (${err.message.slice(0, 55)})` : '';
    toastMsg = `No se pudo cargar${detail}`;
  }
  showToast(toastMsg, 'error', 6500);
}

/**
 * Lee recursivamente un DirectoryEntry (drag & drop de carpeta)
 */
async function readDirectoryEntry(dirEntry) {
  const files = [];

  async function walk(entry, prefix) {
    if (entry.isFile) {
      const file = await new Promise((res, rej) => entry.file(res, rej));
      // Simular webkitRelativePath
      Object.defineProperty(file, 'webkitRelativePath', {
        value: prefix ? `${prefix}/${entry.name}` : entry.name,
      });
      files.push(file);
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await readAllEntries(reader);
      for (const child of entries) {
        await walk(child, prefix ? `${prefix}/${entry.name}` : entry.name);
      }
    }
  }

  await walk(dirEntry, '');
  return files;
}

function readAllEntries(reader) {
  return new Promise((resolve, reject) => {
    const all = [];
    function next() {
      reader.readEntries((batch) => {
        if (!batch.length) resolve(all);
        else {
          all.push(...batch);
          next();
        }
      }, reject);
    }
    next();
  });
}
