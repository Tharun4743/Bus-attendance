/**
 * PWA Notification & Push Utility
 * Manages browser/PWA device notification permissions and dispatches system notifications
 */

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Check if the current browser / environment supports notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current notification permission state
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Request permission from user to show notifications
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return false;
  }
}

/**
 * Show a native PWA / Device notification
 */
export async function showPwaNotification(payload: NotificationPayload): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) return false;
  }

  try {
    // 1. Preferred method: Through active Service Worker registration
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(payload.title, {
          body: payload.body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          vibrate: [200, 100, 200],
          tag: payload.tag || `attendance-${Date.now()}`,
          renotify: true,
          data: {
            url: payload.url || '/',
          },
        } as any);
        return true;
      }
    }

    // 2. Fallback: Standard browser Notification constructor
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: '/icon.svg',
      tag: payload.tag || `attendance-${Date.now()}`,
    });

    notification.onclick = () => {
      window.focus();
      if (payload.url && window.location.pathname !== payload.url) {
        window.location.href = payload.url;
      }
      notification.close();
    };

    return true;
  } catch (err) {
    console.error('Failed to show PWA notification:', err);
    return false;
  }
}

/**
 * Register Service Worker on window load
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('✅ ServiceWorker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.log('⚠️ ServiceWorker registration failed:', err);
        });
    });
  }
}
