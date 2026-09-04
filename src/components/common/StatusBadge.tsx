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
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  }[size];

  switch (status) {
    // Attendance Statuses
    case 'PRESENT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          Attendance Present
        </span>
      );

    case 'NOT_PRESENT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}
        >
          {showIcon && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
          Not Present
        </span>
      );

    case 'LOCATION_UNAVAILABLE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}
        >
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
          Location Could Not Be Verified
        </span>
      );

    case 'INVALID_LOCATION':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 ${sizeClasses}`}
        >
          {showIcon && <MapPinOff className="w-3.5 h-3.5 text-red-600" />}
          Outside Attendance Boundary
        </span>
      );

    // Session Statuses
    case 'ACTIVE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold ${sizeClasses}`}
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
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}
        >
          {showIcon && <Clock className="w-3.5 h-3.5 text-slate-500" />}
          UPCOMING
        </span>
      );

    case 'CLOSED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-300 ${sizeClasses}`}
        >
          {showIcon && <Lock className="w-3.5 h-3.5 text-zinc-500" />}
          CLOSED
        </span>
      );

    case 'FINALIZED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 ${sizeClasses}`}
        >
          {showIcon && <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />}
          FINALIZED
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}
        >
          {status}
        </span>
      );
  }
};
