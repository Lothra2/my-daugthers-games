import type { Actor, World } from '../core/world';
import type { EventScene } from '../view/scenes/EventScene';
import { CHAR_IDS } from '../core/types';
import { services } from '../app/services';

const A = (p: string): string => `${import.meta.env.BASE_URL}assets/${p}`;
const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** DOM overlay for the in-game HUD. Short Spanish text, big readable numbers (GAME_DESIGN section 1). */
export class Hud {
  private root: HTMLElement;
  private scene: EventScene | null = null;
  private chips = new Map<number, { el: HTMLElement; bar: HTMLElement; pow: HTMLElement; score: HTMLElement }>();
  private title!: HTMLElement; private timer!: HTMLElement; private goal!: HTMLElement; private lines!: HTMLElement;
  private bannerEl!: HTMLElement; private countEl!: HTMLElement; private arrows = new Map<number, HTMLElement>();
  private bannerT: number | undefined; private countT: number | undefined;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'hud'; this.root.className = 'hidden';
    document.getElementById('ui')!.appendChild(this.root);
  }

  attach(scene: EventScene): void {
    this.scene = scene;
    const w = scene.world;
    this.root.innerHTML = `
      <div class="hud-top">
        <div class="hud-left"><div class="hud-title"></div><div class="hud-goal"></div><div class="hud-lines"></div></div>
        <div class="hud-timer">0:00</div>
        <button class="hud-pause" aria-label="Pausa">II</button>
      </div>
      <div class="hud-chips"></div>
      <div class="hud-banner"></div><div class="hud-count"></div><div class="hud-arrows"></div>`;
    this.title = this.root.querySelector('.hud-title')!; this.goal = this.root.querySelector('.hud-goal')!; this.lines = this.root.querySelector('.hud-lines')!;
    this.timer = this.root.querySelector('.hud-timer')!; this.bannerEl = this.root.querySelector('.hud-banner')!; this.countEl = this.root.querySelector('.hud-count')!;
    const chips = this.root.querySelector('.hud-chips')!;
    this.chips.clear(); this.arrows.clear();
    for (const a of w.actors) {
      const row = CHAR_IDS.indexOf(a.charId);
      const el = document.createElement('div');
      el.className = 'chip' + (a.control === 'human' ? ' human' : '');
      el.style.setProperty('--c', hex(a.stats.colorHex));
      el.innerHTML = `<div class="chip-face" style="background-image:url(${A('ui/portraits.png')});background-position:0 -${row * 38}px"></div>
        <div class="chip-body"><div class="chip-name">${a.name}</div><div class="chip-bar"><i></i></div><div class="chip-pow"><i></i></div></div><div class="chip-score"></div>`;
      chips.appendChild(el);
      this.chips.set(a.id, { el, bar: el.querySelector('.chip-bar i')!, pow: el.querySelector('.chip-pow i')!, score: el.querySelector('.chip-score')! });
      const ar = document.createElement('div'); ar.className = 'arrow'; ar.style.setProperty('--c', hex(a.stats.colorHex)); ar.style.display = 'none';
      ar.innerHTML = `<span class="arrow-face" style="background-image:url(${A('ui/portraits.png')});background-position:0 -${row * 30}px"></span>`;
      this.root.querySelector('.hud-arrows')!.appendChild(ar); this.arrows.set(a.id, ar);
    }
    this.root.querySelector('.hud-pause')!.addEventListener('pointerdown', (e) => { e.preventDefault(); services.router?.pause(); });
    this.root.classList.remove('hidden');
    this.update(w, scene);
  }

  detach(): void { this.root.classList.add('hidden'); this.scene = null; }

  update(w: World, scene: EventScene): void {
    const m = w.rules.hud(w);
    this.title.textContent = m.title; this.goal.textContent = m.goalText ?? ''; this.timer.textContent = m.timer;
    this.lines.textContent = m.lines.filter(Boolean).join(' · ');
    for (const a of w.actors) {
      const c = this.chips.get(a.id); if (!c) continue;
      const p = m.progress?.[a.id];
      c.bar.style.width = p === undefined ? '0%' : `${Math.round(p * 100)}%`;
      c.el.classList.toggle('noprog', p === undefined);
      c.pow.style.width = `${Math.round(a.power)}%`;
      c.pow.parentElement!.classList.toggle('full', a.power >= 100);
      c.score.textContent = m.scores?.[a.id] ?? '';
    }
    this.updateArrows(w, scene);
  }

  private updateArrows(w: World, scene: EventScene): void {
    const canvas = scene.game.canvas; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const k = rect.width / scene.scale.width;
    const cam = w.camera;
    for (const a of w.actors) {
      const ar = this.arrows.get(a.id); if (!ar) continue;
      const sx = (a.x - cam.x) * k, sy = (a.y - a.z - cam.y) * k;
      const off = sx < 6 * k || sx > rect.width - 6 * k;
      if (!off || a.finished) { ar.style.display = 'none'; continue; }
      ar.style.display = 'flex';
      const left = sx < 6 * k;
      ar.classList.toggle('left', left); ar.classList.toggle('right', !left);
      ar.style.top = `${Math.max(70, Math.min(rect.height - 90, sy)) + rect.top - 16}px`;
      ar.style.left = left ? `${rect.left + 6}px` : `${rect.right - 70}px`;
    }
  }

  banner(text: string, ms = 1700): void {
    if (!text) return;
    this.bannerEl.textContent = text; this.bannerEl.classList.add('show');
    window.clearTimeout(this.bannerT); this.bannerT = window.setTimeout(() => this.bannerEl.classList.remove('show'), ms);
  }

  count(n: number): void {
    this.countEl.textContent = n > 0 ? String(n) : '¡YA!';
    this.countEl.classList.remove('pop'); void this.countEl.offsetWidth; this.countEl.classList.add('pop', 'show');
    window.clearTimeout(this.countT);
    this.countT = window.setTimeout(() => this.countEl.classList.remove('show'), n > 0 ? 900 : 800);
  }
}
export type { Actor };
