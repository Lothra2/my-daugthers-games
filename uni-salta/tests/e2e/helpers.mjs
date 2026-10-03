// Playwright helpers: serves the game from disk, and fulfils CDN requests (Phaser, Motion) from a local cache
// so tests also work in sandboxes where the browser cannot reach the CDN directly.
import { chromium } from 'playwright';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CACHE = '/tmp/uni-cdn-cache';
fs.mkdirSync(CACHE, { recursive: true });

export function cdnFetch(url) {
  const f = path.join(CACHE, Buffer.from(url).toString('base64url').slice(0, 120));
  if (!fs.existsSync(f)) {
    if (url.includes('phaser@4.2.1/dist/phaser.min.js')) fs.copyFileSync(path.join(ROOT, 'node_modules/phaser/dist/phaser.min.js'), f);
    else fs.writeFileSync(f, execFileSync('curl', ['-sSL', '-m', '60', url], { maxBuffer: 64 * 1024 * 1024 }));
  }
  return fs.readFileSync(f);
}

export async function startServer(port = 8123) {
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 700));
  return { url: `http://127.0.0.1:${port}`, stop: () => srv.kill() };
}

export async function launch({ width = 932, height = 430, dpr = 3, touch = false, args = [] } = {}) {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', ...args],
  });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: touch, isMobile: touch, ignoreHTTPSErrors: true });
  await ctx.route(/cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com/, async (route) => {
    const url = route.request().url();
    try {
      const body = cdnFetch(url);
      const type = url.endsWith('.css') || url.includes('css2') ? 'text/css' : url.includes('woff2') ? 'font/woff2' : 'application/javascript';
      await route.fulfill({ status: 200, body, headers: { 'content-type': type, 'access-control-allow-origin': '*' } });
    } catch (e) { await route.abort(); }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return { browser, ctx, page, errors };
}
