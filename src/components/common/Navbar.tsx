import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, LogOut, Shield, UserCheck, GraduationCap } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

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
          <span className="flex items-center gap-1 text-[11px] font-bold bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full">
            <Shield className="w-3 h-3" /> ADMIN
          </span>
        );
      case 'INCHARGE':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
            <UserCheck className="w-3 h-3" /> BUS INCHARGE
          </span>
        );
      case 'STUDENT':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full">
            <GraduationCap className="w-3 h-3" /> STUDENT
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F0]/95 backdrop-blur-md border-b border-[#EAE2D2]">
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition">
              <Bus className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-slate-900">
                  BUS ATTENDANCE
                </span>
                {getRoleBadge()}
              </div>
              <p className="text-[10px] font-medium text-amber-800/70 tracking-wider uppercase leading-none">
                College Transport Portal
              </p>
            </div>
          </Link>

          {/* Right Navigation & Profile */}
          <div className="flex items-center gap-2.5">
            {role === 'ADMIN' && <NotificationBell />}

            {user && (
              <div className="flex items-center gap-2.5 pl-2.5 border-l border-[#EAE2D2]">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition border border-rose-200/60"
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
