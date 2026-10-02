/* CSHARE service worker: offline app shell + web push (assignment notices and reminders). */
const CACHE = 'cshare-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase / EmailJS calls go straight to the network

  // Opening the app: always try the network first (so updates arrive), fall back to the saved shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Built files have a fingerprint in their name, so a saved copy never goes stale.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then(
        hit =>
          hit ||
          fetch(req).then(res => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then(c => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

// ---------------------------------------------------------------- push
self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { data: { body: event.data ? event.data.text() : '' } };
  }
  const d = Object.assign({}, payload.notification || {}, payload.data || {});
  const title = d.title || 'CSHARE';
  const body =
    d.body ||
    (d.type === 'sync' ? 'Your assignments were updated. Open CSHARE to see the latest.' : 'Open CSHARE for details.');
  const tag = d.tag || (d.assignmentId ? 'cshare|' + d.assignmentId : undefined);

  event.waitUntil(
    (async () => {
      // Open pages refresh themselves; every push is still shown (iPhone requires a visible notification).
      const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      pages.forEach(p => p.postMessage({ type: 'cshare-push', data: d }));
      await self.registration.showNotification(title, {
        body,
        tag,
        icon: '/icons/icon-192.png',
        data: d,
        requireInteraction: d.callStyle === 'true',
      });
    })(),
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const d = event.notification.data || {};
  const q = new URLSearchParams();
  if (d.assignmentId) q.set('a', d.assignmentId);
  if (d.groupId) q.set('g', d.groupId);
  const target = '/' + (q.toString() ? '?' + q.toString() : '');

  event.waitUntil(
    (async () => {
      const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const page of pages) {
        if ('focus' in page) {
          await page.focus();
          page.postMessage({ type: 'cshare-open', data: d });
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
