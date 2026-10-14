/* חומ"ס לנהג — offline cache */
const VER = '2026-10-14f';
const SHELL = 'hz-shell-' + VER, RUNTIME = 'hz-runtime-' + VER;
const FILES = ['./index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const LIBS = ['https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL); await c.addAll(FILES);
    const r = await caches.open(RUNTIME); await Promise.all(LIBS.map(u => fetch(u, {mode:'cors'}).then(res => res.ok && r.put(u, res)).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('hz-') && k !== SHELL && k !== RUNTIME) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {   // the page: network first so updates arrive, cache when offline
    e.respondWith(fetch(req).then(res => { caches.open(SHELL).then(c => c.put('./index.html', res.clone())); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  const cdn = /(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (cdn || url.origin === location.origin) {   // libraries, fonts, icons: cache first
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(RUNTIME).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
