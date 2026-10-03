"""Slice AI sprite sheets into scale-normalised pixel frames (Phase 2/9).

Every frame is resampled so that a measurable 'reference feature' has the same logical size in
all frames of a family (unicorn: the golden horn; others: the frame bbox height of a chosen rule).
"""
import numpy as np
from scipy import ndimage as ndi
from PIL import Image, ImageDraw
import pixlib as P


def find_frames(a, mask, dil=6, min_area=300, rows=1, big=6000, attach=260):
    """Frames = large components; small ones (stars, sparkles, sound marks) join the nearest large one."""
    d = ndi.binary_dilation(mask, iterations=dil)
    lab, n = ndi.label(d)
    objs = ndi.find_objects(lab)
    comps = []
    for i, sl in enumerate(objs):
        sub = mask[sl] & (lab[sl] == i + 1)
        area = int(sub.sum())
        if area < min_area:
            continue
        ys, xs = np.where(sub)
        comps.append([sl[1].start + xs.min(), sl[0].start + ys.min(), sl[1].start + xs.max(), sl[0].start + ys.max(), area])
    bigs = [c for c in comps if c[4] >= big]
    for c in comps:
        if c[4] >= big:
            continue
        cx, cy = (c[0] + c[2]) / 2, (c[1] + c[3]) / 2
        best, bd = None, 1e9
        for b in bigs:
            bx, by = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            dd = ((cx - bx) ** 2 + (cy - by) ** 2) ** 0.5
            if dd < bd:
                best, bd = b, dd
        if best is not None and bd < attach * 2:
            best[0], best[1], best[2], best[3] = min(best[0], c[0]), min(best[1], c[1]), max(best[2], c[2]), max(best[3], c[3])
    out = [tuple(b[:4]) for b in bigs]
    if rows == 1:
        out.sort(key=lambda b: (b[0] + b[2]) / 2)
    else:
        H = a.shape[0]
        out.sort(key=lambda b: (int(((b[1] + b[3]) / 2) // (H / rows)), (b[0] + b[2]) / 2))
    return out


def horn_area(rgb, sub_mask):
    """sqrt(pixel area) of the biggest cluster of gold pixels (the unicorn horn, stars excluded)."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    gold = (r > 170) & (g > 110) & (b < 140) & (r - b > 90) & sub_mask
    lab, n = ndi.label(ndi.binary_dilation(gold, iterations=3))
    if n == 0:
        return None
    best = 0
    for k in range(1, n + 1):
        best = max(best, int((gold & (lab == k)).sum()))
    return float(np.sqrt(best)) if best else None


def extract(path, scale_rule, dil=6, rows=1, min_area=300, bleed=2, big=6000):
    """Return list of RGBA frames (tight crops, already scaled). scale_rule: ('horn', T) or ('h', per_frame_target_px or fixed factor)"""
    a = P.load_rgb(path)
    m = P.key_background(a)
    boxes = find_frames(a, m, dil, min_area, rows, big)
    frames = []
    for (x0, y0, x1, y1) in boxes:
        pad = bleed
        x0p, y0p = max(0, x0 - pad), max(0, y0 - pad)
        x1p, y1p = min(a.shape[1] - 1, x1 + pad), min(a.shape[0] - 1, y1 + pad)
        sa = a[y0p:y1p + 1, x0p:x1p + 1]
        sm = m[y0p:y1p + 1, x0p:x1p + 1]
        kind = scale_rule[0]
        if kind == 'horn':
            h = horn_area(sa, sm)
            s = scale_rule[1] / h if h else scale_rule[2]
        elif kind == 'factor':
            s = scale_rule[1]
        elif kind == 'height':
            s = scale_rule[1] / (y1 - y0 + 1)
        elif kind == 'width':
            s = scale_rule[1] / (x1 - x0 + 1)
        L = P.resample_clean(sa, sm, 1.0 / s)
        L = P.remove_small(P.despeckle(L), 5)
        frames.append(L)
    return frames


def fit(frames, cw, ch, gx, gy, mode='ground', ref=None):
    """Place frames into cw x ch cells. mode ground: bottom row on gy, x centred on gx using the
    horizontal centroid of non-pink opaque pixels. mode center: vertical centroid on gy."""
    cells = []
    for f in frames:
        al = f[..., 3] > 0
        rgb = f[..., :3].astype(int)
        white = al & (rgb.sum(2) > 640)  # near white body
        ys, xs = np.where(white if white.sum() > 20 else al)
        cx = xs.mean()
        if mode == 'ground':
            ay = np.where(al)[0].max()
        else:
            ay = ys.mean()
        cells.append(P.place(f, cw, ch, int(round(gx)), int(round(gy)), int(round(cx)), int(round(ay))))
    return cells


def labelled(frames, scale=3, bg=(120, 190, 255, 255), pad=3, cols=8):
    import PIL.ImageFont
    n = len(frames)
    fh = max(f.shape[0] for f in frames); fw = max(f.shape[1] for f in frames)
    rows = (n + cols - 1) // cols
    W, H = cols * (fw + pad) + pad, rows * (fh + pad + 10) + pad
    cv = Image.new('RGBA', (W, H), bg)
    d = ImageDraw.Draw(cv)
    for i, f in enumerate(frames):
        x, y = pad + (i % cols) * (fw + pad), pad + (i // cols) * (fh + pad + 10)
        cv.alpha_composite(Image.fromarray(f, 'RGBA'), (x, y + 10))
        d.text((x + 1, y), str(i), fill=(0, 0, 0, 255))
    return cv.resize((W * scale, H * scale), Image.NEAREST)
