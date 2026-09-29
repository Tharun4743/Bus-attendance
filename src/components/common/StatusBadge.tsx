import React from 'react';
import { AttendanceStatus, SessionStatus } from '../../types';
import { CheckCircle2, XCircle, AlertTriangle, MapPinOff, Clock, CheckCheck, Lock } from 'lucide-react';

interface StatusBadgeProps {
  status: AttendanceStatus | SessionStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] font-bold',
    md: 'px-2.5 py-0.5 text-[11px] font-bold',
    lg: 'px-3 py-1 text-xs font-bold',
  }[size];

  switch (status) {
    // Attendance Statuses
    case 'PRESENT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-[#4ade80] dark:border-emerald-500/40 ${sizeClasses}`}
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#4ade80]" />}
          Attendance Present
        </span>
      );

    case 'NOT_PRESENT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-[#fb7185] dark:border-rose-500/40 ${sizeClasses}`}
        >
          {showIcon && <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-[#fb7185]" />}
          Not Present
        </span>
      );

    case 'LOCATION_UNAVAILABLE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-[#fde047] dark:border-amber-500/40 ${sizeClasses}`}
        >
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-[#fde047]" />}
          Location Unavailable
        </span>
      );

    case 'INVALID_LOCATION':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-[#fb7185] dark:border-rose-500/40 ${sizeClasses}`}
        >
          {showIcon && <MapPinOff className="w-3.5 h-3.5 text-rose-600 dark:text-[#fb7185]" />}
          Outside Boundary
        </span>
      );

    // Session Statuses
    case 'ACTIVE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/15 dark:text-[#4ade80] dark:border-emerald-500/40 font-bold ${sizeClasses}`}
        >
          {showIcon && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
          SESSION ACTIVE
        </span>
      );

    case 'UPCOMING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-sky-500/15 dark:text-[#38bdf8] dark:border-sky-500/35 ${sizeClasses}`}
        >
          {showIcon && <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-[#38bdf8]" />}
          UPCOMING
        </span>
      );

    case 'CLOSED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 ${sizeClasses}`}
        >
          {showIcon && <Lock className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />}
          CLOSED
        </span>
      );

    case 'FINALIZED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-purple-500/15 dark:text-[#c084fc] dark:border-purple-500/40 ${sizeClasses}`}
        >
          {showIcon && <CheckCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-[#c084fc]" />}
          FINALIZED
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 ${sizeClasses}`}
        >
          {status}
        </span>
      );
  }
};
