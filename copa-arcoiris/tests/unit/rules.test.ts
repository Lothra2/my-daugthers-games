import { describe, it, expect } from 'vitest';
import { PHYS, CHARS, POWER } from '../../src/core/data';
import { mk, hold, secs, tick, inp } from './helpers';
import { spawnItem } from '../../src/core/items';

const water = (m: any) => m.water.push({ x: 200, y: 160, w: 600, h: 130, corriente: 0 });
const pit = (m: any) => m.pits.push({ x: 200, y: 160, w: 44, h: 130 });

describe('agua', () => {
  it('entrar al agua cambia a nadar, y salir por la otra orilla vuelve a tierra', () => {
    const w = mk(['sophie'], (m) => m.water.push({ x: 200, y: 160, w: 120, h: 130, corriente: 0 })); const a = w.actors[0]; a.x = 150; a.y = 220;
    const seen = new Set<string>();
    secs(w, 5, () => { a.input = inp({ mx: 1 }); seen.add(a.state); });
    expect(seen.has('swim')).toBe(true);
    expect(a.x).toBeGreaterThan(330);
    expect(a.inWater).toBe(false);
    expect(['walk', 'run', 'idle']).toContain(a.state);
  });
  it('Alana nada un 35% mas rapido que Sophie', () => {
    const speed = (id: 'sophie' | 'alana') => {
      const w = mk([id], water); const a = w.actors[0]; a.x = 230; a.y = 220; a.inWater = true;
      secs(w, 1.5, () => { a.input = inp({ mx: 1 }); });
      return a.vx;
    };
    expect(speed('alana') / speed('sophie')).toBeGreaterThan(1.3);
    expect(speed('alana') / speed('sophie')).toBeLessThan(1.4);
  });
  it('saltar en el agua es una brazada, no un salto, y tiene espera', () => {
    const w = mk(['sophie'], water); const a = w.actors[0]; a.x = 230; a.y = 220;
    tick(w, 2);
    const v0 = (() => { secs(w, 1, () => { a.input = inp({ mx: 1 }); }); return a.vx; })();
    hold(w, a, { mx: 1, jump: true }, 0.1);
    expect(a.z).toBe(0);
    expect(a.vx).toBeGreaterThan(v0);
    expect(a.strokeCd).toBeGreaterThan(0.3);
  });
  it('la corriente empuja a quien nada quieto', () => {
    const w = mk(['sophie'], (m) => m.water.push({ x: 200, y: 160, w: 200, h: 130, corriente: 30 }));
    const a = w.actors[0]; a.x = 240; a.y = 220;
    tick(w, 2);
    const x0 = a.x; secs(w, 1, () => { a.input = inp(); });
    expect(a.x - x0).toBeGreaterThan(20);
  });
});

describe('huecos y rescate', () => {
  it('caer en un hueco no elimina: vuelve a un punto seguro en 1,7 s o menos y con proteccion', () => {
    const w = mk(['sophie'], pit); const a = w.actors[0]; a.x = 150; a.y = 220;
    let tFall = -1, tBack = -1;
    secs(w, 6, (_w, t) => {
      a.input = inp({ mx: 1 });
      if (tFall < 0 && a.act?.kind === 'fall') tFall = t;
      if (tFall >= 0 && tBack < 0 && a.act === null) tBack = t;
    });
    expect(tFall).toBeGreaterThan(0);
    expect(tBack - tFall).toBeLessThan(1.7);
    expect(tBack - tFall).toBeGreaterThan(1.2);
    expect(a.stats2.falls).toBeGreaterThanOrEqual(1);
  });
  it('tras el rescate hay 1,5 s de proteccion y 2,5 s para Mama', () => {
    for (const [id, prot] of [['sophie', 1.5], ['mama', 2.5]] as const) {
      const w = mk([id], pit); const a = w.actors[0]; a.x = 150; a.y = 220;
      let seenProt = 0, back = false;
      secs(w, 5, () => {
        a.input = inp({ mx: back ? 0 : 1 });
        if (!back && a.act === null && a.stats2.falls > 0) { back = true; seenProt = a.protectT; }
      });
      expect(back).toBe(true);
      expect(seenProt).toBeGreaterThan(prot - 0.1);
      expect(seenProt).toBeLessThanOrEqual(prot + 0.01);
    }
  });
  it('el punto de rescate nunca queda dentro del hueco', () => {
    const w = mk(['papa'], pit); const a = w.actors[0]; a.x = 150; a.y = 220;
    secs(w, 6, () => { a.input = inp({ mx: 1 }); });
    expect(w.map.pits.some((r) => a.x >= r.x && a.x < r.x + r.w)).toBe(false);
  });
});

describe('empujones y voltereta', () => {
  const duo = (patch?: (m: any) => void) => {
    const w = mk(['sophie', 'papa'], patch); const [a, b] = w.actors;
    a.x = 100; a.y = 220; a.facing = 1; b.x = 112; b.y = 220; b.facing = -1; return { w, a, b };
  };
  it('acierta dentro de alcance y empuja hacia atras', () => {
    const { w, a, b } = duo();
    hold(w, a, { action: true }, 0.5);
    expect(b.x).toBeGreaterThan(112 + 5);
    expect(b.lastHitBy).toBe(a.id);
  });
  it('falla si la profundidad difiere mas de 10 px aunque el alcance en X sirva', () => {
    const { w, a, b } = duo(); b.y = 233;
    hold(w, a, { action: true }, 0.5);
    expect(b.x).toBeCloseTo(112, 0);
    expect(b.lastHitBy).toBeNull();
  });
  it('falla si esta fuera del alcance', () => {
    const { w, a, b } = duo(); b.x = 150;
    hold(w, a, { action: true }, 0.5);
    expect(b.lastHitBy).toBeNull();
  });
  it('3 empujones en 2 segundos hacen voltereta y despues se levanta con proteccion', () => {
    const { w, a, b } = duo();
    let tumbled = false;
    for (let k = 0; k < 3; k++) { b.x = a.x + 12; b.y = a.y; hold(w, a, { action: true }, 0.55); if (b.act?.kind === 'tumble') tumbled = true; }
    expect(tumbled).toBe(true);
    for (let i = 0; i < 400 && b.act; i++) tick(w);
    expect(b.act).toBeNull();
    expect(b.protectT).toBeGreaterThan(0.9);
  });
  it('quien esta protegido no se voltea', () => {
    const { w, a, b } = duo(); b.protectT = 2;
    hold(w, a, { action: true }, 0.5);
    expect(b.act).toBeNull();
    expect(b.x).toBeCloseTo(112, 0);
  });
  it('Papa se mueve menos que Sophie al recibir el mismo empujon', () => {
    const shove = (victim: 'sophie' | 'papa') => {
      const w = mk(['mama', victim]); const [a, b] = w.actors;
      a.x = 100; a.y = 220; b.x = 112; b.y = 220;
      hold(w, a, { action: true }, 0.7);
      return b.x - 112;
    };
    expect(shove('papa')).toBeLessThan(shove('sophie') * 0.75);
  });
  it('Mama se levanta mas rapido que Sophie', () => {
    const dur = (id: 'sophie' | 'mama') => {
      const w = mk([id]); const a = w.actors[0];
      a.act = null;
      // force a tumble through a hazard hit
      const { applyHit } = require_combat();
      applyHit(w, a, null, 'hazard', 1);
      let t = 0; for (; t < 200 && a.act; t++) tick(w);
      return t * PHYS.dt;
    };
    expect(dur('mama')).toBeLessThan(dur('sophie') * 0.7);
  });
});
import * as combat from '../../src/core/combat';
function require_combat() { return combat; }

describe('pelotas', () => {
  const setup = (chars: any[] = ['sophie', 'papa']) => {
    const w = mk(chars); const [a, b] = w.actors;
    a.x = 100; a.y = 220; a.facing = 1; b.x = 190; b.y = 220;
    const ball = spawnItem(w, 'ball', 110, 220);
    return { w, a, b, ball };
  };
  it('se recoge con Accion, frena al llevarla y se lanza con Accion', () => {
    const { w, a, ball } = setup();
    hold(w, a, { action: true }, 0.4);
    expect(a.carrying).toBe(ball.id);
    secs(w, 1.2, () => { a.input = inp({ mx: 1 }); });
    const carrySpeed = a.vx;
    expect(carrySpeed).toBeLessThan(CHARS.sophie.run * 0.9);
    a.carrying !== null && hold(w, a, { action: true }, 0.2);
    secs(w, 0.2);
    expect(ball.state === 'flying' || ball.state === 'ground').toBe(true);
    expect(a.carrying).toBeNull();
  });
  it('una pelota lanzada voltea a quien golpea', () => {
    const { w, a, b, ball } = setup();
    hold(w, a, { action: true }, 0.4);
    expect(a.carrying).toBe(ball.id);
    a.x = 100; b.x = 170; b.y = 220;
    hold(w, a, { action: true }, 0.2);
    secs(w, 0.8);
    expect(b.stats2.falls + (b.act?.kind === 'tumble' || b.protectT > 0 ? 1 : 0)).toBeGreaterThan(0);
    expect(b.lastHitBy).toBe(a.id);
  });
  it('no voltea a quien esta protegido', () => {
    const { w, a, b } = setup();
    b.protectT = 3; b.x = 170;
    hold(w, a, { action: true }, 0.4);
    hold(w, a, { action: true }, 0.2);
    secs(w, 0.8);
    expect(b.act).toBeNull();
    expect(b.lastHitBy).toBeNull();
  });
  it('Papa lanza mas lejos que Sophie', () => {
    const dist = (id: 'sophie' | 'papa') => {
      const w = mk([id]); const a = w.actors[0]; a.x = 100; a.y = 220; a.facing = 1;
      const ball = spawnItem(w, 'ball', 108, 220);
      hold(w, a, { action: true }, 0.4);
      hold(w, a, { action: true }, 0.2);
      secs(w, 2);
      return ball.x - 100;
    };
    expect(dist('papa')).toBeGreaterThan(dist('sophie') * 1.35);
  });
  it('Thor recoge la pelota al pasar sin pulsar nada', () => {
    const w = mk(['thor']); const a = w.actors[0]; a.x = 100; a.y = 220;
    const ball = spawnItem(w, 'ball', 130, 220);
    secs(w, 1, () => { a.input = inp({ mx: 1 }); });
    expect(a.carrying).toBe(ball.id);
  });
});

describe('poderes', () => {
  it('Sophie cruza un hueco de 44 px con el impulso arcoiris', () => {
    const w = mk(['sophie'], pit); const a = w.actors[0]; a.x = 150; a.y = 220; a.power = 100;
    secs(w, 1.4, (_w, t) => { a.input = inp({ mx: 1, power: t < 0.4, powerPressed: t < 0.02 }); });
    expect(a.stats2.falls).toBe(0);
    expect(a.x).toBeGreaterThan(260);
  });
  it('el impulso de Sophie la hace inmune a empujones', () => {
    const w = mk(['sophie', 'papa']); const [a, b] = w.actors; a.power = 100; a.x = 100; a.y = 220; b.x = 70; b.y = 220;
    hold(w, a, { mx: 1, power: true }, 0.2);
    b.x = a.x - 8; b.y = a.y; b.facing = 1;
    hold(w, b, { action: true }, 0.4);
    expect(a.act?.kind === 'stagger' || a.act?.kind === 'tumble').toBe(false);
  });
  it('la burbuja de Alana da 4 s de inmunidad y 1,6 veces de velocidad nadando', () => {
    const w = mk(['alana', 'papa'], water); const [a, b] = w.actors; a.power = 100; a.x = 150; a.y = 220;
    hold(w, a, { power: true }, 0.1);
    expect(a.immuneT).toBeGreaterThan(3.8);
    expect(a.immuneT).toBeLessThanOrEqual(POWER.bubble.dur);
    b.x = 190; b.y = 220; b.facing = 1; a.x = 202; a.y = 220;
    hold(w, b, { action: true }, 0.5);
    expect(a.act).toBeNull();
    const sp = (bubble: boolean) => {
      const ww = mk(['alana'], water); const x = ww.actors[0]; x.x = 230; x.y = 220; x.inWater = true;
      if (bubble) { x.power = 100; hold(ww, x, { power: true }, 0.05); }
      secs(ww, 1.5, () => { x.input = inp({ mx: 1 }); });
      return x.vx;
    };
    expect(sp(true) / sp(false)).toBeGreaterThan(1.5);
  });
  it('la carga de Papa rompe obstaculos ligeros y voltea a los rivales que toca', () => {
    const w = mk(['papa', 'sophie'], (m) => {
      m.boxes.push({ id: 'l', x: 150, y: 176, w: 16, h: 96, alto: 18, kind: 'valla', light: true });
    });
    const [a, b] = w.actors; a.power = 100; a.x = 120; a.y = 220; b.x = 200; b.y = 220;
    hold(w, a, { mx: 1, power: true }, 0.7);
    expect(w.map.boxes[0].alto).toBe(0);
    expect(b.lastHitBy).toBe(a.id);
    expect(b.stats2.falls === 0).toBe(true);
    expect(b.act?.kind === 'tumble' || b.protectT > 0).toBe(true);
  });
  it('las 3 estrellas de Mama buscan a los rivales de adelante y los hacen tropezar', () => {
    const w = mk(['mama', 'sophie', 'papa', 'thor']);
    const [a, b, c, d] = w.actors; a.power = 100; a.x = 100; a.y = 220; b.x = 180; b.y = 200; c.x = 230; c.y = 240; d.x = 260; d.y = 220;
    hold(w, a, { power: true }, 0.1);
    expect(w.shots.length).toBe(3);
    let staggered = new Set<number>();
    secs(w, 2.5, () => { for (const r of [b, c, d]) if (r.act?.kind === 'stagger') staggered.add(r.id); });
    expect(staggered.size).toBe(3);
  });
  it('la carrera loca de Thor da x1,5 de velocidad durante 2,5 s', () => {
    const speed = (power: boolean) => {
      const w = mk(['thor']); const a = w.actors[0]; a.x = 60; a.y = 220;
      if (power) { a.power = 100; hold(w, a, { power: true }, 0.05); }
      secs(w, 1.2, () => { a.input = inp({ mx: 1 }); });
      return a.vx;
    };
    expect(speed(true) / speed(false)).toBeGreaterThan(1.45);
    expect(speed(true) / speed(false)).toBeLessThan(1.55);
  });
  it('el poder se carga con el tiempo y con las estrellas, y cuesta toda la barra', () => {
    const w = mk(['sophie']); const a = w.actors[0];
    secs(w, CHARS.sophie.charge + 0.5);
    expect(a.power).toBe(100);
    hold(w, a, { power: true }, 0.1);
    expect(a.power).toBeLessThan(5);
    const w2 = mk(['sophie']); const b = w2.actors[0]; b.x = 100; b.y = 220;
    spawnItem(w2, 'star', 100, 220, 0);
    tick(w2, 5);
    expect(b.power).toBeGreaterThanOrEqual(25);
  });
});
