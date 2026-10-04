#!/usr/bin/env python3
"""Unlockable outfits: hue-rotated copies of each sprite atlas. Only clothing colours move; skin, hair, white and fur stay.
Output: public/assets/sprites/<char>_arcoiris.png and <char>_estrellas.png (same layout and metadata as the base atlas)."""
import colorsys, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixlib as pl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHARS = ["sophie", "alana", "papa", "mama", "thor"]
# (hue shift in degrees, saturation boost)
OUTFITS = {"arcoiris": (-70, 1.05), "estrellas": (170, 1.0)}
SKIN = (8, 48)     # hue range in degrees that is skin or fur
THOR_ONLY_BLUE = True


def recolor(arr, shift, sat, char):
    out = arr.copy()
    ys, xs = np.where(arr[..., 3] > 0)
    rgb = arr[ys, xs, :3].astype(np.float64) / 255
    for i in range(len(ys)):
        r, g, b = rgb[i]
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        hd = h * 360
        if s < 0.18 or v < 0.22:           # white, grey, outline, dark hair
            continue
        if SKIN[0] <= hd <= SKIN[1] and char != "papa":   # skin or fur
            continue
        if char == "papa" and SKIN[0] + 4 <= hd <= SKIN[1] and s < 0.75:   # skin of papa has lower saturation than his red shirt
            continue
        if char == "thor" and not (170 <= hd <= 250):      # only the collar changes on the dog
            continue
        h2 = ((hd + shift) % 360) / 360
        vb = 1.18 if (char == 'sophie' and shift == -50) else 1.0
        nr, ng, nb = colorsys.hsv_to_rgb(h2, min(1.0, s * sat), min(1.0, v * vb))
        out[ys[i], xs[i], :3] = (int(nr * 255), int(ng * 255), int(nb * 255))
    return out


def main():
    for c in CHARS:
        base = np.array(Image.open(os.path.join(ROOT, f"public/assets/sprites/{c}.png")).convert("RGBA"))
        for name, (shift, sat) in OUTFITS.items():
            if c == "thor":
                shift = shift + (40 if name == "arcoiris" else 0)
            if c == "sophie" and name == "arcoiris":
                shift = -50
            pl.save_png(recolor(base, shift, sat, c), os.path.join(ROOT, f"public/assets/sprites/{c}_{name}.png"))
    # preview: first idle frame of each outfit
    cells = []
    for c in CHARS:
        row = []
        for suffix in ("", "_arcoiris", "_estrellas"):
            im = np.array(Image.open(os.path.join(ROOT, f"public/assets/sprites/{c}{suffix}.png")).convert("RGBA"))
            row.append(im[48:96, 6 * 48:7 * 48])   # walk_idle row, idle frame
        cells.append(np.concatenate(row, axis=1))
    sheet = np.concatenate(cells, axis=0)
    im = Image.fromarray(sheet, "RGBA"); bg = Image.new("RGBA", im.size, (150, 215, 190, 255)); bg.alpha_composite(im)
    bg.resize((im.width * 3, im.height * 3), Image.NEAREST).save(os.path.join(ROOT, "docs/qa/outfits.png"))
    print("ok")


if __name__ == "__main__":
    main()
