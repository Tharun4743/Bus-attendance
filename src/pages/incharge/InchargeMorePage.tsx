import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  History,
  Sun,
  Sunset,
  Bell,
  User,
  LogOut,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { InchargeMoreSkeleton } from '../../components/skeleton/InchargeSkeletons';

interface MoreItem {
  id: string;
  title: string;
  description: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  action?: () => void;
}

export const InchargeMorePage: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 80);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sections: { title: string; items: MoreItem[] }[] = [
    {
      title: 'Reports & Logs',
      items: [
        {
          id: 'history',
          title: 'Attendance History',
          description: 'View previous sessions and attendance records',
          path: '/incharge/history',
          icon: History,
          iconBg: 'bg-blue-50 dark:bg-blue-950/40',
          iconColor: 'text-blue-600 dark:text-blue-400',
        },
        {
          id: 'morning-reports',
          title: 'Morning Reports',
          description: 'Arrival verification summaries for morning sessions',
          path: '/incharge/reports?session=MORNING',
          icon: Sun,
          iconBg: 'bg-amber-50 dark:bg-amber-950/40',
          iconColor: 'text-amber-600 dark:text-amber-400',
        },
        {
          id: 'evening-reports',
          title: 'Evening Reports',
          description: 'Departure verification summaries for evening sessions',
          path: '/incharge/reports?session=EVENING',
          icon: Sunset,
          iconBg: 'bg-purple-50 dark:bg-purple-950/40',
          iconColor: 'text-purple-600 dark:text-purple-400',
        },
      ],
    },
    {
      title: 'Account & System',
      items: [
        {
          id: 'notifications',
          title: 'Notifications',
          description: 'Transit notices & student alerts',
          path: '/incharge/notifications',
          icon: Bell,
          iconBg: 'bg-sky-50 dark:bg-sky-950/40',
          iconColor: 'text-sky-600 dark:text-sky-400',
        },
        {
          id: 'profile',
          title: 'Profile',
          description: 'View in-charge credentials and assigned bus details',
          path: '/incharge/profile',
          icon: User,
          iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
        },
        {
          id: 'logout',
          title: 'Logout',
          description: 'Sign out of your bus management session',
          icon: LogOut,
          iconBg: 'bg-rose-50 dark:bg-rose-950/40',
          iconColor: 'text-rose-600 dark:text-rose-400',
          action: () => setShowLogoutConfirm(true),
        },
      ],
    },
  ];

  if (isLoading) {
    return <InchargeMoreSkeleton />;
  }

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 dark:bg-sky-500/15 dark:text-[#38bdf8] dark:border-sky-500/35 px-2.5 py-0.5 rounded-full shadow-2xs">
              <UserCheck className="w-3 h-3 text-blue-600 dark:text-[#38bdf8]" /> Bus In-charge
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            More Options
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Access previous attendance reports, session audits, and manage your account.
          </p>
        </div>
      </div>

      {/* Sections List */}
      {sections.map((section) => (
        <div key={section.title} className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
            {section.title}
          </h2>
          <div className="space-y-2">
            {section.items.map((item) => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else if (item.path) {
                      navigate(item.path);
                    }
                  }}
                  className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:bg-zinc-50 dark:hover:bg-[#18181f] transition-all text-left group shadow-xs active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`p-2.5 rounded-xl ${item.iconBg} ${item.iconColor} shrink-0 transition-transform group-hover:scale-105`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200 dark:border-[#26262e] p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Confirm Logout</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Are you sure you want to log out of your session?</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-[#26262e] text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
