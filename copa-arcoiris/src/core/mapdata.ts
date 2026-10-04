import type { Rect } from './types';

export interface MoveSpec { axis: 'x' | 'y'; range: number; period: number; phase: number }
export interface Box extends Rect { id: string; alto: number; kind: string; move?: MoveSpec; light?: boolean }
export interface WaterZone extends Rect { corriente: number }
export interface BounceZone extends Rect { fuerza: number }
/** Periodic hazard. kind 'tronco' rolls along x in a lane and wraps. 'barrido' sweeps back and forth across x. */
export interface Mover extends Rect { id: string; kind: 'tronco' | 'barrido'; alto: number; x0: number; x1: number; speed: number; period: number; phase: number; warn: number }
export interface Checkpoint { order: number; x: number; y: number; name: string }
export interface Spawn { slot: number; x: number; y: number }
export interface MapObject { tipo: string; x: number; y: number; id: string; props: Record<string, string | number | boolean> }
export interface RouteNode { id: string; x: number; y: number; tipo: string; salta: boolean; next: { id: string; w: number }[] }
export interface Room { orden: number; x0: number; x1: number; door: Rect; start: { x: number; y: number }; hard: Rect[] }
export interface Trigger extends Rect { evento: string }
export interface Zone extends Rect { name: string; order: number }

export interface MapData {
  id: string;
  widthTiles: number;
  heightTiles: number;
  tile: number;
  width: number;
  height: number;
  groundTop: number;
  groundBottom: number;
  boxes: Box[];
  water: WaterZone[];
  pits: Rect[];
  bounces: BounceZone[];
  movers: Mover[];
  checkpoints: Checkpoint[];
  spawns: Spawn[];
  goal: Rect | null;
  routes: RouteNode[];
  triggers: Trigger[];
  objects: MapObject[];
  rooms: Room[];
  zones: Zone[];
  props: Record<string, string | number | boolean>;
}

export const emptyMap = (id = 'test', w = 40, h = 17): MapData => ({
  id, widthTiles: w, heightTiles: h, tile: 16, width: w * 16, height: h * 16, groundTop: 176, groundBottom: 272,
  boxes: [], water: [], pits: [], bounces: [], movers: [], checkpoints: [], spawns: [], goal: null, routes: [], triggers: [],
  objects: [], rooms: [], zones: [], props: {},
});

export const inRect = (r: Rect, x: number, y: number): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
export const overlap = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const TAU = Math.PI * 2;
/** Offset of a moving platform from its base position at time t. Smooth ping-pong. */
export function moveOffset(m: MoveSpec, t: number): number {
  return m.range * (0.5 - 0.5 * Math.cos(TAU * (t / m.period + m.phase)));
}
export function boxAt(b: Box, t: number): Rect {
  if (!b.move) return b;
  const o = moveOffset(b.move, t);
  return b.move.axis === 'x' ? { x: b.x + o, y: b.y, w: b.w, h: b.h } : { x: b.x, y: b.y + o, w: b.w, h: b.h };
}
/** Current x of a mover. Logs wrap around the lane, sweepers ping-pong. */
export function moverX(m: Mover, t: number): number {
  const len = m.x1 - m.x0;
  if (m.kind === 'tronco') {
    const d = (((m.x1 - m.x0 - m.w) - ((t * m.speed + m.phase * len) % len)) % len + len) % len; // rolls toward -x
    return m.x0 + d;
  }
  const u = 0.5 - 0.5 * Math.cos(TAU * (t / m.period + m.phase));
  return m.x0 + u * (len - m.w);
}
export function moverRect(m: Mover, t: number): Rect { return { x: moverX(m, t), y: m.y, w: m.w, h: m.h }; }
/** Seconds until a mover next overlaps the x range [x, x+w]. Used by the AI and the warning icons. */
export function moverEta(m: Mover, t: number, x: number, w: number, horizon = 3): number {
  const step = 1 / 30;
  for (let s = 0; s <= horizon; s += step) {
    const r = moverRect(m, t + s);
    if (r.x < x + w && r.x + r.w > x) return s;
  }
  return Infinity;
}
