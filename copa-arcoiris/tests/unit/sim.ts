import { readFileSync } from 'node:fs';
import { parseTiledMap } from '../../src/maps/tiled';
import { createWorld, step, type EventRules, type RosterEntry, type World } from '../../src/core/world';
import { PHYS } from '../../src/core/data';
import type { CharId } from '../../src/core/types';

export const loadMap = (id: string) => parseTiledMap(id, JSON.parse(readFileSync(`public/assets/maps/${id}.json`, 'utf8')));

export interface RunResult { w: World; seconds: number; over: boolean; falls: number; stuck: number; stuckAt: string[] }

/** Runs an event with every actor driven by the AI until it ends or maxSec passes. */
export function runAll(mapId: string, rules: EventRules, chars: CharId[], seed: number, maxSec = 400, difficulty: 'tranquilo' | 'campeon' = 'tranquilo'): RunResult {
  const roster: RosterEntry[] = chars.map((c, i) => ({ charId: c, control: 'ai', slot: i }));
  const w = createWorld(loadMap(mapId), rules, roster, { seed, skipIntro: true, difficulty });
  let stuck = 0; const stuckAt: string[] = [];
  const lastMove = new Map<number, { x: number; y: number; t: number }>();
  const n = Math.round(maxSec / PHYS.dt);
  for (let i = 0; i < n && w.phase !== 'over'; i++) {
    step(w);
    if (i % 30 === 0) {
      for (const a of w.actors) {
        const l = lastMove.get(a.id);
        if (a.finished || a.act) { lastMove.set(a.id, { x: a.x, y: a.y, t: w.t }); continue; }
        if (!l || Math.hypot(a.x - l.x, a.y - l.y) > 4) lastMove.set(a.id, { x: a.x, y: a.y, t: w.t });
        else if (w.t - l.t > 8) { stuck++; stuckAt.push(`${a.charId}@${Math.round(a.x)},${Math.round(a.y)} ${a.state} t=${Math.round(w.t)}`); lastMove.set(a.id, { x: a.x, y: a.y, t: w.t }); }
      }
    }
  }
  return { w, seconds: w.eventT, over: w.phase === 'over', falls: w.actors.reduce((s, a) => s + a.stats2.falls, 0), stuck, stuckAt };
}
