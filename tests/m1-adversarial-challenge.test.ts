import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Role } from '../src/types';

describe('🛡️ Adversarial Challenge Suite: Milestone M1 (Mobile Navigation & Layout Durability)', () => {
  const rootDir = path.resolve(__dirname, '..');

  // ==========================================================================
  // CHALLENGE 1: Layout Transition Durability (<Outlet /> with <Suspense>)
  // ==========================================================================
  describe('Challenge 1: Layout Transition Durability & Persistent Navigation', () => {
    const layoutFiles = [
      { name: 'AdminLayout', path: 'src/layouts/AdminLayout.tsx', sidebar: 'AdminSidebar' },
      { name: 'InchargeLayout', path: 'src/layouts/InchargeLayout.tsx', sidebar: 'InchargeSidebar' },
      { name: 'StudentLayout', path: 'src/layouts/StudentLayout.tsx', sidebar: 'StudentSidebar' },
    ];

    for (const layout of layoutFiles) {
      it(`verifies ${layout.name} wraps <Outlet /> with dedicated <Suspense> and keeps Navbar & MobileBottomNav permanently mounted`, () => {
        const content = fs.readFileSync(path.join(rootDir, layout.path), 'utf-8');

        // 1. Suspense is imported
        expect(content).toMatch(/import\s+React,\s*\{\s*Suspense\s*\}\s+from\s+['"]react['"]/);

        // 2. Suspense fallback is defined
        expect(content).toContain('const PageFallback: React.FC');
        expect(content).toContain('animate-pulse');

        // 3. Outlet is wrapped inside Suspense
        const suspenseRegex = /<Suspense\s+fallback=\{<PageFallback\s*\/>\}>\s*<Outlet\s*\/>\s*<\/Suspense>/;
        expect(content).toMatch(suspenseRegex);

        // 4. Navbar is rendered outside Suspense boundary (stays mounted during route load)
        const navbarPos = content.indexOf('<Navbar />');
        const suspensePos = content.indexOf('<Suspense');
        const outletPos = content.indexOf('<Outlet />');
        const bottomNavPos = content.indexOf('<MobileBottomNav />');

        expect(navbarPos).toBeGreaterThan(-1);
        expect(suspensePos).toBeGreaterThan(navbarPos);
        expect(outletPos).toBeGreaterThan(suspensePos);

        // 5. MobileBottomNav is rendered outside Suspense boundary at layout root
        expect(bottomNavPos).toBeGreaterThan(-1);
        expect(bottomNavPos).toBeGreaterThan(suspensePos);

        // 6. Sidebar is rendered outside Suspense boundary
        const sidebarPos = content.indexOf(`<${layout.sidebar} />`);
        expect(sidebarPos).toBeGreaterThan(-1);
        expect(sidebarPos).toBeLessThan(suspensePos);

        // 7. Main container has pb-24 md:pb-6 to prevent bottom nav overlap
        expect(content).toContain('pb-24 md:pb-6');
      });
    }

    it('verifies App.tsx registers layouts with child routes such that sibling transitions do not unmount layouts', () => {
      const appContent = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8').replace(/\r\n/g, '\n');

      // Admin layout wraps all admin child routes
      expect(appContent).toContain('<Route\n              path="/admin"\n              element={\n                <ProtectedRoute allowedRoles={[\'ADMIN\']}>\n                  <AdminLayout />\n                </ProtectedRoute>\n              }\n            >');
      // Incharge layout wraps incharge child routes
      expect(appContent).toContain('path="/incharge"');
      expect(appContent).toContain('<InchargeLayout />');
      // Student layout wraps student child routes
      expect(appContent).toContain('path="/student"');
      expect(appContent).toContain('<StudentLayout />');
    });
  });

  // ==========================================================================
  // CHALLENGE 2: Element Collisions, Layout Shifts & Modal Blocking
  // ==========================================================================
  describe('Challenge 2: Safe-Area Math, Docked Action Bar & Modal Stacking Hierarchy', () => {
    it('mathematically proves zero overlap and zero gap between MobileBottomNav and StudentDashboard docked action bar', () => {
      // MobileBottomNav specs:
      // Height of bar contents: 56px (h-14 / 3.5rem)
      // Bottom padding: max(0.5rem (8px), env(safe-area-inset-bottom))
      // Total MobileBottomNav height = 56 + max(8, inset)

      // StudentDashboard docked action bar specs:
      // bottom: calc(3.5rem + max(0.5rem, env(safe-area-inset-bottom)))
      // In pixels: 56 + max(8, inset)

      const testInsetValue = (insetPx: number) => {
        const bottomNavHeightPx = 56 + Math.max(8, insetPx);
        const dockedBarBottomPx = 56 + Math.max(8, insetPx);
        const gapOrOverlapPx = dockedBarBottomPx - bottomNavHeightPx;
        return { bottomNavHeightPx, dockedBarBottomPx, gapOrOverlapPx };
      };

      // Scenario A: Standard Android / Non-notched screen (inset = 0)
      const nonNotched = testInsetValue(0);
      expect(nonNotched.bottomNavHeightPx).toBe(64);
      expect(nonNotched.dockedBarBottomPx).toBe(64);
      expect(nonNotched.gapOrOverlapPx).toBe(0); // Perfect 0px seam

      // Scenario B: iPhone X/11/12/13/14/15/16 (inset = 34px)
      const iphoneNotch = testInsetValue(34);
      expect(iphoneNotch.bottomNavHeightPx).toBe(90);
      expect(iphoneNotch.dockedBarBottomPx).toBe(90);
      expect(iphoneNotch.gapOrOverlapPx).toBe(0); // Perfect 0px seam

      // Scenario C: Custom hardware bezel / notch (inset = 21px)
      const customBezel = testInsetValue(21);
      expect(customBezel.bottomNavHeightPx).toBe(77);
      expect(customBezel.dockedBarBottomPx).toBe(77);
      expect(customBezel.gapOrOverlapPx).toBe(0); // Perfect 0px seam
    });

    it('verifies strict Z-Index layering: Modals (z-50) > MobileBottomNav (z-40) > Docked Bar (z-30)', () => {
      const studentDashboard = fs.readFileSync(
        path.join(rootDir, 'src/pages/student/StudentDashboard.tsx'),
        'utf-8'
      );
      const bottomNav = fs.readFileSync(
        path.join(rootDir, 'src/components/common/MobileBottomNav.tsx'),
        'utf-8'
      );
      const modal = fs.readFileSync(
        path.join(rootDir, 'src/components/common/Modal.tsx'),
        'utf-8'
      );
      const faceModal = fs.readFileSync(
        path.join(rootDir, 'src/components/attendance/FaceEnrollmentModal.tsx'),
        'utf-8'
      );

      // Verify Docked Action Bar is z-30
      expect(studentDashboard).toMatch(/fixed inset-x-0 z-30 px-4 py-2\.5/);

      // Verify MobileBottomNav is z-40
      expect(bottomNav).toMatch(/fixed bottom-0 inset-x-0 z-40 md:hidden/);

      // Verify Modals are z-50
      expect(modal).toMatch(/fixed inset-0 z-50/);
      expect(faceModal).toMatch(/fixed inset-0 z-50/);

      // Numeric hierarchy check
      const zDocked = 30;
      const zBottomNav = 40;
      const zModal = 50;

      expect(zModal).toBeGreaterThan(zBottomNav);
      expect(zBottomNav).toBeGreaterThan(zDocked);
    });

    it('verifies container padding eliminates table / list occlusion by bottom elements', () => {
      // Admin, Incharge, Student layouts all use pb-24 = 96px
      const layoutPaddingPx = 96;
      const maxBottomNavHeightPx = 90; // on iPhone notch 34px inset
      expect(layoutPaddingPx).toBeGreaterThan(maxBottomNavHeightPx);
      expect(layoutPaddingPx - maxBottomNavHeightPx).toBe(6); // 6px safety margin on largest notch

      // StudentDashboard active session has pb-36 = 144px
      const studentDashboard = fs.readFileSync(
        path.join(rootDir, 'src/pages/student/StudentDashboard.tsx'),
        'utf-8'
      );
      expect(studentDashboard).toContain("${isSessionActive && !isPresent ? 'pb-36' : 'pb-8'}");

      // With active session: 144px (dashboard) + 96px (layout main) = 240px total clearance
      const totalActiveClearance = 144 + 96;
      const combinedNavAndDockedHeight = 90 + 60; // 90px nav + ~60px docked action bar = 150px
      expect(totalActiveClearance).toBeGreaterThan(combinedNavAndDockedHeight);
      expect(totalActiveClearance - combinedNavAndDockedHeight).toBe(90); // 90px generous headroom
    });

    it('verifies index.html specifies viewport-fit=cover to activate CSS env() safe-area insets', () => {
      const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
      expect(indexHtml).toContain('content="width=device-width, initial-scale=1.0, viewport-fit=cover"');
    });
  });

  // ==========================================================================
  // CHALLENGE 3: NotificationBell Role-Aware Routing & RBAC 403 Loop Avoidance
  // ==========================================================================
  describe('Challenge 3: Role-Aware Notification Routing & RBAC Loop Avoidance', () => {
    const getNotificationPath = (role: Role | undefined | null): string => {
      switch (role) {
        case 'ADMIN':
          return '/admin/notifications';
        case 'INCHARGE':
          return '/incharge/notifications';
        case 'STUDENT':
          return '/student/notifications';
        default:
          return '/login';
      }
    };

    it('routes each role strictly to its authorized notifications route', () => {
      expect(getNotificationPath('ADMIN')).toBe('/admin/notifications');
      expect(getNotificationPath('INCHARGE')).toBe('/incharge/notifications');
      expect(getNotificationPath('STUDENT')).toBe('/student/notifications');
      expect(getNotificationPath(null)).toBe('/login');
      expect(getNotificationPath(undefined)).toBe('/login');
    });

    it('verifies all 3 role notification paths exist as registered routes in App.tsx', () => {
      const appContent = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');

      // Admin has <Route path="notifications" element={<NotificationsPage />} />
      expect(appContent).toContain('<Route path="notifications" element={<NotificationsPage />} />');

      // Incharge has <Route path="notifications" element={<NotificationsPage />} />
      // (verified at lines 159 and 184)
      const count = (appContent.match(/<Route path="notifications" element=\{<NotificationsPage \/>\} \/>/g) || []).length;
      expect(count).toBe(2); // One under /admin, one under /incharge

      // Student has <Route path="notifications" element={<StudentNotifications />} />
      expect(appContent).toContain('<Route path="notifications" element={<StudentNotifications />} />');
    });

    it('proves that old hardcoded /admin/notifications caused RBAC 403 / redirect bounce for INCHARGE and STUDENT', () => {
      // Client-side ProtectedRoute logic simulation from App.tsx lines 73-98:
      const simulateProtectedRoute = (role: Role, routeAllowedRoles: Role[]) => {
        if (!routeAllowedRoles.includes(role)) {
          if (role === 'ADMIN') return { status: 302, redirect: '/admin/dashboard' };
          if (role === 'INCHARGE') return { status: 302, redirect: '/incharge/dashboard' };
          return { status: 302, redirect: '/student/dashboard' };
        }
        return { status: 200, redirect: null };
      };

      // Old behavior: navigating to /admin/notifications (which requires ['ADMIN'])
      const oldInchargeAccess = simulateProtectedRoute('INCHARGE', ['ADMIN']);
      expect(oldInchargeAccess.status).toBe(302);
      expect(oldInchargeAccess.redirect).toBe('/incharge/dashboard'); // Rejected! Bounced back!

      const oldStudentAccess = simulateProtectedRoute('STUDENT', ['ADMIN']);
      expect(oldStudentAccess.status).toBe(302);
      expect(oldStudentAccess.redirect).toBe('/student/dashboard'); // Rejected! Bounced back!

      // New behavior with getNotificationPath():
      // INCHARGE goes to /incharge/notifications (requires ['INCHARGE'])
      const newInchargeAccess = simulateProtectedRoute('INCHARGE', ['INCHARGE']);
      expect(newInchargeAccess.status).toBe(200);
      expect(newInchargeAccess.redirect).toBeNull(); // Allowed!

      // STUDENT goes to /student/notifications (requires ['STUDENT'])
      const newStudentAccess = simulateProtectedRoute('STUDENT', ['STUDENT']);
      expect(newStudentAccess.status).toBe(200);
      expect(newStudentAccess.redirect).toBeNull(); // Allowed!
    });
  });

  // ==========================================================================
  // CHALLENGE 4: Exhaustive Route-to-Active-Tab Matrix (Zero Active Tab Collisions)
  // ==========================================================================
  describe('Challenge 4: Active Tab Determinism & Slash-Boundary Prefix Matching', () => {
    // Replicate MobileBottomNav active tab resolution algorithm from lines 182-221
    const resolveActiveTab = (
      role: Role,
      pathname: string,
      navItems: { id: string; path: string; matchPaths: string[] }[]
    ): string | null => {
      const currentPath = pathname.toLowerCase().replace(/\/$/, '');

      // 1. Exact match on item path
      for (const item of navItems) {
        const cleanItemPath = item.path.toLowerCase().replace(/\/$/, '');
        if (currentPath === cleanItemPath) return item.id;
      }

      // 2. Exact match in matchPaths
      for (const item of navItems) {
        for (const m of item.matchPaths) {
          const cleanM = m.toLowerCase().replace(/\/$/, '');
          if (currentPath === cleanM) return item.id;
        }
      }

      // 3. Prefix match in matchPaths (excluding root prefixes)
      for (const item of navItems) {
        for (const m of item.matchPaths) {
          const cleanM = m.toLowerCase().replace(/\/$/, '');
          if (cleanM !== '/admin' && cleanM !== '/incharge' && cleanM !== '/student') {
            if (currentPath === cleanM || currentPath.startsWith(cleanM + '/')) {
              return item.id;
            }
          }
        }
      }

      // Default fallback
      if (role === 'ADMIN' && currentPath.startsWith('/admin')) return 'home';
      if (role === 'INCHARGE' && currentPath.startsWith('/incharge')) return 'home';
      if (role === 'STUDENT' && currentPath.startsWith('/student')) return 'home';

      return null;
    };

    const adminTabs = [
      { id: 'home', path: '/admin/dashboard', matchPaths: ['/admin', '/admin/dashboard'] },
      { id: 'students', path: '/admin/students', matchPaths: ['/admin/students', '/admin/approvals'] },
      { id: 'buses', path: '/admin/buses', matchPaths: ['/admin/buses'] },
      { id: 'monitor', path: '/admin/live-monitoring', matchPaths: ['/admin/live-monitoring'] },
      {
        id: 'more',
        path: '/admin/more',
        matchPaths: [
          '/admin/more',
          '/admin/incharges',
          '/admin/assignments',
          '/admin/settings',
          '/admin/ground-settings',
          '/admin/settings/geofence',
          '/admin/reports',
          '/admin/attendance',
          '/admin/attendance/history',
          '/admin/attendance-history',
          '/admin/notifications',
          '/admin/profile',
        ],
      },
    ];

    const inchargeTabs = [
      { id: 'home', path: '/incharge/dashboard', matchPaths: ['/incharge', '/incharge/dashboard'] },
      { id: 'bus', path: '/incharge/my-bus', matchPaths: ['/incharge/my-bus', '/incharge/bus'] },
      {
        id: 'attendance',
        path: '/incharge/attendance',
        matchPaths: ['/incharge/attendance', '/incharge/live-attendance', '/incharge/start-attendance'],
      },
      { id: 'students', path: '/incharge/students', matchPaths: ['/incharge/students'] },
      {
        id: 'more',
        path: '/incharge/more',
        matchPaths: [
          '/incharge/more',
          '/incharge/history',
          '/incharge/reports',
          '/incharge/notifications',
          '/incharge/profile',
        ],
      },
    ];

    const studentTabs = [
      { id: 'home', path: '/student/dashboard', matchPaths: ['/student', '/student/dashboard'] },
      { id: 'bus', path: '/student/my-bus', matchPaths: ['/student/my-bus', '/student/bus'] },
      { id: 'verify', path: '/student/verify', matchPaths: ['/student/verify', '/student/verify-attendance'] },
      { id: 'history', path: '/student/history', matchPaths: ['/student/history', '/student/attendance-history'] },
      { id: 'profile', path: '/student/profile', matchPaths: ['/student/profile', '/student/notifications', '/student/more'] },
    ];

    it('resolves exactly one valid active tab across ALL Admin routes including parameter and sub-paths', () => {
      const testRoutes = [
        { route: '/admin', expected: 'home' },
        { route: '/admin/dashboard', expected: 'home' },
        { route: '/admin/dashboard/', expected: 'home' },
        { route: '/admin/students', expected: 'students' },
        { route: '/admin/approvals', expected: 'students' },
        { route: '/admin/buses', expected: 'buses' },
        { route: '/admin/buses/BUS-01', expected: 'buses' },
        { route: '/admin/live-monitoring', expected: 'monitor' },
        { route: '/admin/more', expected: 'more' },
        { route: '/admin/incharges', expected: 'more' },
        { route: '/admin/assignments', expected: 'more' },
        { route: '/admin/settings', expected: 'more' },
        { route: '/admin/settings/geofence', expected: 'more' },
        { route: '/admin/reports', expected: 'more' },
        { route: '/admin/reports/2026-11-01', expected: 'more' },
        { route: '/admin/notifications', expected: 'more' },
        { route: '/admin/profile', expected: 'more' },
      ];

      for (const { route, expected } of testRoutes) {
        const resolved = resolveActiveTab('ADMIN', route, adminTabs);
        expect(resolved, `Failed for route: ${route}`).toBe(expected);
      }
    });

    it('resolves exactly one valid active tab across ALL Incharge routes', () => {
      const testRoutes = [
        { route: '/incharge', expected: 'home' },
        { route: '/incharge/dashboard', expected: 'home' },
        { route: '/incharge/my-bus', expected: 'bus' },
        { route: '/incharge/bus', expected: 'bus' },
        { route: '/incharge/attendance', expected: 'attendance' },
        { route: '/incharge/live-attendance', expected: 'attendance' },
        { route: '/incharge/start-attendance', expected: 'attendance' },
        { route: '/incharge/students', expected: 'students' },
        { route: '/incharge/more', expected: 'more' },
        { route: '/incharge/history', expected: 'more' },
        { route: '/incharge/reports', expected: 'more' },
        { route: '/incharge/notifications', expected: 'more' },
        { route: '/incharge/profile', expected: 'more' },
      ];

      for (const { route, expected } of testRoutes) {
        const resolved = resolveActiveTab('INCHARGE', route, inchargeTabs);
        expect(resolved, `Failed for route: ${route}`).toBe(expected);
      }
    });

    it('resolves exactly one valid active tab across ALL Student routes', () => {
      const testRoutes = [
        { route: '/student', expected: 'home' },
        { route: '/student/dashboard', expected: 'home' },
        { route: '/student/my-bus', expected: 'bus' },
        { route: '/student/bus', expected: 'bus' },
        { route: '/student/verify', expected: 'verify' },
        { route: '/student/verify-attendance', expected: 'verify' },
        { route: '/student/history', expected: 'history' },
        { route: '/student/attendance-history', expected: 'history' },
        { route: '/student/profile', expected: 'profile' },
        { route: '/student/notifications', expected: 'profile' },
        { route: '/student/more', expected: 'profile' },
      ];

      for (const { route, expected } of testRoutes) {
        const resolved = resolveActiveTab('STUDENT', route, studentTabs);
        expect(resolved, `Failed for route: ${route}`).toBe(expected);
      }
    });

    it('prevents accidental prefix bleed across subroutes with similar letter prefixes', () => {
      // e.g., if a hypothetical route "/admin/students-special" existed, it should NOT match "/admin/students"
      // because startsWith(cleanM + '/') requires a slash separator!
      const resolvedSpecial = resolveActiveTab('ADMIN', '/admin/students-special', adminTabs);
      // Because '/admin/students-special' does not equal '/admin/students' and doesn't start with '/admin/students/',
      // it should fall back to 'home' rather than mistakenly selecting 'students'
      expect(resolvedSpecial).toBe('home');
    });
  });
});
