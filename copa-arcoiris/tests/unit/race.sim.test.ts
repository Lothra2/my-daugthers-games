import { describe, it, expect } from 'vitest';
import { createRace } from '../../src/core/events/race';
import { CHAR_IDS, type CharId } from '../../src/core/types';
import { runAll } from './sim';

const roster = (seed: number): CharId[] => {
  const a = [...CHAR_IDS]; // rotate which four of the five run
  const skip = seed % 5;
  return a.filter((_, i) => i !== skip);
};

describe('carrera con 4 rivales de IA sobre el mapa real', () => {
  it('20 semillas: todos llegan por su cuenta, sin atascos y en tiempo razonable', () => {
    const rows: string[] = [];
    for (let seed = 1; seed <= 20; seed++) {
      const r = runAll('race', createRace(), roster(seed), seed, 300, seed % 2 ? 'tranquilo' : 'campeon');
      const slowest = Math.max(...r.w.actors.map((a) => a.finishT ?? 999));
      rows.push(`s${seed} ${Math.round(slowest)}s falls=${r.falls} bubbled=${r.w.data.bubbled} stuck=${r.stuck}`);
      expect(r.over, `seed ${seed} did not finish`).toBe(true);
      expect(r.w.data.bubbled, `seed ${seed} needed the finish bubble`).toBe(false);
      expect(r.stuck, `seed ${seed} stuck`).toBe(0);
      expect(slowest, `seed ${seed} too slow`).toBeLessThan(150);
      expect(slowest, `seed ${seed} too fast`).toBeGreaterThan(30);
    }
    console.log('\n' + rows.join('\n'));
  });
});
