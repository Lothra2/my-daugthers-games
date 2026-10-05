// Walks the menus by clicking, like a player. Usage: node tests/e2e/flow.mjs
import { startPreview, launch, openGame } from './lib.mjs';
const srv = await startPreview();
const b = await launch();
const { page, errors } = await openGame(b, srv.url, '', { viewport: { width: 1280, height: 720 } });
await page.waitForFunction(() => window.__copa && window.__copa.ready, null, { timeout: 20000 });
const shot = (n) => page.screenshot({ path: `docs/qa/shots/flow_${n}.png` });
await page.waitForSelector('#go'); await page.waitForTimeout(800); await shot('01_splash');
await page.click('#go', { force: true }); await page.waitForSelector('[data-a=cup]'); await page.waitForTimeout(500); await shot('02_menu');
await page.click('[data-a=cup]'); await page.waitForSelector('[data-n="1"]'); await shot('03_players');
await page.click('[data-n="1"]'); await page.waitForSelector('[data-c=sophie]'); await shot('04_select');
await page.click('[data-c=sophie]'); await page.waitForSelector('#ok'); await shot('05_controls');
await page.click('#ok'); await page.waitForSelector('#go'); await shot('06_intro');
console.log('errors:', errors.length, errors.slice(0, 5));
await b.close(); srv.stop();
