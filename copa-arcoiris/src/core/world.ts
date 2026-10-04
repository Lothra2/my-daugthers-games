import { Rng } from './rng';
import { CHARS, DIFFICULTY, PHYS, type CharStats, type Difficulty } from './data';
import type { AIProfile, CharId, GameFx, InputFrame, PowerKind, State } from './types';
import { emptyInput } from './types';
import type { MapData } from './mapdata';
import { updateActor } from './actor';
import { updateItems, updateShots } from './items';
import { thinkAI, type AIState } from './ai';
import { updateCamera, type Camera } from './camera';

export interface Act { kind: State; t: number; dur: number; hit: boolean; aux?: number }

export interface Actor {
  id: number; slot: number; charId: CharId; stats: CharStats; control: 'human' | 'ai'; profile: AIProfile; name: string;
  x: number; y: number; z: number; vx: number; vy: number; vz: number; facing: 1 | -1;
  grounded: boolean; inWater: boolean; onBox: string | null; landT: number;
  state: State; stateT: number; act: Act | null; runT: number; quietT: number;
  input: InputFrame;
  power: number; powerKind: PowerKind; powerT: number; powerLevelBoost: number; dashed: Set<number>;
  carrying: number | null;
  protectT: number; immuneT: number;
  lastHitBy: number | null; lastHitT: number; hitTimes: number[];
  safe: { x: number; y: number; t: number } | null; safe2: { x: number; y: number } | null; safeClock: number;
  cp: number; progress: number;
  finished: boolean; finishT: number | null; place: number | null;
  pushCd: number; strokeCd: number; strokeT: number;
  knockVx: number; knockVy: number; knockT: number;
  rescue: { sx: number; sy: number; tx: number; ty: number; t: number; dur: number } | null;
  stats2: { stars: number; gold: number; points: number; falls: number; bursts: number; hits: number };
  level: number; outfit: string;
  ai: AIState | null;
}

export type ItemKind = 'ball' | 'star' | 'gold' | 'box' | 'target';
export interface Item {
  id: number; kind: ItemKind; x: number; y: number; z: number; vx: number; vy: number; vz: number;
  state: 'ground' | 'carried' | 'flying' | 'gone'; owner: number | null; thrownBy: number | null; thrownT: number;
  hp: number; bounces: number; age: number; spawnId?: string; hitIds: Set<number>;
}
export interface Shot { id: number; x: number; y: number; z: number; owner: number; targetId: number; targetKind: 'actor' | 'pinata' | 'none'; t: number; ttl: number; vx: number }

export interface Standing { actorId: number; rank: number; value: number; detail: string }
export interface HudModel { title: string; timer: string; lines: string[]; goalText?: string; progress?: Record<number, number>; scores?: Record<number, string> }

export interface EventRules {
  id: string;
  chargeMult: number;
  setup(w: World): void;
  step(w: World, dt: number): void;
  standings(w: World): Standing[];
  isOver(w: World): boolean;
  hud(w: World): HudModel;
  aiGoal(w: World, a: Actor): import('./ai').AIGoal;
  respawnPoint(w: World, a: Actor): { x: number; y: number };
  onBop?(w: World, a: Actor, power: number): boolean;
  onBallHit?(w: World, item: Item): boolean;
  onCharge?(w: World, a: Actor): void;
  shotTarget?(w: World, a: Actor, idx: number): { id: number; kind: 'actor' | 'pinata' | 'none' };
  onActorTumble?(w: World, victim: Actor): void;
  maxTime: number;
}

export type Phase = 'intro' | 'countdown' | 'play' | 'over';

export interface World {
  t: number; tick: number; eventT: number;
  rng: Rng; map: MapData; actors: Actor[]; items: Item[]; shots: Shot[]; fx: GameFx[];
  rules: EventRules; difficulty: Difficulty;
  phase: Phase; phaseT: number; nextId: number;
  camera: Camera; view: { w: number; h: number };
  humans: number[];
  data: Record<string, any>;
}

export interface RosterEntry { charId: CharId; control: 'human' | 'ai'; slot: number; level?: number; outfit?: string; profile?: AIProfile }

export function createActor(id: number, e: RosterEntry, x: number, y: number): Actor {
  const stats = CHARS[e.charId];
  const level = e.level ?? 1;
  return {
    id, slot: e.slot, charId: e.charId, stats, control: e.control, profile: e.profile ?? stats.defaultProfile, name: stats.name,
    x, y, z: 0, vx: 0, vy: 0, vz: 0, facing: 1, grounded: true, inWater: false, onBox: null, landT: 0,
    state: 'idle', stateT: 0, act: null, runT: 0, quietT: 0, input: emptyInput(),
    power: 0, powerKind: stats.power, powerT: 0, powerLevelBoost: level >= 3 ? 1.15 : 1, dashed: new Set(),
    carrying: null, protectT: 0, immuneT: 0, lastHitBy: null, lastHitT: 99, hitTimes: [],
    safe: null, safe2: null, safeClock: 0, cp: 0, progress: 0, finished: false, finishT: null, place: null,
    pushCd: 0, strokeCd: 0, strokeT: 0, knockVx: 0, knockVy: 0, knockT: 0, rescue: null,
    stats2: { stars: 0, gold: 0, points: 0, falls: 0, bursts: 0, hits: 0 },
    level, outfit: e.outfit ?? 'base', ai: null,
  };
}

export function createWorld(map: MapData, rules: EventRules, roster: RosterEntry[], opts: { seed?: number; difficulty?: Difficulty; viewW?: number; viewH?: number; skipIntro?: boolean } = {}): World {
  const w: World = {
    t: 0, tick: 0, eventT: 0, rng: new Rng(opts.seed ?? 1), map, actors: [], items: [], shots: [], fx: [], rules,
    difficulty: opts.difficulty ?? 'tranquilo', phase: opts.skipIntro ? 'countdown' : 'intro', phaseT: 0, nextId: 1,
    camera: { x: 0, y: 0, tx: 0, ty: 0, lock: false }, view: { w: opts.viewW ?? 480, h: opts.viewH ?? 270 }, humans: [], data: {},
  };
  roster.forEach((e, i) => {
    const sp = map.spawns.find((s) => s.slot === i) ?? map.spawns[i] ?? { x: 40, y: 200 + i * 20 };
    const a = createActor(w.nextId++, { ...e, slot: i }, sp.x, sp.y);
    a.safe2 = { x: sp.x, y: sp.y };
    if (a.control === 'ai') a.ai = null; // created by thinkAI on first use
    w.actors.push(a);
    if (a.control === 'human') w.humans.push(a.id);
  });
  rules.setup(w);
  updateCamera(w, 1);
  return w;
}

export const actorById = (w: World, id: number): Actor | undefined => w.actors.find((a) => a.id === id);
export const fx = (w: World, k: string, x: number, y: number, z = 0, who?: number, v?: number): void => { w.fx.push({ k, x, y, z, who, v }); };

export function startCountdown(w: World): void { if (w.phase === 'intro') { w.phase = 'countdown'; w.phaseT = 0; } }
export const COUNTDOWN_S = 3;

/** One fixed step of the simulation. Inputs for humans are written into actor.input by the caller. */
export function step(w: World, dt: number = PHYS.dt): void {
  w.tick++;
  w.phaseT += dt;
  if (w.phase === 'intro') { updateCamera(w, dt); return; }
  if (w.phase === 'countdown') {
    if (w.phaseT >= COUNTDOWN_S) { w.phase = 'play'; w.phaseT = 0; fx(w, 'go', 0, 0); }
    else {
      const prev = Math.floor(w.phaseT - dt), cur = Math.floor(w.phaseT);
      if (cur !== prev || w.tick === 1) fx(w, 'count', 0, 0, 0, undefined, COUNTDOWN_S - cur);
    }
    for (const a of w.actors) { a.input = emptyInput(); updateActor(w, a, dt, false); }
    updateCamera(w, dt);
    return;
  }
  w.t += dt;
  if (w.phase === 'play') w.eventT += dt;
  for (const a of w.actors) if (a.control === 'ai') thinkAI(w, a, dt);
  const live = w.phase === 'play';
  for (const a of w.actors) updateActor(w, a, dt, live);
  separate(w, dt);
  updateItems(w, dt);
  updateShots(w, dt);
  if (live) {
    w.rules.step(w, dt);
    if (w.rules.isOver(w)) { w.phase = 'over'; w.phaseT = 0; }
  }
  updateCamera(w, dt);
}

/** Soft separation so characters do not stack on the exact same spot. */
function separate(w: World, dt: number): void {
  const n = w.actors.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = w.actors[i], b = w.actors[j];
    if (a.act && (a.act.kind === 'rescue' || a.act.kind === 'fall')) continue;
    if (b.act && (b.act.kind === 'rescue' || b.act.kind === 'fall')) continue;
    if (Math.abs(a.z - b.z) > 14) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    if (Math.abs(dx) < 8 && Math.abs(dy) < 3) {
      const s = (dy >= 0 ? 1 : -1) * 40 * dt;
      b.y += s; a.y -= s;
    }
  }
}

export function drainFx(w: World): GameFx[] { const out = w.fx; w.fx = []; return out; }
export { DIFFICULTY };
