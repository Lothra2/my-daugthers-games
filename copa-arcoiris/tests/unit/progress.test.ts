import { describe, it, expect } from 'vitest';
import { Cup, pointsForRank, trophyForPlace } from '../../src/core/competition';
import { levelForXp, xpForEvent, unlocksBetween, outfitsFor, betterMedal, medalForRank } from '../../src/core/progression';
import { SaveStore, SAVE_KEY, defaultSave, migrate, type StorageLike } from '../../src/save/save';

const mem = (init: Record<string, string> = {}): StorageLike & { d: Record<string, string> } => {
  const d = { ...init };
  return { d, getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = v; } };
};

describe('puntuacion de la copa', () => {
  it('1.o 10, 2.o 7, 3.o 5 y 4.o 3: nadie se queda con cero', () => {
    expect([1, 2, 3, 4].map(pointsForRank)).toEqual([10, 7, 5, 3]);
  });
  it('los empates comparten el puesto mas alto', () => {
    const c = new Cup([{ charId: 'sophie', control: 'human' }, { charId: 'papa', control: 'ai' }, { charId: 'mama', control: 'ai' }, { charId: 'thor', control: 'ai' }]);
    c.addEvent('arena', [{ charId: 'sophie', rank: 1 }, { charId: 'papa', rank: 1 }, { charId: 'mama', rank: 3 }, { charId: 'thor', rank: 4 }]);
    const t = Object.fromEntries(c.standings().map((e) => [e.charId, e.total]));
    expect(t).toEqual({ sophie: 10, papa: 10, mama: 5, thor: 3 });
  });
  it('desempate de la copa: mas pruebas ganadas y luego el puesto en la ultima prueba', () => {
    const c = new Cup([{ charId: 'sophie', control: 'human' }, { charId: 'papa', control: 'ai' }]);
    c.addEvent('race', [{ charId: 'sophie', rank: 1 }, { charId: 'papa', rank: 2 }]);   // 10 / 7
    c.addEvent('circuit', [{ charId: 'sophie', rank: 2 }, { charId: 'papa', rank: 1 }]); // 7 / 10
    c.addEvent('pinata', [{ charId: 'sophie', rank: 1 }, { charId: 'papa', rank: 2 }]);  // 10 / 7
    c.addEvent('arena', [{ charId: 'sophie', rank: 2 }, { charId: 'papa', rank: 1 }]);   // 7 / 10
    const s = c.standings();
    expect(s[0].total).toBe(34); expect(s[1].total).toBe(34);
    expect(s[0].wins).toBe(2);
    expect(s[0].charId).toBe('papa'); // both won twice, papa did better in the last event
  });
  it('el cuarto lugar recibe el Trofeo Corazon', () => {
    expect(trophyForPlace(4)).toBe('corazon');
    expect([1, 2, 3].map(trophyForPlace)).toEqual(['oro', 'plata', 'bronce']);
  });
});

describe('progresion', () => {
  it('XP por prueba: 20 por participar, mas 20/14/10/6 por puesto y 1 por estrella', () => {
    expect(xpForEvent(1, 0)).toBe(40);
    expect(xpForEvent(4, 0)).toBe(26);
    expect(xpForEvent(2, 12)).toBe(44);   // star bonus is capped at 10
    expect(xpForEvent(1, 3)).toBe(43);
  });
  it('los niveles se alcanzan en 60, 150, 280 y 450 XP', () => {
    expect([0, 59, 60, 149, 150, 279, 280, 449, 450, 9999].map(levelForXp)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  it('una copa completa da entre 80 y 140 XP', () => {
    const typical = [2, 2, 3, 3].reduce((s, r) => s + xpForEvent(r, 6), 0);
    const worst = [4, 4, 4, 4].reduce((s, r) => s + xpForEvent(r, 0), 0);
    const best = [1, 1, 1, 1].reduce((s, r) => s + xpForEvent(r, 99), 0);
    expect(worst).toBeGreaterThanOrEqual(80);
    expect(typical).toBeGreaterThanOrEqual(110);
    expect(typical).toBeLessThanOrEqual(160);
    expect(best).toBeLessThanOrEqual(200);
  });
  it('los desbloqueos aparecen en el nivel correcto', () => {
    expect(unlocksBetween(1, 2).map((u) => u.id)).toEqual(['outfit:arcoiris']);
    expect(unlocksBetween(2, 4).map((u) => u.id)).toEqual(['power+', 'outfit:estrellas']);
    expect(outfitsFor(1)).toEqual(['base']);
    expect(outfitsFor(4)).toEqual(['base', 'arcoiris', 'estrellas']);
  });
  it('las medallas solo mejoran', () => {
    expect(betterMedal('plata', medalForRank(1))).toBe('oro');
    expect(betterMedal('oro', medalForRank(3))).toBe('oro');
    expect(betterMedal(undefined, medalForRank(4))).toBeUndefined();
  });
});

describe('guardado', () => {
  it('ida y vuelta conserva el progreso', () => {
    const st = mem(); const s = new SaveStore(() => st);
    s.load(); s.data.characters.sophie.xp = 160; s.data.records.raceBestMs = 61000; expect(s.save()).toBe(true);
    const s2 = new SaveStore(() => st); const d = s2.load();
    expect(s2.status).toBe('ok'); expect(d.characters.sophie.xp).toBe(160); expect(d.characters.sophie.level).toBe(3); expect(d.records.raceBestMs).toBe(61000);
  });
  it('JSON corrupto: se guarda una copia y se arranca limpio sin romper', () => {
    const st = mem({ [SAVE_KEY]: '{esto no es json' }); const s = new SaveStore(() => st, () => 1700000000000);
    const d = s.load();
    expect(s.status).toBe('recovered'); expect(d).toEqual(defaultSave());
    expect(Object.keys(st.d).some((k) => k.startsWith(`${SAVE_KEY}.bak-`))).toBe(true);
  });
  it('datos a medias o fuera de rango se corrigen', () => {
    const d = migrate({ version: 1, settings: { music: 9, difficulty: 'raro' }, characters: { sophie: { xp: 'x', outfit: 'estrellas' }, thor: { xp: 500, outfit: 'estrellas' } }, records: { raceBestMs: -5 } });
    expect(d.settings.music).toBe(1); expect(d.settings.difficulty).toBe('tranquilo');
    expect(d.characters.sophie.outfit).toBe('base');      // not unlocked
    expect(d.characters.thor.outfit).toBe('estrellas'); expect(d.characters.thor.level).toBe(5);
    expect(d.records.raceBestMs).toBeUndefined();
  });
  it('una version antigua se migra y una futura no rompe', () => {
    expect(migrate({ version: 0 }).version).toBe(1);
    expect(migrate({ version: 99, settings: { sfx: 0.2 } }).settings.sfx).toBe(0.2);
  });
  it('almacenamiento bloqueado: se juega en memoria y se avisa', () => {
    const blocked = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    const s = new SaveStore(() => blocked as any);
    s.load(); expect(s.status).toBe('memory'); expect(s.persistent).toBe(false);
    expect(s.save()).toBe(false);
    const none = new SaveStore(() => null); none.load(); expect(none.status).toBe('memory');
  });
  it('si setItem falla despues de cargar, el juego sigue', () => {
    let fail = false; const st = mem(); const wrap: StorageLike = { getItem: (k) => st.getItem(k), setItem: (k, v) => { if (fail) throw new Error('quota'); st.setItem(k, v); } };
    const s = new SaveStore(() => wrap); s.load(); expect(s.save()).toBe(true); fail = true; expect(s.save()).toBe(false); expect(s.status).toBe('memory');
  });
});
