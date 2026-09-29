import React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border border-zinc-200 dark:border-[#2e2e38] focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-900 dark:focus:border-zinc-500 transition-all text-xs sm:text-sm bg-white dark:bg-[#141418] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border border-zinc-200 dark:border-[#2e2e38] focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-900 dark:focus:border-zinc-500 transition-all text-xs sm:text-sm bg-white dark:bg-[#141418] text-zinc-900 dark:text-white',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';
