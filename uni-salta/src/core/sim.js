// UNI-SALTA deterministic simulation core. No Phaser, no DOM, no Math.random.
// World coordinates: x grows to the right, y is the HEIGHT ABOVE THE FLOOR (up is positive).
import { CFG } from './config.js';
import { makeRng } from './rng.js';
import { CHUNKS } from '../data/patterns.js';

const HAZARDS = new Set(['sf', 'ss', 'ssh', 'fly', 'hang', 'snail', 'beeH', 'beeL', 'owl', 'storm', 'jelly', 'crab', 'wheel', 'ghost', 'penguin', 'invader']);
const KIND = { sf: 'slime_flat', ss: 'slime_spiky', ssh: 'slime_spiky', fly: 'snake_fly', hang: 'snake_hang', snail: 'snail', beeH: 'bee', beeL: 'bee', owl: 'owl', storm: 'storm', jelly: 'jelly', crab: 'crab', wheel: 'wheel', ghost: 'ghost', penguin: 'penguin', invader: 'invader' };

export const TIER_CAP = [1, 2, 3, 4, 4, 5, 5, 5, 5]; // by world
const ARENA = ['arena_coins_01', 'arena_coins_02', 'arena_coins_03'];
export const BOSS_WORLDS = { 6: 'queen', 9: 'king' };   // the boss waits at the end of these worlds

// boss attack cycles: [seconds after cycle start, 'low' | 'high' | 'good', height of a good orb]
const BOSS_CYCLES = [
  [ // phase 1
    [[0, 'low'], [1.2, 'high'], [2.6, 'good', 100]],
    [[0, 'high'], [1.2, 'low'], [2.5, 'good', 110]],
  ],
  [ // phase 2
    [[0, 'low'], [0.95, 'low'], [2.1, 'high'], [3.3, 'good', 100]],
    [[0, 'high'], [1.0, 'low'], [2.0, 'high'], [3.3, 'good', 95]],
  ],
  [ // phase 3
    [[0, 'low'], [0.85, 'high'], [1.7, 'low'], [2.8, 'good', 105], [3.6, 'high']],
    [[0, 'high'], [0.9, 'high'], [1.9, 'low'], [3.0, 'good', 100], [3.8, 'low']],
  ],
];

export class Sim {
  constructor(opts = {}) {
    this.mode = opts.mode || 'normal';        // 'normal' | 'easy'
    this.seed = opts.seed ?? 1;
    this.rng = makeRng(this.seed);
    this.world = opts.world || 1;
    this.lap = opts.lap || 1;
    this.script = opts.script ? [...opts.script] : null;  // forced chunk ids (tests, validator)
    this.fixedSpeed = opts.fixedSpeed || null;
    this.reset();
  }

  clone() {
    const o = Object.create(Sim.prototype);
    const data = structuredClone({ ...this, rng: undefined, events: [] });
    Object.assign(o, data);
    o.rng = makeRng(0);
    o.rng.state = this.rng.state;
    return o;
  }

  reset() {
    this.tick = 0; this.t = 0;
    this.events = [];
    this.over = false; this.dying = 0;
    this.x = CFG.PLAYER_X;
    this.startX = this.x;
    this.prevX = this.x;
    this.worldStartX = this.x;
    this.speed = 0; this.baseSpeed = 0;
    this.lives = CFG.LIVES;
    this.score = 0; this.coins = 0; this.stomps = 0; this.maxWorld = this.world; this.maxLap = this.lap;
    this.meterPaid = 0;
    this.nextMilestone = 1000;
    this.coinsForHeart = 0;
    this.perfectStreak = 0; this.perfects = 0;
    this.stompChain = 0;
    this.p = { y: 0, prevY: 0, vy: 0, onGround: true, crouch: false, fastFall: false, coyote: 0, buffer: 0, invul: 0, jumpHeld: false, rescued: 0 };
    this.power = null;               // {kind, t, total, warned}
    this.rescue = null;              // {}
    this.hitstop = 0;
    this.entities = [];
    this.floor = [];                 // solid floor spans {x0, x1}
    this.nextId = 1;
    this.formations = {};
    this.worldBreather = 2;          // chunks to keep gentle after a world change
    this.afterHit = 0;
    this.sprintGrace = 0;
    this.boss = null; this.gateOverride = null;
    this.gen = { spawnX: this.x - 200, history: [], lastTier: 0, powerDue: 2200, heartCd: 0, formation: 1, count: 0 };
    this.warmup = 1.2;               // seconds before the first hazard can matter
    this.worldMap = [{ x: -1e9, world: this.world, lap: this.lap }];
    this.initialChunks();
    this.update_speed(true);
    this.ensureLevel();
  }

  // ------------------------------------------------------------------ helpers
  emit(type, data = {}) { this.events.push({ type, ...data }); }
  get camX() { return this.x - CFG.PLAYER_X; }
  get meters() { return Math.max(0, Math.floor((this.x - this.startX) / CFG.METER)); }
  worldAt(x) { let r = this.worldMap[0]; for (const w of this.worldMap) if (x >= w.x) r = w; return r; }
  gateX() { return this.gateOverride ?? (this.worldStartX + this.worldLenM() * CFG.METER); }
  nextWorldNum() { return (this.world % CFG.NUM_WORLDS) + 1; }
  bossAtGate() { return !!BOSS_WORLDS[this.world] && this.gateOverride == null; }
  gateIsPortal() { return !this.bossAtGate(); }
  worldAtX(x) { return this.gateIsPortal() && x >= this.gateX() ? this.nextWorldNum() : this.world; }
  worldLenM() { return this.mode === 'easy' ? CFG.EASY_LEN_M : CFG.WORLD_LEN_M[this.world - 1]; }
  worldMeters() { return Math.max(0, (this.x - this.worldStartX) / CFG.METER); }
  progress() { return Math.min(1, this.worldMeters() / this.worldLenM()); }
  tierCap(w = this.world, lap = this.lap) {
    if (this.mode === 'easy') return 1;
    return Math.min(5, TIER_CAP[w - 1] + (lap - 1));
  }

  targetSpeed() {
    let base;
    if (this.mode === 'easy') {
      const [a, b] = CFG.EASY_SPEED;
      base = Math.min(CFG.EASY_CAP, a + (b - a) * (((this.world - 1) + this.progress()) / 6));
    } else {
      const [a, b] = CFG.WORLD_SPEED[this.world - 1];
      base = (a + (b - a) * this.progress()) * Math.pow(CFG.LAP_SPEED_MULT, this.lap - 1);
      base = Math.min(CFG.SPEED_CAP, base);
    }
    return base;
  }

  update_speed(snap = false) {
    this.baseSpeed = this.fixedSpeed || this.targetSpeed();
    let m = 1;
    if (this.power && this.power.kind === 'fast') m = CFG.FAST_MULT;
    if (this.power && this.power.kind === 'slow') m = CFG.SLOW_MULT;
    const tgt = this.baseSpeed * m;
    this.speed = snap ? tgt : this.speed + (tgt - this.speed) * Math.min(1, 6 * CFG.TICK);
  }

  get timeScale() { return this.power && this.power.kind === 'slow' ? CFG.SLOW_MULT : 1; }
  get invincible() { return !!(this.power && this.power.kind === 'inv'); }

  playerBox() {
    const p = this.p;
    const b = p.onGround ? (p.crouch ? CFG.BOX_CROUCH : CFG.BOX_STAND) : CFG.BOX_AIR;
    return { x: this.x - b.w / 2, y: p.y, w: b.w, h: b.h };
  }

  // ------------------------------------------------------------------ level generation
  initialChunks() {
    // a calm opening: floor under the start and a breather chunk
    this.floor.push({ x0: this.x - 400, x1: this.x + 640 });
    this.gen.spawnX = this.x + 640;
    this.placeChunk(CHUNKS.find((c) => c.id === (this.mode === 'easy' ? 'soft_candy_01' : 'breather_line_01')), this.gen.spawnX, false);
  }

  ensureLevel() {
    while (this.gen.spawnX < this.camX + CFG.LOOKAHEAD) {
      const ch = this.pickChunk();
      this.placeChunk(ch, this.gen.spawnX, true);
    }
  }

  pickChunk() {
    if (this.script) {
      const id = this.script.length ? this.script.shift() : 'breather_empty_01';
      return CHUNKS.find((c) => c.id === id);
    }
    const g = this.gen;
    const wx = this.worldAtX(g.spawnX);
    if (!g.gateDone && g.spawnX >= this.gateX() && this.gateIsPortal()) { g.gateDone = true; this.worldBreather = 2; }
    const lapx = wx === 1 && this.world === CFG.NUM_WORLDS ? this.lap + 1 : this.lap;
    if (this.bossAtGate() && g.spawnX >= this.gateX() - 200) { const id = this.rng.pick(ARENA); return CHUNKS.find((c) => c.id === id); }
    const sprint = this.power && this.power.kind === 'fast';
    const needBreather = this.worldBreather > 0 || g.lastTier >= 4 || this.afterHit > 0 || (this.sprintGrace > 0);
    let pool = CHUNKS.filter((c) => c.modes.includes(this.mode) && c.worlds.includes(wx) && !c.tags.includes('arena'));
    if (sprint) {
      pool = CHUNKS.filter((c) => c.tags.includes('sprint'));
    } else {
      pool = pool.filter((c) => !c.tags.includes('sprint'));
      if (needBreather) pool = pool.filter((c) => c.tier === 0);
      else pool = pool.filter((c) => c.tier <= this.tierCap(wx, lapx));
    }
    const recent = g.history.slice(-3);
    let pool2 = pool.filter((c) => !recent.slice(-c.cd).includes(c.id));
    if (pool2.length === 0) pool2 = pool;
    if (pool2.length === 0) pool2 = CHUNKS.filter((c) => c.tier === 0 && !c.tags.includes('sprint') && !c.tags.includes('arena'));
    // prefer tiers near the cap, still keep variety
    const weights = pool2.map((c) => {
      let w = c.weight;
      if (!needBreather && !sprint) w *= 1 + Math.max(0, c.tier - 1) * 0.4 * (this.tierCap(wx, lapx) >= c.tier ? 1 : 0);
      return w;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.rng.next() * total;
    for (let i = 0; i < pool2.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool2[i];
    }
    return pool2[pool2.length - 1];
  }

  spacingFactor() {
    if (this.mode === 'easy') return 1;
    return Math.max(1, Math.min(1.9, (this.fixedSpeed || this.targetSpeed()) / 250));
  }

  placeChunk(ch, x0, countable) {
    const T = CFG.TILE;
    const F = ch.tags.includes('sprint') ? 1 : this.spacingFactor();
    const g = this.gen;
    g.history.push(ch.id);
    g.lastTier = ch.tier;
    g.count++;
    if (countable) {
      if (this.worldBreather > 0) this.worldBreather--;
      if (this.afterHit > 0) this.afterHit--;
      if (this.sprintGrace > 0 && !(this.power && this.power.kind === 'fast')) this.sprintGrace--;
    }
    // floor
    const spans = ch.floor || [[0, ch.len]];
    for (const [a, b] of spans) {
      const s = { x0: x0 + a * F * T, x1: x0 + (b === ch.len ? b * F : b * F) * T };
      const last = this.floor[this.floor.length - 1];
      if (last && Math.abs(last.x1 - s.x0) < 1) last.x1 = s.x1; else this.floor.push(s);
    }
    // power / heart placement
    let power = null;
    g.powerDue -= ch.len * F * T;
    if (ch.powerAt != null && g.powerDue <= 0 && countable) {
      power = this.choosePower();
      g.powerDue = this.rng.range(5200, 8200);
    }
    for (const it of ch.items) this.spawnItem(it, x0, ch, F);
    if (power) {
      const px = x0 + ch.powerAt * F * T;
      this.addEntity({ kind: 'pick', pk: power, x: px, y: 96, spawnT: this.t });
    }
    g.spawnX = x0 + ch.len * F * T;
  }

  choosePower() {
    if (this.lives < CFG.LIVES && this.mode === 'normal' && this.gen.heartCd <= 0 && this.rng.chance(0.3)) {
      this.gen.heartCd = 9;
      return 'heart';
    }
    this.gen.heartCd = Math.max(0, this.gen.heartCd - 1);
    const r = this.rng.next();
    return r < 0.4 ? 'fast' : r < 0.8 ? 'slow' : 'inv';
  }

  addEntity(e) {
    e.id = this.nextId++;
    e.alive = true;
    this.entities.push(e);
    return e;
  }

  spawnItem(it, x0, ch, F = 1) {
    const T = CFG.TILE;
    const x = x0 + it.x * F * T;
    if (it.t === 'coins') return this.spawnCoins(it, x0, F);
    if (it.t === 'plat') return void this.addEntity({ kind: 'plat', x: x + (it.w * T) / 2, w: it.w * T, y: it.h, move: it.move || 0, baseY: it.h });
    if (it.t === 'block') return void this.addEntity({ kind: 'block', x, y: it.h, used: false });
    if (HAZARDS.has(it.t)) {
      const k = KIND[it.t];
      const e = { kind: 'hz', type: it.t, name: k, x, y: 0, state: 'idle', st: 0, age: 0 };
      if (it.t === 'fly') { e.y = 60; e.vx = -55; }
      if (it.t === 'hang') { e.state = 'wait'; }
      if (it.t === 'snail') { e.vx = -22; }
      if (it.t === 'beeH') { e.y = 58; e.vx = -35; }
      if (it.t === 'beeL') { e.y = 24; e.vx = -35; }
      if (it.t === 'owl') { e.y = 200; e.state = 'sleep'; e.x0 = x; }
      if (it.t === 'storm') { e.y = 250; e.state = 'idle'; }
      if (it.t === 'jelly') { e.lv = it.lv || (it.phase >= 3 ? 'low' : 'mid'); e.y = e.lv === 'low' ? 48 : 62; }
      if (it.t === 'ssh') { e.hopT = 0; }
      if (it.t === 'crab') { e.vx = -30; }
      if (it.t === 'wheel') { e.vx = 0; }
      if (it.t === 'ghost') { e.y = 62; e.vx = 0; }
      if (it.t === 'penguin') { e.vx = 0; e.state = 'idle'; }
      if (it.t === 'invader') { e.y = 66; e.vx = 0; }
      this.addEntity(e);
    }
  }

  spawnCoins(it, x0, F = 1) {
    const T = CFG.TILE;
    const pts = [];
    const sp = 44;
    const cx = x0 + it.x * F * T;
    const n = it.n;
    if (it.shape === 'line') for (let i = 0; i < n; i++) pts.push([cx + i * sp, it.h]);
    else if (it.shape === 'arc') {
      const mid = (n - 1) / 2;
      for (let i = 0; i < n; i++) {
        const u = mid ? (i - mid) / mid : 0;
        pts.push([cx + (i - mid) * sp, it.h + (it.peak - it.h) * (1 - u * u)]);
      }
    } else if (it.shape === 'wave') for (let i = 0; i < n; i++) pts.push([cx + i * sp, it.h + 34 * Math.sin(i * 0.65)]);
    else if (it.shape === 'column') for (let i = 0; i < n; i++) pts.push([cx, it.h + i * 36]);
    const fid = this.gen.formation++;
    this.formations[fid] = { total: pts.length, done: 0, missed: false, x: cx };
    for (const [px, py] of pts) this.addEntity({ kind: 'coin', x: px, y: py, f: fid });
  }

  // ------------------------------------------------------------------ main step
  step(input) {
    if (this.over) return;
    const dt = CFG.TICK;
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.tick++; this.t += dt;
    this.prevX = this.x; this.p.prevY = this.p.y;
    const ts = this.timeScale;
    const p = this.p;

    if (this.dying > 0) {
      this.dying -= dt;
      if (this.dying <= 0) { this.over = true; this.emit('game_over'); }
      return;
    }

    // timers
    if (p.invul > 0) p.invul -= dt;
    if (this.warmup > 0) this.warmup -= dt;
    if (this.power) {
      this.power.t -= dt;
      if (!this.power.warned && this.power.t <= CFG.POWER_WARN) { this.power.warned = true; this.emit('power_warn', { kind: this.power.kind }); }
      if (this.power.t <= 0) {
        const k = this.power.kind;
        this.power = null;
        if (k === 'fast') this.sprintGrace = 2;
        this.emit('power_end', { kind: k });
      }
    }

    this.update_speed();
    this.x += this.speed * dt;

    this.stepPlayer(input, dt);
    this.stepEntities(dt, ts);
    this.stepBoss(dt, ts);
    this.collide();
    this.stepProgress();
    this.ensureLevel();
    this.cull();
  }

  stepPlayer(input, dt) {
    const p = this.p;
    p.jumpHeld = !!input.jumpDown;
    if (this.rescue) return this.stepRescue(dt);
    if (input.jumpPressed) p.buffer = CFG.BUFFER; else p.buffer = Math.max(0, p.buffer - dt);
    const wasCrouch = p.crouch;
    p.crouch = !!input.crouchDown && p.onGround;
    if (p.crouch && !wasCrouch) this.emit('crouch_start');
    if (!p.crouch && wasCrouch) this.emit('crouch_end');
    p.fastFall = !!input.crouchDown && !p.onGround && p.vy <= 0;
    if (p.fastFall && !p._ff) this.emit('fast_fall');
    p._ff = p.fastFall;

    if (p.onGround) p.coyote = CFG.COYOTE; else p.coyote = Math.max(0, p.coyote - dt);

    if (p.buffer > 0 && (p.onGround || p.coyote > 0)) {
      p.vy = CFG.V_JUMP; p.onGround = false; p.coyote = 0; p.buffer = 0; p.crouch = false;
      this.emit('jump', { x: this.x });
    }

    let g;
    if (p.vy > 0) g = p.jumpHeld ? CFG.G_UP_HOLD : CFG.G_UP_RELEASE;
    else g = p.fastFall ? CFG.G_FAST : CFG.G_DOWN;
    if (!p.onGround) {
      p.vy = Math.max(-CFG.V_MAX_FALL, p.vy - g * dt);
      p.y += p.vy * dt;
    }

    // support
    const sup = this.supportAt(this.x, p.prevY);
    if (p.vy <= 0 && sup !== null && p.y <= sup + 0.001) {
      const impact = -p.vy;
      p.y = sup;
      const was = !p.onGround;
      p.vy = 0; p.onGround = true; p._ff = false;
      if (was) {
        this.emit('land', { x: this.x, impact });
        this.stompChain = 0;
      }
    } else if (p.onGround) {
      if (sup === null || p.y > sup + 1) p.onGround = false; // walked off an edge
    }
    if (!p.onGround && p.y < CFG.FALL_OUT) this.startRescue();
  }

  // height of the surface under x that a falling player (previous feet height prevY) can land on, or null
  supportAt(x, prevY) {
    let best = null;
    for (const s of this.floor) if (x >= s.x0 && x <= s.x1) { best = 0; break; }
    for (const e of this.entities) {
      if (e.kind !== 'plat') continue;
      if (Math.abs(x - e.x) <= e.w / 2 + 6 && prevY >= e.y - CFG.FLOOR_SNAP) best = best === null ? e.y : Math.max(best, e.y);
    }
    if (best === 0 && prevY < -CFG.FLOOR_SNAP) return null; // already below the floor edge
    return best;
  }

  startRescue() {
    const p = this.p;
    this.emit('fall_gap', { x: this.x });
    this.loseHeart('gap');
    if (this.over || this.dying > 0) return;
    this.rescue = { t: 0 };
    p.y = 70; p.vy = 0; p.onGround = false; p.invul = CFG.INVUL_RESPAWN;
    this.afterHit = 2;
    this.emit('rescue_start');
  }

  stepRescue(dt) {
    const p = this.p;
    this.rescue.t += dt;
    p.y = 70 + Math.sin(this.rescue.t * 6) * 4; p.vy = 0; p.onGround = false;
    // end when solid floor lies under the player for a stretch
    let ok = false;
    for (const s of this.floor) if (this.x - 40 >= s.x0 && this.x + 40 <= s.x1) ok = true;
    if (ok && this.rescue.t > 0.6) {
      this.rescue = null;
      p.y = 70; p.vy = 0; p.onGround = false;
      this.emit('rescue_end');
    }
  }

  // ------------------------------------------------------------------ entities
  stepEntities(dt, ts) {
    const d = dt * ts;
    for (const e of this.entities) {
      if (!e.alive) continue;
      if (e.kind === 'plat') { /* static */ continue; }
      if (e.kind === 'pick') { e.ay = Math.sin((this.t + e.id) * 3) * 2; continue; }
      if (e.kind === 'proj') { this.stepProj(e, d); continue; }
      if (e.kind !== 'hz') continue;
      e.age += d;
      const distAhead = e.x - this.x;
      const near = distAhead < this.speed * 1.6 + 100;   // drifting hazards only start moving when close
      switch (e.type) {
        case 'fly': if (near) e.x += e.vx * d; e.by = Math.sin(e.age * 3 + e.id) * 3; break;
        case 'snail': if (e.state === 'idle') { if (near) e.x += e.vx * d; } else { e.st -= d; if (e.state === 'shell' && e.st <= 0) e.alive = false; } break;
        case 'beeH': case 'beeL': if (e.state === 'idle') { if (near) e.x += e.vx * d; e.by = Math.sin(e.age * 5 + e.id) * 4; } break;
        case 'ssh': e.hopT += d; { const ph = (e.hopT % 1.3) / 1.3; e.by = ph < 0.35 ? Math.sin((ph / 0.35) * Math.PI) * 46 : 0; } break;
        case 'hang':
          if (e.state === 'wait' && distAhead < this.speed * 1.45 && distAhead > 0) { e.state = 'warn'; e.st = 0; this.emit('wake', { type: 'hang', x: e.x }); }
          else if (e.state === 'warn') { e.st += d; if (e.st >= 0.4) { e.state = 'drop'; e.st = 0; } }
          else if (e.state === 'drop') { e.st += d; if (e.st >= 0.3) { e.state = 'down'; e.st = 0; } }
          break;
        case 'owl':
          if (e.state === 'sleep' && distAhead < this.speed * 1.75 && distAhead > 0) { e.state = 'wake'; e.st = 0; this.emit('wake', { type: 'owl', x: e.x }); }
          else if (e.state === 'wake') { e.st += d; if (e.st >= 0.45) { e.state = 'glide'; e.st = 0; e.x0 = e.x; } }
          else if (e.state === 'glide') {
            e.st += d;
            const t = e.st;
            e.x = e.x0 - 230 * t;
            e.y = t < 0.5 ? 200 - (200 - 62) * (t / 0.5) : t < 1.7 ? 62 : 62 + (t - 1.7) * 260;
          }
          break;
        case 'storm':
          if (e.state === 'idle' && distAhead < this.speed * 1.55 && distAhead > 0) { e.state = 'charge'; e.st = 0; this.emit('wake', { type: 'storm', x: e.x }); }
          else if (e.state === 'charge') { e.st += d; if (e.st >= 0.8) { e.state = 'zap'; e.st = 0; } }
          else if (e.state === 'zap') { e.st += d; if (e.st >= 0.25) { e.state = 'puddle'; e.st = 0; } }
          else if (e.state === 'puddle') { e.st += d; }
          break;
        case 'jelly': e.by = Math.sin(e.age * 4 + e.id) * 5; break;
        case 'crab': {
          // scuttle, rear up, then dash: the rear-up is the telegraph
          const ph = e.age % 2.3;
          e.vx = ph < 1.2 ? -30 : ph < 1.55 ? 0 : -150;
          e.pose = ph < 1.2 ? 'walk' : ph < 1.55 ? 'warn' : 'dash';
          if (near) e.x += e.vx * d;
          break;
        }
        case 'wheel': if (near) { e.vx = -165; e.x += e.vx * d; } break;
        case 'ghost': e.by = Math.sin(e.age * 2.4 + e.id) * 24; if (near) { e.vx = -28; e.x += e.vx * d; } break;
        case 'penguin':
          if (e.state === 'idle' && distAhead < this.speed * 1.5 && distAhead > 0) { e.state = 'wobble'; e.st = 0; this.emit('wake', { type: 'penguin', x: e.x }); }
          else if (e.state === 'wobble') { e.st += d; if (e.st >= 0.5) { e.state = 'slide'; e.st = 0; e.vx = -190; } }
          else if (e.state === 'slide') e.x += e.vx * d;
          break;
        case 'invader': { e.by = (Math.floor(e.age / 0.6) % 2 ? 12 : -12); if (near) { e.vx = -38; e.x += e.vx * d; } break; }
        default: break;
      }
    }
  }

  // hazard hurt boxes in world coordinates (x left, y bottom). Empty when harmless.
  boxesOf(e) {
    const y0 = (e.y || 0) + (e.by || 0);
    switch (e.type) {
      case 'sf': return [{ x: e.x - 32, y: 0, w: 64, h: 34 }];
      case 'ss': case 'ssh': return [{ x: e.x - 17, y: (e.by || 0), w: 34, h: 46 }];
      case 'fly': return [{ x: e.x - 58, y: y0 - 14, w: 28, h: 28 }, { x: e.x - 32, y: y0 - 8, w: 84, h: 16 }];
      case 'hang': return e.state === 'down' ? [{ x: e.x - 14, y: 50, w: 28, h: 30 }, { x: e.x - 5, y: 80, w: 10, h: 130 }] : [];
      case 'snail': return e.state === 'idle' ? [{ x: e.x - 20, y: 0, w: 40, h: 30 }] : [];
      case 'beeH': case 'beeL': return e.state === 'idle' ? [{ x: e.x - 17, y: y0 - 18, w: 34, h: 36 }] : [];
      case 'owl': return e.state === 'glide' ? [{ x: e.x - 24, y: e.y - 22, w: 48, h: 44 }] : [];
      case 'storm': return e.state === 'zap' ? [{ x: e.x - 14, y: 0, w: 28, h: 280 }] : e.state === 'puddle' ? [{ x: e.x - 26, y: 0, w: 52, h: 12 }] : [];
      case 'jelly': return [{ x: e.x - 20, y: y0 - 20, w: 40, h: 40 }];
      case 'crab': return [{ x: e.x - 24, y: 0, w: 48, h: 28 }];
      case 'wheel': return [{ x: e.x - 17, y: 2, w: 34, h: 34 }];
      case 'ghost': return [{ x: e.x - 19, y: y0 - 18, w: 38, h: 36 }];
      case 'penguin': return e.state === 'slide' ? [{ x: e.x - 25, y: 0, w: 50, h: 24 }] : [{ x: e.x - 15, y: 0, w: 30, h: 40 }];
      case 'invader': return [{ x: e.x - 20, y: y0 - 16, w: 40, h: 32 }];
      default: return [];
    }
  }

  stompTop(e) {
    if (e.type === 'sf') return 34;
    if (e.type === 'snail') return 30;
    if (e.type === 'crab') return 28;
    if (e.type === 'ghost') return (e.y || 0) + (e.by || 0) + 18;
    if (e.type === 'penguin') return e.state === 'slide' ? 24 : 40;
    if (e.type === 'beeL') return (e.y || 0) + (e.by || 0) + 18;
    return null;
  }

  collide() {
    const p = this.p;
    const pb = this.playerBox();
    const cam = this.camX;
    for (const e of this.entities) {
      if (!e.alive || e.x < cam - 400 && e.kind !== 'plat') continue;
      if (e.kind === 'coin') {
        const dx = Math.max(pb.x - e.x, 0, e.x - (pb.x + pb.w));
        const dy = Math.max(pb.y - e.y, 0, e.y - (pb.y + pb.h));
        if (dx * dx + dy * dy < 20 * 20) this.takeCoin(e);
        else if (e.x < this.x - 60 && !e.passed) { e.passed = true; this.formations[e.f].missed = true; this.finishFormation(e.f); }
      } else if (e.kind === 'pick') {
        const dx = Math.max(pb.x - e.x, 0, e.x - (pb.x + pb.w));
        const dy = Math.max(pb.y - (e.y + (e.ay || 0)), 0, (e.y + (e.ay || 0)) - (pb.y + pb.h));
        if (dx * dx + dy * dy < 26 * 26) this.takePick(e);
      } else if (e.kind === 'proj') {
        if (!e.ret) this.collideProj(e, pb);
      } else if (e.kind === 'block') {
        if (!e.used && p.vy > 0 && pb.y + pb.h >= e.y - 2 && pb.y + pb.h <= e.y + 30 && Math.abs(this.x - e.x) < 26) this.hitBlock(e);
      } else if (e.kind === 'hz') {
        const boxes = this.boxesOf(e);
        if (!boxes.length) continue;
        let hit = false;
        for (const b of boxes) if (pb.x < b.x + b.w && pb.x + pb.w > b.x && pb.y < b.y + b.h && pb.y + pb.h > b.y) { hit = true; break; }
        if (!hit) continue;
        if (this.warmup > 0 && e.type !== 'hang') continue;
        const top = this.stompTop(e);
        if (this.invincible) { this.popEnemy(e); continue; }
        if (top !== null && p.vy < 0 && p.prevY >= top - 14 && !this.rescue) { this.stompEnemy(e, top); continue; }
        if (p.invul > 0 || this.rescue) continue;
        this.hitBy(e);
      }
    }
  }

  takeCoin(e) {
    e.alive = false;
    const mult = this.power && this.power.kind === 'fast' ? 2 : 1;
    this.coins++; this.coinsForHeart++;
    this.score += CFG.PTS_COIN * mult;
    const f = this.formations[e.f];
    f.done++;
    this.emit('coin', { x: e.x, y: e.y, n: f.done });
    if (this.coinsForHeart >= CFG.HEART_EVERY_COINS) {
      this.coinsForHeart = 0;
      if (this.lives < CFG.LIVES && this.mode === 'normal') { this.lives++; this.emit('heart_get', { x: e.x, y: e.y, bonus: false }); } else { this.score += 500; this.emit('bonus', { x: e.x, y: e.y, pts: 500 }); }
    }
    this.finishFormation(e.f);
  }

  finishFormation(fid) {
    const f = this.formations[fid];
    if (!f || f.closed) return;
    const total = f.total;
    // count remaining uncollected entities still alive
    let left = 0;
    for (const e of this.entities) if (e.kind === 'coin' && e.f === fid && e.alive) left++;
    if (left > 0 && !f.missed) return;
    f.closed = true;
    if (!f.missed && f.done === total && total >= 3) {
      this.score += CFG.PTS_PERFECT; this.perfects++; this.perfectStreak++;
      this.emit('perfect', { x: this.x, y: 120 });
      if (this.perfectStreak > 0 && this.perfectStreak % 3 === 0) { this.score += CFG.PTS_STREAK; this.emit('streak', { n: this.perfectStreak }); }
    } else if (f.missed) this.perfectStreak = 0;
  }

  takePick(e) {
    e.alive = false;
    const k = e.pk;
    if (k === 'heart') {
      this.score += CFG.PTS_HEART;
      if (this.lives < CFG.LIVES) this.lives++;
      this.emit('heart_get', { x: e.x, y: e.y, bonus: true });
      return;
    }
    this.score += CFG.PTS_POWER;
    if (this.power && this.power.kind === 'inv' && k !== 'inv') { this.emit('power_blocked', { kind: k }); return; }
    const total = k === 'fast' ? CFG.FAST_TIME : k === 'slow' ? CFG.SLOW_TIME : CFG.INV_TIME;
    this.power = { kind: k, t: total, total, warned: false };
    this.emit('power_start', { kind: k, x: e.x, y: e.y });
    if (k === 'fast') this.clearAhead();
  }

  // the yellow candy turns the hazards ahead into candy
  clearAhead() {
    const from = this.x + 80, to = this.x + CFG.LOOKAHEAD;
    for (const e of this.entities) {
      if (!e.alive || e.kind !== 'hz' || e.x < from || e.x > to) continue;
      e.alive = false;
      this.emit('pop', { kind: e.name, x: e.x, y: (e.y || 0) + 20, silent: true });
      for (let i = 0; i < 3; i++) this.addEntity({ kind: 'coin', x: e.x - 30 + i * 30, y: 40 + (e.y || 0) * 0.6 + (i === 1 ? 24 : 0), f: this.newLooseFormation() });
    }
    // gaps ahead get a rainbow bridge
    for (let i = 0; i < this.floor.length - 1; i++) {
      const a = this.floor[i], b = this.floor[i + 1];
      if (a.x1 > from - 200 && a.x1 < to) { a.x1 = b.x0; }
    }
    this.gen.spawnX = Math.max(this.gen.spawnX, this.x + CFG.LOOKAHEAD);
  }

  newLooseFormation() {
    const fid = this.gen.formation++;
    this.formations[fid] = { total: 0, done: 0, missed: true, closed: true };
    return fid;
  }

  hitBlock(e) {
    e.used = true;
    this.score += CFG.PTS_BLOCK;
    this.emit('block_hit', { x: e.x, y: e.y });
    for (let i = 0; i < 4; i++) this.addEntity({ kind: 'coin', x: e.x - 54 + i * 36, y: e.y + 60 + (i === 1 || i === 2 ? 26 : 0), f: this.newLooseFormation() });
  }

  stompEnemy(e, top) {
    const p = this.p;
    this.stomps++;
    const chain = Math.min(this.stompChain, CFG.PTS_STOMP.length - 1);
    const pts = CFG.PTS_STOMP[chain] * (this.power && this.power.kind === 'fast' ? 2 : 1);
    this.score += pts;
    this.stompChain++;
    p.vy = p.jumpHeld ? CFG.STOMP_BOUNCE_HELD : CFG.STOMP_BOUNCE;
    p.onGround = false; p.y = Math.max(p.y, top);
    this.emit('stomp', { kind: e.name, x: e.x, y: top, chain: this.stompChain, pts });
    if (e.type === 'snail') { e.state = 'shell'; e.st = 1.6; } else e.alive = false;
  }

  popEnemy(e) {
    e.alive = false;
    this.score += CFG.PTS_POP;
    this.emit('pop', { kind: e.name, x: e.x, y: (e.y || 0) + 20, pts: CFG.PTS_POP });
    for (let i = 0; i < 3; i++) this.addEntity({ kind: 'coin', x: e.x - 30 + i * 30, y: 40 + (i === 1 ? 24 : 0), f: this.newLooseFormation() });
  }

  hitBy(e) {
    const p = this.p;
    this.emit('hit', { kind: e.name, x: e.x, y: p.y + 30, easy: this.mode === 'easy' });
    this.hitstop = CFG.HITSTOP;
    p.invul = CFG.INVUL_HIT;
    e.alive = false;
    this.afterHit = 2;
    this.perfectStreak = 0;
    if (this.mode === 'normal') this.loseHeart('hit');
  }

  loseHeart(why) {
    if (this.mode === 'easy') return;
    this.lives--;
    this.emit('lose_heart', { lives: this.lives, why });
    if (this.lives <= 0) { this.dying = 1.3; this.emit('dying'); }
  }

  stepProgress() {
    const m = this.meters;
    if (m > this.meterPaid) { this.score += m - this.meterPaid; this.meterPaid = m; }
    if (m >= this.nextMilestone) { this.emit('milestone', { m: this.nextMilestone }); this.nextMilestone += 1000; }
    if (this.x >= this.gateX()) {
      if (this.bossAtGate()) { if (!this.boss) this.startBoss(); } else this.advanceWorld();
    }
  }

  advanceWorld() {
    const cleared = this.world;
    this.score += CFG.PTS_WORLD * cleared;
    this.emit('world_clear', { world: cleared, lap: this.lap });
    this.world++;
    if (this.world > CFG.NUM_WORLDS) { this.world = 1; this.lap++; this.emit('lap', { lap: this.lap }); }
    this.maxWorld = Math.max(this.maxWorld, this.lap === 1 ? this.world : CFG.NUM_WORLDS);
    this.maxLap = Math.max(this.maxLap, this.lap);
    this.worldStartX = this.x;
    this.gateOverride = null;
    this.boss = null;
    this.worldMap.push({ x: this.x, world: this.world, lap: this.lap });
    this.gen.gateDone = false;
    this.emit('world_enter', { world: this.world, lap: this.lap });
  }

  // ------------------------------------------------------------------ boss fight
  startBoss() {
    const kind = BOSS_WORLDS[this.world];
    const easy = this.mode === 'easy';
    const max = (easy ? CFG.BOSS_HP_EASY : CFG.BOSS_HP)[kind] + (easy ? 0 : Math.min(6, (this.lap - 1) * 2));
    this.boss = { kind, hp: max, max, state: 'enter', t: 0, dist: this.bossDist || CFG.BOSS_DIST, sx: 700, cycle: null, ci: 0, cycleT: 0, windup: 0, cool: 0, hurtT: 0, shots: 0, phase: 0, flash: 0 };
    this.emit('boss_start', { kind, hp: max });
  }

  bossPhase(b) { const f = b.hp / b.max; return f > 0.67 ? 0 : f > 0.34 ? 1 : 2; }

  bossSpeed(b) {
    const base = [265, 315, 365][b.phase] + (this.lap - 1) * 14;
    return this.mode === 'easy' ? base * 0.72 : base;
  }

  fireOrb(b, kind, gy) {
    const sv = this.bossSpeed(b);
    const good = kind === 'good';
    const y = good ? gy : kind === 'low' ? 22 : 66;
    this.addEntity({ kind: 'proj', good, lv: kind, x: this.x + b.dist - 20, y, sv, vx: this.speed - sv, ret: false, age: 0 });
    b.shots++;
    this.emit('boss_shoot', { good, lv: kind });
  }

  stepBoss(dt, ts) {
    const b = this.boss;
    if (!b) return;
    const d = dt * ts;
    b.t += d;
    if (b.flash > 0) b.flash -= dt;
    if (b.state === 'enter') {
      b.sx = b.dist + Math.max(0, 1 - b.t / 1.6) * 360;
      if (b.t >= 1.7) { b.state = 'fight'; b.t = 0; b.cool = 0.8; this.emit('boss_ready', { kind: b.kind }); }
      return;
    }
    if (b.state === 'dying') {
      if (b.t >= 2.4) { this.bossGone(); }
      return;
    }
    b.phase = this.bossPhase(b);
    if (b.hurtT > 0) { b.hurtT -= d; return; }
    if (b.windup > 0) { b.windup -= d; if (b.windup <= 0 && b.pending) { const q = b.pending; b.pending = null; this.fireOrb(b, q[1], q[2]); } return; }
    if (!b.cycle) {
      if (b.cool > 0) { b.cool -= d; return; }
      const set = BOSS_CYCLES[b.phase];
      b.cycle = set[this.rng.int(0, set.length - 1)];
      b.cycleT = 0; b.ci = 0;
    }
    b.cycleT += d;
    const nxt = b.cycle[b.ci];
    if (nxt && b.cycleT >= nxt[0]) { b.ci++; b.pending = nxt; b.windup = 0.32; b.pose = nxt[1]; }
    if (b.ci >= b.cycle.length && !b.pending) { b.cycle = null; b.cool = [1.2, 1.0, 0.8][b.phase]; }
  }

  hitBoss() {
    const b = this.boss;
    if (!b || b.state === 'dying' || b.state === 'enter') return;
    b.hp--;
    b.flash = 0.25; b.hurtT = 0.55; b.cycle = null; b.pending = null; b.windup = 0; b.cool = 0.9;
    this.score += 250;
    this.emit('boss_hit', { hp: b.hp, max: b.max, kind: b.kind });
    if (b.hp <= 0) {
      b.state = 'dying'; b.t = 0;
      for (const e of this.entities) if (e.kind === 'proj') { e.alive = false; this.emit('pop', { kind: 'orb', x: e.x, y: e.y, silent: true }); }
      this.emit('boss_defeat', { kind: b.kind });
    } else if (b.hp === Math.ceil(b.max * 0.67) || b.hp === Math.ceil(b.max * 0.34)) {
      this.emit('boss_phase', { phase: this.bossPhase(b) });
      this.addEntity({ kind: 'pick', pk: 'heart', x: this.x + 260, y: 96, spawnT: this.t });
    }
  }

  bossGone() {
    const b = this.boss;
    this.score += CFG.PTS_BOSS * this.lap;
    this.emit('boss_gone', { kind: b.kind, pts: CFG.PTS_BOSS * this.lap });
    // victory lap: a rain of candy and the gate to the next world a bit further ahead
    const fid = this.gen.formation++;
    this.formations[fid] = { total: 0, done: 0, missed: true, closed: true };
    for (let i = 0; i < 24; i++) this.addEntity({ kind: 'coin', x: this.x + 160 + i * 34, y: 40 + Math.round(Math.sin(i * 0.5) * 30) + 30, f: this.newLooseFormation() });
    if (this.lives < CFG.LIVES && this.mode === 'normal') { this.lives++; this.emit('heart_get', { x: this.x + 140, y: 100, bonus: true }); }
    this.gateOverride = this.x + 1000;
    this.gen.gateDone = false;
    this.boss = { ...b, state: 'gone' };
  }

  stepProj(e, d) {
    const b = this.boss;
    e.age += d;
    if (e.ret) {
      e.x += (this.speed + 640) * d;
      if (b && e.x >= this.x + b.sx - 40) { e.alive = false; this.hitBoss(); this.emit('orb_hit_boss', { x: e.x, y: e.y }); }
      return;
    }
    e.vx = this.speed - e.sv;
    e.x += e.vx * d;
    if (e.x < this.x - 160) e.alive = false;
  }

  collideProj(e, pb) {
    const cx = e.x, cy = e.y, r = e.good ? 27 : 14;
    const dx = Math.max(pb.x - cx, 0, cx - (pb.x + pb.w)), dy = Math.max(pb.y - cy, 0, cy - (pb.y + pb.h));
    if (dx * dx + dy * dy > r * r) return;
    if (e.good) { e.ret = true; this.score += 100; this.emit('orb_reflect', { x: e.x, y: e.y }); return; }
    if (this.invincible) { e.alive = false; this.emit('pop', { kind: 'orb', x: e.x, y: e.y, pts: 0, silent: true }); return; }
    if (this.p.invul > 0 || this.rescue) return;
    this.hitBy({ name: 'orb', x: e.x, type: 'orb', alive: true });
    e.alive = false;
  }

  cull() {
    const cam = this.camX;
    if (this.tick % 30 !== 0) return;
    this.entities = this.entities.filter((e) => e.alive && (e.kind === 'plat' ? e.x + e.w / 2 > cam - 300 : e.x > cam - 400));
    this.floor = this.floor.filter((s) => s.x1 > cam - 600);
    // forget formations that are finished
    for (const k of Object.keys(this.formations)) if (this.formations[k].closed) {
      let live = false;
      for (const e of this.entities) if (e.kind === 'coin' && e.f === +k) { live = true; break; }
      if (!live) delete this.formations[k];
    }
  }

  drainEvents() { const e = this.events; this.events = []; return e; }
}
