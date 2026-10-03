"""Pixel pipeline helpers for UNI-SALTA (Phase 2).

AI generated "pixel art" is drawn on an implicit grid whose blocks are not integer sized.
These helpers recover that grid, sample it into real 1:1 pixels, key out the background,
snap to a palette and slice frames, so the result behaves like a hand made sprite.
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

OUTLINE = (30, 19, 48)  # #1E1330 deep plum


def load_rgb(path):
    return np.array(Image.open(path).convert("RGB")).astype(np.int16)


def bg_color(a):
    h, w, _ = a.shape
    corners = np.array([a[2, 2], a[2, w - 3], a[h - 3, 2], a[h - 3, w - 3]])
    return np.median(corners, axis=0)


def key_background(a, tol=70, flood=True, bg=None):
    """Boolean mask of the subject (True) using border-connected background flooding."""
    bg = bg_color(a) if bg is None else bg
    close = np.abs(a - bg).sum(2) < tol
    if not flood:
        return ~close
    lab, n = ndi.label(close)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(border))
    return ~bgmask


def _phase_peak(positions, lo=3.0, hi=14.0, step=0.01):
    positions = np.asarray(positions, dtype=np.float64)
    best = (0, lo, 0.0)
    for b in np.arange(lo, hi, step):
        z = np.exp(2j * np.pi * positions / b).sum()
        r = abs(z) / max(1, len(positions))
        if r > best[0]:
            best = (r, b, (np.angle(z) / (2 * np.pi)) * b)
    return best  # coherence, block size, phase offset of edges


def detect_grid(a, mask=None, thr=45):
    """Return (bx, ox, by, oy): block size and the offset of block boundaries."""
    if mask is None:
        mask = key_background(a)
    ys, xs = np.where(mask)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    sub = a[y0:y1 + 1, x0:x1 + 1]
    dx = np.abs(np.diff(sub, axis=1)).sum(2) > thr
    dy = np.abs(np.diff(sub, axis=0)).sum(2) > thr
    px = np.where(dx)[1] + 0.5 + x0
    py = np.where(dy)[0] + 0.5 + y0
    if len(px) > 60000:
        px = px[::len(px) // 60000]
    if len(py) > 60000:
        py = py[::len(py) // 60000]
    cx, bx, ox = _phase_peak(px)
    cy, by, oy = _phase_peak(py)
    return bx, ox % bx, by, oy % by, (cx, cy)


def to_logical(a, grid, mask=None):
    """Sample the implicit grid. Returns RGBA uint8 array, 1 array pixel = 1 art pixel."""
    bx, ox, by, oy, _ = grid
    h, w, _ = a.shape
    nx = int((w - ox) // bx)
    ny = int((h - oy) // by)
    xs = (ox + (np.arange(nx) + 0.5) * bx).astype(int)
    ys = (oy + (np.arange(ny) + 0.5) * by).astype(int)
    out = np.zeros((ny, nx, 4), np.uint8)
    r = max(1, int(min(bx, by) // 4))
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            blk = a[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1].reshape(-1, 3)
            out[j, i, :3] = np.median(blk, axis=0)
    if mask is None:
        mask = key_background(a)
    mm = np.zeros((ny, nx), bool)
    for j, y in enumerate(ys):
        mm[j] = mask[min(y, h - 1), np.minimum(xs, w - 1)]
    out[..., 3] = np.where(mm, 255, 0)
    out[~mm, :3] = 0
    return out


def make_palette(arrays, k=24, force=(OUTLINE,)):
    """k-means style palette from the opaque pixels of the given RGBA arrays."""
    px = np.concatenate([x[x[..., 3] > 0][:, :3] for x in arrays]).astype(np.float64)
    if len(px) > 60000:
        px = px[np.random.RandomState(1).choice(len(px), 60000, replace=False)]
    img = Image.fromarray(px.astype(np.uint8).reshape(1, -1, 3))
    q = img.quantize(colors=k, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[: k * 3]).reshape(-1, 3)
    pal = [tuple(int(c) for c in p) for p in pal]
    for f in force:
        if f not in pal:
            pal.append(f)
    return pal


def snap(arr, palette):
    pal = np.array(palette, dtype=np.int32)
    out = arr.copy()
    flat = arr[..., :3].reshape(-1, 3).astype(np.int32)
    d = ((flat[:, None, :] - pal[None, :, :]) ** 2).sum(2)
    idx = d.argmin(1)
    out[..., :3] = pal[idx].reshape(arr.shape[0], arr.shape[1], 3).astype(np.uint8)
    out[arr[..., 3] == 0, :3] = 0
    return out


def components_by_columns(alpha, gap=3, min_w=6):
    """Split a strip into frames by empty column runs. Returns list of (x0, x1)."""
    cols = (alpha > 0).any(0)
    spans, start, empty = [], None, 0
    for x, c in enumerate(cols):
        if c:
            if start is None:
                start = x
            empty = 0
            end = x
        else:
            if start is not None:
                empty += 1
                if empty >= gap:
                    spans.append((start, end))
                    start = None
    if start is not None:
        spans.append((start, end))
    return [s for s in spans if s[1] - s[0] + 1 >= min_w]


def crop_alpha(arr):
    ys, xs = np.where(arr[..., 3] > 0)
    return arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1], (xs.min(), ys.min())


def place(arr, cell_w, cell_h, anchor_x, anchor_y, ax, ay):
    """Paste arr into a transparent cell so that arr pixel (ax, ay) lands on (anchor_x, anchor_y)."""
    cell = np.zeros((cell_h, cell_w, 4), np.uint8)
    ox, oy = anchor_x - ax, anchor_y - ay
    h, w = arr.shape[:2]
    sx0, sy0 = max(0, -ox), max(0, -oy)
    dx0, dy0 = max(0, ox), max(0, oy)
    ww, hh = min(w - sx0, cell_w - dx0), min(h - sy0, cell_h - dy0)
    if ww > 0 and hh > 0:
        cell[dy0:dy0 + hh, dx0:dx0 + ww] = arr[sy0:sy0 + hh, sx0:sx0 + ww]
    return cell


def save_png(arr, path, scale=1):
    im = Image.fromarray(arr, "RGBA")
    if scale > 1:
        im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    im.save(path, optimize=True)


def sheet(frames, cols=None, scale=3, bg=(120, 190, 255, 255), pad=2):
    """Contact sheet for visual review."""
    n = len(frames)
    cols = cols or n
    rows = (n + cols - 1) // cols
    fh, fw = frames[0].shape[:2]
    W, H = cols * (fw + pad) + pad, rows * (fh + pad) + pad
    canvas = Image.new("RGBA", (W, H), bg)
    for i, f in enumerate(frames):
        im = Image.fromarray(f, "RGBA")
        canvas.alpha_composite(im, (pad + (i % cols) * (fw + pad), pad + (i // cols) * (fh + pad)))
    return canvas.resize((W * scale, H * scale), Image.NEAREST)


def resample_clean(a, mask, block, erode=0):
    """Box-resample an AI 'pixel art' image by 1/block with background bleed removed.

    Background pixels take the colour of the nearest subject pixel before averaging, so no
    cyan fringe survives. Alpha is the area coverage thresholded at 50%.
    """
    h, w, _ = a.shape
    idx = ndi.distance_transform_edt(~mask, return_distances=False, return_indices=True)
    filled = a[idx[0], idx[1]]
    nh, nw = int(round(h / block)), int(round(w / block))
    rgb = Image.fromarray(np.clip(filled, 0, 255).astype(np.uint8)).resize((nw, nh), Image.BOX)
    al = Image.fromarray((mask * 255).astype(np.uint8)).resize((nw, nh), Image.BOX)
    out = np.zeros((nh, nw, 4), np.uint8)
    out[..., :3] = np.array(rgb)
    out[..., 3] = np.where(np.array(al) >= 128, 255, 0)
    out[out[..., 3] == 0, :3] = 0
    return out


def despeckle(arr, min_neighbors=1):
    """Drop opaque pixels with fewer than min_neighbors opaque 4-neighbours (stray dots)."""
    al = arr[..., 3] > 0
    n = np.zeros(al.shape, int)
    n[1:] += al[:-1]; n[:-1] += al[1:]; n[:, 1:] += al[:, :-1]; n[:, :-1] += al[:, 1:]
    kill = al & (n < min_neighbors)
    out = arr.copy(); out[kill] = 0
    return out


def _srgb_to_lab(rgb):
    c = np.asarray(rgb, dtype=np.float64) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def master_palette(groups=None, path=None):
    import json, os
    path = path or os.path.join(os.path.dirname(__file__), "..", "src", "data", "palette.json")
    pal = json.load(open(path))
    keys = groups or list(pal.keys())
    return [hex_rgb(c) for k in keys for c in pal[k]]


def snap_lab(arr, palette):
    """Snap opaque pixels to the nearest palette colour in CIELAB (perceptual)."""
    pal = np.array(palette, dtype=np.float64)
    pl = _srgb_to_lab(pal)
    out = arr.copy()
    ys, xs = np.where(arr[..., 3] > 0)
    if len(ys) == 0:
        return out
    px = _srgb_to_lab(arr[ys, xs, :3].astype(np.float64))
    d = ((px[:, None, :] - pl[None, :, :]) ** 2).sum(2)
    out[ys, xs, :3] = pal[d.argmin(1)].astype(np.uint8)
    return out


def remove_small(arr, min_px=6):
    """Remove connected opaque islands smaller than min_px (8-connectivity), keeping the biggest."""
    al = arr[..., 3] > 0
    lab, n = ndi.label(al, structure=np.ones((3, 3)))
    if n <= 1:
        return arr
    sizes = ndi.sum(al, lab, range(1, n + 1))
    keep = np.zeros(n + 1, bool)
    keep[1:] = sizes >= min_px
    keep[1 + int(np.argmax(sizes))] = True
    out = arr.copy()
    out[~keep[lab]] = 0
    return out


def add_outline(arr, color=OUTLINE):
    """Add a 1px outline around the opaque silhouette (outside, 4-neighbourhood)."""
    h, w = arr.shape[:2]
    out = np.zeros((h + 2, w + 2, 4), np.uint8)
    out[1:-1, 1:-1] = arr
    al = out[..., 3] > 0
    nb = np.zeros_like(al)
    nb[1:] |= al[:-1]; nb[:-1] |= al[1:]; nb[:, 1:] |= al[:, :-1]; nb[:, :-1] |= al[:, 1:]
    edge = nb & ~al
    out[edge] = (*color, 255)
    return out
