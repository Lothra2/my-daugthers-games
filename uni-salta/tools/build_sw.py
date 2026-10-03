#!/usr/bin/env python3
"""Writes sw-assets.json: every file the game needs offline."""
import os, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = ['./', 'index.html', 'manifest.webmanifest']
for base, exts in (('src', ('.js', '.css', '.json')), ('assets', ('.png', '.xml', '.woff2'))):
    for d, _, fs in os.walk(os.path.join(ROOT, base)):
        for f in sorted(fs):
            if f.endswith(exts): out.append(os.path.relpath(os.path.join(d, f), ROOT))
json.dump(sorted(set(out)), open(os.path.join(ROOT, 'sw-assets.json'), 'w'), indent=0)
print(len(set(out)), 'files in sw-assets.json')
