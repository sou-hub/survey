// sw.js
const CACHE_VERSION = 'v20260318-1';
const CACHE_NAME = 'osa-cache-' + CACHE_VERSION;

self.addEventListener('install', (evt) => {
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('osa-cache-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (evt) => {
  const d = evt.data || {};

  if (d.type === 'CLEAR_CACHE') {
    evt.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('osa-cache-'))
            .map((k) => caches.delete(k))
        )
      )
    );
    return;
  }

  if (d.type === 'CACHE_URLS' && Array.isArray(d.urls)) {
    evt.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        for (const url of d.urls) {
          try {
            await cache.add(url);
          } catch (_) {}
        }
      })
    );
  }
});

self.addEventListener('fetch', (evt) => {
  const req = evt.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get('accept') || '';
  const isHtml = req.mode === 'navigate' || accept.includes('text/html');

  if (isHtml) {
    evt.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          return caches.match(location.origin + url.pathname);
        }).then((fallback) => fallback || new Response('Offline', { status: 504 }))
      )
    );
    return;
  }

  evt.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});