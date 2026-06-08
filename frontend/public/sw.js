const CACHE_VERSION = 'hollerhub-static-v1';
const STATIC_ASSETS = [
  '/offline',
  '/manifest.webmanifest',
  '/admin-sos.webmanifest',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) return;

  const isStaticAsset =
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/manifest.webmanifest' ||
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font';

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        return response;
      }))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match('/offline'))
    );
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.isTest ? 'TEST Emergency SOS Alert' : (data.title || 'Emergency SOS Alert');
  const bodyPrefix = data.isTest ? '[TEST] ' : '';
  const body = bodyPrefix + (data.body || 'A resident emergency alert has been triggered. Open the SOS console.');
  const alertId = data.alertId || data.id;
  const url = data.url || (alertId ? `/admin/sos?alertId=${encodeURIComponent(alertId)}` : '/admin/sos');
  const notificationData = {
    url,
    alertId,
    residentName: data.residentName,
    emergencyType: data.emergencyType || 'SOS',
    location: data.location || data.address,
    businessId: data.businessId,
    createdAt: data.createdAt,
    isTest: Boolean(data.isTest)
  };

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: alertId ? `sos-${alertId}` : 'sos-alert',
      silent: false,
      renotify: true,
      requireInteraction: true,
      vibrate: [900, 250, 900, 250, 900],
      data: notificationData,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/admin/sos';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && (client.url.includes('/admin/sos') || client.url.includes('/admin/dashboard'))) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
