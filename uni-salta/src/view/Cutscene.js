// Ninja Gaiden style power-up cutscene: the run freezes, letterbox bars slide in, rays spin behind a big portrait
// of the transformed unicorn that slams in, the power is announced, then the portrait flies back into the hero.
const COL = {
  fast: { main: 0xFFE23A, light: 0xFFF7B0, dark: 0x3A2A00, text: 0xFFE23A },
  slow: { main: 0x6FE09A, light: 0xD6FFE4, dark: 0x0C3A2A, text: 0x9FF5C4 },
  inv:  { main: 0xFF5C9E, light: 0xFFC0E0, dark: 0x3A0C30, text: 0xFFFFFF },
};
const RAINBOW = [0xFF4D5E, 0xFF9A3C, 0xFFE23A, 0x5CD66A, 0x4DA6FF, 0x9D6BFF];
const DUR = 1.9;

const ease = {
  out: (u) => 1 - Math.pow(1 - u, 3),
  back: (u) => { const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
  in: (u) => u * u * u,
};
const clamp01 = (u) => Math.max(0, Math.min(1, u));

export class PowerCut {
  constructor(scene) {
    this.sc = scene;
    this.on = false;
  }

  start(kind, title, sub, targetX, targetY) {
    if (this.on) this.end();            // never leave a half drawn cutscene behind
    const sc = this.sc, W = sc.W, H = sc.H;
    this.kind = kind; this.t = 0; this.on = true; this.target = [targetX, targetY];
    this.col = COL[kind];
    this.objs = [];
    const mk = (o) => { this.objs.push(o); return o; };
    this.dim = mk(sc.add.rectangle(W / 2, H / 2, W, H, this.col.dark, 1).setDepth(100).setAlpha(0));
    this.rays = mk(sc.add.graphics().setDepth(101));
    this.bandT = mk(sc.add.rectangle(W / 2, 0, W, 1, 0x000000, 1).setOrigin(0.5, 0).setDepth(104));
    this.bandB = mk(sc.add.rectangle(W / 2, H, W, 1, 0x000000, 1).setOrigin(0.5, 1).setDepth(104));
    this.S = H >= 440 ? 3 : 2;
    this.port = mk(sc.add.image(W / 2, H / 2 - 18, `power_${kind}`).setDepth(103).setScale(0.01).setAlpha(0));
    this.glowRing = mk(sc.add.graphics().setDepth(102));
    this.title = mk(sc.add.bitmapText(W / 2, 0, 'pixfont', title, 32).setOrigin(0.5).setDepth(105).setTint(this.col.text).setAlpha(0));
    this.sub = mk(sc.add.bitmapText(W / 2, 0, 'pixfont', sub, 16).setOrigin(0.5).setDepth(105).setTint(0xFFFFFF).setAlpha(0));
    this.flashR = mk(sc.add.rectangle(W / 2, H / 2, W, H, 0xFFFFFF, 1).setDepth(110).setAlpha(0));
    this.sc.anims.pauseAll();
    this.lineT = 0;
  }

  // returns true when finished
  update(dt) {
    if (!this.on) return true;
    try { return this.step(dt); } catch (err) { console.error(err); this.end(); return true; }
  }

  step(dt) {
    const sc = this.sc, W = sc.W, H = sc.H, fx = sc.fx;
    this.t += dt;
    const t = this.t, c = this.col;
    const inU = clamp01(t / 0.28), outU = clamp01((t - (DUR - 0.4)) / 0.4);
    const amt = ease.out(inU) * (1 - ease.in(outU));
    this.dim.setAlpha(0.82 * amt);
    const bar = Math.round(H * 0.15 * amt);
    this.bandT.setSize(W, bar); this.bandB.setSize(W, bar);
    // spinning rays
    const g = this.rays; g.clear();
    const cx = W / 2, cy = H / 2 - 18, R = Math.hypot(W, H);
    const n = 16, rot = t * 0.9;
    for (let i = 0; i < n; i += 2) {
      const a0 = rot + (i / n) * Math.PI * 2, a1 = rot + ((i + 1) / n) * Math.PI * 2;
      g.fillStyle(this.kind === 'inv' ? RAINBOW[(i / 2) % 6] : c.main, 0.33 * amt);
      g.fillTriangle(cx, cy, cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
    }
    // portrait: slam in with overshoot, hold with a tiny float, then dive into the hero
    const S = this.S;
    let sc0, px = cx, py = cy, al = 1;
    if (t < 0.12) { sc0 = 0.01; al = 0; }
    else if (t < 0.5) { const u = (t - 0.12) / 0.38; sc0 = S * (0.2 + 1.0 * ease.back(u)); al = 1; }
    else if (t < DUR - 0.4) { sc0 = S + (S >= 3 ? 0 : 0); py = cy + Math.round(Math.sin(t * 6) * 3); }
    else { const u = ease.in(outU); sc0 = S * (1 - u * 0.85); px = cx + (this.target[0] - cx) * u; py = cy + (this.target[1] - cy) * u; al = 1 - u * 0.4; }
    if (t >= 0.5 && t < DUR - 0.4) sc0 = S;
    this.port.setPosition(Math.round(px), Math.round(py)).setScale(sc0).setAlpha(al);
    // halo ring pulses behind the portrait
    const gr = this.glowRing; gr.clear();
    if (t > 0.12 && t < DUR - 0.4) {
      for (let k = 0; k < 3; k++) {
        const u = ((t * 1.3 + k / 3) % 1), r = 50 * S * (0.6 + u * 0.9);
        gr.lineStyle(3, c.light, 0.5 * (1 - u)).strokeCircle(cx, cy, r);
      }
    }
    // text
    const ty = H - bar - 40;
    const tu = clamp01((t - 0.5) / 0.2);
    this.title.setPosition(W / 2, Math.round(ty - 8 + (1 - ease.out(tu)) * 14)).setAlpha(tu * (1 - ease.in(outU))).setScale(1 + (1 - tu) * 0.6);
    this.sub.setPosition(W / 2, Math.round(ty + 22)).setAlpha(clamp01((t - 0.62) / 0.2) * (1 - ease.in(outU)));
    // speed lines and sparkles
    this.lineT -= dt;
    if (this.lineT <= 0 && t < DUR - 0.4) {
      this.lineT = 0.025;
      fx.emit({ x: W + 10, y: bar + Math.random() * (H - bar * 2), key: 'px_line', vx: -2000, life: 0.2, screen: true, scale: 2 + Math.random() * 4, tint: c.light, fade: true, depth: 102.5 });
      if (Math.random() < 0.4) fx.emit({ x: Math.random() * W, y: bar + Math.random() * (H - bar * 2), key: 'px_star', life: 0.6, screen: true, tint: this.kind === 'inv' ? RAINBOW[Math.floor(Math.random() * 6)] : c.light, twinkle: true, scale: 1 + Math.random(), depth: 102.6 });
    }
    // flashes: impact at the slam and a soft one on exit
    const f1 = t > 0.12 && t < 0.3 ? 1 - (t - 0.12) / 0.18 : 0;
    const f2 = t > DUR - 0.12 ? (t - (DUR - 0.12)) / 0.12 : 0;
    const fa = Math.max(f1 * 0.85, f2 * 0.7) * (sc.app.save.settings.reduceFlash ? 0.25 : 1);
    this.flashR.setAlpha(fa);
    if (t > 0.12 && !this.slammed) { this.slammed = true; sc.shakeNow && sc.shakeNow(5, 0.3); sc.app.bus.emit('sfx', { name: 'cut_slam' }); }
    if (t >= DUR || t > DUR + 1) { this.end(); return true; }
    return false;
  }

  end() {
    for (const o of this.objs || []) { try { o.destroy(); } catch (e) { /* already gone */ } }
    this.objs = []; this.on = false; this.slammed = false;
    this.sc.anims.resumeAll();
  }
}
