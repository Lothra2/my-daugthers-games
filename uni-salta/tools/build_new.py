#!/usr/bin/env python3
"""Build the second wave of art (H9): worlds 7-9 props and floors, five new characters, two bosses and the boss orbs.
Colour palettes for these families are derived from their own sheets and stored in src/data/palette.json."""
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import pixlib as P, extract as E, build_world as BW
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H9 = os.path.join(ROOT, 'art-src/higgsfield/h9')
OUT = os.path.join(ROOT, 'assets/sprites')
PAL_PATH = os.path.join(ROOT, 'src/data/palette.json')


def hexs(pal):
    return ['#%02X%02X%02X' % tuple(c) for c in pal]


def store_palette(name, frames, k=26):
    pal = json.load(open(PAL_PATH))
    pal[name] = hexs([c for c in P.make_palette(frames, k, force=()) if tuple(c) != P.OUTLINE])
    json.dump(pal, open(PAL_PATH, 'w'), indent=1)
    return P.master_palette(['outline', 'white', name])


# ------------------------------------------------------------------ worlds 7-9
def build_worlds():
    BW.KITS.update({7: (0, 150), 8: (0, 118), 9: (0, 118)})
    BW.SPAN.update({7: (0.03, 0.97), 8: (0.03, 0.97), 9: (0.03, 0.97)})
    man = json.load(open(os.path.join(ROOT, 'src/data/world_assets.json')))
    for w in (7, 8, 9):
        ri, rw = BW.KITS[w]
        fr, dl = E.extract_kit(os.path.join(BW.H6, f'props_w{w}_v1.png'), 8, ri, rw, 'w')
        pal = store_palette(f'w{w}', fr, 30)
        BW.PAL_ALL = pal
        fr = [P.snap_lab(f, pal) for f in fr]
        names = []
        for i, f in enumerate(fr):
            BW.save(f, f'{BW.ASSETS}/props/w{w}/prop_{i}.png'); names.append([f.shape[1], f.shape[0]])
        fl = BW.make_floor(w, f'{BW.ASSETS}/tiles/w{w}')
        man['worlds'][str(w)] = {'props': names, 'tiles': fl}
        print('world', w, names, fl)
    json.dump(man, open(os.path.join(ROOT, 'src/data/world_assets.json'), 'w'), indent=1)


# ------------------------------------------------------------------ characters
SHEETS = {  # name -> (scale rule, k colours)
    'crab': (('ref', 0, 34, 'h'), 22), 'wheel': (('ref', 0, 40, 'h'), 20), 'ghost': (('ref', 0, 44, 'h'), 18),
    'penguin': (('ref', 0, 46, 'h'), 20), 'invader': (('ref', 0, 40, 'h'), 20),
}
ANIMS = {  # anim: (sheet, frames, fps, loop, anchor)
    'crab_walk': ('crab', [0, 1, 2, 3], 8, True, 'ground'),
    'crab_warn': ('crab', [4], 8, True, 'ground'),
    'crab_dizzy': ('crab', [5, 6], 8, True, 'ground'),
    'wheel_roll': ('wheel', [0, 1, 2, 3, 4, 5, 6, 7], 18, True, 'center'),
    'ghost_float': ('ghost', [0, 1, 2, 3], 8, True, 'center'),
    'ghost_boo': ('ghost', [4, 5], 10, True, 'center'),
    'ghost_dizzy': ('ghost', [6, 7], 8, True, 'center'),
    'penguin_wobble': ('penguin', [0, 1, 2], 10, True, 'ground'),
    'penguin_slide': ('penguin', [3, 4], 12, True, 'ground'),
    'penguin_dizzy': ('penguin', [5, 6, 7], 8, True, 'ground'),
    'invader_hover': ('invader', [0, 1, 2, 3, 4, 5], 8, True, 'center'),
    'invader_zap': ('invader', [6], 8, True, 'center'),
}


def cells_for(frames, anchor):
    cw = max(f.shape[1] for f in frames) + 4
    ch = max(f.shape[0] for f in frames) + 4
    cells = []
    for f in frames:
        h, w = f.shape[:2]
        if anchor == 'ground': cells.append(P.place(f, cw, ch, cw // 2, ch - 2, w // 2, h - 1)); piv = [cw // 2, ch - 2]
        elif anchor == 'center': cells.append(P.place(f, cw, ch, cw // 2, ch // 2, w // 2, h // 2)); piv = [cw // 2, ch // 2]
    return cells, cw, ch, piv


def build_chars(meta):
    sheets = {}
    for k, (rule, kcol) in SHEETS.items():
        fr = E.extract(os.path.join(H9, f'{k}_v1.png'), rule, rows=1, big=2500, min_area=300)
        pal = store_palette(k, fr, kcol)
        sheets[k] = [P.snap_lab(f, pal) for f in fr]
        print(k, len(fr), 'frames', [f.shape[:2] for f in fr][:3])
    for name, (sh, idx, fps, loop, anchor) in ANIMS.items():
        frames = [sheets[sh][min(i, len(sheets[sh]) - 1)] for i in idx]
        # all frames of the family share one cell so the hitbox pivot is stable
        cw = max(f.shape[1] for f in sheets[sh]) + 4; ch = max(f.shape[0] for f in sheets[sh]) + 4
        cells = []
        for f in frames:
            h, w = f.shape[:2]
            if anchor == 'ground': cells.append(P.place(f, cw, ch, cw // 2, ch - 2, w // 2, h - 1)); piv = [cw // 2, ch - 2]
            else: cells.append(P.place(f, cw, ch, cw // 2, ch // 2, w // 2, h // 2)); piv = [cw // 2, ch // 2]
        P.save_png(np.concatenate(cells, axis=1), os.path.join(OUT, f'{name}.png'))
        meta[name] = {'cell': [cw, ch], 'frames': len(cells), 'fps': fps, 'loop': loop, 'pivot': piv}


# ------------------------------------------------------------------ bosses and orbs
def build_bosses(meta):
    specs = {
        'queen': ('boss_queen', 86, {'idle': ([0, 1, 2, 1], 5, True), 'windup': ([3], 6, True), 'shoot': ([4], 6, True), 'hurt': ([6], 6, True), 'defeat': ([6, 7], 4, True)}),
        'king': ('boss_king', 118, {'idle': ([0, 1, 2, 1], 5, True), 'windup': ([3], 6, True), 'shoot': ([4], 6, True), 'hurt': ([5], 6, True), 'defeat': ([6, 7], 4, True)}),
    }
    for who, (sheet, width, anims) in specs.items():
        fr, dl = E.extract_kit(os.path.join(H9, f'{sheet}_v1.png'), 8, 0, width, 'w')
        pal = store_palette(who, fr, 30)
        fr = [P.snap_lab(f, pal) for f in fr]
        cw = max(f.shape[1] for f in fr) + 6; ch = max(f.shape[0] for f in fr) + 6
        for an, (idx, fps, loop) in anims.items():
            cells = [P.place(fr[i], cw, ch, cw // 2, ch - 3, fr[i].shape[1] // 2, fr[i].shape[0] - 1) for i in idx]
            P.save_png(np.concatenate(cells, axis=1), os.path.join(OUT, f'boss_{who}_{an}.png'))
            meta[f'boss_{who}_{an}'] = {'cell': [cw, ch], 'frames': len(cells), 'fps': fps, 'loop': loop, 'pivot': [cw // 2, ch - 3]}
        print('boss', who, cw, ch, 'dil', dl)
    fr, dl = E.extract_kit(os.path.join(H9, 'orbs_v1.png'), 8, 0, 30, 'w')
    pal = store_palette('orbs', fr, 28)
    fr = [P.snap_lab(f, pal) for f in fr]
    cw = max(f.shape[1] for f in fr) + 4; ch = max(f.shape[0] for f in fr) + 4
    for an, idx, fps in (('orb_bad', [0, 1, 2, 3], 12), ('orb_good', [4, 5, 6, 7], 10)):
        cells = [P.place(fr[i], cw, ch, cw // 2, ch // 2, fr[i].shape[1] // 2, fr[i].shape[0] // 2) for i in idx]
        P.save_png(np.concatenate(cells, axis=1), os.path.join(OUT, f'{an}.png'))
        meta[an] = {'cell': [cw, ch], 'frames': 4, 'fps': fps, 'loop': True, 'pivot': [cw // 2, ch // 2]}
    print('orbs', cw, ch)


if __name__ == '__main__':
    meta = {}
    build_worlds()
    build_chars(meta)
    build_bosses(meta)
    p = os.path.join(ROOT, 'src/data/anims_new.json')
    json.dump(meta, open(p, 'w'), indent=1)
    print(len(meta), 'new strips')
