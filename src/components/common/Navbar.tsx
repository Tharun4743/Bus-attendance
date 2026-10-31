import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, LogOut, Shield, UserCheck, GraduationCap, Menu, User, ChevronDown } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from '../ui/ThemeToggle';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    setIsAccountOpen(false);
    logout();
    navigate('/login');
  };

  // Close account menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const getProfilePath = () => {
    switch (role) {
      case 'ADMIN':
        return '/admin/profile';
      case 'INCHARGE':
        return '/incharge/profile';
      case 'STUDENT':
        return '/student/profile';
      default:
        return '/login';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#141418]/90 backdrop-blur-md border-b border-zinc-200/90 dark:border-[#26262e] transition-colors duration-200">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {/* Mobile Sidebar Drawer Trigger Button - Hidden when mobile bottom navigation is active */}
            {role && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
                className="hidden p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#1f1f26] border border-zinc-200 dark:border-[#2e2e38] transition active:scale-95 shrink-0"
                aria-label="Open Navigation Menu"
                title="Open Navigation Menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            {/* Brand Logo & Logo Slot */}
            <Link
              to={
                role === 'ADMIN'
                  ? '/admin/dashboard'
                  : role === 'INCHARGE'
                  ? '/incharge/dashboard'
                  : '/student/dashboard'
              }
              className="flex items-center gap-2 sm:gap-2.5 group min-w-0"
            >
              <div id="app-logo-slot" className="logo-container hidden sm:block empty:hidden" aria-label="Company Logo Slot"></div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <Bus className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="text-sm sm:text-base font-black tracking-tight text-zinc-900 dark:text-white truncate">
                  Bus Attendance
                </span>
                {getRoleBadge()}
              </div>
            </Link>
          </div>

          {/* Right Navigation & Unified Account Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user && <NotificationBell />}

            <ThemeToggle />

            {user && (
              <div className="relative pl-1 sm:pl-2" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountOpen((prev) => !prev)}
                  className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-[#1a1a20] transition border border-transparent hover:border-zinc-200 dark:hover:border-[#26262e] cursor-pointer"
                  aria-label="Open account menu"
                  aria-expanded={isAccountOpen}
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-[#c084fc] flex items-center justify-center font-black text-xs border border-purple-200 dark:border-purple-800 shrink-0">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate max-w-[140px]">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight truncate max-w-[140px]">
                      {user.email}
                    </p>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 hidden sm:block transition-transform duration-200 ${isAccountOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Account Dropdown Menu */}
                {isAccountOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1">
                    <div className="px-3.5 py-2.5 border-b border-zinc-100 dark:border-[#26262e]">
                      <p className="text-xs font-black text-zinc-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono truncate">{user.email}</p>
                      <div className="mt-1.5">{getRoleBadge()}</div>
                    </div>

                    <div className="p-1">
                      <Link
                        to={getProfilePath()}
                        onClick={() => setIsAccountOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#1e1e24] rounded-xl transition"
                      >
                        <User className="w-4 h-4 text-zinc-400" />
                        <span>Account Profile</span>
                      </Link>
                    </div>

                    <div className="p-1 border-t border-zinc-100 dark:border-[#26262e]">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
