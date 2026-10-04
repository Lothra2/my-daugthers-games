#!/usr/bin/env python3
"""M2/M7: animation sheets. Usage: gen_sheets.py <char> [sheet ...]   Ref = clean crop of the character master."""
import os, sys, json, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prompts as P, anim_defs as A, hf

def ref_url(c):
    key = f"ref_{c}.png"
    up = P.uploads()
    if key not in up:
        hf.upload(os.path.join(P.ROOT, "art-src/higgsfield/identity", key), private=True)
        up = P.uploads()
    return up[key]

def run(c, sheet, attempt_tag=""):
    defs = A.DOG if c == "thor" else A.HUMAN
    extra = ("The reference image shows the character model sheet: keep the exact same face, hair, outfit colors and proportions in every frame. "
             "Do not add any other character. Keep the figure the same size in every frame.")
    prompt = P.sheet_prompt(c, defs[sheet], extra=extra)
    out = f"art-src/higgsfield/{c}/{sheet}.png"
    r = P.gen(f"{c}_{sheet}", out, prompt, [ref_url(c)], purpose=f"hoja {c} {sheet}")
    return c, sheet, r.returncode, (r.stdout + r.stderr).strip()[-160:].replace("\n", " | ")

if __name__ == "__main__":
    c = sys.argv[1]
    defs = A.DOG if c == "thor" else A.HUMAN
    sheets = sys.argv[2:] or list(defs)
    os.makedirs(os.path.join(P.ROOT, f"art-src/higgsfield/{c}"), exist_ok=True)
    ref_url(c)
    with cf.ThreadPoolExecutor(3) as ex:
        for res in ex.map(lambda s: run(c, s), sheets):
            print(*res, flush=True)
