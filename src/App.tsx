import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './layouts/AdminLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { InchargeLayout } from './layouts/InchargeLayout';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { StudentsManagement } from './pages/admin/StudentsManagement';
import { StudentApprovals } from './pages/admin/StudentApprovals';
import { BusesManagement } from './pages/admin/BusesManagement';
import { TodayAttendance } from './pages/admin/TodayAttendance';
import { AttendanceHistory } from './pages/admin/AttendanceHistory';
import { GeofenceSettings } from './pages/admin/GeofenceSettings';
import { ReportsPage } from './pages/admin/ReportsPage';
import { NotificationsPage } from './pages/admin/NotificationsPage';

// Public & Setup Pages
import { SignupPage } from './pages/auth/SignupPage';
import { SetupPage } from './pages/auth/SetupPage';

// Student & Incharge Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { InchargeDashboard } from './pages/incharge/InchargeDashboard';
import { Role } from './types';

// Protected Route Component
const ProtectedRoute: React.FC<{
  allowedRoles: Role[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F0]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    if (role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'INCHARGE') return <Navigate to="/incharge/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }

  return <>{children}</>;
};

// Root Redirect Component
const RootRedirect: React.FC = () => {
  const { role, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F0]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (role === 'INCHARGE') return <Navigate to="/incharge/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/setup" element={<SetupPage />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="approvals" element={<StudentApprovals />} />
            <Route path="students" element={<StudentsManagement />} />
            <Route path="buses" element={<BusesManagement />} />
            <Route path="attendance" element={<TodayAttendance />} />
            <Route path="attendance/history" element={<AttendanceHistory />} />
            <Route path="settings/geofence" element={<GeofenceSettings />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/:date" element={<ReportsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          {/* Incharge Routes */}
          <Route
            path="/incharge"
            element={
              <ProtectedRoute allowedRoles={['INCHARGE']}>
                <InchargeLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<InchargeDashboard />} />
          </Route>

          {/* Student Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
          </Route>

          {/* Root Fallback */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
