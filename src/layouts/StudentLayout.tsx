import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';

export const StudentLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-lg w-full mx-auto p-3 sm:p-5">
        <Outlet />
      </main>
    </div>
  );
};
