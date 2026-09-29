import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] rounded-2xl p-5 sm:p-6 shadow-xs text-zinc-900 dark:text-zinc-100 transition-all', className)} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center justify-between pb-4 mb-4 border-b border-zinc-100 dark:border-[#26262e]', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-xs text-zinc-500 dark:text-zinc-400', className)} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);
