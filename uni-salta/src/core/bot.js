// Planning bot used by the pattern validator and the balancing runs. It looks ahead with a cloned
// simulation, so it works with every hazard (including time dependent ones).
import { CFG } from './config.js';

const HORIZON = 115;
const NONE = { jumpDown: false, jumpPressed: false, crouchDown: false };

function planInput(plan, k) {
  if (plan === 'run') return NONE;
  if (plan === 'jump') return { jumpDown: k < 50, jumpPressed: k === 0, crouchDown: false };
  if (plan === 'hop') return { jumpDown: k < 9, jumpPressed: k === 0, crouchDown: false };
  if (plan === 'crouch') return { jumpDown: false, jumpPressed: false, crouchDown: k < 38 };
  return NONE;
}

export function nextHazardX(sim) {
  let hx = Infinity;
  for (const e of sim.entities) if (e.alive && e.kind === 'hz' && e.x > sim.x - 90 && e.x < hx) hx = e.x;
  for (let i = 0; i < sim.floor.length - 1; i++) { const g1 = sim.floor[i + 1].x0; if (g1 > sim.x - 40 && g1 < hx) hx = g1; }
  return hx;
}

export function simulatePlan(sim, plan, delay = 0, horizon = null) {
  if (horizon === null) {
    const hx = nextHazardX(sim);
    horizon = hx === Infinity ? HORIZON : Math.min(240, Math.ceil(((hx - sim.x) + 230) / (Math.max(60, sim.speed) * CFG.TICK)) + 20);
  }
  const s = sim.clone();
  const lives0 = s.lives;
  let hits = 0;
  for (let i = 0; i < delay + horizon; i++) {
    s.step(i < delay ? NONE : planInput(plan, i - delay));
    for (const e of s.events) if (e.type === 'hit' || e.type === 'fall_gap') hits++;
    s.events = [];
    if (s.over || s.dying > 0 || hits > 0 || s.lives < lives0) return false;
  }
  return true;
}

export class Bot {
  constructor(opts = {}) {
    this.margin = opts.margin ?? 8;       // ticks of slack kept before the last safe moment
    this.noise = opts.noise ?? 0;         // random extra delay in ticks (human jitter)
    this.plan = null; this.k = 0;
    this.tight = 0;                       // times the safe window was shorter than the margin
    this.tries = 0;
  }

  nearHazard(sim) {
    const lim = sim.x + sim.speed * 1.9 + 60;
    for (const e of sim.entities) {
      if (!e.alive) continue;
      if (e.kind === 'hz' && e.x > sim.x - 80 && e.x < lim) return true;
    }
    // gap ahead?
    for (let i = 0; i < sim.floor.length - 1; i++) {
      const g0 = sim.floor[i].x1;
      if (g0 > sim.x - 40 && g0 < lim) return true;
    }
    return false;
  }

  act(sim) {
    if (this.plan) {
      const inp = planInput(this.plan, this.k++);
      if (this.k > 60) this.plan = null;
      return inp;
    }
    if (sim.rescue || !this.nearHazard(sim)) return NONE;
    if (simulatePlan(sim, 'run')) return NONE;
    // run is unsafe: choose the plan that is safe, acting `margin` ticks before the last safe moment
    for (const plan of ['crouch', 'jump', 'hop']) {
      if (!simulatePlan(sim, plan)) continue;
      if (simulatePlan(sim, plan, this.margin + this.noise)) return NONE;  // still room to wait
      if (!simulatePlan(sim, plan, 1)) this.tight++;
      this.plan = plan; this.k = 0;
      return planInput(plan, this.k++);
    }
    // nothing is safe right now: if a plan becomes safe a little later, keep running and wait for it
    for (let d = 6; d <= 96; d += 6) {
      for (const plan of ['crouch', 'jump', 'hop']) if (simulatePlan(sim, plan, d)) return NONE;
    }
    this.tries++;
    // truly no solution: jump and hope
    this.plan = 'jump'; this.k = 0;
    return planInput('jump', this.k++);
  }
}

// ---------------------------------------------------------------------------------------------
// Reactive bot: acts when the next hazard is `lead` seconds away, like a person reacting to a
// visible obstacle. Running the validator with several leads proves each chunk has a timing
// window of at least the spread between them (about 140 ms), which is the fairness bar.
const GROUND = new Set(['sf', 'ss', 'ssh', 'snail', 'beeL', 'storm', 'crab', 'wheel', 'ghost', 'penguin']);
const HIGH = new Set(['fly', 'hang', 'beeH', 'owl', 'invader']);
const HALFW = { sf: 32, ss: 17, ssh: 17, snail: 20, beeL: 17, beeH: 17, storm: 26, fly: 70, hang: 14, owl: 24, jelly: 20, crab: 24, wheel: 17, ghost: 19, penguin: 25, invader: 20 };

export class ReactiveBot {
  constructor(opts = {}) {
    this.lead = opts.lead ?? 0.27;       // seconds before the hazard front edge to act
    this.jitter = opts.jitter ?? 0;      // random +- seconds (humans are not exact)
    this.rng = opts.rng || null;
    this.k = 0; this.plan = null; this.len = 0;
  }

  closing(sim, e) {
    let v = sim.speed;
    if (e.type !== 'owl') v -= (e.vx || 0) * sim.timeScale;
    if (e.type === 'owl') v += (e.state === 'glide' ? 230 * sim.timeScale : 0);
    return Math.max(60, v);
  }

  act(sim) {
    if (this.plan) {
      const inp = this.plan === 'crouch' ? { jumpDown: false, jumpPressed: false, crouchDown: true } : planInput(this.plan, this.k++);
      if (this.plan === 'crouch') this.k++;
      if (this.k >= this.len) this.plan = null;
      if (this.plan === 'jump' && this.k > 2 && sim.p.onGround) this.plan = null;
      return inp;
    }
    if (sim.rescue) return NONE;
    // standing on a cloud platform: leave it when its end approaches
    if (sim.p.onGround && sim.p.y > 1) {
      for (const e of sim.entities) {
        if (e.kind !== 'plat' || Math.abs(sim.p.y - e.y) > 1 || Math.abs(sim.x - e.x) > e.w / 2 + 6) continue;
        if (e.x + e.w / 2 - sim.x <= sim.speed * 0.12) { this.plan = 'jump'; this.k = 0; this.len = 60; return planInput('jump', this.k++); }
        return NONE;
      }
    }
    const j = this.jitter && this.rng ? (this.rng.next() - 0.5) * 2 * this.jitter : 0;
    const lead = this.lead + j;
    const px = sim.x;
    let best = null;
    // gaps
    for (let i = 0; i < sim.floor.length - 1; i++) {
      const edge = sim.floor[i].x1;
      if (edge > px - 10 && (!best || edge < best.x)) best = { x: edge, kind: 'gap', tf: (edge - px) / Math.max(60, sim.speed) };
    }
    for (const e of sim.entities) {
      if (e.alive && e.kind === 'proj' && !e.ret) {
        const half = e.good ? 27 : 14;
        if (e.x + half < px - 22) continue;
        const tf = (e.x - half - (px + 16)) / this.closing(sim, e);
        if (!best || e.x < best.x) best = { x: e.x, kind: e.good ? 'good' : e.lv === 'low' ? 'jump' : 'crouch', tf, e, half };
        continue;
      }
      if (!e.alive || e.kind !== 'hz' || e.x + HALFW[e.type] < px - 22) continue;
      let action = null;
      if (GROUND.has(e.type)) action = 'jump';
      else if (HIGH.has(e.type)) action = 'crouch';
      else if (e.type === 'jelly') action = e.lv === 'low' ? 'jump' : 'crouch';
      if (!action) continue;
      if ((e.type === 'snail' && e.state !== 'idle')) continue;
      const front = e.x - HALFW[e.type] - (px + 16);
      const tf = front / this.closing(sim, e);
      if (!best || e.x < best.x) best = { x: e.x, kind: action, tf, e };
    }
    if (!best) return NONE;
    if (best.kind === 'gap') {
      if (best.tf <= 0.07 + j * 0.3 && sim.p.onGround) { this.plan = 'jump'; this.k = 0; this.len = 60; return planInput('jump', this.k++); }
      return NONE;
    }
    const act = best.tf <= lead * (best.kind === 'crouch' ? 1.1 : best.kind === 'good' ? 0.4 : 1);
    if (!act) return NONE;
    if (best.kind === 'jump' || best.kind === 'good') { this.plan = 'jump'; this.len = 60; this.k = 0; return planInput('jump', this.k++); }
    const w = ((best.half || HALFW[best.e.type]) * 2 + 46);
    this.len = Math.max(20, Math.min(90, Math.ceil((Math.max(0, best.tf) + w / this.closing(sim, best.e) + 0.05) * 60)));
    this.plan = 'crouch'; this.k = 0;
    return { jumpDown: false, jumpPressed: false, crouchDown: true };
  }
}
