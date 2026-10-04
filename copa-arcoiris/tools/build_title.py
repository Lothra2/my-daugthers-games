#!/usr/bin/env python3
"""Title key art: art-src/higgsfield/title/title_b.png (2816x1584) -> public/assets/ui/title.png at 640x360 with a limited palette,
so it sits next to the in-game pixel art. 640x360 is exactly 2x on a 1280x720 screen and 3x on 1920x1080."""
import os, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1] if len(sys.argv) > 1 else "title_b.png"
im = Image.open(os.path.join(ROOT, "art-src/higgsfield/title", src)).convert("RGB").resize((640, 360), Image.LANCZOS)
q = im.quantize(colors=72, method=Image.MEDIANCUT, dither=Image.NONE)
out = os.path.join(ROOT, "public/assets/ui/title.png")
q.save(out, optimize=True)
q.convert("RGB").resize((1280, 720), Image.NEAREST).save(os.path.join(ROOT, "docs/qa/title_art_x2.png"))
print(out, os.path.getsize(out), "bytes")
