import Phaser from 'phaser';

/** Pixel art drawn in code with the master palette (ART_BIBLE section 3). Everything is 1:1 canvas pixels, no smoothing. */
export const PAL = {
  ink: '#2A1B3D', white: '#FFF7EC', cream: '#E6DCCF',
  g1: '#8AD8B4', g2: '#4AA88E', g3: '#2F7F72', g4: '#1F5559',
  p1: '#F2CC93', p2: '#E3B27A', p3: '#C08655', p4: '#8E5A3C',
  w0: '#E8FBFF', w1: '#7FDBF2', w2: '#4CC9E8', w3: '#2E93C9', w4: '#1D5E9C',
  d1: '#D99A5B', d2: '#B9773F', d3: '#8A5230', d4: '#5C3524',
  red: '#FF5E7E', org: '#FFB23F', yel: '#FFE45C', cyn: '#7BE3FF', vio: '#B98CFF',
  m1: '#F2556B', m2: '#B83A55', m3: '#A06BE0',
  s1: '#F3E8D0', s2: '#D9C9A8', s3: '#B8A47E', s4: '#8C7A5C',
};

type Ctx = CanvasRenderingContext2D;
function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void): void {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h)!;
  const c = t.getContext();
  c.imageSmoothingEnabled = false;
  draw(c);
  t.refresh();
}
const r = (c: Ctx, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

/** ASCII sprite: each char maps to a color in `map`; '.' is transparent. */
function ascii(c: Ctx, rows: string[], map: Record<string, string>, ox = 0, oy = 0): void {
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && map[ch]) r(c, map[ch], ox + x, oy + y); }));
}

const STAR = [
  '.....o.....',
  '.....o.....',
  '....ooo....',
  'ooooyyyoooo',
  '.oyyyyyyyo.',
  '..oyyyyyo..',
  '..oyyyyyo..',
  '.oyyooyyyo.',
  '.oyo...oyo.',
  'oo.......oo',
];
const GOLD = STAR.map((s) => s);
const BALL = [
  '..oooo..',
  '.oRRwRo.',
  'oRRRwRRo',
  'oRwwwRRo',
  'oRRRwRRo',
  'oRRwRRRo',
  '.oRRRRo.',
  '..oooo..',
];
const GIFT = [
  '....oooooooo....',
  '...obbbooobbo...',
  '...obobbbbobo...',
  '..oo.oooooo.oo..',
  '.oooooooooooooo.',
  '.orrrrrywyrrrro.',
  '.orrrrrywyrrrro.',
  '.orrrrrywyrrrro.',
  '.oyyyyyywyyyyyo.',
  '.orrrrrywyrrrro.',
  '.orrrrrywyrrrro.',
  '.orrrrrywyrrrro.',
  '.oooooooooooooo.',
];

export function makeProceduralTextures(scene: Phaser.Scene): void {
  canvasTex(scene, 'shadow', 28, 10, (c) => {
    c.fillStyle = 'rgba(42,27,61,0.34)';
    for (let y = 0; y < 10; y++) { const half = Math.round(14 * Math.sqrt(1 - Math.pow((y - 4.5) / 5, 2))); c.fillRect(14 - half, y, half * 2, 1); }
  });
  canvasTex(scene, 'ring', 32, 12, (c) => {
    c.fillStyle = '#ffffff';
    for (let y = 0; y < 12; y++) {
      const t = (y - 5.5) / 5.5, half = Math.round(15.5 * Math.sqrt(Math.max(0, 1 - t * t)));
      const inner = Math.round(13 * Math.sqrt(Math.max(0, 1 - t * t)));
      if (half > 0) { c.fillRect(16 - half, y, half - inner || 1, 1); c.fillRect(16 + inner, y, half - inner || 1, 1); }
      if (y === 0 || y === 11) c.fillRect(16 - half, y, half * 2, 1);
    }
  });
  canvasTex(scene, 'star', 11, 10, (c) => ascii(c, STAR, { o: PAL.d3, y: PAL.yel }));
  canvasTex(scene, 'gold', 11, 10, (c) => ascii(c, GOLD, { o: PAL.d4, y: PAL.org }));
  canvasTex(scene, 'ball', 8, 8, (c) => ascii(c, BALL, { o: PAL.ink, R: PAL.red, w: PAL.white }));
  canvasTex(scene, 'gift', 16, 13, (c) => ascii(c, GIFT, { o: PAL.ink, r: PAL.vio, y: PAL.yel, w: PAL.white, b: PAL.red }));
  canvasTex(scene, 'gift_open', 16, 13, (c) => ascii(c, GIFT.map((row, i) => (i < 4 ? '................' : row)), { o: PAL.ink, r: PAL.vio, y: PAL.yel, w: PAL.white, b: PAL.red }));
  // mushroom bounce pad, two frames (normal and squashed)
  for (const sq of [0, 1]) {
    canvasTex(scene, `hongo${sq}`, 24, 18, (c) => {
      const top = sq ? 7 : 3;
      r(c, PAL.ink, 8, top + 8, 8, 8 - (sq ? 0 : 0)); r(c, PAL.cream, 9, top + 8, 6, 7); r(c, PAL.s2, 9, top + 13, 6, 2);
      for (let y = 0; y < 8; y++) { const half = [4, 7, 9, 10, 11, 11, 11, 10][y]; r(c, PAL.ink, 12 - half - 1, top + y, half * 2 + 2, 1); }
      for (let y = 0; y < 8; y++) { const half = [4, 7, 9, 10, 11, 11, 11, 10][y]; r(c, y < 5 ? PAL.m1 : PAL.m2, 12 - half, top + y, half * 2, 1); }
      for (const [x, y] of [[8, 2], [14, 1], [11, 4], [17, 4], [5, 5]]) r(c, PAL.white, x, top + y, 2, 2);
      r(c, PAL.ink, 1, top + 7, 22, 1);
    });
  }
  canvasTex(scene, 'bubble', 40, 40, (c) => {
    c.imageSmoothingEnabled = false;
    for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
      const d = Math.hypot(x - 19.5, y - 19.5);
      if (d < 19.5 && d > 17) { c.fillStyle = 'rgba(232,251,255,0.9)'; c.fillRect(x, y, 1, 1); }
      else if (d <= 17) { c.fillStyle = 'rgba(127,219,242,0.22)'; c.fillRect(x, y, 1, 1); }
    }
    r(c, 'rgba(255,255,255,0.95)', 10, 8, 6, 2); r(c, 'rgba(255,255,255,0.95)', 8, 10, 2, 5);
  });
  canvasTex(scene, 'dot', 2, 2, (c) => r(c, '#ffffff', 0, 0, 2, 2));
  canvasTex(scene, 'dust', 6, 6, (c) => { r(c, PAL.p1, 1, 0, 4, 6); r(c, PAL.p1, 0, 1, 6, 4); r(c, PAL.p2, 1, 4, 4, 1); });
  canvasTex(scene, 'drop', 3, 4, (c) => { r(c, PAL.w1, 1, 0, 1, 1); r(c, PAL.w0, 0, 1, 3, 2); r(c, PAL.w2, 1, 3, 1, 1); });
  canvasTex(scene, 'spark', 5, 5, (c) => { r(c, '#ffffff', 2, 0, 1, 5); r(c, '#ffffff', 0, 2, 5, 1); r(c, PAL.yel, 2, 2, 1, 1); });
  canvasTex(scene, 'confetti', 3, 3, (c) => r(c, '#ffffff', 0, 0, 3, 3));
  canvasTex(scene, 'flagpole', 3, 40, (c) => { r(c, PAL.ink, 0, 0, 3, 40); r(c, PAL.cream, 1, 1, 1, 38); });
  canvasTex(scene, 'arrow', 12, 10, (c) => { for (let y = 0; y < 10; y++) { const w = 12 - y * 2 + (y % 2); r(c, PAL.ink, 6 - Math.ceil(w / 2) - 1, y, w + 2, 1); } for (let y = 1; y < 8; y++) { const w = 12 - y * 2 - 2; if (w > 0) r(c, '#ffffff', 6 - Math.floor(w / 2), y, w, 1); } });
  canvasTex(scene, 'target', 24, 30, (c) => {
    r(c, PAL.d3, 11, 14, 3, 16); r(c, PAL.d4, 12, 14, 1, 16);
    for (let y = 0; y < 14; y++) for (let x = 0; x < 24; x++) {
      const d = Math.hypot(x - 11.5, y - 7);
      if (d < 7.5) { c.fillStyle = d < 2.4 ? PAL.red : d < 4.7 ? PAL.white : d < 6.5 ? PAL.red : PAL.ink; c.fillRect(x, y, 1, 1); }
    }
  });
  canvasTex(scene, 'basket', 22, 16, (c) => { r(c, PAL.ink, 0, 2, 22, 14); r(c, PAL.d2, 1, 3, 20, 12); for (let x = 3; x < 20; x += 4) r(c, PAL.d3, x, 3, 1, 12); r(c, PAL.d1, 1, 3, 20, 2); r(c, PAL.d3, 1, 9, 20, 1); });
}

export type BlockStyle = { top: string; top2: string; front: string; front2: string; edge: string };
const STYLE: Record<string, BlockStyle> = {
  plataforma: { top: PAL.g2, top2: PAL.g1, front: PAL.p3, front2: PAL.p4, edge: PAL.ink },
  seta: { top: PAL.m1, top2: PAL.white, front: PAL.cream, front2: PAL.s2, edge: PAL.ink },
  heno: { top: PAL.yel, top2: PAL.org, front: PAL.org, front2: PAL.p3, edge: PAL.ink },
  caja: { top: PAL.d1, top2: PAL.d2, front: PAL.d2, front2: PAL.d3, edge: PAL.ink },
  nube: { top: PAL.white, top2: PAL.w0, front: PAL.w0, front2: PAL.w1, edge: PAL.w3 },
  piedra: { top: PAL.s2, top2: PAL.s1, front: PAL.s3, front2: PAL.s4, edge: PAL.ink },
  pasarela: { top: PAL.d1, top2: PAL.d2, front: PAL.d2, front2: PAL.d4, edge: PAL.ink },
  valla: { top: PAL.d1, top2: PAL.d2, front: PAL.d2, front2: PAL.d4, edge: PAL.ink },
  tronco: { top: PAL.d2, top2: PAL.d1, front: PAL.d3, front2: PAL.d4, edge: PAL.ink },
  parachoques: { top: PAL.m1, top2: PAL.white, front: PAL.m2, front2: PAL.m3, edge: PAL.ink },
  puente: { top: PAL.d1, top2: PAL.d2, front: PAL.d2, front2: PAL.d3, edge: PAL.ink },
  default: { top: PAL.s2, top2: PAL.s1, front: PAL.s3, front2: PAL.s4, edge: PAL.ink },
};

/** A block seen from the side-front, split in two images so actors can stand on the top face and hide behind the front face. */
export function blockTextures(scene: Phaser.Scene, kind: string, w: number, h: number, alto: number): { top: string; front: string } {
  const st = STYLE[kind] ?? STYLE.default;
  const kt = `blkT_${kind}_${w}_${h}`, kf = `blkF_${kind}_${w}_${alto}`;
  canvasTex(scene, kt, w, h, (c) => {
    r(c, st.top, 0, 0, w, h);
    if (kind === 'pasarela' || kind === 'puente') {
      // planks running along x, a gap line between planks
      for (let y = 5; y < h; y += 6) r(c, PAL.d3, 0, y, w, 1);
      for (let y = 0; y < h; y += 6) for (let x = 3 + ((y / 6) % 2) * 9; x < w; x += 22) r(c, PAL.d3, x, y, 1, 5);
      for (let y = 1; y < h; y += 6) r(c, PAL.p1, 0, y, w, 1);
    } else if (kind === 'caja') {
      r(c, st.top2, 2, 2, w - 4, h - 4);
      r(c, st.front2, 2, Math.floor(h / 2), w - 4, 1);
      r(c, st.front2, Math.floor(w / 2), 2, 1, h - 4);
    } else if (kind === 'heno') {
      for (let y = 1; y < h; y += 3) r(c, st.top2, 0, y, w, 1);
      for (let x = 2; x < w; x += 7) r(c, PAL.p2, x, 0, 1, h);
    } else {
      for (let x = 0; x < w; x += 3) r(c, st.top2, x + ((x / 3) % 2), (x * 5) % Math.max(1, h), 2, 1);
    }
    if (kind === 'seta') for (let x = 4; x < w - 2; x += 8) r(c, PAL.white, x, 2 + (x % 3), 3, Math.min(2, h - 2));
    if (kind === 'plataforma') { r(c, PAL.g1, 1, 1, w - 2, 1); }
    r(c, st.edge, 0, 0, w, 1); r(c, st.edge, 0, 0, 1, h); r(c, st.edge, w - 1, 0, 1, h);
  });
  canvasTex(scene, kf, w, Math.max(1, alto), (c) => {
    r(c, st.front, 0, 0, w, alto);
    if (kind === 'pasarela' || kind === 'puente') {
      for (let x = 0; x < w; x += 8) { r(c, PAL.d3, x, 0, 1, alto); r(c, PAL.d1, x + 1, 1, 1, alto - 2); }
      r(c, PAL.d4, 0, alto - 3, w, 3);
      for (let x = 10; x < w - 6; x += 60) { r(c, PAL.d4, x, 0, 6, alto); r(c, PAL.d3, x + 1, 1, 1, alto - 1); }
    } else if (kind === 'caja') {
      r(c, st.front2, 0, 0, w, 2); r(c, st.front2, 0, alto - 2, w, 2);
      for (let y0 = 0; y0 + 20 <= alto || y0 === 0; y0 += 20) {
        const hh = Math.min(20, alto - y0);
        r(c, st.front2, 0, y0, 3, hh); r(c, st.front2, w - 3, y0, 3, hh); r(c, st.front2, 0, y0, w, 2);
        for (let k = 3; k < Math.min(w - 6, hh - 2); k++) { r(c, PAL.d3, 2 + Math.floor(k * (w - 6) / Math.max(1, hh - 4)), y0 + k, 2, 1); }
        for (const [nx, ny] of [[1, 1], [w - 3, 1]]) r(c, PAL.p1, nx, y0 + ny + 1, 1, 1);
      }
    } else if (kind === 'heno') {
      for (let y = 2; y < alto; y += 3) r(c, st.front2, 0, y, w, 1);
      for (let x = 3; x < w; x += 6) r(c, PAL.p2, x, 1, 1, Math.max(1, alto - 2));
      r(c, PAL.p4, Math.floor(w / 3), 0, 1, alto); r(c, PAL.p4, Math.floor(2 * w / 3), 0, 1, alto);
    } else {
      for (let y = 2; y < alto; y += 4) r(c, st.front2, 0, y, w, 1);
    }
    if (kind === 'seta') { r(c, PAL.m2, 0, 0, w, 2); for (let x = 4; x < w - 2; x += 10) r(c, PAL.white, x, 3, 3, 2); }
    if (kind === 'plataforma') { r(c, PAL.g3, 0, 0, w, 2); for (let x = 1; x < w; x += 5) r(c, PAL.p4, x, 4 + ((x * 7) % 5), 2, 1); }
    r(c, st.edge, 0, 0, w, 1); r(c, st.edge, 0, alto - 1, w, 1); r(c, st.edge, 0, 0, 1, alto); r(c, st.edge, w - 1, 0, 1, alto);
  });
  return { top: kt, front: kf };
}

/** A rolling log or foam sweeper, 2 frames of texture shift. */
export function moverTexture(scene: Phaser.Scene, kind: string, w: number, h: number, alto: number, frame: number): string {
  const key = `mv_${kind}_${w}_${h}_${alto}_${frame}`;
  const H = h + alto;
  canvasTex(scene, key, w, H, (c) => {
    if (kind === 'tronco') {
      // a log lying along the depth axis, rolling toward -x: bark top seen from above, round growth-ring end in front
      r(c, PAL.ink, 0, 0, w, h);
      r(c, PAL.d2, 1, 1, w - 2, h - 2);
      for (let x = 2 + (frame ? 2 : 0); x < w - 1; x += 4) r(c, PAL.d3, x, 1, 1, h - 2);
      r(c, PAL.d1, 2, 1, 2, h - 2);
      r(c, PAL.d1, Math.floor(w / 2) - 1, 1, 2, h - 2); r(c, PAL.d4, w - 3, 1, 2, h - 2); r(c, PAL.d4, 1, 1, 1, h - 2);
      for (let y = 3; y < h - 2; y += 9) r(c, PAL.d4, 2, y, w - 4, 1);
      const cx = (w - 1) / 2, cy = h + alto / 2 - 0.5, rad = Math.min(w, alto) / 2;
      for (let y = h; y < H; y++) for (let x = 0; x < w; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= rad) { c.fillStyle = d > rad - 1.1 ? PAL.ink : d > rad - 3 ? PAL.d3 : d > rad - 4.4 ? PAL.d1 : (Math.round(d) % 2 ? PAL.d2 : PAL.d1); c.fillRect(x, y, 1, 1); }
      }
      r(c, PAL.d4, Math.round(cx), Math.round(cy), 1, 1);
    } else {
      r(c, PAL.w3, 0, 0, w, H);
      r(c, PAL.w0, 1, 1, w - 2, H - 2);
      for (let y = 3 + (frame ? 3 : 0); y < H - 2; y += 6) { r(c, PAL.w1, 2, y, w - 4, 2); r(c, PAL.white, 3, y, 2, 1); }
    }
  });
  return key;
}

/** Checkpoint or finish arch. Colour from the arch number. */
export function archTexture(scene: Phaser.Scene, key: string, color: string, w: number, h: number, finish = false): void {
  canvasTex(scene, key, w, h, (c) => {
    const p = 6;
    r(c, PAL.ink, 0, 0, p, h); r(c, PAL.ink, w - p, 0, p, h); r(c, PAL.ink, 0, 0, w, 10);
    r(c, PAL.cream, 1, 1, p - 2, h - 1); r(c, PAL.cream, w - p + 1, 1, p - 2, h - 1);
    r(c, color, 1, 1, w - 2, 8);
    if (finish) { for (let x = 1; x < w - 1; x += 4) for (let y = 1; y < 9; y += 4) { r(c, ((x + y) / 4) % 2 === 0 ? PAL.ink : PAL.white, x, y, 4, 4); } }
    else { for (let x = 2; x < w - 2; x += 8) { r(c, PAL.white, x, 3, 3, 3); } }
    r(c, color, 1, 10, p - 2, 4); r(c, color, w - p + 1, 10, p - 2, 4);
  });
}
