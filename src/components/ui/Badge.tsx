import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'blue' | 'rose' | 'indigo' | 'zinc';
  className?: string;
}

export const Badge = ({
  children,
  variant = 'emerald',
  className
}: BadgeProps) => {
  const badgeStyles = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-[#4ade80] dark:border-emerald-500/40',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-[#fde047] dark:border-amber-500/40',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-sky-500/15 dark:text-[#38bdf8] dark:border-sky-500/35',
    rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-[#fb7185] dark:border-rose-500/40',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-purple-500/15 dark:text-[#c084fc] dark:border-purple-500/40',
    zinc: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  };

  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs', badgeStyles[variant], className)}>
      {children}
    </span>
  );
};
