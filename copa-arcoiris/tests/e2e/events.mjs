// Captures each event on autopilot at a few simulated times. Usage: node tests/e2e/events.mjs
import { startPreview, launch, openGame } from './lib.mjs';
const plan = { pinata: [4, 14, 40], arena: [6, 40, 70], circuit: [6, 28, 58], warmup: [3] };
const srv = await startPreview();
const b = await launch();
for (const [ev, times] of Object.entries(plan)) {
  const players = ev === 'warmup' ? 1 : 1;
  const { page, errors } = await openGame(b, srv.url, `autostart=event&event=${ev}&players=${players}&chars=sophie,papa,mama,thor&autoplay&ff=${ev === 'warmup' ? 1 : 8}&skipIntro&seed=4`, { viewport: { width: 1280, height: 720 } },
    (s) => { try { localStorage.setItem('copa-arcoiris/save', JSON.stringify(s)); } catch {} }, { version: 1, stats: { warmupDone: true } });
  await page.waitForFunction(() => window.__copa && window.__copa.ready);
  for (const t of times) {
    await page.waitForFunction((tt) => { const w = window.__copa.game.scene.getScene('Event')?.world; return w && w.eventT >= tt; }, t, { timeout: 120000 });
    await page.screenshot({ path: `docs/qa/shots/ev_${ev}_${t}.png` });
  }
  console.log(ev, 'errors:', errors.length, errors.slice(0, 4));
  await page.context().close();
}
await b.close(); srv.stop();
