#!/usr/bin/env python3
"""M2: family lineup (identity alignment) from the private photos and the Thor reference."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prompts as P

prompt = (f"{P.STYLE} A joyful family team at a magical forest sports festival: five characters standing side by side on one ground line, "
          "front three-quarter view, everyone smiling warmly, cute chibi proportions with BIG heads (about 40 percent of body height) and compact bodies. "
          f"From left to right: (1) {P.ID['papa']}; (2) {P.ID['mama']}; (3) {P.ID['sophie']}; (4) {P.ID['alana']}; (5) {P.ID['thor']}. "
          "Relative heights: the dad is tallest, the mom slightly shorter, the 7-year-old reaches the mom's shoulder, the 4-year-old is the smallest, "
          "the boxer dog stands about knee-high to the dad. Use the reference photos only for faces, hairstyles and features, "
          "and make every face look happy and smiling. All five fit in one row with space between them. "
          f"{P.STYLE} {P.BG}")
refs = [P.photo("papa"), P.photo("mama"), P.photo("sophie"), P.photo("alana"), P.photo("thor")]
r = P.gen("lineup_family", "art-src/higgsfield/identity/lineup_family.png", prompt, refs, purpose="M2 alineacion familiar")
print(r.stdout.strip()[-400:]); print(r.stderr.strip()[-400:])
sys.exit(r.returncode)
