import { CHAR_IDS, type CharId, type EventId } from '../core/types';
import { levelForXp, type Medal, type Outfit } from '../core/progression';

export const SAVE_KEY = 'copa-arcoiris/save';
export const SAVE_VERSION = 1;

export interface CharSave { xp: number; level: number; outfit: Outfit }
export interface SaveV1 {
  version: 1;
  settings: { music: number; sfx: number; muted: boolean; difficulty: 'tranquilo' | 'campeon'; mirrorP2: boolean; touchControls: 'auto' | 'on' | 'off' };
  characters: Record<CharId, CharSave>;
  records: { raceBestMs?: number; circuitBest?: number; pinataBest?: number; arenaBest?: number; cupsWon: number };
  medals: Record<CharId, Partial<Record<EventId, Medal>>>;
  stats: { cupsPlayed: number; warmupDone: boolean };
}

export const defaultSave = (): SaveV1 => ({
  version: 1,
  settings: { music: 0.7, sfx: 0.8, muted: false, difficulty: 'tranquilo', mirrorP2: false, touchControls: 'auto' },
  characters: Object.fromEntries(CHAR_IDS.map((c) => [c, { xp: 0, level: 1, outfit: 'base' as Outfit }])) as Record<CharId, CharSave>,
  records: { cupsWon: 0 },
  medals: Object.fromEntries(CHAR_IDS.map((c) => [c, {}])) as Record<CharId, Partial<Record<EventId, Medal>>>,
  stats: { cupsPlayed: 0, warmupDone: false },
});

/** Upgrades older saves. Every step takes version n to n+1. There is only v1 for now. */
export const MIGRATIONS: Record<number, (s: any) => any> = {};

const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number, lo = -Infinity, hi = Infinity): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

/** Fills missing fields with defaults and drops anything out of range, so a half-valid save never breaks the game. */
export function sanitize(raw: any): SaveV1 {
  const d = defaultSave();
  if (!isObj(raw)) return d;
  const s = isObj(raw.settings) ? raw.settings : {};
  d.settings = {
    music: num(s.music, d.settings.music, 0, 1), sfx: num(s.sfx, d.settings.sfx, 0, 1), muted: s.muted === true,
    difficulty: s.difficulty === 'campeon' ? 'campeon' : 'tranquilo', mirrorP2: s.mirrorP2 === true,
    touchControls: s.touchControls === 'on' || s.touchControls === 'off' ? s.touchControls : 'auto',
  };
  for (const c of CHAR_IDS) {
    const cs = isObj(raw.characters) && isObj(raw.characters[c]) ? raw.characters[c] : {};
    const xp = Math.floor(num(cs.xp, 0, 0, 1e6));
    const level = levelForXp(xp);
    const outfit: Outfit = cs.outfit === 'arcoiris' && level >= 2 ? 'arcoiris' : cs.outfit === 'estrellas' && level >= 4 ? 'estrellas' : 'base';
    d.characters[c] = { xp, level, outfit };
    const ms = isObj(raw.medals) && isObj(raw.medals[c]) ? raw.medals[c] : {};
    for (const ev of ['race', 'circuit', 'pinata', 'arena'] as EventId[]) if (ms[ev] === 'oro' || ms[ev] === 'plata' || ms[ev] === 'bronce') d.medals[c][ev] = ms[ev];
  }
  const r = isObj(raw.records) ? raw.records : {};
  d.records = { cupsWon: Math.floor(num(r.cupsWon, 0, 0, 1e6)) };
  for (const k of ['raceBestMs', 'circuitBest', 'pinataBest', 'arenaBest'] as const) if (typeof r[k] === 'number' && Number.isFinite(r[k]) && r[k] >= 0) d.records[k] = r[k];
  const st = isObj(raw.stats) ? raw.stats : {};
  d.stats = { cupsPlayed: Math.floor(num(st.cupsPlayed, 0, 0, 1e6)), warmupDone: st.warmupDone === true };
  return d;
}

export function migrate(raw: any): SaveV1 {
  let cur = raw;
  let v = isObj(cur) && typeof cur.version === 'number' ? cur.version : 1;
  while (v < SAVE_VERSION) { const f = MIGRATIONS[v]; if (!f) break; cur = f(cur); v++; }
  return sanitize(cur);
}

export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem?(k: string): void }
export type LoadStatus = 'ok' | 'fresh' | 'recovered' | 'memory';

/** Reads and writes progress. Corrupt data is kept as a dated backup and the game starts clean. Blocked storage falls back to memory. */
export class SaveStore {
  data: SaveV1 = defaultSave();
  status: LoadStatus = 'fresh';
  private mem = false;
  constructor(private storage: () => StorageLike | null = () => { try { return window.localStorage; } catch { return null; } }, private now: () => number = Date.now) {}

  load(): SaveV1 {
    let st: StorageLike | null = null;
    try { st = this.storage(); } catch { st = null; }
    if (!st) { this.mem = true; this.status = 'memory'; this.data = defaultSave(); return this.data; }
    let text: string | null = null;
    try { text = st.getItem(SAVE_KEY); } catch { this.mem = true; this.status = 'memory'; this.data = defaultSave(); return this.data; }
    if (text === null) { this.status = 'fresh'; this.data = defaultSave(); return this.data; }
    try {
      const parsed = JSON.parse(text);
      if (!isObj(parsed)) throw new Error('shape');
      this.data = migrate(parsed); this.status = 'ok';
    } catch {
      try { st.setItem(`${SAVE_KEY}.bak-${new Date(this.now()).toISOString().slice(0, 19).replace(/[:T]/g, '-')}`, text); } catch { /* backup is best effort */ }
      this.data = defaultSave(); this.status = 'recovered';
    }
    return this.data;
  }

  save(): boolean {
    if (this.mem) return false;
    try { const st = this.storage(); if (!st) { this.mem = true; this.status = 'memory'; return false; } st.setItem(SAVE_KEY, JSON.stringify(this.data)); return true; }
    catch { this.mem = true; this.status = 'memory'; return false; }
  }
  get persistent(): boolean { return !this.mem; }
}
