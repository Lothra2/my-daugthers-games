// Captures the race at several simulated times with autoplay and fast forward.
import { startPreview, launch, openGame } from './lib.mjs';
const times = (process.argv[2] ?? '8,20,32,44,58').split(',').map(Number);
const prefix = process.argv[3] ?? 'docs/qa/shots/m3_zone';
const query = process.argv[4] ?? 'event=race&players=1&chars=sophie,papa,mama,thor&seed=2&autoplay&ff=6';
const srv = await startPreview();
const b = await launch();
const { page, errors } = await openGame(b, srv.url, query, { viewport: { width: 1280, height: 720 } });
await page.waitForFunction(() => window.__copa && window.__copa.ready, null, { timeout: 20000 });
for (const t of times) {
  await page.waitForFunction((tt) => { const w = window.__copa.game.scene.getScene('Event')?.world; return w && w.eventT >= tt; }, t, { timeout: 60000 });
  await page.screenshot({ path: `${prefix}_${t}.png` });
}
console.log('errors:', errors.length, errors.slice(0, 5));
await b.close(); srv.stop();
