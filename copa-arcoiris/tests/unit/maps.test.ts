import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseTiledMap } from '../../src/maps/tiled';
import { validateMap } from '../../src/maps/validate';

export const loadMap = (id: string) => parseTiledMap(id, JSON.parse(readFileSync(`public/assets/maps/${id}.json`, 'utf8')));

describe('mapas exportados por Tiled', () => {
  for (const [id, opts] of [['race', { needGoal: true }], ['circuit', {}], ['pinata', {}], ['arena', {}], ['warmup', { needGoal: true, minSpawns: 2 }]] as const) {
    it(`${id}: cumple las reglas para que nadie quede bloqueado`, () => {
      const m = loadMap(id);
      expect(validateMap(m, opts)).toEqual([]);
    });
  }
  it('la carrera tiene 3 arcos, 4 salidas, meta, agua, puente con troncos y rutas con bifurcaciones', () => {
    const m = loadMap('race');
    expect(m.checkpoints.length).toBe(3);
    expect(m.spawns.length).toBe(4);
    expect(m.goal).not.toBeNull();
    expect(m.water.length).toBeGreaterThan(0);
    expect(m.movers.filter((v) => v.kind === 'tronco').length).toBe(2);
    expect(m.routes.filter((r) => r.next.length > 1).length).toBeGreaterThanOrEqual(3);
    expect(m.zones.length).toBe(5);
  });
  it('el circuito tiene 4 salas con puerta y 4 salidas por sala', () => {
    const m = loadMap('circuit');
    expect(m.rooms.length).toBe(4);
    for (let i = 0; i < 4; i++) expect(m.roomSpawns![i].length).toBe(4);
  });
  it('las alturas obligatorias de la carrera las supera Thor (<= 22 px)', () => {
    const m = loadMap('race');
    const must = m.boxes.filter((b) => b.kind === 'valla');
    expect(must.length).toBeGreaterThan(0);
    for (const b of must) expect(b.alto).toBeLessThanOrEqual(22);
  });
});

describe('el validador detecta mapas malos', () => {
  const clone = (id: string) => structuredClone(loadMap(id));
  it('una pared de 30 px que cierra todo el ancho de la franja', () => {
    const m = clone('race');
    m.boxes.push({ id: 'muro_malo', kind: 'seto', x: 400, y: m.groundTop - 10, w: 16, h: m.groundBottom - m.groundTop + 20, alto: 30 } as any);
    expect(validateMap(m, { needGoal: true }).length).toBeGreaterThan(0);
  });
  it('un hueco demasiado ancho para saltarlo (60 px) en todo el ancho', () => {
    const m = clone('race');
    m.pits.push({ x: 400, y: m.groundTop - 10, w: 60, h: m.groundBottom - m.groundTop + 20 } as any);
    expect(validateMap(m, { needGoal: true }).length).toBeGreaterThan(0);
  });
  it('una salida dentro de un sólido', () => {
    const m = clone('pinata');
    const s = m.spawns[0];
    m.boxes.push({ id: 'roca', kind: 'seto', x: s.x - 10, y: s.y - 10, w: 20, h: 20, alto: 40 } as any);
    expect(validateMap(m).some((e) => e.includes('inside a solid'))).toBe(true);
  });
  it('menos salidas de las necesarias y meta que falta', () => {
    const m = clone('race');
    m.spawns = m.spawns.slice(0, 2); m.goal = null as any;
    const e = validateMap(m, { needGoal: true });
    expect(e.some((x) => x.includes('spawns'))).toBe(true);
    expect(e.some((x) => x.includes('goal'))).toBe(true);
  });
});

