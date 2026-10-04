#!/usr/bin/env python3
"""Turn raw Higgsfield sheets (8 poses in a row) into engine-ready 48x48 sprite atlases.

Usage: build_sprites.py <char> [--preview]
Output: public/assets/sprites/<char>.png (8 columns x N rows of 48x48), <char>.json, docs/qa/sprites/<char>.png (x4 contact sheet)

Rules (ART_BIBLE section 9): one scale per sheet from the standing height, 1px outline #2A1B3D, character palette,
feet on row 46, centroid on column 24.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixlib as pl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CELL, FEET_Y, MID_X = 48, 46, 24
OUT = pl.OUTLINE
TARGET_H = {"sophie": 38, "alana": 33, "papa": 44, "mama": 42}   # standing height incl. outline
DOG_LEN = 40                                                      # Thor body length in a run frame, incl. outline

# animation layout per sheet. (name, first frame, count, fps, loop). fps 0 = driven by game state
SHEETS_H = [
    ("run", [("run", 0, 8, 14, True)]),
    ("walk_idle", [("walk", 0, 6, 10, True), ("idle", 6, 2, 3, True)]),
    ("jump_pickup", [("jump_takeoff", 0, 1, 0, False), ("jump_rise", 1, 1, 0, False), ("jump_apex", 2, 1, 0, False), ("jump_fall", 3, 1, 0, False),
                     ("land", 4, 1, 12, False), ("pickup", 5, 3, 12, False)]),
    ("carry_throw", [("carry_idle", 0, 1, 4, True), ("carry_run", 1, 4, 14, True), ("throw", 5, 3, 14, False)]),
    ("swim_push", [("swim", 0, 4, 8, True), ("push", 4, 3, 14, False), ("bop", 7, 1, 10, False)]),
    ("hit_tumble", [("stagger", 0, 2, 10, False), ("tumble", 2, 5, 10, False), ("rescue_pose", 7, 1, 0, False)]),
    ("power_celebrate", [("power", 0, 4, 12, False), ("celebrate", 4, 4, 10, True)]),
]
SHEETS_D = [
    ("run", [("run", 0, 8, 14, True)]),
    ("walk_idle", [("walk", 0, 6, 10, True), ("sit_idle", 6, 2, 3, True)]),
    ("jump_fetch", [("jump_takeoff", 0, 1, 0, False), ("jump_rise", 1, 1, 0, False), ("jump_apex", 2, 1, 0, False), ("jump_fall", 3, 1, 0, False),
                    ("land", 4, 1, 12, False), ("fetch", 5, 3, 12, False)]),
    ("carry_toss", [("carry_run", 0, 6, 14, True), ("toss", 6, 2, 12, False)]),
    ("swim_push", [("swim_paddle", 0, 4, 8, True), ("headpush", 4, 3, 14, False), ("bop", 7, 1, 10, False)]),
    ("hit_tumble", [("stagger", 0, 2, 10, False), ("roll", 2, 5, 10, False), ("rescue_pose", 7, 1, 0, False)]),
    ("zoom_celebrate", [("zoomies", 0, 4, 16, True), ("celebrate_tailchase", 4, 4, 10, True)]),
]
# frames of each sheet that show the character upright, used to calibrate the sheet scale (0-based)
REF_FRAMES = {"run": None, "walk_idle": None, "jump_pickup": [0, 7], "carry_throw": [0], "swim_push": None, "hit_tumble": [0],
              "power_celebrate": [3], "carry_toss": None, "jump_fetch": [0, 7], "zoom_celebrate": None}


def bg_mask(a):
    """True for subject pixels. Background = cyan field and its darker blue ground shadows, flooded from the border."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bluish = (b > 150) & (g > 110) & (r < 140) & (b - r > 60)
    lab, n = ndi.label(bluish)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgm = np.isin(lab, list(border))
    return ~bgm


def clean_mask(m):
    m = ndi.binary_opening(m, iterations=1)
    lab, n = ndi.label(m)
    if n > 1:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        keep = np.zeros(n + 1, bool)
        keep[1:] = sizes >= 400            # drops stray specks, keeps hands and ears
        m = keep[lab]
    return m


def split_frames(mask, n=8):
    spans = pl.components_by_columns(mask.astype(np.uint8), gap=3, min_w=20)
    while len(spans) > n:   # merge the closest pair
        gaps = [spans[i + 1][0] - spans[i][1] for i in range(len(spans) - 1)]
        i = int(np.argmin(gaps))
        spans[i:i + 2] = [(spans[i][0], spans[i + 1][1])]
    if len(spans) < n:      # touching frames: split the widest at its emptiest column
        occ = mask.sum(0).astype(float)
        occ = np.convolve(occ, np.ones(7) / 7, mode="same")
        while len(spans) < n:
            i = int(np.argmax([s[1] - s[0] for s in spans]))
            x0, x1 = spans[i]
            mid = (x0 + x1) // 2
            lo, hi = x0 + (x1 - x0) // 4, x1 - (x1 - x0) // 4
            cut = lo + int(np.argmin(occ[lo:hi])) if hi > lo else mid
            spans[i:i + 1] = [(x0, cut), (cut + 1, x1)]
    return spans


def frame_arrays(path):
    a = pl.load_rgb(path)
    m = clean_mask(bg_mask(a))
    spans = split_frames(m)
    out = []
    for x0, x1 in spans:
        sub, sm = a[:, x0:x1 + 1], m[:, x0:x1 + 1]
        ys = np.where(sm.any(1))[0]
        xs = np.where(sm.any(0))[0]
        sub = sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        sm = sm[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        out.append((sub, sm))
    return out


def downscale(sub, sm, scale):
    """Resample a raw frame by `scale` (<1). Colour from a bg-filled LANCZOS pass, alpha from area coverage."""
    h, w = sm.shape
    nh, nw = max(1, round(h * scale)), max(1, round(w * scale))
    idx = ndi.distance_transform_edt(~sm, return_distances=False, return_indices=True)
    filled = sub[idx[0], idx[1]]
    rgb = Image.fromarray(np.clip(filled, 0, 255).astype(np.uint8)).resize((nw, nh), Image.LANCZOS)
    al = Image.fromarray((sm * 255).astype(np.uint8)).resize((nw, nh), Image.BOX)
    arr = np.zeros((nh, nw, 4), np.uint8)
    arr[..., :3] = np.array(rgb)
    arr[..., 3] = np.where(np.array(al) >= 140, 255, 0)
    arr[arr[..., 3] == 0, :3] = 0
    return arr


def finish(arr, pal):
    arr = pl.snap_lab(arr, pal)
    arr = pl.despeckle(arr, 1)
    arr = pl.remove_small(arr, 4)
    return pl.add_outline(arr)


def char_palette(c, k=26):
    """Palette from the master sheet so every sheet of a character shares colours."""
    path = os.path.join(ROOT, f"art-src/palette/{c}.json")
    if os.path.exists(path):
        return [tuple(x) for x in json.load(open(path))]
    frames = frame_arrays(os.path.join(ROOT, f"art-src/higgsfield/identity/master_{c}.png"))[:5]
    arrs = []
    for sub, sm in frames:
        s = (TARGET_H.get(c, 30) - 2) / sm.shape[0]
        arrs.append(downscale(sub, sm, s))
    pal = pl.make_palette(arrs, k=k, force=(OUT, (255, 255, 255)))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump([list(p) for p in pal], open(path, "w"))
    return pal


def sheet_scale(c, sheet, frames):
    if c == "thor":
        # calibrate on body length of the run-like frames: median frame width
        ws = [sm.shape[1] for _, sm in frames]
        return (DOG_LEN - 2) / float(np.median(ws))
    ref = REF_FRAMES.get(sheet)
    hs = [sm.shape[0] for i, (_, sm) in enumerate(frames) if ref is None or i in ref]
    return (TARGET_H[c] - 2) / float(np.median(hs))


def to_cell(arr):
    ys, xs = np.where(arr[..., 3] > 0)
    cx = int(round(xs.mean()))
    bottom = ys.max()
    return pl.place(arr, CELL, CELL, MID_X, FEET_Y, cx, bottom)


def build(c, preview=False):
    pal = char_palette(c)
    sheets = SHEETS_D if c == "thor" else SHEETS_H
    rows, meta = [], {"cell": [CELL, CELL], "pivot": [MID_X, FEET_Y], "anims": {}, "sheets": []}
    for row, (sheet, anims) in enumerate(sheets):
        path = os.path.join(ROOT, f"art-src/higgsfield/{c}/{sheet}.png")
        if not os.path.exists(path):
            print("missing", path); rows.append([np.zeros((CELL, CELL, 4), np.uint8)] * 8); continue
        frames = frame_arrays(path)
        s = sheet_scale(c, sheet, frames)
        cells = [to_cell(finish(downscale(sub, sm, s), pal)) for sub, sm in frames]
        rows.append(cells)
        meta["sheets"].append({"name": sheet, "row": row, "scale": round(s, 4)})
        for name, first, count, fps, loop in anims:
            meta["anims"][name] = {"start": row * 8 + first, "frames": count, "fps": fps, "loop": loop}
    atlas = np.concatenate([np.concatenate(r, axis=1) for r in rows], axis=0)
    os.makedirs(os.path.join(ROOT, "public/assets/sprites"), exist_ok=True)
    pl.save_png(atlas, os.path.join(ROOT, f"public/assets/sprites/{c}.png"))
    json.dump(meta, open(os.path.join(ROOT, f"public/assets/sprites/{c}.json"), "w"), indent=1)
    os.makedirs(os.path.join(ROOT, "docs/qa/sprites"), exist_ok=True)
    big = Image.fromarray(atlas, "RGBA")
    bgc = Image.new("RGBA", big.size, (150, 215, 190, 255)); bgc.alpha_composite(big)
    bgc.resize((big.width * 3, big.height * 3), Image.NEAREST).save(os.path.join(ROOT, f"docs/qa/sprites/{c}.png"))
    print(c, "atlas", atlas.shape, "rows", len(rows), "colors", len({tuple(p) for p in atlas[atlas[..., 3] > 0][:, :3]}))


if __name__ == "__main__":
    build(sys.argv[1], "--preview" in sys.argv)
