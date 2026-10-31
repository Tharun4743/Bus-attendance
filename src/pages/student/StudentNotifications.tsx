import { StudentNotificationsSkeleton } from '../../components/skeleton/StudentSkeletons';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Notification } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Bell,
  CheckCheck,
  Check,
  Radio,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';
import { formatISTTime } from '../../utils/time';

export const StudentNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err: any) {
      console.error('Failed to load student notifications:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      await fetchNotifications();
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err: any) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleMarkSingleRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      await fetchNotifications();
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err: any) {
      console.error('Failed to mark read:', err);
    }
  };

  const filtered = notifications.filter((n) => (filter === 'UNREAD' ? !n.read : true));

  if (isLoading && notifications.length === 0) {
    return <StudentNotificationsSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-sky-950/40 text-blue-600 dark:text-sky-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                In-App Notifications
              </h1>
              {unreadCount > 0 && (
                <Badge variant="blue" className="text-xs">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Session updates and transit announcements for your assigned bus
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'ALL'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
              : 'bg-zinc-100 dark:bg-[#18181b] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'UNREAD'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-zinc-100 dark:bg-[#18181b] text-zinc-600 dark:text-zinc-400 hover:text-blue-600'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a]">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-sky-400" />
            <p className="text-xs font-medium text-zinc-500">Checking for announcements...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-[#18181b] rounded-2xl border border-dashed border-zinc-200/90 dark:border-[#27272a] p-8 space-y-2">
            <Bell className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              No notifications to display
            </p>
            <p className="text-xs text-zinc-400">
              {filter === 'UNREAD' ? 'You have read all pending notifications.' : 'Your inbox is up to date.'}
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isSessionNotice =
              item.type === 'SESSION_START' ||
              item.title.toLowerCase().includes('started') ||
              item.title.toLowerCase().includes('attendance session open');

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  item.read
                    ? 'bg-white dark:bg-[#18181b] border-zinc-200/80 dark:border-[#27272a]'
                    : 'bg-blue-50/40 dark:bg-[#161c24] border-blue-200 dark:border-sky-900/60 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isSessionNotice
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : 'bg-zinc-100 dark:bg-[#202026] text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {isSessionNotice ? (
                        <Radio className="w-4 h-4 animate-pulse" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {item.title}
                        </h3>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-sky-400" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1">
                        <span>{item.date || 'Today'}</span>
                        {item.createdAt && (
                          <span>&bull; {formatISTTime(item.createdAt)}</span>
                        )}
                        {item.busId && (
                          <span>&bull; Bus {item.busId}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!item.read && (
                      <button
                        onClick={(e) => handleMarkSingleRead(item.id, e)}
                        title="Mark as read"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {isSessionNotice && (
                  <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-[#27272a] flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (!item.read) handleMarkSingleRead(item.id);
                        navigate('/student/verify-attendance');
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold"
                    >
                      <span>Open Verify Attendance</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
