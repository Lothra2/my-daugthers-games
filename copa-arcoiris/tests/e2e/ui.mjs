// Menus and screens like a player would use them: settings that persist, records, wardrobe, pause menu (resume / restart / quit),
// "Otra copa" twice in a row (clean restart). Saves screenshots in docs/qa/shots/ui_*.png
import { startPreview, launch, openGame } from './lib.mjs';
const srv = await startPreview();
const b = await launch();
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const seed = (s) => { try { if (!localStorage.getItem('copa-arcoiris/save')) localStorage.setItem('copa-arcoiris/save', JSON.stringify(s)); } catch {} };
const SAVE = { version: 1, characters: { sophie: { xp: 300, outfit: 'arcoiris' }, alana: { xp: 460 }, papa: { xp: 100 } }, medals: { sophie: { race: 'oro', arena: 'bronce' } },
  records: { raceBestMs: 61200, circuitBest: 31, pinataBest: 22, arenaBest: 4, cupsWon: 3 }, stats: { warmupDone: false } };
const save = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('copa-arcoiris/save')));
const shot = (page, n) => page.screenshot({ path: `docs/qa/shots/ui_${n}.png` });

// ---- menus, settings, records, wardrobe
{
  const { ctx, page, errors } = await openGame(b, srv.url, '', { viewport: { width: 1280, height: 720 } }, seed, SAVE);
  await page.waitForFunction(() => window.__copa?.ready);
  await page.click('#go', { force: true }); await page.waitForSelector('[data-a=settings]');
  await page.click('[data-a=settings]'); await page.waitForSelector('#mus'); await shot(page, 'settings');
  await page.$eval('#mus', (e) => { e.value = '30'; e.dispatchEvent(new Event('input')); });
  await page.$eval('#sfx', (e) => { e.value = '55'; e.dispatchEvent(new Event('input')); });
  await page.click('#mute', { force: true }); await page.click('[data-d=campeon]'); await page.click('[data-t=off]');
  let s = await save(page);
  ok(s.settings.music === 0.3 && s.settings.sfx === 0.55 && s.settings.muted === true && s.settings.difficulty === 'campeon' && s.settings.touchControls === 'off', 'settings are saved: ' + JSON.stringify(s.settings));
  await page.click('#back'); await page.waitForSelector('[data-a=records]');
  await page.click('[data-a=records]'); await page.waitForSelector('.recs'); await shot(page, 'records');
  const txt = await page.textContent('.recs');
  ok(txt.includes('1:01') && txt.includes('31') && txt.includes('22') && /3/.test(txt), 'records screen shows the saved records: ' + txt.replace(/\s+/g, ' ').slice(0, 90));
  await page.click('#back'); await page.click('[data-a=wardrobe]'); await page.waitForSelector('.wrow'); await shot(page, 'wardrobe');
  const locked = await page.$$eval('.chip-o.lock', (x) => x.length);
  ok(locked > 0, `wardrobe locks outfits above the level (${locked} locked chips)`);
  await page.click('.chip-o[data-c=sophie][data-o=estrellas]:not(.lock)').catch(() => {});
  await page.click('.chip-o[data-c=alana][data-o=arcoiris]');
  s = await save(page);
  ok(s.characters.alana.outfit === 'arcoiris', 'wardrobe: Alana wears the unlocked outfit and it is saved');
  ok(s.characters.sophie.level >= 3 && s.characters.papa.level === 2, `levels follow XP (sophie ${s.characters.sophie.level}, papa ${s.characters.papa.level})`);
  ok(errors.length === 0, 'no console errors in menus ' + errors.slice(0, 3));
  // reload keeps everything
  await page.reload(); await page.waitForFunction(() => window.__copa?.ready);
  s = await save(page);
  ok(s.settings.music === 0.3 && s.characters.alana.outfit === 'arcoiris', 'progress survives a reload');
  await ctx.close();
}

// ---- pause menu: resume, restart, quit
{
  const { ctx, page, errors } = await openGame(b, srv.url, 'autostart=event&event=pinata&players=1&chars=sophie,papa,mama,thor&seed=3&skipIntro&ff=1', { viewport: { width: 1280, height: 720 } }, seed, { version: 1, stats: { warmupDone: true } });
  await page.waitForFunction(() => window.__copa?.ready);
  const t = () => page.evaluate(() => window.__copa.game.scene.getScene('Event').world.eventT);
  await page.waitForFunction(() => window.__copa.game.scene.getScene('Event')?.world?.eventT > 3, null, { timeout: 30000 });
  await page.keyboard.press('Escape'); await page.waitForSelector('#resume'); await shot(page, 'pause');
  const t1 = await t(); await page.waitForTimeout(800); const t2 = await t();
  ok(Math.abs(t2 - t1) < 0.05, `the simulation is frozen while paused (${t1.toFixed(2)} -> ${t2.toFixed(2)})`);
  await page.click('#resume'); await page.waitForTimeout(800);
  ok((await t()) > t2 + 0.4, 'resume continues the event');
  await page.keyboard.press('Escape'); await page.waitForSelector('#restart'); await page.click('#restart');
  await page.waitForFunction(() => window.__copa.game.scene.getScene('Event')?.world?.eventT < 1.5, null, { timeout: 10000 });
  ok(true, 'restart starts the event again from zero');
  await page.keyboard.press('Escape'); await page.waitForSelector('#quit'); await page.click('#quit');
  await page.waitForSelector('[data-a=cup]', { timeout: 10000 });
  ok(true, 'quit goes back to the menu');
  ok(errors.length === 0, 'no console errors in pause menu ' + errors.slice(0, 3));
  await ctx.close();
}

// ---- phone held sideways (iPhone-like): pause with a finger, full screen help, every screen fits
{
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  const init = (s) => { delete Element.prototype.requestFullscreen; delete Element.prototype.webkitRequestFullscreen; try { localStorage.setItem('copa-arcoiris/save', JSON.stringify(s)); } catch {} };
  const { ctx, page, errors } = await openGame(b, srv.url, '', { viewport: { width: 667, height: 375 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: ua }, init, { version: 1, stats: { warmupDone: true } });
  await page.waitForFunction(() => window.__copa?.ready);
  await page.tap('[data-fs]'); await page.waitForSelector('#fs-help');
  ok((await page.textContent('#fs-help')).includes('Añadir a pantalla de inicio'), 'iPhone: the full screen button explains how to install the game');
  await page.tap('#fs-close'); await page.tap('#go', { force: true }); await page.waitForSelector('[data-a=cup]');
  const fits = async (sel) => page.evaluate((q) => { const r = document.querySelector(q).getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; }, sel);
  ok(await fits('.menu-btns') && await fits('.menu .logo'), 'iPhone 667x375: logo and the five menu buttons fit');
  await page.tap('[data-a=cup]'); await page.tap('[data-n="1"]'); await page.waitForSelector('[data-c=sophie]');
  ok(await page.$$eval('.card', (cs) => cs.every((c) => { const r = c.getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth; })), 'iPhone 667x375: the five character cards fit');
  await page.tap('[data-c=sophie]'); await page.tap('#ok'); await page.tap('#go', { force: true });
  await page.waitForFunction(() => window.__copa.game.scene.getScene('Event')?.world?.phase === 'play', null, { timeout: 30000 });
  await page.tap('.hud-pause'); await page.waitForSelector('#resume');
  ok(await fits('.pause'), 'iPhone: the pause button works with a finger and the pause menu fits');
  const t1 = await page.evaluate(() => window.__copa.game.scene.getScene('Event').world.eventT); await page.waitForTimeout(500);
  ok(Math.abs((await page.evaluate(() => window.__copa.game.scene.getScene('Event').world.eventT)) - t1) < 0.05, 'the game is frozen while paused');
  await page.tap('#resume');
  ok(errors.length === 0, 'no console errors on the phone ' + errors.slice(0, 3));
  await ctx.close();
}
console.log(fails ? `${fails} FAILED` : 'ALL OK');
await b.close(); srv.stop();
process.exit(fails ? 1 : 0);
