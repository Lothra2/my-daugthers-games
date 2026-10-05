import { describe, it, expect } from 'vitest';
import { createRace } from '../../src/core/events/race';
import { createCircuit } from '../../src/core/events/circuit';
import { createPinata } from '../../src/core/events/pinata';
import { createArena } from '../../src/core/events/arena';
import { COUNTDOWN_S } from '../../src/core/world';
import { CHAR_IDS, type CharId, type EventId } from '../../src/core/types';
import { Cup } from '../../src/core/competition';
import { runAll } from './sim';

const roster = (seed: number): CharId[] => CHAR_IDS.filter((_, i) => i !== seed % 5);
const MAKE: Record<Exclude<EventId, 'warmup'>, { rules: () => any; max: number }> = {
  race: { rules: createRace, max: 300 }, circuit: { rules: createCircuit, max: 600 }, pinata: { rules: createPinata, max: 200 }, arena: { rules: createArena, max: 300 },
};
// Time that is not play: Thor's intro card, countdown, the pause after the whistle (2.2 s) and the results screen. Generous, a family reads slowly.
const INTRO_S = 12, RESULT_S = 20;

describe('50 copas completas con 4 IA', () => {
  it('todas terminan, nadie se atasca y la copa dura lo que dice el diseño', () => {
    const minutes: number[] = []; const bad: string[] = []; const winners: Record<string, number> = {};
    for (let seed = 1; seed <= 50; seed++) {
      const chars = roster(seed);
      const cup = new Cup(chars.map((c) => ({ charId: c, control: 'ai' as const })));
      let play = 0;
      for (const ev of ['race', 'circuit', 'pinata', 'arena'] as const) {
        const r = runAll(ev, MAKE[ev].rules(), chars, seed * 7 + 1, MAKE[ev].max, seed % 2 ? 'tranquilo' : 'campeon');
        if (!r.over) bad.push(`seed ${seed} ${ev} did not end`);
        if (r.stuck) bad.push(`seed ${seed} ${ev} stuck ${r.stuck}: ${r.stuckAt.slice(0, 2).join(' | ')}`);
        const standings = r.w.rules.standings(r.w);
        const idToChar = new Map(r.w.actors.map((a) => [a.id, a.charId]));
        cup.addEvent(ev, standings.map((s) => ({ charId: idToChar.get(s.actorId)!, rank: s.rank })));
        play += r.seconds + COUNTDOWN_S + 2.2 + INTRO_S + RESULT_S;
      }
      minutes.push(play / 60);
      const top = cup.standings()[0];
      winners[top.charId] = (winners[top.charId] ?? 0) + 1;
    }
    const avg = minutes.reduce((s, v) => s + v, 0) / minutes.length;
    console.log(`\ncopa completa con pantallas: min ${Math.min(...minutes).toFixed(1)}  media ${avg.toFixed(1)}  max ${Math.max(...minutes).toFixed(1)} minutos. Ganadores: ${JSON.stringify(winners)}`);
    expect(bad).toEqual([]);
    expect(Math.min(...minutes)).toBeGreaterThan(5);
    expect(Math.max(...minutes)).toBeLessThan(15);
  }, 300000);
});
