import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { StudentSidebar } from '../components/common/StudentSidebar';
import { MobileBottomNav } from '../components/common/MobileBottomNav';

export const StudentLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0b0e] text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      <Navbar />
      <div className="flex-1 flex flex-col md:flex-row w-full min-w-0">
        <StudentSidebar />
        <main className="flex-1 p-2.5 sm:p-5 lg:p-6 pb-24 md:pb-6 min-w-0 w-full max-w-full overflow-x-hidden">
          <div className="max-w-5xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
};