// Headless balancing runs: a human-like reactive bot plays many seeded runs through the real core.
import { Sim } from '../src/core/sim.js';
import { ReactiveBot } from '../src/core/bot.js';
import { makeRng } from '../src/core/rng.js';
import { CFG } from '../src/core/config.js';

const runs = Number(process.argv[2] || 40);
const mode = process.argv[3] || 'normal';
const lead = Number(process.argv[4] || 0.27);
const jitter = Number(process.argv[5] || 0.08);
const maxSec = Number(process.argv[6] || 600);
const res = [];
const deaths = {};
for (let r = 0; r < runs; r++) {
  const sim = new Sim({ seed: 100 + r, mode });
  const bot = new ReactiveBot({ lead, jitter, rng: makeRng(500 + r) });
  let ticks = 0;
  while (!sim.over && ticks < 60 * maxSec) {
    sim.step(bot.act(sim));
    for (const e of sim.events) if (e.type === 'hit' && sim.lives <= 1) deaths[e.kind] = (deaths[e.kind] || 0) + 1; else if (e.type === 'fall_gap') deaths.gap = (deaths.gap || 0) + (sim.lives <= 0 ? 1 : 0);
    sim.events = [];
    ticks++;
  }
  res.push({ world: sim.world, lap: sim.lap, m: sim.meters, score: sim.score, sec: ticks / 60, over: sim.over, lives: sim.lives });
}
const avg = (k) => (res.reduce((a, b) => a + b[k], 0) / res.length).toFixed(1);
const worlds = res.map((x) => (x.lap - 1) * 6 + x.world).sort((a, b) => a - b);
console.log(`mode ${mode}, ${runs} runs, lead ${lead}±${jitter}`);
console.log(`median world index ${worlds[Math.floor(worlds.length / 2)]}, p90 ${worlds[Math.floor(worlds.length * 0.9)]}, avg meters ${avg('m')}, avg seconds ${avg('sec')}, avg score ${avg('score')}`);
console.log('survived to timeout:', res.filter((x) => !x.over).length, ' last-life deaths by hazard:', JSON.stringify(deaths));
