// Particles and floating text in WORLD coordinates (x world, h height above the floor).
import { RAINBOW } from './gfx.js';

const hex = (h) => parseInt(h.slice(1), 16);
export const RAINBOW_HEX = RAINBOW.map(hex);

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.p = [];
    this.texts = [];
    this.pool = [];
    this.reduceFlash = false;
  }

  sprite(key) {
    let s = this.pool.pop();
    if (!s) { s = this.scene.add.image(0, 0, key); s.setDepth(40); }
    s.setTexture(key).setVisible(true).setAlpha(1).setTint(0xffffff).setScale(1).setAngle(0).setOrigin(0.5);
    return s;
  }

  emit(o) {
    const s = this.sprite(o.key || 'px_dot3');
    if (o.tint != null) s.setTint(o.tint);
    if (o.depth != null) s.setDepth(o.depth); else s.setDepth(40);
    const p = {
      s, wx: o.x, h: o.y, vx: o.vx || 0, vy: o.vy || 0, g: o.g ?? 0, life: o.life ?? 0.5, age: 0, drag: o.drag ?? 0,
      fade: o.fade !== false, scale0: o.scale ?? 1, scale1: o.scale1 ?? o.scale ?? 1, spin: o.spin || 0, twinkle: !!o.twinkle,
      screen: !!o.screen, flipX: false,
    };
    this.p.push(p);
    return p;
  }

  burst(x, y, key, n, speed, life, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread ?? 1) : Math.random() * Math.PI * 2;
      const sp = speed * (0.45 + Math.random() * 0.75);
      this.emit({ x: x + (Math.random() - 0.5) * (o.jitter ?? 0), y: y + (Math.random() - 0.5) * (o.jitter ?? 0), key, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.g ?? -320, life: life * (0.7 + Math.random() * 0.6), tint: Array.isArray(o.tint) ? o.tint[i % o.tint.length] : o.tint, scale: o.scale, scale1: o.scale1, twinkle: o.twinkle, spin: o.spin });
    }
  }

  dust(x, y, n = 4, dir = -1) {
    for (let i = 0; i < n; i++) this.emit({ x: x + (Math.random() - 0.5) * 14, y: y + 2, key: 'px_puff', vx: dir * (30 + Math.random() * 50), vy: 20 + Math.random() * 40, g: -40, life: 0.35, scale: 0.7, scale1: 1.3, tint: 0xFFF1F8 });
  }

  floatText(x, y, text, o = {}) {
    const t = this.scene.add.bitmapText(0, 0, 'pixfont', text, o.size || 24).setOrigin(0.5).setDepth(60);
    if (o.tint != null) t.setTint(o.tint);
    this.texts.push({ t, wx: x, h: y, age: 0, life: o.life || 0.9, rise: o.rise ?? 40, big: !!o.big, pop: o.pop !== false, screen: !!o.screen, sx: o.sx, sy: o.sy });
  }

  update(dt, camX, groundY) {
    for (let i = this.p.length - 1; i >= 0; i--) {
      const p = this.p[i];
      p.age += dt;
      if (p.age >= p.life) { p.s.setVisible(false); this.pool.push(p.s); this.p.splice(i, 1); continue; }
      p.vy += p.g * dt;
      if (p.drag) { p.vx *= Math.max(0, 1 - p.drag * dt); p.vy *= Math.max(0, 1 - p.drag * dt); }
      p.wx += p.vx * dt; p.h += p.vy * dt;
      const u = p.age / p.life;
      const sc = p.scale0 + (p.scale1 - p.scale0) * u;
      p.s.setScale(sc);
      p.s.setPosition(Math.round(p.screen ? p.wx : p.wx - camX), Math.round(p.screen ? p.h : groundY - p.h));
      let a = p.fade ? 1 - u * u : 1;
      if (p.twinkle) a *= (Math.floor(p.age * 18) % 2) ? 0.35 : 1;
      p.s.setAlpha(a);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const q = this.texts[i];
      q.age += dt;
      if (q.age >= q.life) { q.t.destroy(); this.texts.splice(i, 1); continue; }
      const u = q.age / q.life;
      const pop = q.pop ? (u < 0.15 ? 0.6 + (u / 0.15) * 0.55 : u < 0.3 ? 1.15 - ((u - 0.15) / 0.15) * 0.15 : 1) : 1;
      q.t.setScale(pop * (q.big ? 1.5 : 1));
      if (q.screen) q.t.setPosition(Math.round(q.sx), Math.round(q.sy - q.rise * u));
      else q.t.setPosition(Math.round(q.wx - camX), Math.round(groundY - q.h - q.rise * u));
      q.t.setAlpha(u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1);
    }
  }

  clear() {
    for (const p of this.p) { p.s.setVisible(false); this.pool.push(p.s); }
    this.p.length = 0;
    for (const q of this.texts) q.t.destroy();
    this.texts.length = 0;
  }
}
