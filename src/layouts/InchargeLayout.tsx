import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';

export const InchargeLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0b0e] text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5 lg:p-6">
        <Outlet />
      </main>
    </div>
  );
};
