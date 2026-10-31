import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLayout } from './layouts/AdminLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { InchargeLayout } from './layouts/InchargeLayout';
import { Role } from './types';

// Lazy-loaded pages for high-speed initial load & bandwidth reduction
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = React.lazy(() => import('./pages/auth/SignupPage').then(m => ({ default: m.SignupPage })));
const ForgotPasswordPage = React.lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = React.lazy(() => import('./pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const SetupPage = React.lazy(() => import('./pages/auth/SetupPage').then(m => ({ default: m.SetupPage })));

// Admin Pages
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const StudentsManagement = React.lazy(() => import('./pages/admin/StudentsManagement').then(m => ({ default: m.StudentsManagement })));
const StudentApprovals = React.lazy(() => import('./pages/admin/StudentApprovals').then(m => ({ default: m.StudentApprovals })));
const BusesManagement = React.lazy(() => import('./pages/admin/BusesManagement').then(m => ({ default: m.BusesManagement })));
const InchargesManagement = React.lazy(() => import('./pages/admin/InchargesManagement').then(m => ({ default: m.InchargesManagement })));
const BusAssignments = React.lazy(() => import('./pages/admin/BusAssignments').then(m => ({ default: m.BusAssignments })));
const LiveMonitoring = React.lazy(() => import('./pages/admin/LiveMonitoring').then(m => ({ default: m.LiveMonitoring })));
const TodayAttendance = React.lazy(() => import('./pages/admin/TodayAttendance').then(m => ({ default: m.TodayAttendance })));
const AttendanceHistory = React.lazy(() => import('./pages/admin/AttendanceHistory').then(m => ({ default: m.AttendanceHistory })));
const AttendanceHub = React.lazy(() => import('./pages/admin/AttendanceHub').then(m => ({ default: m.AttendanceHub })));
const ReportsPage = React.lazy(() => import('./pages/admin/ReportsPage').then(m => ({ default: m.ReportsPage })));
const NotificationsPage = React.lazy(() => import('./pages/admin/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const GeofenceSettings = React.lazy(() => import('./pages/admin/GeofenceSettings').then(m => ({ default: m.GeofenceSettings })));
const AdminProfile = React.lazy(() => import('./pages/admin/AdminProfile').then(m => ({ default: m.AdminProfile })));
const AdminMorePage = React.lazy(() => import('./pages/admin/AdminMorePage').then(m => ({ default: m.AdminMorePage })));

// Incharge Pages
const InchargeDashboard = React.lazy(() => import('./pages/incharge/InchargeDashboard').then(m => ({ default: m.InchargeDashboard })));
const InchargeMyBus = React.lazy(() => import('./pages/incharge/InchargeMyBus').then(m => ({ default: m.InchargeMyBus })));
const InchargeStudents = React.lazy(() => import('./pages/incharge/InchargeStudents').then(m => ({ default: m.InchargeStudents })));
const InchargeStartAttendance = React.lazy(() => import('./pages/incharge/InchargeStartAttendance').then(m => ({ default: m.InchargeStartAttendance })));
const InchargeLiveAttendance = React.lazy(() => import('./pages/incharge/InchargeLiveAttendance').then(m => ({ default: m.InchargeLiveAttendance })));
const InchargeHistory = React.lazy(() => import('./pages/incharge/InchargeHistory').then(m => ({ default: m.InchargeHistory })));
const InchargeReports = React.lazy(() => import('./pages/incharge/InchargeReports').then(m => ({ default: m.InchargeReports })));
const InchargeProfile = React.lazy(() => import('./pages/incharge/InchargeProfile').then(m => ({ default: m.InchargeProfile })));
const InchargeMorePage = React.lazy(() => import('./pages/incharge/InchargeMorePage').then(m => ({ default: m.InchargeMorePage })));

// Student Pages
const StudentDashboard = React.lazy(() => import('./pages/student/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const StudentProfile = React.lazy(() => import('./pages/student/StudentProfile').then(m => ({ default: m.StudentProfile })));
const StudentMyBus = React.lazy(() => import('./pages/student/StudentMyBus').then(m => ({ default: m.StudentMyBus })));
const StudentVerifyAttendance = React.lazy(() => import('./pages/student/StudentVerifyAttendance').then(m => ({ default: m.StudentVerifyAttendance })));
const StudentAttendanceHistory = React.lazy(() => import('./pages/student/StudentAttendanceHistory').then(m => ({ default: m.StudentAttendanceHistory })));
const StudentNotifications = React.lazy(() => import('./pages/student/StudentNotifications').then(m => ({ default: m.StudentNotifications })));
const StudentMorePage = React.lazy(() => import('./pages/student/StudentMorePage').then(m => ({ default: m.StudentMorePage })));

// Fast layout-preserving skeleton fallback for lazy module loading
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

// Protected Route Component
const ProtectedRoute: React.FC<{
  allowedRoles: Role[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F0]">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
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
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
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
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
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
              <Route path="incharges" element={<InchargesManagement />} />
              <Route path="assignments" element={<BusAssignments />} />
              <Route path="live-monitoring" element={<LiveMonitoring />} />
              <Route path="attendance" element={<TodayAttendance />} />
              <Route path="attendance/history" element={<AttendanceHistory />} />
              <Route path="attendance-history" element={<AttendanceHistory />} />
              <Route path="settings" element={<GeofenceSettings />} />
              <Route path="ground-settings" element={<GeofenceSettings />} />
              <Route path="settings/geofence" element={<GeofenceSettings />} />
              <Route path="reports" element={<AttendanceHub initialTab="reports" />} />
              <Route path="reports/:date" element={<ReportsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="more" element={<AdminMorePage />} />
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
              <Route path="bus" element={<InchargeMyBus />} />
              <Route path="my-bus" element={<InchargeMyBus />} />
              <Route path="students" element={<InchargeStudents />} />
              <Route path="attendance" element={<InchargeLiveAttendance />} />
              <Route path="start-attendance" element={<InchargeStartAttendance />} />
              <Route path="live-attendance" element={<InchargeLiveAttendance />} />
              <Route path="history" element={<InchargeHistory />} />
              <Route path="reports" element={<InchargeReports />} />
              <Route path="profile" element={<InchargeProfile />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="more" element={<InchargeMorePage />} />
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
              <Route path="profile" element={<StudentProfile />} />
              <Route path="bus" element={<StudentMyBus />} />
              <Route path="my-bus" element={<StudentMyBus />} />
              <Route path="verify" element={<StudentVerifyAttendance />} />
              <Route path="verify-attendance" element={<StudentVerifyAttendance />} />
              <Route path="history" element={<StudentAttendanceHistory />} />
              <Route path="attendance-history" element={<StudentAttendanceHistory />} />
              <Route path="notifications" element={<StudentNotifications />} />
              <Route path="more" element={<StudentMorePage />} />
            </Route>

            {/* Root Fallback */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};
