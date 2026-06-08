const CACHE_NAME = 'hollerhub-static-v4';
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/sounds/sos-siren.mp3',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.includes('/documents/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        const isSafeStaticAsset =
          requestUrl.origin === self.location.origin &&
          response.ok &&
          (requestUrl.pathname.startsWith('/icons/') ||
            requestUrl.pathname.startsWith('/sounds/') ||
            requestUrl.pathname === '/manifest.webmanifest');

        if (isSafeStaticAsset) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }

        return response;
      });
    }),
  );
});

self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const alertId = data.alertId || data.id;
  const url = data.url || (alertId ? `/admin/sos?alert=${encodeURIComponent(alertId)}` : '/admin/sos');

  event.waitUntil(
    self.registration.showNotification(data.title || 'Emergency SOS Alert', {
      body: data.body || 'A resident emergency alert has been triggered. Open the SOS center.',
      tag: alertId ? `sos-${alertId}` : 'sos-alert',
      data: { url },
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      silent: false,
      requireInteraction: true,
      renotify: true,
      vibrate: [300, 150, 300, 150, 500],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin/sos';
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.startsWith(self.location.origin) && client.url.includes('/admin')) {
          if ('navigate' in client) {
            return client.navigate(absoluteUrl).then((navigatedClient) => navigatedClient?.focus());
          }
          return client.focus();
        }
      }

      return self.clients.openWindow(absoluteUrl);
    }),
  );
});
