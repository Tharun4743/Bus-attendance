import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  Bus,
  FileSpreadsheet,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/admin/dashboard', label: 'All-in-One Dashboard', icon: LayoutDashboard },
    { to: '/admin/approvals', label: 'Student Approvals', icon: UserCheck },
    { to: '/admin/buses', label: 'Buses', icon: Bus },
    { to: '/admin/reports', label: 'Attendance Reports', icon: FileSpreadsheet },
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
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-[0.98] ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#202028]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
