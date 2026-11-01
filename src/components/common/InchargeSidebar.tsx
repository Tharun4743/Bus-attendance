import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bus,
  Users,
  PlayCircle,
  History,
  FileSpreadsheet,
  User,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getActiveNavPath, NavItemDef } from '../../utils/navigation';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface SidebarNavItem extends NavItemDef {
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | null;
}

export const InchargeSidebar: React.FC = () => {
  const isMobile = useIsMobile(768);
  if (isMobile) return null;

  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems: SidebarNavItem[] = [
    {
      to: '/incharge/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      exact: true,
      aliases: ['/incharge', '/incharge/dashboard'],
    },
    {
      to: '/incharge/bus',
      label: 'My Bus',
      icon: Bus,
      aliases: ['/incharge/my-bus'],
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
      aliases: ['/incharge/start-attendance', '/incharge/live-attendance'],
    },
    {
      to: '/incharge/history',
      label: 'Attendance History',
      icon: History,
    },
    {
      to: '/incharge/reports',
      label: 'Reports',
      icon: FileSpreadsheet,
    },
    {
      to: '/incharge/profile',
      label: 'Profile',
      icon: User,
    },
  ];

  const activePath = getActiveNavPath(location.pathname, navItems, '/incharge/dashboard');

  const renderNavContent = () => (
    <div className="flex flex-col h-full space-y-4">
      {/* Portal Identification Header */}
      <div className="px-3 py-2.5 bg-zinc-100/90 dark:bg-[#141418] rounded-xl border border-zinc-200/90 dark:border-[#26262e] flex items-center gap-2">
        <div id="app-logo-slot" className="logo-container shrink-0" aria-label="Company Logo Slot">
          <img src="/icon.svg" alt="VSB Logo" className="w-5 h-5 rounded-md object-contain shrink-0" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black tracking-wider text-blue-600 dark:text-sky-400 uppercase truncate">
            BUS OPERATOR PORTAL
          </p>
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">VSB Bus Attendance</p>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.to === activePath;

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                active
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#1e1e24]'
              }`}
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
            </Link>
          );
        })}

        {/* Logout Item */}
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
    <aside
      data-desktop-sidebar="true"
      className="hidden md:flex flex-col w-64 bg-white dark:bg-[#0c0c0e] border-r border-zinc-200 dark:border-[#26262e] p-4 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-hidden"
    >
      {renderNavContent()}
    </aside>
  );
};
