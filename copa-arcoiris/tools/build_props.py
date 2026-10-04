#!/usr/bin/env python3
"""M7: scenery props. Cuts the 5 AI kit sheets (art-src/higgsfield/props/*.png, 2 rows x 4 columns),
scales each prop to a fixed height in game pixels, snaps to the master palette and packs a Phaser atlas:
public/assets/props/props.png + props.json (frame name = prop name, bottom centre is the ground contact point)."""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixlib as pl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "art-src/higgsfield/props")
OUT = os.path.join(ROOT, "public/assets/props")

# kit -> [(name, target height in game px)] in reading order
KITS = {
    "trees": [("oak", 120), ("tree_round", 84), ("fir", 96), ("blossom", 84), ("bush_flower", 24), ("hedge_berry", 26), ("flowers", 18), ("mushrooms", 22)],
    "houses": [("house_mush", 76), ("house_thatch", 72), ("windmill", 92), ("fountain", 52), ("stall", 54), ("tent", 64), ("signpost", 40), ("lanterns", 50)],
    "race": [("flag_finish", 76), ("pole_green", 64), ("pole_pink", 64), ("pole_orange", 64), ("pole_cyan", 64), ("balloons", 56), ("sign_arrow", 44), ("planter", 26)],
    "events": [("pinata", 46), ("pinata_open", 46), ("bumper", 30), ("cloud", 30), ("hay", 28), ("crate", 30), ("basket", 26), ("bench", 24)],
    "water": [("lily", 22), ("rock", 28), ("reeds", 36), ("duck", 20), ("ring", 22), ("dock", 30), ("bubbles", 24), ("pebbles", 22)],
}


def cut(kit):
    a = pl.load_rgb(os.path.join(SRC, f"{kit}.png"))
    fg = pl.key_background(a, tol=90)
    # background pockets enclosed by the subject (stall opening) are punched out too
    near = np.abs(a - pl.bg_color(a)).sum(2) < 40
    pl_lab, pn = ndi.label(near)
    sizes = ndi.sum(near, pl_lab, range(1, pn + 1))
    for i, sz in enumerate(sizes, 1):
        if sz > 400:
            fg[pl_lab == i] = False
    fg = ndi.binary_opening(fg, iterations=1)
    lab, n = ndi.label(fg, structure=np.ones((3, 3)))
    h, w = fg.shape
    cells = {}
    objs = ndi.find_objects(lab)
    for i, sl in enumerate(objs, 1):
        area = (lab[sl] == i).sum()
        if area < 400:
            continue
        cy = (sl[0].start + sl[0].stop) / 2; cx = (sl[1].start + sl[1].stop) / 2
        col = min(3, int(cx / (w / 4))); row = min(1, int(cy / (h / 2)))
        cells.setdefault(row * 4 + col, []).append(i)
    out = []
    for idx in range(8):
        ids = cells.get(idx, [])
        if not ids:
            raise SystemExit(f"{kit}: cell {idx} empty")
        m = np.isin(lab, ids)
        ys, xs = np.where(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgb = a[y0:y1, x0:x1].astype(np.uint8).copy()
        mm = m[y0:y1, x0:x1]
        # fill background pixels with the nearest subject colour so resampling never bleeds cyan
        idxs = ndi.distance_transform_edt(~mm, return_distances=False, return_indices=True)
        rgb = rgb[idxs[0], idxs[1]]
        out.append((rgb, mm))
    return out


def scale(rgb, mm, height):
    s = height / rgb.shape[0]
    nw, nh = max(1, round(rgb.shape[1] * s)), height
    img = Image.fromarray(rgb).resize((nw, nh), Image.LANCZOS)
    al = Image.fromarray((mm * 255).astype(np.uint8)).resize((nw, nh), Image.BOX)
    arr = np.zeros((nh, nw, 4), np.uint8)
    arr[..., :3] = np.array(img)
    arr[..., 3] = np.where(np.array(al) >= 128, 255, 0)
    return arr


def quant(arr, k):
    """Limit a prop to k colours (median cut on the opaque pixels), keeping the outline colour exact."""
    al = arr[..., 3] > 0
    im = Image.fromarray(arr[..., :3]).quantize(colors=k, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    out = arr.copy()
    out[..., :3] = np.array(im)
    out[~al] = 0
    return out


def build():
    sprites = {}
    for kit, items in KITS.items():
        parts = cut(kit)
        for (name, hgt), (rgb, mm) in zip(items, parts):
            arr = scale(rgb, mm, hgt)
            arr = quant(arr, 32)
            arr = pl.remove_small(arr, 4)
            sprites[name] = arr
    return sprites


def pack(sprites):
    order = sorted(sprites, key=lambda n: -sprites[n].shape[0])
    W = 512
    x = y = rowh = 0
    pos = {}
    for n in order:
        h, w = sprites[n].shape[:2]
        if x + w + 1 > W:
            x, y, rowh = 0, y + rowh + 1, 0
        pos[n] = (x, y, w, h)
        x += w + 1; rowh = max(rowh, h)
    H = y + rowh
    H = 1 << (H - 1).bit_length()
    atlas = np.zeros((H, W, 4), np.uint8)
    frames = {}
    for n, (px, py, w, h) in pos.items():
        atlas[py:py + h, px:px + w] = sprites[n]
        frames[n] = {"frame": {"x": px, "y": py, "w": w, "h": h}, "rotated": False, "trimmed": False,
                     "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}, "sourceSize": {"w": w, "h": h}}
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(atlas).save(os.path.join(OUT, "props.png"), optimize=True)
    json.dump({"frames": frames, "meta": {"image": "props.png", "size": {"w": W, "h": H}, "scale": "1"}}, open(os.path.join(OUT, "props.json"), "w"), indent=1)
    # contact sheet for QA
    qa = os.path.join(ROOT, "docs/qa/props_sheet.png")
    sheet = Image.new("RGBA", (W * 2, H * 2), (110, 190, 120, 255))
    sheet.alpha_composite(Image.fromarray(atlas).resize((W * 2, H * 2), Image.NEAREST))
    sheet.save(qa)
    print("props", len(pos), "atlas", W, "x", H)


if __name__ == "__main__":
    pack(build())
