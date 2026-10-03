// Device matrix: layout (integer zoom), HUD inside the viewport, portrait overlay, and touch controls.
import { launch, startServer } from './helpers.mjs';
const devices = [
  { name: 'iphone15promax', w: 932, h: 430, dpr: 3, touch: true },
  { name: 'galaxys23', w: 780, h: 360, dpr: 3, touch: true },
  { name: 'ipad', w: 1180, h: 820, dpr: 2, touch: true },
  { name: 'desktop1080', w: 1920, h: 945, dpr: 1, touch: false },
  { name: 'laptop', w: 1366, h: 650, dpr: 1, touch: false },
];
const s = await startServer(9400 + Math.floor(Math.random() * 100));
let bad = 0;
for (const d of devices) {
  const { browser, ctx, page, errors } = await launch({ width: d.w, height: d.h, dpr: d.dpr, touch: d.touch });
  await page.goto(`${s.url}/index.html?skipTitle&mode=easy&seed=4&nosw`);
  await page.waitForFunction(() => window.UNISALTA?.game?.scene.isActive('Game'), null, { timeout: 30000 });
  await page.waitForTimeout(2200);
  const info = await page.evaluate(() => {
    const c = document.querySelector('#game canvas'), r = c.getBoundingClientRect();
    const hud = document.querySelector('#hud')?.getBoundingClientRect();
    const app = window.UNISALTA;
    return { internal: `${c.width}x${c.height}`, css: `${r.width.toFixed(0)}x${r.height.toFixed(0)}`, zoomX: (r.width * devicePixelRatio / c.width), zoomY: (r.height * devicePixelRatio / c.height), px: getComputedStyle(document.getElementById('app')).getPropertyValue('--px'), hudInside: !!hud && hud.left >= 0 && hud.right <= innerWidth + 1, ui: app.ui.state };
  });
  const integer = Math.abs(info.zoomX - Math.round(info.zoomX)) < 0.01 && Math.abs(info.zoomY - Math.round(info.zoomY)) < 0.01;
  // controls: tap right half = jump, press left half = crouch
  const before = await page.evaluate(() => window.UNISALTA.game.scene.getScene('Game').sim.p.onGround);
  const input = d.touch ? page.touchscreen : page.mouse;
  if (d.touch) await page.touchscreen.tap(d.w * 0.75, d.h * 0.6); else { await page.mouse.move(d.w * 0.75, d.h * 0.6); await page.mouse.down(); }
  await page.waitForTimeout(160);
  const inAir = await page.evaluate(() => !window.UNISALTA.game.scene.getScene('Game').sim.p.onGround);
  if (!d.touch) await page.mouse.up();
  await page.screenshot({ path: `/tmp/dev_${d.name}.png` });
  const ok = integer && info.hudInside && before && inAir && errors.length === 0;
  if (!ok) bad++;
  console.log(`${ok ? 'OK ' : 'BAD'} ${d.name.padEnd(15)} internal ${info.internal} css ${info.css} zoom ${info.zoomX.toFixed(2)} --px ${info.px} hudInside ${info.hudInside} jump ${inAir} errors ${errors.length}`);
  // portrait overlay
  await page.setViewportSize({ width: d.h, height: d.w });
  await page.waitForTimeout(400);
  const rot = await page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display);
  if (rot !== 'flex') { bad++; console.log('BAD portrait overlay missing for', d.name); }
  await browser.close();
}
s.stop();
process.exit(bad ? 1 : 0);
