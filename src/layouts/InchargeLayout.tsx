import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';

export const InchargeLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5 lg:p-6">
        <Outlet />
      </main>
    </div>
  );
};
