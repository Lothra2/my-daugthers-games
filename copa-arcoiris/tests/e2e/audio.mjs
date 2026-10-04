// Browser audio checks: starts every song and every effect from the ?sounds board and measures what reaches the speakers (RMS on the master bus).
// This proves the sound is generated and not silent. It does NOT prove it sounds good: that needs a human ear (see ACCEPTANCE_CHECKLIST).
import { startPreview, launch, openGame } from './lib.mjs';
const srv = await startPreview();
const b = await launch();
const { page, errors } = await openGame(b, srv.url, 'sounds');
await page.waitForFunction(() => window.__copa && window.__copa.ready);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const peak = (ms) => page.evaluate(async (ms) => { const a = window.__copa.audio; let m = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { m = Math.max(m, a.level()); await new Promise((r) => setTimeout(r, 20)); } return m; }, ms);

await page.click('#sb-music button >> nth=0');
ok(await page.evaluate(() => window.__copa.audio.running), 'audio context running after the first click');
const songs = await page.$$eval('#sb-music button', (bs) => bs.map((x) => x.dataset.k).filter((k) => k !== 'parar'));
for (const s of songs) {
  await page.click(`#sb-music button[data-k="${s}"]`);
  const p = await peak(2600);
  ok(p > 0.02, `song ${s}: level ${p.toFixed(3)}`);
  ok(await page.evaluate(() => window.__copa.audio.current) === s, `song ${s} is the current one`);
}
await page.click('#sb-music button[data-k="parar"]');
await page.waitForTimeout(700);
{ const l = await peak(300); ok(l < 0.005, 'silence after stop (level ' + l.toFixed(4) + ')'); }
const sfx = await page.$$eval('#sb-sfx button', (bs) => bs.map((x) => x.dataset.k));
let silent = [];
for (const k of sfx) {
  await page.click(`#sb-sfx button[data-k="${k}"]`);
  const p = await peak(Math.min(900, 150 + (k === 'fanfare' || k === 'cup' ? 700 : 200)));
  if (p < 0.01) silent.push(k);
  await page.waitForTimeout(120);
}
ok(silent.length === 0, `all ${sfx.length} effects audible${silent.length ? ' (silent: ' + silent.join(',') + ')' : ''}`);
// volume controls
await page.evaluate(() => window.__copa.audio.setVolumes(0.7, 0.8, true));
await page.waitForTimeout(250);
await page.click('#sb-sfx button[data-k="fanfare"]');
{ const l = await peak(500); ok(l < 0.005, 'mute silences everything (level ' + l.toFixed(4) + ')'); }
await page.evaluate(() => window.__copa.audio.setVolumes(0.7, 0.0, false));
await page.click('#sb-sfx button[data-k="fanfare"]');
ok(await peak(500) < 0.005, 'sfx volume 0 silences effects');
await page.evaluate(() => window.__copa.audio.setVolumes(0.7, 0.8, false));
// pause suspends the context
await page.click('#sb-music button[data-k="race"]');
await page.evaluate(() => window.__copa.audio.pause(true));
await page.waitForTimeout(400);
ok(!(await page.evaluate(() => window.__copa.audio.running)), 'pause suspends audio');
await page.evaluate(() => window.__copa.audio.pause(false));
await page.waitForTimeout(600);
ok(await page.evaluate(() => window.__copa.audio.running), 'resume restarts audio');
ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3));
// in a real event: the game effects reach the audio engine and the event tune plays
{
  const g = await openGame(b, srv.url, 'autostart=event&event=race&players=1&chars=sophie,papa,mama,thor&autoplay&ff=4&skipIntro&seed=2');
  await g.page.waitForFunction(() => window.__copa && window.__copa.ready);
  ok(!(await g.page.evaluate(() => window.__copa.audio.running)) && (await g.page.evaluate(() => window.__copa.audio.log.length)) === 0, 'no sound before the first user gesture');
  await g.page.mouse.click(300, 300);   // the user gesture that unlocks audio
  await g.page.waitForFunction(() => window.__copa.game.scene.getScene('Event')?.world?.eventT >= 12, null, { timeout: 60000 });
  const info = await g.page.evaluate(() => ({ song: window.__copa.audio.current, log: window.__copa.audio.log.slice(), running: window.__copa.audio.running }));
  const uniq = [...new Set(info.log)];
  ok(info.running, 'audio running during an event');
  ok(info.log.length >= 8 && uniq.length >= 3, `game effects played: ${info.log.length} sounds, ${uniq.length} kinds (${uniq.slice(0, 8).join(',')})`);
  ok(g.errors.length === 0, 'no console errors in the event ' + g.errors.slice(0, 3));
  await g.ctx.close();
}
console.log(fails ? `${fails} FAILED` : 'ALL OK');
await b.close(); srv.stop();
process.exit(fails ? 1 : 0);
