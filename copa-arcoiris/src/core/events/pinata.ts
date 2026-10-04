import { fx, actorById, type Actor, type EventRules, type HudModel, type Item, type World } from '../world';
import { spawnItem } from '../items';
import { fmtTime, rankByValue } from './common';

const MAX_HP = 36;
const AUTO_BREAK = 100;
const COLLECT_T = 6;

interface Pinata { x: number; y: number; z: number; baseX: number; hp: number; max: number; t: number; cracked: Set<number>; broken: boolean; brokenT: number; trunk: { x: number; y: number; w: number; h: number } | null; basketT: number }

const P = (w: World): Pinata => w.data.pinata as Pinata;

function dropStars(w: World, n: number, spread = 1): void {
  const p = P(w);
  for (let i = 0; i < n; i++) {
    spawnItem(w, 'star', p.x, p.y + w.rng.range(-8, 8), p.z - 8, { vx: w.rng.range(-44, 44) * spread, vy: w.rng.range(-20, 20), vz: w.rng.range(50, 110) });
  }
}

export function breakPinata(w: World): void {
  const p = P(w);
  if (p.broken) return;
  p.broken = true; p.brokenT = 0;
  fx(w, 'pinata', p.x, p.y, p.z, undefined, 99);
  dropStars(w, 20, 1.8);
  fx(w, 'whistle', p.x, p.y);
}

export function hitPinata(w: World, by: Actor | null, n = 1): void {
  const p = P(w);
  if (p.broken) return;
  for (let i = 0; i < n && !p.broken; i++) {
    p.hp--;
    fx(w, 'pinata', p.x, p.y, p.z, by?.id);
    dropStars(w, w.rng.chance(0.5) ? 2 : 1);
    for (const th of [24, 12]) if (p.hp <= th && !p.cracked.has(th)) { p.cracked.add(th); dropStars(w, 5, 1.5); fx(w, 'crack', p.x, p.y, p.z); }
    if (p.hp <= 0) breakPinata(w);
  }
  if (by) by.stats2.hits++;
}

const inZone = (w: World, x: number, y: number, z: number): boolean => {
  const p = P(w);
  return Math.abs(x - p.x) <= 22 && Math.abs(y - p.y) <= 14 && Math.abs(z + 16 - p.z) <= 26;
};

export function createPinata(): EventRules {
  return {
    id: 'pinata', chargeMult: 1, maxTime: AUTO_BREAK + COLLECT_T + 4,
    setup(w) {
      const o = w.map.objects.find((q) => q.tipo === 'pinata')!;
      const basket = w.map.objects.find((q) => q.tipo === 'canasta')!;
      const trunk = w.map.boxes.find((b) => b.kind === 'tronco') ?? null;
      w.data.pinata = { x: o.x, y: o.y, z: Number(o.props.z ?? 70), baseX: o.x, hp: MAX_HP, max: MAX_HP, t: 0, cracked: new Set<number>(), broken: false, brokenT: 0, trunk: trunk ? { x: trunk.x, y: trunk.y, w: trunk.w, h: trunk.h } : null, basketT: 3 };
      w.data.basket = { x: basket.x, y: basket.y };
      for (const q of w.map.objects) if (q.tipo === 'pelota') spawnItem(w, 'ball', q.x, q.y);
    },
    step(w, dt) {
      const p = P(w);
      p.t += dt;
      p.x = p.baseX + 40 * Math.sin((2 * Math.PI * p.t) / 8);
      if (!p.broken) {
        p.basketT -= dt;
        const balls = w.items.filter((i) => i.kind === 'ball' && i.state !== 'gone').length;
        if (p.basketT <= 0) { p.basketT = 6; if (balls < 3) spawnItem(w, 'ball', w.data.basket.x, w.data.basket.y, 30, { vz: 80, vx: w.rng.range(-30, 30) }); }
        if (w.eventT >= AUTO_BREAK) breakPinata(w);
        // Sophie's rainbow dash hits twice, once per dash
        for (const a of w.actors) {
          if (a.act?.kind === 'power' && a.powerKind === 'rainbow' && !a.dashed.has(-1) && inZone(w, a.x, a.y, a.z + 12)) { a.dashed.add(-1); hitPinata(w, a, 2); }
        }
      } else p.brokenT += dt;
      for (const a of w.actors) a.progress = 0;
    },
    standings(w) { return rankByValue(w.actors.map((a) => ({ actorId: a.id, value: a.stats2.stars, detail: `${a.stats2.stars} estrellas` }))); },
    isOver(w) { const p = P(w); return p.broken && p.brokenT >= COLLECT_T; },
    hud(w): HudModel {
      const p = P(w); const scores: Record<number, string> = {};
      for (const a of w.actors) scores[a.id] = String(a.stats2.stars);
      return { title: 'Piñata de Estrellas', timer: fmtTime(Math.max(0, AUTO_BREAK - w.eventT)), lines: [p.broken ? '¡Recoge las estrellas!' : `Golpes que faltan: ${p.hp}`], goalText: p.broken ? '' : '¡Salta y golpea la piñata!', scores };
    },
    onBop(w, a) {
      if (P(w).broken) return false;
      if (inZone(w, a.x, a.y, a.z)) { hitPinata(w, a, 1); return true; }
      return false;
    },
    onBallHit(w, item: Item) {
      const p = P(w);
      if (p.broken || item.hitIds.has(-1)) return false;
      if (Math.abs(item.x - p.x) < 18 && Math.abs(item.y - p.y) < 14 && Math.abs(item.z - p.z) < 22) {
        item.hitIds.add(-1);
        const by = item.thrownBy !== null ? actorById(w, item.thrownBy) ?? null : null;
        hitPinata(w, by, 1);
        item.vx *= -0.3; item.vz = Math.max(item.vz, 40);
        return true;
      }
      return false;
    },
    onCharge(w, a: Actor) {
      const p = P(w);
      if (p.broken || !p.trunk || a.dashed.has(-2)) return;
      const t = p.trunk;
      if (a.x > t.x - 18 && a.x < t.x + t.w + 18 && Math.abs(a.y - (t.y + t.h)) < 14) { a.dashed.add(-2); hitPinata(w, a, 2); fx(w, 'smash', t.x + t.w / 2, t.y + t.h, 10); }
    },
    shotTarget() { return { id: 0, kind: 'pinata' }; },
    onActorTumble(w, v: Actor) {
      if (v.stats2.stars > 0 && !P(w).broken) { v.stats2.stars--; spawnItem(w, 'star', v.x, v.y, 12, { vz: 90, vx: -v.facing * 30 }); }
    },
    aiGoal(w, a) {
      const p = P(w);
      if (a.act && a.act.kind === 'celebrate') return { x: a.x, y: a.y, hold: true };
      const star = w.items.filter((i) => (i.kind === 'star' || i.kind === 'gold') && i.state === 'ground' && Math.abs(i.x - a.x) < 110).sort((q, r) => Math.abs(q.x - a.x) - Math.abs(r.x - a.x))[0];
      if (star && (p.broken || a.profile === 'explorador' || a.profile === 'prudente' || Math.abs(star.x - a.x) < 40)) return { x: star.x, y: star.y, stopDist: 2, usePower: false };
      if (p.broken) return { x: p.baseX, y: 232, hold: true };
      if (!a.grounded && a.z > 14) return { x: p.x, y: p.y, bop: true, stopDist: 4, usePower: true };
      // stand on the mushroom pad nearest to the pinata: it launches the actor up to where the pinata hangs
      const pad = [...w.map.bounces].sort((q, r) => Math.abs(q.x + q.w / 2 - p.x) - Math.abs(r.x + r.w / 2 - p.x))[0];
      if (pad) return { x: pad.x + pad.w / 2, y: pad.y + pad.h / 2, stopDist: 2, usePower: true };
      return { x: p.x, y: p.y, jumpOnArrive: true, usePower: true };
    },
    respawnPoint(w, a) { const s = w.map.spawns[a.slot % w.map.spawns.length]; return { x: s.x, y: s.y }; },
  };
}
