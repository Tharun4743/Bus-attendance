import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { InchargeSidebar } from '../components/common/InchargeSidebar';

export const InchargeLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0b0e] text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row w-full min-w-0">
        <InchargeSidebar />
        <main className="flex-1 p-2.5 sm:p-5 lg:p-6 min-w-0 w-full max-w-full overflow-x-hidden">
          <div className="max-w-6xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
