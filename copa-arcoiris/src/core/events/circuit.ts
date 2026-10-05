import { finishActor, startRescueTo } from '../actor';
import { fx, type Actor, type EventRules, type HudModel, type World } from '../world';
import { spawnItem } from '../items';
import { addSocialGoals, fmtTime, followRoute, rankByValue } from './common';
import { safeNear } from './race';

const ROOM_POINTS = [4, 3, 2, 1];
const CLOSE_AFTER = 15;
const ROOM_MAX = 70;
const BREAK_T = 1.8;

const total = (a: Actor): number => a.stats2.points + a.stats2.gold;

function enterRoom(w: World, idx: number): void {
  const spawns = w.map.roomSpawns?.[idx] ?? [];
  const room = w.map.rooms[idx];
  w.data.room = idx; w.data.exited = [] as number[]; w.data.firstExitT = null; w.data.closing = false; w.data.roomT = 0; w.data.pauseT = 0;
  w.data.routeCursor = {};
  w.data.fallsAtRoom = {} as Record<number, number>;
  for (const a of w.actors) {
    w.data.fallsAtRoom[a.id] = a.stats2.falls;
    const sp = spawns.find((s) => s.slot === a.slot) ?? { x: room.start.x, y: room.start.y + a.slot * 8 };
    a.x = sp.x; a.y = sp.y; a.z = 0; a.vx = a.vy = a.vz = 0; a.grounded = true; a.inWater = false;
    a.finished = false; a.finishT = null; a.act = null; a.rescue = null; a.facing = 1; a.protectT = Math.max(a.protectT, 0.6); a.carrying = null;
    a.safe = null; a.safe2 = { x: sp.x, y: sp.y }; a.knockT = 0;
    if (a.ai) { a.ai.nextThink = 0; a.ai.bestDist = Infinity; a.ai.stuckStage = 0; a.ai.jumpAt = -1; }
  }
  const cam = w.camera;
  cam.x = room.x0 - (w.view.w - (room.x1 - room.x0)) / 2; cam.tx = cam.x;
  fx(w, 'room', room.x0, 0, 0, undefined, idx);
}

function exitActor(w: World, a: Actor): void {
  const order = w.data.exited as number[];
  order.push(a.id);
  a.stats2.points += ROOM_POINTS[Math.min(order.length - 1, 3)];
  finishActor(w, a);
  if (w.data.firstExitT === null) w.data.firstExitT = w.data.roomT;
  fx(w, 'finish', a.x, a.y, 0, a.id, order.length);
}

export function createCircuit(): EventRules {
  return {
    id: 'circuit', chargeMult: 1, maxTime: 600,
    setup(w) {
      for (const o of w.map.objects) {
        const z = Number(o.props.z ?? 0);
        if (o.tipo === 'pelota') spawnItem(w, 'ball', o.x, o.y);
        else if (o.tipo === 'estrella') spawnItem(w, 'star', o.x, o.y, z);
        else if (o.tipo === 'dorada') spawnItem(w, 'gold', o.x, o.y, z);
        else if (o.tipo === 'caja') spawnItem(w, 'box', o.x, o.y);
      }
      enterRoom(w, 0);
    },
    step(w, dt) {
      if (w.data.pauseT > 0) {
        w.data.pauseT -= dt;
        if (w.data.pauseT <= 0) { if (w.data.room >= w.map.rooms.length - 1) w.data.finished = true; else enterRoom(w, w.data.room + 1); }
        return;
      }
      if (w.data.finished) return;
      const room = w.map.rooms[w.data.room];
      w.data.roomT += dt;
      const exited = w.data.exited as number[];
      for (const a of w.actors) {
        const resc = a.act && (a.act.kind === 'rescue' || a.act.kind === 'fall');
        a.progress = a.x;
        if (!a.finished && !resc && a.x >= room.door.x) exitActor(w, a);
      }
      if (!w.data.closing) {
        const humansDone = w.humans.length > 0 && w.humans.every((id) => exited.includes(id));
        const late = w.data.firstExitT !== null && w.data.roomT - w.data.firstExitT >= CLOSE_AFTER;
        if (humansDone || late || w.data.roomT >= ROOM_MAX) {
          w.data.closing = true;
          const rest = w.actors.filter((a) => !a.finished).sort((p, q) => q.x - p.x);
          rest.forEach((a, i) => startRescueTo(w, a, room.door.x + 6, Math.min(w.map.groundBottom - 8, Math.max(w.map.groundTop + 8, a.y)), 1.2 + i * 0.8));
        }
      }
      if (w.actors.every((a) => a.finished)) { w.data.pauseT = BREAK_T; fx(w, 'roomdone', room.x1, 0, 0, undefined, w.data.room); }
    },
    standings(w) { return rankByValue(w.actors.map((a) => ({ actorId: a.id, value: total(a), detail: `${total(a)} pts` }))); },
    isOver(w) { return !!w.data.finished; },
    hud(w): HudModel {
      const r = w.map.rooms[Math.min(w.data.room, w.map.rooms.length - 1)];
      const scores: Record<number, string> = {};
      for (const a of w.actors) scores[a.id] = String(total(a));
      return { title: 'Circuito de Juegos', timer: fmtTime(w.data.roomT ?? 0), lines: [`Sala ${w.data.room + 1} de ${w.map.rooms.length}`], goalText: w.map.zones[w.data.room]?.name ?? '', scores };
    },
    aiGoal(w, a) {
      const room = w.map.rooms[w.data.room];
      if (a.finished) return { x: a.x, y: a.y, hold: true };
      const failed = a.stats2.falls - (w.data.fallsAtRoom?.[a.id] ?? 0) >= 2;   // two falls on the hard route: take the easy one
      const nodes = w.map.routes.filter((n) => n.x >= room.x0 && n.x <= room.x1 && !(failed && n.tipo === 'dificil'));
      const { goal } = followRoute(w, a, nodes, { x: room.door.x + 10, y: 226 });
      return addSocialGoals(w, a, { ...goal, usePower: false }, { attack: false });
    },
    respawnPoint(w, a) {
      const room = w.map.rooms[w.data.room];
      if (a.safe2 && a.safe2.x >= room.x0) return safeNear(w, a.safe2.x, a.safe2.y);
      return { x: room.start.x, y: room.start.y };
    },
  };
}
