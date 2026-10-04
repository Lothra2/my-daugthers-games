import { fx, type Actor, type EventRules, type HudModel, type World } from '../world';
import { spawnItem } from '../items';
import { fmtTime, rankByValue } from './common';
import { startRescueTo } from '../actor';
import { aiAggression } from '../ai';

const ROUNDS = 3;
const ROUND_T = 30;
const BREAK_T = 3;
const GROUND_MARGIN = 6;

interface Island { x: number; y: number; w: number; h: number }

function setIsland(w: World, r: Island): void {
  w.data.island = r;
  const m = w.map;
  const x0 = -40, x1 = m.width + 40;
  m.pits = [
    { x: x0, y: m.groundTop - 60, w: x1 - x0, h: r.y - (m.groundTop - 60) },
    { x: x0, y: r.y + r.h, w: x1 - x0, h: m.groundBottom + 60 - (r.y + r.h) },
    { x: x0, y: r.y, w: r.x - x0, h: r.h },
    { x: r.x + r.w, y: r.y, w: x1 - (r.x + r.w), h: r.h },
  ];
}
const center = (w: World): { x: number; y: number } => { const r = w.data.island as Island; return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };
const edgeDist = (w: World, x: number, y: number): number => { const r = w.data.island as Island; return Math.min(x - r.x, r.x + r.w - x, y - r.y, r.y + r.h - y); };

function startRound(w: World): void {
  const c = center(w);
  w.data.mode = 'fight'; w.data.roundT = 0; w.data.ballT = 3;
  w.items = w.items.filter((i) => i.state === 'gone');
  w.shots = [];
  for (const a of w.actors) {
    const sp = w.map.spawns[a.slot % w.map.spawns.length];
    a.x = sp.x; a.y = sp.y; a.z = 0; a.vx = a.vy = a.vz = 0; a.grounded = true; a.act = null; a.rescue = null; a.carrying = null; a.knockT = 0;
    a.protectT = Math.max(a.protectT, 1.0); a.facing = a.x < c.x ? 1 : -1; a.lastHitBy = null; a.lastHitT = 99;
    if (a.ai) { a.ai.nextThink = 0; a.ai.stuckStage = 0; a.ai.bestDist = Infinity; }
  }
  w.data.fallSeen = {};
  if (w.data.round === ROUNDS - 1) {
    const r = w.data.island0 as Island;
    const nw = Math.round(r.w * 0.85), nh = Math.round(r.h * 0.85);
    setIsland(w, { x: Math.round(r.x + (r.w - nw) / 2), y: Math.round(r.y + (r.h - nh) / 2), w: nw, h: nh });
    fx(w, 'shrink', c.x, c.y);
  }
  fx(w, 'round', c.x, c.y, 0, undefined, w.data.round);
}

export function createArena(): EventRules {
  return {
    id: 'arena', chargeMult: 1.5, maxTime: ROUNDS * (ROUND_T + BREAK_T) + 10,
    setup(w) {
      const p = w.map.props;
      const r: Island = { x: Number(p.ix), y: Number(p.iy), w: Number(p.iw), h: Number(p.ih) };
      w.data.island0 = r; setIsland(w, r);
      w.data.round = 0; w.data.fallSeen = {}; w.data.finished = false;
      startRound(w);
    },
    step(w, dt) {
      if (w.data.finished) return;
      if (w.data.mode === 'break') {
        w.data.breakT -= dt;
        if (w.data.breakT <= 0) { w.data.round++; startRound(w); }
        return;
      }
      w.data.roundT += dt;
      w.data.ballT -= dt;
      const balls = w.items.filter((i) => i.kind === 'ball' && i.state !== 'gone').length;
      if (w.data.ballT <= 0) { w.data.ballT = 5; if (balls < 2) { const c = center(w); spawnItem(w, 'ball', c.x + w.rng.range(-30, 30), c.y + w.rng.range(-14, 14), 60, { vz: 40 }); } }
      const seen = w.data.fallSeen as Record<number, boolean>;
      for (const a of w.actors) {
        a.progress = 0;
        const falling = a.act?.kind === 'fall';
        if (falling && !seen[a.id]) {
          seen[a.id] = true;
          if (a.lastHitBy !== null && a.lastHitT <= 3) {
            const by = w.actors.find((q) => q.id === a.lastHitBy);
            if (by && by !== a) { by.stats2.points++; by.stats2.bursts++; fx(w, 'burst', a.x, a.y, 0, by.id); }
          }
        }
        if (!falling && a.act?.kind !== 'rescue') seen[a.id] = false;
      }
      if (w.data.roundT >= ROUND_T) {
        if (w.data.round >= ROUNDS - 1) { w.data.finished = true; fx(w, 'whistle', 0, 0); }
        else { w.data.mode = 'break'; w.data.breakT = BREAK_T; fx(w, 'roundend', 0, 0, 0, undefined, w.data.round); }
      }
    },
    standings(w) { return rankByValue(w.actors.map((a) => ({ actorId: a.id, value: a.stats2.points, detail: `${a.stats2.points} burbujazos` }))); },
    isOver(w) { return !!w.data.finished; },
    hud(w): HudModel {
      const scores: Record<number, string> = {};
      for (const a of w.actors) scores[a.id] = String(a.stats2.points);
      const left = Math.max(0, ROUND_T - (w.data.roundT ?? 0));
      return { title: 'Arena de Burbujas', timer: fmtTime(left), lines: [`Ronda ${Math.min(ROUNDS, w.data.round + 1)} de ${ROUNDS}`], goalText: '¡Empuja a los demás al agua!', scores };
    },
    aiGoal(w, a) {
      const c = center(w);
      const aggr = aiAggression(a.profile);
      if (w.data.mode === 'break') return { x: a.x, y: a.y, hold: true };
      const rivals = w.actors.filter((t) => t !== a && !t.finished && !(t.act && (t.act.kind === 'rescue' || t.act.kind === 'fall')));
      const near = rivals.sort((p, q) => Math.hypot(p.x - a.x, (p.y - a.y) * 2) - Math.hypot(q.x - a.x, (q.y - a.y) * 2))[0];
      // never walk off the island
      if (edgeDist(w, a.x, a.y) < 14 + GROUND_MARGIN) return { x: c.x, y: c.y, stopDist: 3, usePower: false };
      if (a.carrying !== null && near) return { x: near.x - Math.sign(near.x - a.x) * 60, y: near.y, throwAt: near.id, stopDist: 6, usePower: true };
      const ball = w.items.find((i) => i.kind === 'ball' && i.state === 'ground' && i.owner === null && Math.abs(i.x - a.x) < 110 && edgeDist(w, i.x, i.y) > 10);
      if (ball && a.carrying === null && (a.profile === 'jugueton' || a.profile === 'explorador' || a.charId === 'thor') && !near) return { x: ball.x, y: ball.y, pickup: true, stopDist: 3, usePower: false };
      if (!near) return { x: c.x, y: c.y, stopDist: 8 };
      const d = Math.hypot(near.x - a.x, (near.y - a.y) * 2);
      if (a.profile === 'prudente' && d > 90) return { x: c.x + (a.slot - 1.5) * 20, y: c.y, stopDist: 6, usePower: false };
      // approach from the side of the island centre so the push sends the rival toward the water
      const cx = near.x < c.x ? 1 : -1;
      const tx = d > 26 ? near.x + cx * 12 : near.x, ty = near.y;
      return { x: tx, y: ty, attack: near.id, stopDist: 2, usePower: d < 70 && aggr > 0.2 };
    },
    respawnPoint(w) { return center(w); },
  };
}
export type { Actor };
void startRescueTo;
