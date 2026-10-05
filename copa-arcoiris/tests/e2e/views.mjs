// Evidence captures: hitboxes (?hitboxes) in the 4 events, and the game at the sizes of the plan (integer scale, no scroll).
import { startPreview, launch, openGame } from './lib.mjs';
const srv = await startPreview();
const b = await launch();
const pre = (s) => { try { localStorage.setItem('copa-arcoiris/save', JSON.stringify(s)); } catch {} };
const save = { version: 1, stats: { warmupDone: true } };
const waitT = (page, t) => page.waitForFunction((tt) => window.__copa.game.scene.getScene('Event')?.world?.eventT >= tt, t, { timeout: 90000 });
for (const [ev, t, seed] of [['race', 12, 2], ['circuit', 10, 4], ['pinata', 10, 4], ['arena', 8, 4]]) {
  const { ctx, page } = await openGame(b, srv.url, `autostart=event&event=${ev}&players=1&chars=sophie,papa,mama,thor&autoplay&skipIntro&hitboxes&ff=4&seed=${seed}`, { viewport: { width: 1280, height: 720 } }, pre, save);
  await page.waitForFunction(() => window.__copa?.ready); await waitT(page, t);
  await page.screenshot({ path: `docs/qa/shots/hitbox_${ev}.png` });
  await ctx.close();
}
const sizes = [[1920, 1080, 1], [1024, 768, 1], [844, 390, 3], [2048, 1536, 2], [1280, 720, 1]];
for (const [w, h, dpr] of sizes) {
  const { ctx, page } = await openGame(b, srv.url, 'autostart=event&event=race&players=1&chars=sophie,papa,mama,thor&autoplay&skipIntro&ff=4&seed=2', { viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: w < 1000 }, pre, save);
  await page.waitForFunction(() => window.__copa?.ready); await waitT(page, 6);
  const info = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { cw: c.width, ch: c.height, cssW: Math.round(r.width), cssH: Math.round(r.height), scrollX: document.documentElement.scrollWidth > innerWidth }; });
  const scale = info.cssW / info.cw;
  console.log(`${w}x${h}@${dpr}`, JSON.stringify(info), 'scale', scale, Number.isInteger(scale) ? 'INTEGER' : 'NOT INTEGER');
  await page.screenshot({ path: `docs/qa/shots/size_${w}x${h}${dpr > 1 ? '@' + dpr : ''}.png` });
  await ctx.close();
}
await b.close(); srv.stop();
