#!/usr/bin/env python3
"""Generates the Tiled maps (maps-src/*.tmx) for the five scenes from zone specifications.

Run `npm run maps` to also export them to public/assets/maps/*.json with the Tiled CLI.
Layer and property names are the contract with src/maps/tiled.ts (see TECH_ARCHITECTURE section 6).
Coordinates: x is advance, y is depth on the ground band (176..272), like the simulation.
Point objects in `rutas_ia` are waypoint nodes of a graph: property `siguiente` = "id:peso,id:peso".
"""
import json, os, random
from xml.sax.saxutils import quoteattr

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDS = json.load(open(os.path.join(ROOT, "tools/tile_ids.json")))
T = 16
GT, GB = 176, 272   # ground band


def gid(name):
    return IDS[name] + 1


class Map:
    def __init__(self, name, wt, ht=17, camera="fixed", **props):
        self.name, self.wt, self.ht = name, wt, ht
        self.layers = {n: [[0] * wt for _ in range(ht)] for n in ("suelo", "fachada", "deco_suelo", "frente")}
        self.objs = {n: [] for n in ("props_fondo", "props_suelo", "props_frente", "colision", "plataformas", "agua", "huecos", "rebote",
                                     "moviles", "checkpoints", "salidas", "meta", "rutas_ia", "activadores", "objetos", "salas", "zonas")}
        self.props = {"camera": camera, **props}
        self.nid = 1

    # ---- tiles
    def put(self, layer, tx, ty, g):
        if 0 <= tx < self.wt and 0 <= ty < self.ht:
            self.layers[layer][ty][tx] = g

    def fill(self, layer, x0, y0, x1, y1, pick):
        """Fill pixel rect [x0,x1) x [y0,y1) with tile names chosen by pick(tx, ty)."""
        for ty in range(y0 // T, (y1 + T - 1) // T):
            for tx in range(x0 // T, (x1 + T - 1) // T):
                n = pick(tx, ty)
                if n:
                    self.put(layer, tx, ty, gid(n))

    # ---- objects
    def add(self, group, x, y, w=0, h=0, name="", type="", point=False, tile=None, **props):
        o = dict(id=self.nid, x=x, y=y, w=w, h=h, name=name, type=type, point=point, tile=tile, props=props)
        self.nid += 1
        self.objs[group].append(o)
        return o

    def box(self, x, y, w, h, alto, kind, id=None, group="colision", **p):
        return self.add(group, x, y, w, h, name=id or f"{kind}{self.nid}", type=kind, alto=alto, **p)

    def node(self, id, x, y, tipo="principal", next=(), salta=False):
        s = ",".join(f"{a}:{b}" for a, b in next)
        self.add("rutas_ia", x, y, name=id, type="nodo", point=True, id=id, tipo=tipo, siguiente=s, salta=salta)

    # ---- save
    def save(self, path):
        out = ['<?xml version="1.0" encoding="UTF-8"?>']
        out.append(f'<map version="1.8" tiledversion="1.8.2" orientation="orthogonal" renderorder="right-down" width="{self.wt}" height="{self.ht}" '
                   f'tilewidth="{T}" tileheight="{T}" infinite="0" nextlayerid="40" nextobjectid="{self.nid + 1}">')
        out.append(" <properties>")
        for k, v in self.props.items():
            out.append(f'  <property name="{k}" {_typ(v)} value={quoteattr(str(v).lower() if isinstance(v, bool) else str(v))}/>')
        out.append(" </properties>")
        out.append(' <tileset firstgid="1" source="tiles.tsx"/>')
        lid = 1
        for n, grid in self.layers.items():
            rows = ",\n".join(",".join(str(v) for v in r) for r in grid)
            out.append(f' <layer id="{lid}" name="{n}" width="{self.wt}" height="{self.ht}">\n  <data encoding="csv">\n{rows}\n  </data>\n </layer>')
            lid += 1
        for n, lst in self.objs.items():
            out.append(f' <objectgroup id="{lid}" name="{n}">')
            lid += 1
            for o in lst:
                attrs = f'id="{o["id"]}" name={quoteattr(o["name"])} type={quoteattr(o["type"])}'
                if o["tile"]:
                    attrs += f' gid="{o["tile"]}" x="{o["x"]}" y="{o["y"]}" width="{T}" height="{T}"'
                else:
                    attrs += f' x="{o["x"]}" y="{o["y"]}"'
                    if not o["point"]:
                        attrs += f' width="{o["w"]}" height="{o["h"]}"'
                inner = []
                if o["props"]:
                    inner.append("   <properties>")
                    for k, v in o["props"].items():
                        inner.append(f'    <property name="{k}" {_typ(v)} value={quoteattr(str(v).lower() if isinstance(v, bool) else str(v))}/>')
                    inner.append("   </properties>")
                if o["point"]:
                    inner.append("   <point/>")
                if inner:
                    out.append(f"  <object {attrs}>\n" + "\n".join(inner) + "\n  </object>")
                else:
                    out.append(f"  <object {attrs}/>")
            out.append(" </objectgroup>")
        out.append("</map>")
        open(path, "w").write("\n".join(out) + "\n")


def _typ(v):
    if isinstance(v, bool): return 'type="bool"'
    if isinstance(v, int): return 'type="int"'
    if isinstance(v, float): return 'type="float"'
    return ""


PROPS = {k: (v["frame"]["w"], v["frame"]["h"]) for k, v in json.load(open(os.path.join(ROOT, "public/assets/props/props.json")))["frames"].items()}


def deco(m, name, x, y, group="props_suelo", **p):
    """Scenery sprite from the props atlas. (x, y) = bottom centre; depth sorts by y like the actors.
    Property `split` = rows from which the lower part is drawn in the actors' layer (a tree whose crown stays behind them)."""
    assert name in PROPS, name
    return m.add(group, x, y, point=True, name=name, type="deco", **p)


def row(m, x0, x1, kinds, y, gap=(6, 26), seed=0, jy=3, group="props_suelo"):
    """Place sprites left to right in [x0, x1) cycling through `kinds`, with random gaps."""
    r = random.Random(seed)
    x = x0 + r.randint(0, 12)
    i = 0
    while True:
        k = kinds[i % len(kinds)]
        w = PROPS[k][0]
        if x + w > x1:
            break
        deco(m, k, x + w // 2, y + r.randint(-jy, jy), group)
        x += w + r.randint(*gap)
        i += 1


def pick_grass(seed=0, flowery=0.1):
    r = random.Random(seed)
    def f(tx, ty):
        v = r.random()
        if v < flowery * 0.5: return "grass_w"
        if v < flowery: return "grass_p"
        return "grass0" if r.random() < 0.6 else "grass1"
    return f


def back_hedge(m, x0, x1, kind="hedge"):
    """Far background strip at rows 9-10 (y 144..176)."""
    r = random.Random(x0)
    for tx in range(x0 // T, x1 // T):
        m.put("fachada", tx, 9, gid("hedge_top"))
        m.put("fachada", tx, 10, gid("hedge0" if r.random() < 0.6 else "hedge1"))


def hedge_wall(m, x, y0, y1, w=16, id=None, kind="seto"):
    """Standing hedge wall: solid footprint (alto 999) and tile props sorted by their base."""
    m.box(x, y0, w, y1 - y0, 999, kind, id=id)
    # visual: one hedge tile column per 16px of depth, two tiles tall (top + body), base at y1
    for k in range(0, w, T):
        for j in range(y0, y1, 8):
            pass
        m.add("props_suelo", x + k, y1 + 0, tile=gid("hedge0"), name="seto")
        m.add("props_suelo", x + k, y1 - T, tile=gid("hedge_top"), name="seto_top")


def spawns(m, x, ys=(194, 214, 234, 254), dx=0):
    for i, y in enumerate(ys):
        m.add("salidas", x + dx * i, y, point=True, name=f"salida{i}", type="salida", slot=i)


# ===================================================================== RACE
def build_race():
    W = 213
    m = Map("race", W, camera="follow", ground_top=GT, ground_bottom=GB)
    pw = W * T
    m.fill("suelo", 0, GT, pw, GB, pick_grass(1, 0.08))
    back_hedge(m, 0, pw)
    # Z1 meadow: dirt path with edges
    def path_pick(x0, x1, y0=208, y1=240):
        r = random.Random(x0)
        def f(tx, ty):
            y = ty * T
            if y == y0 - T: return "path_top"
            if y0 <= y < y1: return "path0" if r.random() < 0.7 else "path1"
            if y == y1: return "path_bot"
            return None
        return f
    m.fill("suelo", 0, 192, 520, 256, path_pick(0, 520))
    # start strip
    m.fill("suelo", 64, GT, 80, GB, lambda tx, ty: "check0" if (tx + ty) % 2 == 0 else "check1")
    # Z2 garden: flowery grass, path in the bottom lane, hedge lane splitter
    m.fill("suelo", 520, GT, 1424, GB, pick_grass(2, 0.28))
    m.fill("suelo", 520, 224, 1424, 272, lambda tx, ty: ("path0" if (tx * 7 + ty) % 3 else "path1") if ty * T in (240, 256) else None)
    # lane splitter between 600 and 1300
    for x in range(600, 1300, T):
        m.box(x, 212, T, 12, 999, "seto", id=f"split{x}")
        m.add("props_suelo", x, 224, tile=gid("hedge0"), name="seto")
        m.add("props_suelo", x, 208, tile=gid("hedge_top"), name="seto_top")
    # slalom walls in the bottom lane (alternate gap bottom / top)
    for i, x in enumerate(range(700, 1220, 100)):
        if i % 2 == 0:
            y0, y1 = 224, 256
        else:
            y0, y1 = 240, 272
        m.box(x, y0, 12, y1 - y0, 999, "seto", id=f"slalom{i}")
        for yy in range(y0, y1, 16):
            m.add("props_suelo", x, yy + 16, tile=gid("hedge0"), name="seto")
        m.add("props_suelo", x, y0, tile=gid("hedge_top"), name="seto_top")
    # top lane fences (jump obstacles, 18px) and mushroom roof platforms
    for x in (730, 890, 1050, 1210):
        m.box(x, 178, 10, 36, 18, "valla", id=f"valla{x}", light=True)
        m.add("props_suelo", x - 3, 214, tile=gid("fence_post"), name="valla")
    for x in (790, 950, 1110):
        m.box(x, 184, 28, 24, 20, "plataforma", id=f"seta{x}")
    # Z3 river with bridge on top lane
    rx0, rx1 = 1488, 1952
    m.fill("suelo", rx0, 208, rx1, GB, lambda tx, ty: (f"shore0" if ty * T == 208 else ("water0" if ty * T < 240 else "deep0")))
    m.fill("suelo", rx0, 176, rx1, 208, lambda tx, ty: "wood0" if (tx + ty) % 2 == 0 else "wood1")
    m.fill("suelo", rx0, 144, rx1, 176, lambda tx, ty: "grass_dark")
    m.box(rx0, 176, rx1 - rx0, 32, 2, "puente", id="puente")
    m.add("agua", rx0, 208, rx1 - rx0, 64, name="rio", type="agua", corriente=10.0)
    for x in range(rx0, rx1, 32):
        m.add("props_suelo", x, 176, tile=gid("fence"), name="baranda")
    m.add("moviles", 1500, 180, 16, 24, name="tronco1", type="tronco", alto=14, x0=1488, x1=1952, speed=55.0, period=0.0, phase=0.0, warn=0.8)
    m.add("moviles", 1500, 180, 16, 24, name="tronco2", type="tronco", alto=14, x0=1488, x1=1952, speed=55.0, period=0.0, phase=0.5, warn=0.8)
    # Z4 hill: cliffs steps, mushrooms, shortcut pit on the top half
    m.fill("suelo", 2180, GT, 2880, GB, pick_grass(4, 0.15))
    m.fill("suelo", 2180, 208, 2880, 240, lambda tx, ty: "path0" if ty * T in (208, 224) else None)
    for i, x in enumerate((2300, 2330, 2360)):
        m.box(x, 196, 30, 44, 10 * (i + 1) if i < 2 else 20, "plataforma", id=f"escalon{i}")
    m.add("rebote", 2500, 218, 24, 12, name="hongo1", type="rebote", fuerza=380.0)
    m.add("rebote", 2650, 242, 24, 12, name="hongo2", type="rebote", fuerza=380.0)
    m.add("huecos", 2560, GT, 36, 40, name="atajo", type="hueco")
    m.fill("suelo", 2560, GT, 2596, 216, lambda tx, ty: "deep0")
    # Z5 plaza
    m.fill("suelo", 2880, GT, pw, GB, lambda tx, ty: "stone0" if (tx + ty) % 2 else "stone1")
    m.fill("suelo", 2864, 192, 2880, 256, lambda tx, ty: "stone_top" if ty * T == 192 else None)
    m.fill("suelo", 3248, GT, 3264, GB, lambda tx, ty: "check0" if (tx + ty) % 2 == 0 else "check1")
    m.add("meta", 3250, GT, 16, GB - GT, name="meta", type="meta")
    # checkpoints (arches)
    for i, (x, nm) in enumerate(((560, "Pradera"), (1450, "Rio"), (2190, "Colina")), 1):
        m.add("checkpoints", x, 224, point=True, name=f"arco{i}", type="arco", orden=i, zona=nm)
    spawns(m, 40)
    # scenery: trees and houses stand behind the track on the hedge line
    row(m, 0, 520, ["oak", "bush_flower", "tree_round", "fir", "hedge_berry", "blossom"], 172, seed=1)
    row(m, 520, 1424, ["house_mush", "bush_flower", "tree_round", "house_thatch", "hedge_berry", "windmill", "blossom", "stall", "bush_flower", "house_mush"], 172, gap=(4, 14), seed=2)
    row(m, 1424, 1500, ["fir", "reeds"], 172, seed=3)
    row(m, 1500, 1940, ["reeds", "tree_round", "reeds", "fir", "reeds", "blossom"], 160, gap=(30, 70), seed=33)
    row(m, 1940, 2180, ["fir", "tree_round", "bush_flower"], 172, seed=4)
    row(m, 2180, 2880, ["fir", "mushrooms", "oak", "hedge_berry", "blossom", "mushrooms", "tree_round", "fir"], 172, gap=(10, 30), seed=5)
    row(m, 2880, pw - 70, ["lanterns", "tent", "fountain", "stall", "blossom", "tent", "lanterns"], 172, gap=(14, 34), seed=6)
    for x, y in ((1560, 232), (1640, 256), (1740, 238), (1830, 258), (1900, 232)):
        deco(m, "lily", x, y)
    for x, y in ((1700, 250), (1790, 228)):
        deco(m, "duck", x, y)
    for x in (110, 250, 400):
        deco(m, "flowers", x, 268 if x != 250 else 182)
    deco(m, "balloons", 30, 176); deco(m, "balloons", 98, 176)
    deco(m, "sign_arrow", 140, 180)
    for x in (2230, 2440, 2760):
        deco(m, "mushrooms", x, 270)
    for x in (600, 1280):
        deco(m, "planter", x, 183)
    # zones
    for i, (x0, x1, n) in enumerate(((0, 520, "Pradera de salida"), (520, 1424, "Jardín de las casitas"), (1424, 2180, "Río Cristal"),
                                      (2180, 2880, "Colina de los Hongos"), (2880, pw, "Plaza de la Meta")), 1):
        m.add("zonas", x0, GT, x1 - x0, GB - GT, name=n, type="zona", orden=i)
    # items
    for x, y in ((300, 216), (330, 242), (1760 - 700, 230), (2340, 230), (2420, 212), (2790, 230), (3050, 214)):
        m.add("objetos", x, y, point=True, name="pelota", type="pelota")
    for x, y, z in ((740, 196, 10), (800, 196, 28), (960, 196, 28), (1120, 196, 28), (1300, 196, 8), (2640, 196, 10), (2680, 196, 10),
                     (1700, 192, 8), (1850, 192, 8), (450, 224, 6), (2000, 224, 6), (3000, 224, 6)):
        m.add("objetos", x, y, point=True, name="estrella", type="estrella", z=z)
    for x, y in ((880, 200), (2450, 224), (1290, 236)):
        m.add("objetos", x, y, point=True, name="caja", type="caja")
    # AI route graph
    n = m.node
    n("n0", 100, 224, next=[("n1", 1)]); n("n1", 480, 224, next=[("f1", 1)])
    n("f1", 520, 224, next=[("t0", 1), ("b0", 1)])
    n("t0", 585, 196, tipo="atajo", next=[("t1", 1)]); n("b0", 585, 246, tipo="principal", next=[("b1", 1)])
    top = [("t1", 650), ("t2", 770), ("t3", 930), ("t4", 1090), ("t5", 1240), ("t6", 1340)]
    for i, (id, x) in enumerate(top):
        n(id, x, 196, tipo="atajo", next=[(top[i + 1][0], 1)] if i < len(top) - 1 else [("m1", 1)])
    bot = [("b1", 650, 240), ("b2", 700, 264), ("b3", 800, 232), ("b4", 900, 264), ("b5", 1000, 232), ("b6", 1100, 264), ("b7", 1200, 232), ("b8", 1340, 240)]
    for i, (id, x, y) in enumerate(bot):
        n(id, x, y, tipo="principal", next=[(bot[i + 1][0], 1)] if i < len(bot) - 1 else [("m1", 1)])
    n("m1", 1410, 224, next=[("w1", 1), ("br1", 1)])
    n("w1", 1500, 232, tipo="agua", next=[("w2", 1)]); n("w2", 1720, 232, tipo="agua", next=[("w3", 1)]); n("w3", 1960, 232, tipo="agua", next=[("e1", 1)])
    n("br1", 1494, 192, tipo="facil", next=[("br2", 1)]); n("br2", 1720, 192, tipo="facil", next=[("br3", 1)]); n("br3", 1960, 192, tipo="facil", next=[("e1", 1)])
    n("e1", 2010, 224, next=[("h1", 1)]); n("h1", 2250, 224, next=[("h2", 1)])
    n("h2", 2440, 224, next=[("h3", 1), ("h3b", 1)])
    n("h3", 2540, 196, tipo="atajo", next=[("h3c", 1)]); n("h3c", 2650, 196, tipo="atajo", next=[("h4", 1)])
    n("h3b", 2540, 248, tipo="principal", next=[("h3d", 1)]); n("h3d", 2650, 248, tipo="principal", next=[("h4", 1)])
    n("h4", 2730, 224, next=[("p1", 1)]); n("p1", 2900, 224, next=[("pg", 1)]); n("pg", 3290, 224)
    m.save(os.path.join(ROOT, "maps-src/race.tmx"))
    return m


# ===================================================================== CIRCUIT
RW = 416   # one screen = 26 tiles. The minimum logical view is 426 wide (ART_BIBLE section 2)


def build_circuit():
    W = RW * 4 // T
    m = Map("circuit", W, camera="room", ground_top=GT, ground_bottom=GB)
    pw = W * T
    m.fill("suelo", 0, GT, pw, GB, pick_grass(11, 0.1))
    back_hedge(m, 0, pw)
    names = ["Troncos rodantes", "Arroyo de hongos", "Plataformas columpio", "Molino de burbujas"]
    for i in range(4):
        x0, x1 = i * RW, (i + 1) * RW
        m.add("salas", x0, GT, RW, GB - GT, name=names[i], type="sala", orden=i, x0=x0, x1=x1,
              puerta_x=x1 - 24, puerta_y=GT, puerta_w=24, puerta_h=GB - GT, inicio_x=x0 + 40, inicio_y=224)
        m.fill("suelo", x0 + 16, 200, x0 + 90, 248, lambda tx, ty: "path0")
        m.fill("suelo", x1 - 56, 192, x1, 256, lambda tx, ty: "stone0" if (tx + ty) % 2 else "stone1")
        m.add("props_suelo", x1 - 16, 200, tile=gid("fence_post"), name="puerta")
        m.add("props_suelo", x1 - 16, 264, tile=gid("fence_post"), name="puerta")
        for k, y in enumerate((194, 214, 234, 254)):
            if i == 0:
                m.add("salidas", x0 + 40, y, point=True, name=f"salida{k}", type="salida", slot=k)
            m.add("salidas", x0 + 40, y, point=True, name=f"sala{i}_salida{k}", type="salida_sala", slot=k, sala=i)
        m.add("activadores", x1 - 24, GT, 24, GB - GT, name=f"puerta{i}", type="activador", evento=f"sala_fin:{i}")
        m.add("zonas", x0, GT, RW, GB - GT, name=names[i], type="zona", orden=i + 1)
    # ---- room 1: rolling logs, raised walkway on the hard route
    x0 = 0
    for lane, (ya, yb) in enumerate(((176, 224), (224, 272))):
        for k in range(2):
            m.add("moviles", x0 + 100, ya + 6, 16, yb - ya - 12, name=f"tronco{lane}{k}", type="tronco", alto=14, x0=x0 + 90, x1=x0 + 350, speed=75.0, period=0.0, phase=0.5 * k + 0.25 * lane, warn=0.8)
    m.fill("suelo", x0 + 90, 176, x0 + 350, 272, lambda tx, ty: "sand0" if (tx + ty) % 3 else "sand1")
    m.box(x0 + 100, 176, 236, 24, 20, "pasarela", id="pasarela1", group="plataformas")
    m.add("objetos", x0 + 342, 188, point=True, name="dorada", type="dorada", z=28)
    m.add("objetos", x0 + 60, 230, point=True, name="pelota", type="pelota")
    # ---- room 2: stream with mushroom islets
    x0 = RW
    sx0, sx1 = x0 + 160, x0 + 270
    m.fill("suelo", sx0, GT, sx1, GB, lambda tx, ty: "shore0" if ty * T == GT else ("water0" if ty * T < 224 else "deep0"))
    m.add("agua", sx0, GT, sx1 - sx0, GB - GT, name="arroyo", type="agua", corriente=0.0)
    # three wide mushroom stepping stones, 8 px apart, in the middle of the stream
    for k, sx in enumerate((x0 + 160, x0 + 200, x0 + 240)):
        m.box(sx, 204, 32 if k < 2 else 30, 28, 6, "seta", id=f"piedra{k}", group="plataformas")
    m.add("objetos", x0 + 216, 218, point=True, name="dorada", type="dorada", z=26)
    m.add("objetos", x0 + 70, 214, point=True, name="pelota", type="pelota")
    m.add("objetos", x0 + 110, 248, point=True, name="estrella", type="estrella", z=6)
    # ---- room 3: gap with swing platforms and a low bridge
    x0 = 2 * RW
    gx0, gx1 = x0 + 150, x0 + 270
    m.add("huecos", gx0, GT, gx1 - gx0, GB - GT - 24, name="hueco", type="hueco")
    m.fill("suelo", gx0, GT, gx1, 248, lambda tx, ty: "deep0")
    m.fill("suelo", gx0, 248, gx1, 272, lambda tx, ty: "wood0" if (tx + ty) % 2 else "wood1")
    m.box(gx0, 248, gx1 - gx0, 24, 2, "puente", id="puente3")
    m.box(gx0 + 6, 196, 40, 28, 8, "plataforma", id="columpio1", group="plataformas", mueve="x", rango=48.0, periodo=3.0, fase=0.0)
    m.box(gx0 + 74, 212, 40, 28, 8, "plataforma", id="columpio2", group="plataformas", mueve="x", rango=-48.0, periodo=3.0, fase=0.0)
    m.add("objetos", gx0 + 60, 218, point=True, name="dorada", type="dorada", z=26)
    m.add("objetos", x0 + 70, 226, point=True, name="pelota", type="pelota")
    m.add("objetos", x0 + 340, 230, point=True, name="caja", type="caja")
    # ---- room 4: foam sweepers and hay bales
    x0 = 3 * RW
    for k in range(2):
        m.add("moviles", x0 + 130, GT, 14, GB - GT, name=f"barrido{k}", type="barrido", alto=16, x0=x0 + 110, x1=x0 + 330, speed=0.0, period=4.0, phase=0.5 * k, warn=0.8)
    m.box(x0 + 100, 176, 36, 26, 20, "heno", id="heno1", group="plataformas")
    m.box(x0 + 136, 176, 56, 26, 32, "heno", id="heno2", group="plataformas")
    m.box(x0 + 192, 176, 70, 26, 32, "heno", id="heno3", group="plataformas")
    m.box(x0 + 262, 176, 36, 26, 20, "heno", id="heno4", group="plataformas")
    m.add("objetos", x0 + 227, 190, point=True, name="dorada", type="dorada", z=44)
    m.add("objetos", x0 + 70, 240, point=True, name="pelota", type="pelota")
    # ---- scenery per room
    scen = [["tree_round", "bush_flower", "oak", "hedge_berry", "fir"], ["blossom", "reeds", "tree_round", "mushrooms", "fir", "bush_flower"],
            ["tent", "lanterns", "stall", "bush_flower", "tree_round"], ["house_mush", "windmill", "blossom", "house_thatch", "bush_flower"]]
    for i in range(4):
        row(m, i * RW + 4, (i + 1) * RW - 4, scen[i], 172, gap=(6, 20), seed=40 + i)
        deco(m, "pole_pink", (i + 1) * RW - 8, GT + 4); deco(m, "pole_cyan", (i + 1) * RW - 8, GB)
    deco(m, "balloons", 18, 176); deco(m, "balloons", 18, 270)
    # ---- AI routes per room
    n = m.node
    for i in range(4):
        x0, x1 = i * RW, (i + 1) * RW
        n(f"r{i}a", x0 + 60, 226, next=[(f"r{i}e0" if i in (1, 2) else f"r{i}e", 1), (f"r{i}h", 1)])
        d = f"r{i}d"
        if i == 0:
            n("r0e", x0 + 220, 226, tipo="facil", next=[(d, 1)])
            n("r0h", x0 + 96, 208, tipo="dificil", next=[("r0h2", 1)]); n("r0h2", x0 + 200, 188, tipo="dificil", next=[("r0h3", 1)])
            n("r0h3", x0 + 338, 188, tipo="dificil", next=[(d, 1)])
        elif i == 1:
            n("r1e0", x0 + 150, 262, tipo="facil", next=[("r1e", 1)]); n("r1e", x0 + 215, 264, tipo="facil", next=[("r1e2", 1)]); n("r1e2", x0 + 290, 236, tipo="facil", next=[(d, 1)])
            n("r1h", x0 + 176, 218, tipo="dificil", next=[("r1h2", 1)]); n("r1h2", x0 + 216, 218, tipo="dificil", next=[("r1h3", 1)])
            n("r1h3", x0 + 255, 218, tipo="dificil", next=[(d, 1)])
        elif i == 2:
            n("r2e0", x0 + 118, 262, tipo="facil", next=[("r2e", 1)])
            n("r2e", x0 + 210, 262, tipo="facil", next=[("r2e2", 1)]); n("r2e2", x0 + 300, 232, tipo="facil", next=[(d, 1)])
            n("r2h", x0 + 140, 204, tipo="dificil", next=[("r2h2", 1)]); n("r2h2", x0 + 210, 218, tipo="dificil", next=[("r2h3", 1)])
            n("r2h3", x0 + 290, 218, tipo="dificil", next=[(d, 1)])
        else:
            n("r3e", x0 + 215, 232, tipo="facil", next=[(d, 1)])
            n("r3h", x0 + 104, 190, tipo="dificil", next=[("r3h2", 1)]); n("r3h2", x0 + 227, 190, tipo="dificil", next=[("r3h3", 1)])
            n("r3h3", x0 + 300, 190, tipo="dificil", next=[(d, 1)])
        n(d, x1 - 14, 226)
    m.save(os.path.join(ROOT, "maps-src/circuit.tmx"))
    return m


# ===================================================================== PINATA
def build_pinata():
    W = RW // T
    c = RW // 2   # screen centre
    m = Map("pinata", W, camera="fixed", ground_top=GT, ground_bottom=GB)
    pw = W * T
    m.fill("suelo", 0, GT, pw, GB, lambda tx, ty: "stone0" if (tx + ty) % 2 else "stone1")
    m.fill("suelo", 0, GT, pw, 192, lambda tx, ty: "grass_dark")
    back_hedge(m, 0, pw)
    m.box(c - 12, 206, 24, 16, 999, "tronco", id="tronco")
    m.add("objetos", c, 214, point=True, name="pinata", type="pinata", z=70.0)
    m.add("objetos", c, 252, point=True, name="canasta", type="canasta")
    for x, id in ((c - 108, "hongo1"), (c + 84, "hongo2")):
        m.add("rebote", x, 226, 24, 12, name=id, type="rebote", fuerza=380.0)
    m.box(40, 208, 28, 32, 20, "caja", id="cajaL1", group="plataformas"); m.box(68, 208, 28, 32, 40, "caja", id="cajaL2", group="plataformas")
    m.box(RW - 68, 208, 28, 32, 20, "caja", id="cajaR1", group="plataformas"); m.box(RW - 96, 208, 28, 32, 40, "caja", id="cajaR2", group="plataformas")
    m.box(c - 66, 184, 44, 22, 50, "nube", id="nube", group="plataformas", mueve="x", rango=88.0, periodo=8.0, fase=0.0)
    for i, (x, y) in enumerate(((c - 80, 196), (c + 80, 196), (c - 80, 250), (c + 80, 250))):
        m.add("salidas", x, y, point=True, name=f"salida{i}", type="salida", slot=i)
    deco(m, "oak", c, 222, split=66)   # the Grandfather Tree: crown behind everyone, trunk in the actors' layer, piñata hangs in front of the crown
    row(m, 0, c - 70, ["fir", "bush_flower", "tree_round", "hedge_berry"], 174, seed=60)
    row(m, c + 70, RW, ["blossom", "hedge_berry", "fir", "bush_flower"], 174, seed=61)
    deco(m, "balloons", 26, 186); deco(m, "balloons", RW - 26, 186)
    deco(m, "bench", 24, 272); deco(m, "bench", RW - 24, 272)
    deco(m, "flowers", c - 150, 270); deco(m, "flowers", c + 150, 270)
    m.add("zonas", 0, GT, pw, GB - GT, name="Plaza de la Piñata", type="zona", orden=1)
    for x, y in ((c - 48, 240), (c + 48, 240)):
        m.add("objetos", x, y, point=True, name="pelota", type="pelota")
    m.save(os.path.join(ROOT, "maps-src/pinata.tmx"))
    return m


# ===================================================================== ARENA
def build_arena():
    W = RW // T
    c = RW // 2
    ix, iw = c - 144, 288   # island aligned to the 16 px tile grid, so the sand edge is exactly where players fall (x 64..352, y 176..256)
    m = Map("arena", W, camera="fixed", ground_top=GT, ground_bottom=GB, freeY=True, ix=ix, iy=176, iw=iw, ih=80, tile_water=IDS["water0"], tile_deep=IDS["deep0"])
    pw = W * T
    m.fill("suelo", 0, 144, pw, 288, lambda tx, ty: "deep0" if (tx + ty) % 5 == 0 else "water0")
    m.fill("suelo", 0, 144, pw, 160, lambda tx, ty: "deep0")
    m.fill("suelo", ix, 176, ix + iw, 256, lambda tx, ty: "sand0" if (tx * 3 + ty) % 4 else "sand1")
    m.add("huecos", 0, 136, pw, 40, name="agua_norte", type="hueco")
    m.add("huecos", 0, 256, pw, 56, name="agua_sur", type="hueco")
    m.add("huecos", 0, 176, ix, 80, name="agua_oeste", type="hueco")
    m.add("huecos", ix + iw, 176, pw - ix - iw, 80, name="agua_este", type="hueco")
    m.box(c - 12, 209, 24, 14, 20, "parachoques", id="parachoques", group="colision")
    for i, (x, y) in enumerate(((c - 110, 196), (c + 110, 196), (c - 110, 236), (c + 110, 236))):
        m.add("salidas", x, y, point=True, name=f"salida{i}", type="salida", slot=i)
    m.add("objetos", c, 216, point=True, name="centro", type="centro")
    for x, y in ((24, 176), (46, 262), (366, 270), (392, 178), (14, 226), (404, 232)):
        deco(m, "lily", x, y)
    for x, y in ((120, 168), (300, 166), (60, 282), (350, 284)):
        deco(m, "reeds", x, y)
    deco(m, "duck", 24, 214); deco(m, "ring", 392, 214); deco(m, "bubbles", 200, 162); deco(m, "bubbles", 86, 276)
    deco(m, "dock", ix + 6, 188); deco(m, "dock", ix + iw - 6, 188)
    deco(m, "rock", ix + 30, 254); deco(m, "rock", ix + iw - 34, 254)
    m.add("zonas", ix, 176, iw, 80, name="Arena de Burbujas", type="zona", orden=1)
    m.save(os.path.join(ROOT, "maps-src/arena.tmx"))
    return m


# ===================================================================== WARMUP
def build_warmup():
    W = 50
    m = Map("warmup", W, camera="follow", ground_top=GT, ground_bottom=GB)
    pw = W * T
    m.fill("suelo", 0, GT, pw, GB, pick_grass(21, 0.15))
    m.fill("suelo", 0, 208, pw, 240, lambda tx, ty: "path0" if ty * T in (208, 224) else None)
    back_hedge(m, 0, pw)
    m.box(280, 176, 16, 96, 16, "tronco", id="tronco_tutorial")
    m.add("objetos", 190, 224, point=True, name="bandera", type="bandera")
    m.add("objetos", 380, 226, point=True, name="pelota", type="pelota")
    m.add("objetos", 470, 224, point=True, name="blanco", type="blanco")
    for x in (540, 560, 580, 600):
        m.add("objetos", x, 224, point=True, name="estrella", type="estrella", z=6)
    row(m, 0, pw, ["tree_round", "bush_flower", "fir", "hedge_berry", "oak", "blossom"], 172, seed=70)
    deco(m, "signpost", 160, 182); deco(m, "bench", 340, 180); deco(m, "balloons", 30, 176)
    for x in (230, 420, 520, 680):
        deco(m, "flowers", x, 268)
    spawns(m, 40, ys=(214, 238, 194, 254))
    m.add("meta", 740, GT, 16, GB - GT, name="meta", type="meta")
    m.add("zonas", 0, GT, pw, GB - GT, name="Calentamiento", type="zona", orden=1)
    m.save(os.path.join(ROOT, "maps-src/warmup.tmx"))
    return m


if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "maps-src"), exist_ok=True)
    for f in (build_race, build_circuit, build_pinata, build_arena, build_warmup):
        m = f()
        print(m.name, m.wt, "x", m.ht, "tiles,", sum(len(v) for v in m.objs.values()), "objects")
