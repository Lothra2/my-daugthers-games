// Gameplay scene: renders the deterministic core with interpolation, plus all the juice.
import { Sim } from '../core/sim.js';
import { CFG } from '../core/config.js';
import { ReactiveBot } from '../core/bot.js';
import { makeRng } from '../core/rng.js';
import { WORLDS } from '../data/worlds.js';
import { Fx, RAINBOW_HEX } from './fx.js';
import { Parallax } from './parallax.js';

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
    this.bot = this.flags.autoplay ? new ReactiveBot({ lead: 0.27, jitter: 0.08, rng: makeRng(seed) }) : null;
    this.acc = 0; this.t = 0; this.tickCount = 0;
    this.paused = false; this.ended = false; this.entered = false;
    this.shake = 0; this.shakeT = 0;
    this.hitT = 0; this.stompT = 0; this.landT = 0; this.crouchInT = 0; this.blinkT = 0;
    this.trail = [];
    this.ghosts = [];
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
    this.fx.reduceFlash = app.save.settings.reduceFlash;

    // player
    this.player = this.add.sprite(CFG.PLAYER_X, this.groundY, 'unicorn_run').setDepth(30).setOrigin(48 / 96, 92 / 96);
    this.player.play('unicorn_run');
    this.rescueCloud = this.add.sprite(0, 0, 'rescue_bob').setDepth(29).setVisible(false);
    this.rescueCloud.play('rescue_bob');
    this.shadow = this.add.rectangle(0, 0, 36, 4, 0x1E1330, 0.25).setDepth(11);

    // overlays
    this.slowTint = this.add.rectangle(W / 2, H / 2, W, H, 0x6FE09A, 0).setDepth(70);
    this.lapTint = this.add.rectangle(W / 2, H / 2, W, H, 0x1E1330, 0).setDepth(2);
    this.flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0).setDepth(80);
    this.fpsText = this.flags.fps ? this.add.bitmapText(6, 6, 'pixfont', '', 16).setDepth(99) : null;

    this.cameras.main.setBackgroundColor(0x2A2159);
    this.scale.on('resize', this.onResize, this);
    this.events.on('shutdown', () => { this.scale.off('resize', this.onResize, this); this.unsub && this.unsub.forEach((f) => f()); });

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
    this.glow = this.add.image(W, 0, 'glow_w1').setOrigin(1, 0).setDepth(1.2);
    this.moon = this.add.image(Math.round(W * 0.78), Math.round(H * 0.14), 'prop_w4_0').setDepth(2.5).setAlpha(0);
  }

  onResize(size) {
    const W = size.width, H = size.height;
    this.W = W; this.H = H; this.groundY = H - CFG.FLOOR_H;
    for (const s of [this.sky, this.skyB, this.streaks]) s.setSize(W, H);
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
    if (x >= s.gateX()) return s.nextWorldNum();
    return s.worldAt(x).world;
  }

  // ------------------------------------------------------------------ frame loop
  update(time, delta) {
    const app = this.app;
    const dt = Math.min(delta, 100) / 1000;
    this.t += dt;
    if (this.paused) return;
    // intro: the unicorn drops in from the title sky
    if (this.introT < 1.1) { this.introUpdate(dt); }
    this.acc += dt * (this.flags.ff || 1);
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
    if (this.tickCount % 2 === 0) {
      this.trail.push({ x: sim.x, h: sim.p.y, c: sim.p.crouch });
      if (this.trail.length > 34) this.trail.shift();
    }
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
      case 'power_end': this.player.clearTint(); this.slowTint.setAlpha(0); break;
      case 'heart_get': fx.burst(e.x, e.y, 'px_heart', 8, 200, 0.8, { tint: 0xFF5C70, g: -150 }); fx.floatText(px + 60, 140, this.app.i18n.t('call.heart'), { tint: 0xFF9EC7, life: 1.1 }); break;
      case 'block_hit': fx.burst(e.x, e.y + 20, 'px_spark', 8, 200, 0.6, { tint: [GOLD, 0xffffff], g: -300 }); this.bump(e.id); break;
      case 'stomp': this.stompT = 0.28; fx.burst(e.x, e.y, 'px_star', 8, 260, 0.6, { tint: [GOLD, 0xffffff, 0xFFC2E0], g: -320 }); fx.burst(e.x, e.y, 'px_ring', 1, 0, 0.35, { scale: 0.8, scale1: 4, g: 0 }); fx.floatText(e.x, e.y + 40, `+${e.pts}`, { tint: 0xFFF4DC }); this.shakeNow(2, 0.1); break;
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
    fx.floatText(this.sim.x + 90, 190, this.app.i18n.t(k === 'fast' ? 'call.fast' : k === 'slow' ? 'call.slow' : 'call.inv'), { tint: col, big: true, life: 1.3 });
    this.flashScreen(col, k === 'fast' ? 0.5 : 0.3);
    if (k === 'slow') this.slowTint.setAlpha(0.14);
  }

  onWorldEnter(e) {
    const w = e.world;
    this.skyB.setTexture(`sky_w${w}`).setAlpha(0);
    this.tweens.add({ targets: this.skyB, alpha: 1, duration: 2200, onComplete: () => { this.sky.setTexture(`sky_w${w}`); this.skyB.setAlpha(0); } });
    this.glow.setTexture(`glow_w${w}`);
    this.streaks.setTexture(`streaks_w${w}`);
    this.visWorld = w;
    this.lapTint.setAlpha(Math.min(0.25, (e.lap - 1) * 0.1));
    this.app.bus.emit('world_card', { world: w, lap: e.lap });
    const px = this.sim.x;
    this.fx.burst(px + 60, 160, 'px_star', 30, 340, 1.2, { tint: RAINBOW_HEX, g: -200, spin: 1 });
  }

  finishRun() {
    if (this.ended) return;
    this.ended = true;
    const s = this.sim;
    const summary = { score: s.score, meters: s.meters, coins: s.coins, stomps: s.stomps, perfects: s.perfects, world: s.maxWorld, lap: s.maxLap, mode: s.mode, name: this.app.save.settings.unicornName || 'Uni', seed: s.seed };
    this.time.delayedCall(s.dying > 0 || s.over ? 1100 : 0, () => this.app.bus.emit('run_over', summary));
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

    // sky layers drift
    const tp = camX * 0.04 + this.t * 6;
    this.sky.tilePositionX = 0; this.skyB.tilePositionX = 0;
    this.streaks.tilePositionX = Math.round(tp); this.streaks.tilePositionY = Math.round(this.t * 3);
    // world moon (world 4)
    const w4 = this.worldVis(camX + W / 2) === 4;
    this.moon.setAlpha(lerp(this.moon.alpha, w4 ? 1 : 0, 0.05));
    // parallax
    const wv = (x) => this.worldVis(x);
    this.par.far.update(camX, W, groundY, wv, this.t);
    this.par.mid.update(camX, W, groundY, wv, this.t);
    this.par.near.update(camX, W, groundY, wv, this.t);

    this.renderGate(camX);
    this.renderFloor(camX);
    this.renderEntities(camX);
    this.renderPlayer(alpha, dt, camX);
    this.renderTrail(camX, alpha);
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
    const vis = x > -260 && x < this.W + 260;
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
      if (a < gate && b > gate) { segs.push([a, gate, this.worldVis(a)]); segs.push([gate, b, s.nextWorldNum()]); } else segs.push([a, b, this.worldVis(a + 1)]);
    }
    const wa = this.app.worldAssets.worlds;
    while (this.floorViews.length < segs.length) {
      this.floorViews.push({ top: this.add.tileSprite(0, 0, 8, 8, 'floor_w1').setOrigin(0, 0).setDepth(10), fill: this.add.rectangle(0, 0, 8, 8, 0xffffff).setOrigin(0, 0).setDepth(9.5) });
    }
    this.floorViews.forEach((v, i) => {
      const seg = segs[i];
      if (!seg) { v.top.setVisible(false); v.fill.setVisible(false); return; }
      const [a, b, w] = seg;
      const t = wa[w].tiles;
      const key = `floor_w${w}`;
      if (v.top.texture.key !== key) v.top.setTexture(key);
      const x = Math.round(a - camX), width = Math.round(b - a);
      const y = groundY - t.surface;
      v.top.setVisible(true).setPosition(x, y).setSize(width, t.floor[1]);
      v.top.tilePositionX = Math.round(a) % t.floor[0];
      const fy = y + t.floor[1];
      if (fy < H) v.fill.setVisible(true).setPosition(x, fy - 1).setSize(width, H - fy + 2).setFillStyle((t.bottom[0] << 16) | (t.bottom[1] << 8) | t.bottom[2], 1);
      else v.fill.setVisible(false);
    });
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
    this.shadow.setPosition(CFG.PLAYER_X, this.groundY + 1).setVisible(p.onGround || p.y < 200);
    if (this.hitT > 0) this.hitT -= dt;
    if (this.stompT > 0) this.stompT -= dt;
    if (this.landT > 0) this.landT -= dt;
    if (this.crouchInT > 0) this.crouchInT -= dt;
    let key;
    if (s.dying > 0 || s.over) key = this.ended || s.over ? 'unicorn_tired_loop' : 'unicorn_tired_in';
    else if (s.rescue) key = 'unicorn_respawn';
    else if (this.hitT > 0) key = 'unicorn_hit';
    else if (this.stompT > 0) key = 'unicorn_stomp';
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
    spr.anims.timeScale = key.includes('run') ? Math.max(0.75, s.speed / 250) * (s.power && s.power.kind === 'slow' ? 0.9 : 1) : 1;
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
    if (pw && pw.kind === 'slow') { this.ghostT = (this.ghostT || 0) - dt; if (this.ghostT <= 0) { this.ghostT = 0.07; this.ghost(spr); } }
    // rescue cloud
    if (s.rescue) { this.rescueCloud.setVisible(true).setPosition(CFG.PLAYER_X, Math.round(sy + 12)).setDepth(29); if (this.rescueCloud.anims.currentAnim?.key !== 'rescue_bob') this.rescueCloud.play('rescue_bob'); }
    else this.rescueCloud.setVisible(false);
    if (this.rescueCloud.visible) this.rescueCloud.setOrigin(0.5, 0.2);
    if (pw) this.updateGhosts(dt);
  }

  ghost(spr) {
    const g = this.add.sprite(spr.x, spr.y, spr.texture.key, spr.frame.name).setOrigin(spr.originX, spr.originY).setDepth(28).setTint(0x6FE09A).setAlpha(0.5);
    this.ghosts.push({ g, wx: this.sim.x, y: spr.y, age: 0 });
  }
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
    const n = this.trail.length;
    if (n < 2) return;
    const bands = full ? 6 : 3;
    const th = full ? 3 : 2;
    const pts = this.trail;
    for (let i = 0; i < n - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const ax = Math.round(a.x - camX), bx = Math.round(b.x - camX);
      const ay = this.groundY - a.h - (a.c ? 22 : 36), by = this.groundY - b.h - (b.c ? 22 : 36);
      const fade = (i + 1) / n;
      if (fade < 0.12) continue;
      const wob = Math.round(Math.sin(i * 0.5 + this.t * 9) * (full ? 2 : 1));
      for (let k = 0; k < bands; k++) {
        const col = full ? RAINBOW_HEX[k] : RAINBOW_HEX[[0, 2, 4][k]];
        g.fillStyle(col, Math.min(1, fade * 1.3));
        const y = Math.round(lerp(ay, by, 0.5)) + k * th - Math.floor(bands * th / 2) + wob;
        g.fillRect(ax, y, Math.max(2, bx - ax + 2), th);
      }
    }
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
    else if (kind === 'stardust') { this.ambientT = 0.1; fx.emit({ x: W + 4, y: Math.random() * g, key: 'px_spark', vx: -90, life: 3, tint: 0xF2DCFF, twinkle: true, screen: true, scale: 0.8, depth: 2.4 }); }
  }

  debugBoxes(camX) {
    const g = this.dbg, s = this.sim; g.clear();
    const draw = (b, col) => { g.lineStyle(1, col, 1); g.strokeRect(Math.round(b.x - camX), Math.round(this.groundY - b.y - b.h), b.w, b.h); };
    draw(s.playerBox(), 0x00ff00);
    for (const e of s.entities) { if (e.kind === 'hz') for (const b of s.boxesOf(e)) draw(b, 0xff0000); if (e.kind === 'floor') continue; }
  }
}
