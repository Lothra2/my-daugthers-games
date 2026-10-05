#!/usr/bin/env python3
"""Title key art: the whole family celebrating under a rainbow. Refs: the clean master crops (not the photos) and the family lineup. Usage: gen_title.py [a|b|c]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prompts as P

tag = sys.argv[1] if len(sys.argv) > 1 else "a"
prompt = (f"{P.STYLE} Wide title screen key art for a family sports game called The Rainbow Forest Cup. "
          "The same five characters as in the reference images, keep their faces, hair and clothes exactly: the dad in red, the mom in purple, the 7-year-old girl in green with the green headband, "
          "the 4-year-old girl in pink with two butterfly clips, and the boxer dog Thor in the middle wearing a sky-blue cap and a silver whistle. "
          "There are EXACTLY FIVE figures in the whole picture and no other people: (1) the dad, (2) the mom, (3) the 7-year-old girl, (4) the 4-year-old girl, (5) the dog. The mom appears only ONCE, there is no second woman in purple. "
          "They stand in one row on a grassy hill in the lower third of the picture, all cheering with big happy smiles and arms raised, cute chibi proportions with big heads, "
          "the dog sitting happily in front between the girls. A shiny golden trophy cup glows in the center of the row. "
          "Behind them a huge rainbow arcs across a bright blue sky with fluffy white clouds, rolling green hills, round leafy trees and fir trees, a red spotted mushroom cottage, a small windmill with colorful blades, "
          "festival bunting flags and colorful balloons, confetti falling. Leave the upper middle of the sky calm and mostly empty for a logo. "
          f"Cheerful candy colors, teal-green foliage, warm sand path. All faces smiling. {P.STYLE}")
refs = [P.uploads()[k] for k in ("lineup_family.png", "ref_papa.png", "ref_mama.png", "ref_sophie.png", "ref_alana.png")]
r = P.gen(f"title_art_{tag}", f"art-src/higgsfield/title/title_{tag}.png", prompt, refs, aspect="16:9", purpose=f"title key art {tag}", max_credits=3.5)
print(r.stdout.strip()[-300:]); print(r.stderr.strip()[-300:]); sys.exit(r.returncode)
