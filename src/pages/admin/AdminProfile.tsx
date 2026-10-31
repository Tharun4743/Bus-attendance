import { AdminProfileSkeleton } from '../../components/skeleton/AdminSkeletons';
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Shield, Mail, User, Key, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminProfile: React.FC = () => {
  const { user, logout, isLoading } = useAuth();

  if (isLoading || !user) {
    return <AdminProfileSkeleton />;
  }
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e]">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="indigo">ADMINISTRATOR ACCOUNT</Badge>
          <span className="text-xs font-mono font-bold text-zinc-400">ACTIVE SESSION</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
          System Administrator Profile
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
          Root transport administration account with global configuration and reporting authority.
        </p>
      </div>

      {/* Profile Details Card */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-[#26262e] pb-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-[#c084fc] flex items-center justify-center font-black text-xl border border-purple-200 dark:border-purple-800">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
              {user?.name}
            </h2>
            <p className="text-xs text-zinc-500 font-mono">{user?.email}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-[#c084fc] px-2 py-0.5 rounded-full">
              <Shield className="w-3 h-3" /> System Super Administrator
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-zinc-50 dark:bg-[#181820] rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-1">
            <span className="text-zinc-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Full Name
            </span>
            <p className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">{user?.name}</p>
          </div>

          <div className="p-3.5 bg-zinc-50 dark:bg-[#181820] rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-1">
            <span className="text-zinc-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </span>
            <p className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">{user?.email}</p>
          </div>

          <div className="p-3.5 bg-zinc-50 dark:bg-[#181820] rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-1">
            <span className="text-zinc-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Assigned Authority
            </span>
            <p className="font-bold text-purple-700 dark:text-[#c084fc] text-sm">
              Full Administrative RBAC (Read-Only Attendance)
            </p>
          </div>

          <div className="p-3.5 bg-zinc-50 dark:bg-[#181820] rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-1">
            <span className="text-zinc-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> User ID
            </span>
            <p className="font-mono text-zinc-800 dark:text-zinc-200 text-xs truncate">{user?.id}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-100 dark:border-[#26262e] flex items-center justify-between">
          <span className="text-xs text-zinc-400">Security: Authenticated via JWT Session</span>
          <Button onClick={handleLogout} variant="danger" size="sm">
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
