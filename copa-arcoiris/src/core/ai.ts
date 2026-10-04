import { DIFFICULTY, PHYS } from './data';
import { boxAt, inRect, moverEta, moverRect } from './mapdata';
import type { AIProfile, InputFrame } from './types';
import { emptyInput } from './types';
import { startRescueTo } from './actor';
import type { Actor, World } from './world';

export interface AIGoal {
  x: number; y: number;
  stopDist?: number;
  hold?: boolean;
  attack?: number | null;
  pickup?: boolean;
  throwAt?: number | null;
  usePower?: boolean;
  jumpOnArrive?: boolean;
  bop?: boolean;
  swimOk?: boolean;
}

export interface AIState {
  speedMult: number; nextThink: number; held: InputFrame;
  jumpAt: number; jumpFire: boolean; actionFire: boolean; powerFire: boolean;
  lane: number; laneT: number; powerDelay: number; powerArmed: boolean;
  lastX: number; lastY: number; stuckClock: number; stuckStage: number; backT: number; pausedUntil: number;
  goalX: number; goalY: number; bestDist: number; bestT: number; bestProg: number; bestProgT: number; wantBop: boolean; waitT: number; impatient: number;
}

const PROFILE = {
  veloz: { aggr: 0.25, powerEager: 0.9, risk: 0.9 },
  prudente: { aggr: 0.1, powerEager: 0.4, risk: 0.2 },
  jugueton: { aggr: 0.7, powerEager: 0.7, risk: 0.5 },
  explorador: { aggr: 0.3, powerEager: 0.6, risk: 0.6 },
} as const;
export const aiAggression = (p: AIProfile): number => PROFILE[p].aggr;
export const aiRisk = (p: AIProfile): number => PROFILE[p].risk;

function newState(): AIState {
  return {
    speedMult: 1, nextThink: 0, held: emptyInput(), jumpAt: -1, jumpFire: false, actionFire: false, powerFire: false,
    lane: 0, laneT: 0, powerDelay: 0, powerArmed: false, lastX: 0, lastY: 0, stuckClock: 0, stuckStage: 0, backT: 0, pausedUntil: 0,
    goalX: -1, goalY: -1, bestDist: Infinity, bestT: 0, bestProg: -1, bestProgT: 0, wantBop: false, waitT: 0, impatient: 0,
  };
}

const maxJumpH = (a: Actor): number => { const v = PHYS.jumpV * a.stats.jump; return (v * v) / (2 * PHYS.gravity) * 0.85; };
const maxJumpDist = (a: Actor): number => 2 * PHYS.jumpV * a.stats.jump / PHYS.gravity * a.stats.run * 0.8;

interface Scan { kind: 'none' | 'box' | 'pit'; d: number; h: number; width: number }

/** Looks along the walking direction for a box or a pit. Returns distance to its near edge. */
export function scanAhead(w: World, a: Actor, dir: number, look: number, dy = 0): Scan {
  const step = 2;
  const y = a.y + dy;
  const fw = a.stats.footW;
  for (let d = 4; d <= look; d += step) {
    const px = a.x + dir * d;
    const fr = { x: px - fw / 2, y: y - PHYS.footH / 2, w: fw, h: PHYS.footH };
    let h = 0;
    for (const b of w.map.boxes) {
      if (b.alto <= a.z + PHYS.stepUp) continue;
      const r = boxAt(b, w.t);
      if (fr.x < r.x + r.w && fr.x + fr.w > r.x && fr.y < r.y + r.h && fr.y + fr.h > r.y) h = Math.max(h, b.alto);
    }
    if (h > 0) return { kind: 'box', d, h, width: 0 };
    if (a.grounded && w.map.pits.some((r) => inRect(r, px, y))) {
      let width = 0;
      for (let k = d; k < d + 90; k += step) { if (w.map.pits.some((r) => inRect(r, a.x + dir * k, y))) width = k - d; else break; }
      return { kind: 'pit', d, h: 0, width: width + step };
    }
  }
  return { kind: 'none', d: Infinity, h: 0, width: 0 };
}

/** True when a straight line from the actor to (tx, ty) crosses a wall too tall to jump (walls, hedges). */
export function pathBlocked(w: World, a: Actor, tx: number, ty: number): boolean {
  const dx = tx - a.x, dy = ty - a.y, n = Math.max(2, Math.ceil(Math.hypot(dx, dy) / 6));
  const lim = maxJumpH(a);
  for (let i = 1; i <= n; i++) {
    const px = a.x + (dx * i) / n, py = a.y + (dy * i) / n;
    for (const b of w.map.boxes) {
      if (b.alto - a.z <= lim) continue;
      const r = boxAt(b, w.t);
      if (px > r.x - 5 && px < r.x + r.w + 5 && py > r.y - 2 && py < r.y + r.h + 2) return true;
    }
  }
  return false;
}

/** Direction (-1 up, 1 down) of the nearest lane without the obstacle, inside the walkable band, preferring the side of the goal. 0 when none. */
export function freeLane(w: World, a: Actor, dir: number, look: number, blockedAt: number, goalY: number): number {
  const pref = goalY >= a.y ? 1 : -1;
  for (const d of [pref, -pref]) {
    for (let off = 10; off <= 70; off += 10) {
      const y = a.y + d * off;
      if (y < w.map.groundTop + 3 || y > w.map.groundBottom - 3) break;
      if (pathBlocked(w, a, a.x, y)) break;            // a wall between here and that lane (a hedge divider)
      const sc = scanAhead(w, a, dir, look, d * off);
      if (sc.kind === 'none' || sc.d > blockedAt + 12) return d;
    }
  }
  return 0;
}

export function thinkAI(w: World, a: Actor, dt: number): void {
  const s = a.ai ?? (a.ai = newState());
  const diff = DIFFICULTY[w.difficulty];
  s.laneT = Math.max(0, s.laneT - dt);
  s.backT = Math.max(0, s.backT - dt);
  if (s.jumpAt >= 0) { s.jumpAt -= dt; if (s.jumpAt <= 0) { s.jumpFire = true; s.jumpAt = -1; } }

  // rubber band: only the race, only on Tranquilo (GAME_DESIGN section 9)
  if (w.rules.id === 'race' && w.humans.length) {
    const best = Math.max(...w.humans.map((id) => w.actors.find((q) => q.id === id)?.progress ?? 0));
    if (a.progress - best > diff.rubberAhead) s.speedMult = diff.slow;
    else if (best - a.progress > diff.rubberBehind) s.speedMult = diff.fast;
    else s.speedMult = 1;
  }

  // power timing
  if (a.power < PHYS.maxPower) { s.powerArmed = false; }
  else if (!s.powerArmed) { s.powerArmed = true; s.powerDelay = w.rng.range(1, 3); }
  if (s.powerArmed) s.powerDelay -= dt;

  const locked = a.finished || (a.act && ['tumble', 'stagger', 'fall', 'rescue', 'celebrate', 'finished'].includes(a.act.kind));

  s.nextThink -= dt;
  if (s.nextThink <= 0 && !locked) {
    s.nextThink = w.rng.range(diff.reactMin, diff.reactMax);
    decide(w, a, s, diff.err);
  }

  // stuck detection: no progress toward the goal for 7 s. Pushes between rivals move bodies without progress, so distance is not enough.
  s.stuckClock += dt;
  if (s.stuckClock >= 0.25) {
    s.stuckClock = 0;
    const want = !locked && w.phase === 'play' && (Math.abs(s.held.mx) + Math.abs(s.held.my) > 0.3);
    const moved = Math.hypot(a.x - s.lastX, a.y - s.lastY);
    s.lastX = a.x; s.lastY = a.y;
    if (want && moved < 2) s.stuckStage += 0.25; else if (moved > 3) s.stuckStage = Math.max(0, s.stuckStage - 0.5);
    if (s.stuckStage >= 2 && s.stuckStage < 2.25) { s.jumpFire = true; s.lane = w.rng.chance(0.5) ? 1 : -1; s.laneT = 0.9; }
    if (s.stuckStage >= 4 && s.stuckStage < 4.25) { s.backT = 0.5; }
    let rescue = s.stuckStage >= 6;
    if (!locked && w.phase === 'play' && s.goalX >= 0) {
      const dist = Math.hypot(s.goalX - a.x, (s.goalY - a.y) * 1.5);
      if (dist < s.bestDist - 10) { s.bestDist = dist; s.bestT = w.t; }
      if (w.t - s.bestT > 7 && s.bestDist > 24) rescue = true;
    }
    if (!locked && w.phase === 'play' && a.progress > 0) {
      if (a.progress > s.bestProg + 12) { s.bestProg = a.progress; s.bestProgT = w.t; }
      if (w.t - s.bestProgT > 12) { rescue = true; s.bestProg = a.progress; s.bestProgT = w.t; }
    }
    if (rescue) {
      s.stuckStage = 0; s.bestDist = Infinity; s.bestT = w.t;
      const p = w.rules.respawnPoint(w, a);
      startRescueTo(w, a, p.x, p.y);
    }
  }

  // toy hits in the air are timed per frame (a short window), but with misses so rivals are not perfect
  if (s.wantBop && !a.grounded && a.z > 12 && !a.act && a.pushCd <= 0 && w.rng.chance(0.18)) s.actionFire = true;
  const held = s.held;
  let mx = held.mx, my = held.my;
  if (s.backT > 0) { mx = -Math.sign(mx || 1); my = 0; }
  const jumpHeld = a.powerKind === 'bubble' && a.powerT > 0;
  a.input = {
    mx, my, jump: s.jumpFire || jumpHeld, jumpPressed: s.jumpFire,
    action: s.actionFire, actionPressed: s.actionFire, power: s.powerFire, powerPressed: s.powerFire,
  };
  s.jumpFire = false; s.actionFire = false; s.powerFire = false;
}

function decide(w: World, a: Actor, s: AIState, err: number): void {
  const goal = w.rules.aiGoal(w, a);
  if (Math.abs(goal.x - s.goalX) > 30 || Math.abs(goal.y - s.goalY) > 30) { s.bestDist = Infinity; s.bestT = w.t; }
  s.goalX = goal.x; s.goalY = goal.y;
  const prof = PROFILE[a.profile];
  const dx = goal.x - a.x, dy = goal.y - a.y;
  const stop = goal.stopDist ?? 5;
  let mx = goal.hold || Math.abs(dx) <= stop ? 0 : Math.sign(dx);
  let my = goal.hold || Math.abs(dy) < 3 ? 0 : Math.max(-1, Math.min(1, dy / 10));
  if (s.laneT > 0) my = s.lane;

  const speed = a.runT >= a.stats.runDelay ? a.stats.run : PHYS.walk;
  const react = (DIFFICULTYREACT(w));

  // obstacle scan
  if (mx !== 0 && a.grounded && !a.inWater && !goal.hold) {
    const look = speed * react + 28;
    const sc = scanAhead(w, a, mx, look);
    if (sc.kind === 'box') {
      if (sc.h - a.z <= maxJumpH(a)) {
        const tte = Math.max(0, (sc.d - 13) / Math.max(speed, 30));
        s.jumpAt = tte + (w.rng.chance(err) ? w.rng.range(0.1, 0.2) : 0);
      } else {
        const ln = freeLane(w, a, mx, look, sc.d, goal.y);
        if (ln) { s.lane = ln; s.laneT = 0.7; my = ln; }
      }
    } else if (sc.kind === 'pit') {
      if (sc.width <= Math.min(48, maxJumpDist(a) + 4)) {
        const tte = Math.max(0, (sc.d - 3) / Math.max(speed, 30));
        s.jumpAt = tte + (w.rng.chance(err) ? w.rng.range(0.04, 0.1) : 0);
      } else {
        const ln = freeLane(w, a, mx, look, sc.d, goal.y);
        if (ln) { s.lane = ln; s.laneT = 0.8; my = ln; }
        else if (w.rng.chance(0.5)) mx = 0;
      }
    }
  }
  // periodic hazards: wait for the pattern, but get impatient after a while so nobody waits forever
  let waited = false;
  if (mx !== 0 && !goal.hold && s.impatient <= 0) {
    for (const m of w.map.movers) {
      if (Math.abs(m.y + m.h / 2 - a.y) > m.h / 2 + 7) continue;
      const eta = moverEta(m, w.t, a.x - 8, 40 + speed * 0.4, 1.1);
      const r = moverRect(m, w.t);
      const approaching = m.kind === 'barrido' ? (r.x < a.x + 70 && r.x + r.w > a.x - 50) : (r.x < a.x + 90 && r.x + r.w > a.x - 14);
      if (!approaching) continue;
      if (m.kind === 'barrido') {
        if (eta < 0.5 && a.grounded) { if (w.rng.chance(1 - err)) s.jumpAt = Math.max(0, eta * 0.4); }
        else if (eta < 1.0) { mx = 0; waited = true; }
      } else if (eta < 0.75) { mx = 0; waited = true; }
    }
  }
  s.waitT = waited ? s.waitT + react : 0;
  if (s.waitT > 2.6) { s.impatient = 1.6; s.waitT = 0; }
  s.impatient = Math.max(0, s.impatient - react);
  s.held = { ...emptyInput(), mx, my };

  // actions
  const t = goal.attack ? w.actors.find((q) => q.id === goal.attack) : undefined;
  if (t && a.pushCd <= 0 && !a.act) {
    const fdx = (t.x - a.x) * a.facing;
    if (fdx > -4 && fdx < PHYS.pushReach && Math.abs(t.y - a.y) < 8 && Math.abs(t.z - a.z) < 20 && w.rng.chance(0.4 + prof.aggr * 0.6)) s.actionFire = true;
  }
  if (goal.pickup && a.carrying === null && !a.act) {
    const near = w.items.find((i) => i.kind === 'ball' && i.state === 'ground' && Math.abs(i.x - a.x) < 14 && Math.abs(i.y - a.y) < 9);
    if (near) s.actionFire = true;
  }
  if (goal.throwAt && a.carrying !== null && !a.act) {
    const tt = w.actors.find((q) => q.id === goal.throwAt);
    if (tt) {
      const fdx = (tt.x - a.x) * a.facing;
      if (fdx > 30 && fdx < 130 && Math.abs(tt.y - a.y) < 10 && w.rng.chance(0.5 + prof.aggr * 0.5)) s.actionFire = true;
    }
  }
  s.wantBop = !!goal.bop;
  if (goal.jumpOnArrive && a.grounded && Math.abs(dx) < 16 && Math.abs(dy) < 14 && s.jumpAt < 0) s.jumpAt = 0.01;
  if (a.power >= PHYS.maxPower && s.powerArmed && s.powerDelay <= 0 && goal.usePower && !a.act && w.rng.chance(prof.powerEager)) s.powerFire = true;
}

function DIFFICULTYREACT(w: World): number {
  const d = DIFFICULTY[w.difficulty];
  return (d.reactMin + d.reactMax) / 2;
}
