import { WORLDS } from '../data/worlds.js';

const SPEED = { far: 0.1, mid: 0.3, near: 0.55 };
const DEPTH = { far: 3, mid: 5, near: 8 };

export class Parallax {
  constructor(scene, name) {
    this.scene = scene; this.name = name;
    this.sprites = [];
    this.nextL = 0;
    this.rng = (() => { let a = 12345 + name.length * 77; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
    this.started = false;
  }

  update(camX, W, groundY, worldAt, t) {
    const sp = SPEED[this.name];
    const lc = camX * sp;
    if (!this.started) { this.nextL = lc - 40; this.started = true; }
    while (this.nextL < lc + W + 160) {
      const world = worldAt(camX + W + 160);
      const cfg = WORLDS[world].layers[this.name];
      if (!cfg) { this.nextL += 320; continue; }
      const it = cfg.items[Math.floor(this.rng() * cfg.items.length)];
      const spr = this.scene.add.image(0, 0, `prop_w${world}_${it.i}`).setDepth(DEPTH[this.name]);
      spr.setAlpha(it.alpha ?? 1);
      const h = spr.height;
      let y;
      if (it.place === 'ground') { spr.setOrigin(0, 1); y = groundY - (this.name === 'near' ? 0 : 6); }
      else {
        spr.setOrigin(0, 0);
        const maxY = Math.max(10, groundY - 130 - h);
        y = 8 + Math.floor(this.rng() * maxY);
      }
      this.sprites.push({ spr, L: this.nextL, place: it.place, base: y, ph: this.rng() * 6.28, w: spr.width, h });
      this.nextL += spr.width + cfg.gap[0] + this.rng() * (cfg.gap[1] - cfg.gap[0]);
    }
    for (let i = this.sprites.length - 1; i >= 0; i--) {
      const s = this.sprites[i];
      const x = Math.round(s.L - lc);
      if (x + s.w < -30) { s.spr.destroy(); this.sprites.splice(i, 1); continue; }
      const bob = s.place === 'float' ? Math.round(Math.sin(t * 1.2 + s.ph) * 3) : 0;
      let y = s.base + bob;
      if (s.place === 'ground') y = groundY - (this.name === 'near' ? 0 : 6);
      s.spr.setPosition(x, y);
    }
  }

  clear() { for (const s of this.sprites) s.spr.destroy(); this.sprites.length = 0; this.started = false; }
}
