// Integer-zoom pixel layout. The canvas is W x H internal pixels, shown at an integer zoom.
export const BASE_W = 640, BASE_H = 360;
export const MAX_W = 960, MAX_H = 540;

export function computeLayout(innerW, innerH, dpr) {
  const physW = innerW * dpr, physH = innerH * dpr;
  const zoom = Math.max(1, Math.min(Math.floor(physW / BASE_W), Math.floor(physH / BASE_H)));
  const W = Math.max(BASE_W, Math.min(MAX_W, Math.floor(physW / zoom)));
  const H = Math.max(BASE_H, Math.min(MAX_H, Math.floor(physH / zoom)));
  return { W, H, zoom, cssW: (W * zoom) / dpr, cssH: (H * zoom) / dpr, dpr, portrait: innerH > innerW };
}

export function applyLayout(rootEl, canvas, L) {
  rootEl.style.setProperty('--px', String(L.zoom / L.dpr));
  rootEl.style.setProperty('--W', L.W + 'px');
  rootEl.style.setProperty('--H', L.H + 'px');
  rootEl.style.setProperty('--cw', L.cssW + 'px');
  rootEl.style.setProperty('--ch', L.cssH + 'px');
  if (canvas) {
    canvas.style.width = L.cssW + 'px';
    canvas.style.height = L.cssH + 'px';
  }
  rootEl.classList.toggle('portrait', L.portrait);
}
