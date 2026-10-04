// Real input tests: keyboard 1P and 2P, multitouch (CDP touch events), simulated gamepad, pause, focus loss, resize, corrupt save.
import { startPreview, launch, openGame } from './lib.mjs';
const srv = await startPreview();
const b = await launch();
const results = [];
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); console.log(cond ? 'PASS' : 'FAIL', name, extra); };
const world = (page) => page.evaluate(() => { const w = window.__copa.game.scene.getScene('Event').world; return { t: w.eventT, phase: w.phase, a: w.actors.map((a) => ({ id: a.id, x: a.x, y: a.y, z: a.z, st: a.state, power: a.power, carrying: a.carrying, face: a.facing })) }; });
const open = async (query, opts = {}, save = { version: 1, stats: { warmupDone: true }, settings: opts.settings }) => {
  const r = await openGame(b, srv.url, query, { viewport: { width: 1280, height: 720 }, ...(opts.ctx || {}) },
    (s) => { try { localStorage.setItem('copa-arcoiris/save', JSON.stringify(s)); } catch {} }, save);
  await r.page.waitForFunction(() => window.__copa && window.__copa.ready);
  await r.page.waitForFunction(() => window.__copa.game.scene.isActive('Event') && window.__copa.game.scene.getScene('Event').world?.phase === 'play', null, { timeout: 15000 });
  return r;
};
const EV = 'autostart=event&event=race&seed=3&skipIntro';

// 1. keyboard, one player
{
  const { page, errors } = await open(`${EV}&players=1&chars=sophie,papa,mama,thor`);
  const w0 = await world(page);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(900); await page.keyboard.up('KeyD');
  const w1 = await world(page);
  ok('teclado 1P: D mueve a Sophie a la derecha', w1.a[0].x > w0.a[0].x + 40, `${Math.round(w0.a[0].x)} -> ${Math.round(w1.a[0].x)}`);
  await page.keyboard.down('KeyS'); await page.waitForTimeout(400); await page.keyboard.up('KeyS');
  const w2 = await world(page);
  ok('teclado 1P: S mueve en profundidad (Y)', w2.a[0].y > w1.a[0].y + 5);
  let maxZ = 0; await page.keyboard.down('Space');
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(40); maxZ = Math.max(maxZ, (await world(page)).a[0].z); }
  await page.keyboard.up('Space');
  ok('teclado 1P: Espacio salta', maxZ > 25, `z max ${maxZ.toFixed(1)}`);
  // Esc pauses
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const tp = (await world(page)).t; await page.waitForTimeout(600);
  const tq = (await world(page)).t;
  ok('pausa con Esc congela el tiempo y muestra el menu', Math.abs(tq - tp) < 0.01 && (await page.locator('#resume').count()) === 1, `t ${tp.toFixed(2)} ${tq.toFixed(2)}`);
  await page.screenshot({ path: 'docs/qa/shots/input_pause.png' });
  await page.click('#resume'); await page.waitForTimeout(500);
  ok('seguir jugando reanuda', (await world(page)).t > tq + 0.2);
  ok('sin errores de consola (teclado 1P)', errors.length === 0, errors.join('|'));
  await page.context().close();
}

// 2. keyboard, two players on one keyboard
{
  const { page, errors } = await open(`${EV}&players=2&chars=sophie,alana,papa,mama`);
  const w0 = await world(page);
  await page.keyboard.down('KeyD'); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(700);
  const w1 = await world(page);
  await page.keyboard.up('KeyD'); await page.keyboard.up('ArrowLeft');
  ok('teclado 2P: J1 va a la derecha y J2 a la izquierda a la vez', w1.a[0].x > w0.a[0].x + 20 && w1.a[1].x < w0.a[1].x - 5, `P1 ${Math.round(w1.a[0].x - w0.a[0].x)} P2 ${Math.round(w1.a[1].x - w0.a[1].x)}`);
  let z0 = 0, z1 = 0; await page.keyboard.down('KeyF'); await page.keyboard.down('Comma');
  for (let i = 0; i < 10; i++) { await page.waitForTimeout(40); const w = await world(page); z0 = Math.max(z0, w.a[0].z); z1 = Math.max(z1, w.a[1].z); }
  await page.keyboard.up('KeyF'); await page.keyboard.up('Comma');
  ok('teclado 2P: F y coma saltan a la vez', z0 > 20 && z1 > 20, `${z0.toFixed(0)} ${z1.toFixed(0)}`);
  await page.screenshot({ path: 'docs/qa/shots/input_2p_kb.png' });
  ok('sin errores de consola (teclado 2P)', errors.length === 0, errors.join('|'));
  await page.context().close();
}

// 3. multitouch 1P: one thumb steers while another presses jump
{
  const { page, errors, ctx } = await open(`${EV}&players=1&chars=sophie,papa,mama,thor`, { ctx: { hasTouch: true, viewport: { width: 1280, height: 720 } }, settings: { touchControls: 'on' } });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await page.waitForTimeout(400);
  const vis = await page.evaluate(() => getComputedStyle(document.getElementById('touch')).display);
  ok('controles tactiles visibles con ajuste Si', vis === 'block');
  const jb = await page.locator('.tbtn.jump').boundingBox();
  const w0 = await world(page);
  await touch('touchStart', [{ x: 160, y: 520, id: 1 }]);
  await touch('touchMove', [{ x: 215, y: 520, id: 1 }]);
  await page.waitForTimeout(500);
  const w1 = await world(page);
  ok('multitouch: un dedo en el joystick mueve al personaje', w1.a[0].x > w0.a[0].x + 20, `${Math.round(w0.a[0].x)} -> ${Math.round(w1.a[0].x)}`);
  // second finger presses jump while the first keeps the stick
  let zmax = 0;
  await touch('touchStart', [{ x: 215, y: 520, id: 1 }, { x: jb.x + jb.width / 2, y: jb.y + jb.height / 2, id: 2 }]);
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(40); const w = await world(page); zmax = Math.max(zmax, w.a[0].z); }
  const w2 = await world(page);
  ok('multitouch: saltar con el segundo dedo mientras el primero sigue moviendo', zmax > 20 && w2.a[0].x > w1.a[0].x + 10, `z ${zmax.toFixed(0)} dx ${Math.round(w2.a[0].x - w1.a[0].x)}`);
  const fingers = await page.evaluate(() => window.__copa.touch.active);
  ok('el joystick y el boton cuentan como 2 dedos activos', fingers === 2, String(fingers));
  await page.screenshot({ path: 'docs/qa/shots/input_touch_1p.png' });
  await touch('touchEnd', []);
  await page.waitForTimeout(300);
  ok('al soltar todo, no queda ningun dedo ni entrada pegada', (await page.evaluate(() => window.__copa.touch.active)) === 0);
  ok('sin errores de consola (touch 1P)', errors.length === 0, errors.join('|'));
  await ctx.close();
}

// 4. multitouch 2P on one tablet: four fingers at once, each half belongs to one player
{
  const { page, errors, ctx } = await open(`${EV}&players=2&chars=sophie,alana,papa,mama`, { ctx: { hasTouch: true, viewport: { width: 1180, height: 820 } }, settings: { touchControls: 'on' } });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await page.waitForTimeout(400);
  const j1 = await page.locator('.tslot.s0 .tbtn.jump').boundingBox();
  const j2 = await page.locator('.tslot.s1 .tbtn.jump').boundingBox();
  const w0 = await world(page);
  // P1 stick at x=120 (left half), P2 stick at x=700 (right half), both jump buttons
  await touch('touchStart', [{ x: 120, y: 560, id: 1 }, { x: 700, y: 560, id: 2 }]);
  await touch('touchMove', [{ x: 170, y: 560, id: 1 }, { x: 650, y: 560, id: 2 }]);
  await page.waitForTimeout(450);
  const w1 = await world(page);
  ok('2P tactil: cada mitad mueve a su jugador (J1 derecha, J2 izquierda)', w1.a[0].x > w0.a[0].x + 15 && w1.a[1].x < w0.a[1].x - 5, `P1 ${Math.round(w1.a[0].x - w0.a[0].x)} P2 ${Math.round(w1.a[1].x - w0.a[1].x)}`);
  let z0 = 0, z1 = 0;
  await touch('touchStart', [{ x: 170, y: 560, id: 1 }, { x: 650, y: 560, id: 2 }, { x: j1.x + j1.width / 2, y: j1.y + j1.height / 2, id: 3 }, { x: j2.x + j2.width / 2, y: j2.y + j2.height / 2, id: 4 }]);
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(40); const w = await world(page); z0 = Math.max(z0, w.a[0].z); z1 = Math.max(z1, w.a[1].z); }
  const fingers = await page.evaluate(() => window.__copa.touch.active);
  ok('2P tactil: 4 dedos a la vez, ambos saltan', fingers === 4 && z0 > 20 && z1 > 20, `dedos ${fingers} z ${z0.toFixed(0)} ${z1.toFixed(0)}`);
  await page.screenshot({ path: 'docs/qa/shots/input_touch_2p.png' });
  await touch('touchEnd', []);
  ok('sin errores de consola (touch 2P)', errors.length === 0, errors.join('|'));
  await ctx.close();
}

// 5. simulated gamepad
{
  const { page, errors } = await open(`${EV}&players=1&chars=sophie,papa,mama,thor`);
  const w0 = await world(page);
  await page.evaluate(() => { window.__mockPads = [{ axes: [1, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) }]; });
  await page.waitForTimeout(800);
  const w1 = await world(page);
  ok('mando (SIMULADO): stick a la derecha mueve', w1.a[0].x > w0.a[0].x + 30, `${Math.round(w0.a[0].x)} -> ${Math.round(w1.a[0].x)}`);
  await page.evaluate(() => { const p = window.__mockPads[0]; p.buttons[0] = { pressed: true }; });
  let zmax = 0; for (let i = 0; i < 10; i++) { await page.waitForTimeout(40); zmax = Math.max(zmax, (await world(page)).a[0].z); }
  ok('mando (SIMULADO): boton A salta', zmax > 20, zmax.toFixed(0));
  await page.evaluate(() => { window.__mockPads = [null]; });
  await page.waitForTimeout(500);
  ok('mando (SIMULADO): al desconectarse el juego pausa y avisa', (await page.locator('#resume').count()) === 1 && (await page.locator('.toast').count()) >= 1);
  ok('sin errores de consola (mando)', errors.length === 0, errors.join('|'));
  await page.context().close();
}

// 6. focus loss and tab change pause the game and release keys
{
  const { page, errors } = await open(`${EV}&players=1&chars=sophie,papa,mama,thor`);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(300);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(300);
  ok('cambio de pestana: pausa', await page.evaluate(() => window.__copa.app.isPaused));
  await page.keyboard.up('KeyD');
  const t0 = (await world(page)).t; await page.waitForTimeout(500);
  ok('en pausa por foco el tiempo no corre', Math.abs((await world(page)).t - t0) < 0.01);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); });
  await page.click('#resume'); await page.waitForTimeout(300);
  const before = (await world(page)).a[0].x; await page.waitForTimeout(600);
  ok('al volver no queda ninguna tecla pegada', Math.abs((await world(page)).a[0].x - before) < 5, `${Math.round(before)} -> ${Math.round((await world(page)).a[0].x)}`);
  ok('sin errores de consola (foco)', errors.length === 0, errors.join('|'));
  await page.context().close();
}

// 7. window sizes keep the integer scale and fit the screen
{
  for (const [w, h, dpr] of [[1920, 1080, 1], [1280, 720, 1], [1024, 768, 2], [844, 390, 3], [2048, 1536, 1]]) {
    const { page, errors, ctx } = await open(`${EV}&players=1&chars=sophie,papa,mama,thor`, { ctx: { viewport: { width: w, height: h }, deviceScaleFactor: dpr } });
    const info = await page.evaluate(() => { const c = document.querySelector('canvas'); const g = window.__copa.game; const r = c.getBoundingClientRect(); return { cw: c.width, ch: c.height, cssW: r.width, cssH: r.height, ow: document.documentElement.scrollWidth, iw: innerWidth, dpr: devicePixelRatio, lw: g.scale.width, lh: g.scale.height }; });
    const scale = (info.cssW * info.dpr) / info.lw;
    ok(`tamano ${w}x${h}@${dpr}: escala entera ${scale} y sin scroll horizontal`, Number.isInteger(Math.round(scale * 1000) / 1000) && Math.abs(scale - Math.round(scale)) < 1e-6 && info.ow <= info.iw + 1 && info.cssW <= w + 1 && info.cssH <= h + 1, `${info.lw}x${info.lh} x${scale}`);
    await page.screenshot({ path: `docs/qa/shots/size_${w}x${h}.png` });
    if (errors.length) ok(`sin errores en ${w}x${h}`, false, errors.join('|'));
    await ctx.close();
  }
}

// 8. resize while playing
{
  const { page, errors } = await open(`${EV}&players=1&chars=sophie,papa,mama,thor`);
  await page.setViewportSize({ width: 1000, height: 600 }); await page.waitForTimeout(500);
  await page.setViewportSize({ width: 1600, height: 900 }); await page.waitForTimeout(500);
  const ph = await page.evaluate(() => { const g = window.__copa.game; const c = g.canvas.getBoundingClientRect(); return { lw: g.scale.width, cssW: c.width, dpr: devicePixelRatio, phase: g.scene.getScene('Event').world.phase }; });
  ok('cambiar el tamano en juego conserva la escala entera y la partida', Math.abs(ph.cssW / ph.lw - Math.round(ph.cssW / ph.lw)) < 1e-6 && ph.phase === 'play', JSON.stringify(ph));
  ok('sin errores de consola (resize)', errors.length === 0, errors.join('|'));
  await page.context().close();
}

// 9. corrupt save: the game still starts and keeps a backup
{
  const r = await openGame(b, srv.url, '', { viewport: { width: 1280, height: 720 } });
  await r.page.evaluate(() => localStorage.setItem('copa-arcoiris/save', '{esto no es json'));
  await r.page.reload(); await r.page.waitForFunction(() => window.__copa && window.__copa.ready);
  await r.page.waitForSelector('#go');
  const st = await r.page.evaluate(() => ({ status: window.__copa.store.status, bak: Object.keys(localStorage).some((k) => k.includes('.bak-')), toast: document.querySelectorAll('.toast').length }));
  ok('guardado corrupto: se juega, se guarda copia y se avisa', st.status === 'recovered' && st.bak && st.toast >= 1, JSON.stringify(st));
  await r.page.screenshot({ path: 'docs/qa/shots/save_corrupt.png' });
  await r.ctx.close();
}

await b.close(); srv.stop();
const fails = results.filter((r) => r[0] === 'FAIL');
console.log(`\n${results.length - fails.length}/${results.length} pruebas e2e de entrada pasan`);
if (fails.length) process.exit(1);
