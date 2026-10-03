// Usage: node tests/e2e/shot.mjs "<query>" out.png [waitMs] [width] [height] [dpr]
import { launch, startServer } from './helpers.mjs';
const [query = '?skipTitle', out = '/tmp/shot.png', wait = '2500', w = '932', h = '430', dpr = '3'] = process.argv.slice(2);
const s = await startServer(8130 + Math.floor(Math.random() * 500));
const { browser, page, errors } = await launch({ width: +w, height: +h, dpr: +dpr });
await page.goto(s.url + '/index.html' + query);
await page.waitForFunction(() => window.UNISALTA && window.UNISALTA.game && window.UNISALTA.game.scene.isActive('Game'), null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
console.log('errors:', JSON.stringify(errors.slice(0, 5)));
await browser.close(); s.stop();
