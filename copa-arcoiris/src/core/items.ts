import { PHYS } from './data';
import { boxAt, inRect, overlap } from './mapdata';
import { applyHit } from './combat';
import { actorById, fx, type Actor, type Item, type ItemKind, type World } from './world';

export function spawnItem(w: World, kind: ItemKind, x: number, y: number, z = 0, opts: Partial<Item> = {}): Item {
  const it: Item = {
    id: w.nextId++, kind, x, y, z, vx: 0, vy: 0, vz: 0, state: 'ground', owner: null, thrownBy: null, thrownT: 0,
    hp: kind === 'box' ? 2 : 1, bounces: 0, age: 0, hitIds: new Set(), ...opts,
  };
  w.items.push(it);
  return it;
}
export const itemById = (w: World, id: number): Item | undefined => w.items.find((i) => i.id === id);

export function findPickup(w: World, a: Actor, reach: number = PHYS.pickupReach): Item | null {
  let best: Item | null = null, bd = Infinity;
  for (const it of w.items) {
    if (it.kind !== 'ball' || it.state !== 'ground' || it.owner !== null) continue;
    const dx = Math.abs(it.x - a.x), dy = Math.abs(it.y - a.y);
    if (dx > reach + a.stats.footW / 4 || dy > Math.max(10, reach * 0.7) || Math.abs(it.z - a.z) > 20) continue;
    const d = dx + dy;
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}

export function grabItem(w: World, a: Actor, id: number, auto = false): void {
  const it = itemById(w, id);
  if (!it || it.state !== 'ground' || (it.owner !== null && it.owner !== a.id)) return;
  if (a.carrying !== null) return;
  it.state = 'carried'; it.owner = a.id; a.carrying = it.id; it.vx = it.vy = it.vz = 0;
  fx(w, 'pickup', it.x, it.y, it.z, a.id, auto ? 1 : 0);
}

export function dropCarried(w: World, a: Actor, hop = false): void {
  if (a.carrying === null) return;
  const it = itemById(w, a.carrying);
  a.carrying = null;
  if (!it) return;
  it.state = 'ground'; it.owner = null;
  it.x = a.x; it.y = a.y; it.z = a.z + 14;
  if (hop) { it.vz = 90; it.vx = -a.facing * 30; }
}

export function releaseThrow(w: World, a: Actor): void {
  if (a.carrying === null) return;
  const it = itemById(w, a.carrying);
  a.carrying = null;
  if (!it) return;
  const sp = PHYS.throwSpeed * a.stats.throwMult;
  it.state = 'flying'; it.owner = null; it.thrownBy = a.id; it.thrownT = 0; it.hitIds.clear();
  it.x = a.x + a.facing * (a.stats.isDog ? 16 : 10); it.y = a.y; it.z = a.z + (a.stats.isDog ? 12 : 18);
  it.vx = a.facing * sp; it.vy = a.input.my * 40; it.vz = PHYS.throwVz; it.bounces = 0;
  fx(w, 'throw', it.x, it.y, it.z, a.id);
}

export function breakBox(w: World, it: Item, by: Actor | null): void {
  it.state = 'gone';
  fx(w, 'crate', it.x, it.y, it.z + 8, by?.id);
  if (w.rng.chance(0.5)) spawnItem(w, 'ball', it.x, it.y, it.z + 10, { vz: 80 });
  else for (let i = 0; i < 2; i++) spawnItem(w, 'star', it.x + (i ? 8 : -8), it.y, it.z + 10, { vz: 110, vx: (i ? 1 : -1) * 30 });
}

function supportAt(w: World, x: number, y: number, z: number): number {
  let best = 0;
  const fr = { x: x - 3, y: y - 3, w: 6, h: 6 };
  for (const b of w.map.boxes) {
    if (b.alto <= 0 || b.alto > z + 0.5) continue;
    if (overlap(fr, boxAt(b, w.t)) && b.alto > best) best = b.alto;
  }
  return best;
}

export function collectStar(w: World, a: Actor, it: Item): void {
  it.state = 'gone';
  a.power = Math.min(PHYS.maxPower, a.power + PHYS.starPower);
  if (it.kind === 'gold') a.stats2.gold++; else a.stats2.stars++;
  fx(w, 'star', it.x, it.y, it.z, a.id, it.kind === 'gold' ? 1 : 0);
}

export function updateItems(w: World, dt: number): void {
  w.data.breakBox = breakBox;
  for (const it of w.items) {
    if (it.state === 'gone') continue;
    it.age += dt;
    if (it.state === 'carried') {
      const o = actorById(w, it.owner ?? -1);
      if (!o) { it.state = 'ground'; it.owner = null; continue; }
      it.x = o.x + o.facing * (o.stats.isDog ? 16 : 6); it.y = o.y + 0.2; it.z = o.z + (o.stats.isDog ? 11 : 20);
      continue;
    }
    if (it.kind === 'box' || it.kind === 'target') continue;
    // collect stars
    if (it.kind === 'star' || it.kind === 'gold') {
      let magnetized = false;
      for (const a of w.actors) {
        if (a.finished || (a.act && (a.act.kind === 'rescue' || a.act.kind === 'fall'))) continue;
        const dx = a.x - it.x, dy = a.y - it.y;
        const zoom = a.powerKind === 'zoom' && a.powerT > 0;
        const rad = zoom ? 16 : 11;
        if (Math.abs(dx) < rad && Math.abs(dy) < rad * 0.7 && it.z - a.z > -10 && it.z - a.z < 30) { collectStar(w, a, it); break; }
        if (a.charId === 'thor' && w.rules.id === 'pinata' && Math.hypot(dx, dy * 2) < 40) {
          it.x += Math.sign(dx) * 90 * dt; it.y += Math.sign(dy) * 50 * dt; magnetized = true;
        }
      }
      if ((it.state as string) === 'gone') continue;
      void magnetized;
    }
    // physics
    if (it.state === 'flying') {
      it.thrownT += dt;
      it.x += it.vx * dt; it.y += it.vy * dt;
      it.vz -= PHYS.gravity * 0.55 * dt; it.z += it.vz * dt;
      for (const a of w.actors) {
        if (a.id === it.thrownBy && it.thrownT < 0.3) continue;
        if (it.hitIds.has(a.id) || a.finished) continue;
        if (Math.abs(a.x - it.x) < 9 + a.stats.footW / 4 && Math.abs(a.y - it.y) < 8 && it.z > a.z - 4 && it.z < a.z + 36) {
          it.hitIds.add(a.id);
          const by = it.thrownBy !== null ? actorById(w, it.thrownBy) ?? null : null;
          applyHit(w, a, by, 'ball', it.vx >= 0 ? 1 : -1);
          it.vx *= -0.25; it.vz = Math.max(it.vz, 50);
        }
      }
      for (const o of w.items) {
        if (o.kind !== 'box' || o.state !== 'ground') continue;
        if (Math.abs(o.x - it.x) < 12 && Math.abs(o.y - it.y) < 10 && it.z < o.z + 22) {
          o.hp -= 2; fx(w, 'hit', o.x, o.y, o.z + 10);
          if (o.hp <= 0) breakBox(w, o, it.thrownBy !== null ? actorById(w, it.thrownBy) ?? null : null);
          it.vx *= -0.2;
        }
      }
      if (w.rules.onBallHit) w.rules.onBallHit(w, it);
      const s = supportAt(w, it.x, it.y, it.z);
      if (it.z <= s && it.vz <= 0) {
        it.z = s;
        if (it.bounces < 1) { it.bounces++; it.vz = PHYS.ballBounceV; it.vx *= 0.5; it.vy *= 0.5; fx(w, 'ballbounce', it.x, it.y, it.z); }
        else { it.state = 'ground'; it.vx = it.vy = it.vz = 0; }
      }
      continue;
    }
    // ground (also stars with bounce)
    it.x += it.vx * dt; it.y += it.vy * dt;
    const s = supportAt(w, it.x, it.y, it.z + 1);
    if (it.z > s + 0.01 || it.vz > 0) {
      it.vz -= PHYS.gravity * 0.6 * dt; it.z += it.vz * dt;
      if (it.z <= s && it.vz <= 0) {
        it.z = s;
        if (it.kind !== 'ball' && Math.abs(it.vz) > 50) it.vz = -it.vz * 0.45; else it.vz = 0;
        it.vx *= 0.6;
      }
    } else { it.z = s; it.vx *= 0.9; it.vy *= 0.9; }
    if (w.map.props.freeY) it.y = Math.max(w.map.groundTop - 40, Math.min(w.map.groundBottom + 40, it.y));
    else it.y = Math.max(w.map.groundTop + 4, Math.min(w.map.groundBottom - 4, it.y));
    it.x = Math.max(6, Math.min(w.map.width - 6, it.x));
    if (it.z <= 0.01) {
      const wz = w.map.water.find((r) => inRect(r, it.x, it.y));
      if (wz) it.x += wz.corriente * dt;
      if (w.map.pits.some((r) => inRect(r, it.x, it.y))) { it.state = 'gone'; fx(w, 'plop', it.x, it.y, 0); }
    }
  }
  if (w.items.length > 40 || w.tick % 120 === 0) w.items = w.items.filter((i) => i.state !== 'gone');
}

export function updateShots(w: World, dt: number): void {
  for (const s of w.shots) {
    s.t += dt;
    if (s.t < 0) continue;
    let tx = s.x + s.vx, ty = s.y, tz = s.z;
    if (s.targetKind === 'actor') {
      const t = actorById(w, s.targetId);
      if (t) { tx = t.x; ty = t.y; tz = t.z + 14; }
    } else if (s.targetKind === 'pinata') {
      const p = w.data.pinata;
      if (p) { tx = p.x; ty = p.y; tz = p.z; }
    }
    const dx = tx - s.x, dy = ty - s.y, dz = tz - s.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    const sp = 150 * dt;
    s.x += (dx / d) * Math.min(sp, d); s.y += (dy / d) * Math.min(sp, d); s.z += (dz / d) * Math.min(sp, d);
    if (d < 8 && s.targetKind !== 'none') {
      if (s.targetKind === 'actor') {
        const t = actorById(w, s.targetId); const o = actorById(w, s.owner);
        if (t) applyHit(w, t, o ?? null, 'star', Math.sign(dx) || 1);
      } else if (s.targetKind === 'pinata') {
        const o = actorById(w, s.owner);
        if (o && w.rules.onBop) w.rules.onBop(w, o, 1);
      }
      s.ttl = 0;
    }
    if (s.t > s.ttl || s.x < 0 || s.x > w.map.width) s.ttl = 0;
  }
  if (w.shots.length) w.shots = w.shots.filter((s) => s.ttl > 0 && s.t <= s.ttl);
}
