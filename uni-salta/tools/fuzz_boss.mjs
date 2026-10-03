// Random-input fuzz of the boss fight: every run must end (boss gone or game over) and never stall.
import { Sim } from '../src/core/sim.js';
import { makeRng } from '../src/core/rng.js';
import { CFG } from '../src/core/config.js';
let bad = 0;
for (const world of [6, 9]) for (const mode of ['normal', 'easy']) for (let seed = 1; seed <= 12; seed++) {
  const sim = new Sim({ mode, seed, world });
  const r = makeRng(seed * 7);
  sim.worldStartX = sim.x - sim.worldLenM() * CFG.METER + 400;
  let ticks = 0, jump = false, crouch = false, started = 0, gone = 0, entered = false;
  const T = 60 * 400;
  while (ticks < T && !sim.over) {
    if (r.chance(0.03)) jump = !jump; if (r.chance(0.04)) crouch = !crouch;
    sim.step({ jumpDown: jump, jumpPressed: jump && r.chance(0.3), crouchDown: crouch });
    ticks++;
    for (const e of sim.drainEvents()) { if (e.type === 'boss_start') started = ticks; if (e.type === 'boss_gone') gone = ticks; if (e.type === 'world_enter') entered = true; }
    if (entered) break;
  }
  const ok = sim.over || entered;
  if (!ok) { bad++; console.log('STALL', { world, mode, seed, started, gone, boss: sim.boss && { s: sim.boss.state, hp: sim.boss.hp }, lives: sim.lives, ticks }); }
}
console.log(bad ? `${bad} stalled` : 'all fuzz runs ended');
process.exit(bad ? 1 : 0);
