// Multi-panel poster layouts: where each photo sits on the cover, in fractions of the
// canvas (x, y, w, h) plus a slight rotation in degrees, GTA-cover style: panels overlap
// at small angles while the bottom band stays clear for the caption.

/** Aspect class of a canvas size: 'landscape' | 'square' | 'portrait'. */
export function aspectOf(w, h) {
  const r = w / h;
  if (r > 1.2) return 'landscape';
  if (r < 0.9) return 'portrait';
  return 'square';
}

const LAYOUTS = {
  landscape: {
    1: [{ x: 0.05, y: 0.16, w: 0.9, h: 0.5, rot: -1.5 }],
    2: [
      { x: 0.04, y: 0.15, w: 0.5, h: 0.52, rot: -2.5 },
      { x: 0.5, y: 0.18, w: 0.46, h: 0.47, rot: 2 },
    ],
    3: [
      { x: 0.03, y: 0.15, w: 0.36, h: 0.5, rot: -2 },
      { x: 0.37, y: 0.18, w: 0.32, h: 0.45, rot: 1.5 },
      { x: 0.66, y: 0.15, w: 0.31, h: 0.5, rot: -1 },
    ],
    4: [
      { x: 0.04, y: 0.14, w: 0.44, h: 0.26, rot: -2 },
      { x: 0.52, y: 0.14, w: 0.44, h: 0.26, rot: 1.5 },
      { x: 0.04, y: 0.42, w: 0.44, h: 0.25, rot: 1 },
      { x: 0.52, y: 0.42, w: 0.44, h: 0.25, rot: -1.5 },
    ],
  },
  square: {
    1: [{ x: 0.06, y: 0.05, w: 0.88, h: 0.64, rot: -2 }],
    2: [
      { x: 0.05, y: 0.05, w: 0.58, h: 0.6, rot: -3 },
      { x: 0.5, y: 0.14, w: 0.45, h: 0.5, rot: 2.5 },
    ],
    3: [
      { x: 0.05, y: 0.04, w: 0.52, h: 0.48, rot: -2.5 },
      { x: 0.52, y: 0.08, w: 0.43, h: 0.4, rot: 2 },
      { x: 0.1, y: 0.5, w: 0.8, h: 0.23, rot: -1 },
    ],
    4: [
      { x: 0.05, y: 0.05, w: 0.46, h: 0.32, rot: -2 },
      { x: 0.51, y: 0.04, w: 0.44, h: 0.32, rot: 2 },
      { x: 0.04, y: 0.39, w: 0.44, h: 0.32, rot: 1.5 },
      { x: 0.5, y: 0.4, w: 0.46, h: 0.32, rot: -1.5 },
    ],
  },
  portrait: {
    1: [{ x: 0.07, y: 0.04, w: 0.86, h: 0.5, rot: -2 }],
    2: [
      { x: 0.06, y: 0.04, w: 0.6, h: 0.4, rot: -3 },
      { x: 0.44, y: 0.38, w: 0.5, h: 0.34, rot: 2.5 },
    ],
    3: [
      { x: 0.06, y: 0.03, w: 0.55, h: 0.32, rot: -2.5 },
      { x: 0.55, y: 0.06, w: 0.4, h: 0.28, rot: 2 },
      { x: 0.1, y: 0.36, w: 0.8, h: 0.3, rot: -1 },
    ],
    4: [
      { x: 0.06, y: 0.03, w: 0.44, h: 0.27, rot: -2 },
      { x: 0.52, y: 0.03, w: 0.42, h: 0.27, rot: 2 },
      { x: 0.05, y: 0.32, w: 0.44, h: 0.27, rot: 1.5 },
      { x: 0.51, y: 0.33, w: 0.44, h: 0.27, rot: -1.5 },
    ],
  },
};

/**
 * Panel rects for `count` photos on a canvas of `w` x `h`, in canvas pixels:
 * [{ x, y, w, h, rot }] with rot in degrees.
 */
export function panelLayout(count, w, h) {
  const aspect = aspectOf(w, h);
  const defs = LAYOUTS[aspect][Math.max(1, Math.min(4, count))] ?? LAYOUTS[aspect][1];
  return defs.map((d) => ({ x: d.x * w, y: d.y * h, w: d.w * w, h: d.h * h, rot: d.rot }));
}

/** Title zone: the band the caption sits in, in canvas pixels. */
export function titleZone(w, h) {
  const aspect = aspectOf(w, h);
  const top = aspect === 'landscape' ? 0.7 : aspect === 'square' ? 0.74 : 0.7;
  return { x: 0, y: h * top, w, h: h * (1 - top) };
}

/** Inverse-rotation hit test: is canvas point (px, py) inside rotated panel `p`? */
export function pointInPanel(px, py, p) {
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const a = (-p.rot * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  const rx = dx * Math.cos(a) - dy * Math.sin(a);
  const ry = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(rx) <= p.w / 2 && Math.abs(ry) <= p.h / 2;
}
