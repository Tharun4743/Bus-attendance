import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useMediaQuery';
import {
  LayoutDashboard,
  Users,
  Bus,
  UserCheck,
  FileSpreadsheet,
  MapPin,
} from 'lucide-react';
import { api } from '../../services/api';

import { getActiveNavPath, NavItemDef } from '../../utils/navigation';

interface SidebarNavItem extends NavItemDef {
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | null;
}

export const AdminSidebar: React.FC = () => {
  const isMobile = useIsMobile(768);
  if (isMobile) return null;

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
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Core administrative modules
  const navItems: SidebarNavItem[] = [
    {
      to: '/admin/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      exact: true,
      aliases: ['/admin', '/admin/dashboard'],
    },
    {
      to: '/admin/students',
      label: 'Students',
      icon: Users,
      aliases: ['/admin/approvals'],
    },
    {
      to: '/admin/buses',
      label: 'Buses',
      icon: Bus,
    },
    {
      to: '/admin/incharges',
      label: 'In-Charges',
      icon: UserCheck,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      to: '/admin/reports',
      label: 'Attendance Reports',
      icon: FileSpreadsheet,
      aliases: ['/admin/attendance', '/admin/attendance/history', '/admin/attendance-history'],
    },
    {
      to: '/admin/settings',
      label: 'Settings',
      icon: MapPin,
      aliases: ['/admin/ground-settings', '/admin/settings/geofence'],
    },
  ];

  const activePath = getActiveNavPath(location.pathname, navItems, '/admin/dashboard');

  const renderNavContent = () => (
    <div className="flex flex-col h-full space-y-4">
      {/* Portal Identification Header */}
      <div className="px-3 py-2.5 bg-zinc-100/90 dark:bg-[#141418] rounded-xl border border-zinc-200/90 dark:border-[#26262e] flex items-center justify-between">
        <div id="app-logo-slot" className="logo-container empty:hidden" aria-label="Company Logo Slot"></div>
        <p className="text-[10px] font-black tracking-wider text-purple-600 dark:text-purple-400 uppercase">
          ADMIN CONSOLE
        </p>
        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Transport Systems</p>
      </div>

      {/* Navigation Items: Core administrative modules */}
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
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shrink-0">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
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
