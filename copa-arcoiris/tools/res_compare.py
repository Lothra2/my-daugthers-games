#!/usr/bin/env python3
"""M2: render the 5 characters from the lineup at 32x32 and 48x48 cells, side by side at integer zoom."""
import os, sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixlib as pl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "art-src/higgsfield/identity/lineup_family.png")
NAMES = ["papa", "mama", "sophie", "alana", "thor"]
H48 = {"papa": 44, "mama": 42, "sophie": 38, "alana": 33}   # ART_BIBLE section 2
DOG48_W = 40
K = 26


def _split(mask, span, parts):
    """Split a merged span into `parts` pieces at the emptiest columns (touching hair or shadows)."""
    x0, x1 = span
    occ = mask[:, x0:x1 + 1].sum(0).astype(float)
    occ = np.convolve(occ, np.ones(9) / 9, mode="same")
    cuts, last = [], 0
    for k in range(1, parts):
        center = int(len(occ) * k / parts)
        win = range(max(last + 60, center - len(occ) // (parts * 3)), min(len(occ) - 60, center + len(occ) // (parts * 3)))
        c = min(win, key=lambda i: occ[i])
        cuts.append(c)
        last = c
    edges = [0] + cuts + [len(occ) - 1]
    return [(x0 + edges[i], x0 + edges[i + 1]) for i in range(parts)]


def segment(a, mask):
    spans = pl.components_by_columns(mask.astype(np.uint8), gap=6, min_w=60)
    out = []
    for sp in spans:
        parts = max(1, round((sp[1] - sp[0]) / 480))   # one character is about 450 px wide in a 2912 px lineup
        out += _split(mask, sp, parts) if parts > 1 else [sp]
    assert len(out) == 5, f"expected 5 characters, found {len(out)}: {out}"
    return out


def render(a, mask, span, name, cell):
    x0, x1 = span
    sub, sm = a[:, x0:x1 + 1], mask[:, x0:x1 + 1]
    ys = np.where(sm.any(1))[0]
    sub, sm = sub[ys.min():ys.max() + 1], sm[ys.min():ys.max() + 1]
    # drop the ground shadow ellipse: it is the cyan-ish darker band below the feet, already part of bg flooding mostly
    h, w = sm.shape
    if name == "thor":
        target = round(DOG48_W * cell / 48) - 2
        block = w / target
    else:
        target = round(H48[name] * cell / 48) - 2
        block = h / target
    arr = pl.resample_clean(sub, sm, block)
    arr = pl.despeckle(arr, 1)
    arr = pl.remove_small(arr, 4)
    return arr


def main():
    a = pl.load_rgb(SRC)
    mask = pl.key_background(a, tol=110)
    mask = pl.ndi.binary_opening(mask, iterations=2)
    spans = segment(a, mask)
    out = {}
    for cell in (32, 48):
        arrs = [render(a, mask, s, n, cell) for s, n in zip(spans, NAMES)]
        pal = pl.make_palette(arrs, k=K * 2)
        arrs = [pl.add_outline(pl.snap_lab(x, pal)) for x in arrs]
        out[cell] = arrs
    # compose
    zoom = 6
    cw = 52
    W = 5 * cw * zoom + 20
    H = (48 + 6) * zoom * 2 + 40
    img = Image.new("RGBA", (W, H), (120, 190, 255, 255))
    d = ImageDraw.Draw(img)
    for row, cell in enumerate((32, 48)):
        y0 = 20 + row * (54 * zoom + 0)
        for i, arr in enumerate(out[cell]):
            c = pl.place(arr, cell + 4, cell + 4, (cell + 4) // 2, cell + 2, arr.shape[1] // 2, arr.shape[0] - 1)
            im = Image.fromarray(c, "RGBA").resize(((cell + 4) * zoom, (cell + 4) * zoom), Image.NEAREST)
            img.alpha_composite(im, (10 + i * cw * zoom + (cw - cell - 4) * zoom // 2, y0 + (48 - cell) * zoom))
        d.text((12, 4 + row * 54 * zoom), f"celda {cell}x{cell} (zoom x{zoom})", fill=(30, 20, 50, 255))
    os.makedirs(os.path.join(ROOT, "docs/art"), exist_ok=True)
    img.save(os.path.join(ROOT, "docs/art/res_compare.png"))
    for cell in (32, 48):
        for n, arr in zip(NAMES, out[cell]):
            print(cell, n, arr.shape[:2], "colors", len({tuple(p) for p in arr[arr[..., 3] > 0][:, :3]}))


if __name__ == "__main__":
    main()
