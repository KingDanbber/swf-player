/**
 * Utilidades generales
 */

export function showToast(message, type = 'info', duration = 3200) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');

  // Trigger reflow for animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 300);
  }, duration);
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function isSwfFile(file) {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return name.endsWith('.swf') || file.type === 'application/x-shockwave-flash';
}
