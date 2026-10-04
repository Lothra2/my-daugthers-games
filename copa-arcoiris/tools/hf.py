#!/usr/bin/env python3
"""Higgsfield Cloud API client for La Copa del Bosque Arcoíris. The only code that talks to Higgsfield.

Credentials: env HF_KEY or ~/.config/higgsfield/key (format key_id:key_secret).
They are never printed, logged or written inside the repo. The game never calls this API.

Guards (enforced here, not by convention):
  * Hard budget: BUDGET_CREDITS total for the first delivery. A call is refused if
    spent + estimate would pass it. A warning is printed past WARN_CREDITS.
  * Attempts: at most MAX_ATTEMPTS generations per asset id (first try + 2 regenerations).
  * Timeouts: a request that times out is logged as pending with its status URL.
    Use `resume <request_id>` to collect it. Never resubmit a pending asset.

Usage:
  hf.py estimate <endpoint> --args '{...}'
  hf.py upload <file> [--private]            -> prints the URL (private uploads are logged outside Git)
  hf.py gen <endpoint> --asset <asset_id> --args '{...}' --out art-src/higgsfield/<group>/<name>.png --purpose "..."
  hf.py resume <request_id>                  -> finishes a pending request
  hf.py spent                                -> credits used so far and remaining
"""
import argparse, datetime, json, os, sys, time, urllib.request, urllib.error, uuid

API = "https://api.higgsfield.ai"
KEY_FILE = os.path.expanduser("~/.config/higgsfield/key")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(ROOT, "art-src", "generations.jsonl")
LOG_MD = os.path.join(ROOT, "docs", "GENERATIONS.md")
PRIVATE_UPLOADS = os.path.join(ROOT, "reference", "private", "uploads.json")

BUDGET_CREDITS = 200.0
WARN_CREDITS = 170.0
MAX_ATTEMPTS = 3


def key():
    k = os.environ.get("HF_KEY")
    if not k and os.path.exists(KEY_FILE):
        k = open(KEY_FILE).read().strip()
    if not k or ":" not in k:
        sys.exit("Higgsfield key missing. Put key_id:key_secret in ~/.config/higgsfield/key (chmod 600)")
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


def ledger():
    if not os.path.exists(LEDGER):
        return []
    return [json.loads(l) for l in open(LEDGER) if l.strip()]


def append_ledger(rec):
    os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
    with open(LEDGER, "a") as f:
        f.write(json.dumps(rec) + "\n")


def spent():
    # Every submitted request counts, including failed or pending ones, to stay conservative.
    seen = {}
    for r in ledger():
        if r.get("request_id"):
            seen[r["request_id"]] = float(r.get("credits", 0))
    return sum(seen.values())


def attempts(asset):
    return len({r["request_id"] for r in ledger() if r.get("asset") == asset and r.get("event") == "submitted"})


def estimate(endpoint, args):
    return call("POST", f"{API}/estimate/{endpoint}", args)


def upload(path, private=False):
    ext = os.path.splitext(path)[1].lower()
    ctype = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
             ".gif": "image/gif", ".mp4": "video/mp4", ".wav": "audio/wav"}[ext]
    up = call("POST", f"{API}/files/generate-upload-url", {"content_type": ctype})
    headers = dict(up.get("upload_headers") or {"Content-Type": ctype})
    req = urllib.request.Request(up["upload_url"], data=open(path, "rb").read(), headers=headers, method="PUT")
    urllib.request.urlopen(req, timeout=120).read()  # storage PUT, no API credentials sent
    url = up["public_url"]
    if private:
        os.makedirs(os.path.dirname(PRIVATE_UPLOADS), exist_ok=True)
        data = json.load(open(PRIVATE_UPLOADS)) if os.path.exists(PRIVATE_UPLOADS) else {}
        data[os.path.basename(path)] = url
        json.dump(data, open(PRIVATE_UPLOADS, "w"), indent=1)
    return url


def poll(status_url, rid, timeout=900):
    t0, delay = time.time(), 3
    while time.time() - t0 < timeout:
        st = call("GET", status_url)
        if st.get("status") in ("completed", "failed", "nsfw", "canceled"):
            return st
        time.sleep(delay)
        delay = min(delay * 1.4, 15)
    return None


def download(url, out):
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as r, open(out, "wb") as f:
        f.write(r.read())


def log_md(endpoint, asset, purpose, credits, rid, status):
    new = not os.path.exists(LOG_MD)
    with open(LOG_MD, "a") as f:
        if new:
            f.write("# Registro de generaciones Higgsfield\n\n"
                    f"Tope de la primera entrega: {BUDGET_CREDITS:.0f} créditos. Fuente de verdad: `art-src/generations.jsonl`.\n\n"
                    "| Fecha (UTC) | Modelo | Asset | Propósito | Créditos (estimado) | Estado | Request id |\n"
                    "|---|---|---|---|---|---|---|\n")
        f.write(f"| {datetime.datetime.utcnow():%Y-%m-%d %H:%M} | {endpoint} | {asset} | {purpose} | {credits} | {status} | {rid} |\n")


def finish(rec, res):
    rid = rec["request_id"]
    if res is None:
        append_ledger({**rec, "event": "pending"})
        log_md(rec["endpoint"], rec["asset"], rec["purpose"], rec["credits"], rid, "pendiente")
        sys.exit(f"timeout on {rid}. Do NOT resubmit. Run: python3 tools/hf.py resume {rid}")
    status = res.get("status")
    if status != "completed":
        append_ledger({**rec, "event": status, "error": str(res.get("error"))[:300]})
        log_md(rec["endpoint"], rec["asset"], rec["purpose"], rec["credits"], rid, status)
        sys.exit(f"request {rid} ended as {status}: {res.get('error')}")
    outs = res.get("images") or ([res["video"]] if res.get("video") else []) or res.get("audios") or []
    base, ext = os.path.splitext(rec["out"])
    paths = []
    for i, o in enumerate(outs):
        path = rec["out"] if i == 0 else f"{base}_{i+1}{ext}"
        download(o["url"], path)
        paths.append(path)
        print(path)
    side = {k: rec[k] for k in ("endpoint", "asset", "purpose", "request_id", "credits")}
    side["args"] = rec["args"]
    side["outputs"] = [os.path.relpath(p, ROOT) for p in paths]
    json.dump(side, open(base + ".json", "w"), indent=1, ensure_ascii=False)
    append_ledger({**rec, "event": "completed", "outputs": side["outputs"]})
    log_md(rec["endpoint"], rec["asset"], rec["purpose"], rec["credits"], rid, "ok")


def scrub(args):
    """Never write private photo URLs into tracked files."""
    priv = json.load(open(PRIVATE_UPLOADS)).values() if os.path.exists(PRIVATE_UPLOADS) else []
    s = json.dumps(args)
    for u in priv:
        s = s.replace(u, "<private-reference-photo>")
    return json.loads(s)


def main():
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    e = sp.add_parser("estimate"); e.add_argument("endpoint"); e.add_argument("--args", default="{}")
    u = sp.add_parser("upload"); u.add_argument("file"); u.add_argument("--private", action="store_true")
    g = sp.add_parser("gen"); g.add_argument("endpoint"); g.add_argument("--asset", required=True)
    g.add_argument("--args", required=True); g.add_argument("--out", required=True); g.add_argument("--purpose", default="")
    g.add_argument("--max-credits", type=float, default=3.0)
    r = sp.add_parser("resume"); r.add_argument("request_id")
    sp.add_parser("spent")
    a = ap.parse_args()

    if a.cmd == "estimate":
        print(json.dumps(estimate(a.endpoint, json.loads(a.args))))
    elif a.cmd == "upload":
        print(upload(a.file, a.private))
    elif a.cmd == "spent":
        s = spent()
        print(json.dumps({"spent": round(s, 3), "budget": BUDGET_CREDITS, "remaining": round(BUDGET_CREDITS - s, 3)}))
    elif a.cmd == "resume":
        recs = [x for x in ledger() if x.get("request_id") == a.request_id and x.get("event") == "submitted"]
        if not recs:
            sys.exit("unknown request id")
        rec = recs[-1]
        finish(rec, poll(rec["status_url"], a.request_id))
    else:
        args = json.loads(a.args)
        pend = [x for x in ledger() if x.get("asset") == a.asset and x.get("event") == "pending"]
        done = {x["request_id"] for x in ledger() if x.get("event") in ("completed", "failed", "nsfw", "canceled")}
        if any(p["request_id"] not in done for p in pend):
            sys.exit(f"asset {a.asset} has a pending request. Run resume first, do not resubmit")
        if attempts(a.asset) >= MAX_ATTEMPTS:
            sys.exit(f"asset {a.asset} already used {MAX_ATTEMPTS} attempts; refusing")
        credits = float(estimate(a.endpoint, args).get("credits", 0))
        if credits > a.max_credits:
            sys.exit(f"estimate {credits} credits exceeds --max-credits {a.max_credits}; refusing")
        total = spent()
        if total + credits > BUDGET_CREDITS:
            sys.exit(f"budget: {total:.2f} spent + {credits} would pass {BUDGET_CREDITS}; refusing")
        if total + credits > WARN_CREDITS:
            print(f"WARNING: budget at {total + credits:.2f} of {BUDGET_CREDITS}", file=sys.stderr)
        sub = call("POST", f"{API}/{a.endpoint}", args, idem=str(uuid.uuid4()))
        rid = sub.get("request_id")
        rec = {"ts": datetime.datetime.utcnow().isoformat(timespec="seconds"), "endpoint": a.endpoint,
               "asset": a.asset, "purpose": a.purpose, "credits": credits, "request_id": rid,
               "status_url": sub.get("status_url"), "out": a.out, "args": scrub(args)}
        append_ledger({**rec, "event": "submitted"})
        print(f"request_id={rid} credits={credits} spent_total={total + credits:.2f}", file=sys.stderr)
        finish(rec, poll(sub["status_url"], rid))


if __name__ == "__main__":
    main()
