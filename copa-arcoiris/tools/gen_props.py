#!/usr/bin/env python3
"""M7: scenery prop kits. Each kit is a 2:1 sheet with 8 separated props in 2 rows x 4 columns (reading order = list order)."""
import os, sys, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prompts as P

STYLE = ("16-bit Super Nintendo style pixel art, chunky hard square pixels, a clean 1-pixel dark plum outline (#2A1B3D), flat cel shading with one highlight "
         "and one shadow tone, light from the top left, no anti-aliasing, no gradients, no blur, no text, no labels, no watermark, bright cheerful candy colors, "
         "teal-green foliage, warm sand and wood, fairytale forest sports festival for children.")
GRID = ("Draw exactly 8 separate objects in a grid of 2 rows and 4 columns, side view, each object fully isolated with a wide empty gap around it so none touches another, "
        "all sitting on their own invisible ground line. Solid flat cyan (#00C8FF) background, nothing else.")
KITS = {
 "trees": ("(1) a giant friendly old oak tree called the Grandfather Tree with a very thick trunk and one long strong horizontal branch on the right side, (2) a round leafy green tree, "
           "(3) a tall fairytale fir tree, (4) a pink blossom tree, (5) a round green bush with small flowers, (6) a hedge bush with red berries, (7) a big cluster of yellow and pink flowers, "
           "(8) a small cluster of red mushrooms with white dots"),
 "houses": ("(1) a fairytale mushroom cottage with a big red spotted cap roof and a round door, (2) a cozy cottage with a thatched roof and flower boxes at the windows, (3) a small white windmill with colorful blades, "
            "(4) a round stone fountain with sparkling water, (5) a wooden market stall with a pastel striped awning, (6) a small pastel striped festival tent, (7) a wooden signpost with two arrows, (8) a string of colorful lanterns on two poles"),
 "race": ("(1) a tall wooden pole with a large black and white checkered finish flag, (2) a tall pole with a green pennant flag, (3) a tall pole with a pink pennant flag, (4) a tall pole with an orange pennant flag, "
          "(5) a tall pole with a cyan pennant flag, (6) a bunch of colorful balloons tied to a small stake, (7) a wooden arrow sign pointing right, (8) a wooden planter box full of flowers"),
 "events": ("(1) a big star shaped pinata made of colorful paper hanging from a short rope, (2) the same star pinata cracked open with stars peeking out, (3) a big red and white spotted mushroom bumper, "
            "(4) a fluffy white cloud platform, (5) a golden hay bale, (6) a wooden gift crate with a ribbon, (7) a wicker picnic basket full of soft colorful balls, (8) a wooden bench"),
 "water": ("(1) a cluster of green lily pads with a pink flower, (2) a mossy grey rock, (3) a group of tall green reeds, (4) a yellow rubber duck, (5) a round swim ring float, (6) a small wooden dock post with a rope, "
           "(7) a cluster of three large shiny soap bubbles, (8) a smooth white pebble pile"),
}

def run(kit):
    prompt = f"{STYLE} A prop kit sheet with: {KITS[kit]}. {GRID} {STYLE}"
    r = P.gen(f"props_{kit}", f"art-src/higgsfield/props/{kit}.png", prompt, [], purpose=f"props {kit}")
    return kit, r.returncode, (r.stdout + r.stderr).strip()[-140:].replace("\n", " | ")

if __name__ == "__main__":
    kits = sys.argv[1:] or list(KITS)
    with cf.ThreadPoolExecutor(3) as ex:
        for res in ex.map(run, kits): print(*res, flush=True)
