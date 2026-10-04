import Phaser from 'phaser';
import type { GameFx } from '../core/types';

interface P { img: Phaser.GameObjects.Image; x: number; y: number; z: number; vx: number; vy: number; vz: number; g: number; life: number; max: number; fade: boolean; grow: number; base: number }
const RAINBOW = [0xff5e7e, 0xffb23f, 0xffe45c, 0x5ddb43, 0x7bffff, 0xb98cff];
const CONF = [0xff5e7e, 0xffb23f, 0xffe45c, 0x5ddb43, 0x4cc9e8, 0xb98cff, 0xffffff];
const MAX = 70;

/** Small pooled particle effects. They help read the action and never exceed MAX objects. */
export class Fx {
  private ps: P[] = [];
  private pool: Phaser.GameObjects.Image[] = [];
  constructor(private scene: Phaser.Scene) {}

  private spawn(tex: string, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, o: { g?: number; tint?: number; fade?: boolean; grow?: number; scale?: number } = {}): void {
    if (this.ps.length >= MAX) { const old = this.ps.shift()!; old.img.setVisible(false); this.pool.push(old.img); }
    const img = this.pool.pop() ?? this.scene.add.image(0, 0, tex);
    img.setTexture(tex).setVisible(true).setAlpha(1).setScale(o.scale ?? 1).clearTint();
    if (o.tint !== undefined) img.setTint(o.tint);
    this.ps.push({ img, x, y, z, vx, vy, vz, g: o.g ?? 0, life, max: life, fade: o.fade ?? true, grow: o.grow ?? 0, base: o.scale ?? 1 });
  }

  update(dt: number): void {
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      p.life -= dt;
      if (p.life <= 0) { p.img.setVisible(false); this.pool.push(p.img); this.ps.splice(i, 1); continue; }
      p.vz -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.z < 0) { p.z = 0; p.vz = Math.abs(p.vz) * 0.3; }
      const u = 1 - p.life / p.max;
      p.img.setPosition(Math.round(p.x), Math.round(p.y - p.z)).setDepth(p.y + 6).setScale(p.base * (1 + p.grow * u));
      if (p.fade) p.img.setAlpha(Math.min(1, p.life / (p.max * 0.5)));
    }
  }

  trail(kind: 'rainbow' | 'dust' | 'spark', x: number, y: number, z: number, t: number): void {
    if (kind === 'rainbow') this.spawn('dot', x - 4, y, z + 10 + Math.sin(t * 30) * 4, 0, 0, 0, 0.45, { tint: RAINBOW[Math.floor(t * 40) % RAINBOW.length], scale: 2.5 });
    else if (kind === 'dust') this.spawn('dust', x, y, 1, 0, 0, 14, 0.3, { grow: 0.8, scale: 0.7 });
    else this.spawn('spark', x, y, z + 12, (Math.sin(t * 20)) * 20, 0, 12, 0.35);
  }

  handle(e: GameFx, colorOf: (id?: number) => number): void {
    const { x, y, z } = e;
    switch (e.k) {
      case 'jump': for (let i = 0; i < 3; i++) this.spawn('dust', x + (i - 1) * 5, y, 1, (i - 1) * 22, 0, 18, 0.32, { grow: 0.8, scale: 0.8 }); break;
      case 'land': { const n = (e.v ?? 100) > 220 ? 6 : 4; for (let i = 0; i < n; i++) this.spawn('dust', x, y, 1, (i / (n - 1) - 0.5) * 70, 0, 14, 0.34, { grow: 0.9, scale: 0.8 }); break; }
      case 'splash': case 'plop': for (let i = 0; i < 7; i++) this.spawn('drop', x, y, 2, (i - 3) * 14, (i % 2 ? 4 : -4), 70 + (i % 3) * 20, 0.55, { g: 340 }); break;
      case 'stroke': for (let i = 0; i < 3; i++) this.spawn('drop', x, y, 2, (i - 1) * 12, 0, 40, 0.35, { g: 260 }); break;
      case 'push': case 'hit': for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; this.spawn('spark', x, y, z, Math.cos(a) * 40, Math.sin(a) * 12, 20 + Math.sin(a) * 30, 0.35); } break;
      case 'block': for (let i = 0; i < 3; i++) this.spawn('spark', x + (i - 1) * 6, y, z, 0, 0, 30, 0.3, { tint: 0x7fdbf2 }); break;
      case 'tumble': for (let i = 0; i < 4; i++) this.spawn('star', x, y, z + 22, (i - 1.5) * 26, 0, 40 + i * 10, 0.9, { g: 60, scale: 0.8 }); break;
      case 'pickup': for (let i = 0; i < 2; i++) this.spawn('spark', x + (i ? 4 : -4), y, z + 10, 0, 0, 30, 0.3); break;
      case 'star': for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; this.spawn('spark', x, y, z + 6, Math.cos(a) * 30, Math.sin(a) * 8, 25, 0.4, { tint: e.v ? 0xffb23f : 0xffe45c }); } break;
      case 'bounce': for (let i = 0; i < 6; i++) this.spawn('dust', x, y, 2, (i - 2.5) * 20, 0, 10, 0.3, { grow: 1, scale: 0.8 }); break;
      case 'power': { const c = colorOf(e.who); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; this.spawn('spark', x, y, z + 12, Math.cos(a) * 55, Math.sin(a) * 18, 22 + Math.sin(a) * 40, 0.5, { tint: c }); } break; }
      case 'pop': case 'bubble': for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; this.spawn('drop', x, y, z + 10, Math.cos(a) * 36, Math.sin(a) * 10, 30, 0.45, { g: 120, tint: 0xe8fbff }); } break;
      case 'cp': for (let i = 0; i < 20; i++) this.spawn('confetti', x, y, 20, (i - 10) * 7, ((i * 37) % 13) - 6, 90 + (i % 5) * 20, 1.1, { g: 220, tint: CONF[i % CONF.length] }); break;
      case 'finish': for (let i = 0; i < 24; i++) this.spawn('confetti', x, y, 20, (i - 12) * 8, ((i * 53) % 15) - 7, 100 + (i % 6) * 22, 1.3, { g: 230, tint: CONF[i % CONF.length] }); break;
      case 'crate': case 'smash': for (let i = 0; i < 10; i++) this.spawn(e.k === 'crate' ? 'confetti' : 'dust', x, y, z + 6, (i - 5) * 14, ((i * 31) % 9) - 4, 60 + (i % 4) * 15, 0.6, { g: 260, tint: e.k === 'crate' ? CONF[i % CONF.length] : undefined }); break;
      case 'ballbounce': this.spawn('dust', x, y, 1, 0, 0, 8, 0.25, { grow: 1, scale: 0.6 }); break;
      case 'whiff': this.spawn('spark', x, y, z, 0, 0, 10, 0.15, { tint: 0xffffff }); break;
      case 'pinata': for (let i = 0; i < 6; i++) this.spawn('confetti', x, y, z, (i - 3) * 16, ((i * 17) % 7) - 3, 40 + (i % 3) * 25, 0.8, { g: 200, tint: CONF[i % CONF.length] }); break;
      case 'drag': for (let i = 0; i < 5; i++) this.spawn('drop', x, y, z + 8, (i - 2) * 10, 0, 40, 0.4, { g: 150, tint: 0xe8fbff }); break;
      default: break;
    }
  }
}
