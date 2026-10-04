#!/usr/bin/env python3
"""Builds editable Krita files (.kra) in art-src/krita/.
Pillow writes a layered OpenRaster (.ora), then Krita converts it headless: `xvfb-run -a krita --export --export-filename out.kra in.ora`
(QT_QPA_PLATFORM=offscreen does not work with Krita, see docs/DECISIONS.md).
One file per character: layers = game sprite atlas (48x48 cells, 3x zoomed so it is comfortable to paint on), outfits and the AI master sheet used as reference.
One file for the props atlas."""
import io, os, subprocess, sys, zipfile
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "art-src/krita")
ZOOM = 3


def ora(path, layers, size):
    """layers: bottom-first list of (name, PIL image RGBA of `size`)."""
    stack = ['<?xml version="1.0" encoding="UTF-8"?>', f'<image version="0.0.3" w="{size[0]}" h="{size[1]}"><stack>']
    for name, _ in reversed(layers):
        stack.append(f'<layer name="{name}" src="data/{name}.png" x="0" y="0" opacity="1.0" visibility="visible" composite-op="svg:src-over"/>')
    stack.append("</stack></image>")
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("mimetype", "image/openraster", compress_type=zipfile.ZIP_STORED)
        z.writestr("stack.xml", "\n".join(stack))
        flat = Image.new("RGBA", size, (0, 0, 0, 0))
        for name, im in layers:
            buf = io.BytesIO(); im.save(buf, "PNG"); z.writestr(f"data/{name}.png", buf.getvalue())
            flat.alpha_composite(im)
        buf = io.BytesIO(); flat.save(buf, "PNG"); z.writestr("mergedimage.png", buf.getvalue())
        th = flat.copy(); th.thumbnail((256, 256)); buf = io.BytesIO(); th.save(buf, "PNG"); z.writestr("Thumbnails/thumbnail.png", buf.getvalue())


def to_kra(src, dst):
    r = subprocess.run(["xvfb-run", "-a", "krita", "--export", "--export-filename", dst, src], capture_output=True, text=True, timeout=180)
    if not os.path.exists(dst):
        sys.exit(f"krita failed for {dst}: {r.stderr[-300:]}")


def zoom(im):
    return im.resize((im.width * ZOOM, im.height * ZOOM), Image.NEAREST)


def main():
    os.makedirs(OUT, exist_ok=True)
    for c in ("sophie", "alana", "papa", "mama", "thor"):
        base = zoom(Image.open(os.path.join(ROOT, f"public/assets/sprites/{c}.png")).convert("RGBA"))
        layers = [("referencia_IA", Image.new("RGBA", base.size, (0, 0, 0, 0)))]
        ref = Image.open(os.path.join(ROOT, f"art-src/higgsfield/identity/master_{c}.png")).convert("RGBA")
        ref.thumbnail((base.width, base.height))
        canvas = Image.new("RGBA", base.size, (0, 0, 0, 0)); canvas.alpha_composite(ref, (0, 0)); layers[0] = ("referencia_IA", canvas)
        for sfx, nm in (("_estrellas", "traje_estrellas"), ("_arcoiris", "traje_arcoiris")):
            layers.append((nm, zoom(Image.open(os.path.join(ROOT, f"public/assets/sprites/{c}{sfx}.png")).convert("RGBA"))))
        layers.append(("atlas_juego", base))
        tmp = os.path.join(OUT, f"{c}.ora"); ora(tmp, layers, base.size)
        to_kra(tmp, os.path.join(OUT, f"{c}.kra")); os.remove(tmp)
        print(c, "ok")
    props = zoom(Image.open(os.path.join(ROOT, "public/assets/props/props.png")).convert("RGBA"))
    tmp = os.path.join(OUT, "props.ora"); ora(tmp, [("props_atlas", props)], props.size)
    to_kra(tmp, os.path.join(OUT, "props.kra")); os.remove(tmp)
    print("props ok")


if __name__ == "__main__":
    main()
