// Records a short gameplay video: four clips (one per event) played by the AI at normal speed, cut and joined with ffmpeg -> docs/qa/gameplay.mp4
// The video has no sound (Playwright records the screen only).
import { startPreview, launch, openGame } from './lib.mjs';
import { spawnSync } from 'node:child_process';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
const tmp = '/tmp/copa_video'; rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
const srv = await startPreview();
const b = await launch();
const clips = [
  { ev: 'race', from: 5, to: 15 }, { ev: 'circuit', from: 9, to: 17 }, { ev: 'pinata', from: 8, to: 16 }, { ev: 'arena', from: 5, to: 13 },
];
const files = [];
for (const c of clips) {
  const t0 = Date.now();
  const { ctx, page } = await openGame(b, srv.url, `autostart=event&event=${c.ev}&players=1&chars=sophie,papa,mama,thor&autoplay&skipIntro&seed=${c.ev === 'race' ? 2 : 4}`,
    { viewport: { width: 1280, height: 720 }, recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } },
    (s) => { try { localStorage.setItem('copa-arcoiris/save', JSON.stringify(s)); } catch {} }, { version: 1, stats: { warmupDone: true } });
  await page.waitForFunction(() => window.__copa?.ready);
  await page.waitForFunction((t) => window.__copa.game.scene.getScene('Event')?.world?.eventT >= t, c.from, { timeout: 60000 });
  const startAt = (Date.now() - t0) / 1000 - c.from;   // video time at which the event clock was 0
  await page.waitForFunction((t) => window.__copa.game.scene.getScene('Event')?.world?.eventT >= t, c.to, { timeout: 60000 });
  const video = page.video();
  await ctx.close();
  const src = await video.path();
  const out = `${tmp}/${c.ev}.mp4`;
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(startAt + c.from), '-t', String(c.to - c.from), '-i', src, '-r', '30', '-vf', 'scale=1280:720', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', out], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed for ' + c.ev);
  files.push(out); console.log('clip', c.ev, 'video offset', startAt.toFixed(1));
}
const list = files.map((f) => `file '${f}'`).join('\n');
spawnSync('bash', ['-c', `printf "%s\\n" "${list.replace(/"/g, '\\"')}" > ${tmp}/list.txt`]);
const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${tmp}/list.txt`, '-c', 'copy', 'docs/qa/gameplay.mp4'], { stdio: 'inherit' });
console.log(r.status === 0 ? 'docs/qa/gameplay.mp4 written' : 'concat failed');
await b.close(); srv.stop();
