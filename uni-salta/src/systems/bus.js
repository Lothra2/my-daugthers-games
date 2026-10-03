// Tiny event emitter shared by the game, the UI and the audio.
export class Bus {
  constructor() { this.h = {}; }
  on(type, fn) { (this.h[type] ||= []).push(fn); return () => this.off(type, fn); }
  off(type, fn) { this.h[type] = (this.h[type] || []).filter((f) => f !== fn); }
  emit(type, data) { for (const f of this.h[type] || []) f(data); }
}
