// Exports every maps-src/*.tmx to public/assets/maps/*.json with the Tiled CLI (embedded tilesets, so Phaser needs no .tsx).
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, statSync } from 'node:fs';

mkdirSync('public/assets/maps', { recursive: true });
for (const f of readdirSync('maps-src').filter((n) => n.endsWith('.tmx'))) {
  const out = `public/assets/maps/${f.replace('.tmx', '.json')}`;
  execFileSync('tiled', ['--embed-tilesets', '--export-map', 'json', `maps-src/${f}`, out], { env: { ...process.env, QT_QPA_PLATFORM: 'offscreen' }, stdio: ['ignore', 'ignore', 'inherit'] });
  console.log(`${f} -> ${out} (${(statSync(out).size / 1024).toFixed(0)} KB, exported by Tiled)`);
}
