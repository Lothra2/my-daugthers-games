import { PHYS, POWER } from './data';
import { fx, type Actor, type World } from './world';
import { dropCarried } from './items';

export type HitKind = 'push' | 'ball' | 'hazard' | 'charge' | 'star' | 'bop';
const NOHIT = new Set(['tumble', 'fall', 'rescue']);

export const canBeHit = (a: Actor): boolean =>
  a.protectT <= 0 && a.immuneT <= 0 && !a.finished && !(a.act && NOHIT.has(a.act.kind));

export function startTumble(w: World, v: Actor, dir: number): void {
  dropCarried(w, v, true);
  const g = v.stats.getup;
  const dur = (PHYS.tumbleFall + PHYS.tumbleLie + PHYS.tumbleGetup) * g;
  v.act = { kind: 'tumble', t: 0, dur, hit: false };
  v.knockVx = dir * 110; v.knockVy = 0; v.knockT = PHYS.tumbleFall * g;
  v.hitTimes.length = 0;
  if (v.grounded && !v.inWater) { v.vz = 110; v.grounded = false; v.onBox = null; }
  fx(w, 'tumble', v.x, v.y, v.z, v.id);
  w.rules.onActorTumble?.(w, v);
}

/** Applies a hit. Returns false when the victim was protected (the view shows a blocked spark). */
export function applyHit(w: World, v: Actor, by: Actor | null, kind: HitKind, dirHint = 0): boolean {
  if (!canBeHit(v)) { fx(w, 'block', v.x, v.y, v.z + 12, v.id); return false; }
  v.lastHitBy = by ? by.id : null; v.lastHitT = 0;
  if (by) by.stats2.hits++;
  const dir = dirHint || (by ? (v.x - by.x >= 0 ? 1 : -1) : -v.facing);
  if (kind === 'push' || kind === 'bop') {
    v.hitTimes = v.hitTimes.filter((t) => w.t - t < PHYS.tumbleChainWindow);
    v.hitTimes.push(w.t);
    if (v.hitTimes.length >= PHYS.tumbleChain && !v.inWater) { startTumble(w, v, dir); fx(w, 'hit', v.x, v.y, v.z + 14, v.id); return true; }
    const give = by ? by.stats.pushGive : 1;
    const dist = PHYS.pushKnock * give * v.stats.pushRecv * (kind === 'bop' ? 0.7 : 1);
    v.act = { kind: 'stagger', t: 0, dur: PHYS.staggerT, hit: false };
    v.knockVx = (dir * dist) / PHYS.pushKnockT; v.knockVy = 0; v.knockT = PHYS.pushKnockT;
    if (v.carrying !== null && w.rng.chance(0.5)) dropCarried(w, v, true);
    fx(w, 'push', v.x, v.y, v.z + 14, v.id);
    return true;
  }
  if (kind === 'star') {
    dropCarried(w, v, true);
    v.act = { kind: 'stagger', t: 0, dur: POWER.stars.stun, hit: false };
    v.knockVx = dir * 40; v.knockT = 0.2;
    fx(w, 'hit', v.x, v.y, v.z + 14, v.id);
    return true;
  }
  if (v.inWater) {
    v.act = { kind: 'stagger', t: 0, dur: PHYS.staggerT, hit: false };
    fx(w, 'hit', v.x, v.y, v.z + 14, v.id);
    return true;
  }
  startTumble(w, v, dir);
  fx(w, 'hit', v.x, v.y, v.z + 14, v.id);
  return true;
}

export function findPushTarget(w: World, a: Actor, reach: number, dyMax: number, dzMax: number): Actor | null {
  let best: Actor | null = null, bd = Infinity;
  for (const t of w.actors) {
    if (t === a || t.finished) continue;
    const dx = (t.x - a.x) * a.facing;
    if (dx < -4 || dx > reach + t.stats.footW / 2) continue;
    if (Math.abs(t.y - a.y) > dyMax) continue;
    if (Math.abs(t.z - a.z) > dzMax) continue;
    const d = dx + Math.abs(t.y - a.y);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}

export function doPush(w: World, a: Actor): void {
  // gift boxes in reach
  for (const it of w.items) {
    if (it.kind === 'box' && it.state === 'ground') {
      const dx = (it.x - a.x) * a.facing;
      if (dx > -2 && dx < PHYS.pushReach + 6 && Math.abs(it.y - a.y) < PHYS.pushDy && Math.abs(it.z - a.z) < 20) {
        it.hp--; fx(w, 'hit', it.x, it.y, it.z + 10, a.id);
        if (it.hp <= 0) w.data.breakBox?.(w, it, a);
        return;
      }
    }
  }
  const t = findPushTarget(w, a, PHYS.pushReach, PHYS.pushDy, PHYS.pushDz);
  if (t) applyHit(w, t, a, 'push', a.facing);
  else fx(w, 'whiff', a.x + a.facing * 12, a.y, a.z + 12, a.id);
}

/** Toy hit in the air: first the event target (pinata), then rivals in reach. */
export function doBop(w: World, a: Actor): void {
  if (w.rules.onBop && w.rules.onBop(w, a, 1)) return;
  const t = findPushTarget(w, a, 20, 12, 24);
  if (t) applyHit(w, t, a, 'bop', a.facing);
  else fx(w, 'whiff', a.x + a.facing * 12, a.y, a.z + 14, a.id);
}
