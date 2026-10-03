import { launch, startServer } from './helpers.mjs';
const times = (process.argv[2] || '7000').split(',').map(Number);
const s = await startServer(8700 + Math.floor(Math.random() * 200));
const { browser, page, errors } = await launch({ width: 932, height: 430, dpr: 1 });
for (let w = +(process.argv[3] || 1); w <= 9; w++) {
  await page.goto(`${s.url}/index.html?skipTitle&autoplay&seed=${w * 11}&world=${w}`);
  await page.waitForFunction(() => window.UNISALTA && window.UNISALTA.game && window.UNISALTA.game.scene.isActive('Game'), null, { timeout: 30000 });
  let prev = 0;
  for (const t of times) { await page.waitForTimeout(t - prev); prev = t; await page.screenshot({ path: `/tmp/w${w}_${t}.png` }); }
}
console.log('errors', JSON.stringify(errors.slice(0, 4)));
await browser.close(); s.stop();
