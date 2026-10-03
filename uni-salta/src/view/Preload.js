import { makeParticles, makeGate, makeBolt, makeSky, makeGlow, makeStreaks } from './gfx.js';
import { WORLDS } from '../data/worlds.js';

export class Preload extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const app = this.registry.get('app');
    const { W, H } = app.layout;
    const bar = this.add.graphics();
    const label = this.add.text(W / 2, H / 2 - 30, 'UNI-SALTA', { fontFamily: '"Pixelify Sans", monospace', fontSize: '32px', color: '#FFF4DC' }).setOrigin(0.5);
    this.load.on('progress', (p) => {
      bar.clear();
      bar.fillStyle(0x1E1330, 1).fillRect(W / 2 - 82, H / 2 + 4, 164, 14);
      bar.fillStyle(0xFFC46B, 1).fillRect(W / 2 - 80, H / 2 + 6, Math.floor(160 * p), 10);
    });
    this.load.on('complete', () => label.destroy());
    const meta = app.meta;
    this.load.setPath('assets/');
    for (const [key, m] of Object.entries(meta)) this.load.spritesheet(key, `sprites/${key}.png`, { frameWidth: m.cell[0], frameHeight: m.cell[1] });
    this.load.image('ui_heart_full', 'ui/ui_heart_full.png');
    this.load.image('ui_heart_empty', 'ui/ui_heart_empty.png');
    for (let w = 1; w <= 6; w++) {
      const wa = app.worldAssets.worlds[w];
      for (let i = 0; i < wa.props.length; i++) this.load.image(`prop_w${w}_${i}`, `props/w${w}/prop_${i}.png`);
      this.load.image(`floor_w${w}`, `tiles/w${w}/floor.png`);
      this.load.image(`platform_w${w}`, `tiles/w${w}/platform.png`);
    }
    this.load.bitmapFont('pixfont', 'fonts/pixfont.png', 'fonts/pixfont.fnt');
  }

  create() {
    const app = this.registry.get('app');
    for (const [key, m] of Object.entries(app.meta)) {
      if (this.anims.exists(key)) continue;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end: m.frames - 1 }), frameRate: m.fps, repeat: m.loop ? -1 : 0 });
    }
    makeParticles(this);
    makeSky(this, 'sky_title', ['#7A3FE0', '#9358E8', '#A878F0', '#C79BF5']);
    makeStreaks(this, 'streaks_title', '#D8BDFB', 21);
    makeGate(this, 'gate');
    makeBolt(this, 'bolt');
    for (const [n, w] of Object.entries(WORLDS)) {
      makeSky(this, `sky_w${n}`, w.sky);
      makeGlow(this, `glow_w${n}`, w.glow, w.glowStrength);
      makeStreaks(this, `streaks_w${n}`, w.streak, 7 + Number(n));
    }
    // 3-slice frames for platforms
    for (let w = 1; w <= 6; w++) {
      const tex = this.textures.get(`platform_w${w}`);
      const src = tex.getSourceImage();
      const pw = src.width, ph = src.height;
      tex.add('l', 0, 0, 0, 26, ph);
      tex.add('m', 0, 26, 0, pw - 52, ph);
      tex.add('r', 0, pw - 26, 0, 26, ph);
    }
    app.bus.emit('assets_ready');
    this.scene.start(app.flags.skipTitle || app.flags.shot ? 'Game' : 'Title', app.startData || {});
  }
}
