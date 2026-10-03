// Procedural chiptune: songs are composed from a chord progression plus the "jump motif",
// then played by a small look-ahead sequencer on Web Audio. Layers fade in and out on bar lines.
import { makeRng } from '../core/rng.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
const CHORD = { maj: [0, 4, 7], min: [0, 3, 7] };

export const SONGS = {
  title:      { bpm: 96,  root: 60, mode: 'major', prog: [[0, 'maj'], [9, 'min'], [5, 'maj'], [7, 'maj']], bars: 16, style: 'bell', seed: 11 },
  world1:     { bpm: 140, root: 60, mode: 'major', prog: [[0, 'maj'], [9, 'min'], [5, 'maj'], [7, 'maj']], bars: 32, style: 'pulse', seed: 21 },
  world2:     { bpm: 146, root: 62, mode: 'major', prog: [[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']], bars: 32, style: 'pulse', seed: 22 },
  world3:     { bpm: 150, root: 65, mode: 'major', prog: [[0, 'maj'], [5, 'maj'], [7, 'maj'], [9, 'min']], bars: 32, style: 'marimba', seed: 23 },
  world4:     { bpm: 152, root: 57, mode: 'minor', prog: [[0, 'min'], [8, 'maj'], [3, 'maj'], [10, 'maj']], bars: 32, style: 'bell', seed: 24 },
  world5:     { bpm: 156, root: 64, mode: 'minor', prog: [[0, 'min'], [10, 'maj'], [8, 'maj'], [10, 'maj']], bars: 32, style: 'drive', seed: 25 },
  world6:     { bpm: 160, root: 60, mode: 'major', prog: [[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']], bars: 32, style: 'grand', seed: 26 },
  world7:     { bpm: 148, root: 62, mode: 'major', prog: [[0, 'maj'], [5, 'maj'], [9, 'min'], [7, 'maj']], bars: 32, style: 'marimba', seed: 27 },
  world8:     { bpm: 144, root: 59, mode: 'major', prog: [[0, 'maj'], [9, 'min'], [7, 'maj'], [5, 'maj']], bars: 32, style: 'bell', seed: 28 },
  world9:     { bpm: 162, root: 57, mode: 'minor', prog: [[0, 'min'], [5, 'maj'], [8, 'maj'], [7, 'maj']], bars: 32, style: 'drive', seed: 29 },
  boss:       { bpm: 176, root: 52, mode: 'minor', prog: [[0, 'min'], [8, 'maj'], [5, 'min'], [7, 'maj']], bars: 16, style: 'drive', seed: 41 },
  invincible: { bpm: 180, root: 67, mode: 'major', prog: [[0, 'maj'], [5, 'maj'], [7, 'maj'], [0, 'maj']], bars: 8, style: 'rainbow', seed: 31 },
};

// build note events for one song: events[layer][step] = [{m, d, v}]
export function compose(spec) {
  const rng = makeRng(spec.seed);
  const scale = (spec.mode === 'major' ? MAJOR : MINOR).map((s) => spec.root + s);
  const steps = spec.bars * 16;
  const ev = { bass: [], drums: [], arp: [], lead: [], speed: [], bell: [] };
  const put = (layer, step, o) => { (ev[layer][step] ||= []).push(o); };
  const bars = spec.bars;
  const chordAt = (bar) => { const [r, q] = spec.prog[bar % spec.prog.length]; return CHORD[q].map((s) => spec.root + r + s); };
  const nearScale = (m) => scale.reduce((best, n) => { for (const o of [-12, 0, 12]) if (Math.abs(n + o - m) < Math.abs(best - m)) best = n + o; return best; }, scale[0]);
  let lastLead = spec.root + 12;
  for (let bar = 0; bar < bars; bar++) {
    const c = chordAt(bar);
    const base = bar * 16;
    // ----- bass
    const root = c[0] - 12;
    for (const [s, n] of [[0, root], [4, root], [6, root + 7], [8, root], [10, root], [12, root + 7], [14, root + 12]]) put('bass', base + s, { m: n, d: 2, v: 0.9 });
    // ----- drums
    for (const s of [0, 8]) put('drums', base + s, { k: 'kick', v: 1 });
    for (const s of [4, 12]) put('drums', base + s, { k: 'snare', v: 0.8 });
    for (let s = 0; s < 16; s += 2) put('drums', base + s, { k: 'hat', v: s % 4 === 2 ? 0.6 : 0.35 });
    put('speed', base + 10, { k: 'kick', v: 0.7 }); put('speed', base + 14, { k: 'snare', v: 0.5 });
    for (let s = 1; s < 16; s += 2) put('speed', base + s, { k: 'hat', v: 0.28 });
    // ----- arp (16ths over chord tones)
    const pat = [0, 1, 2, 1];
    for (let s = 0; s < 16; s++) put('arp', base + s, { m: c[pat[s % 4]] + 12, d: 1, v: 0.5 });
    // ----- speed layer: octave bell arpeggio
    for (let s = 0; s < 16; s += 2) put('speed', base + s, { m: c[(s / 2) % 3] + 24, d: 2, v: 0.4, bell: true });
    // ----- bells (music box)
    for (const s of [0, 3, 6, 8, 11, 14]) put('bell', base + s, { m: c[(s % 3)] + 24, d: 2, v: 0.5, bell: true });
    // ----- lead
    const phrase = Math.floor(bar / 4) % 4;
    if (phrase === 0 || phrase === 2 && spec.bars <= 8) {
      // the jump motif: ascending arpeggio that leaps
      const seq = [[0, c[0] + 12], [2, c[1] + 12], [4, c[2] + 12], [6, c[0] + 24], [10, c[2] + 12], [12, c[1] + 12]];
      for (const [s, n] of seq) put('lead', base + s, { m: n, d: 2, v: 0.85 });
    } else if (phrase === 1) {
      // stepwise answer
      let n = nearScale(c[2] + 12);
      const rhythm = [0, 3, 6, 8, 11, 14];
      rhythm.forEach((s, i) => { const idx = scale.indexOf(((n - spec.root) % 12 + 12) % 12 + spec.root); const dir = i % 2 ? -1 : 1; n = nearScale(n + dir * (2 + (rng.next() < 0.4 ? 2 : 0))); put('lead', base + s, { m: n, d: i === 5 ? 2 : 2, v: 0.8 }); });
    } else if (phrase === 2) {
      // syncopated hook around the chord
      const hook = [[0, 0], [3, 2], [6, 1], [8, 2], [12, 0], [14, 1]];
      for (const [s, ci] of hook) put('lead', base + s, { m: c[ci] + 12 + (s === 8 ? 12 : 0), d: 2, v: 0.85 });
    } else {
      // resolve: long notes
      put('lead', base + 0, { m: c[2] + 12, d: 6, v: 0.85 }); put('lead', base + 8, { m: c[1] + 12, d: 4, v: 0.8 }); put('lead', base + 12, { m: c[0] + 12, d: 4, v: 0.8 });
    }
  }
  return { ev, steps, spec };
}

// ----------------------------------------------------------------------------------------------
export class Music {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.bus = ctx.createGain(); this.bus.gain.value = 0.7;
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000;
    this.bus.connect(this.lp); this.lp.connect(out);
    this.songs = {};
    this.cur = null; this.tempo = 1;
    this.layerTarget = { base: 1, harmony: 1, melody: 1, speed: 0, danger: 0, bells: 0 };
    this.noise = this.makeNoise();
    this.pulse = { 25: this.pulseWave(0.25), 12: this.pulseWave(0.125), 50: this.pulseWave(0.5) };
    this.timer = null;
    this.paused = false;
  }

  makeNoise() {
    const n = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let a = 1;
    for (let i = 0; i < n; i++) { a = (a * 1664525 + 1013904223) >>> 0; d[i] = (a / 4294967296) * 2 - 1; }
    return buf;
  }
  pulseWave(duty) {
    const N = 40, real = new Float32Array(N), imag = new Float32Array(N);
    for (let n = 1; n < N; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return this.ctx.createPeriodicWave(real, imag);
  }

  setVolume(v) { this.bus.gain.setTargetAtTime(Math.max(0, v), this.ctx.currentTime, 0.05); }

  songData(id) { return (this.songs[id] ||= compose(SONGS[id])); }

  // instance: gain nodes per layer
  makeInstance(id) {
    const ctx = this.ctx;
    const out = ctx.createGain(); out.gain.value = 0;
    out.connect(this.bus);
    const layers = {};
    for (const k of Object.keys(this.layerTarget)) { const g = ctx.createGain(); g.gain.value = this.layerTarget[k]; g.connect(out); layers[k] = g; }
    return { id, data: this.songData(id), out, layers, step: 0, next: 0 };
  }

  play(id, { fade = 0.25 } = {}) {
    if (!SONGS[id]) return;
    if (this.cur && this.cur.id === id) return;
    const ctx = this.ctx, now = ctx.currentTime;
    const old = this.cur;
    const start = old ? Math.max(now + 0.05, this.barBoundary(old)) : now + 0.08;
    if (old) { old.out.gain.cancelScheduledValues(now); old.out.gain.setValueAtTime(old.out.gain.value, Math.max(now, start - fade)); old.out.gain.linearRampToValueAtTime(0, start + fade); old.stopAt = start + fade + 0.1; this.dying = old; }
    const inst = this.makeInstance(id);
    inst.next = start; inst.step = 0;
    inst.out.gain.setValueAtTime(0, now); inst.out.gain.setValueAtTime(0.0001, start); inst.out.gain.linearRampToValueAtTime(1, start + fade);
    this.cur = inst;
    this.ensureTimer();
  }

  stop(fade = 0.4) {
    if (!this.cur) return;
    const now = this.ctx.currentTime;
    this.cur.out.gain.cancelScheduledValues(now);
    this.cur.out.gain.setValueAtTime(this.cur.out.gain.value, now);
    this.cur.out.gain.linearRampToValueAtTime(0, now + fade);
    this.cur.stopAt = now + fade + 0.1;
    this.dying = this.cur; this.cur = null;
  }

  barBoundary(inst) {
    const sd = this.stepDur(inst);
    const stepsToBar = (16 - (inst.step % 16)) % 16;
    return inst.next + stepsToBar * sd;
  }
  stepDur(inst) { return 60 / (inst.data.spec.bpm * this.tempo) / 4; }

  setLayer(name, v, atBar = true) {
    this.layerTarget[name] = v;
    const inst = this.cur; if (!inst) return;
    const ctx = this.ctx, t = atBar ? this.barBoundary(inst) : ctx.currentTime;
    const g = inst.layers[name].gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, Math.max(ctx.currentTime, t - 0.01));
    g.linearRampToValueAtTime(v, Math.max(ctx.currentTime, t) + 0.25);
  }

  setTempo(m, glide = 0.4) {
    this.tempo = m;
    this.lp.frequency.cancelScheduledValues(this.ctx.currentTime);
    this.lp.frequency.setTargetAtTime(m < 1 ? 1400 : 20000, this.ctx.currentTime, glide / 3);
  }

  ensureTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => this.pump(), 25);
  }
  pause(v) {
    this.paused = v;
  }

  pump() {
    if (this.paused) return;
    const ctx = this.ctx, horizon = ctx.currentTime + 0.14;
    for (const inst of [this.cur, this.dying]) {
      if (!inst) continue;
      if (inst.stopAt && ctx.currentTime > inst.stopAt) { inst.out.disconnect(); if (this.dying === inst) this.dying = null; continue; }
      let guard = 0;
      while (inst.next < horizon && guard++ < 8) {
        this.scheduleStep(inst, inst.step % inst.data.steps, inst.next);
        inst.next += this.stepDur(inst); inst.step++;
      }
    }
  }

  scheduleStep(inst, s, t) {
    const { ev, spec } = inst.data;
    const sd = this.stepDur(inst);
    const style = spec.style;
    const L = inst.layers;
    for (const o of ev.bass[s] || []) this.tri(L.base, o.m, t, sd * o.d * 0.95, 0.5 * o.v);
    for (const o of ev.drums[s] || []) this.drum(L.base, o.k, t, o.v);
    for (const o of ev.arp[s] || []) this.pulseNote(L.harmony, o.m, t, sd * 0.9, 0.09 * o.v, 12);
    const leadDuty = style === 'marimba' ? 50 : 25;
    for (const o of ev.lead[s] || []) {
      if (style === 'bell' || style === 'marimba') this.bell(L.melody, o.m, t, sd * o.d * 1.6, 0.2 * o.v, style === 'marimba');
      else this.pulseNote(L.melody, o.m, t, sd * o.d * 0.92, 0.16 * o.v, leadDuty, style === 'rainbow' ? 1.01 : 1);
    }
    for (const o of ev.speed[s] || []) { if (o.k) this.drum(L.speed, o.k, t, o.v * 0.8); else this.bell(L.speed, o.m, t, sd * 2, 0.16 * o.v, false); }
    if (style === 'bell' || spec.bpm < 100) for (const o of ev.bell[s] || []) this.bell(L.bells, o.m, t, sd * 3, 0.16 * o.v, false);
    // danger heartbeat on beats 1 and 3
    if (s % 8 === 0) this.drum(L.danger, 'kick', t, 0.7);
  }

  env(g, t, a, d, sus, dur, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.linearRampToValueAtTime(peak * sus, t + a + d);
    g.gain.setValueAtTime(peak * sus, t + Math.max(a + d, dur - 0.02));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
  }
  pulseNote(dest, m, t, dur, peak, duty, detune = 1) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.setPeriodicWave(this.pulse[duty] || this.pulse[25]);
    o.frequency.value = mtof(m) * detune;
    this.env(g, t, 0.004, 0.05, 0.6, dur, peak);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }
  tri(dest, m, t, dur, peak) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = mtof(m);
    this.env(g, t, 0.004, 0.04, 0.8, dur, peak);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }
  bell(dest, m, t, dur, peak, wood) {
    const ctx = this.ctx;
    const f = mtof(m);
    for (const [mul, vol, dm] of wood ? [[1, 1, 0.5], [2.76, 0.35, 0.18]] : [[1, 1, 1], [2.01, 0.4, 0.6], [3.99, 0.15, 0.3]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * mul;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak * vol, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * dm + 0.05);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dur * dm + 0.08);
    }
  }
  drum(dest, kind, t, v) {
    const ctx = this.ctx;
    if (kind === 'kick') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(0.7 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.18);
    } else {
      const s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = kind === 'snare' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 'snare' ? 1800 : 7000; f.Q.value = kind === 'snare' ? 0.8 : 0.5;
      const dur = kind === 'snare' ? 0.12 : 0.04;
      g.gain.setValueAtTime((kind === 'snare' ? 0.34 : 0.14) * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    }
  }

  // short melodic stings: notes = [[midi, offsetSec, durSec], ...]
  jingle(notes, type = 'pulse', vol = 0.18) {
    const t0 = this.ctx.currentTime + 0.02;
    for (const [m, off, dur] of notes) {
      if (type === 'bell') this.bell(this.bus, m, t0 + off, dur, vol, false); else this.pulseNote(this.bus, m, t0 + off, dur, vol, 25);
      this.tri(this.bus, m - 12, t0 + off, dur, vol * 0.8);
    }
  }
}

export const JINGLES = {
  world_clear:   { type: 'pulse', notes: [[72, 0, 0.1], [76, 0.1, 0.1], [79, 0.2, 0.1], [84, 0.3, 0.45], [79, 0.45, 0.1], [84, 0.55, 0.6]] },
  game_over:     { type: 'pulse', notes: [[79, 0, 0.18], [76, 0.2, 0.18], [72, 0.4, 0.18], [67, 0.6, 0.5], [72, 0.9, 0.12], [77, 1.05, 0.9]] },
  new_record:    { type: 'pulse', notes: [[72, 0, 0.12], [72, 0.14, 0.12], [72, 0.28, 0.12], [79, 0.42, 0.3], [76, 0.75, 0.12], [79, 0.9, 0.12], [84, 1.05, 0.7]] },
  one_up:        { type: 'bell', notes: [[76, 0, 0.1], [79, 0.09, 0.1], [83, 0.18, 0.1], [88, 0.27, 0.1], [91, 0.36, 0.1], [95, 0.45, 0.5]] },
  world_card:    { type: 'bell', notes: [[67, 0, 0.12], [72, 0.12, 0.12], [76, 0.24, 0.12], [79, 0.36, 0.5]] },
};
