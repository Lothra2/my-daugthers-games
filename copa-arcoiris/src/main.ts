import Phaser from 'phaser';
import { computeLayout } from './core/layout';
import { BootScene } from './view/scenes/Boot';
import { EventScene } from './view/scenes/EventScene';
import { InputRouter } from './input/router';
import { KeyboardInput } from './input/keyboard';
import { Hud } from './ui/hud';
import { services } from './app/services';
import type { EventConfig, EventResult } from './app/types';
import type { CharId, EventId } from './core/types';

declare global {
  interface Window { __copa?: Record<string, any>; }
}

const params = new URLSearchParams(location.search);
const layout = computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: layout.w,
  height: layout.h,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  backgroundColor: '#2A1B3D',
  scale: { mode: Phaser.Scale.NONE },
  input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  audio: { noAudio: true },
  scene: [BootScene, EventScene],
});

function applyLayout() {
  const l = computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  game.scale.resize(l.w, l.h);
  const c = game.canvas;
  if (c) { c.style.width = `${l.cssW}px`; c.style.height = `${l.cssH}px`; }
}
window.addEventListener('resize', applyLayout);
window.addEventListener('orientationchange', applyLayout);
applyLayout();
game.canvas?.addEventListener('webglcontextlost', (e) => { e.preventDefault(); location.reload(); });

services.router = new InputRouter();
services.hud = new Hud();
const kb = new KeyboardInput(services.router);

game.events.once('assets-ready', () => {
  window.__copa = { ready: true, game, services };
  const ev = params.get('event') as EventId | null;
  if (ev) {
    const chars = (params.get('chars') ?? 'sophie,papa,mama,thor').split(',') as CharId[];
    const players = Number(params.get('players') ?? 1);
    const cfg: EventConfig = {
      eventId: ev, seed: Number(params.get('seed') ?? 1), difficulty: (params.get('difficulty') as any) ?? 'tranquilo',
      roster: chars.map((c, i) => ({ charId: c, control: i < players ? 'human' : 'ai', slot: i })),
      debug: { hitboxes: params.has('hitboxes'), ff: Number(params.get('ff') ?? 1), autoplay: params.has('autoplay') },
    };
    kb.mode = players > 1 ? '2p' : '1p'; kb.active = true;
    game.scene.start('Event', cfg);
  }
});
game.events.on('event-done', (r: EventResult) => { window.__copa = { ...window.__copa, lastResult: r }; });
