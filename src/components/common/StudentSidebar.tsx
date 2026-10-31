import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Bus,
  CheckCircle2,
  History,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface SidebarNavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  matchPrefixes?: string[];
  badge?: number | null;
}

interface SidebarSection {
  title: string;
  items: SidebarNavItem[];
}

export const StudentSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await api.getNotifications();
        if (isMounted) {
          setUnreadNotifs(res.unreadCount || 0);
        }
      } catch {
        // Silently ignore notification fetch errors
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close drawer on navigation
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sections: SidebarSection[] = [
    {
      title: 'MAIN',
      items: [
        {
          to: '/student/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          exact: true,
        },
      ],
    },
    {
      title: 'MY ACCOUNT',
      items: [
        {
          to: '/student/profile',
          label: 'My Profile',
          icon: User,
        },
        {
          to: '/student/my-bus',
          label: 'My Bus',
          icon: Bus,
        },
      ],
    },
    {
      title: 'ATTENDANCE',
      items: [
        {
          to: '/student/verify-attendance',
          label: 'Verify Attendance',
          icon: CheckCircle2,
        },
        {
          to: '/student/attendance-history',
          label: 'My Attendance History',
          icon: History,
        },
      ],
    },
    {
      title: 'COMMUNICATION',
      items: [
        {
          to: '/student/notifications',
          label: 'Notifications',
          icon: Bell,
          badge: unreadNotifs > 0 ? unreadNotifs : null,
        },
      ],
    },
  ];

  const renderNavContent = () => (
    <div className="flex flex-col h-full space-y-4">
      {/* Portal Identification Header */}
      <div className="px-3 py-2.5 bg-zinc-100/90 dark:bg-[#141418] rounded-xl border border-zinc-200/90 dark:border-[#26262e]">
        <p className="text-[10px] font-black tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
          COMMUTER PORTAL
        </p>
        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Student Attendance Hub</p>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {sections.map((sec) => (
          <div key={sec.title} className="space-y-1">
            <p className="px-3 text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {sec.title}
            </p>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isCustomActive = item.matchPrefixes
                  ? item.matchPrefixes.some((prefix: string) => location.pathname.startsWith(prefix))
                  : item.exact
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    className={({ isActive }) => {
                      const active = isCustomActive || isActive;
                      return `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        active
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#1e1e24]'
                      }`;
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge != null && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Logout Action */}
      <div className="pt-2 border-t border-zinc-200/80 dark:border-[#26262e]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-[#0c0c0e] border-r border-zinc-200 dark:border-[#26262e] p-4 shrink-0 min-h-screen sticky top-0 h-screen">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Trigger */}
      <div className="lg:hidden fixed top-3 left-3 z-40">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 rounded-xl bg-white dark:bg-[#141418] border border-zinc-200 dark:border-[#26262e] shadow-md text-zinc-700 dark:text-zinc-200"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[85vw] bg-white dark:bg-[#0c0c0e] border-r border-zinc-200 dark:border-[#26262e] p-4 h-full shadow-2xl z-10 animate-in slide-in-from-left">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-[#26262e]">
              <span className="text-xs font-black tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                COMMUTER PORTAL
              </span>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 mt-3 overflow-y-auto">
              {renderNavContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
