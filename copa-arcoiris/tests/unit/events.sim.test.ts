import { describe, it, expect } from 'vitest';
import { createCircuit } from '../../src/core/events/circuit';
import { createPinata } from '../../src/core/events/pinata';
import { createArena } from '../../src/core/events/arena';
import { CHAR_IDS, type CharId } from '../../src/core/types';
import { runAll } from './sim';

const roster = (seed: number): CharId[] => CHAR_IDS.filter((_, i) => i !== seed % 5);

describe('circuito con 4 IA', () => {
  it('10 semillas: las 4 salas terminan, los puntos de salida suman 40 y nadie se atasca', () => {
    const rows: string[] = []; const bad: string[] = [];
    for (let seed = 1; seed <= 10; seed++) {
      const r = runAll('circuit', createCircuit(), roster(seed), seed, 600);
      const pts = r.w.actors.map((a) => a.stats2.points);
      rows.push(`s${seed} ${Math.round(r.seconds)}s exit=${pts.join('/')} gold=${r.w.actors.map((a) => a.stats2.gold).join('/')} falls=${r.falls} stuck=${r.stuck}`);
      if (!r.over) bad.push(`seed ${seed} not over`);
      if (pts.reduce((s, v) => s + v, 0) !== 40) bad.push(`seed ${seed} exit points`);
      if (r.stuck) bad.push(`seed ${seed} stuck ${r.stuck}`);
      if (r.seconds >= 330) bad.push(`seed ${seed} duration ${r.seconds}`);
    }
    console.log('\n' + rows.join('\n'));
    expect(bad).toEqual([]);
  });
});

describe('pinata con 4 IA', () => {
  it('10 semillas: la pinata se rompe y se reparten estrellas', () => {
    const rows: string[] = [];
    for (let seed = 1; seed <= 10; seed++) {
      const r = runAll('pinata', createPinata(), roster(seed), seed, 200);
      const stars = r.w.actors.map((a) => a.stats2.stars);
      rows.push(`s${seed} ${Math.round(r.seconds)}s broken=${r.w.data.pinata.broken} hp=${r.w.data.pinata.hp} stars=${stars.join('/')}`);
      expect(r.over, `seed ${seed}`).toBe(true);
      expect(r.w.data.pinata.broken).toBe(true);
      expect(stars.reduce((s, v) => s + v, 0), `seed ${seed} stars`).toBeGreaterThan(10);
      expect(r.seconds).toBeLessThanOrEqual(112);
    }
    console.log('\n' + rows.join('\n'));
  });
});

describe('arena con 4 IA', () => {
  it('10 semillas: 3 rondas, hay burbujazos y todos reciben puesto', () => {
    const rows: string[] = [];
    for (let seed = 1; seed <= 10; seed++) {
      const r = runAll('arena', createArena(), roster(seed), seed, 200);
      const pts = r.w.actors.map((a) => a.stats2.points);
      rows.push(`s${seed} ${Math.round(r.seconds)}s bursts=${pts.join('/')} falls=${r.falls}`);
      expect(r.over, `seed ${seed}`).toBe(true);
      expect(r.w.data.round).toBe(2);
      expect(pts.reduce((s, v) => s + v, 0), `seed ${seed} bursts`).toBeGreaterThan(0);
      expect(r.w.rules.standings(r.w).length).toBe(4);
    }
    console.log('\n' + rows.join('\n'));
  });
});
