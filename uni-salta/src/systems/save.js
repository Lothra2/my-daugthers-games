// Persistent profile in localStorage. Every access is wrapped: the game must work without storage.
const KEY = 'unisalta.v1';
const DEFAULTS = () => ({
  version: 1,
  settings: { music: 0.8, sfx: 0.9, lang: null, reduceShake: false, reduceFlash: false, touchHints: true, lastMode: 'normal', unicornName: '' },
  highScores: { normal: [], easy: [] },
  stats: { runs: 0, candies: 0, bestWorld: 1, bestLap: 1, stomps: 0, perfects: 0, thor: 0 },
  unlocks: { gallery: false, secretsSeen: [] },
});

function merge(base, over) {
  if (!over || typeof over !== 'object') return base;
  for (const k of Object.keys(base)) {
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = merge(base[k], over[k]);
    else if (over[k] !== undefined && typeof over[k] === typeof base[k] || (base[k] === null && over[k] !== undefined)) base[k] = over[k];
    else if (Array.isArray(base[k]) && Array.isArray(over[k])) base[k] = over[k];
  }
  return base;
}

export class Save {
  constructor(storage) {
    this.storage = storage === undefined ? Save.defaultStorage() : storage;
    this.data = DEFAULTS();
    try {
      const raw = this.storage && this.storage.getItem(KEY);
      if (raw) this.data = merge(DEFAULTS(), JSON.parse(raw));
    } catch (e) { this.data = DEFAULTS(); }
  }
  static defaultStorage() { try { return globalThis.localStorage || null; } catch (e) { return null; } }
  flush() { try { if (this.storage) this.storage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage blocked */ } }
  get settings() { return this.data.settings; }
  set(k, v) { this.data.settings[k] = v; this.flush(); }

  addScore(mode, rec) {
    const list = this.data.highScores[mode] || (this.data.highScores[mode] = []);
    const best = list.length ? list[0].score : 0;
    list.push(rec);
    list.sort((a, b) => b.score - a.score);
    this.data.highScores[mode] = list.slice(0, 5);
    this.flush();
    return rec.score > best && rec.score > 0;
  }
  best(mode) { const l = this.data.highScores[mode]; return l && l.length ? l[0].score : 0; }
  noteRun(run) {
    const s = this.data.stats;
    s.runs++; s.candies += run.coins; s.stomps += run.stomps; s.perfects += run.perfects;
    s.bestLap = Math.max(s.bestLap, run.lap);
    s.bestWorld = Math.max(s.bestWorld, run.lap > 1 ? 9 : run.world);
    if (s.bestWorld >= 3 || run.lap > 1) this.data.unlocks.gallery = true;
    this.flush();
  }
  reset() { this.data = DEFAULTS(); this.flush(); }
}
