// Usage: node tests/e2e/shot.mjs "<query>" out.png [waitMs] [viewportWxH] [dpr]
import { startPreview, launch, openGame } from './lib.mjs';
const [, , query = 'event=race', out = 'docs/qa/shots/tmp.png', waitMs = '3500', vp = '1280x720', dpr = '1'] = process.argv;
const [vw, vh] = vp.split('x').map(Number);
const srv = await startPreview();
const b = await launch();
const { page, errors } = await openGame(b, srv.url, query, { viewport: { width: vw, height: vh }, deviceScaleFactor: Number(dpr) });
await page.waitForFunction(() => window.__copa && window.__copa.ready, null, { timeout: 20000 });
await page.waitForTimeout(Number(waitMs));
await page.screenshot({ path: out });
const info = await page.evaluate(() => { const w = window.__copa.game.scene.getScene('Event')?.world; return w ? { t: +w.eventT.toFixed(1), phase: w.phase, actors: w.actors.map((a) => `${a.charId}:${Math.round(a.x)},${Math.round(a.y)}:${a.state}`) } : null; });
console.log(JSON.stringify(info), 'errors:', errors.length, errors.slice(0, 6));
await b.close(); srv.stop();
