#!/usr/bin/env python3
"""Build the unicorn sprite strips (96x96 cells) from the Higgsfield sheets."""
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import pixlib as P, extract as E
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CW = CH = 96
GX, GROUND = 48, 92
T = 7.50
PAL = P.master_palette(['outline', 'white', 'mane', 'blush', 'nose', 'gold', 'gray', 'tongue', 'red', 'cloud'])
SRC = {'run': 'unicorn_run_v2', 'jump': 'unicorn_jump', 'crouch': 'unicorn_crouch', 'fast': 'unicorn_fast',
       'hit': 'unicorn_hit', 'idle': 'unicorn_idle', 'fly': 'unicorn_fly'}
# anim: (sheet, [frame idx], fps, loop, mode, optional dy list)
ANIMS = {
    'idle':            ('idle',   [0, 1, 2, 3, 2, 1], 6, True, 'ground'),
    'run':             ('run',    [0, 1, 2, 3, 4, 5, 6, 7], 16, True, 'ground'),
    'run_fast':        ('fast',   [0, 1, 2, 3], 14, True, 'ground'),
    'jump_takeoff':    ('jump',   [0], 10, False, 'ground'),
    'jump_rise':       ('jump',   [1, 2], 10, True, 'center'),
    'jump_apex':       ('jump',   [3, 4], 8, True, 'center'),
    'fall':            ('jump',   [5, 6], 10, True, 'center'),
    'land':            ('jump',   [7, 0], 20, False, 'ground'),
    'crouch_enter':    ('crouch', [3, 2], 30, False, 'ground'),
    'crouch_run':      ('crouch', [0, 1, 2, 1], 10, True, 'ground'),
    'crouch_exit':     ('crouch', [2, 3], 30, False, 'ground'),
    'fast_fall':       ('fast',   [6, 7], 12, True, 'center'),
    'stomp':           ('jump',   [2, 1], 12, False, 'center'),
    'hit':             ('hit',    [0, 1, 2], 12, False, 'ground'),
    'tired_in':        ('hit',    [3, 4, 5, 6], 6, False, 'ground'),
    'tired_loop':      ('hit',    [7, 8], 4, True, 'ground'),
    'celebrate':       ('idle',   [4, 5, 6, 7], 10, False, 'ground', [0, -10, -18, -4]),
    'title_fly':       ('fly',    [0, 1, 2, 3], 8, True, 'center'),
    'ready':           ('fly',    [4, 5, 6], 6, False, 'ground'),
    'respawn':         ('fly',    [7], 6, True, 'ground'),
}


def build():
    sheets = {}
    for k, n in SRC.items():
        fr = E.extract(os.path.join(ROOT, 'art-src/higgsfield/h3', f'{n}_v1.png'), ('horn', T, 0.14))
        sheets[k] = [P.snap_lab(f, PAL) for f in fr]
    # standing centroid height above ground (for center-anchored air frames)
    f0 = sheets['idle'][0]
    al = f0[..., 3] > 0
    white = al & (f0[..., :3].astype(int).sum(2) > 640)
    ys, _ = np.where(white)
    c0 = np.where(al)[0].max() - ys.mean()
    gy_center = GROUND - c0
    out_dir = os.path.join(ROOT, 'assets/sprites')
    os.makedirs(out_dir, exist_ok=True)
    meta = {}
    review = []
    for name, spec in ANIMS.items():
        sh, idx, fps, loop, mode = spec[:5]
        dys = spec[5] if len(spec) > 5 else [0] * len(idx)
        frames = [sheets[sh][i] for i in idx]
        cells = []
        for f, dy in zip(frames, dys):
            cells += E.fit([f], CW, CH, GX, (GROUND if mode == 'ground' else gy_center) + dy, mode)
        strip = np.concatenate(cells, axis=1)
        P.save_png(strip, os.path.join(out_dir, f'unicorn_{name}.png'))
        meta[f'unicorn_{name}'] = {'cell': [CW, CH], 'frames': len(cells), 'fps': fps, 'loop': loop, 'pivot': [GX, GROUND]}
        review.append((name, cells))
    json.dump(meta, open(os.path.join(ROOT, 'src/data/anims_unicorn.json'), 'w'), indent=1)
    # review sheet
    rows = []
    for name, cells in review:
        rows.append(np.concatenate(cells + [np.zeros((CH, CW * (8 - len(cells)), 4), np.uint8)] if len(cells) < 8 else cells, axis=1))
    big = np.concatenate(rows, axis=0)
    os.makedirs(os.path.join(ROOT, 'docs/qa'), exist_ok=True)
    img = Image.new('RGBA', (big.shape[1], big.shape[0]), (122, 192, 255, 255))
    img.alpha_composite(Image.fromarray(big, 'RGBA'))
    img.resize((img.width // 2 * 1, img.height // 2 * 1), Image.NEAREST).save(os.path.join(ROOT, 'docs/qa/unicorn_sheet.png'))
    return meta


if __name__ == '__main__':
    m = build()
    print(len(m), 'unicorn strips built')
