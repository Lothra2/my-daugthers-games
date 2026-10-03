// Human-like play through the boss without autoplay: random keys, checks the sim keeps advancing and no console errors.
import { launch, startServer } from './helpers.mjs';
const world = +(process.argv[2] || 6);
const s = await startServer(9300 + Math.floor(Math.random() * 80));
const { browser, page, errors } = await launch({ width: 932, height: 430, dpr: 1 });
await page.goto(`${s.url}/index.html?skipTitle&seed=11&world=${world}`);
await page.waitForFunction(() => window.UNISALTA?.game?.scene.isActive('Game'), null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate(() => { const g = window.UNISALTA.game.scene.getScene('Game'); const sm = g.sim; sm.worldStartX = sm.x - sm.worldLenM() * 40 + 500; });
let last = -1, stalls = 0, log = [];
for (let i = 0; i < 70; i++) {
  const k = ['Space', 'ArrowDown', 'Space'][i % 3];
  await page.keyboard.down(k); await page.waitForTimeout(120 + (i % 5) * 60); await page.keyboard.up(k);
  await page.waitForTimeout(500);
  const st = await page.evaluate(() => { const g = window.UNISALTA.game.scene.getScene('Game'); const b = g.sim.boss; return { tick: g.sim.tick, over: g.sim.over, boss: b ? `${b.state} ${b.hp}/${b.max}` : 'none', world: g.sim.world, cut: g.cut.on, lives: g.sim.lives, ui: window.UNISALTA.ui && window.UNISALTA.ui.state }; });
  if (st.tick === last && !st.over) { stalls++; console.log('STALL', JSON.stringify(st)); } last = st.tick;
  if (i % 8 === 0) log.push(JSON.stringify(st));
  if (st.over) break;
}
console.log(log.join('\n')); console.log('stalled samples', stalls, 'errors', JSON.stringify(errors.slice(0, 5)));
await browser.close(); s.stop();
