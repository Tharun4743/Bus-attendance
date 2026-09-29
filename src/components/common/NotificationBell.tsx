import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Notification } from '../../types';

export const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setUnreadCount(res.unreadCount);
      setNotifications(res.notifications.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = async (notif: Notification) => {
    try {
      await api.markNotificationRead(notif.id);
      fetchNotifications();
      setIsOpen(false);
      if (notif.link) {
        navigate(notif.link);
      } else {
        navigate('/admin/notifications');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#1a1a20] rounded-xl border border-zinc-200/60 dark:border-[#26262e] transition cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-[#141418]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#1a1a20] p-4 shadow-xl border border-zinc-200 dark:border-[#26262e] z-40 transition-all">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#26262e] pb-3 mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-zinc-900 dark:text-white">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-[#4ade80] border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/notifications');
                }}
                className="text-xs text-blue-600 dark:text-sky-400 font-bold hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-[#26262e] max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-6">No notifications</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-2.5 rounded-xl cursor-pointer transition text-left ${
                      !n.read
                        ? 'bg-zinc-50 dark:bg-[#202028] hover:bg-zinc-100 dark:hover:bg-[#26262e]'
                        : 'hover:bg-zinc-50 dark:hover:bg-[#141418]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">{n.title}</p>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5 font-mono">
                      {new Date(n.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
