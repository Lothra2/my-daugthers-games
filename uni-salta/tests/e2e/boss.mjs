// Plays the boss fight with the bot and captures frames. Usage: node tests/e2e/boss.mjs [world] -> /tmp/boss_*.png
import { launch, startServer } from './helpers.mjs';
const world = +(process.argv[2] || 6);
const s = await startServer(9100 + Math.floor(Math.random() * 80));
const { browser, page, errors } = await launch({ width: 932, height: 430, dpr: 1 });
await page.goto(`${s.url}/index.html?skipTitle&autoplay&seed=5&world=${world}`);
await page.waitForFunction(() => window.UNISALTA?.game?.scene.isActive('Game'), null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate(() => { const g = window.UNISALTA.game.scene.getScene('Game'); const sm = g.sim; sm.worldStartX = sm.x - sm.worldLenM() * 40 + 500; });
let i = 0;
for (const t of [3500, 2500, 2500, 3000, 3500, 4000, 5000, 6000, 6000, 8000]) {
  await page.waitForTimeout(t);
  await page.screenshot({ path: `/tmp/boss_${i++}.png` });
  const st = await page.evaluate(() => { const b = window.UNISALTA.game.scene.getScene('Game').sim.boss; return b ? `${b.state} hp ${b.hp}/${b.max}` : 'none'; });
  console.log(i - 1, st);
}
console.log('errors', JSON.stringify(errors.slice(0, 5)));
await browser.close(); s.stop();
