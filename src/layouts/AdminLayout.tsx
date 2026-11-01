import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { AdminSidebar } from '../components/common/AdminSidebar';
import { MobileBottomNav } from '../components/common/MobileBottomNav';
import { useIsMobile } from '../hooks/useMediaQuery';

const PageFallback: React.FC = () => (
  <div className="space-y-4 w-full max-w-7xl mx-auto p-4 animate-pulse">
    <div className="h-28 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] p-6 space-y-2">
      <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
      <div className="h-6 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] p-4 space-y-2">
          <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        </div>
      ))}
    </div>
    <div className="h-64 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e]" />
  </div>
);

export const AdminLayout: React.FC = () => {
  const isMobile = useIsMobile(768);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0b0e] text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200 overflow-x-hidden">
      <Navbar />
      <div className="flex-1 flex flex-col md:flex-row w-full min-w-0">
        {/* Strictly desktop only: NEVER render sidebar DOM element on mobile (< 768px) */}
        {!isMobile && <AdminSidebar />}
        <main className="flex-1 p-2.5 sm:p-5 lg:p-6 pb-24 md:pb-6 min-w-0 w-full max-w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
      {/* Strictly mobile only: ALWAYS render on mobile (< 768px), NEVER render on desktop */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
};