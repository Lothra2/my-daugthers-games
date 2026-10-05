"""Prompt blocks and a thin runner on top of tools/hf.py. Every Higgsfield generation goes through gen().

Photo URLs come from reference/private/uploads.json (ignored by Git) and are never written to tracked files
(hf.py scrubs them from the ledger and the sidecar JSON).
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = "xai/grok-imagine-image-2.0"
UPLOADS = os.path.join(ROOT, "reference", "private", "uploads.json")

STYLE = ("16-bit Super Nintendo style pixel art, chunky hard square pixels, a clean 1-pixel dark plum outline (#2A1B3D), "
         "flat cel shading with one highlight and one shadow tone, light from the top left, no anti-aliasing, no gradients, "
         "no blur, no text, no labels, no watermark.")
BG = "Solid flat cyan (#00C8FF) background, nothing else."

ID = {
    "sophie": ("a cheerful 7-year-old girl, long straight jet-black hair falling loose past her shoulders with a slightly off-center part, "
               "a lime-green sports headband, dark brown eyes, straight defined eyebrows, light tan skin, tiny stud earrings, big happy open smile, "
               "lime green t-shirt with white trim and a white star on the chest, dark green shorts, white sneakers, adventurous energetic attitude"),
    "alana": ("a playful 4-year-old girl, chin-length fluffy black bob with a side part, TWO butterfly hair clips (one pink on one side and one purple "
              "on the other), big round dark brown eyes, round chubby cheeks with blush, light tan skin, giggling smile, pink t-shirt with small flutter "
              "sleeves, white trim and a white star on the chest, dark pink shorts, white sneakers"),
    "papa": ("a friendly enthusiastic dad in his early 40s, short dark brown-black hair with a slightly receding hairline, thick dark eyebrows, "
             "short salt-and-pepper full stubble beard, warm brown eyes, tan skin, big grin, red sports polo with white trim and a white star on the chest, "
             "dark red shorts, white sneakers, sturdy athletic build with broad shoulders"),
    "mama": ("an elegant determined mom in her late 30s, long wavy jet-black hair with a center part falling past her shoulders, thin arched eyebrows, "
             "light brown eyes, light tan skin, small silver earrings, warm confident smile, purple sports jacket with white trim and a white star on the chest, "
             "dark purple shorts, white sneakers, tall slim graceful posture"),
    "thor": ("a happy boxer dog, light fawn short coat, black muzzle mask, white chest bib and white paws, floppy folded ears, short tail, "
             "sky-blue collar, tongue out, mischievous friendly eyes, four legs, side view like a real dog"),
}
HOST = " wearing a small sky-blue cap and a silver whistle on a cord"
CHIBI = ("Cute chibi sports-festival character with a BIG head (about 40 percent of the body height) and a compact body, "
         "happy smiling face, rosy cheeks.")
# relative figure height as percent of image height for 2:1 sheets (ART_BIBLE section 9)
PCT = {"papa": 22, "mama": 21, "sophie": 19, "alana": 17, "thor": 14}


def uploads():
    return json.load(open(UPLOADS))


def photo(c):
    return uploads()[f"{c}_photo.png"] if c != "thor" else uploads()["thor_identity_ref.png"]


def sheet_prompt(c, frames, host=False, extra=""):
    ident = ID[c] + (HOST if host and c == "thor" else "")
    return (f"{STYLE} {CHIBI if c != 'thor' else 'Cute chibi style boxer dog with a big head and a compact body, happy face.'} {ident}. {extra} "
            f"Draw exactly 8 frames in ONE horizontal row, equally spaced, every frame the same size, all standing on the same invisible ground line, "
            f"plenty of empty space between frames so no frame touches another. Frames: {frames}. "
            f"Each figure is about {PCT[c]} percent of the image height. {STYLE} {BG}")


def gen(asset, out, prompt, refs=(), aspect="2:1", resolution="2k", quality="medium", purpose="", max_credits=3.0):
    args = {"prompt": prompt, "resolution": resolution, "aspect_ratio": aspect, "quality": quality}
    if refs:
        args["image_urls"] = list(refs)
    cmd = [sys.executable, os.path.join(ROOT, "tools", "hf.py"), "gen", MODEL, "--asset", asset, "--out", os.path.join(ROOT, out),
           "--purpose", purpose or asset, "--max-credits", str(max_credits), "--args", json.dumps(args)]
    return subprocess.run(cmd, capture_output=True, text=True)
