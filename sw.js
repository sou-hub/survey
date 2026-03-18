// sw.js
const CACHE = 'osa-cache-' + (self.registration && self.registration.scope || 'default');

self.addEventListener('install', (evt) => {
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('message', (evt) => {
  const d = evt.data || {};
  if (d.type === 'CLEAR_CACHE') {
    evt.waitUntil(
      caches.keys().then(keys =>
        Promise.all(keys
          .filter(k => k.startsWith('osa-cache-'))
          .map(k => caches.delete(k))
        )
      )
    );
  }
});

self.addEventListener('fetch', (evt) => {
  const req = evt.request;
  if (req.method !== 'GET') return;

  evt.respondWith(
    caches.match(req, { ignoreSearch: false }).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok && new URL(req.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached || new Response('Offline', { status: 504 }));
    })
  );
});