import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../../src/core/sim.js';
import { CFG } from '../../src/core/config.js';
import { CHUNKS } from '../../src/data/patterns.js';

const NONE = { jumpDown: false, jumpPressed: false, crouchDown: false };
const quiet = (extra = {}) => new Sim({ seed: 1, script: ['breather_empty_01', 'breather_empty_01', 'breather_empty_01'], ...extra });

function apexOf(hold) {
  const s = quiet();
  for (let i = 0; i < 20; i++) s.step(NONE);
  let max = 0;
  s.step({ jumpDown: true, jumpPressed: true, crouchDown: false });
  for (let i = 0; i < 90; i++) { s.step({ jumpDown: i < hold, jumpPressed: false, crouchDown: false }); max = Math.max(max, s.p.y); }
  return max;
}

test('full jump reaches about 170 px, a tap about 60 px', () => {
  const full = apexOf(70);
  const tap = apexOf(1);
  assert.ok(full > 160 && full < 180, `full ${full}`);
  assert.ok(tap > 45 && tap < 80, `tap ${tap}`);
});

test('crouch changes the hitbox on the same tick', () => {
  const s = quiet();
  for (let i = 0; i < 10; i++) s.step(NONE);
  const h0 = s.playerBox().h;
  s.step({ jumpDown: false, jumpPressed: false, crouchDown: true });
  assert.equal(h0, CFG.BOX_STAND.h);
  assert.equal(s.playerBox().h, CFG.BOX_CROUCH.h);
});

test('jump buffer: a press just before landing still jumps', () => {
  const s = quiet();
  for (let i = 0; i < 10; i++) s.step(NONE);
  s.step({ jumpDown: true, jumpPressed: true, crouchDown: false });
  for (let i = 0; i < 80 && !s.p.onGround; i++) s.step(NONE);
  // fall again and press 4 ticks before the floor
  s.step({ jumpDown: true, jumpPressed: true, crouchDown: false });
  let landed = false, jumpedAfter = false;
  for (let i = 0; i < 120; i++) {
    const near = s.p.vy < 0 && s.p.y < 30 && !s.p.onGround;
    s.step({ jumpDown: near, jumpPressed: near && !jumpedAfter, crouchDown: false });
    for (const e of s.drainEvents()) { if (e.type === 'land') landed = true; if (e.type === 'jump' && landed) jumpedAfter = true; }
  }
  assert.ok(jumpedAfter);
});

test('same seed gives the same level', () => {
  const a = new Sim({ seed: 42, world: 2 });
  const b = new Sim({ seed: 42, world: 2 });
  for (let i = 0; i < 600; i++) { a.step(NONE); b.step(NONE); }
  assert.equal(JSON.stringify(a.entities.map((e) => [e.kind, e.type, Math.round(e.x)])), JSON.stringify(b.entities.map((e) => [e.kind, e.type, Math.round(e.x)])));
});

test('generator respects the tier cap and breather rules', () => {
  const s = new Sim({ seed: 3, world: 1 });
  for (let i = 0; i < 3300 && !s.over; i++) { s.power = { kind: 'inv', t: 5, total: 5, warned: true }; s.step(NONE); }
  const used = s.gen.history.map((id) => CHUNKS.find((c) => c.id === id));
  assert.ok(used.every((c) => c.tier <= 1), 'world 1 only uses tier 0 and 1');
  assert.ok(used.length > 8);
});

test('three hits end the run, lives never go negative, easy mode never ends', () => {
  const s = new Sim({ seed: 5, world: 1 });
  let over = false;
  for (let i = 0; i < 60 * 60 * 2 && !over; i++) { s.step(NONE); for (const e of s.drainEvents()) if (e.type === 'game_over') over = true; }
  assert.ok(over, 'doing nothing eventually loses');
  assert.ok(s.lives <= 0);
  const easy = new Sim({ seed: 5, world: 1, mode: 'easy' });
  for (let i = 0; i < 60 * 90; i++) easy.step(NONE);
  assert.equal(easy.over, false);
  assert.equal(easy.lives, CFG.LIVES);
});

test('invincible power pops enemies instead of hurting', () => {
  const s = new Sim({ seed: 9, world: 1 });
  s.power = { kind: 'inv', t: 5, total: 5, warned: false };
  let hits = 0, pops = 0;
  for (let i = 0; i < 60 * 25; i++) { s.power = { kind: 'inv', t: 5, total: 5, warned: true }; s.step(NONE); for (const e of s.drainEvents()) { if (e.type === 'hit') hits++; if (e.type === 'pop') pops++; } }
  assert.equal(hits, 0);
  assert.ok(pops >= 1);
});

test('speed rises across a world and by lap', () => {
  const s = new Sim({ seed: 1, world: 1 });
  const a = s.targetSpeed();
  s.x += CFG.METER * 400;
  assert.ok(s.targetSpeed() > a);
  const l2 = new Sim({ seed: 1, world: 1, lap: 2 });
  assert.ok(l2.targetSpeed() > a);
  assert.ok(new Sim({ seed: 1, world: 6, lap: 9 }).targetSpeed() <= CFG.SPEED_CAP);
});
