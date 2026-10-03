// Captures the world gate crossing. Usage: node tests/e2e/transition.mjs [fromWorld] -> /tmp/tr_grid.png
import { launch, startServer } from './helpers.mjs';
const from = +(process.argv[2] || 1);
const s = await startServer(8800 + Math.floor(Math.random() * 100));
const { browser, page, errors } = await launch({ width: 932, height: 430, dpr: 1 });
await page.goto(`${s.url}/index.html?skipTitle&autoplay&god&seed=9&world=${from}`);
await page.waitForFunction(() => window.UNISALTA?.game?.scene.isActive('Game'), null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate(() => { const g = window.UNISALTA.game.scene.getScene('Game'); const sm = g.sim; sm.worldStartX = sm.x - sm.worldLenM() * 40 + 1250; });
const shots = [];
for (let i = 0; i < 12; i++) { await page.waitForTimeout(i < 4 ? 500 : 350); const p = `/tmp/tr_${i}.png`; await page.screenshot({ path: p }); shots.push(p); }
console.log('errors', JSON.stringify(errors.slice(0, 5)));
await browser.close(); s.stop();
