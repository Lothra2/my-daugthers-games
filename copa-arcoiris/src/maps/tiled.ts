import { emptyMap, type MapData, type MapObject, type RouteNode } from '../core/mapdata';

/** Minimal shape of the JSON exported by Tiled (`tiled --embed-tilesets --export-map json`). */
export interface TiledProp { name: string; type?: string; value: string | number | boolean }
export interface TiledObject {
  id: number; name: string; type?: string; class?: string; x: number; y: number; width: number; height: number;
  point?: boolean; gid?: number; properties?: TiledProp[]; visible?: boolean;
}
export interface TiledLayer { name: string; type: 'tilelayer' | 'objectgroup' | 'imagelayer'; data?: number[]; objects?: TiledObject[]; width?: number; height?: number }
export interface TiledMap {
  width: number; height: number; tilewidth: number; tileheight: number; layers: TiledLayer[];
  tilesets: { firstgid: number; name: string; tiles?: { id: number; animation?: { tileid: number; duration: number }[]; image?: string }[]; columns?: number; image?: string }[];
  properties?: TiledProp[];
}

type PV = Record<string, string | number | boolean>;
const pmap = (ps?: TiledProp[]): PV => { const o: PV = {}; for (const p of ps ?? []) o[p.name] = p.value; return o; };
const num = (p: PV, k: string, d = 0): number => (typeof p[k] === 'number' ? (p[k] as number) : p[k] !== undefined ? Number(p[k]) : d);
const str = (p: PV, k: string, d = ''): string => (p[k] !== undefined ? String(p[k]) : d);
const kind = (o: TiledObject): string => o.type || o.class || '';

export function parseTiledMap(id: string, j: TiledMap): MapData {
  const m = emptyMap(id, j.width, j.height);
  m.tile = j.tilewidth;
  const mp = pmap(j.properties);
  m.props = mp;
  m.groundTop = num(mp, 'ground_top', 176);
  m.groundBottom = num(mp, 'ground_bottom', 272);
  const group = (n: string): TiledObject[] => j.layers.find((l) => l.name === n && l.type === 'objectgroup')?.objects ?? [];
  const rectBox = (o: TiledObject, p: PV) => ({ id: o.name || `b${o.id}`, x: o.x, y: o.y, w: o.width, h: o.height, alto: num(p, 'alto', 0), kind: kind(o), light: p.light === true });

  for (const o of group('colision')) m.boxes.push(rectBox(o, pmap(o.properties)));
  for (const o of group('plataformas')) {
    const p = pmap(o.properties);
    const b = rectBox(o, p) as any;
    if (p.mueve) b.move = { axis: String(p.mueve) === 'y' ? 'y' : 'x', range: num(p, 'rango'), period: num(p, 'periodo', 4), phase: num(p, 'fase') };
    m.boxes.push(b);
  }
  for (const o of group('agua')) m.water.push({ x: o.x, y: o.y, w: o.width, h: o.height, corriente: num(pmap(o.properties), 'corriente') });
  for (const o of group('huecos')) m.pits.push({ x: o.x, y: o.y, w: o.width, h: o.height });
  for (const o of group('rebote')) m.bounces.push({ x: o.x, y: o.y, w: o.width, h: o.height, fuerza: num(pmap(o.properties), 'fuerza', 380) });
  for (const o of group('moviles')) {
    const p = pmap(o.properties);
    m.movers.push({ id: o.name, kind: kind(o) === 'barrido' ? 'barrido' : 'tronco', x: o.x, y: o.y, w: o.width, h: o.height, alto: num(p, 'alto', 14),
      x0: num(p, 'x0', o.x), x1: num(p, 'x1', o.x + 100), speed: num(p, 'speed'), period: num(p, 'period', 4), phase: num(p, 'phase'), warn: num(p, 'warn', 0.8) });
  }
  for (const o of group('checkpoints')) { const p = pmap(o.properties); m.checkpoints.push({ order: num(p, 'orden'), x: o.x, y: o.y, name: str(p, 'zona', o.name) }); }
  m.checkpoints.sort((a, b) => a.order - b.order);
  const roomSpawns: Record<number, { slot: number; x: number; y: number }[]> = {};
  for (const o of group('salidas')) {
    const p = pmap(o.properties);
    if (kind(o) === 'salida_sala') { (roomSpawns[num(p, 'sala')] ??= []).push({ slot: num(p, 'slot'), x: o.x, y: o.y }); }
    else m.spawns.push({ slot: num(p, 'slot'), x: o.x, y: o.y });
  }
  m.spawns.sort((a, b) => a.slot - b.slot);
  const goal = group('meta')[0];
  if (goal) m.goal = { x: goal.x, y: goal.y, w: goal.width, h: goal.height };
  const routes: RouteNode[] = [];
  for (const o of group('rutas_ia')) {
    const p = pmap(o.properties);
    const next = str(p, 'siguiente').split(',').filter(Boolean).map((s) => { const [a, b] = s.split(':'); return { id: a, w: Number(b ?? 1) }; });
    routes.push({ id: str(p, 'id', o.name), x: o.x, y: o.y, tipo: str(p, 'tipo', 'principal'), salta: p.salta === true, next });
  }
  m.routes = routes;
  for (const o of group('activadores')) m.triggers.push({ x: o.x, y: o.y, w: o.width, h: o.height, evento: str(pmap(o.properties), 'evento') });
  for (const o of group('objetos')) { const p = pmap(o.properties); m.objects.push({ tipo: kind(o), x: o.x, y: o.y, id: o.name, props: p } as MapObject); }
  for (const o of group('zonas')) m.zones.push({ x: o.x, y: o.y, w: o.width, h: o.height, name: o.name, order: num(pmap(o.properties), 'orden') });
  for (const o of group('salas')) {
    const p = pmap(o.properties);
    const orden = num(p, 'orden');
    m.rooms.push({ orden, x0: num(p, 'x0'), x1: num(p, 'x1'), door: { x: num(p, 'puerta_x'), y: num(p, 'puerta_y'), w: num(p, 'puerta_w'), h: num(p, 'puerta_h') },
      start: { x: num(p, 'inicio_x'), y: num(p, 'inicio_y') }, hard: [] });
  }
  m.rooms.sort((a, b) => a.orden - b.orden);
  (m as any).roomSpawns = roomSpawns;
  return m;
}
