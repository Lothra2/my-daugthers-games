#!/usr/bin/env python3
"""Higgsfield Cloud API wrapper for UNI-SALTA. The only code that talks to Higgsfield.

Credentials are read from the HF_KEY env var or from ~/.config/higgsfield/key
(format api_key_id:api_key_secret). They are never printed, logged or stored in the repo.

  hf.py estimate <endpoint> --args '{"prompt": "..."}'
  hf.py upload <file>                       -> prints the public URL
  hf.py gen <endpoint> --args '{...}' --out art-src/higgsfield/<cat>/<name>.png --purpose "..."
"""
import argparse, datetime, json, os, sys, time, urllib.request, urllib.error, uuid

API = "https://api.higgsfield.ai"
KEY_FILE = os.path.expanduser("~/.config/higgsfield/key")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREDITS_LOG = os.path.join(ROOT, "docs", "CREDITS.md")


def key():
    k = os.environ.get("HF_KEY")
    if not k and os.path.exists(KEY_FILE):
        k = open(KEY_FILE).read().strip()
    if not k or ":" not in k:
        sys.exit("Higgsfield key missing. Put api_key:api_secret in ~/.config/higgsfield/key")
    return k


def call(method, url, body=None, idem=None, timeout=120):
    headers = {"Authorization": f"Key {key()}", "Content-Type": "application/json", "Accept": "application/json"}
    if idem:
        headers["Idempotency-Key"] = idem
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="replace")[:600]
        sys.exit(f"HTTP {e.code} on {method} {url.replace(API, '')}: {msg}")


def estimate(endpoint, args):
    return call("POST", f"{API}/estimate/{endpoint}", args)


def upload(path):
    ext = os.path.splitext(path)[1].lower()
    ctype = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
             ".gif": "image/gif", ".mp4": "video/mp4", ".wav": "audio/wav"}[ext]
    up = call("POST", f"{API}/files/generate-upload-url", {"content_type": ctype})
    headers = dict(up.get("upload_headers") or {"Content-Type": ctype})
    req = urllib.request.Request(up["upload_url"], data=open(path, "rb").read(), headers=headers, method="PUT")
    urllib.request.urlopen(req, timeout=120).read()  # no API credentials sent to storage
    return up["public_url"]


def generate(endpoint, args, timeout=900):
    idem = str(uuid.uuid4())
    sub = call("POST", f"{API}/{endpoint}", args, idem=idem)
    rid = sub.get("request_id")
    print(f"request_id={rid} status={sub.get('status')}", file=sys.stderr)
    t0, delay = time.time(), 3
    while time.time() - t0 < timeout:
        st = call("GET", sub["status_url"])
        s = st.get("status")
        if s in ("completed", "failed", "nsfw", "canceled"):
            return rid, st
        time.sleep(delay)
        delay = min(delay * 1.4, 15)
    sys.exit(f"timeout waiting for {rid}; do NOT resubmit, check status later")


def download(url, out):
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as r, open(out, "wb") as f:
        f.write(r.read())


def log_credit(endpoint, purpose, credits, rid):
    new = not os.path.exists(CREDITS_LOG)
    with open(CREDITS_LOG, "a") as f:
        if new:
            f.write("# Higgsfield credit log\n\n| Date (UTC) | Endpoint | Purpose | Credits (estimate) | Request id |\n|---|---|---|---|---|\n")
        f.write(f"| {datetime.datetime.utcnow():%Y-%m-%d %H:%M} | {endpoint} | {purpose} | {credits} | {rid} |\n")


def main():
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    e = sp.add_parser("estimate"); e.add_argument("endpoint"); e.add_argument("--args", default="{}")
    u = sp.add_parser("upload"); u.add_argument("file")
    g = sp.add_parser("gen"); g.add_argument("endpoint"); g.add_argument("--args", required=True)
    g.add_argument("--out", required=True); g.add_argument("--purpose", default="")
    g.add_argument("--max-credits", type=float, default=3.0)
    a = ap.parse_args()
    if a.cmd == "estimate":
        print(json.dumps(estimate(a.endpoint, json.loads(a.args))))
    elif a.cmd == "upload":
        print(upload(a.file))
    else:
        args = json.loads(a.args)
        est = estimate(a.endpoint, args)
        credits = float(est.get("credits", 0))
        if credits > a.max_credits:
            sys.exit(f"estimate {credits} credits exceeds --max-credits {a.max_credits}; refusing")
        rid, res = generate(a.endpoint, args)
        if res.get("status") != "completed":
            sys.exit(f"request {rid} ended as {res.get('status')}: {res.get('error')}")
        outs = res.get("images") or ([res["video"]] if res.get("video") else []) or res.get("audios") or []
        base, ext = os.path.splitext(a.out)
        for i, o in enumerate(outs):
            path = a.out if i == 0 else f"{base}_{i+1}{ext}"
            download(o["url"], path)
            print(path)
        side = base + ".json"
        json.dump({"endpoint": a.endpoint, "args": args, "request_id": rid, "estimate": est,
                   "purpose": a.purpose, "outputs": [o["url"] for o in outs]}, open(side, "w"), indent=1)
        log_credit(a.endpoint, a.purpose, credits, rid)


if __name__ == "__main__":
    main()
