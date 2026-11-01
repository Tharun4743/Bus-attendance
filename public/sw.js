// PWA Service Worker for Push & Device Notifications
// Pure network passthrough with cache-purging for all legacy caches

// 1. Immediately activate and purge ALL legacy stale caches on install/activate
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

// 2. Fetch Handler: Pure network passthrough. Never serve stale cached HTML or JS bundles.
self.addEventListener('fetch', (event) => {
  // Let all network requests pass through directly to network
  return;
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
    icon: '/icon.svg',
    badge: '/icon.svg',
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
      icon: '/icon.svg',
      badge: '/icon.svg',
      vibrate: [200, 100, 200],
      tag: tag || 'bus-attendance-msg',
      renotify: true,
      data: { url: url || '/' }
    });
  }
});
