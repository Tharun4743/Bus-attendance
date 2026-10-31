import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bus,
  Users,
  PlayCircle,
  History,
  User,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarNavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  matchPrefixes?: string[];
  badge?: number | null;
}

export const InchargeSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Close drawer on navigation
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Synchronize with Navbar mobile menu trigger
  useEffect(() => {
    const onToggle = () => setIsMobileOpen((prev) => !prev);
    window.addEventListener('toggle-mobile-sidebar', onToggle);
    return () => window.removeEventListener('toggle-mobile-sidebar', onToggle);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems: SidebarNavItem[] = [
    {
      to: '/incharge',
      label: 'Dashboard',
      icon: LayoutDashboard,
      exact: true,
      matchPrefixes: ['/incharge', '/incharge/dashboard'],
    },
    {
      to: '/incharge/bus',
      label: 'My Bus',
      icon: Bus,
      matchPrefixes: ['/incharge/bus', '/incharge/my-bus'],
    },
    {
      to: '/incharge/students',
      label: 'Students',
      icon: Users,
    },
    {
      to: '/incharge/attendance',
      label: 'Attendance',
      icon: PlayCircle,
      matchPrefixes: ['/incharge/attendance', '/incharge/start-attendance', '/incharge/live-attendance'],
    },
    {
      to: '/incharge/history',
      label: 'Attendance History',
      icon: History,
    },
    {
      to: '/incharge/profile',
      label: 'Profile',
      icon: User,
    },
  ];

  const renderNavContent = () => (
    <div className="flex flex-col h-full space-y-4">
      {/* Portal Identification Header */}
      <div className="px-3 py-2.5 bg-zinc-100/90 dark:bg-[#141418] rounded-xl border border-zinc-200/90 dark:border-[#26262e]">
        <p className="text-[10px] font-black tracking-wider text-blue-600 dark:text-sky-400 uppercase">
          BUS OPERATOR PORTAL
        </p>
        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Daily Attendance Console</p>
      </div>

      {/* Navigation Items (Exactly 7 in order: Dashboard, My Bus, Students, Attendance, Attendance History, Profile, Logout) */}
      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isCustomActive = item.matchPrefixes
            ? item.matchPrefixes.some((prefix: string) => location.pathname === prefix || location.pathname.startsWith(prefix))
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
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shrink-0">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* 7. Logout Item */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="truncate">Logout</span>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#0c0c0e] border-r border-zinc-200 dark:border-[#26262e] p-4 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-hidden">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-in fade-in">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[85vw] bg-white dark:bg-[#0c0c0e] border-r border-zinc-200 dark:border-[#26262e] p-4 h-full shadow-2xl z-10 animate-in slide-in-from-left">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-[#26262e]">
              <span className="text-xs font-black tracking-wider text-blue-600 dark:text-sky-400 uppercase">
                BUS OPERATOR PORTAL
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
