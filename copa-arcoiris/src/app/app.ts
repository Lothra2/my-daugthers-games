import Phaser from 'phaser';
import { Cup, placeMessage, trophyForPlace } from '../core/competition';
import { CHARS, type Difficulty } from '../core/data';
import { Rng } from '../core/rng';
import { betterMedal, levelForXp, medalForRank, outfitsFor, unlocksBetween, xpForEvent, xpToNext, LEVEL_XP, type Outfit } from '../core/progression';
import { CHAR_IDS, EVENT_ORDER, type CharId, type EventId } from '../core/types';
import type { RosterEntry } from '../core/world';
import { CHAR_INFO, EVENT_INFO, EVENT_RESULT_MSG, CUP_MSG, CUP_MSG_BOY } from '../data/text.es';
import { KeyboardInput } from '../input/keyboard';
import type { InputRouter } from '../input/router';
import type { TouchUI } from '../input/touch';
import { SaveStore } from '../save/save';
import { Hud } from '../ui/hud';
import { icon } from '../ui/icons';
import type { EventScene } from '../view/scenes/EventScene';
import type { EventConfig, EventResult } from './types';
import { services } from './services';

const A = (p: string): string => `${import.meta.env.BASE_URL}assets/${p}`;
const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
const fmtMs = (ms: number): string => { const s = ms / 1000; return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };

interface Session {
  mode: 'cup' | 'warmup';
  players: 1 | 2;
  picks: CharId[];
  seed: number;
  cup: Cup;
  roster: RosterEntry[];
  idx: number;
  xpGain: Record<string, number>;
  levelsBefore: Record<string, number>;
  results: EventResult[];
  current: EventId | null;
  cfg: EventConfig | null;
  single: EventId | null;
}

export interface AppDeps { game: Phaser.Game; router: InputRouter; kb: KeyboardInput; touch: TouchUI; store: SaveStore; hud: Hud; params: URLSearchParams }

export class App {
  private box: HTMLElement;
  private session: Session | null = null;
  private paused = false;
  private inEvent = false;
  private picks: CharId[] = [];
  private players: 1 | 2 = 1;
  private pickMode: 'cup' | 'warmup' = 'cup';
  private cupCount = 0;
  private padMsgT: number | undefined;

  constructor(private d: AppDeps) {
    this.box = document.createElement('div');
    this.box.id = 'screens';
    document.getElementById('ui')!.appendChild(this.box);
    d.game.events.on('event-done', (r: EventResult) => this.onEventDone(r));
    d.router.onPause(() => this.onPauseKey());
    const autoPause = () => { if (this.inEvent && !this.paused) this.pause(); d.router.releaseAll(); d.touch.releaseAll(); };
    window.addEventListener('blur', autoPause);
    window.addEventListener('pagehide', autoPause);
    document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth * 1.05 && d.touch.coarse;
      document.getElementById('rotate')?.classList.toggle('on', portrait);
      if (portrait) autoPause();
    };
    window.addEventListener('resize', checkOrientation); window.addEventListener('orientationchange', checkOrientation); checkOrientation();
  }

  get isPaused(): boolean { return this.paused; }
  get isInEvent(): boolean { return this.inEvent; }
  private get save() { return this.d.store.data; }
  private persist(): void { this.d.store.save(); }

  // ------------------------------------------------------------------ helpers
  private show(html: string, cls = ''): HTMLElement {
    this.box.className = cls; this.box.innerHTML = html; this.box.classList.remove('hidden');
    return this.box;
  }
  private hide(): void { this.box.classList.add('hidden'); this.box.innerHTML = ''; }
  private on(sel: string, fn: (el: HTMLElement) => void): void { this.box.querySelectorAll<HTMLElement>(sel).forEach((el) => el.addEventListener('click', () => { services.audio?.ui('click'); fn(el); })); }
  private portrait(c: CharId, expr = 0, size = 96): string {
    const row = CHAR_IDS.indexOf(c);
    return `<div class="portrait" style="width:${size}px;height:${size}px;background-image:url(${A('ui/portraits.png')});background-size:${size * 4}px auto;background-position:-${expr * size}px -${row * size}px"></div>`;
  }
  private isTouch(): boolean { return this.d.touch.coarse; }

  // ------------------------------------------------------------------ entry
  start(): void {
    this.d.store.load();
    const p = this.d.params;
    this.applySettings();
    if (p.get('autostart')) { this.autostart(); return; }
    this.d.game.scene.start('Title');
    this.splash();
    if (this.d.store.status === 'recovered') this.toast('Tu progreso anterior no se pudo leer. Empezamos limpio, guardé una copia.');
    else if (this.d.store.status === 'memory') this.toast('Tu progreso no se guardará en este navegador.');
  }

  private autostart(): void {
    const p = this.d.params;
    const raw = p.get('autostart')!;
    const mode = (raw === 'event' ? 'cup' : raw) as 'cup' | 'warmup';
    const chars = (p.get('chars') ?? 'sophie').split(',') as CharId[];
    this.players = (chars.length > 1 ? 2 : 1) as 1 | 2;
    if (p.get('players')) this.players = Number(p.get('players')) as 1 | 2;
    this.picks = chars.slice(0, this.players);
    this.pickMode = mode;
    this.beginSession(mode);
    if (raw === 'event' && this.session) { this.session.single = p.get('event') as EventId; this.session.mode = 'cup'; this.runEvent(this.session.single); }
  }

  private toast(text: string, ms = 4200): void {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
    document.getElementById('ui')!.appendChild(t);
    window.setTimeout(() => t.classList.add('show'), 20);
    window.setTimeout(() => { t.classList.remove('show'); window.setTimeout(() => t.remove(), 400); }, ms);
  }

  applySettings(): void {
    const s = this.save.settings;
    services.audio?.setVolumes(s.music, s.sfx, s.muted);
    this.d.touch.setMode(s.touchControls);
  }

  // ------------------------------------------------------------------ screens
  private splash(): void {
    this.show(`<div class="splash"><h1 class="logo"><span>La Copa del</span><b>Bosque Arcoíris</b></h1>
      <p class="sub">Un juego para jugar en familia</p>
      <button class="btn big primary pulse" id="go">¡Toca para empezar!</button></div>`, 'screen center');
    const go = () => { services.audio?.unlock(); this.menu(); };
    this.on('#go', go);
  }

  menu(): void {
    this.setInEvent(false);
    this.d.game.scene.stop('Event');
    if (!this.d.game.scene.isActive('Title')) this.d.game.scene.start('Title');
    services.audio?.music('menu');
    const cups = this.save.records.cupsWon;
    this.show(`<div class="menu"><h1 class="logo small"><span>La Copa del</span><b>Bosque Arcoíris</b></h1>
      <div class="menu-btns">
        <button class="btn big primary" data-a="cup">Jugar la Copa</button>
        <button class="btn big" data-a="warmup">Calentamiento</button>
        <button class="btn big" data-a="records">Récords</button>
        <button class="btn big" data-a="wardrobe">Vestuario</button>
        <button class="btn big" data-a="settings">Ajustes</button>
      </div>
      <p class="foot">Copas ganadas: ${cups}</p></div>`, 'screen center');
    this.on('[data-a]', (el) => {
      const a = el.dataset.a;
      if (a === 'cup' || a === 'warmup') { this.pickMode = a; this.askPlayers(); }
      else if (a === 'records') this.records();
      else if (a === 'wardrobe') this.wardrobe();
      else this.settings(() => this.menu());
    });
  }

  private askPlayers(): void {
    this.show(`<div class="panel"><h2>¿Cuántos juegan?</h2><div class="row">
      <button class="btn huge" data-n="1"><span class="big-n">1</span>jugador</button>
      <button class="btn huge" data-n="2"><span class="big-n">2</span>jugadores</button></div>
      <button class="btn small ghost" id="back">Volver</button></div>`, 'screen center');
    this.on('[data-n]', (el) => { this.players = Number(el.dataset.n) as 1 | 2; this.picks = []; this.pickChar(0); });
    this.on('#back', () => this.menu());
  }

  private pickChar(slot: number): void {
    const who = this.players === 1 ? 'Elige a tu personaje' : `Jugador ${slot + 1}: elige a tu personaje`;
    const cards = CHAR_IDS.map((c) => {
      const info = CHAR_INFO[c], cs = this.save.characters[c];
      const taken = this.picks.includes(c);
      const next = xpToNext(cs.xp);
      const pct = next === null ? 100 : Math.round(((cs.xp - LEVEL_XP[cs.level - 1]) / (LEVEL_XP[cs.level] - LEVEL_XP[cs.level - 1])) * 100);
      return `<button class="card${taken ? ' taken' : ''}" data-c="${c}" style="--c:${CHARS[c].color}" ${taken ? 'disabled' : ''}>
        ${this.portrait(c, 0, 96)}<b>${info.name}</b><i>${info.tag}</i>
        <span class="lv">Nivel ${cs.level}</span><span class="xpbar"><u style="width:${pct}%"></u></span>
        <small>${info.power}</small></button>`;
    }).join('');
    this.show(`<div class="panel wide"><h2 style="color:${['#2c9a3a', '#c4408b'][slot]}">${who}</h2><div class="cards">${cards}</div>
      <button class="btn small ghost" id="back">Volver</button></div>`, 'screen center');
    this.on('[data-c]', (el) => {
      this.picks.push(el.dataset.c as CharId);
      if (this.picks.length < this.players) this.pickChar(slot + 1);
      else this.controlsCard();
    });
    this.on('#back', () => { this.picks = []; this.askPlayers(); });
  }

  private controlsCard(): void {
    const touch = this.isTouch();
    const kb = (rows: [string, string][]) => rows.map(([k, v]) => `<tr><td>${v}</td><td><kbd>${k.split('/').join('</kbd> <kbd>')}</kbd></td></tr>`).join('');
    let body: string;
    if (this.players === 1) {
      body = touch
        ? `<ul class="how"><li><b>Mover</b>: dedo izquierdo, en cualquier lugar de la mitad izquierda</li><li><b>Saltar</b>: botón grande de la derecha</li><li><b>Acción</b>: recoge, lanza o empuja</li><li><b>Poder</b>: cuando la barra amarilla brilla</li></ul>`
        : `<table class="keys">${kb([['W/A/S/D', 'Mover'], ['Espacio', 'Saltar'], ['K', 'Acción: recoge, lanza o empuja'], ['L', 'Poder (barra amarilla llena)'], ['Esc', 'Pausa']])}</table><p class="foot">También sirven las flechas y un mando.</p>`;
    } else {
      body = touch
        ? `<p>Cada jugador usa su mitad de la pantalla: <b>joystick a un lado y botones al otro</b>.</p>`
        : `<div class="two"><div><h3>Jugador 1</h3><table class="keys">${kb([['W/A/S/D', 'Mover'], ['F', 'Saltar'], ['G', 'Acción'], ['H', 'Poder']])}</table></div>
           <div><h3>Jugador 2</h3><table class="keys">${kb([['↑/←/↓/→', 'Mover'], [',', 'Saltar'], ['.', 'Acción'], ['/', 'Poder']])}</table></div></div>`;
    }
    this.show(`<div class="panel"><div class="host">${this.portrait('thor', 2, 96)}<div class="bubble">¡Así se juega!</div></div>${body}
      <div class="row"><button class="btn big primary" id="ok">¡Listo!</button></div></div>`, 'screen center');
    this.on('#ok', () => this.beginSession(this.pickMode));
  }

  // ------------------------------------------------------------------ session
  private beginSession(mode: 'cup' | 'warmup'): void {
    const seed = (Date.now() + this.cupCount * 7919) % 100000;
    this.cupCount++;
    const rng = new Rng(Number(this.d.params.get('seed') ?? seed));
    const rest = rng.shuffle(CHAR_IDS.filter((c) => !this.picks.includes(c))).slice(0, 4 - this.players);
    const roster: RosterEntry[] = [
      ...this.picks.map((c, i): RosterEntry => ({ charId: c, control: 'human', slot: i, level: this.save.characters[c].level, outfit: this.save.characters[c].outfit })),
      ...rest.map((c, i): RosterEntry => ({ charId: c, control: 'ai', slot: this.players + i })),
    ];
    this.session = {
      mode, players: this.players, picks: [...this.picks], seed: Number(this.d.params.get('seed') ?? seed), cup: new Cup(roster), roster, idx: 0,
      xpGain: {}, levelsBefore: Object.fromEntries(this.picks.map((c) => [c, this.save.characters[c].level])), results: [], current: null, cfg: null, single: null,
    };
    if (this.d.params.get('autostart') === 'event') return;
    if (mode === 'warmup' || !this.save.stats.warmupDone) this.runEvent('warmup');
    else this.runEvent(EVENT_ORDER[0]);
  }

  private runEvent(id: EventId): void {
    const s = this.session!;
    s.current = id;
    const difficulty: Difficulty = this.save.settings.difficulty;
    s.cfg = {
      eventId: id, roster: s.roster, seed: s.seed + (id === 'warmup' ? 0 : EVENT_ORDER.indexOf(id) * 101 + 3), difficulty,
      debug: { hitboxes: this.d.params.has('hitboxes'), ff: Number(this.d.params.get('ff') ?? 1), autoplay: this.d.params.has('autoplay') },
    };
    if (this.d.params.has('skipIntro')) { this.startScene(); return; }
    const info = EVENT_INFO[id];
    const n = id === 'warmup' ? '' : `Prueba ${EVENT_ORDER.indexOf(id) + 1} de 4`;
    this.show(`<div class="panel intro"><div class="host">${this.portrait('thor', 2, 112)}<div class="bubble">${n ? `<small>${n}</small>` : ''}<b>${info.name}</b><span>${info.line}</span></div></div>
      <p class="hint">${info.hint}</p><div class="row"><button class="btn big primary" id="go">¡Vamos!</button></div></div>`, 'screen center');
    services.audio?.music(null);
    this.on('#go', () => this.startScene());
  }

  private setInEvent(v: boolean): void {
    this.inEvent = v;
    this.d.kb.active = v;
    this.d.touch.show(v);
    if (!v) { this.d.hud.detach(); this.paused = false; }
  }

  private startScene(): void {
    const s = this.session!, cfg = s.cfg!;
    this.hide();
    this.d.kb.mode = s.players === 2 ? '2p' : '1p';
    this.d.touch.configure(s.players, this.save.settings.mirrorP2);
    const pad = (window as any).__copa?.pad; if (pad) pad.slots = s.players;
    (this.d.game.scene.getScene('Title') as Phaser.Scene).scene.stop();
    this.d.game.scene.stop('Event');
    this.setInEvent(true);
    this.paused = false;
    services.audio?.music(cfg.eventId === 'warmup' ? 'menu' : cfg.eventId);
    this.d.game.scene.start('Event', cfg);
  }

  private scene(): EventScene | null { return this.d.game.scene.isActive('Event') ? (this.d.game.scene.getScene('Event') as EventScene) : null; }

  // ------------------------------------------------------------------ pause
  private onPauseKey(): void {
    if (!this.inEvent) return;
    if (this.paused) this.resume(); else this.pause();
  }
  pause(): void {
    if (!this.inEvent || this.paused) return;
    this.paused = true; this.scene()?.setPaused(true); this.d.router.releaseAll(); this.d.touch.releaseAll();
    services.audio?.pause(true);
    this.show(`<div class="panel pause"><h2>Pausa</h2><div class="col">
      <button class="btn big primary" id="resume">Seguir jugando</button>
      <button class="btn big" id="restart">Repetir la prueba</button>
      <button class="btn big" id="opts">Ajustes</button>
      <button class="btn big ghost" id="quit">Salir al menú</button></div></div>`, 'screen center dim');
    this.on('#resume', () => this.resume());
    this.on('#restart', () => { this.hide(); this.paused = false; services.audio?.pause(false); this.startScene(); });
    this.on('#opts', () => this.settings(() => this.pause2()));
    this.on('#quit', () => { this.session = null; services.audio?.pause(false); this.menu(); });
  }
  private pause2(): void { this.paused = false; this.pause(); }
  resume(): void {
    if (!this.paused) return;
    this.paused = false; this.hide(); this.scene()?.setPaused(false); services.audio?.pause(false);
  }
  /** A gamepad was unplugged during play. */
  padLost(): void {
    if (this.inEvent && !this.paused) { this.pause(); this.toast('Se desconectó el mando. Conéctalo o toca la pantalla para seguir.', 5000); }
  }

  // ------------------------------------------------------------------ results
  private onEventDone(r: EventResult): void {
    const s = this.session; if (!s) return;
    this.setInEvent(false);
    services.audio?.music(null);
    s.results.push(r);
    if (r.eventId === 'warmup') {
      this.save.stats.warmupDone = true; this.persist();
      if (s.mode === 'cup') { this.show(`<div class="panel"><div class="host">${this.portrait('thor', 1, 112)}<div class="bubble"><b>¡Calentamiento listo!</b><span>Ahora sí, ¡empieza la Copa!</span></div></div><div class="row"><button class="btn big primary" id="go">¡A la copa!</button></div></div>`, 'screen center'); this.on('#go', () => this.runEvent(EVENT_ORDER[0])); }
      else { this.show(`<div class="panel"><div class="host">${this.portrait('thor', 1, 112)}<div class="bubble"><b>¡Muy bien!</b><span>Ya sabes jugar. ¡Vamos por la copa!</span></div></div><div class="row"><button class="btn big primary" id="go">Ir a la copa</button><button class="btn big" id="menu">Menú</button></div></div>`, 'screen center'); this.on('#go', () => { this.pickMode = 'cup'; this.session!.mode = 'cup'; this.runEvent(EVENT_ORDER[0]); }); this.on('#menu', () => this.menu()); }
      return;
    }
    const ev = r.eventId;
    const idToChar = new Map(r.actors.map((a) => [a.id, a]));
    const ranks = r.standings.map((st) => ({ charId: idToChar.get(st.actorId)!.charId as CharId, rank: st.rank }));
    s.cup.addEvent(ev, ranks);
    // progress for the human characters
    const humanLines: string[] = [];
    for (const a of r.actors) {
      if (a.control !== 'human') continue;
      const rank = ranks.find((x) => x.charId === a.charId)!.rank;
      const xp = xpForEvent(rank, a.stars + a.gold);
      s.xpGain[a.charId] = (s.xpGain[a.charId] ?? 0) + xp;
      const cs = this.save.characters[a.charId as CharId];
      cs.xp += xp; cs.level = levelForXp(cs.xp);
      const m = betterMedal(this.save.medals[a.charId as CharId][ev], medalForRank(rank));
      if (m) this.save.medals[a.charId as CharId][ev] = m;
      const rec = this.save.records;
      if (ev === 'race' && a.finishT !== null) { const ms = Math.round(a.finishT * 1000); if (rec.raceBestMs === undefined || ms < rec.raceBestMs) rec.raceBestMs = ms; }
      if (ev === 'circuit') rec.circuitBest = Math.max(rec.circuitBest ?? 0, a.points + a.gold);
      if (ev === 'pinata') rec.pinataBest = Math.max(rec.pinataBest ?? 0, a.stars + a.gold);
      if (ev === 'arena') rec.arenaBest = Math.max(rec.arenaBest ?? 0, a.points);
      humanLines.push(`<div class="xp" style="--c:${CHARS[a.charId as CharId].color}"><b>${CHARS[a.charId as CharId].name}</b> ganó <b>+${xp} XP</b></div>`);
    }
    this.persist();
    const rows = r.standings.map((st) => {
      const a = idToChar.get(st.actorId)!; const c = a.charId as CharId;
      const pts = [10, 7, 5, 3][st.rank - 1];
      const you = a.control === 'human';
      return `<div class="rrow${you ? ' you' : ''}" style="--c:${CHARS[c].color}"><span class="place">${st.rank}</span>${this.portrait(c, st.rank === 1 ? 1 : 0, 56)}
        <b>${CHARS[c].name}${you ? ' <em>(tú)</em>' : ''}</b><span class="detail">${this.detailFor(ev, st.detail, a)}</span><span class="pts">+${pts}</span></div>`;
    }).join('');
    const human = r.actors.find((a) => a.control === 'human')!;
    const myRank = ranks.find((x) => x.charId === human.charId)!.rank;
    const info = EVENT_INFO[ev];
    this.show(`<div class="panel wide results"><h2>${info.name}</h2><p class="msg">${EVENT_RESULT_MSG[Math.min(3, myRank - 1)]}</p>
      <div class="rlist">${rows}</div><div class="xps">${humanLines.join('')}</div>
      <div class="row"><button class="btn big primary" id="next">${s.single ? 'Menú' : s.cup.order.length >= 4 ? 'Ver la copa' : 'Siguiente prueba'}</button></div></div>`, 'screen center');
    services.audio?.ui('fanfare');
    window.setTimeout(() => { if (this.session === s) services.audio?.music('podium'); }, 1900);
    this.on('#next', () => { if (s.single) { this.session = null; this.menu(); } else if (s.cup.order.length >= 4) this.cupFinal(); else this.runEvent(EVENT_ORDER[s.cup.order.length]); });
  }

  private detailFor(ev: EventId, base: string, a: { stars: number; gold: number; points: number; bursts: number }): string {
    if (ev === 'pinata') return `${a.stars + a.gold} ★`;
    if (ev === 'arena') return `${a.bursts} burbujazos`;
    if (ev === 'circuit') return `${a.points + a.gold} pts`;
    return base === '--' ? 'en burbuja' : base;
  }

  private cupFinal(): void {
    const s = this.session!;
    const st = s.cup.standings();
    const you = st.find((e) => e.control === 'human')!;
    const humans = st.filter((e) => e.control === 'human');
    // unlocks
    const unlockLines: string[] = [];
    for (const h of humans) {
      const now = this.save.characters[h.charId].level, before = s.levelsBefore[h.charId] ?? 1;
      const ups = unlocksBetween(before, now);
      if (ups.length === 1) unlockLines.push(`<div class="unlock"><b>${CHARS[h.charId].name}</b> subió al nivel ${ups[0].level}: <b>${ups[0].name}</b>. ${ups[0].description}</div>`);
      else if (ups.length > 1) unlockLines.push(`<div class="unlock"><b>${CHARS[h.charId].name}</b> subió al nivel ${ups[ups.length - 1].level} y ganó: <b>${ups.map((u) => u.name).join('</b> y <b>')}</b>.</div>`);
      if (outfitsFor(now).length > 1 && this.save.characters[h.charId].outfit === 'base' && now > before) this.save.characters[h.charId].outfit = 'base';
    }
    this.save.stats.cupsPlayed++;
    if (st[0].control === 'human') this.save.records.cupsWon++;
    this.persist();
    const order = [st[1], st[0], st[2]].filter(Boolean);
    const heights = { 1: 96, 2: 72, 3: 54 } as Record<number, number>;
    const gold = humans.some((h) => h.place === 1 && this.save.characters[h.charId].level >= 5);
    const podium = order.map((e) => {
      const place = e.place; const c = e.charId;
      return `<div class="step p${place}" style="--c:${CHARS[c].color}">${gold && place === 1 ? '<div class="crown">♛</div>' : ''}${this.portrait(c, place === 1 ? 1 : 0, 64)}<b>${CHARS[c].name}</b>
        <img class="trophy" alt="" src="${icon(trophyForPlace(place))}"><div class="block" style="height:${heights[place]}px"><span>${place}</span><small>${e.total} pts</small></div></div>`;
    }).join('');
    const fourth = st[3] ? `<div class="fourth" style="--c:${CHARS[st[3].charId].color}">${this.portrait(st[3].charId, 0, 56)}<b>${CHARS[st[3].charId].name}</b><img class="trophy" alt="" src="${icon('corazon')}"><small>${st[3].total} pts · Trofeo Corazón</small></div>` : '';
    const girl = ['sophie', 'alana', 'mama'].includes(you.charId);
    const msg = (girl ? CUP_MSG : CUP_MSG_BOY)[Math.min(3, you.place - 1)];
    const xpLines = humans.map((h) => `<div class="xp" style="--c:${CHARS[h.charId].color}"><b>${CHARS[h.charId].name}</b>: +${s.xpGain[h.charId] ?? 0} XP · Nivel ${this.save.characters[h.charId].level}</div>`).join('');
    const rec = this.save.records;
    const recLine = `Mejor carrera: ${rec.raceBestMs !== undefined ? fmtMs(rec.raceBestMs) : '--'} · Circuito: ${rec.circuitBest ?? 0} · Piñata: ${rec.pinataBest ?? 0} ★ · Arena: ${rec.arenaBest ?? 0}`;
    this.show(`<div class="panel wide cupfinal"><h2>La Copa del Bosque Arcoíris</h2><p class="msg">${msg}</p>
      <div class="podium">${podium}</div>${fourth}
      <div class="xps">${xpLines}</div>${unlockLines.join('')}<p class="foot">${recLine}</p>
      <div class="row"><button class="btn big primary" id="again">Otra copa</button><button class="btn big" id="menu">Menú</button></div></div>`, 'screen center');
    services.audio?.ui('cup');
    window.setTimeout(() => { if (this.session === s) services.audio?.music('cup'); }, 2800);
    this.fireworks();
    this.on('#again', () => { this.picks = [...s.picks]; this.players = s.players; this.pickMode = 'cup'; this.beginSession('cup'); });
    this.on('#menu', () => { this.session = null; this.menu(); });
  }

  private fireworks(): void {
    const colors = ['#FF5E7E', '#FFB23F', '#FFE45C', '#5DDB43', '#4CC9E8', '#B98CFF'];
    for (let i = 0; i < 28; i++) {
      const c = document.createElement('i'); c.className = 'conf';
      c.style.left = `${Math.random() * 100}%`; c.style.background = colors[i % colors.length]; c.style.animationDelay = `${Math.random() * 1.2}s`; c.style.animationDuration = `${2 + Math.random() * 1.5}s`;
      this.box.appendChild(c);
    }
  }

  // ------------------------------------------------------------------ records, wardrobe, settings
  private records(): void {
    const r = this.save.records;
    const rows = CHAR_IDS.map((c) => {
      const m = this.save.medals[c];
      const cell = (e: EventId) => (m[e] ? `<img alt="${m[e]}" src="${icon(`medal-${m[e]}` as 'medal-oro')}" height="28">` : '<span class="dim">–</span>');
      return `<tr style="--c:${CHARS[c].color}"><td>${this.portrait(c, 0, 40)}</td><th>${CHARS[c].name}</th><td>${cell('race')}</td><td>${cell('circuit')}</td><td>${cell('pinata')}</td><td>${cell('arena')}</td></tr>`;
    }).join('');
    this.show(`<div class="panel wide"><h2>Récords</h2>
      <div class="recs"><div><small>Mejor carrera</small><b>${r.raceBestMs !== undefined ? fmtMs(r.raceBestMs) : '--'}</b></div><div><small>Circuito</small><b>${r.circuitBest ?? 0} pts</b></div><div><small>Piñata</small><b>${r.pinataBest ?? 0} ★</b></div><div><small>Arena</small><b>${r.arenaBest ?? 0}</b></div><div><small>Copas ganadas</small><b>${r.cupsWon}</b></div></div>
      <table class="medals"><tr><td></td><th></th><th>Carrera</th><th>Circuito</th><th>Piñata</th><th>Arena</th></tr>${rows}</table>
      <div class="row"><button class="btn big" id="back">Volver</button></div></div>`, 'screen center');
    this.on('#back', () => this.menu());
  }

  private wardrobe(): void {
    const rows = CHAR_IDS.map((c) => {
      const cs = this.save.characters[c];
      const have = outfitsFor(cs.level);
      const chip = (o: Outfit, name: string, lvl: number) => {
        const locked = !have.includes(o);
        return `<button class="chip-o${cs.outfit === o ? ' sel' : ''}${locked ? ' lock' : ''}" data-c="${c}" data-o="${o}" ${locked ? 'disabled' : ''}>${locked ? `Nivel ${lvl}` : name}</button>`;
      };
      return `<div class="wrow" style="--c:${CHARS[c].color}">${this.portrait(c, 0, 64)}<div><b>${CHARS[c].name}</b> <small>Nivel ${cs.level}</small><div class="chips">${chip('base', 'Normal', 1)}${chip('arcoiris', 'Arcoíris', 2)}${chip('estrellas', 'Estrellas', 4)}</div>
        <small>${cs.level >= 3 ? '✓ Poder +' : 'Poder + en nivel 3'} · ${cs.level >= 5 ? '✓ Celebración dorada' : 'Celebración dorada en nivel 5'}</small></div></div>`;
    }).join('');
    this.show(`<div class="panel wide"><h2>Vestuario</h2><div class="wlist">${rows}</div><div class="row"><button class="btn big" id="back">Volver</button></div></div>`, 'screen center');
    this.on('[data-o]', (el) => { this.save.characters[el.dataset.c as CharId].outfit = el.dataset.o as Outfit; this.persist(); this.wardrobe(); });
    this.on('#back', () => this.menu());
  }

  settings(back: () => void): void {
    const s = this.save.settings;
    this.show(`<div class="panel settings"><h2>Ajustes</h2>
      <label>Música <input type="range" id="mus" min="0" max="100" value="${Math.round(s.music * 100)}"></label>
      <label>Efectos <input type="range" id="sfx" min="0" max="100" value="${Math.round(s.sfx * 100)}"></label>
      <label class="chk"><input type="checkbox" id="mute" ${s.muted ? 'checked' : ''}> Silencio total</label>
      <div class="seg"><span>Dificultad</span><button class="btn small${s.difficulty === 'tranquilo' ? ' primary' : ''}" data-d="tranquilo">Tranquilo</button><button class="btn small${s.difficulty === 'campeon' ? ' primary' : ''}" data-d="campeon">Campeón</button></div>
      <div class="seg"><span>Controles táctiles</span>${(['auto', 'on', 'off'] as const).map((m) => `<button class="btn small${s.touchControls === m ? ' primary' : ''}" data-t="${m}">${m === 'auto' ? 'Auto' : m === 'on' ? 'Sí' : 'No'}</button>`).join('')}</div>
      <label class="chk"><input type="checkbox" id="mir" ${s.mirrorP2 ? 'checked' : ''}> Jugador 2 en espejo (joystick a la derecha)</label>
      <div class="row"><button class="btn big primary" id="back">Listo</button></div></div>`, 'screen center');
    const apply = () => { this.persist(); services.audio?.setVolumes(s.music, s.sfx, s.muted); this.d.touch.setMode(s.touchControls); };
    (this.box.querySelector('#mus') as HTMLInputElement).addEventListener('input', (e) => { s.music = Number((e.target as HTMLInputElement).value) / 100; apply(); });
    (this.box.querySelector('#sfx') as HTMLInputElement).addEventListener('input', (e) => { s.sfx = Number((e.target as HTMLInputElement).value) / 100; apply(); });
    (this.box.querySelector('#sfx') as HTMLInputElement).addEventListener('change', () => services.audio?.ui('click'));
    (this.box.querySelector('#mute') as HTMLInputElement).addEventListener('change', (e) => { s.muted = (e.target as HTMLInputElement).checked; apply(); });
    (this.box.querySelector('#mir') as HTMLInputElement).addEventListener('change', (e) => { s.mirrorP2 = (e.target as HTMLInputElement).checked; apply(); });
    this.on('[data-d]', (el) => { s.difficulty = el.dataset.d as Difficulty; apply(); this.settings(back); });
    this.on('[data-t]', (el) => { s.touchControls = el.dataset.t as 'auto' | 'on' | 'off'; apply(); this.settings(back); });
    this.on('#back', back);
  }
}
