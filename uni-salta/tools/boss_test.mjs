// Plays the boss fight with the reactive bot. Usage: node tools/boss_test.mjs [world] [lead] [seed] [mode]
import { Sim } from '../src/core/sim.js';
import { ReactiveBot } from '../src/core/bot.js';
import { makeRng } from '../src/core/rng.js';
import { CFG } from '../src/core/config.js';

const world = +(process.argv[2] || 6), lead = +(process.argv[3] || 0.27), seed = +(process.argv[4] || 3), mode = process.argv[5] || 'normal';
const sim = new Sim({ mode, seed, world });
const bot = new ReactiveBot({ lead, jitter: 0.06, rng: makeRng(seed) });
sim.worldStartX = sim.x - sim.worldLenM() * CFG.METER + 600;
let hits = 0, ticks = 0, started = null, ended = null, reflects = 0, shots = 0, minHp = null;
while (ticks < 60 * 240 && !sim.over) {
  sim.step(bot.act(sim));
  ticks++;
  for (const e of sim.drainEvents()) {
    if (e.type === 'boss_start') started = ticks;
    if (e.type === 'hit') hits++;
    if (e.type === 'orb_reflect') reflects++;
    if (e.type === 'boss_shoot') shots++;
    if (e.type === 'boss_gone') ended = ticks;
    if (e.type === 'world_enter') { console.log('entered world', e.world, 'at', (ticks / 60).toFixed(1)); ticks = 1e9; }
  }
}
console.log({ world, mode, lead, seed, started: started && (started / 60).toFixed(1), ended: ended && (ended / 60).toFixed(1), fightSec: started && ended ? ((ended - started) / 60).toFixed(1) : null, hits, shots, reflects, lives: sim.lives, hp: sim.boss && sim.boss.hp, over: sim.over });
