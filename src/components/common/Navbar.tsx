import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, LogOut, Shield, UserCheck, GraduationCap } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from '../ui/ThemeToggle';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = () => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:text-[#c084fc] dark:border-purple-500/40 px-2.5 py-0.5 rounded-full shadow-2xs">
            <Shield className="w-3 h-3 text-purple-600 dark:text-[#c084fc]" /> Admin
          </span>
        );
      case 'INCHARGE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 dark:bg-sky-500/15 dark:text-[#38bdf8] dark:border-sky-500/35 px-2.5 py-0.5 rounded-full shadow-2xs">
            <UserCheck className="w-3 h-3 text-blue-600 dark:text-[#38bdf8]" /> Incharge
          </span>
        );
      case 'STUDENT':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-[#4ade80] dark:border-emerald-500/40 px-2.5 py-0.5 rounded-full shadow-2xs">
            <GraduationCap className="w-3 h-3 text-emerald-600 dark:text-[#4ade80]" /> Student
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#141418]/90 backdrop-blur-md border-b border-zinc-200/90 dark:border-[#26262e] transition-colors duration-200">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand Logo */}
          <Link
            to={
              role === 'ADMIN'
                ? '/admin/dashboard'
                : role === 'INCHARGE'
                ? '/incharge/dashboard'
                : '/student/dashboard'
            }
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              <Bus className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black tracking-tight text-zinc-900 dark:text-white">
                Bus Attendance
              </span>
              {getRoleBadge()}
            </div>
          </Link>

          {/* Right Navigation & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {role === 'ADMIN' && <NotificationBell />}

            <ThemeToggle />

            {user && (
              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-zinc-200 dark:border-[#26262e]">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition border border-rose-200 dark:border-rose-500/30 active:scale-95 cursor-pointer shadow-2xs"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
