import React, { useState, useEffect } from 'react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showPwaNotification,
} from '../../utils/pwaNotifications';
import { Bell, BellRing, X } from 'lucide-react';

export const PwaNotificationPrompt: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const supported = isNotificationSupported();
    setIsSupported(supported);
    if (supported) {
      setPermission(getNotificationPermission());
    }
  }, []);

  if (!isSupported || dismissed || permission === 'granted') {
    return null;
  }

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermission('granted');
      // Send a confirmation welcome notification
      await showPwaNotification({
        title: '🚌 Bus Attendance Notifications Enabled',
        body: 'You will now receive real-time alerts when attendance sessions start for your bus.',
        url: '/',
        tag: 'welcome-notification',
      });
    } else {
      setPermission(getNotificationPermission());
    }
  };

  return (
    <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-sm border border-emerald-700/60 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
          <BellRing className="w-4 h-4 animate-bounce" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white">Enable PWA Attendance Alerts</h4>
          <p className="text-[11px] text-slate-300">
            Get instant device push notifications when attendance starts for your bus.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleEnableNotifications}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Enable</span>
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
