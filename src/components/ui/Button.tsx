import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'emerald' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = ({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) => {
  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-xs border border-transparent',
    secondary: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700',
    ghost: 'hover:bg-zinc-100 dark:hover:bg-[#202028] text-zinc-600 dark:text-zinc-300',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs border border-transparent',
    emerald: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs border border-transparent',
    outline: 'border border-zinc-200 dark:border-[#26262e] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#202028]'
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
    md: 'h-10 px-4 text-xs sm:text-sm rounded-xl gap-2',
    lg: 'h-11 px-5 text-sm sm:text-base rounded-xl gap-2.5'
  };

  return (
    <button
      className={cn(
        'font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600',
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    />
  );
};
