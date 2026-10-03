// UNI-SALTA service worker: caches the whole game so it plays offline after the first visit.
const VERSION = 'uni-salta-v1.0.0';
const RUNTIME = VERSION + '-runtime';

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    const list = await (await fetch('sw-assets.json', { cache: 'no-store' })).json();
    await Promise.all(list.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (!k.startsWith(VERSION)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // code and pages: network first so updates arrive, cache when offline. Assets: cache first.
    const isCode = /\.(html|js|css|json)$/.test(url.pathname) || url.pathname.endsWith('/');
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      if (isCode) {
        try { const r = await fetch(req); if (r.ok) cache.put(req, r.clone()); return r; } catch (err) { return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('index.html')) || Response.error(); }
      }
      return (await cache.match(req, { ignoreSearch: true })) || (await fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; }));
    })());
    return;
  }
  // CDN libraries: stale while revalidate
  if (/cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.host)) {
    e.respondWith((async () => {
      const cache = await caches.open(RUNTIME);
      const hit = await cache.match(req);
      const net = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') cache.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
  }
});
