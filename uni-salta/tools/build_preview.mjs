// Builds a single-page, single-script version of the game for sandboxed hosts (artifact preview).
// The real game has no build step. This only inlines the JS/CSS so the page needs no module loading from its own origin.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2] || '/tmp/uni-preview';
fs.mkdirSync(outDir, { recursive: true });
const res = await build({ entryPoints: [path.join(ROOT, 'src/main.js')], bundle: true, format: 'esm', minify: true, write: false, target: 'es2022', external: ['https://*'], legalComments: 'none' });
const js = res.outputFiles[0].text.replaceAll('</script', '<\\/script');
let css = fs.readFileSync(path.join(ROOT, 'src/ui/ui.css'), 'utf8').replace(/@font-face\s*\{[^}]*\}/, '');
const html = `<title>UNI-SALTA</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&display=swap">
<style>${css}
html,body{margin:0;padding:0;height:100%;background:#1E1330;overflow:hidden}
:root{padding:0 !important}
</style>
<div id="app"><div id="game"></div><div id="ui"></div><div id="rotate"><div class="rot-card"><div class="rot-icon"></div><p id="rotate-text">Gira tu pantalla</p></div></div></div>
<script src="https://cdn.jsdelivr.net/npm/phaser@4.2.1/dist/phaser.min.js"></script>
<script type="module">${js}</script>
`;
fs.writeFileSync(path.join(outDir, 'uni-salta-preview.html'), html);
console.log('preview html', (html.length / 1024).toFixed(0) + ' KB');
