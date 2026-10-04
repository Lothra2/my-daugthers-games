#!/usr/bin/env bash
# Prepares a fresh container for La Copa del Bosque Arcoíris. Safe to run more than once.
# Verified on Ubuntu 24.04 (cloud container, root) on 2026-10-04.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== apt: Tiled (map export CLI) and Krita (headless .kra export)"
if ! command -v tiled >/dev/null || ! command -v krita >/dev/null; then
  apt-get update -q >/dev/null
  apt-get install -y -q tiled krita >/dev/null
fi
tiled --version 2>/dev/null | tail -1 || echo "tiled missing"
krita --version 2>/dev/null | tail -1 || echo "krita missing"

echo "== python: image pipeline"
python3 -m pip install -q --disable-pip-version-check pillow numpy scipy

echo "== node: game dependencies (exact versions from package-lock.json)"
if [ -f package.json ]; then npm ci --no-audit --no-fund; fi

echo "== chromium for Playwright (preinstalled, never run 'playwright install')"
CH=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1 || true)
echo "CHROMIUM_PATH=${CH:-not found}"

echo "== Higgsfield key (only presence is checked)"
if [ -n "${HF_KEY:-}" ] || [ -s "$HOME/.config/higgsfield/key" ]; then echo "key present"; else echo "key MISSING: put key_id:key_secret in ~/.config/higgsfield/key"; fi

echo "== private references (never in Git)"
ls reference/private/*.png 2>/dev/null || echo "MISSING family photos in reference/private/ (see reference/README.md)"
