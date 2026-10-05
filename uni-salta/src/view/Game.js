// Gameplay scene: renders the deterministic core with interpolation, plus all the juice.
import { Sim } from '../core/sim.js';
import { CFG } from '../core/config.js';
import { ReactiveBot } from '../core/bot.js';
import { makeRng } from '../core/rng.js';
import { WORLDS } from '../data/worlds.js';
import { Fx, RAINBOW_HEX } from './fx.js';
import { Parallax } from './parallax.js';
import { PowerCut } from './Cutscene.js';

const lerp = (a, b, t) => a + (b - a) * t;
const HANG_TOP_H = 196;       // height of the top of a fully dropped hanging snake (cloud included)
const GOLD = 0xFFE23A;

export class Game extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) { this.startData = data || {}; }

  create() {
    const app = this.app = this.registry.get('app');
    this.flags = app.flags;
    const { W, H } = app.layout;
    this.W = W; this.H = H;
    this.groundY = H - CFG.FLOOR_H;
    const d = this.startData;
    const seed = this.flags.seed ?? d.seed ?? ((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    const mode = this.flags.mode || d.mode || app.save.settings.lastMode || 'normal';
    this.sim = new Sim({ mode, seed, world: this.flags.world || d.world || 1, lap: this.flags.lap || 1, fixedSpeed: this.flags.speed || null, script: this.flags.chunk ? Array(6).fill(this.flags.chunk) : null });
    this.sim.bossDist = Math.max(300, Math.min(560, W - 120 - CFG.PLAYER_X));
    this.bot = this.flags.autoplay ? new ReactiveBot({ lead: 0.27, jitter: 0.08, rng: makeRng(seed) }) : null;
    this.acc = 0; this.t = 0; this.tickCount = 0;
    this.paused = false; this.ended = false; this.entered = false;
    this.shake = 0; this.shakeT = 0;
    this.hitT = 0; this.stompT = 0; this.landT = 0; this.crouchInT = 0; this.blinkT = 0; this.waveT = 0;
    this.thor = null; this.thorTimer = 12 + Math.random() * 25; this.thorHappy = false;
    this.trail = [];
    this.ghosts = [];
    // the scene object is reused on restart, so anything created lazily must be reset here
    this.pitGfx = null; this.bossSpr = null; this.bossGfx = null; this.bossName = null; this.deaths = []; this.boltT = 0; this.seamT = 0; this.slowmoT = 0; this.bossShootT = 0; this.bossBoomT = 0; this.ghostT = 0; this.seam = null;
    this.names = new Map();
    this.worldBadgeShown = 0;
    this.lastHud = 0;
    this.speedLineT = 0;
    this.ambientT = 0;

    this.buildSky();
    this.par = { far: new Parallax(this, 'far'), mid: new Parallax(this, 'mid'), near: new Parallax(this, 'near') };
    this.floorViews = [];
    this.platViews = new Map();
    this.sprites = new Map();
    this.gate = this.add.image(0, 0, 'gate').setOrigin(0.5, 1).setDepth(14);
    this.gfx = this.add.graphics().setDepth(25);          // rainbow trail
    this.dbg = this.add.graphics().setDepth(90);
    this.fx = new Fx(this);
    this.cut = new PowerCut(this);
    this.flagGfx = this.add.graphics().setDepth(15);
    this.auraGfx = this.add.graphics().setDepth(29);
    this.fx.reduceFlash = app.save.settings.reduceFlash;

    // player
    this.player = this.add.sprite(CFG.PLAYER_X, this.groundY, 'unicorn_run').setDepth(30).setOrigin(48 / 96, 92 / 96);
    this.player.play('unicorn_run');
    this.rescueCloud = this.add.sprite(0, 0, 'rescue_bob').setDepth(29).setVisible(false);
    this.rescueCloud.play('rescue_bob');
    this.shadow = this.add.image(0, 0, 'px_shadow').setDepth(11).setAlpha(0.4);
    this.sq = { x: 1, y: 1, lean: 0, bob: 0, lastFoot: -1, airT: 0 };

    // overlays
    this.slowTint = this.add.rectangle(W / 2, H / 2, W, H, 0x6FE09A, 0).setDepth(70);
    this.lapTint = this.add.rectangle(W / 2, H / 2, W, H, 0x1E1330, 0).setDepth(2);
    this.flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0).setDepth(80);
    this.fpsText = this.flags.fps ? this.add.bitmapText(6, 6, 'pixfont', '', 16).setDepth(99) : null;

    this.cameras.main.setBackgroundColor(0x2A2159);
    this.scale.on('resize', this.onResize, this);
    this.events.on('shutdown', () => { try { this.cut.end(); } catch (e) { /* ignore */ } this.scale.off('resize', this.onResize, this); this.unsub && this.unsub.forEach((f) => f()); });

    // bus wiring
    this.unsub = [
      app.bus.on('pause_toggle', (v) => this.setPaused(v ?? !this.paused)),
      app.bus.on('restart', (o) => this.scene.restart(o || this.startData)),
      app.bus.on('settings_changed', () => { this.fx.reduceFlash = app.save.settings.reduceFlash; }),
      app.bus.on('finish_run', () => { if (!this.ended) this.finishRun(); }),
    ];
    app.input.onPause = () => app.bus.emit('pause_request');

    // power debug flag
    if (this.flags.power) { const k = this.flags.power; this.sim.power = { kind: k, t: 99, total: 99, warned: true }; }

    this.introT = this.startData.intro ? 0 : 99;
    this.introDrop = 0;
    app.bus.emit('run_start', { world: this.sim.world, lap: this.sim.lap, mode: this.sim.mode, name: app.save.settings.unicornName || 'Uni' });
    app.bus.emit('world_card', { world: this.sim.world, lap: this.sim.lap, first: true });
    this.hud(true);
    this.sky.setTexture(`sky_w${this.sim.world}`);
    this.glow.setTexture(`glow_w${this.sim.world}`);
    this.streaks.setTexture(`streaks_w${this.sim.world}`);
    this.visWorld = this.sim.world;
  }

  // ------------------------------------------------------------------ setup helpers
  buildSky() {
    const { W, H } = this;
    this.sky = this.add.tileSprite(0, 0, W, H, 'sky_w1').setOrigin(0, 0).setDepth(0);
    this.skyB = this.add.tileSprite(0, 0, W, H, 'sky_w1').setOrigin(0, 0).setDepth(0.5).setAlpha(0);
    this.streaks = this.add.tileSprite(0, 0, W, H, 'streaks_w1').setOrigin(0, 0).setDepth(1);
    this.streaksB = this.add.tileSprite(0, 0, W, H, 'streaks_w1').setOrigin(0, 0).setDepth(1.05).setVisible(false);
    this.glow = this.add.image(W, 0, 'glow_w1').setOrigin(1, 0).setDepth(1.2);
    this.seamGfx = this.add.graphics().setDepth(13);
    this.moon = this.add.image(Math.round(W * 0.78), Math.round(H * 0.14), 'prop_w4_0').setDepth(2.5).setAlpha(0);
  }

  onResize(size) {
    const W = size.width, H = size.height;
    this.W = W; this.H = H; this.groundY = H - CFG.FLOOR_H;
    if (this.sim) this.sim.bossDist = Math.max(300, Math.min(560, W - 120 - CFG.PLAYER_X));
    for (const s of [this.sky, this.skyB, this.streaks, this.streaksB]) s.setSize(W, H);
    this.glow.setX(W);
    for (const r of [this.slowTint, this.lapTint, this.flash]) r.setPosition(W / 2, H / 2).setSize(W, H);
    this.moon.setPosition(Math.round(W * 0.78), Math.round(H * 0.14));
  }

  setPaused(v) {
    this.paused = v;
    if (v) { this.anims.pauseAll(); this.app.audio && this.app.audio.pauseMusic && this.app.audio.pauseMusic(true); }
    else { this.anims.resumeAll(); this.app.input.clear(); this.app.audio && this.app.audio.pauseMusic && this.app.audio.pauseMusic(false); }
  }

  worldVis(x) {
    const s = this.sim;
    if (s.gateIsPortal() && x >= s.gateX()) return s.nextWorldNum();
    return s.worldAt(x).world;
  }

  setSkyTex(obj, prefix, w) {
    const k = prefix + w;
    if (obj.texture.key !== k) obj.setTexture(k);
  }

  // the world gate on screen, if any: where it is and which world lies on each side
  computeSeam(camX) {
    const s = this.sim, W = this.W;
    let b = null;
    const g = s.gateX();
    if (s.gateIsPortal() && g - camX < W + 120) b = g;
    for (const m of s.worldMap) if (m.x > -1e8 && m.x - camX > -40 && m.x - camX < W + 120) b = m.x;
    if (b == null) return null;
    return { id: Math.round(b), x: Math.round(b - camX), left: this.worldVis(b - 2), right: this.worldVis(b + 2) };
  }

  // shimmering rainbow veil standing in the gate, plus drifting sparkles: reads as a portal into the next world
  drawSeam(seam, dt) {
    const g = this.seamGfx;
    g.clear();
    if (!seam || seam.x < -30 || seam.x > this.W + 30) return;
    const H = this.H, gy = this.groundY, x = seam.x, t = this.t;
    const cols = RAINBOW_HEX;
    // wide dithered halo
    for (let i = 0; i < 6; i++) {
      const c = cols[i];
      const w = 3 + (i % 2);
      for (let y = 0; y < gy + 6; y += 4) {
        const wob = Math.round(Math.sin(y * 0.045 + t * 5 + i) * 3);
        g.fillStyle(c, 0.9).fillRect(x - 9 + i * 3 + wob, y, w, 4);
      }
    }
    for (let k = 1; k <= 5; k++) {
      g.fillStyle(0xFFF7C8, 0.07 * (6 - k)).fillRect(x - 9 - k * 6, 0, 6, gy);
      g.fillStyle(0xFFF7C8, 0.05 * (6 - k)).fillRect(x + 9 + (k - 1) * 6, 0, 6, gy);
    }
    // portal glow filling the arch with the colours of the world on the other side
    const base = gy + 8, R = 140;
    const rc = WORLDS[seam.right].sky, c1 = parseInt(rc[2].slice(1), 16), c2 = parseInt(rc[3].slice(1), 16);
    for (let dy = 0; dy < R; dy += 3) {
      const hw = Math.floor(Math.sqrt(R * R - dy * dy));
      const a = 0.3 + 0.18 * Math.sin(t * 3 + dy * 0.05);
      g.fillStyle(c1, a).fillRect(x - hw, base - dy - 3, hw * 2, 3);
    }
    for (let k = 0; k < 3; k++) {
      const r = ((t * 46 + k * 47) % 140);
      for (let dy = 0; dy < r; dy += 3) {
        const hw0 = Math.sqrt(Math.max(0, r * r - dy * dy)), hw1 = Math.sqrt(Math.max(0, (r - 6) * (r - 6) - dy * dy));
        const edge = Math.max(2, Math.floor(hw0 - hw1));
        g.fillStyle(0xFFFFFF, 0.5 * (1 - r / 140)).fillRect(x - Math.floor(hw0), base - dy - 3, edge, 3).fillRect(x + Math.floor(hw0) - edge, base - dy - 3, edge, 3);
      }
      g.fillStyle(0xFFFFFF, 0.5 * (1 - r / 140)).fillRect(x - Math.floor(r), base - Math.floor(r) - 3, Math.floor(r) * 2, 3);
    }
    this.seamT = (this.seamT || 0) - dt;
    if (this.seamT <= 0 && x > 0 && x < this.W) {
      this.seamT = 0.035;
      this.fx.emit({ x: x + (Math.random() - 0.5) * 18, y: 10 + Math.random() * (gy - 20), key: Math.random() < 0.5 ? 'px_spark' : 'px_star', vx: -20 + Math.random() * 60, vy: 14 + Math.random() * 20, life: 0.9, tint: RAINBOW_HEX[Math.floor(Math.random() * 6)], twinkle: true, screen: true, scale: 0.8 + Math.random() * 0.6, depth: 15 });
    }
  }

  // ------------------------------------------------------------------ frame loop
  // A render or logic error must never freeze the game: log it, keep going, and after a long streak leave
  // for the results screen so the player is never stuck.
  update(time, delta) {
    try { this.updateInner(time, delta); this.errStreak = 0; } catch (err) {
      this.errStreak = (this.errStreak || 0) + 1;
      if (this.errStreak <= 3) console.error(err);
      if (this.errStreak === 1) this.recoverView();
      if (this.errStreak === 45 && !this.ended) { try { this.finishRun(); } catch (e2) { /* ignore */ } }
    }
  }

  // put every overlay back to neutral so a failed frame can never leave the screen dark
  recoverView() {
    try {
      if (this.cut && this.cut.on) this.cut.end();
      this.flash.setAlpha(0); this.slowTint.setAlpha(this.sim.power && this.sim.power.kind === 'slow' ? 0.14 : 0);
      this.anims.resumeAll(); this.cameras.main.setScroll(0, 0);
    } catch (e) { /* ignore */ }
  }

  updateInner(time, delta) {
    const app = this.app;
    const dt = Math.min(delta, 100) / 1000;
    this.t += dt;
    if (this.paused) return;
    // intro: the unicorn drops in from the title sky
    if (this.introT < 1.1) { this.introUpdate(dt); }
    if (this.cut.on) { this.cut.update(dt); this.fx.update(dt, this.camX || 0, this.groundY); return; }
    if (this.slowmoT > 0) this.slowmoT -= dt;
    this.acc += dt * (this.flags.ff || 1) * (this.slowmoT > 0 ? 0.45 : 1);
    let steps = 0;
    const maxSteps = this.flags.ff ? 400 : 6;
    while (this.acc >= CFG.TICK && steps < maxSteps) {
      const inp = this.bot ? this.bot.act(this.sim) : app.input.sample();
      if (this.introT < 0.9) { /* no steps during the drop */ } else this.sim.step(this.flags.god ? { ...inp } : inp);
      if (this.flags.god) { this.sim.p.invul = 1; }
      this.acc -= CFG.TICK; steps++;
      this.tickCount++;
      this.afterStep();
    }
    if (steps === maxSteps) this.acc = 0;
    const alpha = this.acc / CFG.TICK;
    this.render(alpha, dt);
  }

  introUpdate(dt) {
    this.introT += dt;
    const u = Math.min(1, this.introT / 0.9);
    this.introDrop = -Math.round(this.H * 0.9 * (1 - u) * (1 - u));
    this.player.setVisible(true);
    if (this.introT >= 0.9 && !this.entered) { this.entered = true; this.introDrop = 0; this.fx.dust(CFG.PLAYER_X + this.sim.camX, 0, 7, -1); this.app.bus.emit('sfx', { name: 'land' }); this.playerAnimKey = null; }
  }

  afterStep() {
    const sim = this.sim;
    this.trail.push({ x: sim.x, h: sim.p.y, c: sim.p.crouch });
    if (this.trail.length > 46) this.trail.shift();
    for (const e of sim.drainEvents()) this.onEvent(e);
    if (sim.hitstop > 0 && !this._hs) { this._hs = true; this.anims.pauseAll(); }
    if (sim.hitstop <= 0 && this._hs) { this._hs = false; if (!this.paused) this.anims.resumeAll(); }
  }

  // ------------------------------------------------------------------ events -> juice
  onEvent(e) {
    const s = this.sim, fx = this.fx, app = this.app;
    const px = s.x, py = s.p.y;
    app.bus.emit('sim_event', e);
    switch (e.type) {
      case 'jump': fx.dust(px, 0, 3, -1); break;
      case 'land': fx.dust(px, 0, Math.min(8, 3 + Math.floor(e.impact / 250)), -1); this.landT = 0.1; break;
      case 'crouch_start': this.crouchInT = 0.08; break;
      case 'coin': fx.burst(e.x, e.y, 'px_star', 4, 130, 0.45, { tint: [GOLD, 0xFFF7B0], g: -200, scale: 0.8, twinkle: true }); break;
      case 'perfect': fx.floatText(px + 70, 150, this.app.i18n.t('call.perfect'), { tint: 0xFFE23A, big: true, life: 1.1 }); fx.burst(px + 60, 120, 'px_star', 14, 230, 0.8, { tint: RAINBOW_HEX, g: -260 }); break;
      case 'streak': this.rainbowSky(); break;
      case 'power_start': this.powerFx(e); break;
      case 'power_end': this.player.clearTint(); this.slowTint.setAlpha(0); this.clearGhosts(); this.auraGfx.clear(); break;
      case 'heart_get': fx.burst(e.x, e.y, 'px_heart', 8, 200, 0.8, { tint: 0xFF5C70, g: -150 }); fx.floatText(px + 60, 140, this.app.i18n.t('call.heart'), { tint: 0xFF9EC7, life: 1.1 }); break;
      case 'block_hit': fx.burst(e.x, e.y + 20, 'px_spark', 8, 200, 0.6, { tint: [GOLD, 0xffffff], g: -300 }); this.bump(e.id); break;
      case 'checkpoint': this.fx.burst(e.x + 20, 80, 'px_star', 22, 320, 1, { tint: RAINBOW_HEX, g: -200, twinkle: true }); this.fx.floatText(e.x + 60, 150, this.app.i18n.t('cp.saved'), { tint: 0xFFE23A, big: true, life: 1.4 }); this.flashScreen(0xFFF3C8, 0.25); break;
      case 'revive': this.onRevive(); break;
      case 'boss_start': this.flashScreen(0xFF4D5E, 0.5); this.shakeNow(4, 0.6); fx.floatText(this.W / 2, 120, this.app.i18n.t('boss.warn'), { screen: true, sx: this.W / 2, sy: 120, big: true, tint: 0xFF5C70, life: 1.7 }); break;
      case 'boss_ready': fx.floatText(this.W / 2, 100, this.app.i18n.t('boss.hint'), { screen: true, sx: this.W / 2, sy: 100, tint: 0xFFFFFF, life: 3.2 }); break;
      case 'boss_shoot': this.bossShootT = 0.28; fx.burst(s.x + s.boss.sx - 30, 90, 'px_star', 4, 160, 0.4, { tint: e.good ? 0xFFE23A : 0x9D6BFF, g: 0 }); break;
      case 'orb_reflect': fx.burst(e.x, e.y, 'px_star', 12, 300, 0.7, { tint: [0xFFE23A, 0xFFFFFF, 0xFF9EC7], g: -150 }); fx.burst(e.x, e.y, 'px_ring', 1, 0, 0.35, { scale: 0.8, scale1: 5, tint: 0xFFE23A, g: 0 }); this.shakeNow(2, 0.1); fx.floatText(e.x, e.y + 30, '+100', { tint: 0xFFE23A }); break;
      case 'orb_hit_boss': fx.burst(e.x, e.y, 'px_star', 16, 360, 0.8, { tint: RAINBOW_HEX, g: -200 }); this.shakeNow(5, 0.25); this.flashScreen(0xFFFFFF, 0.4); break;
      case 'boss_phase': fx.floatText(this.W / 2, 100, this.app.i18n.t('call.wave'), { screen: true, sx: this.W / 2, sy: 100, tint: 0xFFE23A, big: true, life: 1.2 }); break;
      case 'boss_defeat': this.shakeNow(6, 2.2); this.flashScreen(0xFFFFFF, 0.6); break;
      case 'boss_gone': fx.floatText(this.W / 2, 110, this.app.i18n.t('boss.win'), { screen: true, sx: this.W / 2, sy: 110, big: true, tint: 0xFFE23A, life: 2 }); fx.burst(s.x + 200, 160, 'px_star', 40, 420, 1.4, { tint: RAINBOW_HEX, g: -240, twinkle: true }); this.rainbowSky && this.rainbowSky(); break;
      case 'milestone': this.waveT = 0.9; fx.floatText(px + 80, 170, this.app.i18n.t('call.wave'), { tint: 0xFFE23A, big: true, life: 1.2 }); fx.burst(px, 70, 'px_star', 10, 240, 0.8, { tint: RAINBOW_HEX, g: -200 }); break;
      case 'stomp': this.enemyDeath(e); this.stompT = 0.28; fx.burst(e.x, e.y, 'px_star', 8, 260, 0.6, { tint: [GOLD, 0xffffff, 0xFFC2E0], g: -320 }); fx.burst(e.x, e.y, 'px_ring', 1, 0, 0.35, { scale: 0.8, scale1: 4, g: 0 }); fx.floatText(e.x, e.y + 40, `+${e.pts}`, { tint: 0xFFF4DC }); this.shakeNow(2, 0.1); break;
      case 'pop': fx.burst(e.x, e.y, 'px_star', 10, 260, 0.7, { tint: RAINBOW_HEX, g: -280 }); if (!e.silent) fx.floatText(e.x, e.y + 30, `+${e.pts}`, { tint: 0xFFE23A }); break;
      case 'hit': this.hitT = 0.4; this.shakeNow(e.easy ? 2 : 4, 0.18); fx.burst(px, py + 70, 'px_star', 6, 190, 0.7, { tint: GOLD, g: -200 }); fx.floatText(px + 20, py + 90, this.app.i18n.t('call.ouch'), { tint: 0xFFFFFF }); this.flashScreen(0xffffff, 0.35); break;
      case 'fall_gap': this.shakeNow(3, 0.2); break;
      case 'rescue_start': break;
      case 'world_enter': this.onWorldEnter(e); break;
      case 'lap': fx.floatText(px + 80, 170, this.app.i18n.t('call.lap'), { tint: 0xFFE23A, big: true, life: 1.4 }); break;
      case 'game_over': this.finishRun(); break;
      default: break;
    }
  }

  shakeNow(px, dur) { if (this.app.save.settings.reduceShake) return; this.shake = Math.max(this.shake, px); this.shakeT = dur; }
  flashScreen(color, a) { if (this.app.save.settings.reduceFlash) a *= 0.25; this.flash.setFillStyle(color, 1).setAlpha(a); this.tweens.add({ targets: this.flash, alpha: 0, duration: 140 }); }
  bump(id) { const e = this.sim.entities.find((q) => q.kind === 'block' && q.used); if (e) e.bumpT = 0.15; }

  rainbowSky() {
    const arc = this.add.graphics().setDepth(4);
    const W = this.W, H = this.H, cx = W / 2, cy = this.groundY + 80;
    RAINBOW_HEX.forEach((c, i) => { arc.lineStyle(7, c, 0.85); arc.beginPath(); arc.arc(cx, cy, 250 - i * 7, Math.PI, Math.PI * 2, false); arc.strokePath(); });
    arc.setAlpha(0);
    this.tweens.add({ targets: arc, alpha: 1, duration: 500, yoyo: true, hold: 5500, onComplete: () => arc.destroy() });
    this.fx.floatText(this.sim.x + 100, 190, this.app.i18n.t('call.perfect'), { tint: 0xFFE23A, big: true, life: 1.2 });
  }

  powerFx(e) {
    const fx = this.fx, k = e.kind;
    const col = k === 'fast' ? GOLD : k === 'slow' ? 0x6FE09A : 0xFF5C70;
    fx.burst(e.x, e.y, 'px_ring', 1, 0, 0.5, { scale: 1, scale1: 7, tint: col, g: 0 });
    fx.burst(this.sim.x, this.sim.p.y + 40, 'px_star', 14, 280, 0.8, { tint: k === 'inv' ? RAINBOW_HEX : col, g: -240 });
    if (!this.flags.nocut && !this.flags.ff && !this.flags.autoplay) {
      const t = (key) => this.app.i18n.t(key);
      this.cut.start(k, t(k === 'fast' ? 'call.fast' : k === 'slow' ? 'call.slow' : 'call.inv'), t('cut.' + k), CFG.PLAYER_X, Math.round(this.groundY - this.sim.p.y - 40));
    } else {
      fx.floatText(this.sim.x + 90, 190, this.app.i18n.t(k === 'fast' ? 'call.fast' : k === 'slow' ? 'call.slow' : 'call.inv'), { tint: col, big: true, life: 1.3 });
      this.flashScreen(col, k === 'fast' ? 0.5 : 0.3);
    }
    if (k === 'slow') this.slowTint.setAlpha(0.14);
  }

  onWorldEnter(e) {
    const w = e.world;
    this.visWorld = w;
    this.lapTint.setAlpha(Math.min(0.25, (e.lap - 1) * 0.1));
    this.app.bus.emit('world_card', { world: w, lap: e.lap });
    const px = this.sim.x, fx = this.fx;
    // crossing the gate: slow motion beat, colour ring, rainbow star burst, soft flash
    this.slowmoT = 0.5;
    fx.burst(px, this.sim.p.y + 40, 'px_ring', 3, 0, 0.7, { scale: 1, scale1: 14, tint: [0xFFE23A, 0xFF9EC7, 0x7AC8FF], g: 0 });
    fx.burst(px + 40, this.sim.p.y + 60, 'px_star', 44, 460, 1.3, { tint: RAINBOW_HEX, g: -220, spin: 1, twinkle: true });
    this.flashScreen(0xFFF3C8, 0.45);
    this.shake = 3; this.shakeT = 0.25;
  }

  onRevive() {
    this.fx.clear(); this.clearGhosts(); this.trail = [];
    for (const k of ['far', 'mid', 'near']) this.par[k].clear();
    this.hitT = 0; this.stompT = 0; this.landT = 0; this.playerAnimKey = null;
    if (this.cut.on) this.cut.end();
    this.player.clearTint();
    this.flashScreen(0xFFFFFF, 0.7);
    this.shakeNow(3, 0.3);
    this.fx.burst(this.sim.x, 80, 'px_heart', 14, 260, 1, { tint: [0xFF5C70, 0xFF9EC7], g: -120 });
    this.fx.floatText(this.W / 2, 110, this.app.i18n.t('cp.revive'), { screen: true, sx: this.W / 2, sy: 110, big: true, tint: 0xFFFFFF, life: 1.8 });
    this.hud(true);
  }

  finishRun() {
    if (this.ended) return;
    this.ended = true;
    const s = this.sim;
    const summary = { score: s.score, meters: s.meters, coins: s.coins, stomps: s.stomps, perfects: s.perfects, world: s.maxWorld, lap: s.maxLap, mode: s.mode, name: this.app.save.settings.unicornName || 'Uni', seed: s.seed };
    this.time.delayedCall(s.dying > 0 || s.over ? 1100 : 0, () => this.app.bus.emit('run_over', summary));
    if (s.mode === 'normal' ? Math.random() < 0.22 : Math.random() < 0.5) this.time.delayedCall(1500, () => { if (this.thor) { this.thor.spr.destroy(); this.thor = null; } this.spawnThor('visit'); });
  }

  hud(force) {
    const s = this.sim;
    if (!force && this.t - this.lastHud < 0.08) return;
    this.lastHud = this.t;
    this.app.bus.emit('hud', {
      score: s.score, meters: s.meters, lives: s.lives, mode: s.mode, coins: s.coins,
      power: s.power ? { kind: s.power.kind, t: s.power.t, total: s.power.total } : null,
      world: s.world, lap: s.lap, progress: s.progress(), speed: s.speed,
    });
  }

  // ------------------------------------------------------------------ rendering
  render(alpha, dt) {
    const s = this.sim, p = s.p;
    const groundY = this.groundY, W = this.W, H = this.H;
    const camX = Math.round(lerp(s.prevX, s.x, alpha)) - CFG.PLAYER_X;
    this.camX = camX;
    // camera shake
    let sx = 0, sy = 0;
    if (this.shakeT > 0) { this.shakeT -= dt; const m = this.shake; sx = Math.round((Math.random() - 0.5) * 2 * m); sy = Math.round((Math.random() - 0.5) * 2 * m); if (this.shakeT <= 0) this.shake = 0; }
    this.cameras.main.setScroll(sx, sy);

    // sky layers drift. When a world gate is on screen the new world's sky, streaks and sun begin at the gate.
    const tp = camX * 0.04 + this.t * 6;
    this.sky.tilePositionX = 0; this.skyB.tilePositionX = 0;
    const seam = this.seam = this.computeSeam(camX);
    const cur = seam ? seam.left : this.worldVis(camX + W / 2);
    this.setSkyTex(this.sky, 'sky_w', cur); this.setSkyTex(this.streaks, 'streaks_w', cur);
    if (seam) {
      const sx = Math.max(0, Math.min(W, seam.x));
      this.setSkyTex(this.skyB, 'sky_w', seam.right); this.setSkyTex(this.streaksB, 'streaks_w', seam.right);
      const wB = Math.floor(W - sx);
      if (wB >= 2) {
        this.skyB.setVisible(true).setAlpha(1).setPosition(sx, 0).setSize(wB, H);
        this.streaksB.setVisible(true).setPosition(sx, 0).setSize(wB, H);
      } else { this.skyB.setVisible(false); this.streaksB.setVisible(false); }
      this.streaksB.tilePositionX = Math.round(tp) - sx; this.streaksB.tilePositionY = Math.round(this.t * 3);
      this.setSkyTex(this.glow, 'glow_w', seam.x < W - 40 ? seam.right : seam.left);
    } else {
      this.skyB.setVisible(false); this.streaksB.setVisible(false);
      this.setSkyTex(this.glow, 'glow_w', cur);
    }
    this.streaks.tilePositionX = Math.round(tp); this.streaks.tilePositionY = Math.round(this.t * 3);
    this.drawSeam(seam, dt);
    // world moon (world 4)
    const w4 = (seam ? (seam.x < W * 0.5 ? seam.right : seam.left) : this.worldVis(camX + W / 2)) === 4;
    this.moon.setAlpha(lerp(this.moon.alpha, w4 ? 1 : 0, 0.05));
    // parallax
    const wv = (x) => this.worldVis(x);
    this.par.far.update(camX, W, groundY, wv, this.t, seam);
    this.par.mid.update(camX, W, groundY, wv, this.t, seam);
    this.par.near.update(camX, W, groundY, wv, this.t, seam);

    this.renderGate(camX);
    this.renderFloor(camX);
    this.renderEntities(camX);
    this.renderBoss(dt);
    this.renderPlayer(alpha, dt, camX);
    this.renderTrail(camX, alpha);
    this.updateDeaths(dt, camX);
    this.updateThor(dt);
    this.ambient(dt, camX);
    this.fx.update(dt, camX, groundY);
    this.hud(false);
    if (this.fpsText) this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} fps`);
    if (this.flags.hitboxes) this.debugBoxes(camX);
    if (this.introT > 0.9 && this.sim.p.invul > 0 && !this.sim.rescue) this.blinkT += dt;
  }

  renderGate(camX) {
    const s = this.sim;
    const gx = s.gateX();
    const x = Math.round(gx - camX);
    const vis = s.gateIsPortal() && x > -260 && x < this.W + 260;
    this.gate.setVisible(vis);
    if (vis) this.gate.setPosition(x, this.groundY + 8);
  }

  renderFloor(camX) {
    const s = this.sim, groundY = this.groundY, H = this.H, W = this.W;
    const gate = s.gateX();
    const segs = [];
    for (const sp of s.floor) {
      const a = Math.max(sp.x0, camX - 16), b = Math.min(sp.x1, camX + W + 16);
      if (b <= a) continue;
      if (s.gateIsPortal() && a < gate && b > gate) {
        // a sliver under one pixel wide must never reach a TileSprite (a zero-size texture breaks WebGL)
        if (gate - a >= 1) segs.push([a, gate, this.worldVis(a)]);
        if (b - gate >= 1) segs.push([gate, b, s.nextWorldNum()]);
      } else if (b - a >= 1) segs.push([a, b, this.worldVis(a + 1)]);
    }
    const wa = this.app.worldAssets.worlds;
    while (this.floorViews.length < segs.length) {
      this.floorViews.push({ top: this.add.tileSprite(0, 0, 8, 8, 'floor_w1').setOrigin(0, 0).setDepth(10), fill: this.add.rectangle(0, 0, 8, 8, 0xffffff).setOrigin(0, 0).setDepth(9.5) });
    }
    this.drawEdges(camX);
    this.floorViews.forEach((v, i) => {
      const seg = segs[i];
      if (!seg) { v.top.setVisible(false); v.fill.setVisible(false); return; }
      const [a, b, w] = seg;
      const t = wa[w].tiles;
      const key = `floor_w${w}`;
      if (v.top.texture.key !== key) v.top.setTexture(key);
      const x = Math.round(a - camX), width = Math.max(1, Math.round(b - a));
      const y = groundY - t.surface;
      v.top.setVisible(true).setPosition(x, y).setSize(width, t.floor[1]);
      v.top.tilePositionX = Math.round(a) % t.floor[0];
      const fy = y + t.floor[1];
      if (fy < H) v.fill.setVisible(true).setPosition(x, fy - 1).setSize(width, H - fy + 2).setFillStyle((t.bottom[0] << 16) | (t.bottom[1] << 8) | t.bottom[2], 1);
      else v.fill.setVisible(false);
    });
  }

  // A gap just lets the background show through. Only the cut ends of the floor get a thin dark outline so they
  // read as clean edges. Drawn from the real floor spans, so it never pops in or out while the gap is on screen.
  drawEdges(camX) {
    if (!this.pitGfx) { this.pitGfx = this.add.graphics().setDepth(10.5); }
    const g = this.pitGfx, s = this.sim, H = this.H, W = this.W;
    g.clear();
    for (const sp of s.floor) {
      const t = this.app.worldAssets.worlds[this.worldVis(Math.max(sp.x0, Math.min(sp.x1 - 1, camX + W / 2)))].tiles;
      const top = this.groundY - t.surface;
      const xl = Math.round(sp.x0 - camX), xr = Math.round(sp.x1 - camX);
      if (xl > 2 && xl < W + 4) g.fillStyle(0x1E1330, 1).fillRect(xl, top, 2, H - top);
      if (xr > -4 && xr < W - 2) g.fillStyle(0x1E1330, 1).fillRect(xr - 2, top, 2, H - top);
    }
  }

  spriteFor(e, key, meta) {
    let st = this.sprites.get(e.id);
    if (!st) {
      st = { spr: this.add.sprite(0, 0, key), kind: key };
      this.sprites.set(e.id, st);
    }
    return st;
  }

  play(st, key, ignoreIfPlaying = true) {
    if (st.cur === key) return;
    st.cur = key;
    const m = this.app.meta[key];
    st.spr.setTexture(key);
    st.spr.setOrigin(m.pivot[0] / m.cell[0], m.pivot[1] / m.cell[1]);
    st.spr.play(key, ignoreIfPlaying);
  }

  renderEntities(camX) {
    const s = this.sim, groundY = this.groundY, W = this.W;
    const seen = new Set();
    const t = this.t;
    this.flagGfx.clear();
    for (const e of s.entities) {
      if (!e.alive && e.kind !== 'hz') continue;
      if (e.kind === 'plat') { seen.add('p' + e.id); this.renderPlatform(e, camX); continue; }
      const x = Math.round(e.x - camX);
      if (x < -200 || x > W + 200) continue;
      seen.add(e.id);
      if (!e.alive && !(e.kind === 'hz' && e.state === 'shell')) continue;
      if (e.kind === 'coin') {
        const st = this.spriteFor(e, 'candy_coin_spin'); st.spr.setDepth(22);
        this.play(st, 'candy_coin_spin'); st.spr.setPosition(x, Math.round(groundY - e.y));
      } else if (e.kind === 'pick') {
        const key = e.pk === 'heart' ? 'ui_heart_full' : e.pk === 'fast' ? 'candy_yellow' : e.pk === 'slow' ? 'candy_green' : 'candy_red';
        const st = this.spriteFor(e, key); st.spr.setDepth(23);
        if (e.pk !== 'heart') this.play(st, key); else if (st.cur !== key) { st.cur = key; st.spr.setTexture(key); st.spr.setOrigin(0.5); }
        const bob = Math.round(Math.sin(t * 4 + e.id) * 4);
        st.spr.setPosition(x, Math.round(groundY - e.y - bob));
        if (!st.halo) st.halo = true;
        if (Math.random() < 0.05) this.fx.emit({ x: e.x + (Math.random() - 0.5) * 30, y: e.y + (Math.random() - 0.5) * 30 + bob, key: 'px_spark', life: 0.4, tint: e.pk === 'fast' ? GOLD : e.pk === 'slow' ? 0xBFF5CF : e.pk === 'inv' ? 0xFFC2CB : 0xFF9EC7, scale: 0.8, twinkle: true });
      } else if (e.kind === 'block') {
        const key = e.used ? 'block_empty' : 'block_idle';
        const st = this.spriteFor(e, key); st.spr.setDepth(21);
        this.play(st, key);
        let by = 0; if (e.bumpT > 0) { e.bumpT -= 1 / 60; by = Math.round(Math.sin((0.15 - e.bumpT) / 0.15 * Math.PI) * 8); }
        st.spr.setPosition(x, Math.round(groundY - e.y - 16 - by));
      } else if (e.kind === 'hz') {
        this.renderHazard(e, x, camX);
      } else if (e.kind === 'proj') {
        this.renderProj(e, x);
      } else if (e.kind === 'flag') {
        this.drawFlag(e, x);
      }
    }
    // remove sprites of entities that vanished
    for (const [id, st] of this.sprites) {
      if (!seen.has(id)) { st.spr.destroy(); if (st.extra) st.extra.destroy(); this.sprites.delete(id); }
    }
    for (const [id, v] of this.platViews) {
      if (!seen.has('p' + id)) { for (const o of v) o.destroy(); this.platViews.delete(id); }
    }
  }

  renderPlatform(e, camX) {
    const w = this.worldVis(e.x);
    const key = `platform_w${w}`;
    let v = this.platViews.get(e.id);
    if (!v) {
      v = [this.add.image(0, 0, key, 'l').setOrigin(0, 0).setDepth(12), this.add.tileSprite(0, 0, 8, 8, key, 'm').setOrigin(0, 0).setDepth(12), this.add.image(0, 0, key, 'r').setOrigin(0, 0).setDepth(12)];
      this.platViews.set(e.id, v);
    }
    const th = v[0].height;
    const left = Math.round(e.x - e.w / 2 - camX), y = Math.round(this.groundY - e.y - 6);
    v[0].setPosition(left, y);
    v[1].setPosition(left + 26, y).setSize(e.w - 52, th);
    v[2].setPosition(left + e.w - 26, y);
  }

  renderHazard(e, x, camX) {
    const groundY = this.groundY, t = this.t, s = this.sim;
    const dxp = e.x - s.x;
    let key = null, ox = 0, oy = 0, flip = false, depth = 20;
    const by = e.by || 0;
    switch (e.type) {
      case 'sf': key = dxp < 150 && dxp > -20 && s.p.y > 20 ? 'slime_flat_lookup' : 'slime_flat_idle'; oy = 0; break;
      case 'ss': case 'ssh': key = 'slime_spiky_idle'; oy = by; if (e.type === 'ssh' && by > 2) key = 'slime_spiky_hop'; break;
      case 'fly': key = (Math.floor(t * 0.7 + e.id) % 3 === 0 && dxp < 330) ? 'snake_fly_tongue' : 'snake_fly_slither'; flip = true; oy = e.y + by - 30 + 30; break;
      case 'hang': return this.renderHang(e, x);
      case 'snail': key = e.state === 'shell' ? 'snail_hide' : 'snail_crawl'; break;
      case 'beeH': case 'beeL': key = e.state === 'idle' ? 'bee_fly' : 'bee_dizzy'; oy = e.y + by - 21; break;
      case 'owl': key = e.state === 'sleep' ? 'owl_sleep' : e.state === 'wake' ? 'owl_wake' : (e.st > 1.7 ? 'owl_yawn' : 'owl_glide'); oy = e.y - 25; if (e.state === 'sleep' || e.state === 'wake') oy = e.y - 25; break;
      case 'storm': return this.renderStorm(e, x);
      case 'crab': key = e.pose === 'warn' ? 'crab_warn' : 'crab_walk'; break;
      case 'wheel': key = 'wheel_roll'; oy = 20; break;
      case 'ghost': key = dxp < 170 && dxp > -60 ? 'ghost_boo' : 'ghost_float'; oy = e.y + by; break;
      case 'penguin': key = e.state === 'slide' ? 'penguin_slide' : 'penguin_wobble'; flip = true; break;
      case 'invader': key = dxp < 160 && dxp > -60 ? 'invader_zap' : 'invader_hover'; oy = e.y + by; break;
      case 'jelly': key = dxp < 120 && dxp > -80 ? 'jelly_giggle' : 'jelly_bob'; oy = e.y + by - 34; break;
      default: return;
    }
    if (!key) return;
    const st = this.spriteFor(e, key);
    st.spr.setDepth(depth).setFlipX(flip).setAlpha(1);
    this.play(st, key);
    if (e.type === 'snail' && e.state === 'shell') st.spr.setAlpha(Math.min(1, e.st * 3));
    if (e.type === 'owl' && (e.state === 'sleep' || e.state === 'wake') && !st.extra) {
      st.extra = this.add.image(0, 0, 'prop_w1_5').setDepth(19).setOrigin(0.5, 0.2).setAlpha(0.95);
    }
    st.spr.setPosition(x + ox, Math.round(groundY - oy));
    if (st.extra) st.extra.setPosition(x, Math.round(groundY - e.y + 6));
    if (e.type === 'ssh') st.spr.setPosition(x, Math.round(groundY - by));
    if (e.type === 'fly') st.spr.setPosition(x + 14, Math.round(groundY - (e.y + by)));
    if (e.type === 'jelly') st.spr.setPosition(x, Math.round(groundY - (e.y + by) ));
  }

  // checkpoint flag: a grey pennant until you pass it, then a waving rainbow one
  drawFlag(e, x) {
    const g = this.flagGfx, gy = this.groundY, t = this.t;
    g.fillStyle(0x1E1330, 1).fillRect(x - 2, gy - 78, 5, 80);
    g.fillStyle(0xFFF4DC, 1).fillRect(x - 1, gy - 78, 2, 80);
    g.fillStyle(0xFFE23A, 1).fillRect(x - 4, gy - 82, 9, 6);
    const cols = e.on ? RAINBOW_HEX : [0xA79BC8, 0x9588B8, 0xA79BC8, 0x9588B8, 0xA79BC8, 0x9588B8];
    for (let i = 0; i < 6; i++) {
      const w = 34 - i * 2;
      const wave = Math.round(Math.sin(t * (e.on ? 7 : 2) + i * 0.7) * (e.on ? 3 : 1));
      g.fillStyle(cols[i], 1).fillRect(x + 3, gy - 76 + i * 5 + wave * 0, w, 5);
      g.fillStyle(cols[i], 1).fillRect(x + 3 + w, gy - 76 + i * 5 + wave, 3, 5);
    }
    if (e.on && Math.random() < 0.2) this.fx.emit({ x: e.x + 10 + Math.random() * 30, y: 20 + Math.random() * 60, key: 'px_spark', life: 0.5, tint: RAINBOW_HEX[Math.floor(Math.random() * 6)], twinkle: true, scale: 0.8 });
  }

  renderProj(e, x) {
    const key = e.good ? 'orb_good' : 'orb_bad';
    const st = this.spriteFor(e, key);
    st.spr.setDepth(24);
    this.play(st, key);
    const pulse = e.good ? 1 + Math.sin(this.t * 10) * 0.08 : 1;
    st.spr.setScale((e.ret ? 2.1 : 1.4) * pulse).setPosition(x, Math.round(this.groundY - e.y));
    if (e.good && Math.random() < (e.ret ? 0.7 : 0.25)) this.fx.emit({ x: e.x + (Math.random() - 0.5) * 24, y: e.y + (Math.random() - 0.5) * 24, key: 'px_spark', life: 0.4, tint: e.ret ? 0xFFFFFF : 0xFFE23A, twinkle: true, scale: 0.8 });
    if (!e.good && Math.random() < 0.3) this.fx.emit({ x: e.x + 10, y: e.y + (Math.random() - 0.5) * 16, key: 'px_dot2', life: 0.3, tint: 0x9D6BFF, vx: 60, g: 0 });
  }

  renderBoss(dt) {
    const b = this.sim.boss, s = this.sim;
    if (!this.bossSpr) {
      this.bossSpr = this.add.sprite(0, 0, 'boss_queen_idle').setDepth(18).setVisible(false);
      this.bossGfx = this.add.graphics().setDepth(61);
      this.bossName = this.add.bitmapText(0, 0, 'pixfont', '', 16).setOrigin(0.5).setDepth(62).setVisible(false);
      this.bossShootT = 0;
    }
    if (!b || b.state === 'gone') { this.bossSpr.setVisible(false); this.bossGfx.clear(); this.bossName.setVisible(false); return; }
    if (this.bossShootT > 0) this.bossShootT -= dt;
    let anim = 'idle';
    if (b.state === 'dying') anim = 'defeat'; else if (b.hurtT > 0) anim = 'hurt'; else if (this.bossShootT > 0) anim = 'shoot'; else if (b.windup > 0) anim = 'windup';
    const key = `boss_${b.kind}_${anim}`;
    const spr = this.bossSpr;
    if (spr.texture.key !== key || !spr.visible) {
      const m = this.app.meta[key];
      spr.setTexture(key).setVisible(true).play(key);
      spr.setOrigin(m.pivot[0] / m.cell[0], m.pivot[1] / m.cell[1]);
    }
    const bx = Math.round(CFG.PLAYER_X + b.sx);
    const bob = Math.sin(this.t * 2.2) * 5;
    const hover = b.kind === 'king' ? 34 + bob : 4 + bob * 0.3;
    let y = this.groundY - (b.state === 'dying' ? hover * Math.max(0, 1 - b.t / 1.6) : hover);
    let x = bx;
    if (b.state === 'dying') { x += Math.round((Math.random() - 0.5) * 6); y += Math.round((Math.random() - 0.5) * 4); }
    if (b.hurtT > 0) { x += Math.round(Math.sin(this.t * 80) * 3); }
    spr.setPosition(x, Math.round(y)).setFlipX(false);
    if (b.flash > 0 && Math.floor(this.t * 24) % 2 === 0) spr.setTint(0xFFFFFF).setTintMode(Phaser.TintModes.FILL); else spr.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    // dying: explosions all over the boss
    if (b.state === 'dying') {
      this.bossBoomT = (this.bossBoomT || 0) - dt;
      if (this.bossBoomT <= 0) {
        this.bossBoomT = 0.09;
        const wx = s.x + b.sx + (Math.random() - 0.5) * 90, wy = (this.groundY - y) + 20 + Math.random() * 90;
        this.fx.burst(wx, wy, 'px_star', 5, 240, 0.7, { tint: [0xFFE23A, 0xFF9EC7, 0xFFFFFF, 0x7AC8FF], g: -200 });
        this.fx.burst(wx, wy, 'px_ring', 1, 0, 0.4, { scale: 0.6, scale1: 4, tint: 0xFFE23A, g: 0 });
      }
    }
    // health bar
    const g = this.bossGfx; g.clear();
    if (b.state !== 'enter') {
      const n = b.max, segW = Math.max(6, Math.min(16, Math.floor(200 / n))), gap = 2;
      const total = n * (segW + gap) - gap, x0 = Math.round(this.W / 2 - total / 2), y0 = 58;
      g.fillStyle(0x1E1330, 1).fillRect(x0 - 3, y0 - 3, total + 6, 14);
      const col = b.kind === 'queen' ? 0xFF7AB8 : 0x5FE6F5;
      for (let i = 0; i < n; i++) {
        const on = i < b.hp;
        g.fillStyle(on ? col : 0x4A3A6E, 1).fillRect(x0 + i * (segW + gap), y0, segW, 8);
        if (on) g.fillStyle(0xFFFFFF, 0.5).fillRect(x0 + i * (segW + gap), y0, segW, 2);
      }
      this.bossName.setVisible(true).setText(this.app.i18n.t('boss.' + b.kind)).setPosition(Math.round(this.W / 2), y0 - 10);
    } else this.bossName.setVisible(false);
  }

  renderHang(e, x) {
    const st = this.spriteFor(e, 'snake_hang_drop');
    st.spr.setDepth(20);
    const top = Math.round(this.groundY - HANG_TOP_H);
    const dxp = e.x - this.sim.x;
    let key = 'snake_hang_drop', frame = 0;
    let wob = 0;
    if (e.state === 'wait') { key = 'snake_hang_drop'; this.holdFrame(st, key, 0); }
    else if (e.state === 'warn') { this.holdFrame(st, key, 0); wob = Math.round(Math.sin(this.t * 60) * 1.5); }
    else if (e.state === 'drop') { this.play(st, 'snake_hang_drop'); }
    else if (dxp < -30) { this.play(st, 'snake_hang_pout'); }
    else if (dxp < 220 && Math.floor(this.t * 1.4 + e.id) % 4 === 0) { this.play(st, 'snake_hang_tongue'); }
    else this.play(st, 'snake_hang_sway');
    st.spr.setPosition(x + wob, top);
  }

  holdFrame(st, key, f) {
    if (st.cur !== key + ':h') {
      st.cur = key + ':h';
      const m = this.app.meta[key];
      st.spr.anims.stop();
      st.spr.setTexture(key, f);
      st.spr.setOrigin(m.pivot[0] / m.cell[0], m.pivot[1] / m.cell[1]);
    }
  }

  renderStorm(e, x) {
    const key = e.state === 'idle' ? 'storm_float' : e.state === 'charge' ? 'storm_charge' : e.state === 'zap' ? 'storm_zap' : 'storm_sigh';
    const st = this.spriteFor(e, key);
    st.spr.setDepth(20);
    this.play(st, key);
    st.spr.setPosition(x, Math.round(this.groundY - e.y + Math.sin(this.t * 2 + e.id) * 3));
    if (!st.extra) { st.extra = this.add.image(0, 0, 'bolt').setOrigin(0.5, 0).setDepth(19).setVisible(false); st.pud = this.add.graphics().setDepth(11); }
    const zap = e.state === 'zap';
    st.extra.setVisible(zap);
    if (zap) { const top = Math.round(this.groundY - e.y + 20); st.extra.setPosition(x, top).setCrop(0, 0, 24, Math.max(8, this.groundY - top + 4)); if (!st.zapped) { st.zapped = true; this.shakeNow(3, 0.12); this.flashScreen(0xFFF3A8, 0.35); this.app.bus.emit('sfx', { name: 'zap' }); } }
    st.pud.clear();
    if (e.state === 'puddle' || zap) {
      const pu = Math.floor(this.t * 10) % 2;
      st.pud.fillStyle(0x7F63C9, 1).fillRect(x - 26, this.groundY - 6, 52, 6).fillStyle(0xFFE23A, 1).fillRect(x - 20 + pu * 4, this.groundY - 6, 6, 2).fillRect(x + 6 - pu * 4, this.groundY - 4, 8, 2).fillStyle(0xFFF3A8, 1).fillRect(x - 4, this.groundY - 5, 4, 2);
    }
  }

  renderPlayer(alpha, dt, camX) {
    const s = this.sim, p = s.p, spr = this.player;
    const sy = this.groundY - lerp(p.prevY, p.y, alpha);
    spr.setPosition(CFG.PLAYER_X, Math.round(sy + (this.introDrop || 0)));
    this.updateShadow(p, s);
    if (this.hitT > 0) this.hitT -= dt;
    if (this.stompT > 0) this.stompT -= dt;
    if (this.landT > 0) this.landT -= dt;
    if (this.waveT > 0) this.waveT -= dt;
    if (this.crouchInT > 0) this.crouchInT -= dt;
    let key;
    if (s.dying > 0 || s.over) key = this.ended || s.over ? 'unicorn_tired_loop' : 'unicorn_tired_in';
    else if (s.rescue) key = 'unicorn_respawn';
    else if (this.hitT > 0) key = 'unicorn_hit';
    else if (this.stompT > 0) key = 'unicorn_stomp';
    else if (this.waveT > 0 && p.onGround && !p.crouch) key = 'unicorn_celebrate';
    else if (this.thorHappy) key = 'unicorn_celebrate';
    else if (!p.onGround) key = p.vy > 260 ? 'unicorn_jump_rise' : p.vy > -200 ? 'unicorn_jump_apex' : (p.fastFall ? 'unicorn_fast_fall' : 'unicorn_fall');
    else if (this.landT > 0) key = 'unicorn_land';
    else if (p.crouch) key = this.crouchInT > 0 ? 'unicorn_crouch_enter' : 'unicorn_crouch_run';
    else key = s.power && s.power.kind === 'fast' ? 'unicorn_run_fast' : 'unicorn_run';
    if (this.playerAnimKey !== key) {
      this.playerAnimKey = key;
      spr.play(key, true);
      const m = this.app.meta[key];
      spr.setOrigin(m.pivot[0] / m.cell[0], m.pivot[1] / m.cell[1]);
    }
    // run cycle speed is capped: faster than about 2.2 cycles a second reads as a blur, not as running
    const fastRun = key === 'unicorn_run_fast';
    spr.anims.timeScale = fastRun ? 0.8 : key.includes('run') ? Math.min(1.1, Math.max(0.8, s.speed / 270)) * (s.power && s.power.kind === 'slow' ? 0.85 : 1) : 1;
    this.squashStretch(spr, p, s, dt, key);
    // blink while invulnerable
    if (p.invul > 0 && !s.rescue && s.dying <= 0) spr.setAlpha(this.app.save.settings.reduceFlash ? 0.7 : (Math.floor(this.blinkT * 20) % 2 ? 0.35 : 1)); else spr.setAlpha(1);
    // power looks
    const pw = s.power;
    if (pw && pw.kind === 'inv') spr.setTint(RAINBOW_HEX[Math.floor(this.t * 14) % RAINBOW_HEX.length]);
    else if (pw && pw.kind === 'fast') spr.setTint(Math.floor(this.t * 12) % 2 ? 0xFFFFFF : 0xFFF3A8);
    else if (pw && pw.kind === 'slow') spr.setTint(0xD6FFE4);
    else spr.clearTint();
    if (pw && pw.kind === 'inv' && Math.random() < 0.5) this.fx.emit({ x: s.x - 10 + Math.random() * 20, y: p.y + 30 + Math.random() * 40, key: 'px_star', tint: RAINBOW_HEX[Math.floor(Math.random() * 6)], life: 0.5, vy: -30, scale: 0.8, twinkle: true });
    if (pw && pw.kind === 'fast') { this.speedLineT -= dt; if (this.speedLineT <= 0) { this.speedLineT = 0.03; this.fx.emit({ x: Math.random() * this.W, y: 20 + Math.random() * (this.groundY - 20), key: 'px_line', vx: -1500, life: 0.18, screen: true, scale: 1 + Math.random() * 3, tint: 0xFFF7B0, fade: true }); } }
    if (pw && (pw.kind === 'slow' || pw.kind === 'fast')) { this.ghostT = (this.ghostT || 0) - dt; if (this.ghostT <= 0) { this.ghostT = pw.kind === 'fast' ? 0.045 : 0.07; this.ghost(spr, pw.kind === 'fast' ? 0xFFE23A : 0x6FE09A); } }
    this.drawAura(spr, pw, dt);
    // rescue cloud
    if (s.rescue) { this.rescueCloud.setVisible(true).setPosition(CFG.PLAYER_X, Math.round(sy + 12)).setDepth(29); if (this.rescueCloud.anims.currentAnim?.key !== 'rescue_bob') this.rescueCloud.play('rescue_bob'); }
    else this.rescueCloud.setVisible(false);
    if (this.rescueCloud.visible) this.rescueCloud.setOrigin(0.5, 0.2);
    this.updateGhosts(dt);
  }

  // lasting transformation look while a power runs: lightning and afterimages, a time bubble, a rainbow star halo
  drawAura(spr, pw, dt) {
    const g = this.auraGfx; g.clear();
    if (!pw || this.sim.dying > 0 || this.sim.over) return;
    const cx = Math.round(spr.x), cy = Math.round(spr.y - 36), t = this.t;
    const warn = pw.t < 1.5 && Math.floor(t * 10) % 2 === 0;
    if (pw.kind === 'slow') {
      const R = 46;
      for (let dy = -R; dy <= R; dy += 2) {
        const hw = Math.floor(Math.sqrt(R * R - dy * dy));
        const edge = Math.abs(dy) > R - 7 ? hw : 2;
        g.fillStyle(0x6FE09A, warn ? 0.2 : 0.55).fillRect(cx - hw, cy + dy, edge, 2).fillRect(cx + hw - edge, cy + dy, edge, 2);
        g.fillStyle(0xD6FFE4, 0.12).fillRect(cx - hw + edge, cy + dy, Math.max(0, hw * 2 - edge * 2), 2);
      }
      g.fillStyle(0xFFFFFF, 0.7).fillRect(cx - 28, cy - 30, 8, 3).fillRect(cx - 32, cy - 24, 3, 8);
    } else if (pw.kind === 'inv') {
      for (let i = 0; i < 6; i++) {
        const a = t * 3 + i * Math.PI / 3, r = 38 + Math.sin(t * 4 + i) * 4;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.9;
        g.fillStyle(RAINBOW_HEX[i], warn ? 0.4 : 1).fillRect(Math.round(x) - 3, Math.round(y) - 1, 7, 3).fillRect(Math.round(x) - 1, Math.round(y) - 3, 3, 7);
      }
    } else if (pw.kind === 'fast') {
      this.boltT = (this.boltT || 0) - dt;
      if (this.boltT <= 0) {
        this.boltT = 0.06;
        this.fx.emit({ x: this.sim.x + (Math.random() - 0.5) * 50, y: this.sim.p.y + 10 + Math.random() * 60, key: 'px_zig', tint: Math.random() < 0.5 ? 0xFFE23A : 0xFFFFFF, life: 0.18, scale: 1 + Math.random(), vx: -60, fade: true });
      }
    }
  }

  ghost(spr, tint = 0x6FE09A) {
    const g = this.add.sprite(spr.x, spr.y, spr.texture.key, spr.frame.name).setOrigin(spr.originX, spr.originY).setDepth(28).setTint(tint).setAlpha(0.5).setScale(spr.scaleX, spr.scaleY);
    this.ghosts.push({ g, wx: this.sim.x, y: spr.y, age: 0 });
  }
  clearGhosts() { for (const q of this.ghosts) q.g.destroy(); this.ghosts.length = 0; }

  updateGhosts(dt) {
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const q = this.ghosts[i];
      q.age += dt;
      if (q.age > 0.35) { q.g.destroy(); this.ghosts.splice(i, 1); continue; }
      q.g.setPosition(Math.round(q.wx - this.camX), q.y).setAlpha(0.45 * (1 - q.age / 0.35));
    }
  }

  renderTrail(camX, alpha) {
    const g = this.gfx, s = this.sim;
    g.clear();
    if (this.introT < 0.9 || s.dying > 0 || s.over) return;
    const full = s.power && (s.power.kind === 'fast' || s.power.kind === 'inv');
    const tr = this.trail, n = tr.length;
    if (n < 3) return;
    // screen-space polyline of the path, then resampled by arc length with bands offset along the normal
    // so a jump draws a smooth ribbon that follows the arc instead of flat horizontal bars
    const useN = Math.min(n, full ? 46 : 36);
    const pts = [];
    for (let i = n - useN; i < n; i++) {
      const q = tr[i];
      pts.push([Math.round(q.x - camX), this.groundY - q.h - (q.c ? 22 : 36)]);
    }
    const bands = full ? 6 : 4, th = 3;
    const colors = full ? RAINBOW_HEX : [RAINBOW_HEX[0], RAINBOW_HEX[2], RAINBOW_HEX[4], RAINBOW_HEX[5]];
    const total = pts.length;
    let acc = 0, segLen = [];
    for (let i = 1; i < total; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segLen.push(l); acc += l; }
    if (acc < 2) return;
    const step = 2;
    let run = 0, sample = 0;
    for (let i = 1; i < total; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const l = segLen[i - 1];
      if (l <= 0) continue;
      // tangent smoothed over neighbours
      const pa = pts[Math.max(0, i - 3)], pb = pts[Math.min(total - 1, i + 1)];
      let tx = pb[0] - pa[0], ty = pb[1] - pa[1];
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const nx = -ty, ny = tx;
      while (sample < run + l) {
        const u = (sample - run) / l;
        const px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u;
        const life = sample / acc;
        if (life > 0.04) {
          const taper = Math.min(1, 0.4 + life * 0.8);
          const wob = Math.sin(sample * 0.07 + this.t * 10) * (full ? 2.4 : 1.4) * (1 - life * 0.3);
          const tb = Math.max(2, Math.round(bands * taper));
          g.fillStyle(0xFFFFFF, 0);
          for (let k = 0; k < tb; k++) {
            const col = colors[Math.min(colors.length - 1, Math.floor(k * colors.length / tb))];
            const off = (k - (tb - 1) / 2) * th + wob;
            g.fillStyle(col, Math.min(1, life * 1.7));
            g.fillRect(Math.round(px + nx * off - 1), Math.round(py + ny * off - 1), th, th);
          }
          if (full && (Math.floor(sample / 2) % 11) === 0 && life > 0.3) { g.fillStyle(0xFFFFFF, life); g.fillRect(Math.round(px + nx * (bands * th * 0.7)), Math.round(py + ny * (bands * th * 0.7)), 2, 2); }
        }
        sample += step;
      }
      run += l;
    }
  }

  updateShadow(p, s) {
    // shadow stays on the floor under the player and shrinks and fades with height, hidden over gaps
    let under = false;
    for (const f of s.floor) if (s.x >= f.x0 && s.x <= f.x1) { under = true; break; }
    const h = Math.max(0, p.y);
    const k = Math.max(0.35, 1 - h / 330);
    const w = p.crouch ? 0.85 : 1;
    this.shadow.setVisible(under && !s.rescue && s.dying <= 0).setPosition(CFG.PLAYER_X - 2, this.groundY + 1).setScale(k * w * 0.95, k).setAlpha(0.3 + 0.3 * k);
  }

  // squash and stretch, forward lean and a run bob layered over the sprite frames
  squashStretch(spr, p, s, dt, key) {
    const q = this.sq;
    let tx = 1, ty = 1, tl = 0;
    if (!p.onGround) {
      const v = Math.max(-1, Math.min(1, p.vy / 700));
      ty = 1 + 0.12 * Math.abs(v); tx = 1 - 0.07 * Math.abs(v);
      tl = -v * 0.12;
      q.airT += dt;
    } else if (this.landT > 0) { ty = 0.86; tx = 1.12; q.airT = 0; }
    else if (p.crouch) { ty = 0.94; tx = 1.05; tl = 0.05; q.airT = 0; }
    else if (key.includes('run')) {
      const fi = spr.anims.currentFrame ? spr.anims.currentFrame.index : 1;
      const n = key === 'unicorn_run_fast' ? 4 : 8;
      const step = Math.abs(Math.sin((fi - 1) / n * Math.PI * 2));   // two bounces per cycle, one per step
      ty = 1 + 0.03 * step - 0.01; tl = 0.05 + 0.02 * step; q.airT = 0; q.lift = Math.round(step * 3);
    }
    if (this.stompT > 0) { ty = 1.12; tx = 0.92; }
    if (this.hitT > 0) { tx = 1.1; ty = 0.9; }
    const kk = 1 - Math.pow(0.0005, dt);
    q.x += (tx - q.x) * kk; q.y += (ty - q.y) * kk; q.lean += (tl - q.lean) * kk;
    spr.setScale(q.x, q.y);
    if (p.onGround && key.includes('run') && q.lift) spr.y -= q.lift;
    if (!(p.onGround && key.includes('run'))) q.lift = 0;
    spr.setRotation(s.dying > 0 || s.over || s.rescue ? 0 : q.lean);
    // sliding crouch: kicks up a trail of dust and sugar
    if (p.onGround && p.crouch && s.dying <= 0) {
      q.slideT = (q.slideT || 0) - dt;
      if (q.slideT <= 0) { q.slideT = 0.05; this.fx.dust(s.x - 18, 0, 2, -1); if (Math.random() < 0.4) this.fx.emit({ x: s.x - 20, y: 6 + Math.random() * 12, key: 'px_spark', life: 0.35, tint: 0xFFF7B0, twinkle: true, vx: -90, scale: 0.7 }); }
    }
    // footfall dust on the run cycle
    if (p.onGround && key.includes('run') && s.dying <= 0) {
      const fi = spr.anims.currentFrame ? spr.anims.currentFrame.index : 0;
      if (fi !== q.lastFoot) {
        q.lastFoot = fi;
        if (fi === 1 || fi === 5) this.fx.dust(s.x - 12, 0, 1, -1);
      }
    } else q.lastFoot = -1;
  }

  ambient(dt, camX) {
    const w = this.worldVis(camX + this.W / 2);
    const kind = WORLDS[w].ambient;
    this.ambientT -= dt;
    if (this.ambientT > 0) return;
    const W = this.W, g = this.groundY, fx = this.fx;
    if (kind === 'wisp') { this.ambientT = 0.5; fx.emit({ x: W + 10, y: 20 + Math.random() * (g - 140), key: 'px_puff', vx: -40 - Math.random() * 30, life: 8, scale: 0.8 + Math.random(), tint: 0xFFE6F3, fade: false, screen: true, depth: 2.2 }); }
    else if (kind === 'sparkle') { this.ambientT = 0.12; fx.emit({ x: Math.random() * W, y: 10 + Math.random() * (g - 60), key: 'px_spark', life: 1.2, tint: RAINBOW_HEX[Math.floor(Math.random() * 6)], twinkle: true, screen: true, scale: 0.8, depth: 2.4 }); }
    else if (kind === 'sugar') { this.ambientT = 0.1; fx.emit({ x: Math.random() * W, y: -4, key: 'px_dot2', vy: 40 + Math.random() * 40, vx: -30, life: 5, tint: [0xFF9EC7, 0xFFE23A, 0x6FE09A, 0x7AC8FF][Math.floor(Math.random() * 4)], screen: true, fade: false, depth: 7 }); }
    else if (kind === 'stars') { this.ambientT = 0.08; fx.emit({ x: Math.random() * W, y: 4 + Math.random() * (g - 80), key: 'px_dot2', life: 1.4, tint: 0xFFF3A8, twinkle: true, screen: true, depth: 2.4 }); if (Math.random() < 0.012) fx.emit({ x: W * 0.8, y: 30 + Math.random() * 60, vx: -420, vy: -150, key: 'px_star', life: 1.1, tint: 0xFFF3A8, screen: true, scale: 1.2, depth: 2.6 }); }
    else if (kind === 'rain') { this.ambientT = 0.02; fx.emit({ x: Math.random() * (W + 80), y: -6, key: 'px_drop', vx: -260, vy: 520, life: 0.9, tint: [0x7AC8FF, 0xFF9EC7, 0xFFE23A][Math.floor(Math.random() * 3)], screen: true, fade: false, depth: 7 }); if (Math.random() < 0.004 && !this.app.save.settings.reduceFlash) { this.flashScreen(0xE9E0FB, 0.18); } }
    else if (kind === 'bubbles') { this.ambientT = 0.18; fx.emit({ x: Math.random() * W, y: g - 4, key: 'px_bubble', vy: -(30 + Math.random() * 30), vx: -20, life: 3, tint: 0xFFFFFF, screen: true, fade: true, g: 0, depth: 7 }); }
    else if (kind === 'snow') { this.ambientT = 0.06; fx.emit({ x: Math.random() * (W + 60), y: -4, key: 'px_dot2', vy: 55 + Math.random() * 30, vx: -45, life: 4.5, tint: 0xFFFFFF, screen: true, fade: false, depth: 7 }); }
    else if (kind === 'neon') { this.ambientT = 0.1; fx.emit({ x: Math.random() * W, y: g - 2, key: Math.random() < 0.5 ? 'px_spark' : 'px_dot3', vy: -(50 + Math.random() * 40), vx: -30, life: 2.2, tint: [0x5FE6F5, 0xFF4FA8, 0xFFE23A][Math.floor(Math.random() * 3)], screen: true, twinkle: true, g: 0, depth: 7 }); }
    else if (kind === 'stardust') { this.ambientT = 0.1; fx.emit({ x: W + 4, y: Math.random() * g, key: 'px_spark', vx: -90, life: 3, tint: 0xF2DCFF, twinkle: true, screen: true, scale: 0.8, depth: 2.4 }); }
  }

  enemyDeath(e) {
    const spr = { slime_flat: 'slime_flat_stomped', bee: 'bee_dizzy', crab: 'crab_dizzy', penguin: 'penguin_dizzy', ghost: 'ghost_dizzy' }[e.kind] || null;
    if (!spr) return;
    const m = this.app.meta[spr];
    const s = this.add.sprite(0, 0, spr).setDepth(19).setOrigin(m.pivot[0] / m.cell[0], m.pivot[1] / m.cell[1]);
    s.play(spr);
    const flyer = e.kind === 'bee' || e.kind === 'ghost';
    const wx = e.x, h0 = flyer ? 40 : 0;
    this.deaths = this.deaths || [];
    this.deaths.push({ s, wx, h0, age: 0, bee: flyer });
  }

  updateDeaths(dt, camX) {
    if (!this.deaths) return;
    for (let i = this.deaths.length - 1; i >= 0; i--) {
      const d = this.deaths[i];
      d.age += dt;
      if (d.age > 0.7) { d.s.destroy(); this.deaths.splice(i, 1); continue; }
      const up = d.bee ? d.age * 160 - d.age * d.age * 260 : 0;
      d.s.setPosition(Math.round(d.wx - camX + (d.bee ? d.age * 90 : 0)), Math.round(this.groundY - d.h0 - up)).setAlpha(d.age > 0.4 ? 1 - (d.age - 0.4) / 0.3 : 1);
    }
  }

  // ---- Thor (the family's boxer): background cameo in world 1 and a visit when the run ends
  spawnThor(mode) {
    if (this.thor) return;
    const spr = this.add.sprite(-60, this.groundY - 2, 'thor_run').setDepth(mode === 'visit' ? 31 : 7);
    const m = this.app.meta.thor_run;
    spr.setOrigin(m.pivot[0] / m.cell[0], m.pivot[1] / m.cell[1]).play('thor_run');
    this.thor = { spr, mode, t: 0, barked: false, state: 'run' };
    this.app.save.data.stats.thor++;
  }

  updateThor(dt) {
    const T = this.thor;
    const s = this.sim;
    if (!T) {
      if (!this.ended && this.introT > 0.9 && s.world === 1 && s.lap === 1) {
        this.thorTimer -= dt;
        if (this.thorTimer <= 0 && Math.random() < 0.18) this.spawnThor('cameo');
        if (this.thorTimer <= 0) this.thorTimer = 9999;
      }
      return;
    }
    T.t += dt;
    const spr = T.spr;
    const setAnim = (key) => { if (T.cur !== key) { T.cur = key; const m = this.app.meta[key]; spr.setOrigin(m.pivot[0] / m.cell[0], m.pivot[1] / m.cell[1]); spr.play(key, true); } };
    if (T.mode === 'cameo') {
      if (T.state === 'run') { spr.x += 140 * dt; setAnim('thor_run'); if (!T.barked && spr.x > this.W * 0.45) { T.state = 'bark'; T.bt = 0; T.barked = true; this.app.bus.emit('sfx', { name: 'bark' }); } }
      else { T.bt += dt; setAnim('thor_bark'); if (T.bt > 0.55) T.state = 'run'; }
      if (spr.x > this.W + 80) { spr.destroy(); this.thor = null; }
    } else {
      const tx = CFG.PLAYER_X - 86;
      if (T.state === 'run') { spr.x += 220 * dt; setAnim('thor_run'); if (spr.x >= tx) { spr.x = tx; T.state = 'sit'; T.st = 0; this.thorHappy = true; } }
      else { T.st += dt; setAnim(T.st < 0.5 ? 'thor_sit' : 'thor_lick'); if (T.st > 0.5 && !T.barked) { T.barked = true; this.app.bus.emit('sfx', { name: 'bark' }); } }
    }
    spr.setPosition(Math.round(spr.x), Math.round(this.groundY - 2));
  }

  debugBoxes(camX) {
    const g = this.dbg, s = this.sim; g.clear();
    const draw = (b, col) => { g.lineStyle(1, col, 1); g.strokeRect(Math.round(b.x - camX), Math.round(this.groundY - b.y - b.h), b.w, b.h); };
    draw(s.playerBox(), 0x00ff00);
    for (const e of s.entities) { if (e.kind === 'hz') for (const b of s.boxesOf(e)) draw(b, 0xff0000); if (e.kind === 'floor') continue; }
  }
}
