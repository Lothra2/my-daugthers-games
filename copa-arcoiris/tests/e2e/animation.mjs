// Measures what is really drawn: every render frame it reads which sprite frame each character shows (a race played by the AI, 40 s).
// Checks: (1) running never skips or goes back a frame, (2) the standing pose never flashes between two run poses,
// (3) the pickup keeps every pose on screen long enough to be seen. The render runs on software GL here, so timings are coarse (about 30 ms).
import { startPreview, launch, openGame } from './lib.mjs';
const srv = await startPreview(); const b = await launch();
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const { ctx, page, errors } = await openGame(b, srv.url, 'autostart=event&event=race&players=1&chars=alana,papa,sophie,mama&autoplay&skipIntro&seed=3', { viewport: { width: 1280, height: 720 } },
  (s) => { try { localStorage.setItem('copa-arcoiris/save', JSON.stringify(s)); } catch {} }, { version: 1, stats: { warmupDone: true } });
await page.waitForFunction(() => window.__copa?.ready);
await page.waitForFunction(() => window.__copa.game.scene.getScene('Event')?.world?.eventT >= 3, null, { timeout: 60000 });
const data = await page.evaluate(async () => {
  const sc = window.__copa.game.scene.getScene('Event'); const out = {}; const t0 = performance.now();
  await new Promise((res) => { const f = () => { const t = performance.now();
    for (const [, v] of sc.views) {
      const fr = Number(v.sprite.frame.name), m = window.__copa.game.cache.json.get('meta_' + v.actor.charId); let nm = '?';
      for (const [k, a] of Object.entries(m.anims)) if (fr >= a.start && fr < a.start + a.frames) { nm = k; break; }
      (out[v.actor.charId] ??= []).push([t, nm, fr]);
    }
    if (t - t0 < 40000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  return out;
});
let runSteps = 0, runJumps = 0, runIdleRun = 0, pickupPoses = [], standFlash = [];
for (const [c, s] of Object.entries(data)) {
  for (let i = 1; i < s.length; i++) if (s[i][1] === 'run' && s[i - 1][1] === 'run') { runSteps++; if ((s[i][2] - s[i - 1][2] + 8) % 8 > 1) runJumps++; }
  const segs = []; let i = 0; while (i < s.length) { let j = i; while (j + 1 < s.length && s[j + 1][1] === s[i][1]) j++; segs.push([s[i][1], s[i][0], s[Math.min(j + 1, s.length - 1)][0]]); i = j + 1; }
  for (let k = 1; k < segs.length - 1; k++) {
    if (segs[k][0] === 'idle' && segs[k - 1][0] === 'run' && segs[k + 1][0] === 'run' && segs[k][2] - segs[k][1] < 100) runIdleRun++;
    if (segs[k][0] === 'pickup') pickupPoses.push(segs[k][2] - segs[k][1]);
  }
}
ok(runSteps > 800, `enough running to measure (${runSteps} samples)`);
ok(runJumps === 0, `running never skips or goes back a frame (${runJumps} jumps in ${runSteps} samples; before the fix about 12 in 100)`);
ok(runIdleRun === 0, `the standing pose never flashes between two run poses (${runIdleRun})`);
if (pickupPoses.length >= 3) { pickupPoses.sort((a, b) => a - b); ok(pickupPoses[Math.floor(pickupPoses.length * 0.1)] >= 60, `a pickup stays on screen at least 60 ms (10th percentile ${pickupPoses[Math.floor(pickupPoses.length * 0.1)].toFixed(0)} ms, ${pickupPoses.length} pickups)`); }
else console.log('note: fewer than 3 pickups happened in this run, pickup duration not measured');
ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL OK');
await b.close(); srv.stop(); process.exit(fails ? 1 : 0);
