// Menus: settings (language, sliders), records, gallery unlock, back to title from pause.
import { launch, startServer } from './helpers.mjs';
const s = await startServer(9700 + Math.floor(Math.random() * 100));
const { browser, page, errors } = await launch({ width: 932, height: 430, dpr: 1 });
let fails = 0;
const check = (n, ok, x = '') => { console.log(`${ok ? 'OK ' : 'BAD'} ${n} ${x}`); if (!ok) fails++; };
await page.goto(`${s.url}/index.html?nosw&lang=es`);
await page.waitForFunction(() => window.UNISALTA?.ui?.state === 'title', null, { timeout: 30000 });
await page.waitForTimeout(1500);
// language toggle
const t1 = await page.textContent('#title .play .face');
await page.click('#title .corner .btn.lav', { force: true });
await page.waitForTimeout(500);
const lang = await page.evaluate(() => window.UNISALTA.i18n.lang);
check('language toggles to EN', lang === 'en', lang);
// settings
await page.click('#title .corner .btn:nth-child(2)', { force: true });
await page.waitForSelector('#settings input[type=range]', { timeout: 5000 });
await page.evaluate(() => { const r = document.querySelector('#settings input[type=range]'); r.value = '0.3'; r.dispatchEvent(new Event('input')); });
const mv = await page.evaluate(() => window.UNISALTA.save.settings.music);
check('music slider saves', mv === 0.3, String(mv));
await page.click('#settings .toggle', { force: true });
check('reduce shake toggle saves', await page.evaluate(() => window.UNISALTA.save.settings.reduceShake));
await page.click('#settings .btn.pink', { force: true });
await page.waitForFunction(() => window.UNISALTA.ui.state === 'title', null, { timeout: 5000 });
check('settings back to title', true);
// records with data + gallery unlock
await page.evaluate(() => { const a = window.UNISALTA; a.save.addScore('normal', { score: 4200, meters: 900, world: 3, lap: 1, date: '2026-10-03', name: 'Sophie' }); a.save.noteRun({ coins: 50, stomps: 3, perfects: 2, lap: 1, world: 3 }); a.ui.showTitle(); });
await page.waitForTimeout(1200);
await page.click('#title .corner .btn:nth-child(1)', { force: true });
await page.waitForSelector('#scores .table', { timeout: 5000 });
const rows = await page.$$eval('#scores .table tr', (r) => r.length);
check('records list shows the score', rows >= 1, String(rows));
await page.click('#scores .btn.pink', { force: true });
await page.waitForTimeout(600);
check('gallery button appears after reaching world 3', await page.$('#title .corner .btn:nth-child(3) img[src*="frame"]') !== null);
await page.click('#title .corner .btn:nth-child(3)', { force: true });
await page.waitForSelector('#gallery .gcard', { timeout: 5000 });
await page.screenshot({ path: '/tmp/menu_gallery.png' });
check('gallery shows Sophie\'s drawings', (await page.$$('#gallery .gcard')).length === 6);
await page.click('#gallery .btn.pink', { force: true });
// play then back to the title from pause
await page.waitForTimeout(500);
await page.evaluate(() => { window.UNISALTA.save.set('unicornName', 'Sophie'); });
await page.click('#title .play button', { force: true });
await page.click('.modebtn.mint', { force: true });
await page.waitForFunction(() => window.UNISALTA.ui.state === 'run', null, { timeout: 20000 });
await page.waitForTimeout(800);
await page.evaluate(() => window.UNISALTA.bus.emit('pause_request'));
await page.waitForSelector('#pause .btn.dark:last-child', { timeout: 5000 });
await page.click('#pause .btn.dark:last-child', { force: true });
await page.waitForFunction(() => window.UNISALTA.ui.state === 'title' && window.UNISALTA.game.scene.isActive('Title'), null, { timeout: 15000 });
check('pause menu goes back to the title', true);
console.log('console errors:', JSON.stringify(errors.slice(0, 4)));
if (errors.length) fails++;
await browser.close(); s.stop(); process.exit(fails ? 1 : 0);
