// Title scene: Sophie's purple scribble sky, rainbow and the flying unicorn, made alive.
import { Fx, RAINBOW_HEX } from './fx.js';
import { Parallax } from './parallax.js';

export class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const app = this.app = this.registry.get('app');
    this.W = app.layout.W; this.H = app.layout.H;
    this.t = 0; this.leaving = false; this.taps = 0; this.idleT = 0; this.flip = 0;
    this.sky = this.add.tileSprite(0, 0, this.W, this.H, 'sky_title').setOrigin(0).setDepth(0);
    this.streaks = this.add.tileSprite(0, 0, this.W, this.H, 'streaks_title').setOrigin(0).setDepth(1);
    this.clouds = [];
    const keys = ['prop_w1_5', 'prop_w1_4', 'prop_w1_7', 'prop_w1_3', 'prop_w1_2', 'prop_w1_6'];
    for (let i = 0; i < 8; i++) {
      const far = i % 2 === 0;
      const s = this.add.image(Math.random() * this.W, 16 + Math.random() * (this.H - 120), keys[i % keys.length]).setDepth(far ? 2 : 4).setAlpha(far ? 0.8 : 1);
      this.clouds.push({ s, v: far ? 6 + Math.random() * 6 : 14 + Math.random() * 10 });
    }
    this.rb = this.add.graphics().setDepth(6);
    this.uni = this.add.sprite(0, 0, 'unicorn_title_fly').setDepth(8).setOrigin(48 / 96, 70 / 96).setScale(2);
    this.uni.play('unicorn_title_fly');
    this.fx = new Fx(this);
    this.ux = Math.round(this.W * 0.36); this.uy = Math.round(this.H * 0.5);
    this.uni.setInteractive?.();
    this.input.enabled = false;
    this.unsub = [
      this.app.bus.on('ui_play_out', () => this.flyAway()),
      this.app.bus.on('launch_game', (d) => { this.app.startData = d; this.scene.start('Game', d); }),
      this.app.bus.on('ui_gesture', () => { this.idleT = 0; }),
    ];
    this.events.on('shutdown', () => this.unsub.forEach((f) => f()));
    this.scale.on('resize', (sz) => { this.W = sz.width; this.H = sz.height; this.sky.setSize(this.W, this.H); this.streaks.setSize(this.W, this.H); this.ux = Math.round(this.W * 0.36); this.uy = Math.round(this.H * 0.5); });
    // tapping the unicorn
    this.onTap = (e) => {
      if (this.app.ui.state !== 'title') return;
      const r = this.game.canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * this.W, y = (e.clientY - r.top) / r.height * this.H;
      if (Math.abs(x - this.uni.x) < 80 && Math.abs(y - this.uni.y) < 100) this.tapUnicorn();
    };
    this.game.canvas.addEventListener('pointerdown', this.onTap);
    this.events.on('shutdown', () => this.game.canvas.removeEventListener('pointerdown', this.onTap));
    app.bus.emit('title_enter');
    app.bus.emit('music', { song: 'title' });
  }

  tapUnicorn() {
    this.taps++;
    this.app.bus.emit('sfx', { name: 'jump' });
    this.fx.burst(this.uni.x, this.uni.y, 'px_star', 6, 200, 0.6, { tint: 0xFFE23A, g: 0 });
    if (this.taps >= 5) { this.taps = 0; this.loop(); this.app.bus.emit('sfx', { name: 'secret' }); }
  }

  loop() {
    if (this.flip > 0) return;
    this.flip = 1;
    this.fx.burst(this.uni.x, this.uni.y, 'px_heart', 8, 220, 1, { tint: 0xFF5C70, g: 80 });
  }

  flyAway() {
    this.leaving = true;
    this.app.bus.emit('sfx', { name: 'start_game' });
    this.tweens.add({ targets: this.uni, x: this.W + 120, y: -80, duration: 520, ease: 'Cubic.easeIn' });
  }

  ribbon(t) {
    const g = this.rb; g.clear();
    const ex = this.uni.x - 52, ey = this.uni.y + 44;
    const P0 = [-30, this.H + 30], P1 = [this.W * 0.1, this.H * 0.82], P2 = [ex, ey];
    const pts = [], norms = [];
    const N = 46;
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
      const x = a * P0[0] + b * P1[0] + c * P2[0] + Math.sin(u * 9 - t * 3) * 1.5;
      const y = a * P0[1] + b * P1[1] + c * P2[1];
      const dx = 2 * (1 - u) * (P1[0] - P0[0]) + 2 * u * (P2[0] - P1[0]);
      const dy = 2 * (1 - u) * (P1[1] - P0[1]) + 2 * u * (P2[1] - P1[1]);
      const l = Math.hypot(dx, dy) || 1;
      pts.push([x, y]); norms.push([-dy / l, dx / l]);
    }
    const bandW = 8;
    for (let k = 0; k < 6; k++) {
      const off = (k - 2.5) * bandW;
      g.lineStyle(bandW + 1, RAINBOW_HEX[k], 1);
      g.beginPath();
      pts.forEach(([x, y], i) => { const px = Math.round(x + norms[i][0] * off), py = Math.round(y + norms[i][1] * off); if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); });
      g.strokePath();
    }
    // travelling shimmer
    const ph = ((t * 0.35) % 1.4) * N;
    g.lineStyle(bandW * 6, 0xffffff, 0.22);
    g.beginPath();
    let started = false;
    pts.forEach(([x, y], i) => { if (Math.abs(i - ph) < 4) { if (!started) { g.moveTo(Math.round(x), Math.round(y)); started = true; } else g.lineTo(Math.round(x), Math.round(y)); } });
    g.strokePath();
  }

  update(time, delta) {
    const dt = Math.min(delta, 100) / 1000;
    this.t += dt; this.idleT += dt;
    for (const c of this.clouds) { c.s.x -= c.v * dt; if (c.s.x < -c.s.width) { c.s.x = this.W + Math.random() * 100; c.s.y = 16 + Math.random() * (this.H - 130); } c.s.setPosition(Math.round(c.s.x), Math.round(c.s.y)); }
    this.streaks.tilePositionX = Math.round(this.t * 7); this.streaks.tilePositionY = Math.round(this.t * 3.5);
    if (!this.leaving) {
      let bob = Math.sin(this.t * 1.7) * 4;
      let x = this.ux + Math.round(Math.sin(this.t * 0.9) * 6);
      let y = this.uy + Math.round(bob);
      if (this.flip > 0) { this.flip += dt * 1.1; const u = Math.min(1, this.flip - 1); y -= Math.sin(u * Math.PI) * 90; x += Math.sin(u * Math.PI * 2) * 40; if (u >= 1) this.flip = 0; }
      if (this.idleT > 20) { this.idleT = 0; this.loop(); }
      this.uni.setPosition(x, y);
    }
    this.ribbon(this.t);
    if (Math.random() < 0.12) this.fx.emit({ x: this.uni.x - 6 + Math.random() * 12, y: this.uni.y - 124 + Math.random() * 8, key: 'px_spark', life: 0.5, tint: 0xFFF7B0, twinkle: true, screen: true, scale: 0.8 });
    if (Math.random() < 0.3) this.fx.emit({ x: this.uni.x - 60 - Math.random() * 60, y: this.uni.y + 40 + Math.random() * 40, key: 'px_star', life: 0.7, vx: -30, vy: 10, tint: RAINBOW_HEX[Math.floor(Math.random() * 6)], twinkle: true, screen: true, scale: 0.8, g: 0 });
    if (Math.random() < 0.25) this.fx.emit({ x: Math.random() * this.W, y: Math.random() * this.H, key: 'px_dot2', life: 1.2, tint: 0xFFFFFF, twinkle: true, screen: true, depth: 3 });
    this.fx.update(dt, 0, 0);
  }
}
