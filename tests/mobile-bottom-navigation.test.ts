import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('⚡ Role-Based Mobile Bottom Navigation & More Screen System Circuit', () => {
  const rootDir = path.resolve(__dirname, '..');

  // --------------------------------------------------------------------------
  // 1. REUSABLE ROLE-AWARE MobileBottomNav COMPONENT
  // --------------------------------------------------------------------------
  it('Circuit 1.1: MobileBottomNav implements strictly role-based tabs for ADMIN, INCHARGE, and STUDENT', () => {
    const bottomNavCode = fs.readFileSync(
      path.join(rootDir, 'src/components/common/MobileBottomNav.tsx'),
      'utf-8'
    );

    // Verify component export
    expect(bottomNavCode).toContain('export const MobileBottomNav: React.FC');

    // Verify role checking
    expect(bottomNavCode).toContain("case 'ADMIN':");
    expect(bottomNavCode).toContain("case 'INCHARGE':");
    expect(bottomNavCode).toContain("case 'STUDENT':");

    // Verify Admin tabs
    expect(bottomNavCode).toContain("label: 'Home'");
    expect(bottomNavCode).toContain("path: '/admin/dashboard'");
    expect(bottomNavCode).toContain("label: 'Students'");
    expect(bottomNavCode).toContain("path: '/admin/students'");
    expect(bottomNavCode).toContain("label: 'Buses'");
    expect(bottomNavCode).toContain("path: '/admin/buses'");
    expect(bottomNavCode).toContain("label: 'Monitor'");
    expect(bottomNavCode).toContain("path: '/admin/live-monitoring'");
    expect(bottomNavCode).toContain("label: 'More'");
    expect(bottomNavCode).toContain("path: '/admin/more'");

    // Verify In-charge tabs
    expect(bottomNavCode).toContain("path: '/incharge/dashboard'");
    expect(bottomNavCode).toContain("label: 'My Bus'");
    expect(bottomNavCode).toContain("path: '/incharge/my-bus'");
    expect(bottomNavCode).toContain("label: 'Attendance'");
    expect(bottomNavCode).toContain("path: '/incharge/attendance'");
    expect(bottomNavCode).toContain("path: '/incharge/students'");
    expect(bottomNavCode).toContain("path: '/incharge/more'");

    // Verify Student tabs
    expect(bottomNavCode).toContain("path: '/student/dashboard'");
    expect(bottomNavCode).toContain("path: '/student/my-bus'");
    expect(bottomNavCode).toContain("label: 'Verify'");
    expect(bottomNavCode).toContain("path: '/student/verify'");
    expect(bottomNavCode).toContain("label: 'History'");
    expect(bottomNavCode).toContain("path: '/student/history'");
    expect(bottomNavCode).toContain("label: 'Profile'");
    expect(bottomNavCode).toContain("path: '/student/profile'");
  });

  // --------------------------------------------------------------------------
  // 2. VIEWPORT FIXATION, RESPONSIVENESS & SAFE AREA SUPPORT
  // --------------------------------------------------------------------------
  it('Circuit 1.2: MobileBottomNav is fixed to viewport with Android/iOS safe-area support and hides on desktop', () => {
    const bottomNavCode = fs.readFileSync(
      path.join(rootDir, 'src/components/common/MobileBottomNav.tsx'),
      'utf-8'
    );

    // Fixed to bottom & hidden on desktop
    expect(bottomNavCode).toContain('fixed bottom-0 inset-x-0 z-40 md:hidden');

    // Safe area support
    expect(bottomNavCode).toContain('env(safe-area-inset-bottom)');

    // Green branding active states
    expect(bottomNavCode).toContain('text-emerald-600 dark:text-emerald-400');
    expect(bottomNavCode).toContain('bg-emerald-500 dark:bg-emerald-400');

    // 5 equal columns
    expect(bottomNavCode).toContain('grid grid-cols-5');
  });

  // --------------------------------------------------------------------------
  // 3. SINGLE ACTIVE TAB GUARANTEE (NO MULTIPLE ACTIVE TABS)
  // --------------------------------------------------------------------------
  it('Circuit 1.3: Active tab calculation guarantees strictly at most ONE active tab per route', () => {
    const bottomNavCode = fs.readFileSync(
      path.join(rootDir, 'src/components/common/MobileBottomNav.tsx'),
      'utf-8'
    );

    // Verify active tab computation logic
    expect(bottomNavCode).toContain('const activeTabId = useMemo<string | null>');
    expect(bottomNavCode).toContain('isActive = activeTabId === item.id');
    expect(bottomNavCode).toContain("aria-current={isActive ? 'page' : undefined}");
  });

  // --------------------------------------------------------------------------
  // 4. PRESERVE DESKTOP SIDEBAR & HIDE MOBILE HAMBURGER MENU
  // --------------------------------------------------------------------------
  it('Circuit 1.4: Desktop sidebar remains intact and mobile hamburger trigger is hidden', () => {
    const navbarCode = fs.readFileSync(
      path.join(rootDir, 'src/components/common/Navbar.tsx'),
      'utf-8'
    );

    // Hamburger button is hidden on mobile because bottom nav handles mobile navigation
    expect(navbarCode).toContain('className="hidden p-2 rounded-xl text-zinc-600');

    // Header notification bell is present
    expect(navbarCode).toContain('{user && <NotificationBell />}');

    // Check layouts preserve desktop sidebar
    const adminLayout = fs.readFileSync(
      path.join(rootDir, 'src/layouts/AdminLayout.tsx'),
      'utf-8'
    );
    expect(adminLayout).toContain('<AdminSidebar />');
    expect(adminLayout).toContain('<MobileBottomNav />');
    expect(adminLayout).toContain('pb-24 md:pb-6');

    const inchargeLayout = fs.readFileSync(
      path.join(rootDir, 'src/layouts/InchargeLayout.tsx'),
      'utf-8'
    );
    expect(inchargeLayout).toContain('<InchargeSidebar />');
    expect(inchargeLayout).toContain('<MobileBottomNav />');
    expect(inchargeLayout).toContain('pb-24 md:pb-6');

    const studentLayout = fs.readFileSync(
      path.join(rootDir, 'src/layouts/StudentLayout.tsx'),
      'utf-8'
    );
    expect(studentLayout).toContain('<StudentSidebar />');
    expect(studentLayout).toContain('<MobileBottomNav />');
    expect(studentLayout).toContain('pb-24 md:pb-6');
  });

  // --------------------------------------------------------------------------
  // 5. MORE SCREENS IMPLEMENTATION
  // --------------------------------------------------------------------------
  it('Circuit 1.5: Admin More screen contains all required items and skeleton loading', () => {
    const adminMoreCode = fs.readFileSync(
      path.join(rootDir, 'src/pages/admin/AdminMorePage.tsx'),
      'utf-8'
    );

    // Verify all 8 items
    expect(adminMoreCode).toContain("title: 'In-charge Management'");
    expect(adminMoreCode).toContain("path: '/admin/incharges'");
    expect(adminMoreCode).toContain("title: 'Bus Assignments'");
    expect(adminMoreCode).toContain("path: '/admin/assignments'");
    expect(adminMoreCode).toContain("title: 'Ground Settings'");
    expect(adminMoreCode).toContain("path: '/admin/settings'");
    expect(adminMoreCode).toContain("title: 'Attendance Reports'");
    expect(adminMoreCode).toContain("path: '/admin/reports'");
    expect(adminMoreCode).toContain("title: 'Attendance History'");
    expect(adminMoreCode).toContain("path: '/admin/attendance-history'");
    expect(adminMoreCode).toContain("title: 'Notifications'");
    expect(adminMoreCode).toContain("path: '/admin/notifications'");
    expect(adminMoreCode).toContain("title: 'Profile'");
    expect(adminMoreCode).toContain("path: '/admin/profile'");
    expect(adminMoreCode).toContain("title: 'Logout'");

    // Verify skeleton loader
    expect(adminMoreCode).toContain('<AdminMoreSkeleton />');
  });

  it('Circuit 1.6: Bus In-charge More screen contains all required items and skeleton loading', () => {
    const inchargeMoreCode = fs.readFileSync(
      path.join(rootDir, 'src/pages/incharge/InchargeMorePage.tsx'),
      'utf-8'
    );

    // Verify all 6 items
    expect(inchargeMoreCode).toContain("title: 'Attendance History'");
    expect(inchargeMoreCode).toContain("path: '/incharge/history'");
    expect(inchargeMoreCode).toContain("title: 'Morning Reports'");
    expect(inchargeMoreCode).toContain("path: '/incharge/reports?session=MORNING'");
    expect(inchargeMoreCode).toContain("title: 'Evening Reports'");
    expect(inchargeMoreCode).toContain("path: '/incharge/reports?session=EVENING'");
    expect(inchargeMoreCode).toContain("title: 'Notifications'");
    expect(inchargeMoreCode).toContain("path: '/incharge/notifications'");
    expect(inchargeMoreCode).toContain("title: 'Profile'");
    expect(inchargeMoreCode).toContain("path: '/incharge/profile'");
    expect(inchargeMoreCode).toContain("title: 'Logout'");

    // Verify skeleton loader
    expect(inchargeMoreCode).toContain('<InchargeMoreSkeleton />');
  });

  it('Circuit 1.7: Student More screen contains Profile, Notifications, Logout and skeleton loading', () => {
    const studentMoreCode = fs.readFileSync(
      path.join(rootDir, 'src/pages/student/StudentMorePage.tsx'),
      'utf-8'
    );

    expect(studentMoreCode).toContain("title: 'Profile'");
    expect(studentMoreCode).toContain("path: '/student/profile'");
    expect(studentMoreCode).toContain("title: 'Notifications'");
    expect(studentMoreCode).toContain("path: '/student/notifications'");
    expect(studentMoreCode).toContain("title: 'Logout'");

    // Verify skeleton loader
    expect(studentMoreCode).toContain('<StudentMoreSkeleton />');
  });

  // --------------------------------------------------------------------------
  // 6. ROUTING CONFIGURATION
  // --------------------------------------------------------------------------
  it('Circuit 1.8: App routes are registered with working destinations', () => {
    const appCode = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');

    // Admin routes
    expect(appCode).toContain('<Route path="more" element={<AdminMorePage />} />');

    // Incharge routes
    expect(appCode).toContain('<Route path="more" element={<InchargeMorePage />} />');
    expect(appCode).toContain('<Route path="notifications" element={<NotificationsPage />} />');

    // Student routes
    expect(appCode).toContain('<Route path="more" element={<StudentMorePage />} />');
  });

  // --------------------------------------------------------------------------
  // 7. PERMISSION RESTRICTIONS ENFORCEMENT
  // --------------------------------------------------------------------------
  it('Circuit 1.9: Strict attendance operation permission boundary enforced in backend', () => {
    const apiCode = fs.readFileSync(
      path.join(rootDir, 'src/server/api.ts'),
      'utf-8'
    );

    // Admin forbidden from starting or ending attendance
    expect(apiCode).toContain("apiRouter.post('/attendance/session/start', requireAuth(['INCHARGE'])");
    expect(apiCode).toContain("apiRouter.post('/attendance/session/end', requireAuth(['INCHARGE'])");
    expect(apiCode).toContain("Admins have read-only access to attendance and cannot start sessions.");
    expect(apiCode).toContain("Admins have read-only access to attendance and cannot end sessions.");
  });
});

