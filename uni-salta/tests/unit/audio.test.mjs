import test from 'node:test';
import assert from 'node:assert/strict';
import { zzfxG } from '../../src/vendor/zzfx.js';
import { SFX, SFX_NAMES } from '../../src/audio/sfx.js';
import { compose, SONGS } from '../../src/audio/music.js';

test('every sound effect renders finite samples, short, and without hard clipping', () => {
  for (const n of SFX_NAMES) {
    const d = zzfxG(...SFX[n]);
    assert.ok(d.length > 400, `${n} too short`);
    assert.ok(d.length < 44100 * 1.5, `${n} too long: ${(d.length / 44100).toFixed(2)}s`);
    let peak = 0;
    for (const s of d) { assert.ok(Number.isFinite(s), `${n} has NaN`); peak = Math.max(peak, Math.abs(s)); }
    assert.ok(peak > 0.05, `${n} is silent (peak ${peak})`);
    assert.ok(peak <= 1.0001, `${n} clips (peak ${peak})`);
  }
});

test('every song composes bars of notes on all layers', () => {
  for (const [id, spec] of Object.entries(SONGS)) {
    const s = compose(spec);
    assert.equal(s.steps, spec.bars * 16);
    for (const layer of ['bass', 'drums', 'arp', 'lead']) {
      const count = s.ev[layer].filter(Boolean).length;
      assert.ok(count >= spec.bars * 2, `${id}.${layer} too sparse (${count})`);
    }
    for (const layer of Object.keys(s.ev)) for (const evs of s.ev[layer]) for (const o of evs || []) if (o.m !== undefined) assert.ok(o.m >= 24 && o.m <= 115, `${id} ${layer} note ${o.m} out of range`);
  }
});

test('the jump motif opens the world songs', () => {
  const s = compose(SONGS.world1);
  const first = (s.ev.lead[0] || [])[0], second = (s.ev.lead[2] || [])[0], third = (s.ev.lead[4] || [])[0];
  assert.ok(first && second && third && first.m < second.m && second.m < third.m, 'rises like the unicorn leaps');
});
