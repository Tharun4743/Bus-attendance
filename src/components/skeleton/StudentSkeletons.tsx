import React from 'react';
import {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonAvatar,
  SkeletonButton,
} from './SkeletonPrimitives';

/**
 * ⚡ STUDENT SKELETON LOADERS
 * Exact structural visual replacements for all Student commuter views.
 */

// ============================================================================
// 1. StudentDashboardSkeleton
// ============================================================================
export const StudentDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 w-full mx-auto pb-8 animate-in fade-in duration-150">
      {/* 1. Header Executive Console Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-4 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
          <Skeleton className="h-7 w-52 sm:w-64 rounded-lg" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-44 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <SkeletonButton className="w-24 h-9" />
          <SkeletonButton className="w-28 h-9" />
        </div>
      </div>

      {/* 2. Morning & Evening Attendance Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 sm:p-5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded-md" />
                <Skeleton className="h-4 w-40 rounded-md" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 space-y-2">
              <Skeleton className="h-3 w-48 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Primary Attendance Verification Card */}
      <div className="p-4 sm:p-6 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-3 w-64 rounded-md" />
          </div>
          <SkeletonButton className="w-36 h-10" />
        </div>
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-48 rounded-md" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* 4. Assigned Bus & Route Details Card */}
      <div className="p-4 sm:p-5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-3">
        <Skeleton className="h-4 w-40 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 space-y-1">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Recent Notifications Card */}
      <div className="p-4 sm:p-5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 flex items-center gap-3"
            >
              <SkeletonAvatar size="sm" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. StudentProfileSkeleton
// ============================================================================
export const StudentProfileSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8 animate-in fade-in duration-150">
      {/* Header Profile Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-xs">
        <div className="flex items-center gap-4">
          <SkeletonAvatar size="xl" shape="circle" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-44 rounded-lg" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonButton className="w-24 h-9" />
          <SkeletonButton className="w-24 h-9" />
        </div>
      </div>

      {/* Student Details Grid */}
      <div className="p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-xs space-y-4">
        <Skeleton className="h-5 w-48 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 space-y-1.5">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-4 w-36 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Facial Biometrics & Bus Details Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-xs space-y-3">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-3 w-56 rounded-md" />
          <SkeletonButton className="w-32 h-9" />
        </div>
        <div className="p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-xs space-y-3">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-3 w-56 rounded-md" />
          <SkeletonButton className="w-64 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. StudentMyBusSkeleton
// ============================================================================
export const StudentMyBusSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-xs">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
        </div>
        <SkeletonButton className="w-24 h-9" />
      </div>

      {/* Vehicle Details Card */}
      <div className="p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-xs space-y-4">
        <Skeleton className="h-5 w-44 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 space-y-1.5">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-6 w-28 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* In-Charge Details Card */}
      <div className="p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-xs space-y-4">
        <Skeleton className="h-5 w-48 rounded-md" />
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 flex items-center gap-4">
          <SkeletonAvatar size="lg" shape="circle" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. StudentVerifyAttendanceSkeleton
// ============================================================================
export const StudentVerifyAttendanceSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-36 rounded-full" />
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
          <Skeleton className="h-7 w-52 sm:w-64 rounded-lg" />
          <Skeleton className="h-4 w-60 sm:w-80 rounded-md" />
        </div>
        <SkeletonButton className="w-24 h-9" />
      </div>

      {/* Active Session Status Card */}
      <div className="p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 space-y-2">
          <Skeleton className="h-4 w-56 rounded-md" />
          <Skeleton className="h-3 w-40 rounded-md" />
        </div>
      </div>

      {/* Verification Actions Card */}
      <div className="p-5 sm:p-6 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-xs space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-3 w-64 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <SkeletonButton className="w-full h-12" />
          <SkeletonButton className="w-full h-12" />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. StudentAttendanceHistorySkeleton
// ============================================================================
export const StudentAttendanceHistorySkeleton: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-5 w-full mx-auto pb-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#141418] p-3.5 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 sm:w-56 rounded-lg" />
          <Skeleton className="h-4 w-60 sm:w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonButton className="w-24 h-9" />
          <SkeletonButton className="w-28 h-9" />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <SkeletonCard key={idx} className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 sm:h-8 w-16 mb-1.5 rounded-lg" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </SkeletonCard>
        ))}
      </div>

      {/* Filter Controls Card */}
      <div className="p-3.5 sm:p-4 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-36 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      {/* History Records Table */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] overflow-hidden shadow-xs p-4">
        <SkeletonTable rows={6} columns={5} />
      </div>
    </div>
  );
};

// ============================================================================
// 6. StudentNotificationsSkeleton
// ============================================================================
export const StudentNotificationsSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-xs">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-40 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-52 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonButton className="w-28 h-9" />
          <SkeletonButton className="w-24 h-9" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-20 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>

      {/* Notification Items List */}
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-xs flex items-start gap-3.5"
          >
            <Skeleton className="w-9 h-9 rounded-xl shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
              <Skeleton className="h-3 w-full max-w-md rounded-md" />
              <Skeleton className="h-3 w-3/4 max-w-xs rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 7. StudentMoreSkeleton
// ============================================================================
export const StudentMoreSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-2">
        <Skeleton className="h-6 w-36 rounded-lg" />
        <Skeleton className="h-3.5 w-60 rounded-md" />
      </div>

      {/* Account section */}
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-32 rounded-md" />
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3.5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e]">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-3 w-40 rounded-md" />
                </div>
              </div>
              <Skeleton className="w-4 h-4 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};