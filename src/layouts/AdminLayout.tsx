import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
