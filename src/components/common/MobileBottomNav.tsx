import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Users,
  Bus,
  FileSpreadsheet,
  MoreHorizontal,
  Radio,
  History,
  CheckCircle2,
  Bell,
  User,
  Settings,
  ShieldCheck,
  LogOut,
  X,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MoreItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

/**
 * ⚡ MobileBottomNav
 * Mobile-first responsive bottom navigation bar (< 768px: md:hidden).
 * Implements 5 role-based primary navigation items with touch targets >= 48px,
 * safe-area bottom inset, and an accessible "More" slide-up sheet.
 */
export const MobileBottomNav: React.FC = () => {
  const { role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMoreOpen, setIsMoreOpen] = useState<boolean>(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close sheet on route change
  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  // Handle ESC key to close sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMoreOpen) {
        setIsMoreOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMoreOpen]);

  // Handle outside click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
      setIsMoreOpen(false);
    }
  };

  if (!role) return null;

  // Role Navigation Definitions
  let primaryItems: NavItem[] = [];
  let moreItems: MoreItem[] = [];

  if (role === 'ADMIN') {
    primaryItems = [
      { label: 'Home', path: '/admin', icon: Home },
      { label: 'Students', path: '/admin/students', icon: Users },
      { label: 'Buses', path: '/admin/buses', icon: Bus },
      { label: 'Reports', path: '/admin/reports', icon: FileSpreadsheet },
    ];
    moreItems = [
      { label: 'In-Charges', path: '/admin/incharges', icon: ShieldCheck, description: 'Manage fleet in-charge personnel' },
      { label: 'Settings', path: '/admin/settings', icon: Settings, description: 'Geofence radius & system configuration' },
      { label: 'Profile', path: '/admin/profile', icon: User, description: 'Administrator credentials & security' },
    ];
  } else if (role === 'INCHARGE') {
    primaryItems = [
      { label: 'Home', path: '/incharge', icon: Home },
      { label: 'My Bus', path: '/incharge/my-bus', icon: Bus },
      { label: 'Attendance', path: '/incharge/attendance', icon: Radio },
      { label: 'History', path: '/incharge/history', icon: History },
    ];
    moreItems = [
      { label: 'Students', path: '/incharge/students', icon: Users, description: 'View assigned student roster' },
      { label: 'Reports', path: '/incharge/reports', icon: FileSpreadsheet, description: 'View finalized attendance summaries' },
      { label: 'Profile', path: '/incharge/profile', icon: User, description: 'Manage incharge personal account' },
    ];
  } else {
    // STUDENT
    primaryItems = [
      { label: 'Home', path: '/student', icon: Home },
      { label: 'My Bus', path: '/student/bus', icon: Bus },
      { label: 'Verify', path: '/student/verify', icon: CheckCircle2 },
      { label: 'History', path: '/student/history', icon: History },
    ];
    moreItems = [
      { label: 'Notifications', path: '/student/notifications', icon: Bell, description: 'Live transit alerts & notices' },
      { label: 'My Profile', path: '/student/profile', icon: User, description: 'Student ID, biometric photo & details' },
    ];
  }

  const isMoreActive = moreItems.some((item) =>
    location.pathname.startsWith(item.path)
  );

  const handleLogout = () => {
    setIsMoreOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. FIXED BOTTOM NAVIGATION BAR                                            */}
      {/* ========================================================================= */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#141418]/95 backdrop-blur-md border-t border-zinc-200/90 dark:border-[#26262e] shadow-lg md:hidden transition-colors"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5 h-16 w-full max-w-lg mx-auto px-1">
          {/* First 4 Primary Items */}
          {primaryItems.map((item) => {
            const Icon = item.icon;
            // Home matches exact path; sub-routes match prefix
            const isActive =
              item.path === '/admin' || item.path === '/incharge' || item.path === '/student'
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'text-blue-600 dark:text-sky-400 font-bold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-sky-950/50 scale-105'
                      : 'bg-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight leading-tight mt-0.5 truncate max-w-full">
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          {/* 5th Item: More Button */}
          <button
            type="button"
            onClick={() => setIsMoreOpen((prev) => !prev)}
            aria-expanded={isMoreOpen}
            aria-label="Open More Navigation Options"
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all duration-150 ${
              isMoreOpen || isMoreActive
                ? 'text-blue-600 dark:text-sky-400 font-bold'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                isMoreOpen || isMoreActive
                  ? 'bg-blue-50 dark:bg-sky-950/50 scale-105'
                  : 'bg-transparent'
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight leading-tight mt-0.5 truncate max-w-full">More</span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. "MORE" BOTTOM SHEET MODAL                                              */}
      {/* ========================================================================= */}
      {isMoreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Additional Navigation Options"
          onClick={handleBackdropClick}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end md:hidden animate-in fade-in duration-200"
        >
          <div
            ref={sheetRef}
            className="bg-white dark:bg-[#141418] rounded-t-3xl border-t border-zinc-200/90 dark:border-[#26262e] shadow-2xl w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
          >
            {/* Sheet Handle & Header */}
            <div className="sticky top-0 bg-white/95 dark:bg-[#141418]/95 backdrop-blur-sm pt-3 pb-3 px-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <div className="pt-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                  More Options
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {role} Portal Navigation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Role Extra Links */}
            <div className="p-3 space-y-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      navigate(item.path);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl min-h-[48px] text-left transition-all ${
                      isActive
                        ? 'bg-blue-50/80 dark:bg-sky-950/40 text-blue-600 dark:text-sky-400 font-bold border border-blue-200/50 dark:border-sky-800/40'
                        : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#1c1c24]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">{item.label}</div>
                        {item.description && (
                          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-normal">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                );
              })}
            </div>

            {/* Visually Separated Log Out Button */}
            <div className="pt-2 px-3 border-t border-zinc-100 dark:border-zinc-800/80 mt-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl min-h-[48px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all font-bold"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm">Log Out</div>
                    <div className="text-[11px] text-rose-400/80 font-normal">
                      End active session securely
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};