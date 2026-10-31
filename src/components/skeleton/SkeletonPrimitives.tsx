import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  shimmer?: boolean;
}

/**
 * Base atomic Skeleton primitive with subtle pulse and optional linear shimmer.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  shimmer = true,
  ...props
}) => {
  return (
    <div
      aria-hidden="true"
      className={`bg-zinc-200/80 dark:bg-zinc-800/60 rounded-xl ${
        shimmer ? 'animate-skeleton-shimmer animate-pulse' : 'animate-pulse'
      } ${className}`}
      {...props}
    />
  );
};

/**
 * SkeletonAvatar: Circular or squircle avatar placeholder.
 */
export const SkeletonAvatar: React.FC<{
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'squircle';
  className?: string;
}> = ({ size = 'md', shape = 'squircle', className = '' }) => {
  const sizeClasses = {
    sm: 'w-7 h-7 sm:w-8 sm:h-8',
    md: 'w-9 h-9 sm:w-10 sm:h-10',
    lg: 'w-12 h-12 sm:w-14 sm:h-14',
    xl: 'w-16 h-16 sm:w-20 sm:h-20',
  }[size];

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  return (
    <Skeleton className={`shrink-0 ${sizeClasses} ${shapeClass} ${className}`} />
  );
};

/**
 * SkeletonText: Single or multi-line text placeholder with varied widths.
 */
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
  lineClassName?: string;
}> = ({ lines = 3, className = '', lineClassName = '' }) => {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3'];

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          className={`h-3 rounded ${widths[idx % widths.length]} ${lineClassName}`}
        />
      ))}
    </div>
  );
};

/**
 * SkeletonButton: Standard action button placeholder matching UI button heights.
 */
export const SkeletonButton: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-8 px-3 rounded-lg',
    md: 'h-10 px-4 rounded-xl',
    lg: 'h-12 px-6 rounded-2xl',
  }[size];

  return <Skeleton className={`${sizeClasses} ${className}`} />;
};

/**
 * SkeletonCard: Container surface mimicking high-productivity cards.
 */
export const SkeletonCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] p-4 sm:p-5 shadow-xs ${className}`}
      {...props}
    >
      {children || (
        <div className="space-y-3">
          <Skeleton className="h-4 w-1/3 rounded" />
          <Skeleton className="h-8 w-1/2 rounded-lg" />
          <Skeleton className="h-3 w-2/3 rounded" />
        </div>
      )}
    </div>
  );
};

/**
 * SkeletonTable: Mimics data tables with responsive row & column layout.
 */
export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
  className?: string;
}> = ({ rows = 5, columns = 5, hasHeader = true, className = '' }) => {
  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-[#26262e] bg-white dark:bg-[#141418] shadow-xs ${className}`}
    >
      {hasHeader && (
        <div className="p-4 border-b border-zinc-200 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-32 rounded" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      )}

      <div className="divide-y divide-zinc-100 dark:divide-[#1f1f26]">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={rIdx}
            className="p-3.5 sm:p-4 flex items-center justify-between gap-3 sm:gap-4"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <SkeletonAvatar size="sm" shape="squircle" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-3.5 w-28 sm:w-36 rounded" />
                <Skeleton className="h-2.5 w-20 sm:w-24 rounded" />
              </div>
            </div>

            {columns >= 3 && (
              <div className="hidden sm:block flex-1">
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            )}

            {columns >= 4 && (
              <div className="hidden md:block flex-1">
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            )}

            {columns >= 5 && (
              <div className="hidden lg:block">
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            )}

            <div className="shrink-0 flex items-center gap-2">
              <Skeleton className="h-8 w-16 sm:w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};