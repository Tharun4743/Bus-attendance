import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Notification } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Bell, CheckCheck, FileSpreadsheet, ArrowRight } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    try {
      await api.markNotificationRead(notif.id);
      if (notif.link) {
        navigate(notif.link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl space-y-4 mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="blue">
              ALERTS & LOGS
            </Badge>
            {unreadCount > 0 && (
              <Badge variant="rose">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            System Notifications
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Automated alerts, daily attendance summaries, and departure reports.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllRead}
            variant="secondary"
            size="sm"
            className="self-start sm:self-auto"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-[#4ade80]" />
            <span>Mark All Read</span>
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden transition-all">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-2">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 sm:p-8">
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="You have no notifications at this time. Daily departure reports will appear here automatically."
            />
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-[#26262e]">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  !notif.read
                    ? 'bg-zinc-50 dark:bg-[#1a1a20] hover:bg-zinc-100 dark:hover:bg-[#202028]'
                    : 'hover:bg-zinc-50/70 dark:hover:bg-[#141418]/80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-[#202028] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-[#26262e] shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-[#4ade80]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">{notif.title}</h4>
                      {!notif.read && (
                        <span className="px-1.5 py-0.5 text-[9px] font-black bg-emerald-600 text-white rounded-full">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono mt-1.5">
                      {new Date(notif.createdAt).toLocaleString('en-US', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}{' '}
                      IST
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-sky-400 sm:self-center shrink-0">
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
