import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('⚡ Page-Specific Skeleton Loading & Mobile Bottom Navigation Circuit', () => {
  const rootDir = path.resolve(__dirname, '..');

  // --------------------------------------------------------------------------
  // 1. REUSABLE SKELETON PRIMITIVES
  // --------------------------------------------------------------------------
  it('Circuit 1.1: Reusable skeleton primitives implement pulse, shimmer, and flexible layouts', () => {
    const primitivesCode = fs.readFileSync(
      path.join(rootDir, 'src/components/skeleton/SkeletonPrimitives.tsx'),
      'utf-8'
    );

    // Verify all 6 primitives are exported
    expect(primitivesCode).toContain('export const Skeleton:');
    expect(primitivesCode).toContain('export const SkeletonCard:');
    expect(primitivesCode).toContain('export const SkeletonTable:');
    expect(primitivesCode).toContain('export const SkeletonAvatar:');
    expect(primitivesCode).toContain('export const SkeletonText:');
    expect(primitivesCode).toContain('export const SkeletonButton:');

    // Verify shimmer & pulse classes
    expect(primitivesCode).toContain('animate-skeleton-shimmer');
    expect(primitivesCode).toContain('animate-pulse');

    // Verify CSS shimmer animations in index.css
    const cssCode = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
    expect(cssCode).toContain('@keyframes skeleton-shimmer');
    expect(cssCode).toContain('.animate-skeleton-shimmer');
  });

  // --------------------------------------------------------------------------
  // 2. ADMIN ROLE SKELETONS
  // --------------------------------------------------------------------------
  it('Circuit 1.2: Admin skeletons provide exact structural replacements for all admin views', () => {
    const adminSkeletons = fs.readFileSync(
      path.join(rootDir, 'src/components/skeleton/AdminSkeletons.tsx'),
      'utf-8'
    );

    // Verify all 8 admin skeletons exist
    expect(adminSkeletons).toContain('export const AdminDashboardSkeleton');
    expect(adminSkeletons).toContain('export const AdminStudentsSkeleton');
    expect(adminSkeletons).toContain('export const AdminBusesSkeleton');
    expect(adminSkeletons).toContain('export const AdminInchargesSkeleton');
    expect(adminSkeletons).toContain('export const AdminReportsSkeleton');
    expect(adminSkeletons).toContain('export const GeofenceSettingsSkeleton');
    expect(adminSkeletons).toContain('export const AdminProfileSkeleton');
    expect(adminSkeletons).toContain('export const StudentApprovalsSkeleton');

    // Verify Admin pages connect to their respective skeletons
    const dashboardPage = fs.readFileSync(path.join(rootDir, 'src/pages/admin/AdminDashboard.tsx'), 'utf-8');
    expect(dashboardPage).toContain('<AdminDashboardSkeleton />');

    const studentsPage = fs.readFileSync(path.join(rootDir, 'src/pages/admin/StudentsManagement.tsx'), 'utf-8');
    expect(studentsPage).toContain('<AdminStudentsSkeleton />');

    const busesPage = fs.readFileSync(path.join(rootDir, 'src/pages/admin/BusesManagement.tsx'), 'utf-8');
    expect(busesPage).toContain('<AdminBusesSkeleton />');

    const inchargesPage = fs.readFileSync(path.join(rootDir, 'src/pages/admin/InchargesManagement.tsx'), 'utf-8');
    expect(inchargesPage).toContain('<AdminInchargesSkeleton />');

    const reportsHub = fs.readFileSync(path.join(rootDir, 'src/pages/admin/AttendanceHub.tsx'), 'utf-8');
    expect(reportsHub).toContain('<AdminReportsSkeleton />');

    const settingsPage = fs.readFileSync(path.join(rootDir, 'src/pages/admin/GeofenceSettings.tsx'), 'utf-8');
    expect(settingsPage).toContain('<GeofenceSettingsSkeleton />');

    const profilePage = fs.readFileSync(path.join(rootDir, 'src/pages/admin/AdminProfile.tsx'), 'utf-8');
    expect(profilePage).toContain('<AdminProfileSkeleton />');

    const approvalsPage = fs.readFileSync(path.join(rootDir, 'src/pages/admin/StudentApprovals.tsx'), 'utf-8');
    expect(approvalsPage).toContain('<StudentApprovalsSkeleton />');
  });

  // --------------------------------------------------------------------------
  // 3. INCHARGE ROLE SKELETONS
  // --------------------------------------------------------------------------
  it('Circuit 1.3: In-Charge skeletons provide exact structural replacements for in-charge views', () => {
    const inchargeSkeletons = fs.readFileSync(
      path.join(rootDir, 'src/components/skeleton/InchargeSkeletons.tsx'),
      'utf-8'
    );

    // Verify all 7 in-charge skeletons exist
    expect(inchargeSkeletons).toContain('export const InchargeDashboardSkeleton');
    expect(inchargeSkeletons).toContain('export const InchargeMyBusSkeleton');
    expect(inchargeSkeletons).toContain('export const InchargeStudentsSkeleton');
    expect(inchargeSkeletons).toContain('export const InchargeLiveAttendanceSkeleton');
    expect(inchargeSkeletons).toContain('export const InchargeHistorySkeleton');
    expect(inchargeSkeletons).toContain('export const InchargeReportsSkeleton');
    expect(inchargeSkeletons).toContain('export const InchargeProfileSkeleton');

    // Verify In-Charge pages connect to their skeletons
    const dashboardPage = fs.readFileSync(path.join(rootDir, 'src/pages/incharge/InchargeDashboard.tsx'), 'utf-8');
    expect(dashboardPage).toContain('<InchargeDashboardSkeleton />');

    const myBusPage = fs.readFileSync(path.join(rootDir, 'src/pages/incharge/InchargeMyBus.tsx'), 'utf-8');
    expect(myBusPage).toContain('<InchargeMyBusSkeleton />');

    const studentsPage = fs.readFileSync(path.join(rootDir, 'src/pages/incharge/InchargeStudents.tsx'), 'utf-8');
    expect(studentsPage).toContain('<InchargeStudentsSkeleton />');

    const livePage = fs.readFileSync(path.join(rootDir, 'src/pages/incharge/InchargeLiveAttendance.tsx'), 'utf-8');
    expect(livePage).toContain('<InchargeLiveAttendanceSkeleton />');

    const historyPage = fs.readFileSync(path.join(rootDir, 'src/pages/incharge/InchargeHistory.tsx'), 'utf-8');
    expect(historyPage).toContain('<InchargeHistorySkeleton />');

    const reportsPage = fs.readFileSync(path.join(rootDir, 'src/pages/incharge/InchargeReports.tsx'), 'utf-8');
    expect(reportsPage).toContain('<InchargeReportsSkeleton />');

    const profilePage = fs.readFileSync(path.join(rootDir, 'src/pages/incharge/InchargeProfile.tsx'), 'utf-8');
    expect(profilePage).toContain('<InchargeProfileSkeleton />');
  });

  // --------------------------------------------------------------------------
  // 4. STUDENT ROLE SKELETONS
  // --------------------------------------------------------------------------
  it('Circuit 1.4: Student skeletons provide exact structural replacements for commuter views', () => {
    const studentSkeletons = fs.readFileSync(
      path.join(rootDir, 'src/components/skeleton/StudentSkeletons.tsx'),
      'utf-8'
    );

    // Verify all 6 student skeletons exist
    expect(studentSkeletons).toContain('export const StudentDashboardSkeleton');
    expect(studentSkeletons).toContain('export const StudentProfileSkeleton');
    expect(studentSkeletons).toContain('export const StudentMyBusSkeleton');
    expect(studentSkeletons).toContain('export const StudentVerifyAttendanceSkeleton');
    expect(studentSkeletons).toContain('export const StudentAttendanceHistorySkeleton');
    expect(studentSkeletons).toContain('export const StudentNotificationsSkeleton');

    // Verify Student pages connect to their skeletons
    const dashboardPage = fs.readFileSync(path.join(rootDir, 'src/pages/student/StudentDashboard.tsx'), 'utf-8');
    expect(dashboardPage).toContain('<StudentDashboardSkeleton />');

    const profilePage = fs.readFileSync(path.join(rootDir, 'src/pages/student/StudentProfile.tsx'), 'utf-8');
    expect(profilePage).toContain('<StudentProfileSkeleton />');

    const myBusPage = fs.readFileSync(path.join(rootDir, 'src/pages/student/StudentMyBus.tsx'), 'utf-8');
    expect(myBusPage).toContain('<StudentMyBusSkeleton />');

    const verifyPage = fs.readFileSync(path.join(rootDir, 'src/pages/student/StudentVerifyAttendance.tsx'), 'utf-8');
    expect(verifyPage).toContain('<StudentVerifyAttendanceSkeleton />');

    const historyPage = fs.readFileSync(path.join(rootDir, 'src/pages/student/StudentAttendanceHistory.tsx'), 'utf-8');
    expect(historyPage).toContain('<StudentAttendanceHistorySkeleton />');

    const notifsPage = fs.readFileSync(path.join(rootDir, 'src/pages/student/StudentNotifications.tsx'), 'utf-8');
    expect(notifsPage).toContain('<StudentNotificationsSkeleton />');
  });

  // --------------------------------------------------------------------------
  // 5. MOBILE BOTTOM NAVIGATION & "MORE" BOTTOM SHEET
  // --------------------------------------------------------------------------
  it('Circuit 1.5: MobileBottomNav implements 5 role-based bottom items and accessible "More" sheet', () => {
    const bottomNavFile = fs.readFileSync(
      path.join(rootDir, 'src/components/common/MobileBottomNav.tsx'),
      'utf-8'
    );

    // Responsive: only mobile (< 768px: md:hidden)
    expect(bottomNavFile).toContain('md:hidden');
    expect(bottomNavFile).toContain('fixed bottom-0');

    // Touch targets >= 44-48px
    expect(bottomNavFile).toContain('min-h-[48px]');

    // Safe-area insets
    expect(bottomNavFile).toContain('env(safe-area-inset-bottom)');

    // 5-column grid layout
    expect(bottomNavFile).toContain('grid grid-cols-5');

    // Admin 5 Primary Items
    expect(bottomNavFile).toContain("label: 'Home'");
    expect(bottomNavFile).toContain("label: 'Students'");
    expect(bottomNavFile).toContain("label: 'Buses'");
    expect(bottomNavFile).toContain("label: 'Reports'");
    expect(bottomNavFile).toContain('>More</span>');

    // Admin More Sheet Items
    expect(bottomNavFile).toContain("label: 'In-Charges'");
    expect(bottomNavFile).toContain("label: 'Settings'");
    expect(bottomNavFile).toContain("label: 'Profile'");
    expect(bottomNavFile).toContain("Log Out");

    // Incharge Items
    expect(bottomNavFile).toContain("label: 'My Bus'");
    expect(bottomNavFile).toContain("label: 'Attendance'");
    expect(bottomNavFile).toContain("label: 'History'");

    // Student Items
    expect(bottomNavFile).toContain("label: 'Verify'");
    expect(bottomNavFile).toContain("label: 'Notifications'");
  });

  // --------------------------------------------------------------------------
  // 6. LAYOUT PADDING AND SIDEBAR PRESERVATION
  // --------------------------------------------------------------------------
  it('Circuit 1.6: Layouts preserve desktop/tablet sidebar and provide mobile bottom clearance', () => {
    const adminLayout = fs.readFileSync(path.join(rootDir, 'src/layouts/AdminLayout.tsx'), 'utf-8');
    const inchargeLayout = fs.readFileSync(path.join(rootDir, 'src/layouts/InchargeLayout.tsx'), 'utf-8');
    const studentLayout = fs.readFileSync(path.join(rootDir, 'src/layouts/StudentLayout.tsx'), 'utf-8');

    for (const layout of [adminLayout, inchargeLayout, studentLayout]) {
      // Includes MobileBottomNav
      expect(layout).toContain('<MobileBottomNav />');
      // Provides 6rem (96px) bottom clearance on mobile so fixed bottom nav never overlaps
      expect(layout).toContain('pb-24 md:pb-6');
      // Preserves desktop/tablet sidebar layout
      expect(layout).toContain('md:flex-row');
    }
  });
});