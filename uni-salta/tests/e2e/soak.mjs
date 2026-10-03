// Fast-forward soak: autoplay with god mode through all six worlds and a lap, looking for console errors.
import { launch, startServer } from './helpers.mjs';
const secs = Number(process.argv[2] || 40);
const s = await startServer(9100 + Math.floor(Math.random() * 100));
const { browser, page, errors } = await launch({ width: 800, height: 400, dpr: 1 });
await page.goto(`${s.url}/index.html?skipTitle&autoplay&god&ff=20&seed=9`);
await page.waitForFunction(() => window.UNISALTA?.game?.scene.isActive('Game'), null, { timeout: 30000 });
const t0 = Date.now(); let last = '';
while (Date.now() - t0 < secs * 1000) {
  await page.waitForTimeout(2000);
  const st = await page.evaluate(() => { const g = window.UNISALTA.game.scene.getScene('Game'); const s = g.sim; return `w${s.world} lap${s.lap} ${s.meters}m score ${s.score} lives ${s.lives} ents ${s.entities.length} sprites ${g.sprites.size} fps ${Math.round(g.game.loop.actualFps)}`; });
  if (st !== last) console.log(st); last = st;
}
await page.screenshot({ path: '/tmp/soak_end.png' });
console.log('errors', JSON.stringify(errors.slice(0, 6)));
await browser.close(); s.stop();
