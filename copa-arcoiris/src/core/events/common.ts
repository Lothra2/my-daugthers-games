import { aiAggression, aiRisk, type AIGoal } from '../ai';
import type { RouteNode } from '../mapdata';
import type { Actor, Standing, World } from '../world';

export const fmtTime = (s: number): string => {
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
};

/** Ties share the best rank (1,1,3,4). Higher value is better unless asc. */
export function rankByValue(items: { actorId: number; value: number; detail: string }[], asc = false): Standing[] {
  const sorted = [...items].sort((p, q) => (asc ? p.value - q.value : q.value - p.value));
  const out: Standing[] = [];
  sorted.forEach((it, i) => {
    const prev = out[i - 1];
    const rank = prev && prev.value === it.value ? prev.rank : i + 1;
    out.push({ actorId: it.actorId, rank, value: it.value, detail: it.detail });
  });
  return out;
}

const weightFor = (tipo: string, risk: number): number => {
  switch (tipo) {
    case 'atajo': return 0.2 + risk * 1.6;
    case 'dificil': return 0.1 + risk * 1.8;
    case 'agua': return 0.5 + (1 - risk) * 0.3;
    case 'facil': return 0.4 + (1 - risk) * 1.2;
    default: return 0.8 + (1 - risk) * 0.6;
  }
};

/** Per-actor route cursor stored in world.data.routeCursor. */
export function followRoute(w: World, a: Actor, nodes: RouteNode[], fallback: { x: number; y: number }, filter?: (n: RouteNode) => boolean): { goal: AIGoal; node: RouteNode | null } {
  const pool = filter ? nodes.filter(filter) : nodes;
  const cur: Record<number, string | null> = (w.data.routeCursor ??= {});
  let node = pool.find((n) => n.id === cur[a.id]) ?? null;
  const risk = aiRisk(a.profile);
  const pickNext = (from: RouteNode | null): RouteNode | null => {
    if (!from) {
      const ahead = pool.filter((n) => n.x >= a.x - 8).sort((p, q) => p.x - q.x);
      if (!ahead.length) return null;
      const x0 = ahead[0].x;
      const cands = ahead.filter((n) => n.x <= x0 + 60);
      return cands.find((n) => n.tipo === 'principal') ?? cands[0];
    }
    const opts = from.next.map((o) => ({ n: pool.find((p) => p.id === o.id), w: o.w })).filter((o): o is { n: RouteNode; w: number } => !!o.n);
    if (!opts.length) return null;
    const ws = opts.map((o) => o.w * weightFor(o.n.tipo, risk));
    let r = w.rng.next() * ws.reduce((s, v) => s + v, 0), i = 0;
    for (; i < ws.length - 1; i++) { r -= ws[i]; if (r <= 0) break; }
    return opts[i].n;
  };
  if (!node) node = pickNext(null);
  if (node && node.x < a.x - 36) node = pickNext(node) ?? node;       // already passed
  if (node && node.x > a.x + 520) node = pickNext(null);              // rescued far behind: restart on the nearest node ahead
  while (node && Math.abs(node.x - a.x) < 10 && Math.abs(node.y - a.y) < 16) {
    const nx = pickNext(node);
    if (!nx) { node = null; break; }
    node = nx;
  }
  cur[a.id] = node ? node.id : null;
  if (!node) return { goal: { x: fallback.x, y: fallback.y }, node: null };
  return { goal: { x: node.x, y: node.y, stopDist: 4 }, node };
}

/** Opportunistic extras shared by the events that allow balls and pushes. */
export function addSocialGoals(w: World, a: Actor, goal: AIGoal, opts: { items?: boolean; attack?: boolean; throwRange?: number } = {}): AIGoal {
  const aggr = aiAggression(a.profile);
  if (opts.items !== false && a.carrying === null && (a.profile === 'jugueton' || a.profile === 'explorador' || a.charId === 'thor')) {
    const ball = w.items.filter((i) => i.kind === 'ball' && i.state === 'ground' && i.owner === null && Math.abs(i.x - a.x) < 46 && i.x > a.x - 10 && Math.abs(i.y - a.y) < 40)
      .sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0];
    if (ball) { goal = { ...goal, x: ball.x, y: ball.y, pickup: true, stopDist: 3 }; }
  }
  if (a.carrying !== null) {
    const tgt = w.actors.filter((t) => t !== a && !t.finished && (t.x - a.x) * a.facing > 30 && (t.x - a.x) * a.facing < 130 && Math.abs(t.y - a.y) < 12)[0];
    if (tgt) goal = { ...goal, throwAt: tgt.id };
  }
  if (opts.attack !== false) {
    const near = w.actors.filter((t) => t !== a && !t.finished && Math.abs(t.x - a.x) < 24 && Math.abs(t.y - a.y) < 10)[0];
    if (near && aggr > 0.2) goal = { ...goal, attack: near.id };
  }
  return goal;
}
