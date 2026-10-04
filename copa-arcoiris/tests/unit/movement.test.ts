import { describe, it, expect } from 'vitest';
import { PHYS, CHARS } from '../../src/core/data';
import { CHAR_IDS } from '../../src/core/types';
import { mk, hold, secs, tick, inp } from './helpers';

describe('movimiento 2.5D', () => {
  it('el diagonal normalizado tiene la misma rapidez que el recto en el espacio de entrada', () => {
    const w1 = mk(['sophie']); const w2 = mk(['sophie']);
    const a = w1.actors[0], b = w2.actors[0];
    hold(w1, a, { mx: 1 }, 1.5);
    hold(w2, b, { mx: 1, my: 1 }, 0.1);
    b.input = inp({ mx: 1, my: 1 });
    secs(w2, 1.5, () => { b.input = inp({ mx: 1, my: 1 }); });
    // measure steady speed
    const sx = a.vx;
    a.input = inp({ mx: 1 }); b.input = inp({ mx: 1, my: 1 });
    tick(w1); tick(w2);
    const straight = Math.hypot(a.vx, a.vy / PHYS.depthFactor);
    const diag = Math.hypot(b.vx, b.vy / PHYS.depthFactor);
    expect(sx).toBeGreaterThan(90);
    expect(Math.abs(straight - diag)).toBeLessThan(1.5);
  });

  it('la profundidad (Y) avanza al 65% de la velocidad horizontal', () => {
    const w = mk(['papa']); const a = w.actors[0];
    a.y = 200;
    secs(w, 2, () => { a.input = inp({ my: 1 }); });
    expect(a.vy).toBeGreaterThan(0);
    expect(a.vy / PHYS.walk).toBeGreaterThan(0.6); // 0.65 of walking speed or a bit more once running
    const w2 = mk(['papa']); const b = w2.actors[0];
    secs(w2, 2, () => { b.input = inp({ mx: 1 }); });
    expect(a.vy / b.vx).toBeCloseTo(PHYS.depthFactor, 1);
  });

  it('caminar pasa a correr tras mantener la direccion el tiempo propio de cada personaje', () => {
    for (const id of CHAR_IDS) {
      const w = mk([id]); const a = w.actors[0];
      const rd = CHARS[id].runDelay;
      let tRun = -1;
      secs(w, 1.2, (_w, t) => { a.input = inp({ mx: 1 }); if (tRun < 0 && a.state === 'run') tRun = t; });
      expect(tRun).toBeGreaterThanOrEqual(rd - 0.05);
      expect(tRun).toBeLessThan(rd + 0.12);
    }
  });

  it('altura y tiempo de salto salen de la fisica y del multiplicador de cada personaje', () => {
    for (const id of CHAR_IDS) {
      const w = mk([id]); const a = w.actors[0];
      let maxZ = 0, air = 0;
      a.input = inp({ jump: true, jumpPressed: true }); tick(w); a.input = inp();
      for (let i = 0; i < 120 && !(a.grounded && i > 3); i++) { tick(w); maxZ = Math.max(maxZ, a.z); air++; }
      const v = PHYS.jumpV * CHARS[id].jump;
      expect(maxZ).toBeGreaterThan((v * v) / (2 * PHYS.gravity) - 1.5);
      expect(maxZ).toBeLessThan((v * v) / (2 * PHYS.gravity) + 0.5);
      const expectedAir = (2 * v) / PHYS.gravity / PHYS.dt;
      expect(Math.abs(air - expectedAir)).toBeLessThan(3);
    }
  });

  it('Thor supera 22 px pero no 40 px, y los demas superan 22 px', () => {
    const run = (id: 'thor' | 'papa', alto: number): boolean => {
      const w = mk([id], (m) => { m.boxes.push({ id: 'b', x: 160, y: 176, w: 16, h: 96, alto, kind: 'valla' }); });
      const a = w.actors[0]; a.y = 220;
      let passed = false;
      secs(w, 4, () => {
        const near = a.x > 160 - 16 - 14 && a.grounded && a.x < 150;
        a.input = inp({ mx: 1, jump: near, jumpPressed: near });
        if (a.x > 185) passed = true;
      });
      return passed;
    };
    expect(run('thor', 22)).toBe(true);
    expect(run('papa', 22)).toBe(true);
    expect(run('thor', 40)).toBe(false);
  });

  it('una plataforma permite aterrizar encima y caminar sobre ella, y por el lado bloquea', () => {
    const w = mk(['sophie'], (m) => { m.boxes.push({ id: 'p', x: 100, y: 190, w: 60, h: 40, alto: 20, kind: 'plataforma' }); });
    const a = w.actors[0]; a.x = 70; a.y = 210;
    // walk into the side with no jump: blocked
    secs(w, 1.2, () => { a.input = inp({ mx: 1 }); });
    expect(a.x).toBeLessThan(100);
    // jump on top
    a.x = 92;
    hold(w, a, { mx: 1, jump: true }, 0.3);
    secs(w, 1.0, () => { a.input = inp(); });
    expect(a.z).toBeCloseTo(20, 0);
    expect(a.grounded).toBe(true);
    expect(a.x).toBeGreaterThan(100);
  });

  it('el borde de una plataforma hace caer a quien lo cruza', () => {
    const w = mk(['sophie'], (m) => { m.boxes.push({ id: 'p', x: 100, y: 190, w: 40, h: 40, alto: 20, kind: 'plataforma' }); });
    const a = w.actors[0]; a.x = 120; a.y = 210; a.z = 20; a.grounded = true; a.onBox = 'p';
    secs(w, 1.5, () => { a.input = inp({ mx: 1 }); });
    expect(a.z).toBe(0);
    expect(a.x).toBeGreaterThan(140);
  });

  it('una plataforma movil lleva a quien esta encima', () => {
    const w = mk(['sophie'], (m) => { m.boxes.push({ id: 'mv', x: 100, y: 196, w: 48, h: 32, alto: 10, kind: 'plataforma', move: { axis: 'x', range: 80, period: 4, phase: 0 } }); });
    const a = w.actors[0]; a.x = 124; a.y = 212; a.z = 10; a.grounded = true; a.onBox = 'mv';
    const x0 = a.x;
    secs(w, 2, () => { a.input = inp(); });
    expect(a.x - x0).toBeGreaterThan(60);
    expect(a.z).toBeCloseTo(10, 0);
  });
});
