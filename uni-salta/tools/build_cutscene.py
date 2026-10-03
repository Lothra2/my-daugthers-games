#!/usr/bin/env python3
"""Cut the power-up cutscene portraits (H8 stills on magenta) into transparent 128px pixel art in assets/cutscene."""
import os, numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(ROOT, 'assets/cutscene'), exist_ok=True)
for k in ['fast', 'slow', 'inv']:
    a = np.asarray(Image.open(os.path.join(ROOT, f'art-src/higgsfield/h8/still_{k}.png')).convert('RGB')).astype(int)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    bg = (R > 150) & (G < 115) & (B > 60) & (B < 190) & (R > B + 40)
    lab, _ = ndi.label(bg)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    outside = np.isin(lab, list(border))
    outside = (ndi.binary_dilation(outside, iterations=2) & bg) | outside
    rgb = a.astype(np.uint8).copy()
    alpha = np.where(outside, 0, 255).astype(np.uint8)
    if k == 'slow':   # the bubble interior is background colour too: make it translucent mint
        inner = bg & ~outside
        rgb[inner] = (170, 238, 208)
        alpha[inner] = 150
    l2, n2 = ndi.label(alpha > 0)
    keep = 1 + int(np.argmax(ndi.sum(alpha > 0, l2, range(1, n2 + 1))))
    alpha = np.where(ndi.binary_closing(l2 == keep, iterations=3), np.maximum(alpha, 1), 0).astype(np.uint8)
    img = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA').crop(Image.fromarray(alpha).getbbox())
    s = 128 / max(img.size)
    sz = (max(1, round(img.width * s)), max(1, round(img.height * s)))
    arr = np.asarray(img).astype(float); al = arr[..., 3:4] / 255
    pm = Image.fromarray(np.dstack([arr[..., :3] * al, arr[..., 3:4]]).astype(np.uint8), 'RGBA').resize(sz, Image.BOX)
    sa = np.asarray(pm).astype(float); alp = sa[..., 3:4]
    col = np.where(alp > 0, sa[..., :3] / np.maximum(alp / 255, 1e-3), 0).clip(0, 255)
    out_a = np.where(alp[..., 0] > 70, np.where(alp[..., 0] > 200, 255, np.maximum(alp[..., 0], 120)), 0).astype(np.uint8)
    q = Image.fromarray(col.astype(np.uint8)).quantize(96, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    Image.fromarray(np.dstack([np.asarray(q), out_a]), 'RGBA').save(os.path.join(ROOT, f'assets/cutscene/power_{k}.png'))
    print(k, sz)
