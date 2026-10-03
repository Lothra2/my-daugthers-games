#!/usr/bin/env python3
"""Build enemy / animal / candy sprite strips from the Higgsfield sheets and Sophie's references."""
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import pixlib as P, extract as E
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H4 = os.path.join(ROOT, 'art-src/higgsfield/h4')
OUT = os.path.join(ROOT, 'assets/sprites')
os.makedirs(OUT, exist_ok=True)

# sheet -> (scale rule, rows, palette groups, crop overrides {idx: (rows_to_keep)})
SHEETS = {
    'slime_flat':  (('ref', 0, 40, 'h'), 1, ['outline', 'lime', 'teeth', 'tongue', 'red', 'white']),
    'slime_spiky': (('ref', 0, 54, 'h'), 1, ['outline', 'lime', 'teeth', 'tongue', 'red', 'white']),
    'snake_fly':   (('ref', 0, 120, 'w'), 2, ['outline', 'lime', 'tongue', 'teeth', 'red', 'white']),
    'snake_hang':  (('ref', 3, 150, 'h'), 1, ['outline', 'lime', 'tongue', 'teeth', 'cloud', 'white', 'red']),
    'snail':       (('ref', 0, 46, 'h'), 1, ['outline', 'peach', 'rainbow', 'red', 'gold', 'white', 'emerald', 'sky', 'gray']),
    'bee':         (('ref', 0, 42, 'h'), 1, ['outline', 'peach', 'white', 'gold', 'sky', 'gray', 'blush', 'red']),
    'owl':         (('ref', 5, 58, 'h'), 1, ['outline', 'owl', 'white', 'gold', 'gray', 'peach', 'red']),
    'storm':       (('ref', 0, 56, 'h'), 1, ['outline', 'storm', 'gold', 'red', 'white', 'gray', 'sky']),
    'jelly':       (('ref', 3, 68, 'h'), 1, ['outline', 'jelly', 'white', 'sky', 'gold']),
    'thor':        (('ref', 0, 56, 'h'), 1, ['outline', 'boxer', 'white', 'red', 'gray', 'tongue', 'sky']),
}
# anim: (sheet, frame idx list, fps, loop, anchor)   anchor: ground | center | top
ANIMS = {
    'slime_flat_idle':    ('slime_flat', [0, 1, 2, 3], 8, True, 'ground'),
    'slime_flat_lookup':  ('slime_flat', [4, 5], 8, True, 'ground'),
    'slime_flat_stomped': ('slime_flat', [6, 7, 7], 12, False, 'ground'),
    'slime_spiky_idle':   ('slime_spiky', [0, 1, 2, 3], 8, True, 'ground'),
    'slime_spiky_hop':    ('slime_spiky', [4, 5, 5, 7], 12, True, 'ground'),
    'snake_fly_slither':  ('snake_fly', [0, 1, 2, 3, 4, 5], 10, True, 'center'),
    'snake_fly_tongue':   ('snake_fly', [6, 7], 8, True, 'center'),
    'snake_hang_drop':    ('snake_hang', [0, 1, 2, 3], 14, False, 'top'),
    'snake_hang_sway':    ('snake_hang', [3, 4, 5, 4], 6, True, 'top'),
    'snake_hang_tongue':  ('snake_hang', [6, 3], 8, False, 'top'),
    'snake_hang_pout':    ('snake_hang', [7], 8, True, 'top'),
    'snail_crawl':        ('snail', [0, 1, 2, 3], 8, True, 'ground'),
    'snail_hide':         ('snail', [4, 5], 10, False, 'ground'),
    'snail_peek':         ('snail', [6, 7], 6, True, 'ground'),
    'bee_fly':            ('bee', [0, 1, 2, 3], 24, True, 'center'),
    'bee_switch':         ('bee', [4, 5], 12, False, 'center'),
    'bee_dizzy':          ('bee', [6, 7], 8, True, 'center'),
    'owl_sleep':          ('owl', [0, 1], 4, True, 'ground'),
    'owl_wake':           ('owl', [2, 3], 12, False, 'ground'),
    'owl_glide':          ('owl', [4, 5, 6, 5], 10, True, 'center'),
    'owl_yawn':           ('owl', [7], 8, True, 'center'),
    'storm_float':        ('storm', [0, 1, 2, 3], 6, True, 'center'),
    'storm_charge':       ('storm', [4, 5, 6], 16, False, 'center'),
    'storm_zap':          ('storm', [7], 20, False, 'center'),
    'storm_sigh':         ('storm', [8, 9], 8, False, 'center'),
    'jelly_bob':          ('jelly', [0, 1, 2, 3, 4, 5, 4, 3, 2, 1], 8, True, 'center'),
    'jelly_giggle':       ('jelly', [6, 7], 10, True, 'center'),
    'thor_run':           ('thor', [0, 1, 2, 3], 12, True, 'ground'),
    'thor_bark':          ('thor', [4, 3, 4], 10, False, 'ground'),
    'thor_sit':           ('thor', [5], 3, True, 'ground'),
    'thor_lick':          ('thor', [6], 6, True, 'ground'),
}


def fix_special(name, idx, f):
    if name == 'storm' and idx == 7:      # bolt is drawn as FX in code
        return P.remove_small(f[:61], 5)
    if name == 'thor' and idx == 5:       # drop the stray sound marks
        return P.remove_small(f, 60)
    return f


def build():
    sheets = {}
    for k, (rule, rows, groups) in SHEETS.items():
        pal = P.master_palette(groups)
        fr = E.extract(os.path.join(H4, f'{k}_v1.png'), rule, rows=rows)
        sheets[k] = [P.snap_lab(fix_special(k, i, f), pal) for i, f in enumerate(fr)]
    meta, review = {}, []
    for name, (sh, idx, fps, loop, anchor) in ANIMS.items():
        frames = [sheets[sh][i] for i in idx]
        cw = max(f.shape[1] for f in sheets[sh]) + 4
        ch = max(f.shape[0] for f in sheets[sh]) + 4
        cells = []
        for f in frames:
            h, w = f.shape[:2]
            if anchor == 'ground':
                cell = P.place(f, cw, ch, cw // 2, ch - 2, w // 2, h - 1)
                piv = [cw // 2, ch - 2]
            elif anchor == 'top':
                cell = P.place(f, cw, ch, cw // 2, 1, w // 2, 0)
                piv = [cw // 2, 1]
            else:
                cell = P.place(f, cw, ch, cw // 2, ch // 2, w // 2, h // 2)
                piv = [cw // 2, ch // 2]
            cells.append(cell)
        P.save_png(np.concatenate(cells, axis=1), os.path.join(OUT, f'{name}.png'))
        meta[name] = {'cell': [cw, ch], 'frames': len(cells), 'fps': fps, 'loop': loop, 'pivot': piv}
        review.append((name, cells))
    # --- candies from Sophie's drawings
    def cand(refname, h, groups, key='h'):
        fr = E.extract(os.path.join(ROOT, 'reference', refname), ('ref', 0, h, key), rows=1, min_area=2000, big=20000)
        return P.add_outline(P.snap_lab(fr[0], P.master_palette(groups)))
    candies = {
        'yellow': cand('ref_candy_yellow_lollipop.png', 56, ['outline', 'gold', 'white', 'ui']),
        'green': cand('ref_candy_green.png', 38, ['outline', 'emerald', 'white']),
        'red': cand('ref_candy_red.png', 38, ['outline', 'red', 'white']),
        'coin': cand('ref_candy_yellow_swirl.png', 28, ['outline', 'gold', 'white']),
    }
    for k, f in candies.items():
        P.save_png(f, os.path.join(OUT, f'candy_{k}_base.png'))
    json.dump(meta, open(os.path.join(ROOT, 'src/data/anims_entities.json'), 'w'), indent=1)
    # review sheet
    rows = []
    for name, cells in review:
        row = np.concatenate(cells, axis=1)
        rows.append(row)
    W = max(r.shape[1] for r in rows)
    padded = []
    for r in rows:
        pad = np.zeros((r.shape[0], W - r.shape[1], 4), np.uint8)
        padded.append(np.concatenate([r, pad], axis=1))
    big = np.concatenate(padded, axis=0)
    img = Image.new('RGBA', (big.shape[1], big.shape[0]), (140, 200, 255, 255))
    img.alpha_composite(Image.fromarray(big, 'RGBA'))
    img.save(os.path.join(ROOT, 'docs/qa/entities_sheet.png'))
    cs = np.concatenate([np.pad(candies[k], ((0, 60 - candies[k].shape[0]), (0, 4), (0, 0))) for k in candies], axis=1)
    ci = Image.new('RGBA', (cs.shape[1], cs.shape[0]), (140, 200, 255, 255)); ci.alpha_composite(Image.fromarray(cs, 'RGBA'))
    ci.resize((ci.width * 4, ci.height * 4), Image.NEAREST).save('/tmp/candies_review.png')
    return meta


if __name__ == '__main__':
    print(len(build()), 'entity strips built')
