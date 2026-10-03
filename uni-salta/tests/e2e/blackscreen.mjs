// Plays like a person (random jumps and crouches, cutscenes on, god mode so it survives) and watches for black frames,
// console errors and a sim that stops ticking. Usage: node tests/e2e/blackscreen.mjs [world] [seconds] [seed]
import { launch, startServer } from './helpers.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const world = +(process.argv[2] || 5), secs = +(process.argv[3] || 150), seed = +(process.argv[4] || 3);
const s = await startServer(9800 + Math.floor(Math.random() * 80));
const { browser, page, errors } = await launch({ width: 932, height: 430, dpr: 1 });
await page.goto(`${s.url}/index.html?skipTitle&god&seed=${seed}&world=${world}`);
await page.waitForFunction(() => window.UNISALTA?.game?.scene.isActive('Game'), null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate(() => { const g = window.UNISALTA.game.scene.getScene('Game'); const sm = g.sim; sm.worldStartX = sm.x - sm.worldLenM() * 40 + 2500; });
const t0 = Date.now(); let last = -1, bad = 0, i = 0, lastTick = 0, stalled = 0;
while ((Date.now() - t0) / 1000 < secs) {
  const k = ['Space', 'ArrowDown', 'Space', 'Space'][i++ % 4];
  await page.keyboard.down(k); await page.waitForTimeout(80 + Math.random() * 300); await page.keyboard.up(k);
  await page.waitForTimeout(150 + Math.random() * 500);
  const st = await page.evaluate(() => { const g = window.UNISALTA.game.scene.getScene('Game'); const sm = g.sim; return { tick: sm.tick, world: sm.world, boss: sm.boss && sm.boss.state, cut: g.cut.on, over: sm.over, paused: g.paused, ui: window.UNISALTA.ui && window.UNISALTA.ui.state, objs: g.children.length }; });
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 932, height: 430 } });
  fs.writeFileSync('/tmp/bs_cur.png', buf);
  const lum = +execSync(`python3 -c "from PIL import Image,ImageStat;print(ImageStat.Stat(Image.open('/tmp/bs_cur.png').convert('L')).mean[0])"`).toString();
  if (lum < 40) { bad++; console.log('DARK', lum.toFixed(1), JSON.stringify(st)); await page.screenshot({ path: `/tmp/dark_${bad}.png` }); }
  if (st.tick === lastTick && !st.over && !st.cut && !st.paused) { stalled++; console.log('NOTICK', JSON.stringify(st)); }
  lastTick = st.tick;
  if (i % 40 === 0) console.log(Math.round((Date.now() - t0) / 1000), JSON.stringify(st));
  if (st.world !== world && !st.boss && st.tick > 50 && st.world > world) { console.log('reached world', st.world); }
}
console.log('dark', bad, 'stalled', stalled, 'errors', JSON.stringify(errors.slice(0, 5)));
await browser.close(); s.stop();
