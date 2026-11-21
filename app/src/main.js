// Wires the editor: photo slots (picker + drag & drop), caption, presets, export
// sizes, per-panel crop (drag the photo, zoom slider) and PNG export. The two sample
// photos load on start, so the app opens with a finished cover and the fastest path
// from a photo to a PNG is: type a caption, hit Export.
import { drawCover, PRESETS, EXPORT_SIZES } from './cover.js';
import { panelLayout, pointInPanel } from './panels.js';
import { runShot } from './shots.js';

const MAX_PHOTOS = 4;
/** Fresh crop: photos sit a touch low in their panel, so faces (usually in the
 *  photo's upper half) survive the cover-fit crop. */
const DEFAULT_TRANSFORM = () => ({ dx: 0, dy: 0.08, zoom: 1 });
const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const status = document.getElementById('status');
const zoomInput = document.getElementById('zoom');
const zoomLabel = document.getElementById('zoom-label');

const state = {
  photos: [null, null, null, null],
  transforms: Array.from({ length: MAX_PHOTOS }, DEFAULT_TRANSFORM),
  activeSlot: 0,
  caption: 'Sunset Heist',
  subtitle: 'Leonida · 2026',
  preset: 'sunset',
  size: EXPORT_SIZES[0],
};

function filledCount() {
  return state.photos.filter(Boolean).length;
}

function redraw() {
  drawCover(canvas, state);
  renderSlots();
}

function applySize(size) {
  state.size = size;
  canvas.width = size.w;
  canvas.height = size.h;
  canvas.style.aspectRatio = `${size.w} / ${size.h}`;
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === size.id));
  redraw();
}

function applyPreset(name) {
  state.preset = name;
  document.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('active', b.dataset.preset === name));
  redraw();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function setSlotPhoto(slot, fileOrUrl) {
  const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
  try {
    state.photos[slot] = await loadImage(url);
    state.transforms[slot] = DEFAULT_TRANSFORM();
    state.activeSlot = slot;
    syncZoomControl();
    redraw();
  } catch {
    status.textContent = 'That photo could not be loaded.';
  }
}

function clearSlot(slot) {
  state.photos[slot] = null;
  state.transforms[slot] = DEFAULT_TRANSFORM();
  redraw();
}

/** Photo slots row: thumbnails of loaded photos, "+" for empty slots, × to remove. */
function renderSlots() {
  const row = document.getElementById('slots');
  row.innerHTML = '';
  state.photos.forEach((img, slot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `slot${img ? ' filled' : ''}${slot === state.activeSlot ? ' active' : ''}`;
    button.title = img ? `Panel ${slot + 1}: click to select, × to remove` : `Panel ${slot + 1}: add a photo`;
    if (img) {
      const thumb = document.createElement('canvas');
      const scale = 96 / Math.max(img.naturalWidth, img.naturalHeight);
      thumb.width = Math.max(1, Math.round(img.naturalWidth * scale));
      thumb.height = Math.max(1, Math.round(img.naturalHeight * scale));
      thumb.getContext('2d').drawImage(img, 0, 0, thumb.width, thumb.height);
      button.appendChild(thumb);
      const remove = document.createElement('span');
      remove.className = 'slot-remove';
      remove.textContent = '×';
      remove.addEventListener('click', (e) => {
        e.stopPropagation();
        clearSlot(slot);
      });
      button.appendChild(remove);
    } else {
      button.textContent = '+';
    }
    button.addEventListener('click', () => {
      state.activeSlot = slot;
      syncZoomControl();
      if (!img) openPicker(slot);
      redraw();
    });
    row.appendChild(button);
  });
}

const picker = document.getElementById('picker');
let pickerSlot = 0;
function openPicker(slot) {
  pickerSlot = slot;
  picker.value = '';
  picker.click();
}
picker.addEventListener('change', () => {
  const file = picker.files[0];
  if (file) setSlotPhoto(pickerSlot, file);
});

// Drag & drop anywhere on the page: fills the first empty slot (or the active one).
let dragDepth = 0;
document.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragDepth += 1;
  document.body.classList.add('dragging');
});
document.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) document.body.classList.remove('dragging');
});
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('dragging');
  const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
  files.slice(0, MAX_PHOTOS).forEach((file) => {
    const slot = state.photos.findIndex((p) => !p);
    setSlotPhoto(slot === -1 ? state.activeSlot : slot, file);
  });
  if (files.length) status.textContent = `${files.length} photo${files.length > 1 ? 's' : ''} added.`;
});

// Drag a photo inside its panel to reposition it; click a panel to select it.
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
function panelAt(point) {
  const filled = state.photos.map((img, i) => ({ img, i })).filter((s) => s.img);
  const panels = panelLayout(Math.max(filled.length, 1), canvas.width, canvas.height);
  for (let order = panels.length - 1; order >= 0; order--) {
    if (filled[order] && pointInPanel(point.x, point.y, panels[order])) return filled[order].i;
  }
  return -1;
}
canvas.addEventListener('pointerdown', (e) => {
  const point = canvasPoint(e);
  const slot = panelAt(point);
  if (slot === -1) return;
  state.activeSlot = slot;
  syncZoomControl();
  const t = state.transforms[slot];
  drag = { slot, startX: point.x, startY: point.y, dx: t.dx, dy: t.dy };
  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = 'grabbing';
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const point = canvasPoint(e);
  const t = state.transforms[drag.slot];
  t.dx = drag.dx + (point.x - drag.startX) / canvas.width;
  t.dy = drag.dy + (point.y - drag.startY) / canvas.height;
  redraw();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
  canvas.style.cursor = 'grab';
});
canvas.style.cursor = 'grab';

// Zoom slider for the active panel's photo.
function syncZoomControl() {
  const t = state.transforms[state.activeSlot];
  zoomInput.value = t.zoom;
  zoomLabel.textContent = `${t.zoom.toFixed(1)}×`;
}
zoomInput.addEventListener('input', () => {
  state.transforms[state.activeSlot].zoom = Number(zoomInput.value);
  syncZoomControl();
  redraw();
});
document.getElementById('reset-crop').addEventListener('click', () => {
  state.transforms[state.activeSlot] = DEFAULT_TRANSFORM();
  syncZoomControl();
  redraw();
});

// Text, presets, sizes.
captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});
document.querySelectorAll('[data-preset]').forEach((b) => {
  b.addEventListener('click', () => applyPreset(b.dataset.preset));
});
document.querySelectorAll('[data-size]').forEach((b) => {
  b.addEventListener('click', () => {
    const size = EXPORT_SIZES.find((s) => s.id === b.dataset.size);
    if (size) applySize(size);
  });
});

// Export: the preview canvas already is the export render at full size.
document.getElementById('export').addEventListener('click', () => {
  redraw();
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed in this browser.';
      return;
    }
    const name = `vice-cover-${state.size.id}.png`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved ${name}`;
  }, 'image/png');
});

// Boot: sample photos in, then either the shot scene or the live editor.
async function boot() {
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, async (scene) => {
      for (let i = 0; i < scene.photos.length && i < MAX_PHOTOS; i++) {
        state.photos[i] = await loadImage(scene.photos[i]);
      }
      state.caption = scene.caption;
      state.subtitle = scene.subtitle;
      captionInput.value = scene.caption;
      subtitleInput.value = scene.subtitle;
      applyPreset(scene.preset);
      const size = EXPORT_SIZES.find((s) => s.id === scene.size) ?? EXPORT_SIZES[0];
      applySize(size);
    });
    return;
  }
  try {
    state.photos[0] = await loadImage('samples/pier.jpg');
    state.photos[1] = await loadImage('samples/boulevard.jpg');
  } catch {
    status.textContent = 'Sample photos failed to load — add your own below.';
  }
  applyPreset('sunset');
  applySize(EXPORT_SIZES[0]);
  syncZoomControl();
  redraw();
}

boot();
