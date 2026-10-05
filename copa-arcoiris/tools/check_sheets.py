#!/usr/bin/env python3
"""Counts the poses the generator actually drew in every raw sheet. A sheet must have exactly 8 clean frames."""
import os, sys, glob
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixlib as pl, build_sprites as B

ROOT = B.ROOT
def count(path):
    a = pl.load_rgb(path); m = B.clean_mask(B.bg_mask(a))
    cs = B.count_poses(m)
    return 8 if 8 in cs else max(set(cs), key=cs.count)
if __name__ == "__main__":
    bad = []
    for c in ["sophie", "alana", "papa", "mama", "thor"]:
        row = []
        for p in sorted(glob.glob(f"{ROOT}/art-src/higgsfield/{c}/*.png")):
            n = count(p); row.append(f"{os.path.basename(p)[:-4]}={n}")
            if n != 8: bad.append((c, os.path.basename(p)[:-4], n))
        print(c, " ".join(row))
    print("BAD", bad)
