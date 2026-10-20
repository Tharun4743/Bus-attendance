const CACHE_NAME = 'bus-attendance-pwa-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install & Cache Core Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate & Remove Stale Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Network-First for dynamic APIs, Cache-First for static assets, bypass Vite dev requests
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Never intercept Vite internal modules, source files, or backend API endpoints
  if (
    url.includes('/@vite') ||
    url.includes('/@react-refresh') ||
    url.includes('/@fs') ||
    url.includes('/__vite') ||
    url.includes('/api/') ||
    url.includes('/src/') ||
    url.includes('node_modules') ||
    event.request.method !== 'GET'
  ) {
    return; // Pass through cleanly to network
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith('http')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
        }
        return new Response('Offline or Network Error', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
  );
});

// ----------------------------------------------------------------------
// PWA PUSH & BACKGROUND NOTIFICATIONS
// ----------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {
    title: '🚌 Bus Attendance Alert',
    body: 'An attendance session has started. Please verify your attendance.',
    url: '/',
    tag: 'bus-attendance-alert'
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'bus-attendance',
    renotify: true,
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Open Dashboard' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing open tab if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Support receiving notification triggers from active page via postMessage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, url, tag } = event.data;
    self.registration.showNotification(title || '🚌 Bus Attendance Alert', {
      body: body || 'Attendance is now active!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: tag || 'bus-attendance-msg',
      renotify: true,
      data: { url: url || '/' }
    });
  }
});
