#!/usr/bin/env python3
"""Pixel icons for the DOM UI (16 px grid, plum outline)."""
import os, sys, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import pixlib as P
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets/ui')
C = {'.': None, 'W': (255, 255, 255), 'w': (233, 224, 251), 'Y': (255, 226, 58), 'y': (255, 165, 31), 'G': (47, 191, 106), 'g': (111, 224, 154), 'R': (255, 77, 94), 'O': (255, 154, 60),
     'B': (77, 166, 255), 'V': (157, 107, 255), 'K': (30, 19, 48), 'P': (255, 133, 196), 'S': (156, 147, 173), 's': (107, 94, 128), 'N': (217, 160, 102), 'n': (138, 83, 40), 'L': (190, 160, 255)}

ART = {
 'cloud': ["....wwww....", "..wwWWWWww..", ".wWWWWWWWWw.", "wWWWWWWWWWWw", "wWWWWWWWWWWw", ".wwwwwwwwww."],
 'rainbow': ["...RRRRRR...", "..ROOOOOOR..", ".ROYYYYYYOR.", "ROYGGGGGGYOR", "ROYGBBBBGYOR", "ROYGB..BGYOR", "ROYGB..BGYOR", "ROYGB..BGYOR"],
 'bolt': ["....YYY.", "...YYY..", "..YYYY..", ".YYYYYY.", "...YYY..", "..YYY...", "..YY....", ".Y......"],
 'turtle': ["...gGGGg....", "..gGGgGGg...", ".gGGgGGgGg.g", "gGGgGGgGGgGG", "gGGGGGGGGGGg", ".ss.ss..ss.s"],
 'trophy': ["YYYYYYYYYYYY", "YyYYYYYYYYyY", "YyYYYYYYYYyY", ".YyYYYYYYyY.", "..YyYYYYyY..", "....YYYY....", ".....YY.....", ".....YY.....", "...YYYYYY...", "...yyyyyy..."],
 'frame': ["KKKKKKKKKKKK", "KwwwwwwwwwwK", "KwwYYwwwwwwK", "KwwYYwwwwwwK", "KwwwwwwGwwwK", "KwwwwwGGGwwK", "KwwwwGGGGGwK", "KGGGGGGGGGGK", "KKKKKKKKKKKK"],
 'candy': ["..YYYY..", ".YyyYYY.", "YyYYyyYY", "YYyYYyYY", "YYYyyYyY", "YYYYYYYY", ".YYYYYY.", "..YYYY.."],
}


def draw(name):
    rows = ART[name]
    h, w = len(rows), len(rows[0])
    a = np.zeros((h, w, 4), np.uint8)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            c = C.get(ch)
            if c: a[y, x] = (*c, 255)
    return a


def gear():
    n = 14
    a = np.zeros((n, n, 4), np.uint8)
    cx = cy = (n - 1) / 2
    for y in range(n):
        for x in range(n):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            ang = np.arctan2(y - cy, x - cx)
            tooth = (np.cos(ang * 4) > 0.2)
            R = 6.3 if tooth else 4.8
            if 2.2 < d < R: a[y, x] = (*C['S'], 255)
            if 2.2 < d < R and (x + y) % 5 == 0: a[y, x] = (*C['s'], 255)
    return a


def expand():
    n = 12
    a = np.zeros((n, n, 4), np.uint8)
    col = (*C['W'], 255)
    for (sx, sy) in [(0, 0), (n - 1, 0), (0, n - 1), (n - 1, n - 1)]:
        dx = 1 if sx == 0 else -1; dy = 1 if sy == 0 else -1
        for i in range(4):
            a[sy, sx + dx * i] = col; a[sy + dy * i, sx] = col
    return a


def save(a, name):
    a = P.add_outline(a)
    P.save_png(a, os.path.join(OUT, f'icon_{name}.png'))


os.makedirs(OUT, exist_ok=True)
for k in ART: save(draw(k), k)
save(gear(), 'gear'); save(expand(), 'expand')
print('icons', len(ART) + 2)
