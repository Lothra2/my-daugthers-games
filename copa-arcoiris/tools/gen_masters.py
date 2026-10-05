#!/usr/bin/env python3
"""M2: master sheets (8 poses) for each character. Refs: their photo and the family lineup."""
import os, sys, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prompts as P
LINEUP = os.path.join(P.ROOT, "art-src/higgsfield/identity/lineup_family.png")
sys.path.insert(0, os.path.dirname(__file__))
import hf
FR = {
 "human": "(1) front view standing, (2) three-quarter view, (3) side view facing right, (4) back view, (5) cheering with both arms up, "
          "(6) laughing with eyes closed, (7) ready-to-race crouch, (8) waving hello",
 "thor": "(1) standing side view facing right, (2) three-quarter view, (3) sitting, (4) back view, (5) tongue-out happy, "
         "(6) host pose wearing a sky-blue cap and a silver whistle, (7) ready-to-run crouch, (8) wagging tail",
}
def run(c):
    # the lineup is passed as a reference through its uploaded URL
    ref_lineup = P.uploads().get("lineup_family.png")
    refs = [P.photo(c)] + ([ref_lineup] if ref_lineup else [])
    prompt = P.sheet_prompt(c, FR["thor" if c == "thor" else "human"], extra="Character model sheet, same character in every frame, consistent face, hair and outfit.")
    r = P.gen(f"master_{c}", f"art-src/higgsfield/identity/master_{c}.png", prompt, refs, purpose=f"M2 hoja maestra {c}")
    return c, r.returncode, (r.stdout + r.stderr).strip()[-200:]
if __name__ == "__main__":
    # upload lineup as a reference (public URL, no personal data beyond the stylized art)
    import json
    up = P.uploads()
    if "lineup_family.png" not in up:
        url = hf.upload(LINEUP, private=True)
    who = sys.argv[1:] or ["sophie", "alana", "papa", "mama", "thor"]
    with cf.ThreadPoolExecutor(3) as ex:
        for c, rc, msg in ex.map(run, who):
            print(c, rc, msg.replace("\n", " | "), flush=True)
