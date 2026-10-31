import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  UserCheck,
  Bus,
} from 'lucide-react';
import { api } from '../../services/api';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchPending = async () => {
      try {
        const [pendingStudents, inchargeRes] = await Promise.all([
          api.getPendingApprovals(),
          api.getPendingIncharges(),
        ]);
        if (isMounted) {
          const total = (pendingStudents?.length || 0) + (inchargeRes?.incharges?.length || 0);
          setPendingCount(total);
        }
      } catch {
        // Silently ignore network errors in sidebar badge
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 45000);
    const onFocus = () => fetchPending();
    window.addEventListener('focus', onFocus);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const navItems = [
    {
      to: '/admin/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      to: '/admin/attendance',
      label: 'Attendance Hub',
      icon: CalendarCheck,
      matchPrefixes: ['/admin/attendance', '/admin/reports'],
    },
    {
      to: '/admin/students',
      label: 'Student Directory',
      icon: Users,
    },
    {
      to: '/admin/approvals',
      label: 'Approvals',
      icon: UserCheck,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      to: '/admin/buses',
      label: 'Bus Fleet',
      icon: Bus,
    },
  ];

  return (
    <aside className="w-full lg:w-60 bg-white/70 dark:bg-[#101014]/80 backdrop-blur-md border-b lg:border-b-0 lg:border-r border-zinc-200/90 dark:border-[#26262e] lg:min-h-[calc(100vh-3.5rem)] p-3 shrink-0 transition-colors duration-200">
      <div className="mb-3 px-3 py-2 bg-zinc-100/80 dark:bg-[#141418] rounded-xl border border-zinc-200/80 dark:border-[#26262e]">
        <p className="text-[10px] font-black tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
          ADMIN PORTAL
        </p>
        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Transport Operations</p>
      </div>

      <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1.5 lg:pb-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isCustomActive = item.matchPrefixes
            ? item.matchPrefixes.some((prefix) => location.pathname.startsWith(prefix))
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
                return `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-[0.98] ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#202028]'
                }`;
              }}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>

              {item.badge != null && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${
                    isCustomActive
                      ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                      : 'bg-rose-600 text-white shadow-2xs'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
