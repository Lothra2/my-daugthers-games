// End to end checks of the rules in the real browser build: rescue after a gap, game over, restart, pause, powers.
import { launch, startServer } from './helpers.mjs';
const s = await startServer(9600 + Math.floor(Math.random() * 100));
const { browser, page, errors } = await launch({ width: 932, height: 430, dpr: 1 });
let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'OK ' : 'BAD'} ${name} ${extra}`); if (!ok) fails++; };
const simState = () => page.evaluate(() => { const g = window.UNISALTA.game.scene.getScene('Game'); const s = g.sim; return { lives: s.lives, over: s.over, dying: s.dying, rescue: !!s.rescue, x: Math.round(s.x), y: Math.round(s.p.y), world: s.world, ui: window.UNISALTA.ui.state, power: s.power && s.power.kind, paused: g.paused, tick: s.tick, score: s.score }; });
const go = async (q) => { await page.goto(`${s.url}/index.html?skipTitle&nosw&${q}`); await page.waitForFunction(() => window.UNISALTA?.game?.scene.isActive('Game') && window.UNISALTA.game.scene.getScene('Game').introT > 1, null, { timeout: 30000 }); };

// 1. falling into a gap costs a heart, a cloud carries the unicorn, the run continues
await go('chunk=gap_small_01&world=2&seed=2');
await page.waitForFunction(() => window.UNISALTA.game.scene.getScene('Game').sim.rescue, null, { timeout: 30000 });
let st = await simState();
check('gap fall starts the rescue cloud', st.rescue && st.lives === 2, JSON.stringify(st));
await page.waitForFunction(() => !window.UNISALTA.game.scene.getScene('Game').sim.rescue, null, { timeout: 15000 });
await page.waitForTimeout(1800);
const st2 = await simState();
check('run continues after the rescue', !st2.over && st2.x > st.x + 200 && st2.lives === 2, JSON.stringify(st2));

// 2. pause freezes the simulation, resume continues
await page.evaluate(() => window.UNISALTA.bus.emit('pause_request'));
await page.waitForTimeout(300);
const a = await simState(); await page.waitForTimeout(600); const b = await simState();
check('pause freezes the sim', a.paused && a.tick === b.tick && a.ui === 'paused', `${a.tick} -> ${b.tick}`);
await page.evaluate(() => window.UNISALTA.ui.resume());
await page.waitForTimeout(500);
const c2 = await simState();
check('resume continues', !c2.paused && c2.tick > b.tick);

// 3. three lives lost ends the run, results show, replay starts a fresh run
await go('seed=3&world=1');
await page.evaluate(() => { const g = window.UNISALTA.game.scene.getScene('Game'); g.sim.lives = 1; g.sim.power = null; });
await page.waitForFunction(() => window.UNISALTA.ui.state === 'over', null, { timeout: 60000 });
check('game over shows the results screen', true);
const shown = await page.evaluate(() => !!document.querySelector('#results .big'));
check('results panel exists', shown);
await page.click('#results .btn.big', { force: true });
await page.waitForFunction(() => window.UNISALTA.ui.state === 'run', null, { timeout: 15000 });
await page.waitForTimeout(1500);
const st3 = await simState();
check('replay starts a fresh run with 3 hearts', st3.lives === 3 && st3.score < 100, JSON.stringify(st3));

// 4. easy mode never ends
await go('seed=3&mode=easy');
await page.waitForTimeout(25000);
const st4 = await simState();
check('easy mode survives doing nothing', !st4.over && st4.lives === 3, JSON.stringify(st4));

// 5. powers
for (const pk of ['fast', 'slow', 'inv']) {
  await go(`seed=8&power=${pk}`);
  await page.waitForTimeout(1200);
  const sp = await simState();
  check(`power ${pk} active`, sp.power === pk);
}
console.log('console errors:', JSON.stringify(errors.slice(0, 4)));
if (errors.length) fails++;
await browser.close(); s.stop();
process.exit(fails ? 1 : 0);
