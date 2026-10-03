// Captures the power-up cutscene for a power kind. Usage: node tests/e2e/cut.mjs fast|slow|inv -> /tmp/cut_grid.png
import { launch, startServer } from './helpers.mjs';
const kind = process.argv[2] || 'fast';
const s = await startServer(8900 + Math.floor(Math.random() * 90));
const { browser, page, errors } = await launch({ width: 932, height: 430, dpr: 1 });
await page.goto(`${s.url}/index.html?skipTitle&god&seed=4`);
await page.waitForFunction(() => window.UNISALTA?.game?.scene.isActive('Game'), null, { timeout: 30000 });
await page.waitForTimeout(1800);
await page.evaluate((k) => { const g = window.UNISALTA.game.scene.getScene('Game'); g.sim.power = { kind: k, t: 5, total: 5, warned: false }; g.sim.emit('power_start', { kind: k, x: g.sim.x, y: 60 }); }, kind);
for (let i = 0; i < 9; i++) { await page.waitForTimeout(i < 2 ? 140 : 190); await page.screenshot({ path: `/tmp/cut_${i}.png` }); }
await page.waitForTimeout(900); await page.screenshot({ path: `/tmp/cut_9.png` });
console.log('errors', JSON.stringify(errors.slice(0, 5)));
await browser.close(); s.stop();
