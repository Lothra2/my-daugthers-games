// The game must boot with the CDN unreachable (vendored libs) and play offline from the service worker cache.
import { launch, startServer } from './helpers.mjs';
process.env.NO_CDN = '1';
const s = await startServer(9300 + Math.floor(Math.random() * 100));
const { browser, ctx, page, errors } = await launch({ width: 800, height: 400, dpr: 1 });
await page.goto(s.url + '/index.html');
await page.waitForFunction(() => window.UNISALTA?.game?.scene.isActive('Title'), null, { timeout: 30000 });
console.log('boots without CDN: yes');
await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active, null, { timeout: 20000 });
await page.waitForTimeout(2500);
const cached = await page.evaluate(async () => (await (await caches.open('uni-salta-v1.0.0')).keys()).length);
console.log('cached files:', cached);
await ctx.setOffline(true);
await page.reload();
await page.waitForFunction(() => window.UNISALTA?.game?.scene.isActive('Title'), null, { timeout: 30000 });
await page.screenshot({ path: '/tmp/offline_title.png' });
console.log('boots offline: yes');
console.log('errors', JSON.stringify(errors.filter((e) => !/ERR_FAILED|Failed to load resource/.test(e)).slice(0, 4)));
await browser.close(); s.stop();
