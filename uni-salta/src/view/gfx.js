// Procedural pixel textures: dithered skies, sunlight, streaks, particles, rainbow gate.
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export const SKY_H = 540;
export const RAMP_H = 420;

function canvasTex(scene, key, w, h) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const t = scene.textures.createCanvas(key, w, h);
  return { t, ctx: t.getContext() };
}

function putImage(ctx, w, h, fn) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = fn(x, y);
    if (!c) continue;
    const i = (y * w + x) * 4;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3] ?? 255;
  }
  ctx.putImageData(img, 0, 0);
}

export function makeSky(scene, key, stops) {
  const cols = stops.map(hexRgb);
  const w = 64, h = SKY_H;
  const { t, ctx } = canvasTex(scene, key, w, h);
  const seg = cols.length - 1;
  putImage(ctx, w, h, (x, y) => {
    const f = Math.min(1, y / RAMP_H) * seg;
    const i = Math.min(seg - 1, Math.floor(f));
    const frac = f - i;
    const th = (BAYER[y & 3][x & 3] + 0.5) / 16;
    return frac > th ? cols[i + 1] : cols[i];
  });
  t.refresh();
}

export function makeGlow(scene, key, color, strength) {
  const w = 72, h = SKY_H;
  const c = hexRgb(color);
  const { t, ctx } = canvasTex(scene, key, w, h);
  putImage(ctx, w, h, (x, y) => {
    const a = Math.pow(x / (w - 1), 2.2) * strength * (0.75 + 0.25 * Math.sin(y * 0.03));
    const th = (BAYER[y & 3][x & 3] + 0.5) / 16;
    return a > th ? [c[0], c[1], c[2], 255] : null;
  });
  t.refresh();
}

// diagonal scribble streaks like Sophie's sky
export function makeStreaks(scene, key, color, seed = 7) {
  const w = 256, h = 256;
  const c = hexRgb(color);
  const { t, ctx } = canvasTex(scene, key, w, h);
  let a = seed;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const img = ctx.createImageData(w, h);
  const set = (x, y) => { x = ((x % w) + w) % w; y = ((y % h) + h) % h; const i = (y * w + x) * 4; img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 95; };
  for (let k = 0; k < 46; k++) {
    const x0 = Math.floor(rnd() * w), y0 = Math.floor(rnd() * h);
    const len = 26 + Math.floor(rnd() * 56), thick = 3 + Math.floor(rnd() * 4);
    for (let i = 0; i < len; i++) {
      const wob = Math.floor(Math.sin(i * 0.2 + k) * 1.2);
      for (let j = 0; j < thick; j++) { set(x0 + i * 2, y0 + i + j + wob); set(x0 + i * 2 + 1, y0 + i + j + wob); }
    }
  }
  ctx.putImageData(img, 0, 0);
  t.refresh();
}

const SHAPES = {
  px_star: ['...X...', '..XXX..', 'XXXXXXX', '.XXXXX.', '.XX.XX.', 'XX...XX'],
  px_spark: ['..X..', '..X..', 'XXXXX', '..X..', '..X..'],
  px_dot3: ['XXX', 'XXX', 'XXX'],
  px_dot2: ['XX', 'XX'],
  px_puff: ['..XXXX..', '.XXXXXX.', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..'],
  px_ring: ['..XXXX..', '.X....X.', 'X......X', 'X......X', 'X......X', 'X......X', '.X....X.', '..XXXX..'],
  px_heart: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  px_drop: ['.X.', 'XXX', 'XXX', '.X.'],
  px_line: ['XXXXXXXXXXXX'],
  px_bubble: ['.XX.', 'X..X', 'X..X', '.XX.'],
  px_zig: ['...XX', '..XX.', '.XX..', 'XXXXX', '..XX.', '.XX..', 'XX...'],
};

export function makeParticles(scene) {
  for (const [key, rows] of Object.entries(SHAPES)) {
    const w = rows[0].length, h = rows.length;
    const { t, ctx } = canvasTex(scene, key, w, h);
    putImage(ctx, w, h, (x, y) => (rows[y][x] === 'X' ? [255, 255, 255, 255] : null));
    t.refresh();
  }
}

export const RAINBOW = ['#FF4D5E', '#FF9A3C', '#FFE23A', '#5CD66A', '#4DA6FF', '#9D6BFF'];

// rainbow arch used as the world gate (player runs under it)
export function makeGate(scene, key, w = 420, h = 330, band = 11) {
  const { t, ctx } = canvasTex(scene, key, w, h);
  const cx = w / 2, cy = h - 1, R = Math.floor(w / 2) - 2;
  const cols = RAINBOW.map(hexRgb);
  putImage(ctx, w, h, (x, y) => {
    if (y > cy) return null;
    const d = Math.hypot(x - cx, (y - cy) * 1.0);
    const k = Math.floor((R - d) / band);
    if (k < 0 || k >= cols.length) return null;
    const c = cols[k];
    // thin dark rim on the outside and inside edges
    const dd = (R - d) - k * band;
    if (k === 0 && dd < 1) return [30, 19, 48, 255];
    if (k === cols.length - 1 && dd > band - 1.2) return [30, 19, 48, 255];
    return [c[0], c[1], c[2], 255];
  });
  t.refresh();
}

export function makeBolt(scene, key) {
  const w = 24, h = 300;
  const { t, ctx } = canvasTex(scene, key, w, h);
  putImage(ctx, w, h, (x, y) => {
    const seg = Math.floor(y / 30);
    const off = [10, 6, 12, 5, 11, 7, 12, 6, 11, 8][seg % 10];
    const xx = off + Math.floor(((y % 30) / 30) * (((seg % 2) ? -4 : 4)));
    if (Math.abs(x - xx) <= 2) return Math.abs(x - xx) <= 0 ? [255, 255, 255, 255] : [255, 226, 58, 255];
    return null;
  });
  t.refresh();
}
