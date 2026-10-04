import Phaser from 'phaser';
import { computeLayout } from './core/layout';

declare global {
  interface Window { __copa?: Record<string, unknown>; }
}

const params = new URLSearchParams(location.search);
const layout = computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    this.cameras.main.setBackgroundColor('#2A1B3D');
    this.add.rectangle(layout.w / 2, layout.h / 2, 32, 32, 0xffd447);
    window.__copa = { ready: true, w: layout.w, h: layout.h, scale: layout.scale, seed: params.get('seed') };
  }
}

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
  scene: [BootScene],
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
