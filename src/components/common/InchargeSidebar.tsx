import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bus,
  Users,
  PlayCircle,
  Radio,
  History,
  FileSpreadsheet,
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

interface SidebarSection {
  title: string;
  items: SidebarNavItem[];
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

  const sections: SidebarSection[] = [
    {
      title: 'MAIN',
      items: [
        {
          to: '/incharge/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          exact: true,
        },
      ],
    },
    {
      title: 'BUS MANAGEMENT',
      items: [
        {
          to: '/incharge/my-bus',
          label: 'My Bus',
          icon: Bus,
        },
        {
          to: '/incharge/students',
          label: 'My Students',
          icon: Users,
        },
      ],
    },
    {
      title: 'ATTENDANCE',
      items: [
        {
          to: '/incharge/start-attendance',
          label: 'Start Attendance',
          icon: PlayCircle,
        },
        {
          to: '/incharge/live-attendance',
          label: 'Live Attendance',
          icon: Radio,
        },
        {
          to: '/incharge/history',
          label: 'Attendance History',
          icon: History,
        },
        {
          to: '/incharge/reports',
          label: 'Attendance Reports',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        {
          to: '/incharge/profile',
          label: 'My Profile',
          icon: User,
        },
      ],
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
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shrink-0">
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
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-[#0c0c0e] border-r border-zinc-200 dark:border-[#26262e] p-4 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-hidden">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in">
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
