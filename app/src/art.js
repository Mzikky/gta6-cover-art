// Hand-drawn cover art: gradient skies, a striped synthwave sun, a city skyline,
// palm silhouettes, birds, film grain and a vignette. Everything is drawn with canvas
// paths, so the app needs no image assets of its own.

/** Deterministic PRNG (mulberry32) so a cover renders identically every time. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Vertical gradient sky from the preset's colour stops. */
export function drawSky(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Synthwave sun: a glowing disc cut by widening horizontal slats toward its foot. */
export function drawSynthwaveSun(ctx, cx, cy, r, core, glow) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = r * 0.45;
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, core);
  g.addColorStop(1, glow);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Slats: erase widening bands across the lower half of the disc.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalCompositeOperation = 'destination-out';
  let y = cy + r * 0.08;
  let gap = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap + r * 0.09;
    gap *= 1.45;
  }
  ctx.restore();
}

/** City skyline silhouette along `baseline`, with a few lit windows. Deterministic. */
export function drawSkyline(ctx, w, baseline, color, seed, windowColor) {
  const rand = seededRandom(seed);
  ctx.fillStyle = color;
  let x = -w * 0.02;
  while (x < w * 1.02) {
    const bw = w * (0.03 + rand() * 0.05);
    const bh = baseline * (0.1 + rand() * 0.22);
    const top = baseline - bh;
    ctx.fillRect(x, top, bw, bh);
    // Rooftop antenna on some towers.
    if (rand() > 0.6) ctx.fillRect(x + bw * 0.45, top - bh * 0.18, bw * 0.08, bh * 0.18);
    // Lit windows.
    ctx.fillStyle = windowColor;
    const cols = Math.floor(bw / (w * 0.012));
    const rows = Math.floor(bh / (baseline * 0.045));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rand() > 0.72) {
          ctx.fillRect(x + w * 0.006 + c * w * 0.012, top + baseline * 0.02 + r * baseline * 0.045, w * 0.005, baseline * 0.018);
        }
      }
    }
    ctx.fillStyle = color;
    x += bw + w * (0.004 + rand() * 0.012);
  }
  ctx.fillRect(0, baseline, w, 4);
}

/** A palm silhouette: a leaning trunk and seven drooping fronds. */
export function drawPalm(ctx, x, y, s, color, lean = 0.15) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: a leaning curve, thicker at the foot.
  ctx.lineWidth = s * 0.075;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * lean, -s * 0.55, s * lean * 1.6, -s);
  ctx.stroke();
  const topX = s * lean * 1.6;
  const topY = -s;
  // Fronds: seven arcs fanning out, drooping at the tips.
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.08 + (i / 6) * 0.84);
    const len = s * (0.52 + 0.2 * Math.sin((i / 6) * Math.PI));
    const ex = topX + Math.cos(a) * len;
    const ey = topY - Math.sin(a) * len * 0.55 + len * 0.28;
    const mx = topX + Math.cos(a) * len * 0.55;
    const my = topY - Math.sin(a) * len * 0.75;
    ctx.lineWidth = s * 0.035;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(topX - s * 0.03, topY + s * 0.02, s * 0.035, 0, Math.PI * 2);
  ctx.arc(topX + s * 0.04, topY + s * 0.03, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A few distant birds: small double-arc strokes. */
export function drawBirds(ctx, w, h, color, seed) {
  const rand = seededRandom(seed);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, w * 0.0016);
  ctx.lineCap = 'round';
  const n = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const x = w * (0.08 + rand() * 0.8);
    const y = h * (0.06 + rand() * 0.22);
    const s = w * (0.012 + rand() * 0.01);
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.7, x, y);
    ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.7, x + s, y);
    ctx.stroke();
  }
}

/** Film grain: seeded specks over the whole frame. */
export function drawGrain(ctx, w, h, seed, amount = 0.05) {
  const rand = seededRandom(seed);
  const count = Math.floor((w * h) / 900);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const v = rand();
    ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${amount * rand()})` : `rgba(0,0,0,${amount * rand()})`;
    ctx.fillRect(rand() * w, rand() * h, 1.6, 1.6);
  }
  ctx.restore();
}

/** Vignette: darkened corners that pull the eye to the middle. */
export function drawVignette(ctx, w, h, strength = 0.32) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
