import Phaser from 'phaser';
import { CHAR_IDS } from '../../core/types';
import { Backdrop } from '../Backdrop';
import { frameOf, type SpriteMeta } from '../CharacterView';

/** Calm background for the menus: sky, hills, grass and the family running by. */
export class TitleScene extends Phaser.Scene {
  private backdrop!: Backdrop;
  private runners: { s: Phaser.GameObjects.Sprite; sh: Phaser.GameObjects.Image; x: number; y: number; speed: number; meta: SpriteMeta; name: string }[] = [];
  private t = 0;
  private ground: Phaser.GameObjects.TileSprite | null = null;
  constructor() { super('Title'); }

  create() {
    const w = this.scale.width, h = this.scale.height;
    this.backdrop = new Backdrop(this, w, h);
    this.cameras.main.setRoundPixels(true);
    this.ground = this.add.tileSprite(0, h - 96, w, 96, 'tiles16', 0).setOrigin(0, 0).setDepth(-50);
    this.drawGround(w, h);
    this.drawScenery(w, h);
    this.runners = [];
    CHAR_IDS.forEach((c, i) => {
      const meta = this.cache.json.get(`meta_${c}`) as SpriteMeta;
      const y = h - 70 + (i % 3) * 18;
      const sh = this.add.image(0, 0, 'shadow').setDepth(y - 1);
      const s = this.add.sprite(0, 0, `char_${c}`, 0).setOrigin(meta.pivot[0] / meta.cell[0], meta.pivot[1] / meta.cell[1]).setDepth(y);
      this.runners.push({ s, sh, x: -60 - i * 90, y, speed: 52 + (i % 3) * 14 + (c === 'thor' ? 18 : 0), meta, name: c === 'thor' ? 'run' : 'run' });
    });
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
  }

  private rt: Phaser.GameObjects.RenderTexture | null = null;
  private scenery: Phaser.GameObjects.Image[] = [];
  /** The festival village behind the track: houses, trees and tents from the props atlas. */
  private drawScenery(w: number, h: number): void {
    this.scenery.forEach((i) => i.destroy()); this.scenery = [];
    const kinds = ['tree_round', 'house_mush', 'oak', 'tent', 'blossom', 'windmill', 'fir', 'house_thatch', 'lanterns', 'stall', 'blossom', 'fountain'];
    const base = h - 7 * 16 + 22;
    let x = 4, i = 0;
    while (x < w) {
      const k = kinds[i % kinds.length], fw = this.textures.get('props').get(k).width;
      this.scenery.push(this.add.image(x + Math.floor(fw / 2), base + (i % 2) * 3, 'props', k).setOrigin(0.5, 1).setDepth(-49 + (i % 2) * 0.1));
      x += fw + 6 + (i * 5) % 12; i++;
    }
  }
  private drawGround(w: number, h: number): void {
    this.ground?.destroy(); this.ground = null;
    this.rt?.destroy();
    const rows = 7, cols = Math.ceil(w / 16) + 1;
    const rt = this.add.renderTexture(0, h - rows * 16, cols * 16, rows * 16).setOrigin(0, 0).setDepth(-50);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const grass = (x * 7 + y * 3) % 6 === 0 ? 2 : (x + y) % 2 ? 0 : 1;
      const f = y === 0 ? 4 : y >= 4 && y <= 5 ? ((x + y) % 3 ? 6 : 7) : grass;
      rt.stamp('tiles16', f, x * 16, y * 16, { originX: 0, originY: 0 });
    }
    rt.render();
    this.rt = rt;
  }

  private onResize(size: Phaser.Structs.Size): void {
    this.backdrop.resize(size.width, size.height);
    this.drawGround(size.width, size.height);
    this.drawScenery(size.width, size.height);
    this.runners.forEach((r, i) => { r.y = size.height - 70 + (i % 3) * 18; });
  }

  update(_t: number, dtMs: number) {
    const dt = Math.min(dtMs, 80) / 1000; this.t += dt;
    const w = this.scale.width;
    this.backdrop.update(this.t * 6, 0, this.t);
    for (const r of this.runners) {
      r.x += r.speed * dt;
      if (r.x > w + 60) r.x = -60;
      const fr = frameOf(r.meta, 'run', this.t * (r.speed / 60) * 1.2);
      r.s.setFrame(fr).setPosition(Math.round(r.x), Math.round(r.y)).setDepth(r.y);
      r.sh.setPosition(Math.round(r.x), Math.round(r.y)).setDepth(r.y - 1);
    }
  }
}
