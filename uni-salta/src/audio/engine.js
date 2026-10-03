// Audio engine: Web Audio context, buses, ZzFX effects, procedural music and event mapping.
import { zzfxG, ZZFX_RATE } from '../vendor/zzfx.js';
import { SFX, SFX_NAMES } from './sfx.js';
import { Music, SONGS, JINGLES } from './music.js';

export function createAudio(app) {
  const A = { ctx: null, music: null, ready: false, pending: null, buffers: {}, last: {}, active: 0, world: 1, speedMode: false };
  const vol = (v) => v * v;

  function ensure() {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return A.ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }
    const ctx = A.ctx = new AC({ latencyHint: 'interactive' });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.15;
    const master = ctx.createGain(); master.gain.value = 0.9;
    master.connect(comp); comp.connect(ctx.destination);
    A.master = master;
    A.sfxBus = ctx.createGain(); A.sfxBus.connect(master);
    A.musicOut = ctx.createGain(); A.musicOut.connect(master);
    A.music = new Music(ctx, A.musicOut);
    applyVolumes();
    for (const n of SFX_NAMES) A.buffers[n] = makeBuffer(n);
    A.ready = true;
    if (A.pending) { const p = A.pending; A.pending = null; playSong(p); }
    return ctx;
  }

  function makeBuffer(name) {
    const data = zzfxG(...SFX[name]);
    const buf = A.ctx.createBuffer(1, data.length, ZZFX_RATE);
    buf.getChannelData(0).set(data);
    return buf;
  }

  function applyVolumes() {
    if (!A.ctx) return;
    const s = app.save.settings;
    A.sfxBus.gain.setTargetAtTime(vol(s.sfx), A.ctx.currentTime, 0.02);
    A.music.setVolume(vol(s.music) * 0.85);
  }

  function play(name, o = {}) {
    if (!A.ready || !A.buffers[name]) return;
    const now = A.ctx.currentTime;
    if (A.last[name] && now - A.last[name] < 0.04) return;
    A.last[name] = now;
    if (A.active > 12) return;
    const src = A.ctx.createBufferSource(), g = A.ctx.createGain();
    src.buffer = A.buffers[name];
    src.playbackRate.value = (o.rate || 1) * (1 + (Math.random() - 0.5) * (o.noVar ? 0 : 0.05));
    g.gain.value = o.vol ?? 1;
    src.connect(g); g.connect(A.sfxBus);
    A.active++;
    src.onended = () => { A.active--; };
    src.start(now + (o.delay || 0));
  }

  function jingle(name) {
    if (!A.ready) return;
    const j = JINGLES[name];
    if (j) A.music.jingle(j.notes, j.type, 0.2 * vol(app.save.settings.music) + 0.05);
  }

  function playSong(id) {
    if (!A.ready) { A.pending = id; return; }
    A.music.play(id);
    A.songId = id;
  }

  const worldSong = (w) => `world${w}`;
  let power = null;
  function onSim(e) {
    switch (e.type) {
      case 'jump': play('jump'); break;
      case 'land': play('land', { vol: Math.min(1, 0.4 + e.impact / 900) }); break;
      case 'crouch_start': play('crouch'); break;
      case 'fast_fall': play('fast_fall'); break;
      case 'coin': A.coinT = (A.coinT || 0); play('coin', { rate: Math.pow(2, Math.min(8, Math.max(0, (e.n || 1) - 1)) / 12), noVar: true }); break;
      case 'perfect': play('perfect'); break;
      case 'stomp': play('stomp', { rate: Math.pow(2, (Math.min(6, e.chain - 1) * 2) / 12), noVar: true }); play(e.kind === 'slime_flat' ? 'slime_blub' : 'enemy_pop', { delay: 0.03, vol: 0.7 }); break;
      case 'pop': if (!e.silent) play('enemy_pop'); break;
      case 'block_hit': play('block_hit'); break;
      case 'hit': play('hit'); play('lose_heart', { delay: 0.14 }); break;
      case 'fall_gap': play('fall_gap'); break;
      case 'rescue_start': play('rescue_cloud', { delay: 0.2 }); break;
      case 'heart_get': play('heart'); jingle('one_up'); break;
      case 'streak': play('secret'); break;
      case 'milestone': play('secret'); break;
      case 'wake': play(e.type === 'hang' ? 'snake_hiss' : e.type === 'owl' ? 'owl_hoot' : 'ui_hover'); break;
      case 'power_start':
        play(e.kind === 'fast' ? 'candy_yellow' : e.kind === 'slow' ? 'candy_green' : 'candy_red');
        startPower(e.kind);
        break;
      case 'power_warn': for (let i = 0; i < 3; i++) play('power_warn', { delay: i * 0.18, noVar: true }); break;
      case 'power_end': play('power_end'); endPower(e.kind); break;
      case 'world_clear': play('world_gate'); jingle('world_clear'); break;
      case 'world_enter': if (!power || power !== 'inv') playSong(worldSong(e.world)); A.world = e.world; A.music && updateSpeedLayer(); break;
      case 'game_over': break;
      case 'dying': if (A.ready) A.music.stop(0.6); break;
      default: break;
    }
  }

  function startPower(k) {
    power = k;
    if (!A.ready) return;
    if (k === 'fast') { A.music.setLayer('speed', 1, false); A.music.setTempo(1.04); }
    if (k === 'slow') A.music.setTempo(0.8);
    if (k === 'inv') { A.prevSong = A.songId; playSong('invincible'); }
  }
  function endPower(k) {
    power = null;
    if (!A.ready) return;
    if (k === 'fast') { updateSpeedLayer(); A.music.setTempo(1); }
    if (k === 'slow') A.music.setTempo(1);
    if (k === 'inv') playSong(worldSong(A.world));
  }
  function updateSpeedLayer() { A.music.setLayer('speed', A.world >= 5 ? 0.8 : 0, true); }

  app.bus.on('sfx', (e) => {
    if (e.name === 'game_over_sting') return jingle('game_over');
    if (e.name === 'new_record') { play('start_game'); return jingle('new_record'); }
    if (e.name === 'world_card') { jingle('world_card'); return; }
    play(e.name);
  });
  app.bus.on('sim_event', onSim);
  app.bus.on('audio_unlock', ensure);
  app.bus.on('ui_gesture', ensure);
  app.bus.on('settings_changed', applyVolumes);
  app.bus.on('music', (m) => { if (m.song) playSong(m.song); if (m.stop && A.ready) A.music.stop(); });
  app.bus.on('title_enter', () => { power = null; if (A.ready) { A.music.setTempo(1); } playSong('title'); });
  app.bus.on('run_start', (d) => { A.world = d.world; playSong(worldSong(d.world)); if (A.ready) { A.music.setLayer('danger', 0, false); updateSpeedLayer(); } });
  app.bus.on('hud', (s) => { if (A.ready && A.music && A.music.cur) { const d = s.mode === 'normal' && s.lives === 1 ? 0.7 : 0; if (d !== A.dangerLevel) { A.dangerLevel = d; A.music.setLayer('danger', d, true); } } });
  app.bus.on('pause_toggle', (p) => { if (!A.ctx) return; if (p) { A.music.pause(true); A.ctx.suspend(); } else { A.ctx.resume(); A.music.pause(false); } });
  app.bus.on('run_over', () => { if (A.ready) A.music.stop(0.4); });
  document.addEventListener('visibilitychange', () => { if (!A.ctx) return; if (document.hidden) A.ctx.suspend(); else if (!app.ui || app.ui.state !== 'paused') A.ctx.resume(); });

  // ---- debug sound board (?sounds)
  if (app.flags.sounds) {
    window.addEventListener('DOMContentLoaded', () => {});
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;overflow:auto;background:#1E1330ee;color:#FFF4DC;font:14px monospace;padding:12px;z-index:99;pointer-events:auto';
    box.innerHTML = '<h3>UNI-SALTA sound board</h3><p>Tap anything first to unlock audio.</p>';
    const mk = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'margin:3px;padding:8px 10px;font:14px monospace'; b.onclick = () => { ensure(); fn(); }; box.append(b); };
    SFX_NAMES.forEach((n) => mk(n, () => play(n)));
    box.append(document.createElement('hr'));
    Object.keys(SONGS).forEach((s) => mk('♪ ' + s, () => playSong(s)));
    ['speed', 'danger', 'bells'].forEach((l) => { mk(l + ' on', () => A.music.setLayer(l, 1, false)); mk(l + ' off', () => A.music.setLayer(l, 0, false)); });
    mk('slow', () => A.music.setTempo(0.8)); mk('normal tempo', () => A.music.setTempo(1)); mk('stop', () => A.music.stop());
    Object.keys(JINGLES).forEach((j) => mk('jingle ' + j, () => jingle(j)));
    document.addEventListener('DOMContentLoaded', () => document.body.append(box));
    if (document.readyState !== 'loading') document.body.append(box);
  }

  A.play = play; A.ensure = ensure; A.playSong = playSong;
  A.pauseMusic = () => {};
  return A;
}
