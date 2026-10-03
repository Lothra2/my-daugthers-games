// UNI-SALTA bootstrap: loads data, builds the shared `app`, and starts Phaser.
import { readFlags } from './systems/debug.js';
import { Save } from './systems/save.js';
import { I18n } from './systems/i18n.js';
import { Bus } from './systems/bus.js';
import { Input } from './systems/input.js';
import { computeLayout, applyLayout } from './systems/layout.js';
import { Preload } from './view/Preload.js';
import { Title } from './view/Title.js';
import { Game } from './view/Game.js';
import { createUI } from './ui/ui.js';
import { createAudio } from './audio/engine.js';

async function json(url) { const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }

async function boot() {
  const flags = readFlags();
  const [u, e, m, wa, nw] = await Promise.all([
    json('src/data/anims_unicorn.json'), json('src/data/anims_entities.json'), json('src/data/anims_misc.json'), json('src/data/world_assets.json'), json('src/data/anims_new.json'),
  ]);
  const meta = { ...u, ...e, ...m, ...nw };
  const save = new Save();
  const i18n = new I18n(flags.lang || save.settings.lang);
  const bus = new Bus();
  const root = document.getElementById('app');
  const dpr = Math.min(window.devicePixelRatio || 1, 4);
  let layout = computeLayout(window.innerWidth, window.innerHeight, dpr);
  const app = { flags, save, i18n, bus, meta, worldAssets: wa, layout, root };
  window.UNISALTA = app;

  app.input = new Input(document.getElementById('game'), () => app.inputBlocked && app.inputBlocked());
  app.audio = createAudio(app);
  app.ui = createUI(app);

  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: layout.W, height: layout.H, backgroundColor: '#2A2159',
    pixelArt: true, antialias: false, roundPixels: true,
    scale: { mode: Phaser.Scale.NONE },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    audio: { noAudio: true },
    fps: { target: 60, smoothStep: false },
    scene: [Preload, Title, Game],
  });
  app.game = game;
  game.registry.set('app', app);
  const relayout = () => {
    layout = computeLayout(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 4));
    app.layout = layout;
    if (game.scale.width !== layout.W || game.scale.height !== layout.H) game.scale.resize(layout.W, layout.H);
    applyLayout(root, game.canvas, layout);
    bus.emit('layout', layout);
  };
  game.events.once('ready', relayout);
  bus.on('to_title', () => { game.scene.stop('Game'); game.scene.start('Title'); });
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', () => setTimeout(relayout, 200));
  document.addEventListener('visibilitychange', () => { if (document.hidden) bus.emit('pause_request'); });
  window.addEventListener('blur', () => bus.emit('pause_request'));
  relayout();
  document.getElementById('rotate-text').textContent = i18n.t('rotate');
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !flags.nosw) navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot().catch((err) => { console.error(err); document.body.insertAdjacentHTML('beforeend', '<pre style="color:#fff;padding:12px">' + String(err) + '</pre>'); });
