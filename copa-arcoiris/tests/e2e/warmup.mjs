// A bot plays the warmup with the REAL keyboard (key down/up events), reading positions from the simulation. It follows the four steps:
// run to the flag, jump the log, pick up the ball and hit the target, collect stars and use the power. Then checks the "ready" screen and the save.
import { startPreview, launch, openGame } from './lib.mjs';
const srv = await startPreview();
const b = await launch();
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const { ctx, page, errors } = await openGame(b, srv.url, '', { viewport: { width: 1280, height: 720 } }, (s) => { try { localStorage.setItem('copa-arcoiris/save', JSON.stringify(s)); } catch {} }, { version: 1 });
await page.waitForFunction(() => window.__copa?.ready);
await page.click('#go', { force: true }); await page.click('[data-a=warmup]'); await page.click('[data-n="1"]'); await page.click('[data-c=sophie]');
await page.waitForSelector('#ok'); await page.click('#ok'); await page.waitForSelector('#go'); await page.click('#go', { force: true });
await page.waitForFunction(() => window.__copa.game.scene.getScene('Event')?.world?.phase === 'play', null, { timeout: 20000 });

const held = new Set();
const hold = async (keys) => {
  for (const k of [...held]) if (!keys.includes(k)) { await page.keyboard.up(k); held.delete(k); }
  for (const k of keys) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
};
const tap = async (k) => { await page.keyboard.down(k); await page.waitForTimeout(60); await page.keyboard.up(k); };
const state = () => page.evaluate(() => {
  const w = window.__copa.game.scene.getScene('Event').world; const a = w.actors[0];
  const ball = w.items.filter((i) => i.kind === 'ball' && i.state === 'ground').sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
  const t = w.items.find((i) => i.kind === 'target');
  return { step: w.data.step, over: w.phase, x: a.x, y: a.y, z: a.z, facing: a.facing, carrying: a.carrying !== null, power: a.power, grounded: a.grounded, ball: ball && { x: ball.x, y: ball.y }, target: t && { x: t.x, y: t.y }, t: w.eventT };
});
const toward = (s, tx, ty, tol = 5) => { const k = []; if (tx - s.x > tol) k.push('KeyD'); if (s.x - tx > tol) k.push('KeyA'); if (ty - s.y > tol) k.push('KeyS'); if (s.y - ty > tol) k.push('KeyW'); return k; };

const seen = new Set();
let last = -1, lastThrow = 0;
const t0 = Date.now();
while (Date.now() - t0 < 90000) {
  const s = await state();
  if (s.step !== last) { seen.add(s.step); last = s.step; console.log('   step', s.step, 'at t=' + s.t.toFixed(1)); }
  if (process.env.DBG && Math.floor(s.t * 2) !== Math.floor((s.t - 0.05) * 2)) console.log(JSON.stringify(s));
  if (s.over === 'over' || s.step === 4) { await hold([]); break; }
  if (s.step === 0) await hold(['KeyD']);
  else if (s.step === 1) {
    if (s.x > 250 && s.x < 276 && s.grounded) { await hold(['KeyD']); await tap('Space'); } else await hold(['KeyD']);
  } else if (s.step === 2) {
    if (!s.carrying) {
      if (s.ball && Math.hypot(s.ball.x - s.x, s.ball.y - s.y) < 14) { await hold([]); await tap('KeyK'); await page.waitForTimeout(450); }
      else if (s.ball) await hold(toward(s, s.ball.x, s.ball.y, 6));
      else await hold([]);
    } else {
      const tx = s.target.x - 60;
      if (Math.abs(s.x - tx) > 8 || Math.abs(s.y - s.target.y) > 3) await hold(toward(s, tx, s.target.y, 3));
      else if (s.facing < 0) await hold(['KeyD']);
      else if (Date.now() - lastThrow > 1500) { await hold([]); await tap('KeyK'); lastThrow = Date.now(); await page.waitForTimeout(600); }
    }
  } else if (s.step === 3) {
    if (s.x < 600) await hold(toward(s, 610, 224, 4)); else await hold(['KeyA']);
    if (s.power >= 100) await tap('KeyL');
  }
  await page.waitForTimeout(40);
}
await hold([]);
ok(seen.has(1) && seen.has(2) && seen.has(3), `the four steps advanced in order (${[...seen].join(',')})`);
await page.waitForSelector('#go', { timeout: 20000 });
await page.screenshot({ path: 'docs/qa/shots/ui_warmup_done.png' });
ok((await page.textContent('.bubble')).includes('Calentamiento listo') || (await page.textContent('.bubble')).includes('Muy bien'), 'the ready screen appears');
const save = await page.evaluate(() => JSON.parse(localStorage.getItem('copa-arcoiris/save')));
ok(save.stats.warmupDone === true, 'warmup is marked as done in the save');
ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL OK');
await b.close(); srv.stop();
process.exit(fails ? 1 : 0);
