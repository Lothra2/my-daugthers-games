#!/usr/bin/env python3
"""Bust portraits 64x64 (4 expressions per character) cut from the master sheets. Output: public/assets/ui/portraits.png (4 cols x 5 rows)."""
import os, sys, json
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixlib as pl, build_sprites as B

ROOT = B.ROOT
CHARS = ["sophie", "alana", "papa", "mama", "thor"]
# master frame indexes: happy, cheer (arms up), wave, three-quarter. Alana's laughing frame has a stray headband from the lineup, so it is skipped.
PICK = {"sophie": [0, 4, 7, 1], "alana": [0, 4, 7, 1], "papa": [0, 4, 7, 1], "mama": [0, 4, 7, 1], "thor": [0, 4, 5, 1]}
S = 64


def bust(sub, sm, human=True):
    h, w = sm.shape
    top = int(h * (0.50 if human else 0.62))
    sub, sm = sub[:top], sm[:top]
    if not human:
        sub, sm = sub[:, int(w * 0.35):], sm[:, int(w * 0.35):]
    ys = np.where(sm.any(1))[0]; xs = np.where(sm.any(0))[0]
    sub, sm = sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1], sm[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    hh, ww = sm.shape
    scale = (S - 4) / max(hh, ww)
    return B.downscale(sub, sm, scale)


def main():
    rows = []
    for c in CHARS:
        frames = B.frame_arrays(os.path.join(ROOT, f"art-src/higgsfield/identity/master_{c}.png"))
        pal = B.char_palette(c, 30)
        cells = []
        for i in PICK[c]:
            sub, sm = frames[i]
            arr = bust(sub, sm, c != "thor")
            arr = B.finish(arr, pal)
            cell = pl.place(arr, S, S, S // 2, S - 1, arr.shape[1] // 2, arr.shape[0] - 1)
            cells.append(cell)
        rows.append(np.concatenate(cells, axis=1))
    atlas = np.concatenate(rows, axis=0)
    os.makedirs(os.path.join(ROOT, "public/assets/ui"), exist_ok=True)
    pl.save_png(atlas, os.path.join(ROOT, "public/assets/ui/portraits.png"))
    big = Image.fromarray(atlas, "RGBA"); bg = Image.new("RGBA", big.size, (255, 244, 222, 255)); bg.alpha_composite(big)
    bg.resize((big.width * 3, big.height * 3), Image.NEAREST).save(os.path.join(ROOT, "docs/qa/portraits.png"))
    json.dump({"cell": S, "cols": 4, "rows": CHARS, "expr": ["feliz", "ganador", "saludo", "tres_cuartos"]}, open(os.path.join(ROOT, "public/assets/ui/portraits.json"), "w"))
    print(atlas.shape)


if __name__ == "__main__":
    main()
