// Captures a frame strip of an action (jump over a slime, duck under a snake) for animation review.
import { launch, startServer } from './helpers.mjs';
import fs from 'node:fs';
const s = await startServer(9500 + Math.floor(Math.random() * 100));
const { browser, page, errors } = await launch({ width: 932, height: 430, dpr: 1 });
for (const [id, world, frames, step] of [['easy_slime_01', 1, 14, 70], ['easy_fly_01', 1, 12, 70]]) {
  await page.goto(`${s.url}/index.html?skipTitle&chunk=${id}&world=${world}&seed=5&autoplay&god&nosw`);
  await page.waitForFunction(() => window.UNISALTA?.game?.scene.isActive('Game'), null, { timeout: 30000 });
  await page.waitForFunction(() => { const g = window.UNISALTA.game.scene.getScene('Game'); const e = g?.sim?.entities.find((q) => q.kind === 'hz'); return e && e.x - g.sim.x < 360 && g.introT > 1; }, null, { timeout: 30000, polling: 20 });
  const shots = [];
  for (let i = 0; i < frames; i++) { shots.push(await page.screenshot({ clip: { x: 60, y: 130, width: 420, height: 260 } })); await page.waitForTimeout(step); }
  fs.mkdirSync('/tmp/seq', { recursive: true });
  shots.forEach((b, i) => fs.writeFileSync(`/tmp/seq/${id}_${String(i).padStart(2, '0')}.png`, b));
}
console.log('errors', JSON.stringify(errors.slice(0, 3)));
await browser.close(); s.stop();
