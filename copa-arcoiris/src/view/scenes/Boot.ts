import Phaser from 'phaser';
import { CHAR_IDS, EVENT_ORDER } from '../../core/types';
import { makeProceduralTextures } from '../Procedural';
import { makeBackdropTextures } from '../Backdrop';

export const A = (p: string): string => `${import.meta.env.BASE_URL}assets/${p}`;

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const bar = document.getElementById('loadbar');
    this.load.on('progress', (v: number) => { if (bar) bar.style.width = `${Math.round(v * 100)}%`; });
    this.load.spritesheet('tiles16', A('tiles/tiles.png'), { frameWidth: 16, frameHeight: 16 });
    this.load.image('tiles', A('tiles/tiles.png'));
    this.load.atlas('props', A('props/props.png'), A('props/props.json'));
    for (const id of [...EVENT_ORDER, 'warmup']) this.load.tilemapTiledJSON(`map_${id}`, A(`maps/${id}.json`));
    for (const c of CHAR_IDS) {
      for (const sfx of ['', '_arcoiris', '_estrellas']) this.load.spritesheet(`char_${c}${sfx}`, A(`sprites/${c}${sfx}.png`), { frameWidth: 48, frameHeight: 48 });
      this.load.json(`meta_${c}`, A(`sprites/${c}.json`));
    }
    this.load.spritesheet('portraits', A('ui/portraits.png'), { frameWidth: 64, frameHeight: 64 });
  }
  create() {
    makeProceduralTextures(this);
    makeBackdropTextures(this);
    for (const t of this.textures.getTextureKeys()) { const tx = this.textures.get(t); tx.setFilter(Phaser.Textures.FilterMode.NEAREST); }
    this.game.events.emit('assets-ready');
  }
}
