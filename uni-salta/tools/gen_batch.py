#!/usr/bin/env python3
"""Run several Higgsfield image generations in parallel from a JSON spec.

spec item: {"name": "...", "endpoint": "xai/grok-imagine-image-2.0", "prompt": "...",
            "refs": ["https://...", ...] or ["@ref_unicorn.png" (key in /tmp/hf_ref_urls.json)],
            "aspect": "2:1", "res": "2k", "quality": "medium", "out": "art-src/higgsfield/h3/x.png",
            "purpose": "..."}
Usage: gen_batch.py spec.json [--workers 3] [--max-credits 3]
"""
import json, os, sys, subprocess, concurrent.futures as cf

HERE = os.path.dirname(os.path.abspath(__file__))
URLS = json.load(open("/tmp/hf_ref_urls.json")) if os.path.exists("/tmp/hf_ref_urls.json") else {}


def run(item, max_credits):
    refs = [URLS.get(r[1:], r) if r.startswith("@") else r for r in item.get("refs", [])]
    args = {"prompt": item["prompt"], "resolution": item.get("res", "2k"), "aspect_ratio": item.get("aspect", "1:1")}
    if item["endpoint"].startswith("xai/"):
        args["quality"] = item.get("quality", "medium")
    if refs:
        args["image_urls"] = refs
    r = subprocess.run([sys.executable, os.path.join(HERE, "hf.py"), "gen", item["endpoint"], "--args", json.dumps(args),
                        "--out", item["out"], "--purpose", item.get("purpose", item["name"]),
                        "--max-credits", str(max_credits)], capture_output=True, text=True)
    return item["name"], r.returncode, (r.stdout.strip() or r.stderr.strip())[-220:]


if __name__ == "__main__":
    spec = json.load(open(sys.argv[1]))
    workers = int(sys.argv[sys.argv.index("--workers") + 1]) if "--workers" in sys.argv else 3
    mx = float(sys.argv[sys.argv.index("--max-credits") + 1]) if "--max-credits" in sys.argv else 3
    with cf.ThreadPoolExecutor(workers) as ex:
        for name, rc, msg in ex.map(lambda i: run(i, mx), spec):
            print(("OK  " if rc == 0 else "FAIL"), name, msg.replace("\n", " | "))
