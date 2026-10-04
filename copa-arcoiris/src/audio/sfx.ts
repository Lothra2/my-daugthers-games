/** Sound effects synthesized from tiny recipes. No samples, no files: every sound is generated here, so there is nothing to license.
 *  `renderSfx` is pure (recipe in, samples out), so it runs the same in the browser and in unit tests. */

export type Wave = 'sq' | 'sin' | 'saw' | 'tri' | 'noise';
/** One layer of a sound. `f` slides exponentially from f[0] to f[1] Hz, `at` delays the layer, `lp` smooths noise (0..1, higher = darker). */
export interface Seg { w: Wave; f: [number, number]; d: number; v?: number; at?: number; duty?: number; vib?: [number, number]; lp?: number; atk?: number; curve?: number }
export interface SfxDef { segs: Seg[]; gap?: number }

const n = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);
const tone = (w: Wave, midi: number, at: number, d: number, v = 0.5, extra: Partial<Seg> = {}): Seg => ({ w, f: [n(midi), n(midi)], d, at, v, ...extra });
const arp = (w: Wave, midis: number[], step: number, d: number, v = 0.45): Seg[] => midis.map((m, i) => tone(w, m, i * step, d, v));

export const SFX: Record<string, SfxDef> = {
  click: { segs: [tone('sq', 84, 0, 0.05, 0.35, { duty: 0.25 })] },
  jump: { segs: [{ w: 'sq', f: [300, 640], d: 0.13, v: 0.4, duty: 0.25 }] },
  land: { segs: [{ w: 'noise', f: [0, 0], d: 0.08, v: 0.5, lp: 0.7 }, { w: 'sin', f: [130, 60], d: 0.09, v: 0.5 }] },
  splash: { segs: [{ w: 'noise', f: [0, 0], d: 0.35, v: 0.55, lp: 0.35, atk: 0.02 }, { w: 'sin', f: [500, 180], d: 0.12, v: 0.3 }] },
  plop: { segs: [{ w: 'sin', f: [700, 220], d: 0.11, v: 0.55 }, { w: 'noise', f: [0, 0], d: 0.05, v: 0.2, lp: 0.5 }] },
  stroke: { segs: [{ w: 'noise', f: [0, 0], d: 0.12, v: 0.3, lp: 0.45, atk: 0.02 }] },
  push: { segs: [{ w: 'noise', f: [0, 0], d: 0.07, v: 0.45, lp: 0.5 }, { w: 'sq', f: [220, 90], d: 0.1, v: 0.35, duty: 0.5 }] },
  hit: { segs: [{ w: 'noise', f: [0, 0], d: 0.08, v: 0.5, lp: 0.55 }, { w: 'sq', f: [260, 100], d: 0.1, v: 0.4, duty: 0.5 }] },
  block: { segs: [tone('sq', 96, 0, 0.07, 0.3, { duty: 0.125 }), tone('sq', 103, 0.05, 0.09, 0.25, { duty: 0.125 })] },
  whiff: { segs: [{ w: 'noise', f: [0, 0], d: 0.09, v: 0.16, lp: 0.2, atk: 0.03 }] },
  tumble: { segs: [{ w: 'saw', f: [420, 90], d: 0.38, v: 0.4, vib: [18, 0.08] }, { w: 'noise', f: [0, 0], d: 0.1, v: 0.35, lp: 0.6, at: 0.3 }] },
  pickup: { segs: [{ w: 'sq', f: [520, 860], d: 0.09, v: 0.35, duty: 0.5 }] },
  throw: { segs: [{ w: 'noise', f: [0, 0], d: 0.16, v: 0.25, lp: 0.2, atk: 0.04 }, { w: 'sq', f: [420, 900], d: 0.14, v: 0.25, duty: 0.25 }] },
  star: { segs: [tone('sq', 88, 0, 0.07, 0.4, { duty: 0.25 }), tone('sq', 95, 0.07, 0.16, 0.4, { duty: 0.25 })] },
  gold: { segs: arp('sq', [88, 92, 95, 100], 0.07, 0.14, 0.4) },
  bounce: { segs: [{ w: 'sin', f: [160, 900], d: 0.22, v: 0.55 }, { w: 'tri', f: [320, 1500], d: 0.2, v: 0.2 }] },
  ballbounce: { segs: [{ w: 'sin', f: [330, 200], d: 0.05, v: 0.22 }] },
  cp: { segs: arp('sq', [79, 83, 86], 0.08, 0.2, 0.35) },
  finish: { segs: [...arp('sq', [72, 76, 79, 84], 0.1, 0.18, 0.35), tone('sq', 84, 0.42, 0.5, 0.35), tone('tri', 72, 0.42, 0.5, 0.35)] },
  crate: { segs: [{ w: 'noise', f: [0, 0], d: 0.14, v: 0.4, lp: 0.5 }, ...arp('tri', [84, 88, 91], 0.05, 0.12, 0.35).map((s) => ({ ...s, at: (s.at ?? 0) + 0.08 }))] },
  smash: { segs: [{ w: 'noise', f: [0, 0], d: 0.25, v: 0.6, lp: 0.6 }, { w: 'sin', f: [110, 40], d: 0.2, v: 0.6 }] },
  pinata: { segs: [{ w: 'sin', f: [150, 70], d: 0.1, v: 0.55 }, { w: 'noise', f: [0, 0], d: 0.2, v: 0.3, lp: 0.25, at: 0.04, atk: 0.01 }] },
  crack: { segs: [{ w: 'noise', f: [0, 0], d: 0.05, v: 0.5, lp: 0.1 }, { w: 'noise', f: [0, 0], d: 0.05, v: 0.45, lp: 0.1, at: 0.08 }, { w: 'noise', f: [0, 0], d: 0.05, v: 0.4, lp: 0.1, at: 0.15 }] },
  burst: { segs: [{ w: 'sin', f: [600, 1900], d: 0.09, v: 0.5 }, { w: 'noise', f: [0, 0], d: 0.09, v: 0.35, lp: 0.15 }] },
  pop: { segs: [{ w: 'sin', f: [700, 1700], d: 0.07, v: 0.45 }] },
  bubble: { segs: [{ w: 'sin', f: [500, 1100], d: 0.12, v: 0.4 }, { w: 'sin', f: [800, 1500], d: 0.1, v: 0.3, at: 0.07 }] },
  drag: { segs: [{ w: 'noise', f: [0, 0], d: 0.2, v: 0.2, lp: 0.4, atk: 0.04 }] },
  whistle: { segs: [{ w: 'sin', f: [2300, 2300], d: 0.5, v: 0.4, vib: [32, 0.05], atk: 0.02 }, { w: 'sin', f: [3100, 3100], d: 0.5, v: 0.12, vib: [32, 0.05], atk: 0.02 }] },
  count: { segs: [tone('sq', 69, 0, 0.18, 0.4, { duty: 0.5 })] },
  go: { segs: [tone('sq', 81, 0, 0.4, 0.4, { duty: 0.5 }), tone('sq', 88, 0, 0.4, 0.3, { duty: 0.5 })] },
  room: { segs: arp('tri', [72, 76, 79], 0.07, 0.2, 0.45) },
  roomdone: { segs: arp('sq', [79, 83, 86, 91], 0.08, 0.2, 0.35) },
  round: { segs: arp('sq', [74, 77, 81], 0.09, 0.2, 0.35) },
  roundend: { segs: [{ w: 'sin', f: [2300, 2300], d: 0.35, v: 0.35, vib: [30, 0.05], atk: 0.02 }] },
  shrink: { segs: [{ w: 'noise', f: [0, 0], d: 0.8, v: 0.4, lp: 0.9, atk: 0.2 }, { w: 'saw', f: [70, 45], d: 0.8, v: 0.25 }] },
  // the five family powers
  power_rainbow: { segs: arp('sq', [72, 76, 79, 84, 88, 91], 0.05, 0.12, 0.35) },
  power_bubble: { segs: [{ w: 'sin', f: [400, 900], d: 0.2, v: 0.45 }, { w: 'sin', f: [600, 1300], d: 0.2, v: 0.35, at: 0.09 }, { w: 'sin', f: [800, 1700], d: 0.2, v: 0.3, at: 0.18 }] },
  power_charge: { segs: [{ w: 'saw', f: [90, 420], d: 0.35, v: 0.4 }, { w: 'noise', f: [0, 0], d: 0.35, v: 0.25, lp: 0.5, atk: 0.1 }] },
  power_stars: { segs: arp('tri', [96, 100, 103, 108, 103, 108], 0.045, 0.14, 0.4) },
  power_zoom: { segs: [{ w: 'sq', f: [200, 1200], d: 0.3, v: 0.3, duty: 0.25 }, { w: 'noise', f: [0, 0], d: 0.3, v: 0.2, lp: 0.2, atk: 0.1 }] },
  levelup: { segs: [...arp('sq', [72, 76, 79, 84, 88], 0.09, 0.18, 0.35), tone('tri', 84, 0.45, 0.6, 0.4), tone('tri', 91, 0.45, 0.6, 0.3)] },
  fanfare: { segs: [...arp('sq', [67, 67, 67, 72], 0.14, 0.12, 0.35), tone('sq', 76, 0.56, 0.3, 0.35), tone('sq', 72, 0.9, 0.12, 0.35), tone('sq', 76, 1.02, 0.12, 0.35), tone('sq', 79, 1.14, 0.7, 0.35), tone('tri', 55, 0.56, 1.3, 0.45)] },
  cup: { segs: [...arp('sq', [72, 76, 79, 84, 79, 84, 88], 0.12, 0.2, 0.33), tone('sq', 91, 0.84, 1.2, 0.33), tone('sq', 84, 0.84, 1.2, 0.25), tone('tri', 60, 0.84, 1.4, 0.45)] },
  bark: { segs: [{ w: 'saw', f: [320, 160], d: 0.1, v: 0.45 }, { w: 'saw', f: [380, 190], d: 0.12, v: 0.45, at: 0.14 }] },
};

/** Which sound a game effect asks for. Several game facts share a sound. */
export const FX_TO_SFX: Record<string, string> = {
  jump: 'jump', land: 'land', splash: 'splash', plop: 'plop', stroke: 'stroke', push: 'push', hit: 'hit', block: 'block', whiff: 'whiff', tumble: 'tumble',
  pickup: 'pickup', throw: 'throw', bounce: 'bounce', ballbounce: 'ballbounce', cp: 'cp', finish: 'finish', crate: 'crate', smash: 'smash', pinata: 'pinata',
  crack: 'crack', burst: 'burst', pop: 'pop', bubble: 'bubble', drag: 'drag', whistle: 'whistle', go: 'go', room: 'room', roomdone: 'roomdone', round: 'round',
  roundend: 'roundend', shrink: 'shrink',
};
export const POWER_SFX = ['power_rainbow', 'power_bubble', 'power_charge', 'power_stars', 'power_zoom'];

const duration = (def: SfxDef): number => def.segs.reduce((m, s) => Math.max(m, (s.at ?? 0) + s.d), 0);

/** Mono samples in [-1, 1]. Deterministic (own LCG noise) so tests are stable. */
export function renderSfx(def: SfxDef, rate: number): Float32Array {
  const len = Math.ceil((duration(def) + 0.02) * rate);
  const out = new Float32Array(len);
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
  for (const s of def.segs) {
    const i0 = Math.floor((s.at ?? 0) * rate), cnt = Math.floor(s.d * rate), v = s.v ?? 0.5, atk = Math.max(0.003, s.atk ?? 0.004);
    let ph = 0, lp = 0;
    for (let i = 0; i < cnt && i0 + i < len; i++) {
      const t = i / rate, u = i / cnt;
      let f = s.f[0] > 0 ? s.f[0] * Math.pow(s.f[1] / s.f[0], u) : 0;
      if (s.vib) f *= 1 + Math.sin(2 * Math.PI * s.vib[0] * t) * s.vib[1];
      ph += f / rate; ph -= Math.floor(ph);
      let x = 0;
      switch (s.w) {
        case 'sq': x = ph < (s.duty ?? 0.5) ? 1 : -1; break;
        case 'saw': x = ph * 2 - 1; break;
        case 'tri': x = Math.abs(ph * 4 - 2) - 1; break;
        case 'sin': x = Math.sin(ph * 2 * Math.PI); break;
        case 'noise': lp += (rnd() - lp) * (1 - (s.lp ?? 0)); x = lp * (1 + (s.lp ?? 0) * 1.5); break;
      }
      const env = Math.min(1, t / atk) * Math.pow(1 - u, s.curve ?? 1.6);
      out[i0 + i] += x * env * v;
    }
  }
  for (let i = 0; i < len; i++) out[i] = Math.max(-1, Math.min(1, out[i] * 0.9));
  return out;
}
