import type { World } from './world';

export interface Camera { x: number; y: number; tx: number; ty: number; lock: boolean }

/** Camera follows rules from map.props.camera: follow (race), room (circuit), fixed (single screen). Positions are floats; the view rounds them. */
export function updateCamera(w: World, dt: number): void {
  const m = w.map, v = w.view, c = w.camera;
  const mode = String(m.props.camera ?? 'fixed');
  c.ty = Math.round((m.height - v.h) / 2);
  if (mode === 'follow') {
    const hs = w.actors.filter((a) => a.control === 'human');
    const pool = hs.length ? hs : w.actors;
    const lead = pool.reduce((p, a) => (a.x > p.x ? a : p), pool[0]);
    let target: number;
    if (pool.length === 1) target = lead.x + 60 * lead.facing - v.w / 2;
    else target = pool.reduce((s, a) => s + a.x, 0) / pool.length - v.w / 2 + 40;
    target = Math.max(target, lead.x - (v.w - 100));
    target = Math.max(0, Math.min(m.width - v.w, target));
    if (w.tick <= 1) c.x = target;
    c.tx = target;
    c.x += (target - c.x) * Math.min(1, 6 * dt);
  } else if (mode === 'room') {
    const idx = Math.min(m.rooms.length - 1, Math.max(0, (w.data.room as number) ?? 0));
    const r = m.rooms[idx];
    c.tx = r ? r.x0 - (v.w - (r.x1 - r.x0)) / 2 : (m.width - v.w) / 2;
    if (w.tick <= 1) c.x = c.tx;
    c.x += (c.tx - c.x) * Math.min(1, 8 * dt);
  } else {
    c.tx = (m.width - v.w) / 2; c.x = c.tx;
  }
  c.y = c.ty;
}
