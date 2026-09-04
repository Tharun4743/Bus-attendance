import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Bus,
  CalendarCheck,
  History,
  FileSpreadsheet,
  MapPin,
  Bell,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/approvals', label: 'Student Approvals', icon: UserCheck },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/buses', label: 'Buses', icon: Bus },
    { to: '/admin/attendance', label: "Today's Attendance", icon: CalendarCheck },
    { to: '/admin/attendance/history', label: 'Attendance History', icon: History },
    { to: '/admin/reports', label: 'Final Reports', icon: FileSpreadsheet },
    { to: '/admin/settings/geofence', label: 'Geofence Settings', icon: MapPin },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <aside className="w-full lg:w-56 bg-[#FAF7F0] border-r border-[#EAE2D2] lg:min-h-[calc(100vh-3.5rem)] p-2.5 shrink-0">
      <div className="mb-2.5 px-3 py-1.5 bg-white/70 rounded-lg border border-[#EAE2D2]/80">
        <p className="text-[10px] font-black tracking-wider text-amber-900/60 uppercase">
          ADMIN PORTAL
        </p>
        <p className="text-[11px] font-bold text-slate-800">Transport Operations</p>
      </div>

      <nav className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible pb-1.5 lg:pb-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin/dashboard' || item.to === '/admin/attendance'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
