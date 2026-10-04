#!/usr/bin/env python3
"""Procedural 16x16 tileset in the master palette (ART_BIBLE section 3). Seamless by construction, no AI seams.

Writes public/assets/tiles/tiles.png (16 columns x 4 rows), maps-src/tiles.tsx (with water and flag animations)
and tools/tile_ids.json (name -> id) used by build_maps.py and the view.
"""
import json, os, random
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = 16
COLS, ROWS = 16, 4


def hx(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


C = {
    "ink": hx("#2A1B3D"),
    "g1": hx("#8AD8B4"), "g2": hx("#4AA88E"), "g3": hx("#2F7F72"), "g4": hx("#1F5559"),
    "p1": hx("#F2CC93"), "p2": hx("#E3B27A"), "p3": hx("#C08655"), "p4": hx("#8E5A3C"),
    "w0": hx("#E8FBFF"), "w1": hx("#7FDBF2"), "w2": hx("#4CC9E8"), "w3": hx("#2E93C9"), "w4": hx("#1D5E9C"),
    "d1": hx("#D99A5B"), "d2": hx("#B9773F"), "d3": hx("#8A5230"), "d4": hx("#5C3524"),
    "red": hx("#FF5E7E"), "org": hx("#FFB23F"), "yel": hx("#FFE45C"), "cyn": hx("#7BE3FF"), "vio": hx("#B98CFF"),
    "white": hx("#FFF7EC"), "cream": hx("#E6DCCF"),
    "s1": hx("#F3E8D0"), "s2": hx("#D9C9A8"), "s3": hx("#B8A47E"), "s4": hx("#8C7A5C"),
}

IDS = {}
TILES = []


def new():
    return np.zeros((T, T, 4), np.uint8)


def fill(a, c):
    a[:, :, :3] = c; a[:, :, 3] = 255


def px(a, x, y, c):
    if 0 <= x < T and 0 <= y < T:
        a[y % T, x % T, :3] = c; a[y % T, x % T, 3] = 255


def add(name, a):
    IDS[name] = len(TILES)
    TILES.append(a)


def rng(seed):
    return random.Random(seed)


def grass(name, seed, flowers=None, dark=False):
    a = new(); base = C["g3"] if dark else C["g2"]
    fill(a, base)
    r = rng(seed)
    lite, shade = (C["g2"], C["g4"]) if dark else (C["g1"], C["g3"])
    # dither speckles
    for _ in range(26):
        x, y = r.randrange(T), r.randrange(T)
        px(a, x, y, lite if r.random() < 0.5 else shade)
    # blades: 2px vertical strokes (wrap so tiles stay seamless)
    for _ in range(5):
        x, y = r.randrange(T), r.randrange(T)
        px(a, x, y, lite); px(a, x, y - 1, lite)
    if flowers:
        for _ in range(2):
            x, y = r.randrange(2, T - 2), r.randrange(2, T - 2)
            px(a, x, y, C["yel"])
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                px(a, x + dx, y + dy, C[flowers])
    add(name, a)


def path(name, seed, pebbles=False):
    a = new(); fill(a, C["p1"])
    r = rng(seed)
    for _ in range(30):
        px(a, r.randrange(T), r.randrange(T), C["p2"] if r.random() < 0.7 else C["p1"])
    if pebbles:
        for _ in range(3):
            x, y = r.randrange(1, T - 2), r.randrange(1, T - 2)
            px(a, x, y, C["p3"]); px(a, x + 1, y, C["p2"]); px(a, x, y + 1, C["p4"])
    add(name, a)


def edge(name, base_fn, kind):
    """Path or stone edge: soft fringe toward grass on top or bottom."""
    a = base_fn()
    r = rng(hash(name) & 0xFFFF)
    rows = range(0, 3) if kind == "top" else range(T - 3, T)
    for y in rows:
        d = y if kind == "top" else T - 1 - y
        for x in range(T):
            if r.random() < (0.9 - d * 0.35):
                px(a, x, y, C["g2"] if r.random() < 0.7 else C["g1"])
    add(name, a)


def stone(name, seed, tint=0):
    a = new(); fill(a, C["s1"] if tint == 0 else C["s2"])
    # brick-like pavers 8x8 with offset rows
    for y in range(T):
        for x in range(T):
            if y % 8 == 0 or (x + (4 if (y // 8) % 2 else 0)) % 8 == 0:
                px(a, x, y, C["s3"])
    r = rng(seed)
    for _ in range(14):
        px(a, r.randrange(T), r.randrange(T), C["s2"])
    add(name, a)


def sand(name, seed):
    a = new(); fill(a, C["p1"])
    r = rng(seed)
    for _ in range(36):
        px(a, r.randrange(T), r.randrange(T), C["p2"] if r.random() < 0.6 else C["white"])
    # ripples
    for k in range(2):
        y = r.randrange(2, T - 2); x = r.randrange(0, T - 5)
        for i in range(5):
            px(a, x + i, y + (1 if i in (0, 4) else 0), C["p2"])
    add(name, a)


def water(name, frame, kind="mid"):
    a = new()
    base = {"mid": C["w2"], "shore": C["w2"], "deep": C["w3"]}[kind]
    hi = {"mid": C["w1"], "shore": C["w1"], "deep": C["w2"]}[kind]
    lo = {"mid": C["w3"], "shore": C["w3"], "deep": C["w4"]}[kind]
    fill(a, base)
    r = rng(7 if kind != "deep" else 9)
    # wave crests move right 4px per frame, wrapping, so the 4 frames loop
    for k in range(3):
        y = (3 + k * 5) % T
        x0 = (k * 7 + frame * 4) % T
        for i in range(6):
            px(a, x0 + i, y + (0 if i in (1, 2, 3, 4) else 1), hi)
        for i in range(3):
            px(a, x0 + 2 + i, y + 1, lo)
    for _ in range(8):
        px(a, r.randrange(T), r.randrange(T), lo)
    if kind == "shore":
        for x in range(T):
            px(a, x, 0, C["w0"] if (x + frame * 2) % 4 < 2 else C["w1"])
            if (x + frame) % 3 == 0:
                px(a, x, 1, C["w0"])
    add(name, a)


def wood(name, seed, alt=False):
    a = new(); fill(a, C["d1"] if not alt else C["d2"])
    for y in (0, 8):
        for x in range(T):
            px(a, x, y, C["d3"])
    for y in (7, 15):
        for x in range(T):
            px(a, x, y, C["d2"])
    r = rng(seed)
    for _ in range(10):
        x, y = r.randrange(T), r.randrange(T)
        for i in range(3):
            px(a, x + i, y, C["d2"])
    px(a, 2, 3, C["d4"]); px(a, 13, 11, C["d4"])
    add(name, a)


def hedge(name, seed, top=False):
    a = new(); fill(a, C["g3"])
    r = rng(seed)
    for _ in range(40):
        x, y = r.randrange(T), r.randrange(T)
        px(a, x, y, C["g4"] if r.random() < 0.5 else C["g2"])
    for _ in range(6):
        x, y = r.randrange(T), r.randrange(T)
        for dx, dy in ((0, 0), (1, 0), (0, 1)):
            px(a, x + dx, y + dy, C["g1"])
    if top:
        for x in range(T):
            h = 2 + int(2 * abs(((x * 5) % 9) - 4) / 4)
            for y in range(h):
                a[y, x, 3] = 0
            px(a, x, h, C["g1"]); px(a, x, h + 1, C["g2"])
    add(name, a)


def fence(name, post):
    a = new()
    for x in range(T):
        for y in (5, 6, 11, 12):
            px(a, x, y, C["d1"] if y in (5, 11) else C["d3"])
    if post:
        for y in range(2, 16):
            for x in (6, 7, 8, 9):
                px(a, x, y, C["d2"] if x in (6, 7) else C["d3"])
        for x in (6, 7, 8, 9):
            px(a, x, 2, C["d1"])
    add(name, a)


def checker(name, flip):
    a = new()
    for y in range(T):
        for x in range(T):
            on = ((x // 4) + (y // 4) + flip) % 2 == 0
            px(a, x, y, C["ink"] if on else C["white"])
    add(name, a)


def cliff(name, kind):
    a = new(); fill(a, C["p3"])
    for y in range(T):
        for x in range(T):
            if (x * 3 + y * 5) % 11 == 0:
                px(a, x, y, C["p4"])
            if y < 3:
                px(a, x, y, C["g2"] if kind == "top" else C["p2"])
    add(name, a)


def blank(name):
    add(name, new())


def build():
    for i, (n, s, f) in enumerate([("grass0", 1, None), ("grass1", 2, None), ("grass_w", 3, "white"), ("grass_p", 4, "red")]):
        grass(n, s, f)
    grass("grass_dark", 5, None, dark=True)
    grass("grass_dark2", 6, "vio", dark=True)
    path("path0", 11); path("path1", 12, True)
    edge("path_top", lambda: _tile(path_tile=0), "top")
    edge("path_bot", lambda: _tile(path_tile=0), "bottom")
    stone("stone0", 21); stone("stone1", 22, 1)
    edge("stone_top", lambda: _tile(stone_tile=0), "top")
    sand("sand0", 31); sand("sand1", 32)
    # pad row 0 to 16 columns
    while len(TILES) < COLS:
        blank(f"pad0_{len(TILES)}")
    for f in range(4):
        water(f"water{f}", f, "mid")
    for f in range(4):
        water(f"shore{f}", f, "shore")
    for f in range(4):
        water(f"deep{f}", f, "deep")
    wood("wood0", 41); wood("wood1", 42, True)
    hedge("hedge0", 51); hedge("hedge1", 52); hedge("hedge_top", 53, top=True)
    fence("fence", False); fence("fence_post", True)
    checker("check0", 0); checker("check1", 1)
    cliff("cliff_top", "top"); cliff("cliff", "mid")
    while len(TILES) < COLS * ROWS:
        blank(f"pad_{len(TILES)}")


def _tile(path_tile=None, stone_tile=None):
    if path_tile is not None:
        return TILES[IDS["path0"]].copy()
    return TILES[IDS["stone0"]].copy()


def main():
    build()
    sheet = np.zeros((ROWS * T, COLS * T, 4), np.uint8)
    for i, t in enumerate(TILES):
        sheet[(i // COLS) * T:(i // COLS + 1) * T, (i % COLS) * T:(i % COLS + 1) * T] = t
    out = os.path.join(ROOT, "public/assets/tiles"); os.makedirs(out, exist_ok=True)
    Image.fromarray(sheet, "RGBA").save(os.path.join(out, "tiles.png"))
    json.dump(IDS, open(os.path.join(ROOT, "tools/tile_ids.json"), "w"), indent=1)
    anim = []
    for base in ("water", "shore", "deep"):
        ids = [IDS[f"{base}{f}"] for f in range(4)]
        for k, tid in enumerate(ids):
            frames = "".join(f'<frame tileid="{ids[(k + j) % 4]}" duration="220"/>' for j in range(4))
            anim.append(f' <tile id="{tid}"><animation>{frames}</animation></tile>')
    tsx = (f'<?xml version="1.0" encoding="UTF-8"?>\n<tileset version="1.8" tiledversion="1.8.2" name="tiles" tilewidth="16" tileheight="16" '
           f'tilecount="{COLS * ROWS}" columns="{COLS}">\n <image source="../public/assets/tiles/tiles.png" width="{COLS * T}" height="{ROWS * T}"/>\n'
           + "\n".join(anim) + "\n</tileset>\n")
    open(os.path.join(ROOT, "maps-src/tiles.tsx"), "w").write(tsx)
    # preview x4
    big = Image.fromarray(sheet, "RGBA")
    bg = Image.new("RGBA", big.size, (200, 200, 220, 255)); bg.alpha_composite(big)
    os.makedirs(os.path.join(ROOT, "docs/art"), exist_ok=True)
    bg.resize((big.width * 4, big.height * 4), Image.NEAREST).save(os.path.join(ROOT, "docs/art/tiles_preview.png"))
    print(len(IDS), "tile names,", COLS * ROWS, "slots")


if __name__ == "__main__":
    main()
