#!/usr/bin/env python3
"""Slice the world prop kits, block and rescue cloud; draw procedural cloud floors and platforms."""
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import pixlib as P, extract as E
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H6 = os.path.join(ROOT, 'art-src/higgsfield/h6')
ASSETS = os.path.join(ROOT, 'assets')
PAL_ALL = P.master_palette()

DIL = {1: 14, 2: 30, 4: 60}
KITS = {  # world -> (reference object index, its target width in logical px)
    1: (0, 180), 2: (0, 250), 3: (0, 110), 4: (1, 170), 5: (0, 190), 6: (0, 96),
}


def save(arr, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    P.save_png(arr, path)


def hexrgb(h):
    return P.hex_rgb(h)


SPAN = {1: (0.03, 0.97), 2: (0.03, 0.97), 3: (0.02, 0.60), 4: (0.03, 0.97), 5: (0.03, 0.97), 6: (0.02, 0.60)}


def make_floor(w, outdir):
    """Mirror-tiled ground from the AI strip + a platform cut from its top band."""
    a = P.load_rgb(os.path.join(ROOT, 'art-src/higgsfield/h7', f'floor_w{w}_v1.png'))
    m = P.key_background(a, 150, flood=True, bg=np.median(np.array([a[2, 2], a[2, a.shape[1] - 3], a[40, 2], a[40, a.shape[1] - 3]]), axis=0))
    H, W = m.shape
    x0, x1 = int(SPAN[w][0] * W), int(SPAN[w][1] * W)
    a, m = a[:, x0:x1], m[:, x0:x1]
    from scipy import ndimage as ndi
    lab, n = ndi.label(m)
    keep = set(np.unique(lab[-1])) - {0}
    m = np.isin(lab, list(keep))
    top = np.where(m.any(1))[0].min()
    a, m = a[max(0, top - 3):], m[max(0, top - 3):]
    a = np.concatenate([a, a[:, ::-1]], axis=1)
    m = np.concatenate([m, m[:, ::-1]], axis=1)
    L = P.resample_clean(a, m, 6.4)
    L = P.snap_lab(L, PAL_ALL)
    cols_top = np.array([np.where(L[:, x, 3] > 0)[0].min() if (L[:, x, 3] > 0).any() else L.shape[0] for x in range(L.shape[1])])
    surface = int(np.median(cols_top))
    bottom = L[-3:, :, :3].reshape(-1, 3).mean(0).astype(np.uint8)
    # outline the top silhouette
    al = L[..., 3] > 0
    up = np.zeros_like(al); up[1:] = al[:-1]
    L[al & ~up] = (*P.OUTLINE, 255)
    save(L, f'{outdir}/floor.png')
    # platform: 104 x 34 slice of the band just under the skyline, rounded ends
    pw, ph = 104, 34
    sx = (L.shape[1] - pw) // 2
    band = L[max(0, surface - 6):max(0, surface - 6) + ph, sx:sx + pw].copy()
    yy, xx = np.mgrid[0:band.shape[0], 0:band.shape[1]]
    r = band.shape[0] / 2
    rounded = ((xx < r) & (((xx - r) / r) ** 2 + ((yy - r) / r) ** 2 > 1)) | ((xx > pw - 1 - r) & (((xx - (pw - 1 - r)) / r) ** 2 + ((yy - r) / r) ** 2 > 1))
    band[rounded] = 0
    band = P.add_outline(P.remove_small(band, 20))
    save(band, f'{outdir}/platform.png')
    return {'floor': [L.shape[1], L.shape[0]], 'surface': surface, 'bottom': [int(c) for c in bottom], 'platform': [band.shape[1], band.shape[0]]}


def build():
    manifest = {'worlds': {}}
    for w, (ri, rw) in KITS.items():
        fr, dl = E.extract_kit(os.path.join(H6, f'props_w{w}_v1.png'), 8, ri, rw, 'w'); print('dil', dl)
        fr = [P.snap_lab(f, PAL_ALL) for f in fr]
        names = []
        for i, f in enumerate(fr):
            save(f, f'{ASSETS}/props/w{w}/prop_{i}.png'); names.append([f.shape[1], f.shape[0]])
        fl = make_floor(w, f'{ASSETS}/tiles/w{w}')
        manifest['worlds'][w] = {'props': names, 'tiles': fl}
        print('world', w, len(fr), 'props', names)
    # block + rescue cloud
    pal_b = P.master_palette(['outline', 'gold', 'white', 'gray', 'sky', 'ui', 'sun'])
    bl = E.extract(os.path.join(H6, 'block_v1.png'), ('ref', 0, 44, 'h'), rows=1, big=3000, min_area=500)
    print('block frames', [f.shape[:2] for f in bl])
    bl = [P.snap_lab(f, pal_b) for f in bl]
    resc = E.extract(os.path.join(H6, 'rescue_v1.png'), ('ref', 0, 56, 'h'), rows=1, big=3000)
    resc = [P.snap_lab(f, P.master_palette(['outline', 'cloud', 'white', 'blush', 'sky', 'nose'])) for f in resc]
    print('rescue frames', [f.shape[:2] for f in resc])
    import pickle
    pickle.dump({'block': bl, 'rescue': resc}, open('/tmp/blockrescue.pkl', 'wb'))
    json.dump(manifest, open(os.path.join(ROOT, 'src/data/world_assets.json'), 'w'), indent=1)
    return bl, resc


if __name__ == '__main__':
    build()
