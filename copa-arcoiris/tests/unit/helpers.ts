import { createWorld, step, type Actor, type EventRules, type RosterEntry, type World, type HudModel } from '../../src/core/world';
import { emptyMap, type MapData } from '../../src/core/mapdata';
import { emptyInput, type CharId, type InputFrame } from '../../src/core/types';
import { PHYS } from '../../src/core/data';

/** A rules object that does nothing, so movement and combat can be tested alone. */
export const nullRules = (): EventRules => ({
  id: 'test', chargeMult: 1, maxTime: 999,
  setup() {}, step() {}, standings: () => [], isOver: () => false,
  hud: (): HudModel => ({ title: '', timer: '', lines: [] }),
  aiGoal: (_w, a) => ({ x: a.x, y: a.y, hold: true }),
  respawnPoint: (w, a) => (a.safe2 ? { x: a.safe2.x, y: a.safe2.y } : { x: 40, y: 220 }),
});

export function testMap(patch: (m: MapData) => void = () => {}): MapData {
  const m = emptyMap('test', 80, 17);
  m.spawns = [0, 1, 2, 3].map((i) => ({ slot: i, x: 40, y: 190 + i * 24 }));
  patch(m);
  return m;
}

export function mk(chars: CharId[], patch?: (m: MapData) => void, rules: EventRules = nullRules(), opts: { seed?: number } = {}): World {
  const roster: RosterEntry[] = chars.map((c, i) => ({ charId: c, control: 'human', slot: i }));
  const w = createWorld(testMap(patch), rules, roster, { seed: opts.seed ?? 1, skipIntro: true });
  // skip the countdown
  for (let i = 0; i < 200 && w.phase !== 'play'; i++) step(w);
  return w;
}

export const inp = (p: Partial<InputFrame> = {}): InputFrame => ({ ...emptyInput(), ...p });
export const tick = (w: World, n = 1): void => { for (let i = 0; i < n; i++) step(w); };
export const secs = (w: World, s: number, f?: (w: World, t: number) => void): void => {
  const n = Math.round(s / PHYS.dt);
  for (let i = 0; i < n; i++) { f?.(w, i * PHYS.dt); step(w); }
};
export const press = (a: Actor, p: Partial<InputFrame>): void => { a.input = inp({ ...p, jumpPressed: !!p.jump, actionPressed: !!p.action, powerPressed: !!p.power }); };
/** Holds an input for a number of seconds. A pressed flag is only true on the first step. */
export function hold(w: World, a: Actor, p: Partial<InputFrame>, s: number): void {
  const n = Math.max(1, Math.round(s / PHYS.dt));
  for (let i = 0; i < n; i++) {
    a.input = inp({ ...p, jumpPressed: i === 0 && !!p.jump, actionPressed: i === 0 && !!p.action, powerPressed: i === 0 && !!p.power });
    step(w);
  }
  a.input = inp();
}
