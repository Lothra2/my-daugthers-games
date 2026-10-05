import Phaser from 'phaser';
import { PHYS, POWER } from '../core/data';
import type { Actor } from '../core/world';
import { LoopClock } from './anim';

export interface AnimMeta { start: number; frames: number; fps: number; loop: boolean }
export interface SpriteMeta { cell: [number, number]; pivot: [number, number]; anims: Record<string, AnimMeta> }

const HUMAN = {
  idle: 'idle', walk: 'walk', run: 'run', rise: 'jump_rise', apex: 'jump_apex', fall: 'jump_fall', takeoff: 'jump_takeoff', land: 'land', swim: 'swim',
  pickup: 'pickup', carryIdle: 'carry_idle', carryRun: 'carry_run', throw: 'throw', push: 'push', bop: 'bop', stagger: 'stagger', tumble: 'tumble',
  rescue: 'rescue_pose', power: 'power', celebrate: 'celebrate',
};
const DOG = {
  idle: 'sit_idle', walk: 'walk', run: 'run', rise: 'jump_rise', apex: 'jump_apex', fall: 'jump_fall', takeoff: 'jump_takeoff', land: 'land', swim: 'swim_paddle',
  pickup: 'fetch', carryIdle: 'walk', carryRun: 'carry_run', throw: 'toss', push: 'headpush', bop: 'bop', stagger: 'stagger', tumble: 'roll',
  rescue: 'rescue_pose', power: 'zoomies', celebrate: 'celebrate_tailchase',
};

/** Frame index inside an atlas row for a looping or progress-driven animation. */
export function frameOf(meta: SpriteMeta, name: string, clock: number, progress?: number): number {
  const a = meta.anims[name] ?? meta.anims.idle;
  if (progress !== undefined) return a.start + Math.min(a.frames - 1, Math.floor(Math.max(0, Math.min(0.999, progress)) * a.frames));
  if (a.frames <= 1) return a.start;
  const i = Math.floor(clock * Math.max(1, a.fps)) % a.frames;
  return a.start + i;
}

/** One-shot actions that must stay on screen long enough to be seen: every pose lasts at least this long (seconds), even when the game action itself is shorter. */
const MIN_POSE = 0.07;
const SHORT_ACTIONS = new Set(['pickup', 'throw', 'push', 'stagger', 'power']);
const AFTER_ACTION = new Set(['idle', 'walk', 'run', 'carry']);
/** A runner whose input drops to zero for a moment (the AI does it often, a thumb sliding on the joystick too) keeps its legs moving this long before the standing pose appears. */
const IDLE_DELAY = 0.1;

export class CharacterView {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
  readonly ring: Phaser.GameObjects.Image;
  readonly marker: Phaser.GameObjects.Image | null;
  readonly bubble: Phaser.GameObjects.Image;
  private clock = 0;
  private loops = new LoopClock();
  private prevState = '';
  private locoName: string | null = null;   // walk or run pose shown last, kept for IDLE_DELAY after the speed reaches zero
  private idleT = 0;
  private actT = 0;                                                  // seconds since the current one-shot action began
  private hold: { name: string; frames: number; visual: number } | null = null;   // an action cut short by the game, finished on screen
  private meta: SpriteMeta;
  private names: typeof HUMAN;

  constructor(private scene: Phaser.Scene, public actor: Actor, meta: SpriteMeta, color: number, humanSlot: number | null) {
    this.meta = meta;
    this.names = actor.stats.isDog ? DOG : HUMAN;
    this.shadow = scene.add.image(0, 0, 'shadow').setOrigin(0.5, 0.5);
    this.ring = scene.add.image(0, 0, 'ring').setOrigin(0.5, 0.5).setTint(color).setAlpha(0.95);
    this.sprite = scene.add.sprite(0, 0, actor.outfit === 'base' ? `char_${actor.charId}` : `char_${actor.charId}_${actor.outfit}`, 0).setOrigin(meta.pivot[0] / meta.cell[0], meta.pivot[1] / meta.cell[1]);
    this.bubble = scene.add.image(0, 0, 'bubble').setOrigin(0.5, 0.62).setVisible(false);
    this.marker = humanSlot !== null ? scene.add.image(0, 0, 'arrow').setTint(color).setOrigin(0.5, 1) : null;
    if (this.marker) this.marker.setVisible(true);
  }

  destroy(): void { this.sprite.destroy(); this.shadow.destroy(); this.ring.destroy(); this.bubble.destroy(); this.marker?.destroy(); }

  update(dt: number, simT: number): void {
    const a = this.actor, n = this.names;
    this.clock += dt;
    const speed = Math.hypot(a.vx, a.vy);
    let name = n.idle, prog: number | undefined;
    let loop = false, want = 1;   // loop: the animation cycles; want: the speed it should cycle at
    const act = a.act;
    switch (a.state) {
      case 'idle': name = n.idle; loop = true; break;
      case 'walk': name = n.walk; loop = true; want = Math.max(0.6, speed / PHYS.walk); break;
      case 'run': name = n.run; loop = true; want = Math.max(0.7, Math.min(1.25, speed / a.stats.run)); break;
      case 'jumpRise': name = a.stateT < 0.07 ? n.takeoff : Math.abs(a.vz) < 60 ? n.apex : n.rise; break;
      case 'jumpFall': name = Math.abs(a.vz) < 60 ? n.apex : n.fall; break;
      case 'land': name = n.land; break;
      case 'swim': name = n.swim; loop = true; want = Math.max(0.7, speed / 40); break;
      case 'pickup': name = n.pickup; prog = act ? act.t / act.dur : 0; break;
      case 'carry': name = speed > 10 ? n.carryRun : n.carryIdle; loop = true; want = Math.max(0.7, speed / a.stats.run); break;
      case 'throw': name = n.throw; prog = act ? act.t / act.dur : 0; break;
      case 'push': name = n.push; prog = act ? act.t / act.dur : 0; break;
      case 'bop': name = n.bop; break;
      case 'stagger': name = n.stagger; prog = act ? act.t / act.dur : 0; break;
      case 'tumble': name = n.tumble; prog = act ? act.t / ((PHYS.tumbleFall + PHYS.tumbleLie) * a.stats.getup) : 0; break;
      case 'getup': name = n.land; break;
      case 'fall': name = n.fall; break;
      case 'rescue': name = n.rescue; break;
      case 'power': name = n.power; prog = act ? act.t / act.dur : 0; if (a.stats.isDog) { prog = undefined; loop = true; } break;
      case 'celebrate': case 'finished': name = n.celebrate; loop = true; break;
    }
    if (a.powerKind === 'zoom' && a.powerT > 0 && (a.state === 'run' || a.state === 'walk')) { name = n.power; loop = true; }
    // the pace follows the real speed but eases toward it, so a change of input never makes the legs stutter
    const moving = a.state === 'walk' || a.state === 'run' || (a.state === 'carry' && name === n.carryRun);
    const still = a.state === 'idle' || (a.state === 'carry' && name === n.carryIdle);
    if (moving) { this.locoName = name; this.idleT = 0; }
    else if (still && this.locoName && a.grounded && !a.act && (a.state === 'carry') === (this.locoName === n.carryRun)) {
      this.idleT += dt;
      if (this.idleT < IDLE_DELAY) { name = this.locoName; loop = true; want = 0.7; } else this.locoName = null;
    } else this.locoName = null;
    // one-shot actions: stretch the poses of a very short action (Alana's instant pickup lasts 0.1 s for 3 poses) to MIN_POSE each, purely visual
    if (a.state !== this.prevState) { if (!(this.hold && AFTER_ACTION.has(a.state))) this.actT = 0; this.prevState = a.state; }
    const inAction = SHORT_ACTIONS.has(a.state) && prog !== undefined && !!act;
    if (inAction) {
      this.actT += dt;
      const frames = this.meta.anims[name]?.frames ?? 1, visual = Math.max(act!.dur, frames * MIN_POSE);
      if (visual > act!.dur) prog = this.actT / visual;
      this.hold = visual > act!.dur ? { name, frames, visual } : null;
    } else if (this.hold && AFTER_ACTION.has(a.state)) {
      this.actT += dt;
      if (this.actT >= this.hold.visual) this.hold = null;
      else { name = this.hold.name; prog = this.actT / this.hold.visual; loop = false; }
    } else this.hold = null;
    this.loops.ease(want, dt);
    const frame = prog !== undefined ? frameOf(this.meta, name, this.clock, prog) : loop ? this.loops.frame(this.meta.anims, name, dt) : frameOf(this.meta, name, this.clock);
    this.sprite.setFrame(frame);
    this.sprite.setFlipX(a.facing < 0);

    const sx = Math.round(a.x), baseY = Math.round(a.y);
    const sy = Math.round(a.y - a.z);
    let scale = 1, alpha = 1;
    if (a.state === 'fall' && act) { scale = Math.max(0.1, 1 - act.t / act.dur); alpha = scale; }
    this.sprite.setPosition(sx, sy);
    this.sprite.setScale(scale);
    this.sprite.setDepth(baseY);
    if (a.protectT > 0 && a.immuneT <= 0 && !(act && act.kind === 'rescue')) alpha = Math.floor(simT * 10) % 2 === 0 ? 0.72 : 1;
    this.sprite.setAlpha(alpha);
    // shadow stays on the ground and shrinks with height, which is the landing reference
    const h = Math.max(0, a.z);
    const ground = Math.round(a.y);
    this.shadow.setPosition(sx, ground).setDepth(baseY - 1).setScale(Math.max(0.4, 1 - h / 120) * (a.stats.isDog ? 1.2 : 1), 1).setAlpha(Math.max(0.3, 1 - h / 140));
    this.shadow.setVisible(!(a.state === 'rescue') && !(a.state === 'fall' && scale < 0.3));
    this.ring.setPosition(sx, ground + 1).setDepth(baseY - 0.5).setScale(a.stats.isDog ? 0.95 : 0.8, 0.75).setVisible(!(a.state === 'rescue'));
    if (this.marker) {
      const top = sy - (a.stats.isDog ? 36 : this.meta.cell[1] - 4);
      this.marker.setPosition(sx, top - 2 + Math.round(Math.sin(simT * 6) * 1.5)).setDepth(90000).setVisible(!a.finished);
    }
    // bubbles: rescue ride, Alana's protective bubble
    const inRescue = a.act?.kind === 'rescue';
    const prot = a.powerKind === 'bubble' && a.powerT > 0;
    this.bubble.setVisible(inRescue || prot);
    if (inRescue || prot) {
      const wob = 1 + Math.sin(simT * 8) * 0.04;
      this.bubble.setPosition(sx, sy - (prot ? 12 : 8)).setDepth(baseY + 2).setScale((prot ? 1.15 : 1.0) * wob, (prot ? 1.15 : 1.0) / wob).setAlpha(prot ? Math.min(1, a.powerT / 0.6) * 0.9 : 0.95);
    }
    void POWER;
  }
}
