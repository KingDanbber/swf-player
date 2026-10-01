/**
 * Controles táctiles virtuales → eventos de teclado para Ruffle
 */

const KEY_MAP = {
  up: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  down: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  left: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  a: { key: ' ', code: 'Space', keyCode: 32 }, // Salto / acción principal
  b: { key: 'z', code: 'KeyZ', keyCode: 90 }, // Acción secundaria
  c: { key: 'x', code: 'KeyX', keyCode: 88 },
  enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
  esc: { key: 'Escape', code: 'Escape', keyCode: 27 },
};

/** Teclas actualmente pulsadas (para evitar repetición) */
const pressed = new Set();
let controlsVisible = true;
let controlsEl = null;

function getTarget() {
  // Preferir el elemento ruffle-player si existe
  const player = document.querySelector('#player-container ruffle-player');
  return player || document.querySelector('#player-container') || document.body;
}

function dispatchKey(type, def) {
  const target = getTarget();
  try {
    target.focus?.();
  } catch (_) {}

  const eventInit = {
    key: def.key,
    code: def.code,
    keyCode: def.keyCode,
    which: def.keyCode,
    bubbles: true,
    cancelable: true,
    composed: true,
  };

  // KeyboardEvent clásico
  const ev = new KeyboardEvent(type, eventInit);
  // Algunos emuladores leen estas props de forma no estándar
  try {
    Object.defineProperty(ev, 'keyCode', { get: () => def.keyCode });
    Object.defineProperty(ev, 'which', { get: () => def.keyCode });
  } catch (_) {}

  target.dispatchEvent(ev);
  // También al documento por si Ruffle escucha ahí
  if (target !== document) {
    document.dispatchEvent(new KeyboardEvent(type, eventInit));
  }
  window.dispatchEvent(new KeyboardEvent(type, eventInit));
}

function press(action) {
  const def = KEY_MAP[action];
  if (!def || pressed.has(action)) return;
  pressed.add(action);
  dispatchKey('keydown', def);
}

function release(action) {
  const def = KEY_MAP[action];
  if (!def || !pressed.has(action)) return;
  pressed.delete(action);
  dispatchKey('keyup', def);
}

function releaseAll() {
  for (const action of [...pressed]) {
    release(action);
  }
}

function bindButton(btn) {
  const action = btn.dataset.action;
  if (!action) return;

  const start = (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.classList.add('active');
    press(action);
  };
  const end = (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.classList.remove('active');
    release(action);
  };

  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);
  btn.addEventListener('pointerleave', end);
  // Evitar menú contextual en pulsación larga
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function initControls() {
  controlsEl = document.getElementById('virtual-controls');
  const toggleBtn = document.getElementById('btn-controls');

  if (!controlsEl) return;

  controlsEl.querySelectorAll('[data-action]').forEach(bindButton);

  // Si el dedo sale del pad, soltar todo
  controlsEl.addEventListener('pointerup', releaseAll);
  controlsEl.addEventListener('pointercancel', releaseAll);
  window.addEventListener('blur', releaseAll);

  // Preferencia guardada
  const saved = localStorage.getItem('swf-controls-visible');
  if (saved !== null) {
    controlsVisible = saved === '1';
  } else {
    // Por defecto visibles en táctil
    controlsVisible = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
  applyVisibility();

  toggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    controlsVisible = !controlsVisible;
    localStorage.setItem('swf-controls-visible', controlsVisible ? '1' : '0');
    applyVisibility();
  });
}

function applyVisibility() {
  if (!controlsEl) return;
  controlsEl.classList.toggle('hidden', !controlsVisible);
  const toggleBtn = document.getElementById('btn-controls');
  toggleBtn?.classList.toggle('active', controlsVisible);
  toggleBtn?.setAttribute('aria-pressed', controlsVisible ? 'true' : 'false');
}

export function showControls() {
  if (!controlsEl) return;
  // Mostrar el contenedor de controles solo cuando hay juego
  controlsEl.classList.remove('off');
  applyVisibility();
}

export function hideControls() {
  releaseAll();
  controlsEl?.classList.add('off');
}

export function isControlsVisible() {
  return controlsVisible;
}
