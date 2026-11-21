// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos;
// ?shot=cover shows the cover alone, filling the viewport.
//   photo / photo2 / photo3 / photo4 — sample names (samples/<name>.jpg)
//   caption, subtitle — the words
//   preset — sunset | neon | vice | mono
//   size — 1080x1080 | 1080x1350 | 1920x1080
// window.__shotReady is set once the scene is painted.
export async function runShot(shot, query, setup) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photos = ['photo', 'photo2', 'photo3', 'photo4']
    .map((k) => query.get(k))
    .filter(Boolean)
    .map((name) => `samples/${name}.jpg`);
  await setup({
    photos: photos.length ? photos : ['samples/pier.jpg', 'samples/boulevard.jpg'],
    caption: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'Leonida · 2026',
    preset: query.get('preset') ?? 'sunset',
    size: query.get('size') ?? '1080x1080',
  });
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
