// Captures a strip of player-feel frames: run, jump arc with trail, crouch. Output: /tmp/feel_*.png and /tmp/feel_grid.png
import { launch, startServer } from './helpers.mjs';
const s = await startServer(8700 + Math.floor(Math.random() * 100));
const { browser, page, errors } = await launch({ width: 932, height: 430, dpr: 1 });
await page.goto(`${s.url}/index.html?skipTitle&world=1&seed=3&god`);
await page.waitForFunction(() => window.UNISALTA?.game?.scene.isActive('Game'), null, { timeout: 30000 });
await page.waitForTimeout(2200);
const shots = [];
const snap = async (n) => { const p = `/tmp/feel_${n}.png`; await page.screenshot({ path: p, clip: { x: 0, y: 130, width: 480, height: 300 } }); shots.push(p); };
await snap('run');
await page.keyboard.down('Space');
for (const [i, t] of [[1, 120], [2, 200], [3, 160], [4, 160]]) { await page.waitForTimeout(t); await snap('jump' + i); }
await page.keyboard.up('Space');
await page.waitForTimeout(700);
await page.keyboard.down('ArrowDown'); await page.waitForTimeout(90); await snap('crouch1'); await page.waitForTimeout(300); await snap('crouch2');
await page.keyboard.up('ArrowDown');
console.log('errors', JSON.stringify(errors.slice(0, 5)), shots.length);
await browser.close(); s.stop();
