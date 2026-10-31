import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Notification } from '../../types';
import { formatISTTime } from '../../utils/time';
import { subscribeToNotifications } from '../../lib/supabaseRealtime';

export const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setUnreadCount(res.unreadCount);
      setNotifications(res.notifications.slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    const handleUpdate = () => fetchNotifications();
    window.addEventListener('notifications-updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fetchNotifications();
    });

    const unsubRealtime = subscribeToNotifications(() => {
      fetchNotifications();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      unsubRealtime();
    };
  }, []);

  const handleNotificationClick = async (notif: Notification) => {
    try {
      if (!notif.read) {
        await api.markNotificationRead(notif.id);
        window.dispatchEvent(new Event('notifications-updated'));
      }
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

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.markAllNotificationsRead();
      await fetchNotifications();
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Clear all notifications?')) return;
    try {
      await api.clearAllNotifications();
      await fetchNotifications();
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const handleMarkSingleRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      await fetchNotifications();
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleDeleteSingle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      await fetchNotifications();
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error('Failed to delete notification:', err);
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
          <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 rounded-2xl bg-white dark:bg-[#1a1a20] p-4 shadow-xl border border-zinc-200 dark:border-[#26262e] z-40 transition-all">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#26262e] pb-3 mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-zinc-900 dark:text-white">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-[#4ade80] border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    title="Mark all as read"
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-[#4ade80] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-1.5 py-0.5 rounded-md transition cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Read all</span>
                  </button>
                )}

                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    title="Clear all"
                    className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-1.5 py-0.5 rounded-md transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/admin/notifications');
                  }}
                  className="text-xs text-blue-600 dark:text-sky-400 font-bold hover:underline cursor-pointer ml-1"
                >
                  View all
                </button>
              </div>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-[#26262e] max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-7 h-7 mx-auto text-zinc-300 dark:text-zinc-600 mb-2 stroke-[1.5]" />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">No notifications</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-2.5 rounded-xl cursor-pointer transition text-left group ${
                      !n.read
                        ? 'bg-zinc-50 dark:bg-[#202028] hover:bg-zinc-100 dark:hover:bg-[#26262e]'
                        : 'hover:bg-zinc-50 dark:hover:bg-[#141418]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">{n.title}</p>
                          {!n.read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-mono">
                          {formatISTTime(n.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                        {!n.read && (
                          <button
                            onClick={(e) => handleMarkSingleRead(e, n.id)}
                            title="Mark as read"
                            className="p-1 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteSingle(e, n.id)}
                          title="Delete"
                          className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
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
