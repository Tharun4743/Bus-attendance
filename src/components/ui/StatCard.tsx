import React from 'react';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose';
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, icon, color = 'blue', subtitle, className, onClick }: StatCardProps) {
  const colorMap = {
    blue: { bg: 'bg-blue-600', border: 'border-blue-100 dark:border-blue-900/30' },
    emerald: { bg: 'bg-emerald-600', border: 'border-emerald-100 dark:border-emerald-900/30' },
    amber: { bg: 'bg-amber-500', border: 'border-amber-100 dark:border-amber-900/30' },
    indigo: { bg: 'bg-indigo-600', border: 'border-indigo-100 dark:border-indigo-900/30' },
    rose: { bg: 'bg-rose-600', border: 'border-rose-100 dark:border-rose-900/30' },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative overflow-hidden p-4 sm:p-5 border shadow-xs hover:shadow-md transition-all bg-white dark:bg-[#141418] rounded-2xl border-zinc-200 dark:border-[#26262e]",
        scheme.border,
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-zinc-400 dark:text-zinc-500">{subtitle}</p>}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0", scheme.bg)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
