import { PHYS, POWER } from './data';
import { boxAt, inRect, moverRect, overlap } from './mapdata';
import type { Rect, State } from './types';
import { emptyInput } from './types';
import { fx, type Actor, type World } from './world';
import { applyHit, doBop, doPush, startTumble } from './combat';
import { activatePower } from './abilities';
import { dropCarried, findPickup, grabItem, releaseThrow } from './items';

const LOCKED = new Set<State>(['stagger', 'tumble', 'getup', 'fall', 'rescue', 'celebrate', 'finished']);
const approach = (v: number, t: number, d: number): number => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));

export const footRect = (a: { x: number; y: number; stats: { footW: number } }, x = a.x, y = a.y, shrink = 1): Rect => {
  const fw = a.stats.footW * shrink;
  return { x: x - fw / 2, y: y - PHYS.footH / 2, w: fw, h: PHYS.footH };
};

/** Highest surface the feet can stand on at (x, y): boxes whose top is not above z + stepUp. 0 is the ground. */
export function supportZ(w: World, a: Actor, x: number, y: number, z: number): { z: number; box: string | null } {
  let best = 0, id: string | null = null;
  const fr = footRect(a, x, y, 0.7);
  for (const b of w.map.boxes) {
    if (b.alto <= 0 || b.alto > z + PHYS.stepUp + 0.01) continue;
    if (overlap(fr, boxAt(b, w.t)) && b.alto >= best) { best = b.alto; id = b.id; }
  }
  return { z: best, box: id };
}

function blockedAt(w: World, a: Actor, x: number, y: number): boolean {
  const fr = footRect(a, x, y);
  for (const b of w.map.boxes) {
    if (b.alto <= 0) continue;
    if (a.z >= b.alto - PHYS.stepUp) continue;
    if (overlap(fr, boxAt(b, w.t))) return true;
  }
  return false;
}

function moveBy(w: World, a: Actor, dx: number, dy: number): void {
  const nx = a.x + dx;
  if (nx >= 8 && nx <= w.map.width - 8 && !blockedAt(w, a, nx, a.y)) a.x = nx; else a.vx = 0;
  let ny = a.y + dy;
  const m = w.map;
  if (!m.props.freeY) ny = Math.max(m.groundTop, Math.min(m.groundBottom, ny));
  else ny = Math.max(m.groundTop - 40, Math.min(m.groundBottom + 40, ny));
  if (!blockedAt(w, a, a.x, ny)) a.y = ny; else a.vy = 0;
}

function setAct(a: Actor, kind: State, dur: number, aux?: number): void { a.act = { kind, t: 0, dur, hit: false, aux }; }

export function startFall(w: World, a: Actor, kind = 'plop'): void {
  if (a.act && (a.act.kind === 'fall' || a.act.kind === 'rescue')) return;
  dropCarried(w, a);
  setAct(a, 'fall', PHYS.fallT);
  a.vx = a.vy = 0; a.knockT = 0; a.powerT = a.powerKind === 'bubble' ? 0 : a.powerT;
  a.stats2.falls++;
  fx(w, kind, a.x, a.y, 0, a.id);
}

export function startRescueTo(w: World, a: Actor, tx: number, ty: number, dur = PHYS.rescueT): void {
  dropCarried(w, a);
  a.rescue = { sx: a.x, sy: a.y, tx, ty, t: 0, dur };
  setAct(a, 'rescue', dur);
  a.vx = a.vy = a.vz = 0; a.knockT = 0; a.protectT = Math.max(a.protectT, 0.01);
  fx(w, 'bubble', a.x, a.y, a.z, a.id);
}

export function finishActor(w: World, a: Actor): void {
  a.finished = true; a.finishT = w.eventT;
  dropCarried(w, a);
  setAct(a, 'celebrate', Infinity);
  a.vx = a.vy = 0;
}

export function updateActor(w: World, a: Actor, dt: number, live: boolean): void {
  const st = a.stats;
  a.stateT += dt;
  a.protectT = Math.max(0, a.protectT - dt);
  a.immuneT = Math.max(0, a.immuneT - dt);
  a.pushCd = Math.max(0, a.pushCd - dt);
  a.strokeCd = Math.max(0, a.strokeCd - dt);
  a.strokeT = Math.max(0, a.strokeT - dt);
  a.landT = Math.max(0, a.landT - dt);
  a.lastHitT += dt;
  a.powerT = Math.max(0, a.powerT - dt);
  if (live && !a.finished && a.power < PHYS.maxPower) a.power = Math.min(PHYS.maxPower, a.power + (PHYS.maxPower / st.charge) * w.rules.chargeMult * dt);

  const inp = live && !a.finished ? a.input : emptyInput();
  const act = a.act;
  let locked = false, moveScale = 1, overrideV: { vx: number; vy: number } | null = null, hover = false;

  if (act) {
    act.t += dt;
    locked = LOCKED.has(act.kind);
    switch (act.kind) {
      case 'pickup':
        moveScale = 0;
        if (act.t >= act.dur) { if (act.aux !== undefined) grabItem(w, a, act.aux); a.act = null; }
        break;
      case 'throw':
        moveScale = 0.5;
        if (!act.hit && act.t >= PHYS.throwRelease) { act.hit = true; releaseThrow(w, a); }
        if (act.t >= act.dur) a.act = null;
        break;
      case 'push':
        moveScale = 0.3;
        if (!act.hit && act.t >= PHYS.pushWind) { act.hit = true; doPush(w, a); }
        if (act.t >= act.dur) a.act = null;
        break;
      case 'bop':
        if (!act.hit && act.t >= 0.06) { act.hit = true; doBop(w, a); }
        if (act.t >= act.dur) a.act = null;
        break;
      case 'power':
        moveScale = a.powerKind === 'stars' ? 0.2 : 1;
        if (a.powerKind === 'rainbow') { overrideV = { vx: a.facing * POWER.rainbow.speed, vy: inp.my * 45 }; hover = true; }
        else if (a.powerKind === 'charge') { overrideV = { vx: a.facing * POWER.charge.speed, vy: inp.my * 40 }; chargeHits(w, a); }
        if (act.t >= act.dur) { a.act = null; a.dashed.clear(); }
        break;
      case 'stagger':
        if (act.t >= act.dur) a.act = null;
        break;
      case 'tumble':
        if (act.t >= act.dur) { a.act = null; a.protectT = Math.max(a.protectT, PHYS.protectAfterTumble); }
        break;
      case 'fall':
        if (act.t >= act.dur) { const p = w.rules.respawnPoint(w, a); startRescueTo(w, a, p.x, p.y); }
        break;
      case 'rescue': {
        const r = a.rescue;
        if (r) {
          const u = Math.min(1, act.t / r.dur), e = u * u * (3 - 2 * u);
          a.x = r.sx + (r.tx - r.sx) * e; a.y = r.sy + (r.ty - r.sy) * e;
          a.z = Math.sin(Math.PI * u) * 26; a.vz = 0; a.grounded = u >= 1;
          if (u >= 1) {
            a.rescue = null; a.act = null; a.z = 0; a.grounded = true; a.inWater = false; a.landT = 0.1;
            a.protectT = Math.max(a.protectT, st.protectRescue);
            fx(w, 'pop', a.x, a.y, 0, a.id);
          }
        }
        break;
      }
      default: break;
    }
  }
  const rescuing = a.act !== null && a.act.kind === 'rescue';
  if (rescuing) { finalizeState(a); a.safeClock = 0; return; }

  const act2 = a.act;
  const controllable = !locked && (act2 === null || act2.kind === 'push' || act2.kind === 'throw' || act2.kind === 'pickup' || act2.kind === 'bop' || act2.kind === 'power');
  const canStart = !locked && act2 === null;

  // ---- inputs that start things
  if (controllable && live) {
    if (inp.jumpPressed && canStart) {
      if (a.inWater) {
        if (a.strokeCd <= 0) { a.strokeT = PHYS.strokeT; a.strokeCd = PHYS.strokeCd; fx(w, 'stroke', a.x, a.y, 0, a.id); }
      } else if (a.grounded) {
        a.vz = PHYS.jumpV * st.jump; a.grounded = false; a.onBox = null; fx(w, 'jump', a.x, a.y, a.z, a.id);
      }
    }
    if (inp.actionPressed && canStart && a.pushCd <= 0) {
      if (a.carrying !== null) setAct(a, 'throw', PHYS.throwT);
      else {
        const it = findPickup(w, a);
        if (it) { it.owner = a.id; setAct(a, 'pickup', st.instantPickup ? 0.1 : PHYS.pickupT, it.id); }
        else if (!a.grounded && a.z > 10) { setAct(a, 'bop', 0.3); a.pushCd = PHYS.pushCd; }
        else { setAct(a, 'push', PHYS.pushWind + PHYS.pushHit + PHYS.pushRecover); a.pushCd = PHYS.pushCd; }
      }
    }
    if (inp.powerPressed && canStart && a.power >= PHYS.maxPower) activatePower(w, a);
  }

  // ---- desired velocity
  let dvx = 0, dvy = 0;
  const swimming = a.inWater;
  if (controllable) {
    let mx = inp.mx, my = inp.my;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    const mag = Math.min(1, len);
    if (mag > 0.15) {
      a.quietT = 0; a.runT += dt;
      if (mx > 0.2) a.facing = 1; else if (mx < -0.2) a.facing = -1;
    } else { a.quietT += dt; if (a.quietT > 0.1) a.runT = 0; }
    let maxS: number;
    if (swimming) {
      maxS = PHYS.swimSpeed * st.swim * (a.powerKind === 'bubble' && a.powerT > 0 ? POWER.bubble.swimMult * a.powerLevelBoost : 1);
      if (a.strokeT > 0) maxS += PHYS.strokeV * 2;
    } else {
      maxS = a.runT >= st.runDelay ? st.run : PHYS.walk;
      if (a.carrying !== null) maxS *= st.carrySlow;
      if (a.powerKind === 'zoom' && a.powerT > 0) maxS *= POWER.zoom.mult * a.powerLevelBoost;
    }
    if (a.ai) maxS *= a.ai.speedMult;
    maxS *= moveScale;
    dvx = mx * maxS * mag; dvy = my * maxS * mag * PHYS.depthFactor;
  }
  const acc = (a.grounded || swimming ? PHYS.accel : PHYS.accel * st.airControl) * dt;
  a.vx = approach(a.vx, dvx, acc);
  a.vy = approach(a.vy, dvy, acc);
  if (locked) { a.vx = approach(a.vx, 0, PHYS.accel * dt); a.vy = approach(a.vy, 0, PHYS.accel * dt); }
  if (overrideV) { a.vx = overrideV.vx; a.vy = overrideV.vy; }
  if (a.act && a.act.kind === 'fall') { a.vx = a.vy = 0; }

  // ---- platforms carry whoever stands on them
  let pdx = 0, pdy = 0;
  if (a.onBox && a.grounded) {
    const b = w.map.boxes.find((q) => q.id === a.onBox);
    if (b && b.move) { const p0 = boxAt(b, w.t - dt), p1 = boxAt(b, w.t); pdx = p1.x - p0.x; pdy = p1.y - p0.y; }
  }
  let cur = 0;
  if (a.inWater) { const wz = w.map.water.find((r) => inRect(r, a.x, a.y)); if (wz) cur = wz.corriente; }
  let kx = 0, ky = 0;
  if (a.knockT > 0) { kx = a.knockVx * dt; ky = a.knockVy * dt; a.knockT -= dt; }
  moveBy(w, a, a.vx * dt + kx + pdx + cur * dt, a.vy * dt + ky + pdy);

  // ---- vertical
  const sup = supportZ(w, a, a.x, a.y, a.z);
  if (a.grounded) {
    if (a.z > sup.z + 0.01) {
      if (a.z - sup.z <= PHYS.stepUp) { a.z = sup.z; a.onBox = sup.box; } else { a.grounded = false; a.onBox = null; a.vz = 0; }
    } else { a.z = sup.z; a.onBox = sup.box; }
  }
  if (!a.grounded && !(a.act && a.act.kind === 'rescue')) {
    if (hover) { a.vz = 0; }
    else if (a.powerKind === 'bubble' && a.powerT > 0 && inp.jump && controllable) {
      const cap = POWER.bubble.floatZ;
      if (a.z < cap) a.vz = Math.min(a.vz + 1400 * dt, 70); else a.vz = Math.min(a.vz, 0) * 0.5;
      if (a.z >= cap && a.vz < 8) a.vz = 0;
    } else {
      const g = PHYS.gravity * (a.powerKind === 'bubble' && a.powerT > 0 ? 0.35 : 1);
      a.z += a.vz * dt - 0.5 * g * dt * dt; // exact for constant acceleration, so jump height matches v^2 / 2g
      a.vz -= g * dt;
    }
    if (hover || (a.powerKind === 'bubble' && a.powerT > 0 && inp.jump && controllable)) a.z += a.vz * dt;
    const s2 = supportZ(w, a, a.x, a.y, a.z);
    if (a.vz <= 0 && a.z <= s2.z + 0.01) {
      const impact = -a.vz;
      a.z = s2.z; a.vz = 0; a.grounded = true; a.onBox = s2.box;
      if (impact > 150) { a.landT = 0.12; }
      if (impact > 90) fx(w, 'land', a.x, a.y, a.z, a.id, impact);
    }
    if (hover && a.z < 0) a.z = 0;
  }
  if (hover && a.grounded) { /* rainbow dash floats over gaps */ }

  // ---- ground hazards
  const g0 = a.grounded && a.z <= 0.01 && !hover;
  const wasWater = a.inWater;
  const inWaterNow = g0 && w.map.water.some((r) => inRect(r, a.x, a.y));
  if (inWaterNow !== wasWater) fx(w, 'splash', a.x, a.y, 0, a.id);
  a.inWater = inWaterNow;
  if (g0 && !a.inWater && live && (!a.act || !LOCKED.has(a.act.kind)) && w.map.pits.some((r) => inRect(r, a.x, a.y))) startFall(w, a);
  if (a.grounded && a.z <= sup.z + 0.5 && !a.inWater) {
    for (const bz of w.map.bounces) {
      if (inRect(bz, a.x, a.y) && a.vz <= 0 && a.landT >= 0) {
        a.vz = bz.fuerza * (a.charId === 'thor' ? 1.12 : 1); a.grounded = false; a.onBox = null;
        fx(w, 'bounce', a.x, a.y, a.z, a.id);
        break;
      }
    }
  }
  if (live && w.map.movers.length && a.protectT <= 0 && a.immuneT <= 0 && !a.finished && !(a.act && LOCKED.has(a.act.kind))) {
    const fr = footRect(a);
    for (const m of w.map.movers) {
      if (a.z >= m.alto) continue;
      if (overlap(fr, moverRect(m, w.t))) { applyHit(w, a, null, 'hazard', a.x < moverRect(m, w.t).x + m.w / 2 ? -1 : 1); break; }
    }
  }

  // ---- safe spot tracking (for rescue)
  a.safeClock += dt;
  if (a.safeClock >= 0.25 && a.grounded && !a.inWater && !a.act) {
    a.safeClock = 0;
    const nearPit = w.map.pits.some((r) => a.x > r.x - 24 && a.x < r.x + r.w + 24 && a.y > r.y - 12 && a.y < r.y + r.h + 12);
    if (!nearPit && a.z <= 0.01) {
      if (a.safe) a.safe2 = { x: a.safe.x, y: a.safe.y };
      a.safe = { x: a.x, y: a.y, t: w.t };
    }
  }

  // ---- auto pickup (Thor) and zoom magnet
  if (live && (st.autoPickup || (a.powerKind === 'zoom' && a.powerT > 0)) && !a.act && a.carrying === null && a.grounded) {
    const it = findPickup(w, a, 10);
    if (it) grabItem(w, a, it.id, true);
  }
  finalizeState(a);
}

function chargeHits(w: World, a: Actor): void {
  const fr = { x: a.x + (a.facing > 0 ? 0 : -22), y: a.y - 10, w: 22, h: 20 };
  for (const t of w.actors) {
    if (t === a || a.dashed.has(t.id) || t.finished) continue;
    if (Math.abs(t.z - a.z) > PHYS.pushDz) continue;
    if (t.x > fr.x && t.x < fr.x + fr.w && t.y > fr.y && t.y < fr.y + fr.h) {
      a.dashed.add(t.id);
      applyHit(w, t, a, 'charge', a.facing);
    }
  }
  for (const b of w.map.boxes) {
    if (b.light && b.alto > 0) {
      const r = boxAt(b, w.t);
      if (r.x < fr.x + fr.w && r.x + r.w > fr.x && r.y < fr.y + fr.h && r.y + r.h > fr.y) { b.alto = 0; fx(w, 'smash', r.x + r.w / 2, r.y + r.h / 2, 8, a.id); }
    }
  }
  w.rules.onCharge?.(w, a);
}

function finalizeState(a: Actor): void {
  let s: State;
  const act = a.act;
  if (act) {
    s = act.kind;
    if (act.kind === 'tumble') {
      const g = a.stats.getup;
      if (act.t > (PHYS.tumbleFall + PHYS.tumbleLie) * g) s = 'getup';
    }
  } else if (a.inWater) s = 'swim';
  else if (!a.grounded) s = a.vz > 0 ? 'jumpRise' : 'jumpFall';
  else if (a.landT > 0) s = 'land';
  else {
    const moving = Math.hypot(a.vx, a.vy) > 8;
    if (a.carrying !== null) s = 'carry';
    else s = moving ? (a.runT >= a.stats.runDelay ? 'run' : 'walk') : 'idle';
  }
  if (s !== a.state) { a.state = s; a.stateT = 0; }
}

export { startTumble };
