// Keyboard, pointer (left half crouch, right half jump) and gamepad -> two logical buttons.
export class Input {
  constructor(el, isBlocked = () => false) {
    this.el = el; this.blocked = isBlocked;
    this.keys = new Set(); this.ptr = new Map();
    this.jumpPressed = false; this.crouchPressed = false;
    this.pad = { jump: false, crouch: false };
    this.onPause = null; this.onConfirm = null;
    this.hintSide = null;
    const kd = (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { if (!this.keys.has('jump')) this.jumpPressed = true; this.keys.add('jump'); }
      if (['ArrowDown', 'KeyS'].includes(e.code)) { if (!this.keys.has('crouch')) this.crouchPressed = true; this.keys.add('crouch'); }
      if (e.code === 'Escape' || e.code === 'KeyP') this.onPause && this.onPause();
      if (e.code === 'Enter') this.onConfirm && this.onConfirm();
    };
    const ku = (e) => {
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) this.keys.delete('jump');
      if (['ArrowDown', 'KeyS'].includes(e.code)) this.keys.delete('crouch');
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', () => { this.keys.clear(); this.ptr.clear(); });
    const side = (e) => {
      const r = this.el.getBoundingClientRect();
      return e.clientX - r.left < r.width / 2 ? 'crouch' : 'jump';
    };
    this.el.addEventListener('pointerdown', (e) => {
      if (this.blocked()) return;
      const s = side(e);
      this.ptr.set(e.pointerId, s);
      if (s === 'jump') this.jumpPressed = true; else this.crouchPressed = true;
      try { this.el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
    });
    const up = (e) => { this.ptr.delete(e.pointerId); };
    this.el.addEventListener('pointerup', up);
    this.el.addEventListener('pointercancel', up);
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let jump = false, crouch = false;
    for (const p of pads) {
      if (!p) continue;
      if (p.buttons[0]?.pressed || p.buttons[12]?.pressed) jump = true;
      if (p.buttons[1]?.pressed || p.buttons[13]?.pressed || p.axes[1] > 0.6) crouch = true;
    }
    if (jump && !this.pad.jump) this.jumpPressed = true;
    if (crouch && !this.pad.crouch) this.crouchPressed = true;
    this.pad = { jump, crouch };
  }

  sample() {
    this.pollPad();
    const ptrs = [...this.ptr.values()];
    const jumpDown = this.keys.has('jump') || ptrs.includes('jump') || this.pad.jump;
    const crouchDown = this.keys.has('crouch') || ptrs.includes('crouch') || this.pad.crouch;
    const out = { jumpDown, crouchDown, jumpPressed: this.jumpPressed, crouchPressed: this.crouchPressed };
    this.jumpPressed = false; this.crouchPressed = false;
    return out;
  }
  clear() { this.keys.clear(); this.ptr.clear(); this.jumpPressed = false; this.crouchPressed = false; }
}
