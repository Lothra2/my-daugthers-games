import { POWER } from './data';
import { fx, type Actor, type Shot, type World } from './world';
import { actorById } from './world';

/** Starts the character power. Callers check that the bar is full. Costs the whole bar. */
export function activatePower(w: World, a: Actor): void {
  a.power = 0;
  const boost = a.powerLevelBoost;
  fx(w, 'power', a.x, a.y, a.z, a.id, ['rainbow', 'bubble', 'charge', 'stars', 'zoom'].indexOf(a.powerKind));
  switch (a.stats.power) {
    case 'rainbow': {
      const d = POWER.rainbow.dur * boost;
      a.act = { kind: 'power', t: 0, dur: d, hit: false }; a.immuneT = d; a.dashed.clear();
      break;
    }
    case 'bubble': {
      const d = POWER.bubble.dur * boost;
      a.powerT = d; a.immuneT = d; fx(w, 'bubble', a.x, a.y, a.z, a.id);
      break;
    }
    case 'charge': {
      const d = POWER.charge.dur * boost;
      a.act = { kind: 'power', t: 0, dur: d, hit: false }; a.immuneT = d; a.dashed.clear();
      break;
    }
    case 'stars': {
      a.act = { kind: 'power', t: 0, dur: POWER.stars.dur, hit: false };
      for (let i = 0; i < POWER.stars.count; i++) {
        const tg = w.rules.shotTarget ? w.rules.shotTarget(w, a, i) : defaultShotTarget(w, a, i);
        const s: Shot = { id: w.nextId++, x: a.x + a.facing * 6, y: a.y, z: a.z + 20, owner: a.id, targetId: tg.id, targetKind: tg.kind, t: -i * 0.08, ttl: 3.2, vx: a.facing * 120 };
        w.shots.push(s);
      }
      break;
    }
    case 'zoom': {
      a.powerT = POWER.zoom.dur * boost;
      break;
    }
  }
}

/** The three rivals closest ahead, nearest first. When there are fewer, the remaining stars fly straight. */
export function defaultShotTarget(w: World, a: Actor, idx: number): { id: number; kind: 'actor' | 'pinata' | 'none' } {
  const rivals = w.actors.filter((t) => t !== a && !t.finished)
    .sort((p, q) => Math.abs(p.x - a.x) + Math.abs(p.y - a.y) * 2 - (Math.abs(q.x - a.x) + Math.abs(q.y - a.y) * 2));
  const ahead = rivals.filter((t) => (t.x - a.x) * a.facing > -40);
  const pool = ahead.length ? ahead : rivals;
  const t = pool[idx];
  return t ? { id: t.id, kind: 'actor' } : { id: 0, kind: 'none' };
}
export { actorById };
