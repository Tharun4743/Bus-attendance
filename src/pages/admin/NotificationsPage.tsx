import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Notification } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
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
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              System Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-800">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Automated alerts, daily attendance summaries, and departure reports.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EAE2D2] hover:bg-[#FAF7F0] text-slate-700 font-semibold rounded-xl text-xs transition shadow-sm self-start sm:self-auto"
          >
            <CheckCheck className="w-3.5 h-3.5 text-brand-600" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE2D2] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-7 h-7 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="You have no notifications at this time. Daily departure reports will appear here automatically."
            />
          </div>
        ) : (
          <div className="divide-y divide-[#EAE2D2]/40">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  !notif.read ? 'bg-brand-50/40 hover:bg-brand-50/70' : 'hover:bg-[#FAF7F0]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-brand-100 text-brand-700 shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                      {!notif.read && (
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-brand-600 text-white rounded-full">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      {new Date(notif.createdAt).toLocaleString('en-US', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}{' '}
                      IST
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold text-brand-600 sm:self-center shrink-0">
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
