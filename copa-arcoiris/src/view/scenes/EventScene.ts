import Phaser from 'phaser';
import { PHYS } from '../../core/data';
import { createRules } from '../../core/events';
import { boxAt, moverRect, type MapData } from '../../core/mapdata';
import { createWorld, drainFx, step, type World } from '../../core/world';
import { emptyInput, type GameFx } from '../../core/types';
import { parseTiledMap, type TiledMap } from '../../maps/tiled';
import type { ActorResult, EventConfig, EventResult } from '../../app/types';
import { services } from '../../app/services';
import { Backdrop } from '../Backdrop';
import { CharacterView, type SpriteMeta } from '../CharacterView';
import { Fx } from '../Fx';
import { blockTextures, moverTexture } from '../Procedural';

const DRAWN = new Set(['plataforma', 'seta', 'heno', 'caja', 'nube', 'piedra', 'pasarela', 'valla', 'tronco', 'parachoques']);
/** Boxes drawn with a sprite from the props atlas. `top`: sprite centred on the top face (moves with the box). `bottom`: sits on the ground behind the footprint. */
const SPRITE_BOX: Record<string, { frame: string; mode: 'top' | 'bottom' }> = { nube: { frame: 'cloud', mode: 'top' }, parachoques: { frame: 'bumper', mode: 'bottom' } };
/** Horizontal origin of props whose pole is not centred. */
const ORIGIN_X: Record<string, number> = { pole_green: 0.22, pole_pink: 0.22, pole_orange: 0.22, pole_cyan: 0.22, flag_finish: 0.22, sign_arrow: 0.29 };
const POLES = ['pole_green', 'pole_pink', 'pole_orange', 'pole_cyan'];

interface ItemView { img: Phaser.GameObjects.Image; sh: Phaser.GameObjects.Image }
interface BoxView { id: string; top: Phaser.GameObjects.Image; front: Phaser.GameObjects.Image | null; box: MapData['boxes'][number]; dx?: number; dy?: number }
interface MoverView { img: Phaser.GameObjects.Image; m: MapData['movers'][number]; frames: string[] }

export class EventScene extends Phaser.Scene {
  world!: World;
  cfg!: EventConfig;
  paused = false;
  private acc = 0;
  private simClock = 0;
  private views = new Map<number, CharacterView>();
  private itemViews = new Map<number, ItemView>();
  private shotViews = new Map<number, Phaser.GameObjects.Image>();
  private boxViews: BoxView[] = [];
  private moverViews: MoverView[] = [];
  private hongos: { img: Phaser.GameObjects.Image; z: MapData['bounces'][number]; t: number }[] = [];
  private backdrop!: Backdrop;
  private fx!: Fx;
  private debugG: Phaser.GameObjects.Graphics | null = null;
  private overT = 0;
  private doneSent = false;
  private hudT = 0;
  private lastCount = 0;
  private colorById = new Map<number, number>();
  private ptr: Phaser.GameObjects.Image | null = null;
  private pinataImg: Phaser.GameObjects.Image | null = null;
  private hitSwing = 0;

  constructor() { super('Event'); }

  init(cfg: EventConfig) {
    this.cfg = cfg;
    this.acc = 0; this.simClock = 0; this.overT = 0; this.doneSent = false; this.paused = false; this.hudT = 0;
    this.views.clear(); this.itemViews.clear(); this.shotViews.clear(); this.boxViews = []; this.moverViews = []; this.hongos = []; this.pinataImg = null;
    this.colorById.clear();
  }

  create() {
    const cfg = this.cfg;
    const raw = this.cache.tilemap.get(`map_${cfg.eventId}`).data as TiledMap;
    const map = parseTiledMap(cfg.eventId, raw);
    const view = { w: this.scale.width, h: this.scale.height };
    this.world = createWorld(map, createRules(cfg.eventId), cfg.roster, { seed: cfg.seed, difficulty: cfg.difficulty, viewW: view.w, viewH: view.h, skipIntro: true });
    const w = this.world;
    w.actors.forEach((a) => this.colorById.set(a.id, a.stats.colorHex));
    if (cfg.debug?.autoplay) for (const a of w.actors) if (a.control === 'human') { a.control = 'ai'; w.humans = w.humans.filter((id) => id !== a.id); }

    this.cameras.main.setRoundPixels(true).setBackgroundColor('#2A1B3D');
    this.backdrop = new Backdrop(this, view.w, view.h);
    this.fx = new Fx(this);
    this.buildTiles(raw);
    this.buildProps(raw, map);
    this.buildBoxes(map);
    this.buildMovers(map);
    this.buildMarkers(map);
    for (const a of w.actors) {
      const meta = this.cache.json.get(`meta_${a.charId}`) as SpriteMeta;
      this.views.set(a.id, new CharacterView(this, a, meta, a.stats.colorHex, a.control === 'human' || this.cfg.debug?.autoplay ? a.slot : null));
    }
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => { this.scale.off('resize', this.onResize, this); });
    if (cfg.debug?.hitboxes) this.debugG = this.add.graphics().setDepth(99999);
    services.hud?.attach(this);
    this.syncCamera(0);
  }

  private onResize(size: Phaser.Structs.Size): void {
    this.world.view.w = size.width; this.world.view.h = size.height;
    this.backdrop.resize(size.width, size.height);
  }

  // ------------------------------------------------------------------ build
  private buildTiles(raw: TiledMap): void {
    const tm = this.make.tilemap({ key: `map_${this.cfg.eventId}` });
    const ts = tm.addTilesetImage('tiles', 'tiles')!;
    const depths: Record<string, number> = { suelo: -9000, fachada: -8900, deco_suelo: -8800 };
    for (const [name, d] of Object.entries(depths)) {
      const l = tm.createLayer(name, ts, 0, 0);
      if (l) l.setDepth(d);
    }
    const front = tm.createLayer('frente', ts, 0, 0);
    if (front) front.setDepth(100000);
    void raw;
  }

  private buildProps(raw: TiledMap, map: MapData): void {
    for (const lname of ['props_fondo', 'props_suelo', 'props_frente']) {
      const layer = raw.layers.find((l) => l.name === lname);
      for (const o of layer?.objects ?? []) {
        if (!o.gid) {
          const frame = o.name ?? '';
          if (o.type !== 'deco' || !this.textures.get('props').has(frame)) continue;
          const split = Number((o.properties as { name: string; value: unknown }[] | undefined)?.find((q) => q.name === 'split')?.value ?? 0);
          const x = Math.round(o.x), y = Math.round(o.y), ox = ORIGIN_X[frame] ?? 0.5;
          const depth = lname === 'props_fondo' ? -8000 : lname === 'props_frente' ? 100001 : y;
          const img = this.add.image(x, y, 'props', frame).setOrigin(ox, 1).setDepth(split ? -7990 : depth);
          if (split) this.add.image(x, y, 'props', frame).setOrigin(ox, 1).setDepth(depth).setCrop(0, split, img.width, img.height - split);
          continue;
        }
        const img = this.add.image(o.x, o.y, 'tiles16', o.gid - 1).setOrigin(0, 1);
        const top = (o.name ?? '').endsWith('_top');
        img.setDepth(lname === 'props_fondo' ? -8000 : lname === 'props_frente' ? 100001 : top ? o.y + 16 - 0.2 : o.y);
      }
    }
    void map;
  }

  private buildBoxes(map: MapData): void {
    for (const b of map.boxes) {
      if (!DRAWN.has(b.kind) || b.alto <= 2 || b.alto > 200) continue;
      const sp = SPRITE_BOX[b.kind];
      if (sp) {
        const fr = this.textures.get('props').get(sp.frame);
        const dx = Math.round((b.w - fr.width) / 2);
        const dy = sp.mode === 'top' ? Math.round(b.h / 2 - fr.height / 2) : b.h - fr.height + 2 + b.alto;
        const img = this.add.image(Math.round(b.x) + dx, Math.round(b.y - b.alto) + dy, 'props', sp.frame).setOrigin(0, 0).setDepth(sp.mode === 'top' ? b.y - 0.1 : b.y + b.h);
        this.boxViews.push({ id: b.id, top: img, front: null, box: b, dx, dy });
        continue;
      }
      const k = blockTextures(this, b.kind, b.w, b.h, b.alto);
      const top = this.add.image(b.x, b.y - b.alto, k.top).setOrigin(0, 0).setDepth(b.y - 0.1);
      const front = this.add.image(b.x, b.y + b.h - b.alto, k.front).setOrigin(0, 0).setDepth(b.y + b.h);
      this.boxViews.push({ id: b.id, top, front, box: b });
    }
  }

  private buildMovers(map: MapData): void {
    for (const m of map.movers) {
      const frames = [moverTexture(this, m.kind, m.w, m.h, m.alto, 0), moverTexture(this, m.kind, m.w, m.h, m.alto, 1)];
      const img = this.add.image(m.x, m.y, frames[0]).setOrigin(0, 0);
      this.moverViews.push({ img, m, frames });
    }
    for (const bz of map.bounces) {
      const img = this.add.image(Math.round(bz.x + bz.w / 2), Math.round(bz.y + bz.h), 'hongo0').setOrigin(0.5, 1).setDepth(bz.y + bz.h);
      this.hongos.push({ img, z: bz, t: 0 });
    }
  }

  private buildMarkers(map: MapData): void {
    const cols = [0x4aa88e, 0xff5e7e, 0xffb23f, 0x7be3ff];
    const gt = map.groundTop, gb = map.groundBottom;
    map.checkpoints.forEach((c, i) => {
      const frame = POLES[i % POLES.length];
      this.add.image(Math.round(c.x), gt + 2, 'props', frame).setOrigin(ORIGIN_X[frame], 1).setDepth(gt + 2);
      this.add.image(Math.round(c.x), gb, 'props', frame).setOrigin(ORIGIN_X[frame], 1).setDepth(gb);
      const g = this.add.graphics().setDepth(-8700);
      g.fillStyle(cols[i % cols.length], 0.35).fillRect(c.x - 2, gt, 4, gb - gt);
    });
    if (map.goal) {
      this.add.image(Math.round(map.goal.x + 8), gt + 2, 'props', 'flag_finish').setOrigin(ORIGIN_X.flag_finish, 1).setDepth(gt + 2);
      this.add.image(Math.round(map.goal.x + 8), gb, 'props', 'flag_finish').setOrigin(ORIGIN_X.flag_finish, 1).setDepth(gb);
    }
    const pin = this.world.data.pinata as { x: number; y: number; z: number } | undefined;
    if (pin) {
      this.pinataImg = this.add.image(pin.x, pin.y - pin.z, 'props', 'pinata').setOrigin(0.5, 0.5).setDepth(pin.y + 40);
      const b = this.world.data.basket as { x: number; y: number };
      this.add.image(Math.round(b.x), Math.round(b.y), 'props', 'basket').setOrigin(0.5, 1).setDepth(b.y);
    }
  }

  // ------------------------------------------------------------------ loop
  update(_time: number, deltaMs: number) {
    const w = this.world;
    if (!w) return;
    const dt = Math.min(deltaMs, 100) / 1000;
    const ff = this.cfg.debug?.ff ?? 1;
    if (!this.paused) {
      this.acc += dt * ff;
      let n = 0;
      const limit = Math.max(4, Math.ceil(ff) * 3);
      while (this.acc >= PHYS.dt && n < limit) { this.simStep(); this.acc -= PHYS.dt; n++; }
      if (n >= limit) this.acc = 0;
    }
    this.render(dt);
    if (w.phase === 'over') {
      this.overT += this.paused ? 0 : dt;
      if (!this.doneSent && this.overT >= 2.2) { this.doneSent = true; this.game.events.emit('event-done', this.result()); }
    }
  }

  private simStep(): void {
    const w = this.world;
    const router = services.router;
    for (const a of w.actors) {
      if (a.control === 'human') a.input = router ? router.frame(a.slot) : emptyInput();
    }
    step(w);
    router?.endStep();
    this.simClock += PHYS.dt;
    for (const e of drainFx(w)) this.onFx(e);
  }

  private onFx(e: GameFx): void {
    if (e.k === 'count') { this.lastCount = e.v ?? 0; services.hud?.count(e.v ?? 0); }
    else if (e.k === 'go') services.hud?.count(0);
    else if (e.k === 'pinata') this.hitSwing = 1;
    else if (e.k === 'cp') services.hud?.banner(`¡Arco ${e.v} de ${this.world.map.checkpoints.length}!`);
    else if (e.k === 'finish') services.hud?.banner(e.who !== undefined ? `${this.world.actors.find((a) => a.id === e.who)?.name ?? ''}: ¡puesto ${e.v}!` : '');
    else if (e.k === 'bounce') { const z = this.hongos.find((h) => e.x >= h.z.x - 4 && e.x <= h.z.x + h.z.w + 4 && Math.abs(e.y - (h.z.y + h.z.h / 2)) < 16); if (z) z.t = 0.18; }
    this.fx.handle(e, (id) => (id !== undefined ? this.colorById.get(id) ?? 0xffffff : 0xffffff));
    services.audio?.onFx(e);
  }

  private syncCamera(dt: number): void {
    const c = this.world.camera;
    const cam = this.cameras.main;
    cam.setScroll(Math.round(c.x), Math.round(c.y));
    this.backdrop.update(c.x, c.y, this.simClock);
    void dt;
  }

  private render(dt: number): void {
    const w = this.world;
    this.syncCamera(dt);
    for (const v of this.views.values()) {
      v.update(dt, this.simClock);
      const a = v.actor;
      if (a.act?.kind === 'power' && a.powerKind === 'rainbow') this.fx.trail('rainbow', a.x, a.y, a.z, this.simClock);
      else if (a.powerKind === 'zoom' && a.powerT > 0 && Math.hypot(a.vx, a.vy) > 40 && Math.floor(this.simClock * 30) % 3 === 0) this.fx.trail('dust', a.x - a.facing * 8, a.y, 0, this.simClock);
      else if (a.act?.kind === 'power' && a.powerKind === 'charge' && Math.floor(this.simClock * 30) % 2 === 0) this.fx.trail('dust', a.x - a.facing * 8, a.y, 0, this.simClock);
    }
    // moving platforms and hazards
    for (const bv of this.boxViews) {
      if (!bv.box.move) continue;
      const r = boxAt(bv.box, w.t);
      bv.top.setPosition(Math.round(r.x) + (bv.dx ?? 0), Math.round(r.y - bv.box.alto) + (bv.dy ?? 0)).setDepth(r.y - 0.1);
      bv.front?.setPosition(Math.round(r.x), Math.round(r.y + r.h - bv.box.alto)).setDepth(r.y + r.h);
    }
    for (const mv of this.moverViews) {
      const r = moverRect(mv.m, w.t);
      const f = Math.floor(w.t * 6) % 2;
      mv.img.setTexture(mv.frames[f]).setPosition(Math.round(r.x), Math.round(r.y - mv.m.alto)).setDepth(r.y + r.h);
    }
    for (const h of this.hongos) { h.t = Math.max(0, h.t - dt); h.img.setTexture(h.t > 0 ? 'hongo1' : 'hongo0'); }
    this.syncPinata();
    this.syncItems();
    this.syncShots();
    this.fx.update(dt);
    if (this.debugG) this.drawDebug();
    this.hudT += dt;
    if (this.hudT > 0.08) { this.hudT = 0; services.hud?.update(w, this); }
  }

  private syncPinata(): void {
    const img = this.pinataImg, p = this.world.data.pinata as { x: number; y: number; z: number; hp: number; max: number; broken: boolean; t: number } | undefined;
    if (!img || !p) return;
    img.setVisible(!p.broken);
    if (p.broken) return;
    img.setFrame(p.hp <= 24 ? 'pinata_open' : 'pinata');
    const hurt = Math.max(0, this.hitSwing);
    this.hitSwing = Math.max(0, this.hitSwing - 1 / 60 * 2.2);
    img.setPosition(Math.round(p.x + Math.sin(this.simClock * 2) * 2 + Math.sin(this.simClock * 24) * hurt * 4), Math.round(p.y - p.z)).setAngle(Math.sin(this.simClock * 2) * 3 + Math.sin(this.simClock * 18) * hurt * 14);
  }

  private syncItems(): void {
    const w = this.world;
    const live = new Set<number>();
    for (const it of w.items) {
      if (it.state === 'gone') continue;
      live.add(it.id);
      let v = this.itemViews.get(it.id);
      if (!v) {
        const tex = it.kind === 'ball' ? 'ball' : it.kind === 'star' ? 'star' : it.kind === 'gold' ? 'gold' : it.kind === 'box' ? 'gift' : 'target';
        const sh = this.add.image(0, 0, 'shadow').setScale(0.5, 0.7);
        const img = this.add.image(0, 0, tex).setOrigin(0.5, 1);
        v = { img, sh }; this.itemViews.set(it.id, v);
      }
      const bob = it.kind === 'star' || it.kind === 'gold' ? Math.sin(this.simClock * 4 + it.id) * 1.5 : 0;
      v.img.setPosition(Math.round(it.x), Math.round(it.y - it.z + bob)).setDepth(it.y + (it.state === 'carried' ? 20 : 0.2));
      const grounded = it.state !== 'carried';
      v.sh.setVisible(grounded).setPosition(Math.round(it.x), Math.round(it.y)).setDepth(it.y - 0.8).setAlpha(Math.max(0.2, 1 - it.z / 100));
    }
    for (const [id, v] of this.itemViews) if (!live.has(id)) { v.img.destroy(); v.sh.destroy(); this.itemViews.delete(id); }
  }

  private syncShots(): void {
    const live = new Set<number>();
    for (const s of this.world.shots) {
      if (s.t < 0) continue;
      live.add(s.id);
      let img = this.shotViews.get(s.id);
      if (!img) { img = this.add.image(0, 0, 'star').setTint(0xc9a5f7); this.shotViews.set(s.id, img); }
      img.setPosition(Math.round(s.x), Math.round(s.y - s.z)).setDepth(s.y + 30).setAngle((s.t * 540) % 360);
      if (Math.floor(s.t * 40) % 2 === 0) this.fx.trail('spark', s.x, s.y, s.z - 12, s.t);
    }
    for (const [id, img] of this.shotViews) if (!live.has(id)) { img.destroy(); this.shotViews.delete(id); }
  }

  private drawDebug(): void {
    const g = this.debugG!; g.clear();
    const w = this.world;
    g.lineStyle(1, 0xff0000, 1);
    for (const a of w.actors) {
      const fw = a.stats.footW;
      g.strokeRect(a.x - fw / 2, a.y - PHYS.footH / 2, fw, PHYS.footH);
      g.lineStyle(1, 0xffff00, 1); g.strokeRect(a.facing > 0 ? a.x : a.x - PHYS.pushReach, a.y - PHYS.pushDy, PHYS.pushReach, PHYS.pushDy * 2); g.lineStyle(1, 0xff0000, 1);
    }
    g.lineStyle(1, 0x00ff00, 1);
    for (const b of w.map.boxes) { const r = boxAt(b, w.t); g.strokeRect(r.x, r.y, r.w, r.h); }
    g.lineStyle(1, 0xff00ff, 1);
    for (const m of w.map.movers) { const r = moverRect(m, w.t); g.strokeRect(r.x, r.y, r.w, r.h); }
    g.lineStyle(1, 0x00ffff, 1);
    for (const p of w.map.pits) g.strokeRect(p.x, p.y, p.w, p.h);
    for (const q of w.map.water) g.strokeRect(q.x, q.y, q.w, q.h);
  }

  // ------------------------------------------------------------------ api for the app
  setPaused(p: boolean): void { this.paused = p; }
  result(): EventResult {
    const w = this.world;
    const actors: ActorResult[] = w.actors.map((a) => ({ id: a.id, charId: a.charId, slot: a.slot, control: this.cfg.roster.find((r) => r.slot === a.slot)?.control ?? a.control, stars: a.stats2.stars, gold: a.stats2.gold, points: a.stats2.points, falls: a.stats2.falls, bursts: a.stats2.bursts, hits: a.stats2.hits, finishT: a.finishT }));
    return { eventId: this.cfg.eventId, seconds: w.eventT, standings: w.rules.standings(w), actors };
  }
}
