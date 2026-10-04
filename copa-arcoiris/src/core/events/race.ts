import { startRescueTo, finishActor } from '../actor';
import { fx, type Actor, type EventRules, type HudModel, type Standing, type World } from '../world';
import { spawnItem } from '../items';
import { addSocialGoals, fmtTime, followRoute } from './common';

const FINISH_WAIT = 40;
const MAX_TIME = 240;

export function createRace(): EventRules {
  return {
    id: 'race', chargeMult: 1, maxTime: MAX_TIME,
    setup(w) {
      w.data.finishOrder = [] as number[];
      w.data.firstFinishT = null;
      w.data.bubbled = false;
      w.data.leftT = {};
      for (const o of w.map.objects) {
        if (o.tipo === 'pelota') spawnItem(w, 'ball', o.x, o.y);
        else if (o.tipo === 'estrella') spawnItem(w, 'star', o.x, o.y, 6);
        else if (o.tipo === 'caja') spawnItem(w, 'box', o.x, o.y);
      }
    },
    step(w, dt) {
      const goal = w.map.goal!;
      const order = w.data.finishOrder as number[];
      for (const a of w.actors) {
        a.progress = a.x;
        for (const cp of w.map.checkpoints) {
          if (cp.order > a.cp && a.x >= cp.x) { a.cp = cp.order; if (a.control === 'human') fx(w, 'cp', cp.x, cp.y, 0, a.id, cp.order); }
        }
        const resc = a.act && (a.act.kind === 'rescue' || a.act.kind === 'fall');
        if (!a.finished && !resc && a.x >= goal.x) {
          finishActor(w, a);
          order.push(a.id); a.place = order.length;
          fx(w, 'finish', a.x, a.y, 0, a.id, a.place);
          if (w.data.firstFinishT === null) { w.data.firstFinishT = w.eventT; fx(w, 'whistle', a.x, a.y); }
        }
        // drag bubble: a human lingering outside the left edge of the camera is brought back to solid ground
        if (a.control === 'human' && !a.finished && !resc) {
          const left = w.camera.x + 2;
          const t = (w.data.leftT[a.id] ?? 0);
          if (a.x < left && w.humans.length > 1) w.data.leftT[a.id] = t + dt; else w.data.leftT[a.id] = 0;
          if (w.data.leftT[a.id] >= 1.0) {
            w.data.leftT[a.id] = 0;
            const tx = w.camera.x + 60;
            const near = safeNear(w, tx, a.y);
            startRescueTo(w, a, near.x, near.y, 0.9); fx(w, 'drag', a.x, a.y, 0, a.id);
          }
        }
      }
      // finish bubbles: stragglers float to the line in order of progress
      const ft = w.data.firstFinishT as number | null;
      if (!w.data.bubbled && ((ft !== null && w.eventT - ft >= FINISH_WAIT) || w.eventT >= MAX_TIME)) {
        w.data.bubbled = true;
        const rest = w.actors.filter((a) => !a.finished).sort((p, q) => q.progress - p.progress);
        rest.forEach((a, i) => {
          const y = Math.min(w.map.groundBottom - 8, Math.max(w.map.groundTop + 8, a.y));
          startRescueTo(w, a, goal.x + 24 + i * 6, y, 1.6 + i * 1.3);
        });
      }
    },
    standings(w) {
      const order = w.data.finishOrder as number[];
      const done = order.map((id) => w.actors.find((a) => a.id === id)!);
      const rest = w.actors.filter((a) => !a.finished).sort((p, q) => q.progress - p.progress);
      const list: Standing[] = [];
      [...done, ...rest].forEach((a, i) => list.push({ actorId: a.id, rank: i + 1, value: a.finishT ?? 0, detail: a.finished ? fmtTime(a.finishT ?? 0) : '--' }));
      return list;
    },
    isOver(w) { return w.actors.every((a) => a.finished); },
    hud(w): HudModel {
      const goal = w.map.goal!;
      const prog: Record<number, number> = {};
      for (const a of w.actors) prog[a.id] = Math.max(0, Math.min(1, a.x / goal.x));
      const cpName = w.map.checkpoints.length ? `Arco ${Math.max(...w.humans.map((id) => w.actors.find((a) => a.id === id)!.cp), 0)} de ${w.map.checkpoints.length}` : '';
      return { title: 'Carrera del Bosque', timer: fmtTime(w.eventT), lines: [cpName], goalText: '¡Llega a la meta!', progress: prog };
    },
    aiGoal(w, a) {
      const goal = w.map.goal!;
      const { goal: g } = followRoute(w, a, w.map.routes, { x: goal.x + 20, y: a.y });
      return addSocialGoals(w, a, { ...g, usePower: !a.inWater });
    },
    respawnPoint(w, a) {
      const cp = w.map.checkpoints.find((c) => c.order === a.cp);
      const base = cp ? { x: cp.x, y: cp.y } : { x: w.map.spawns[0]?.x ?? 40, y: w.map.spawns[0]?.y ?? 220 };
      if (a.safe2 && a.safe2.x >= base.x) return safeNear(w, a.safe2.x, a.safe2.y);
      return safeNear(w, base.x, Math.max(w.map.groundTop + 8, Math.min(w.map.groundBottom - 8, a.y)));
    },
  };
}

/** A point on dry ground at or near (x, y). */
export function safeNear(w: World, x: number, y: number): { x: number; y: number } {
  const bad = (px: number, py: number) => w.map.pits.some((r) => px > r.x - 4 && px < r.x + r.w + 4 && py > r.y - 4 && py < r.y + r.h + 4)
    || w.map.water.some((r) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h)
    || w.map.boxes.some((b) => b.alto > 4 && px > b.x - 8 && px < b.x + b.w + 8 && py > b.y - 4 && py < b.y + b.h + 4);
  for (let d = 0; d < 400; d += 6) for (const s of [0, 1, -1]) {
    const px = x - d * (s === 0 ? 1 : 0) + (s !== 0 ? 0 : 0);
    const cand = [{ x: x - d, y }, { x: x - d, y: y + 14 }, { x: x - d, y: y - 14 }, { x: x + d, y }];
    for (const c of cand) if (!bad(c.x, c.y) && c.y >= w.map.groundTop && c.y <= w.map.groundBottom && c.x > 10) return c;
    void px;
  }
  return { x, y };
}
export type { Actor };
