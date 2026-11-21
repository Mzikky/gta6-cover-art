// The cover renderer: a Vice City sky, synthwave sun, skyline and palms, then the
// photo panels in their diagonal poster layout, the bold outlined caption, and a
// film finish (grade, grain, vignette). Every draw is deterministic for a given state,
// so the preview and the exported PNG match exactly.

import { panelLayout, titleZone } from './panels.js';
import { drawSky, drawSynthwaveSun, drawSkyline, drawPalm, drawBirds, drawGrain, drawVignette } from './art.js';

/** Colour grades. Each preset owns its sky, sun, silhouette, grade wash and lettering. */
export const PRESETS = {
  sunset: {
    label: 'Sunset',
    sky: [[0, '#1b0f3b'], [0.45, '#7c2d6e'], [0.75, '#e85d75'], [1, '#ff9a3d']],
    sunCore: '#ffe66d',
    sunGlow: '#ff5e78',
    silhouette: '#160a2e',
    window: '#ffd166',
    photoFilter: 'saturate(1.3) contrast(1.08) brightness(1.02)',
    grade: 'rgba(255,110,60,0.16)',
    gradeMode: 'overlay',
    captionFill: '#ffffff',
    captionStroke: '#160a2e',
    captionGlow: 'rgba(255,94,120,0.85)',
    accent: '#ffd166',
    border: '#ffffff',
  },
  neon: {
    label: 'Neon Nights',
    sky: [[0, '#04041a'], [0.5, '#0d1040'], [0.8, '#3b0f54'], [1, '#5c1668']],
    sunCore: '#00f5d4',
    sunGlow: '#ff2e88',
    silhouette: '#05051a',
    window: '#00f5d4',
    photoFilter: 'saturate(1.45) contrast(1.12) hue-rotate(-8deg)',
    grade: 'rgba(0,245,212,0.10)',
    gradeMode: 'screen',
    captionFill: '#ffffff',
    captionStroke: '#05051a',
    captionGlow: 'rgba(255,46,136,0.9)',
    accent: '#00f5d4',
    border: '#f2f2ff',
  },
  vice: {
    label: 'Vice',
    sky: [[0, '#0f766e'], [0.45, '#2a9d8f'], [0.75, '#ff6b9d'], [1, '#ffb703']],
    sunCore: '#fff3b0',
    sunGlow: '#ff6b9d',
    silhouette: '#123332',
    window: '#fff3b0',
    photoFilter: 'saturate(1.15) contrast(1.06) brightness(1.03)',
    grade: 'rgba(255,183,3,0.12)',
    gradeMode: 'soft-light',
    captionFill: '#ffffff',
    captionStroke: '#123332',
    captionGlow: 'rgba(255,107,157,0.8)',
    accent: '#fff3b0',
    border: '#ffffff',
  },
  mono: {
    label: 'Mono',
    sky: [[0, '#0a0a0a'], [0.5, '#3a3a3a'], [0.8, '#8a8a8a'], [1, '#d9d9d9']],
    sunCore: '#ffffff',
    sunGlow: '#bbbbbb',
    silhouette: '#000000',
    window: '#ffffff',
    photoFilter: 'grayscale(1) contrast(1.18) brightness(1.06)',
    grade: 'rgba(255,255,255,0.06)',
    gradeMode: 'overlay',
    captionFill: '#ffffff',
    captionStroke: '#000000',
    captionGlow: 'rgba(0,0,0,0.9)',
    accent: '#ffffff',
    border: '#ffffff',
  },
};

export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

const CAPTION_FONT = '"Arial Narrow","Liberation Sans Narrow","Helvetica Neue Condensed",Impact,"Franklin Gothic Medium",sans-serif';
const SUBTITLE_FONT = '"Helvetica Neue",Arial,"Liberation Sans",sans-serif';

/**
 * Draws one photo cover-filling a panel, honouring its pan/zoom transform.
 * t = { dx, dy } in fractions of the panel, zoom >= 1.
 */
function drawPanelPhoto(ctx, img, p, t) {
  const scale = Math.max(p.w / img.naturalWidth, p.h / img.naturalHeight) * t.zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  // Clamp the pan so the photo still covers the whole panel.
  const maxDx = Math.max(0, (pw - p.w) / 2 / p.w);
  const maxDy = Math.max(0, (ph - p.h) / 2 / p.h);
  const dx = Math.max(-maxDx, Math.min(maxDx, t.dx));
  const dy = Math.max(-maxDy, Math.min(maxDy, t.dy));
  ctx.drawImage(img, p.x + (p.w - pw) / 2 + dx * p.w, p.y + (p.h - ph) / 2 + dy * p.h, pw, ph);
}

/** An empty panel: dark glass with a dashed frame and an invitation to add a photo. */
function drawEmptyPanel(ctx, p, accent, border) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 6, 24, 0.55)';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.setLineDash([p.w * 0.02, p.w * 0.014]);
  ctx.lineWidth = Math.max(2, p.w * 0.006);
  ctx.strokeStyle = accent;
  ctx.strokeRect(p.x + p.w * 0.03, p.y + p.h * 0.04, p.w * 0.94, p.h * 0.92);
  ctx.setLineDash([]);
  ctx.fillStyle = border;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.min(p.w, p.h) * 0.16}px ${SUBTITLE_FONT}`;
  ctx.fillText('+ ADD PHOTO', p.x + p.w / 2, p.y + p.h / 2);
  ctx.restore();
}

/**
 * Bold condensed poster lettering: a thick outline, a bright fill, a coloured glow
 * and a hard offset shadow, tilted a touch like a printed cover.
 */
function drawCaption(ctx, zone, caption, subtitle, preset) {
  const { w, h } = zone;
  const text = caption.trim().toUpperCase();
  if (!text) return;
  const cx = zone.x + w / 2;
  const cy = zone.y + h * 0.42;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-1.5 * Math.PI) / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = w * 0.105;
  ctx.font = `900 ${size}px ${CAPTION_FONT}`;
  while (ctx.measureText(text).width > w * 0.92 && size > 18) {
    size -= 2;
    ctx.font = `900 ${size}px ${CAPTION_FONT}`;
  }
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetX = size * 0.05;
  ctx.shadowOffsetY = size * 0.06;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = size * 0.17;
  ctx.strokeStyle = preset.captionStroke;
  ctx.strokeText(text, 0, 0);
  ctx.shadowColor = preset.captionGlow;
  ctx.shadowBlur = size * 0.28;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = preset.captionFill;
  ctx.fillText(text, 0, 0);
  ctx.restore();

  const sub = subtitle.trim().toUpperCase();
  if (!sub) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const subSize = Math.max(14, size * 0.26);
  ctx.font = `700 ${subSize}px ${SUBTITLE_FONT}`;
  try { ctx.letterSpacing = `${subSize * 0.35}px`; } catch { /* older canvas: ignore */ }
  const subY = zone.y + h * 0.42 + size * 0.72;
  const tw = ctx.measureText(sub).width;
  const ruleY = subY;
  const ruleLen = Math.min(w * 0.18, (w - tw) / 2 - w * 0.05);
  ctx.strokeStyle = preset.accent;
  ctx.lineWidth = Math.max(2, subSize * 0.12);
  if (ruleLen > 10) {
    ctx.beginPath();
    ctx.moveTo(cx - tw / 2 - ruleLen - w * 0.02, ruleY);
    ctx.lineTo(cx - tw / 2 - w * 0.02, ruleY);
    ctx.moveTo(cx + tw / 2 + w * 0.02, ruleY);
    ctx.lineTo(cx + tw / 2 + ruleLen + w * 0.02, ruleY);
    ctx.stroke();
  }
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = subSize * 0.3;
  ctx.fillStyle = preset.accent;
  ctx.fillText(sub, cx, subY);
  ctx.restore();
}

/**
 * Draws the whole cover onto `canvas` (at the canvas's own pixel size).
 * state = { photos: (image|null)[], transforms: {dx,dy,zoom}[], caption, subtitle, preset }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const preset = PRESETS[state.preset] ?? PRESETS.sunset;
  const filled = state.photos.map((img, i) => ({ img, i })).filter((s) => s.img);
  const count = Math.max(filled.length, 1);

  // 1. Sky, sun, skyline, palms, birds. On a wide cover the sun rises high so it
  // shows above the panels; on square and portrait covers it sits in the open sky.
  drawSky(ctx, w, h, preset.sky);
  const wide = w / h > 1.2;
  const sunR = Math.min(w, h) * (wide ? 0.19 : 0.16);
  drawSynthwaveSun(ctx, w * (wide ? 0.72 : 0.78), h * (wide ? 0.1 : 0.2), sunR, preset.sunCore, preset.sunGlow);
  drawBirds(ctx, w, h, preset.silhouette, 7);
  const horizon = h * 0.66;
  drawSkyline(ctx, w, horizon, preset.silhouette, 42, preset.window);
  drawPalm(ctx, w * 0.03, h * 0.99, h * 0.22, preset.silhouette, 0.22);
  drawPalm(ctx, w * 0.97, h * 1.0, h * 0.19, preset.silhouette, -0.18);

  // 2. Photo panels, in poster order (later panels overlap earlier ones).
  const panels = panelLayout(count, w, h);
  const borderW = Math.max(3, Math.min(w, h) * 0.008);
  filled.forEach(({ img, i }, order) => {
    const p = panels[order];
    const t = state.transforms[i] ?? { dx: 0, dy: 0, zoom: 1 };
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.translate(-p.w / 2, -p.h / 2);
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = Math.min(w, h) * 0.02;
    ctx.shadowOffsetY = Math.min(w, h) * 0.008;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, p.w, p.h);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    ctx.rect(borderW / 2, borderW / 2, p.w - borderW, p.h - borderW);
    ctx.clip();
    ctx.filter = preset.photoFilter;
    drawPanelPhoto(ctx, img, { x: 0, y: 0, w: p.w, h: p.h }, t);
    ctx.filter = 'none';
    ctx.restore();
    // Border on top, outside the clip.
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.lineWidth = borderW;
    ctx.strokeStyle = preset.border;
    ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  });
  // With no photo at all, the first panel stays an invitation.
  if (filled.length === 0) {
    const p = panels[0];
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.translate(-p.w / 2, -p.h / 2);
    drawEmptyPanel(ctx, { x: 0, y: 0, w: p.w, h: p.h }, preset.accent, preset.border);
    ctx.restore();
  }

  // 3. Grade wash over everything, then the caption.
  ctx.save();
  ctx.globalCompositeOperation = preset.gradeMode;
  ctx.fillStyle = preset.grade;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  drawCaption(ctx, titleZone(w, h), state.caption, state.subtitle, preset);

  // 4. Film finish.
  drawGrain(ctx, w, h, 20261121, 0.05);
  drawVignette(ctx, w, h, 0.3);
}
