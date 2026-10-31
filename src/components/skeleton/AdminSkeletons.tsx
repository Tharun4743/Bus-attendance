import React from 'react';
import {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonAvatar,
  SkeletonButton,
} from './SkeletonPrimitives';

/**
 * ⚡ ADMIN SKELETON LOADERS
 * Exact structural visual replacements for all Admin role views.
 */

// ============================================================================
// 1. AdminDashboardSkeleton
// ============================================================================
export const AdminDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-6 w-full mx-auto pb-8 animate-in fade-in duration-150">
      {/* 1. Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
          <Skeleton className="h-7 w-64 sm:w-80 rounded-lg" />
          <Skeleton className="h-4 w-48 sm:w-60 rounded-md" />
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <SkeletonButton className="w-24 h-9" />
          <SkeletonButton className="w-32 h-9" />
        </div>
      </div>

      {/* 2. 4 Stat Cards Grid */}
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

      {/* 3. Session Controls Card */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-3 w-64 rounded-md" />
          </div>
          <SkeletonButton className="w-36 h-10" />
        </div>
      </div>

      {/* 4. Bus-Wise Fleet Attendance Table */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-200 dark:border-[#26262e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-9 w-full sm:w-56 rounded-xl" />
        </div>
        <div className="p-4">
          <SkeletonTable rows={5} columns={5} />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. AdminStudentsSkeleton
// ============================================================================
export const AdminStudentsSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 w-full mx-auto pb-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e]">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-7 w-56 sm:w-64 rounded-lg" />
          <Skeleton className="h-3.5 w-64 sm:w-80 rounded" />
        </div>
        <SkeletonButton className="w-32 h-10" />
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-[#141418] p-4 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-full sm:w-48 rounded-xl" />
        <Skeleton className="h-10 w-full sm:w-40 rounded-xl" />
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden p-4">
        <SkeletonTable rows={6} columns={5} />
      </div>
    </div>
  );
};

// ============================================================================
// 3. AdminBusesSkeleton
// ============================================================================
export const AdminBusesSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 w-full mx-auto pb-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e]">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-7 w-48 sm:w-60 rounded-lg" />
          <Skeleton className="h-3.5 w-64 rounded" />
        </div>
        <SkeletonButton className="w-28 h-10" />
      </div>

      {/* Buses Fleet Grid / Table */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden p-4">
        <SkeletonTable rows={5} columns={5} />
      </div>
    </div>
  );
};

// ============================================================================
// 4. AdminInchargesSkeleton
// ============================================================================
export const AdminInchargesSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 w-full mx-auto pb-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e]">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36 rounded-full" />
          <Skeleton className="h-7 w-56 sm:w-72 rounded-lg" />
          <Skeleton className="h-3.5 w-64 sm:w-80 rounded" />
        </div>
        <SkeletonButton className="w-36 h-10" />
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      {/* Incharges Table */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden p-4">
        <SkeletonTable rows={5} columns={5} />
      </div>
    </div>
  );
};

// ============================================================================
// 5. AdminReportsSkeleton
// ============================================================================
export const AdminReportsSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-5 w-full mx-auto pb-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#141418] p-3.5 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52 sm:w-64 rounded-lg" />
          <Skeleton className="h-4 w-64 sm:w-80 rounded-md" />
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

      {/* Filter Bar */}
      <div className="p-3.5 sm:p-4 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-36 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-full sm:w-48 sm:ml-auto rounded-xl" />
      </div>

      {/* Reports Table */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] overflow-hidden shadow-xs p-4">
        <SkeletonTable rows={6} columns={5} />
      </div>
    </div>
  );
};

// ============================================================================
// 6. GeofenceSettingsSkeleton
// ============================================================================
export const GeofenceSettingsSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 w-full mx-auto pb-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e]">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36 rounded-full" />
          <Skeleton className="h-7 w-52 sm:w-64 rounded-lg" />
          <Skeleton className="h-3.5 w-64 sm:w-80 rounded" />
        </div>
        <SkeletonButton className="w-24 h-9" />
      </div>

      {/* Form Fields Card */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] p-5 sm:p-6 shadow-xs space-y-4">
        <Skeleton className="h-5 w-44 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-10 w-full max-w-xs rounded-xl" />
        </div>
        <SkeletonButton className="w-32 h-10 mt-2" />
      </div>
    </div>
  );
};

// ============================================================================
// 7. AdminProfileSkeleton
// ============================================================================
export const AdminProfileSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
        <Skeleton className="h-7 w-64 rounded-lg" />
        <Skeleton className="h-4 w-80 rounded-md" />
      </div>

      {/* Details Card */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-[#26262e] pb-4">
          <SkeletonAvatar size="lg" shape="squircle" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-44 rounded-lg" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 bg-zinc-50 dark:bg-[#181820] rounded-xl space-y-1">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-5 w-36 rounded-md" />
          </div>
          <div className="p-3.5 bg-zinc-50 dark:bg-[#181820] rounded-xl space-y-1">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-5 w-48 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 8. StudentApprovalsSkeleton
// ============================================================================
export const StudentApprovalsSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 w-full mx-auto pb-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e]">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36 rounded-full" />
          <Skeleton className="h-7 w-60 rounded-lg" />
          <Skeleton className="h-3.5 w-72 rounded" />
        </div>
        <SkeletonButton className="w-24 h-9" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      {/* Approvals Table */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden p-4">
        <SkeletonTable rows={5} columns={5} />
      </div>
    </div>
  );
};

// ============================================================================
// 9. AdminMoreSkeleton
// ============================================================================
export const AdminMoreSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-2">
        <Skeleton className="h-6 w-36 rounded-lg" />
        <Skeleton className="h-3.5 w-64 rounded-md" />
      </div>

      {/* Operations section */}
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-28 rounded-md" />
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3.5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e]">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-48 rounded-md" />
                </div>
              </div>
              <Skeleton className="w-4 h-4 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Reports section */}
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-36 rounded-md" />
        <div className="space-y-2.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3.5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e]">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-3 w-44 rounded-md" />
                </div>
              </div>
              <Skeleton className="w-4 h-4 rounded-md" />
            </div>
          ))}
        </div>
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