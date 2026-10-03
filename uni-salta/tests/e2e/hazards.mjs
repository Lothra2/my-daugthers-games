// Visual QA of every hazard: runs each chunk with a god-mode bot and captures the moment the hazard is near.
import { launch, startServer } from './helpers.mjs';
import { CHUNKS } from '../../src/data/patterns.js';
const list = process.argv[2] ? process.argv[2].split(',') : ['easy_slime_01', 'easy_fly_01', 'hang_01', 'snail_intro_01', 'spiky_01', 'bee_high_01', 'bee_low_01', 'owl_intro_01', 'storm_intro_01', 'hop_spiky_01', 'jelly_intro_01', 'stomp_single_01', 'block_single_01', 'gap_small_01', 'platform_high_01'];
const s = await startServer(8900 + Math.floor(Math.random() * 100));
const { browser, page, errors } = await launch({ width: 932, height: 430, dpr: 1 });
for (const id of list) {
  const ch = CHUNKS.find((c) => c.id === id);
  const world = ch.worlds[0];
  await page.goto(`${s.url}/index.html?skipTitle&chunk=${id}&world=${world}&seed=5&autoplay&god&mode=${ch.modes.includes('normal') ? 'normal' : 'easy'}`);
  await page.waitForFunction(() => window.UNISALTA?.game?.scene.isActive('Game'), null, { timeout: 30000 });
  // wait until the first hazard is ~ 330px ahead of the player (or timeout)
  await page.waitForFunction(() => {
    const g = window.UNISALTA.game.scene.getScene('Game'); if (!g || !g.sim) return false;
    const e = g.sim.entities.find((q) => (q.kind === 'hz' || q.kind === 'block' || q.kind === 'plat') && q.x > g.sim.x - 20);
    const gap = g.sim.floor.length > 1 && g.sim.floor.find((f, i) => g.sim.floor[i + 1] && f.x1 > g.sim.x && f.x1 - g.sim.x < 360);
    return !!((e && e.x - g.sim.x < 330) || gap);
  }, null, { timeout: 30000, polling: 30 }).catch(() => {});
  await page.waitForTimeout(260);
  await page.screenshot({ path: `/tmp/hz_${id}.png` });
}
console.log('errors', JSON.stringify(errors.slice(0, 6)));
await browser.close(); s.stop();
