#!/usr/bin/env python3
"""Block, rescue cloud, coin spin, candy shine and heart sprites."""
import sys, os, json, pickle, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import pixlib as P
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets/sprites')
meta = {}


def strip(name, frames, fps, loop, anchor='center'):
    cw = max(f.shape[1] for f in frames) + 2
    ch = max(f.shape[0] for f in frames) + 2
    cells = []
    for f in frames:
        h, w = f.shape[:2]
        if anchor == 'ground':
            cells.append(P.place(f, cw, ch, cw // 2, ch - 1, w // 2, h - 1))
        else:
            cells.append(P.place(f, cw, ch, cw // 2, ch // 2, w // 2, h // 2))
    P.save_png(np.concatenate(cells, axis=1), os.path.join(OUT, f'{name}.png'))
    meta[name] = {'cell': [cw, ch], 'frames': len(cells), 'fps': fps, 'loop': loop, 'pivot': [cw // 2, ch // 2 if anchor != 'ground' else ch - 1]}


def hscale(f, w):
    im = Image.fromarray(f, 'RGBA')
    return np.array(im.resize((max(2, w), f.shape[0]), Image.NEAREST))


def glint(base, k):
    f = base.copy()
    h, w = f.shape[:2]
    spots = [(w // 4, h // 4), (w // 2, h // 5), (3 * w // 5, h // 3), (w // 3, h // 2)]
    x, y = spots[k % 4]
    for dx, dy in [(0, 0), (-1, 0), (1, 0), (0, -1), (0, 1), (-2, 0), (2, 0), (0, -2), (0, 2)][: 5 if k % 2 else 9]:
        xx, yy = x + dx, y + dy
        if 0 <= xx < w and 0 <= yy < h and f[yy, xx, 3] > 0:
            f[yy, xx, :3] = (255, 255, 255)
    return f


def heart(full=True):
    art = [
        "..XXX...XXX..",
        ".XRRRX.XRRRX.",
        "XRWWRRXRRRRRX",
        "XRWRRRRRRRRSX",
        "XRRRRRRRRRRSX",
        ".XRRRRRRRRSX.",
        "..XRRRRRRSX..",
        "...XRRRRSX...",
        "....XRRSX....",
        ".....XSX.....",
        "......X......",
    ]
    cols = {'X': P.OUTLINE, 'R': (255, 92, 112), 'W': (255, 194, 203), 'S': (232, 23, 58)}
    if not full:
        cols = {'X': (69, 58, 89), 'R': (156, 147, 173), 'W': (205, 188, 227), 'S': (107, 94, 128)}
    a = np.zeros((len(art), len(art[0]), 4), np.uint8)
    for y, row in enumerate(art):
        for x, ch in enumerate(row):
            if ch in cols:
                a[y, x] = (*cols[ch], 255)
    return np.array(Image.fromarray(a, 'RGBA').resize((a.shape[1] * 2, a.shape[0] * 2), Image.NEAREST))


def main():
    d = pickle.load(open('/tmp/blockrescue.pkl', 'rb'))
    b, r = d['block'], d['rescue']
    strip('block_idle', [b[0], b[1], b[2], b[3]], 8, True)
    strip('block_empty', [b[7]], 1, False)
    strip('rescue_bob', [r[0], r[1], r[2], r[3]], 6, True)
    strip('rescue_fly', [r[4], r[5]], 8, True)
    strip('rescue_thumb', [r[6], r[7]], 6, True)
    coin = P.load_rgb if False else np.array(Image.open(os.path.join(OUT, 'candy_coin_base.png')).convert('RGBA'))
    w = coin.shape[1]
    strip('candy_coin_spin', [coin, hscale(coin, int(w * 0.7)), hscale(coin, int(w * 0.35)), hscale(coin, int(w * 0.7))], 10, True)
    for k in ('yellow', 'green', 'red'):
        base = np.array(Image.open(os.path.join(OUT, f'candy_{k}_base.png')).convert('RGBA'))
        strip(f'candy_{k}', [glint(base, i) for i in range(4)], 8, True)
    for nm, full in (('ui_heart_full', True), ('ui_heart_empty', False)):
        P.save_png(heart(full), os.path.join(ROOT, f'assets/ui/{nm}.png'))
    os.makedirs(os.path.join(ROOT, 'assets/ui'), exist_ok=True)
    json.dump(meta, open(os.path.join(ROOT, 'src/data/anims_misc.json'), 'w'), indent=1)
    print('misc strips', len(meta))


os.makedirs(os.path.join(ROOT, 'assets/ui'), exist_ok=True)
main()
