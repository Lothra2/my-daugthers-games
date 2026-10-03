// DOM user interface (title, menus, HUD, results) animated with Motion.
import { CFG } from '../core/config.js';

const MOTION_URL = 'https://cdn.jsdelivr.net/npm/motion@14.0.0/+esm';
let M = null;
try { M = await import(MOTION_URL); } catch (e) { try { M = await import('../vendor/motion.js'); } catch (e2) { M = null; } }

const SPRING = { type: 'spring', stiffness: 420, damping: 20 };
const SOFT = { type: 'spring', stiffness: 220, damping: 26 };
const BOUNCY = { type: 'spring', stiffness: 380, damping: 13 };
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

function anim(target, keyframes, opts = {}) {
  if (!M || reduced()) {
    // jump to the end state
    const els = target instanceof Element ? [target] : Array.from(target || []);
    for (const el of els) for (const k of Object.keys(keyframes)) { const v = keyframes[k]; const last = Array.isArray(v) ? v[v.length - 1] : v; try { el.style[k] = typeof last === 'number' && k === 'opacity' ? String(last) : last; } catch (e) { /* ignore */ } }
    return { finished: Promise.resolve(), stop() {} };
  }
  const a = M.animate(target, keyframes, opts);
  return a;
}
const done = (a) => (a && a.finished ? a.finished.catch(() => {}) : Promise.resolve());
const stag = (s) => (M ? M.stagger(s) : 0);

export function h(tag, attrs = {}, kids = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of [].concat(kids)) if (c != null) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

const icon = (n, w = 22) => h('img', { class: 'icon', src: `assets/ui/icon_${n}.png`, alt: '', style: `width:calc(var(--px)*${w}px);height:auto` });

export function createUI(app) {
  const root = document.getElementById('ui');
  const t = (k, v) => app.i18n.t(k, v);
  const ui = { state: 'boot' };
  app.ui = ui;
  app.inputBlocked = () => ui.state !== 'run';
  const sfx = (name) => app.bus.emit('sfx', { name });
  let lastWorldBadge = 0;
  let startWorld = 1;
  let currentMode = app.save.settings.lastMode || 'normal';
  let hudBuilt = false;
  const screens = {};

  // ------------------------------------------------------------------ helpers
  function button(label, onClick, cls = '') {
    const b = h('button', { class: `btn pxwrap ${cls}`, type: 'button' }, [h('span', { class: 'face' }, label)]);
    b.addEventListener('pointerenter', () => sfx('ui_hover'));
    b.addEventListener('pointerdown', () => { anim(b, { transform: 'scale(0.92)' }, { duration: 0.06 }); });
    const up = () => anim(b, { transform: 'scale(1)' }, SPRING);
    b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    b.addEventListener('click', (e) => { e.stopPropagation(); sfx('ui_press'); app.bus.emit('ui_gesture'); onClick(e); });
    return b;
  }
  function screen(id, kids, extra = '') {
    const s = h('div', { class: `screen ${extra}`, id }, kids);
    root.append(s);
    screens[id] = s;
    return s;
  }
  function panel(kids, w) {
    return h('div', { class: 'pxwrap panel' }, [h('div', { class: 'face panelface' }, [h('div', { class: 'inner' }, kids)])]);
  }
  async function enter(el, delay = 0) {
    el.classList.remove('hidden');
    anim(el, { opacity: [0, 1], transform: ['translateY(18px) scale(0.96)', 'translateY(0px) scale(1)'] }, { ...SPRING, delay });
  }
  async function leave(el) {
    await done(anim(el, { opacity: 0, transform: 'translateY(10px) scale(0.97)' }, { duration: 0.16 }));
    el.classList.add('hidden');
  }
  function hideAll(except) { for (const [id, s] of Object.entries(screens)) if (id !== except) s.classList.add('hidden'); }
  function lockedFullscreen() {
    const el = document.documentElement;
    try { (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el).then?.(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* no lock */ } }).catch(() => {}); } catch (e) { /* unsupported */ }
  }
  function clearTree(id) { const s = screens[id]; if (s) { s.remove(); delete screens[id]; } }

  // ------------------------------------------------------------------ title
  let typeTimer = null;
  function showTitle() {
    ui.state = 'title';
    hideAll();
    clearTree('title');
    const name = app.save.settings.unicornName;
    const l1 = h('div', { class: 'l1' }), l2 = h('div', { class: 'l2' }), dots = h('div', { class: 'dots' });
    for (let i = 0; i < 3; i++) dots.append(h('span', { class: 'dot', text: '.' }));
    const lines = h('div', { class: 'lines' }, [l1, l2, dots]);
    const play = button(t('title.play'), () => openModes(), 'big play');
    const corner = h('div', { class: 'corner' }, [
      button(icon('trophy', 22), () => showScores(), 'small'),
      button(icon('gear', 22), () => showSettings('title'), 'small'),
      app.save.data.unlocks.gallery ? button(icon('frame', 24), () => showGallery(), 'small') : null,
      button(icon('expand', 20), lockedFullscreen, 'small'),
      button(app.i18n.lang === 'es' ? 'EN' : 'ES', () => { app.i18n.setLang(app.i18n.lang === 'es' ? 'en' : 'es'); app.save.set('lang', app.i18n.lang); document.getElementById('rotate-text').textContent = t('rotate'); showTitle(); }, 'small lav'),
    ]);
    const hello = name ? h('div', { class: 'hello', text: t('title.hello', { name }) }) : null;
    const credit = h('div', { class: 'credit', text: t('title.credit') });
    const tap = h('div', { class: 'tap', text: t('title.tap') });
    const el = screen('title', [lines, hello, h('div', { class: 'play' }, [play]), corner, credit, tap]);
    if (!app.audioUnlocked) {
      const unlock = () => { app.audioUnlocked = true; app.bus.emit('audio_unlock'); anim(tap, { opacity: 0 }, { duration: 0.2 }).finished?.then(() => tap.remove()); window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); };
      window.addEventListener('pointerdown', unlock, true); window.addEventListener('keydown', unlock, true);
      if (M && !reduced()) anim(tap, { opacity: [1, 0.35, 1] }, { duration: 1.4, repeat: Infinity });
    } else tap.remove();
    // typewriter
    clearInterval(typeTimer);
    const s1 = t('title.line1'), s2 = t('title.line2');
    let i = 0;
    const total = s1.length + s2.length;
    dots.style.opacity = '0';
    typeTimer = setInterval(() => {
      i++;
      if (i <= s1.length) l1.textContent = s1.slice(0, i); else if (i <= total) l2.textContent = s2.slice(0, i - s1.length);
      if (i % 2 === 0 && i <= total) sfx('typewriter');
      if (i > total) { clearInterval(typeTimer); dots.style.opacity = '1'; Array.from(dots.children).forEach((d, k) => anim(d, { transform: ['translateY(0px)', 'translateY(-10px)', 'translateY(0px)'] }, { duration: 0.9, repeat: Infinity, delay: k * 0.15 })); }
    }, 55);
    anim(play, { scale: [1, 1.045, 1] }, { duration: 1.3, repeat: Infinity, ease: 'easeInOut' });
    anim([hello, credit, corner].filter(Boolean), { opacity: [0, 1] }, { delay: stag(0.1), duration: 0.5 });
    anim(play, { opacity: [0, 1], transform: ['translateX(60px)', 'translateX(0px)'] }, { ...BOUNCY, delay: 0.3 });
    // sparkles that run around the button
    const sp = [];
    for (let k = 0; k < 3; k++) { const s = h('i', { class: 'spark' }); play.parentElement.append(s); sp.push(s); anim(s, { left: ['0%', '100%', '100%', '0%', '0%'], top: ['0%', '0%', '100%', '100%', '0%'], opacity: [1, 1, 1, 1, 1] }, { duration: 3.2, repeat: Infinity, ease: 'linear', delay: k * 1.07 }); }
    play.parentElement.style.position = 'absolute';
    app.bus.emit('title_ui');
  }

  // ------------------------------------------------------------------ mode select + name
  function openModes() {
    if (!ui.state.startsWith('title')) return;
    ui.state = 'title-mode';
    const best = app.save.data.stats.bestWorld;
    const row = h('div', { class: 'row' }, [
      h('button', { class: 'btn pxwrap modebtn mint', type: 'button', onclick: () => choose('easy') }, [h('span', { class: 'face' }, [icon('cloud', 40), h('span', { text: t('mode.easy') }), h('span', { class: 'sub', text: t('mode.easy.sub') })])]),
      h('button', { class: 'btn pxwrap modebtn pink', type: 'button', onclick: () => choose('normal') }, [h('span', { class: 'face' }, [icon('rainbow', 40), h('span', { text: t('mode.normal') }), h('span', { class: 'sub', text: t('mode.normal.sub') })])]),
    ]);
    for (const b of row.children) { b.addEventListener('pointerenter', () => sfx('ui_hover')); b.addEventListener('click', () => sfx('ui_press')); }
    startWorld = 1;
    const wr = h('div', { class: 'worldrow' }, [h('span', { class: 'lab', text: t('mode.start') })]);
    for (let w = 1; w <= 6; w++) {
      const c = button(String(w), () => { startWorld = w; Array.from(wr.querySelectorAll('.chip')).forEach((x, i) => x.classList.toggle('on', i + 1 === w)); }, `chip small ${w > best ? 'locked' : ''} ${w === 1 ? 'on' : ''}`);
      c.title = t('w' + w);
      wr.append(c);
    }
    const back = button('←', () => { clearTree('mode'); ui.state = 'title'; screens.title.classList.remove('hidden'); }, 'small dark');
    clearTree('mode');
    const el = screen('mode', [h('h2', { text: t('mode.title') }), row, best > 1 ? wr : null, back]);
    el.style.background = 'rgba(30,19,48,.35)';
    screens.title.classList.add('hidden');
    el.style.pointerEvents = 'auto';
    anim(row.children, { opacity: [0, 1], transform: ['scale(0.7)', 'scale(1)'] }, { ...BOUNCY, delay: stag(0.09) });
    sfx('start_game');
  }

  function choose(mode) {
    currentMode = mode;
    app.save.set('lastMode', mode);
    if (!app.save.settings.unicornName) openName(() => launch(mode)); else launch(mode);
  }

  function openName(next) {
    ui.state = 'title-name';
    const input = h('input', { type: 'text', maxlength: '12', placeholder: t('name.placeholder'), autocomplete: 'off', autocapitalize: 'words', id: 'name-input' });
    input.value = '';
    const ok = () => { const v = (input.value || '').trim().slice(0, 12) || t('name.placeholder'); app.save.set('unicornName', v); clearTree('name'); next(); };
    input.addEventListener('input', () => sfx('ui_hover'));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); e.stopPropagation(); });
    const ready = button(t('name.ready'), ok, 'big pink');
    clearTree('name');
    const el = screen('name', [panel([h('h2', { text: t('name.title') }), input, ready])]);
    el.style.background = 'rgba(30,19,48,.5)';
    screens.mode?.classList.add('hidden');
    enter(el.firstChild);
    setTimeout(() => { try { input.focus(); } catch (e) { /* ignore */ } }, 250);
  }

  // ------------------------------------------------------------------ launch (rainbow wipe)
  const wipe = h('div', { id: 'wipe' }, ['#FF4D5E', '#FF9A3C', '#FFE23A', '#5CD66A', '#4DA6FF', '#9D6BFF'].map((c, i) => { const b = h('i'); b.style.background = c; b.style.top = `${i * 16.67}%`; return b; }));
  root.append(wipe);
  async function cover() {
    wipe.style.display = 'block';
    sfx('wipe');
    await done(anim(wipe.children, { transform: ['translateX(-102%)', 'translateX(0%)'] }, { duration: 0.32, delay: stag(0.035), ease: 'easeIn' }));
  }
  async function uncover() {
    await done(anim(wipe.children, { transform: ['translateX(0%)', 'translateX(102%)'] }, { duration: 0.4, delay: stag(0.035), ease: 'easeOut' }));
    wipe.style.display = 'none';
  }

  async function launch(mode) {
    if (ui.state === 'launching') return;
    ui.state = 'launching';
    app.bus.emit('ui_play_out');
    await cover();
    clearTree('title'); clearTree('mode'); clearTree('name');
    hideAll();
    app.bus.emit('launch_game', { mode, world: startWorld, intro: true });
  }

  // ------------------------------------------------------------------ settings
  function showSettings(from) {
    const prev = ui.state;
    const resumeState = prev;
    ui.state = 'settings';
    clearTree('settings');
    const rows = [];
    const slider = (key, label) => {
      const s = h('input', { type: 'range', min: '0', max: '1', step: '0.05', class: 'slider', value: String(app.save.settings[key]) });
      s.addEventListener('input', () => { app.save.set(key, Number(s.value)); app.bus.emit('settings_changed'); });
      s.addEventListener('change', () => sfx('coin'));
      return h('div', { class: 'row' }, [h('span', { text: label }), s]);
    };
    const toggle = (key, label) => {
      const b = h('button', { class: `toggle ${app.save.settings[key] ? 'on' : ''}`, type: 'button' }, [h('i')]);
      b.addEventListener('click', () => { const v = !app.save.settings[key]; app.save.set(key, v); b.classList.toggle('on', v); sfx('ui_press'); app.bus.emit('settings_changed'); });
      return h('div', { class: 'row' }, [h('span', { text: label }), b]);
    };
    const nameIn = h('input', { type: 'text', maxlength: '12', value: app.save.settings.unicornName || '', class: 'slider', style: 'width:calc(var(--px)*130px);text-align:center;background:#FFF4DC;color:#1E1330;height:calc(var(--px)*24px)' });
    nameIn.addEventListener('input', () => app.save.set('unicornName', nameIn.value.slice(0, 12)));
    nameIn.addEventListener('keydown', (e) => e.stopPropagation());
    const lang = h('div', { class: 'seg' }, [button('ES', () => setLang('es'), `small ${app.i18n.lang === 'es' ? '' : 'dark'}`), button('EN', () => setLang('en'), `small ${app.i18n.lang === 'en' ? '' : 'dark'}`)]);
    const setLang = (l) => { app.i18n.setLang(l); app.save.set('lang', l); document.getElementById('rotate-text').textContent = t('rotate'); showSettings(from); };
    let resetT = null;
    const reset = button(t('settings.reset'), () => {}, 'small dark');
    reset.addEventListener('pointerdown', () => { resetT = setTimeout(() => { app.save.reset(); sfx('hit'); reset.firstChild.textContent = '✓'; }, 2000); });
    const stopReset = () => clearTimeout(resetT);
    reset.addEventListener('pointerup', stopReset); reset.addEventListener('pointerleave', stopReset);
    const back = button(t('settings.back'), () => closeSettings(from, resumeState), 'pink');
    const el = screen('settings', [h('div', { class: 'dim' }), panel([h('h2', { text: t('settings.title') }), h('div', { class: 'stack' }, [
      h('div', { class: 'row' }, [h('span', { text: t('settings.name') }), nameIn]),
      slider('music', t('settings.music')), slider('sfx', t('settings.sfx')),
      h('div', { class: 'row' }, [h('span', { text: t('settings.lang') }), lang]),
      toggle('reduceShake', t('settings.shake')), toggle('reduceFlash', t('settings.flash')), toggle('touchHints', t('settings.hints')),
      reset, back])])]);
    screens.title?.classList.add('hidden'); screens.pause?.classList.add('hidden');
    enter(el.lastChild);
  }
  function closeSettings(from, resumeState) {
    clearTree('settings');
    ui.state = resumeState && resumeState !== 'settings' ? resumeState : (from === 'pause' ? 'paused' : 'title');
    if (from === 'pause') { screens.pause?.classList.remove('hidden'); ui.state = 'paused'; } else { showTitle(); }
  }

  // ------------------------------------------------------------------ scores + gallery
  function showScores() {
    ui.state = 'title-scores';
    clearTree('scores');
    const tab = (mode) => {
      const list = app.save.data.highScores[mode] || [];
      if (!list.length) return h('div', { class: 'row', text: t('scores.empty') });
      return h('table', { class: 'table' }, list.map((r, i) => h('tr', {}, [h('td', { text: `${i + 1}.` }), h('td', { text: String(r.score) }), h('td', { text: `${r.meters} m` }), h('td', { text: `${t('over.world')} ${r.world}` })])));
    };
    const body = h('div', { class: 'stack' }, [h('div', { class: 'row' }, [icon('rainbow', 24), t('scores.normal')]), tab('normal'), h('div', { class: 'row' }, [icon('cloud', 24), t('scores.easy')]), tab('easy')]);
    const el = screen('scores', [h('div', { class: 'dim' }), panel([h('h2', { text: t('scores.title') }), body, button(t('settings.back'), () => { clearTree('scores'); ui.state = 'title'; }, 'pink')])]);
    enter(el.lastChild);
    anim(body.querySelectorAll('tr'), { opacity: [0, 1], transform: ['translateX(-20px)', 'translateX(0px)'] }, { delay: stag(0.06), duration: 0.3 });
  }

  function showGallery() {
    ui.state = 'title-gallery';
    clearTree('gallery');
    const items = [
      ['ref_unicorn.png', 'assets/sprites/unicorn_title_fly.png', 'Uni'], ['ref_slime_flat.png', 'assets/sprites/slime_flat_idle.png', 'Slime'], ['ref_snake_hanging.png', 'assets/sprites/snake_hang_sway.png', 'Snake'],
      ['ref_candy_yellow_lollipop.png', 'assets/sprites/candy_yellow.png', t('hud.fast')], ['ref_candy_green.png', 'assets/sprites/candy_green.png', t('hud.slow')], ['ref_candy_red.png', 'assets/sprites/candy_red.png', t('hud.inv')],
    ];
    const cards = items.map(([ref, game, cap]) => {
      const front = h('div', { class: 'f' }, [h('img', { src: 'reference/' + ref, alt: cap })]);
      const back = h('div', { class: 'b' }, [h('div', { class: 'gimg', style: `width:80%;aspect-ratio:1;background:url(${game}) 0 0/auto 100% no-repeat;image-rendering:pixelated` })]);
      const inner = h('div', { class: 'in' }, [front, back]);
      const card = h('div', { class: 'gcard' }, [inner, h('div', { class: 'cap', text: cap })]);
      let flipped = false;
      card.addEventListener('click', () => { flipped = !flipped; sfx('ui_press'); anim(inner, { transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }, SOFT); });
      return card;
    });
    const el = screen('gallery', [h('div', { class: 'dim' }), panel([h('h2', { text: t('gallery.title') }), h('div', { class: 'row', style: 'justify-content:center', text: t('gallery.sub') }), h('div', { class: 'gallery' }, cards), button(t('settings.back'), () => { clearTree('gallery'); ui.state = 'title'; }, 'pink')])]);
    enter(el.lastChild);
    anim(cards, { opacity: [0, 1], transform: ['scale(0.6) rotate(-6deg)', 'scale(1) rotate(0deg)'] }, { ...BOUNCY, delay: stag(0.07) });
  }

  // ------------------------------------------------------------------ HUD
  const hud = { };
  function buildHud() {
    if (hudBuilt) { root.querySelector('#hud')?.remove(); }
    hudBuilt = true;
    const hearts = h('div', { class: 'hearts' });
    hud.heartEls = [];
    for (let i = 0; i < CFG.LIVES; i++) { const im = h('img', { src: 'assets/ui/ui_heart_full.png', alt: '' }); hearts.append(im); hud.heartEls.push(im); }
    hud.nubes = h('div', { class: 'nubes' });
    hud.n = h('div', { class: 'n', text: '0' });
    hud.m = h('div', { class: 'm', text: '0 m' });
    const pause = button('', () => app.bus.emit('pause_request'), 'pausebtn small');
    pause.firstChild.append(h('i'));
    pause.classList.add('pausebtn');
    hud.pause = pause;
    hud.power = h('div', { class: 'power' }, [h('div', { class: 'ring' }, [h('span')]), h('div', { class: 'lab' })]);
    hud.power.style.display = 'none';
    hud.badge = h('div', { class: 'badge' });
    hud.hintL = h('div', { class: 'hint l' }, [h('b', { text: '↓' }), h('span', { text: t('hint.crouch') })]);
    hud.hintR = h('div', { class: 'hint r' }, [h('span', { text: t('hint.jump') }), h('b', { text: '↑' })]);
    const el = h('div', { id: 'hud' }, [hearts, hud.nubes, h('div', { class: 'power-wrap' }, [hud.power]), h('div', { class: 'right' }, [h('div', { class: 'score' }, [hud.n, hud.m]), pause]), hud.badge, hud.hintL, hud.hintR]);
    root.append(el);
    hud.el = el;
    hud.last = { lives: CFG.LIVES, score: 0, power: null, mode: 'normal' };
    hud.bumpAt = 0;
  }
  function hudUpdate(s) {
    if (!hud.el) return;
    const last = hud.last;
    if (s.mode === 'easy') { hud.heartEls.forEach((e) => (e.style.display = 'none')); hud.nubes.replaceChildren(icon('candy', 22), String(' ' + s.coins)); }
    else {
      hud.nubes.replaceChildren();
      hud.heartEls.forEach((e, i) => {
        e.style.display = '';
        const full = i < s.lives;
        const src = full ? 'assets/ui/ui_heart_full.png' : 'assets/ui/ui_heart_empty.png';
        if (!e.src.endsWith(src.split('/').pop())) {
          e.src = src;
          if (!full) anim(e, { transform: ['scale(1.7) rotate(-14deg)', 'scale(1) rotate(0deg)'] }, BOUNCY);
          else anim(e, { transform: ['scale(0.2)', 'scale(1)'] }, BOUNCY);
        }
      });
    }
    if (s.score !== last.score) {
      hud.n.textContent = String(s.score);
      const now = performance.now();
      if (now - hud.bumpAt > 130) { hud.bumpAt = now; anim(hud.n, { transform: ['scale(1)', 'scale(1.16)', 'scale(1)'] }, { duration: 0.18 }); }
      last.score = s.score;
    }
    hud.m.textContent = t('hud.meters', { n: s.meters });
    const p = s.power;
    if (p) {
      const col = p.kind === 'fast' ? '#FFE23A' : p.kind === 'slow' ? '#6FE09A' : '#FF5C70';
      const ring = hud.power.firstChild;
      if (hud.power.style.display === 'none') { hud.power.style.display = 'flex'; anim(hud.power, { opacity: [0, 1], transform: ['translateX(-50%) translateY(-20px)', 'translateX(-50%) translateY(0px)'] }, SPRING); }
      ring.style.setProperty('--p', String(Math.max(0, (p.t / p.total) * 100)));
      ring.style.setProperty('--c', col);
      if (hud.pk !== p.kind) { hud.pk = p.kind; ring.firstChild.replaceChildren(icon(p.kind === 'fast' ? 'bolt' : p.kind === 'slow' ? 'turtle' : 'rainbow', 22)); }
      hud.power.lastChild.textContent = t('hud.' + p.kind);
      hud.power.lastChild.style.color = col;
      hud.power.style.transform = 'translateX(-50%)';
      if (p.t < 1.5) hud.power.style.opacity = Math.floor(p.t * 8) % 2 ? '0.4' : '1'; else hud.power.style.opacity = '1';
    } else if (hud.power.style.display !== 'none') { hud.power.style.display = 'none'; }
    last.lives = s.lives;
  }

  function hintsFor(mode) {
    const on = app.save.settings.touchHints;
    const touchy = matchMedia('(pointer: coarse)').matches;
    const show = on && (touchy || mode === 'easy');
    hud.hintL.style.display = hud.hintR.style.display = show ? 'flex' : 'none';
    if (show && mode !== 'easy') setTimeout(() => { anim([hud.hintL, hud.hintR], { opacity: 0 }, { duration: 0.6 }); }, 9000);
  }

  // ------------------------------------------------------------------ world card
  let cardEl = null;
  function worldCard({ world, lap, first }) {
    cardEl?.remove();
    const c = h('div', { class: 'c' }, [h('div', { class: 'w', text: t('world.card', { n: world }) }), h('div', { class: 'bands' }), h('div', { class: 'n', text: t('w' + world) }), lap > 1 ? h('div', { class: 'l', text: t('world.lap', { n: lap }) }) : null]);
    cardEl = h('div', { id: 'card' }, [c]);
    root.append(cardEl);
    sfx('world_card');
    const delay = first ? 0.35 : 0;
    anim(c, { opacity: [0, 1, 1, 0], transform: ['translateX(120%)', 'translateX(0%) scale(1.06)', 'translateX(0%) scale(1)', 'translateX(-120%)'] }, { duration: 2.4, delay, times: [0, 0.2, 0.8, 1], ease: 'easeOut' });
    setTimeout(() => cardEl?.remove(), (2.4 + delay) * 1000 + 100);
    if (hud.badge) { hud.badge.textContent = `${t('world.card', { n: world })} · ${t('w' + world)}${lap > 1 ? ' · ' + t('world.lap', { n: lap }) : ''}`; anim(hud.badge, { opacity: [0, 1, 1, 0] }, { duration: 4, delay: 2.2, times: [0, 0.1, 0.8, 1] }); }
  }

  // ------------------------------------------------------------------ pause
  let pauseEl = null;
  function showPause() {
    if (ui.state !== 'run') return;
    ui.state = 'paused';
    app.bus.emit('pause_toggle', true);
    clearTree('pause');
    const mode = hud.last.mode;
    const resume = () => { clearTree('pause'); ui.state = 'run'; app.bus.emit('pause_toggle', false); };
    ui.resume = resume;
    const items = [
      button(t('pause.resume'), resume, 'big pink'),
      button(t('pause.restart'), () => { clearTree('pause'); ui.state = 'run'; app.bus.emit('pause_toggle', false); app.bus.emit('restart', { mode: currentMode, world: startWorld, intro: true }); }, 'mint'),
      button(t('pause.settings'), () => { screens.pause.classList.add('hidden'); showSettings('pause'); }, 'lav'),
    ];
    if (currentMode === 'easy') items.push(button(t('pause.finish'), () => { clearTree('pause'); ui.state = 'run'; app.bus.emit('pause_toggle', false); app.bus.emit('finish_run'); }, 'dark'));
    items.push(button(t('pause.menu'), () => { clearTree('pause'); toTitle(); }, 'dark'));
    const el = screen('pause', [h('div', { class: 'dim' }), panel([h('h2', { text: t('pause.title') }), h('div', { class: 'stack' }, items)])]);
    enter(el.lastChild);
    anim(items, { opacity: [0, 1], transform: ['scale(0.8)', 'scale(1)'] }, { ...BOUNCY, delay: stag(0.06) });
  }

  function toTitle() {
    clearTree('results'); clearTree('pause');
    root.querySelector('#hud')?.remove(); hudBuilt = false;
    app.bus.emit('pause_toggle', false);
    app.bus.emit('to_title');
  }

  // ------------------------------------------------------------------ results
  function countUp(el, to, dur = 1.2) {
    const t0 = performance.now();
    let lastTick = 0;
    const step = (now) => {
      const u = Math.min(1, (now - t0) / (dur * 1000));
      const v = Math.round(to * (1 - Math.pow(1 - u, 3)));
      el.textContent = String(v);
      if (now - lastTick > 70 && u < 1) { lastTick = now; sfx('count_tick'); }
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function confetti(el) {
    if (reduced()) return;
    const cols = ['#FF4D5E', '#FF9A3C', '#FFE23A', '#5CD66A', '#4DA6FF', '#9D6BFF', '#FF85C4'];
    const box = el.getBoundingClientRect();
    for (let i = 0; i < 48; i++) {
      const c = h('i', { class: 'conf' });
      c.style.background = cols[i % cols.length];
      c.style.left = `${Math.random() * 100}%`; c.style.top = '-6%';
      root.append(c);
      const dx = (Math.random() - 0.5) * 160;
      anim(c, { transform: [`translate(0px,0px) rotate(0deg)`, `translate(${dx}px, ${box.height * 1.3}px) rotate(${Math.random() * 720}deg)`], opacity: [1, 1, 0] }, { duration: 1.8 + Math.random() * 1.4, delay: Math.random() * 0.5, ease: 'easeIn' }).finished?.then(() => c.remove());
    }
  }
  function showResults(sum) {
    ui.state = 'over';
    const hs = app.save.best(sum.mode);
    const rec = { score: sum.score, meters: sum.meters, world: sum.world, lap: sum.lap, date: new Date().toISOString().slice(0, 10), name: sum.name };
    const isRecord = app.save.addScore(sum.mode, rec);
    app.save.noteRun(sum);
    sfx(isRecord ? 'new_record' : 'game_over_sting');
    const easy = sum.mode === 'easy';
    const msgs = [];
    if (sum.coins > 5) msgs.push(t('over.msg.candy', { n: sum.coins }));
    if (sum.stomps > 2) msgs.push(t('over.msg.stomp', { n: sum.stomps }));
    const nextW = sum.world + 1;
    if (!easy && sum.world < 6 && sum.meters % 360 > 250) msgs.unshift(t('over.msg.close', { n: nextW }));
    if (!msgs.length) msgs.push(t('over.msg.far'));
    const big = h('div', { class: 'big', text: '0' });
    const again = button(t('over.again'), () => { clearTree('results'); app.bus.emit('restart', { mode: sum.mode, world: startWorld, intro: true }); }, 'big pink');
    const menu = button(t('over.menu'), () => toTitle(), 'dark');
    const stats = h('div', { class: 'stats' }, [h('div', {}, [String(sum.meters), h('small', { text: t('over.meters') })]), h('div', {}, [String(sum.coins), h('small', { text: t('over.candies') })]), h('div', {}, [String(Math.max(hs, sum.score)), h('small', { text: t('over.best') })])]);
    const kids = [h('div', { class: 'title', text: t(easy ? 'over.easy' : 'over.title', { name: sum.name }) }), big, isRecord ? h('div', { class: 'rec', text: '★ ' + t('over.record') + ' ★' }) : null, stats, h('div', { class: 'msg', text: msgs[0] }), h('div', { class: 'row', style: 'justify-content:center;gap:calc(var(--px)*16px)' }, [again, menu])];
    clearTree('results');
    const el = screen('results', [h('div', { class: 'dim' }), panel(kids)], '');
    hud.el && (hud.el.style.opacity = '0.0');
    enter(el.lastChild);
    setTimeout(() => countUp(big, sum.score), 350);
    if (isRecord || easy) setTimeout(() => confetti(el), 500);
    anim(stats.children, { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0px)'] }, { delay: stag(0.1), duration: 0.4 });
    app.lastSummary = sum;
  }

  // ------------------------------------------------------------------ wiring
  app.bus.on('title_enter', () => { root.querySelector('#hud')?.remove(); hudBuilt = false; showTitle(); uncoverMaybe(); });
  async function uncoverMaybe() { if (wipe.style.display === 'block') await uncover(); }
  app.bus.on('run_start', async (d) => {
    ui.state = 'run';
    currentMode = d.mode;
    buildHud();
    hud.last.mode = d.mode;
    hintsFor(d.mode);
    hideAll();
    await uncoverMaybe();
  });
  app.bus.on('hud', hudUpdate);
  app.bus.on('world_card', worldCard);
  app.bus.on('pause_request', () => { if (ui.state === 'run') showPause(); else if (ui.state === 'paused' && ui.resume && !screens.settings) ui.resume(); });
  app.bus.on('run_over', showResults);
  app.bus.on('layout', () => { /* css variables are set by applyLayout */ });
  app.input.onConfirm = () => { if (ui.state === 'title') openModes(); };
  ui.showTitle = showTitle;
  ui.showPause = showPause;
  return ui;
}
