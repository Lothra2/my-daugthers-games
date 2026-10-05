// Plays a whole cup on autopilot (humans driven by the AI, fast forward) and captures the result screens.
import { startPreview, launch, openGame } from './lib.mjs';
const players = process.argv[2] ?? '1';
const chars = process.argv[3] ?? 'sophie,papa,mama,thor';
const rounds = Number(process.argv[4] ?? 1);   // 2 = play "Otra copa" right after the first one and check the restart is clean
const tag = `${players}p_${chars.split(',')[0]}`;
const srv = await startPreview();
const b = await launch();
const ctxOpts = { viewport: { width: 1280, height: 720 } };
const q = `autostart=cup&players=${players}&chars=${chars}&autoplay&ff=12&skipIntro&seed=5`;
const pre = { version: 1, stats: { warmupDone: true, cupsPlayed: 0 } };
const { page, errors } = await openGame(b, srv.url, q, ctxOpts, (s) => { try { localStorage.setItem('copa-arcoiris/save', JSON.stringify(s)); } catch {} }, pre);
await page.waitForFunction(() => window.__copa && window.__copa.ready);
let n = 0;
for (let round = 0; round < rounds; round++) {
  for (let ev = 0; ev < 4; ev++) {
    await page.waitForSelector('#next', { timeout: 240000 });
    await page.screenshot({ path: `docs/qa/shots/cup_${tag}_result_${ev + 1}.png` });
    const title = await page.locator('.results h2').innerText();
    console.log('round', round + 1, 'result', ev + 1, title);
    await page.click('#next'); n++;
    if (ev < 3) await page.waitForTimeout(500);
  }
  await page.waitForSelector('.cupfinal', { timeout: 20000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `docs/qa/shots/cup_${tag}_final.png` });
  if (round < rounds - 1) {
    await page.click('#again');
    await page.waitForFunction(() => window.__copa.game.scene.getScene('Event')?.world?.eventT < 3, null, { timeout: 20000 });
    const st = await page.evaluate(() => ({ results: window.__copa.app.session.results.length, order: window.__copa.app.session.cup.order.length, overlay: !!document.querySelector('.cupfinal'), actors: window.__copa.game.scene.getScene('Event').world.actors.length }));
    console.log('restart state', JSON.stringify(st), st.results === 0 && st.order === 0 && !st.overlay ? 'CLEAN' : 'NOT CLEAN');
    if (!(st.results === 0 && st.order === 0 && !st.overlay)) process.exitCode = 1;
  }
}
const save = await page.evaluate(() => JSON.parse(localStorage.getItem('copa-arcoiris/save')));
console.log('save xp', JSON.stringify(Object.fromEntries(Object.entries(save.characters).map(([k, v]) => [k, v.xp]))), 'cups', save.stats.cupsPlayed, 'records', JSON.stringify(save.records));
console.log('errors:', errors.length, errors.slice(0, 6));
await b.close(); srv.stop();
if (errors.length) process.exit(1);
