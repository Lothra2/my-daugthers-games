import Phaser from 'phaser';
import { PAL } from './Procedural';

const SKY = ['#6FCBF5', '#8CDAFB', '#A9E6FF', '#C7F0FF', '#E3F8FF', '#FFEBD9'];

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h)!;
  const c = t.getContext(); c.imageSmoothingEnabled = false; draw(c); t.refresh();
}

export function makeBackdropTextures(scene: Phaser.Scene): void {
  // sky: vertical gradient in bands with a 2x2 ordered dither at the seams, anchored to world y = -140 .. 280
  tex(scene, 'sky', 4, 420, (c) => {
    const bands = SKY.length, bh = 420 / bands;
    for (let y = 0; y < 420; y++) {
      const b = Math.min(bands - 1, Math.floor(y / bh)), frac = (y - b * bh) / bh;
      const next = Math.min(bands - 1, b + 1);
      for (let x = 0; x < 4; x++) {
        const dither = ((x + y) % 2 === 0) ? 0.2 : -0.2;
        c.fillStyle = frac + dither > 0.82 ? SKY[next] : SKY[b];
        c.fillRect(x, y, 1, 1);
      }
    }
  });
  // clouds: soft pixel clouds, loops horizontally
  tex(scene, 'clouds', 640, 90, (c) => {
    const cloud = (cx: number, cy: number, s: number) => {
      const blobs: [number, number, number][] = [[0, 0, 9], [10, -3, 11], [22, 0, 9], [11, 3, 12]];
      for (const [dx, dy, rr] of blobs) for (let y = -rr; y <= rr; y++) for (let x = -rr * 2; x <= rr * 2; x++) {
        if ((x / 2) * (x / 2) + y * y <= rr * rr * s * s) { c.fillStyle = y > rr * 0.35 ? '#D7F2FF' : '#FFFFFF'; c.fillRect(Math.round(cx + dx * s + x * s / 1.4), Math.round(cy + dy * s + y * s / 1.4), 1, 1); }
      }
    };
    cloud(70, 30, 1); cloud(250, 52, 0.8); cloud(430, 24, 1.1); cloud(560, 60, 0.7);
  });
  const hills = (key: string, h: number, base: number, amp: number, col: string, shade: string, trees: boolean, seed: number) => tex(scene, key, 640, h, (c) => {
    const prof = (x: number) => base + Math.sin((x / 640) * Math.PI * 2 * 2 + seed) * amp + Math.sin((x / 640) * Math.PI * 2 * 5 + seed * 2) * amp * 0.35;
    for (let x = 0; x < 640; x++) {
      const top = Math.round(prof(x));
      c.fillStyle = col; c.fillRect(x, top, 1, h - top);
      c.fillStyle = shade; c.fillRect(x, top + 5 + ((x * 3) % 3), 1, 1);
      if ((x + top) % 7 === 0) { c.fillStyle = shade; c.fillRect(x, top + 10, 2, 1); }
    }
    if (trees) for (let x = 8, n = 0; x < 632; x += 15 + ((x * 7) % 11), n++) {
      const top = Math.round(prof(x));
      const dot = (px: number, py: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(px), Math.round(py), 1, 1); };
      if (n % 3 === 1) {
        // fir: stacked triangles, narrow trunk
        const tiers = 3, hgt = 9 + ((x * 5) % 5);
        for (let t = 0; t < tiers; t++) {
          const y0 = top - hgt + Math.round((t * hgt) / tiers) * 0.8, half = 2 + t * 2;
          for (let yy = 0; yy < Math.ceil(hgt / tiers) + 2; yy++) {
            const hw = Math.round(1 + (half * (yy + 1)) / (Math.ceil(hgt / tiers) + 2));
            for (let xx = -hw; xx <= hw; xx++) dot(x + xx, y0 + yy, xx < -hw * 0.3 ? PAL.g3 : PAL.g4);
          }
        }
        c.fillStyle = PAL.d4; c.fillRect(x - 1, top - 1, 2, 3);
      } else {
        // round tree: a few overlapping discs with a light side, short trunk
        const r = 5 + ((x * 3) % 4);
        const discs: [number, number, number][] = [[0, -r - 1, r], [-r * 0.7, -r * 0.5 - 1, r * 0.7], [r * 0.7, -r * 0.5 - 1, r * 0.75]];
        for (const [dx, dy, rr] of discs) for (let yy = -rr; yy <= rr; yy++) for (let xx = -rr; xx <= rr; xx++) {
          if (xx * xx + yy * yy > rr * rr + 0.5) continue;
          const light = xx + yy * 0.8 < -rr * 0.35;
          dot(x + dx + xx, top + dy + yy, light ? PAL.g3 : PAL.g4);
        }
        c.fillStyle = PAL.d4; c.fillRect(x - 1, top - 3, 2, 4);
      }
    }
  });
  hills('hills_far', 90, 40, 12, '#8AD8B4', '#7BC9A8', false, 0.6);
  hills('hills_mid', 80, 30, 9, '#4AA88E', '#3F9A82', true, 2.1);
}

/** Sky and two parallax strips anchored to the world, scrolled from the camera (ART_BIBLE section 6). */
export class Backdrop {
  private sky: Phaser.GameObjects.TileSprite;
  private clouds: Phaser.GameObjects.TileSprite;
  private far: Phaser.GameObjects.TileSprite;
  private mid: Phaser.GameObjects.TileSprite;
  constructor(scene: Phaser.Scene, w: number, h: number) {
    this.sky = scene.add.tileSprite(0, 0, w, h, 'sky').setOrigin(0, 0).setScrollFactor(0).setDepth(-100000);
    this.clouds = scene.add.tileSprite(0, 0, w, 90, 'clouds').setOrigin(0, 0).setScrollFactor(0).setDepth(-99990);
    this.far = scene.add.tileSprite(0, 0, w, 90, 'hills_far').setOrigin(0, 0).setScrollFactor(0).setDepth(-99980);
    this.mid = scene.add.tileSprite(0, 0, w, 80, 'hills_mid').setOrigin(0, 0).setScrollFactor(0).setDepth(-99970);
  }
  resize(w: number, h: number): void { this.sky.setSize(w, h); this.clouds.setSize(w, 90); this.far.setSize(w, 90); this.mid.setSize(w, 80); }
  update(camX: number, camY: number, t: number): void {
    const cx = Math.round(camX), cy = Math.round(camY);
    this.sky.setTilePosition(0, Math.round(cy + 140));
    this.clouds.setPosition(0, Math.round(10 - cy)).setTilePosition(Math.round(cx * 0.08 + t * 4), 0);
    this.far.setPosition(0, Math.round(88 - cy)).setTilePosition(Math.round(cx * 0.18), 0);
    this.mid.setPosition(0, Math.round(108 - cy)).setTilePosition(Math.round(cx * 0.4), 0);
  }
}
