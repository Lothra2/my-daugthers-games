// Proves every authored chunk is solvable and fair: a planning bot with a safety margin must pass it
// at the slowest and fastest speed of every world it can appear in.
import { CHUNKS } from '../src/data/patterns.js';
import { Sim } from '../src/core/sim.js';
import { ReactiveBot } from '../src/core/bot.js';
import { CFG } from '../src/core/config.js';

const LEADS = (process.argv[2] || '0.20,0.27,0.34').split(',').map(Number);
let bad = 0;
const only = process.argv[3];

function run(chunk, speed, world, lead) {
  const sim = new Sim({ mode: chunk.modes.includes('normal') ? 'normal' : 'easy', seed: 7, world, script: [chunk.id, 'breather_empty_01', 'breather_empty_01'], fixedSpeed: speed });
  const bot = new ReactiveBot({ lead });
  const endX = sim.startX + 640 + (CHUNKS.find((c) => c.id === 'breather_line_01').len + chunk.len + 6) * CFG.TILE;
  let ticks = 0;
  while (sim.x < endX && ticks < 60 * 60) {
    sim.step(bot.act(sim));
    ticks++;
    if (sim.lives < CFG.LIVES || sim.over) return { ok: false, tight: bot.tight };
    if (sim.mode === 'easy') for (const e of sim.drainEvents()) if (e.type === 'hit') return { ok: false, tight: bot.tight };
    sim.events = [];
  }
  return { ok: true, tight: bot.tight };
}

for (const ch of CHUNKS) {
  if (only && ch.id !== only) continue;
  const speeds = new Set();
  for (const w of ch.worlds) {
    const [a, b] = CFG.WORLD_SPEED[w - 1];
    speeds.add(w + ':' + (ch.modes.includes('easy') && !ch.modes.includes('normal') ? CFG.EASY_SPEED[0] : a));
    speeds.add(w + ':' + (ch.modes.includes('easy') && !ch.modes.includes('normal') ? CFG.EASY_CAP : Math.min(CFG.SPEED_CAP_MAX, b * Math.pow(CFG.LAP_SPEED_MULT, 4))));
  }
  const fails = [];
  for (const sw of speeds) {
    const [w, sp] = sw.split(':').map(Number);
    for (const lead of LEADS) {
      const r = run(ch, sp, w, lead);
      if (!r.ok) { fails.push(`${sp | 0}px/s(w${w}) lead ${lead}`); break; }
    }
  }
  if (fails.length) { bad++; console.log(`FAIL ${ch.id.padEnd(24)} ${fails.join(', ')}`); }
}
console.log(bad ? `\n${bad} chunk(s) failed` : `\nall ${CHUNKS.length} chunks solvable for reaction leads ${LEADS.join(', ')} s`);
process.exit(bad ? 1 : 0);
