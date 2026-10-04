import type { MapData } from '../core/mapdata';

/** Rules every map must meet so nobody gets blocked (GAME_DESIGN section 5). Returns human readable problems. */
export const MAX_OBLIGATORY_H = 22;
export const MAX_PIT_JUMP = 46;

export function validateMap(m: MapData, opts: { needGoal?: boolean; minSpawns?: number } = {}): string[] {
  const errs: string[] = [];
  const err = (s: string) => errs.push(`${m.id}: ${s}`);
  const minSpawns = opts.minSpawns ?? 4;
  if (m.spawns.length < minSpawns) err(`needs ${minSpawns} spawns, has ${m.spawns.length}`);
  for (const s of m.spawns) {
    if (m.boxes.some((b) => b.alto > 4 && s.x > b.x - 8 && s.x < b.x + b.w + 8 && s.y > b.y - 3 && s.y < b.y + b.h + 3)) err(`spawn ${s.slot} is inside a solid`);
    if (m.pits.some((p) => s.x > p.x && s.x < p.x + p.w && s.y > p.y && s.y < p.y + p.h)) err(`spawn ${s.slot} is over a pit`);
  }
  if (opts.needGoal && !m.goal) err('missing goal');
  // a free lane must exist at every x of the walkable band
  const x0 = 8, x1 = m.width - 8;
  const blockers = [
    ...m.boxes.filter((b) => b.alto > MAX_OBLIGATORY_H),
    ...m.pits.filter((p) => p.w > MAX_PIT_JUMP && p.h < m.groundBottom - m.groundTop + 40 && !(m.props.freeY)),
  ].map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h, moving: 'move' in b && !!(b as any).move }));
  if (!m.props.freeY) {
    for (let x = x0; x < x1; x += 2) {
      const iv: [number, number][] = [];
      for (const b of blockers) {
        const rx0 = b.moving ? b.x - 100 : b.x;
        if (x >= rx0 - 7 && x < b.x + b.w + 7 + (b.moving ? 100 : 0)) iv.push([b.y - 3, b.y + b.h + 3]);
      }
      iv.sort((a, b) => a[0] - b[0]);
      let free = false, cursor = m.groundTop;
      for (const [a, b] of iv) { if (a - cursor >= 8) { free = true; break; } cursor = Math.max(cursor, b); }
      if (!free && m.groundBottom - cursor >= 8) free = true;
      if (!free) { err(`no free lane at x=${x} (a tall obstacle or a wide pit spans the whole depth)`); break; }
    }
  }
  // water must have a dry exit on at least one side
  for (const w of m.water) {
    const dry = (px: number, py: number) => px > 4 && px < m.width - 4 && !m.water.some((q) => px >= q.x && px < q.x + q.w && py >= q.y && py < q.y + q.h) && !m.pits.some((q) => px >= q.x && px < q.x + q.w && py >= q.y && py < q.y + q.h);
    const my = w.y + w.h / 2;
    if (!dry(w.x - 8, my) && !dry(w.x + w.w + 8, my) && !dry(w.x + w.w / 2, w.y - 8) && !dry(w.x + w.w / 2, w.y + w.h + 8)) err(`water at x=${w.x} has no dry exit`);
  }
  // checkpoints ordered
  m.checkpoints.forEach((c, i) => { if (c.order !== i + 1) err(`checkpoint order ${c.order} at index ${i}`); if (i && c.x <= m.checkpoints[i - 1].x) err('checkpoints not increasing in x'); });
  // route graph
  if (m.routes.length) {
    const byId = new Map(m.routes.map((r) => [r.id, r]));
    for (const r of m.routes) for (const n of r.next) if (!byId.has(n.id)) err(`route ${r.id} -> unknown ${n.id}`);
    const seen = new Set<string>(); const stack = [m.routes[0].id]; let reachesEnd = false;
    while (stack.length) {
      const id = stack.pop()!; if (seen.has(id)) continue; seen.add(id);
      const r = byId.get(id); if (!r) continue;
      if (!r.next.length) reachesEnd = true;
      for (const n of r.next) stack.push(n.id);
    }
    if (!reachesEnd) err('route graph has no end');
    const dead = m.routes.filter((r) => !seen.has(r.id) && !m.rooms.length);
    if (dead.length) err(`unreachable route nodes: ${dead.map((d) => d.id).join(',')}`);
    if (m.goal) {
      const ends = m.routes.filter((r) => !r.next.length);
      if (!ends.some((e) => e.x >= m.goal!.x - 80)) err('no route ends near the goal');
    }
  }
  for (const mv of m.movers) if (mv.y < m.groundTop - 1 || mv.y + mv.h > m.groundBottom + 1) err(`mover ${mv.id} outside the ground band`);
  return errs;
}
