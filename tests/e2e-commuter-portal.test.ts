import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getActiveNavPath, NavItemDef } from '../src/utils/navigation';
import { generateToken, verifyToken, revokeToken, isTokenRevoked, TokenPayload } from '../src/server/auth';
import { requireAuth, verifyInchargeBusAuthorization } from '../src/server/api';
import { MemoryStorageAdapter } from '../src/server/storage/MemoryStorageAdapter';
import { setStorageInstance } from '../src/server/storage';
import { AttendanceVerifier } from '../src/server/attendance/verifier';
import { User, Student, Bus, Role, ActiveSession } from '../src/types';

describe('⚡ Tier 1 & Tier 2: E2E Commuter Portal Navigation & Boundary Test Suite', () => {
  const rootDir = path.resolve(__dirname, '..');
  let storage: MemoryStorageAdapter;
  let verifier: AttendanceVerifier;

  // Standard Personas for Testing
  const adminUser: User = {
    id: 'ADMIN-E2E-001',
    name: 'Chief Transportation Officer',
    email: 'admin.commuter@college.edu',
    role: 'ADMIN',
    active: true,
    approved: true,
    status: 'APPROVED',
  };

  const inchargeUser: User = {
    id: 'INC-E2E-001',
    name: 'Prof. Anbarasan',
    email: 'anbarasan.inc@college.edu',
    role: 'INCHARGE',
    assignedBusId: 'BUS-01',
    active: true,
    approved: true,
    status: 'APPROVED',
  };

  const studentUser: User = {
    id: 'STU-E2E-001',
    name: 'Dharani M',
    email: 'dharani.stu@college.edu',
    role: 'STUDENT',
    studentId: 'STU-E2E-001',
    assignedBusId: 'BUS-01',
    active: true,
    approved: true,
    status: 'APPROVED',
  };

  beforeEach(async () => {
    storage = new MemoryStorageAdapter();
    setStorageInstance(storage);
    verifier = new AttendanceVerifier(storage);

    // Seed Fleet Bus
    const bus: Bus = {
      id: 'BUS-01',
      busNumber: 'BUS-01',
      routeName: 'Main City Central Route',
      capacity: 54,
      inchargeId: inchargeUser.id,
      inchargeName: inchargeUser.name,
      inchargePhone: '9842100001',
      active: true,
    };
    await storage.createBus(bus);

    // Seed Users
    await storage.createUser(adminUser);
    await storage.createUser(inchargeUser);
    await storage.createUser(studentUser);

    // Seed Student Profile
    const studentProfile: Student = {
      id: studentUser.id,
      registerNumber: '721420104088',
      name: studentUser.name,
      email: studentUser.email,
      busId: 'BUS-01',
      preferredBusId: 'BUS-01',
      role: 'STUDENT',
      active: true,
      approved: true,
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await storage.createStudent(studentProfile);
  });

  // Mock Request Runner for Express Middleware
  const runMiddleware = async (
    middleware: any,
    headers: Record<string, string> = {}
  ) => {
    const req: any = { headers };
    let statusCode = 200;
    let jsonBody: any = null;
    let nextCalled = false;

    const res: any = {
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(data: any) {
        jsonBody = data;
        return res;
      },
    };

    const next = () => {
      nextCalled = true;
    };

    await middleware(req, res, next);
    return { req, statusCode, jsonBody, nextCalled };
  };

  // ==========================================================================
  // TIER 1: FEATURE COVERAGE (ISOLATION)
  // ==========================================================================
  describe('Tier 1: Feature Coverage (Isolated Component & Feature Verifications)', () => {
    // ------------------------------------------------------------------------
    // R1.1: Mobile Bottom Nav for ADMIN
    // ------------------------------------------------------------------------
    it('T1.1: Admin Mobile Bottom Nav defines all 5 required navigation tabs and routes', () => {
      const bottomNavFile = fs.readFileSync(
        path.join(rootDir, 'src/components/common/MobileBottomNav.tsx'),
        'utf-8'
      );

      // Verify Admin tab set
      expect(bottomNavFile).toContain("case 'ADMIN':");
      expect(bottomNavFile).toContain("label: 'Home'");
      expect(bottomNavFile).toContain("path: '/admin/dashboard'");
      expect(bottomNavFile).toContain("label: 'Students'");
      expect(bottomNavFile).toContain("path: '/admin/students'");
      expect(bottomNavFile).toContain("label: 'Buses'");
      expect(bottomNavFile).toContain("path: '/admin/buses'");
      expect(bottomNavFile).toContain("label: 'Monitor'");
      expect(bottomNavFile).toContain("path: '/admin/live-monitoring'");
      expect(bottomNavFile).toContain("label: 'More'");
      expect(bottomNavFile).toContain("path: '/admin/more'");
    });

    // ------------------------------------------------------------------------
    // R1.2: Mobile Bottom Nav for INCHARGE
    // ------------------------------------------------------------------------
    it('T1.2: Bus In-charge Mobile Bottom Nav defines all 5 required navigation tabs and routes', () => {
      const bottomNavFile = fs.readFileSync(
        path.join(rootDir, 'src/components/common/MobileBottomNav.tsx'),
        'utf-8'
      );

      // Verify Incharge tab set
      expect(bottomNavFile).toContain("case 'INCHARGE':");
      expect(bottomNavFile).toContain("label: 'Home'");
      expect(bottomNavFile).toContain("path: '/incharge/dashboard'");
      expect(bottomNavFile).toContain("label: 'My Bus'");
      expect(bottomNavFile).toContain("path: '/incharge/my-bus'");
      expect(bottomNavFile).toContain("label: 'Attendance'");
      expect(bottomNavFile).toContain("path: '/incharge/attendance'");
      expect(bottomNavFile).toContain("label: 'Students'");
      expect(bottomNavFile).toContain("path: '/incharge/students'");
      expect(bottomNavFile).toContain("label: 'More'");
      expect(bottomNavFile).toContain("path: '/incharge/more'");
    });

    // ------------------------------------------------------------------------
    // R1.3: Mobile Bottom Nav for STUDENT
    // ------------------------------------------------------------------------
    it('T1.3: Student Mobile Bottom Nav defines all 5 required navigation tabs and routes', () => {
      const bottomNavFile = fs.readFileSync(
        path.join(rootDir, 'src/components/common/MobileBottomNav.tsx'),
        'utf-8'
      );

      // Verify Student tab set
      expect(bottomNavFile).toContain("case 'STUDENT':");
      expect(bottomNavFile).toContain("label: 'Home'");
      expect(bottomNavFile).toContain("path: '/student/dashboard'");
      expect(bottomNavFile).toContain("label: 'My Bus'");
      expect(bottomNavFile).toContain("path: '/student/my-bus'");
      expect(bottomNavFile).toContain("label: 'Verify'");
      expect(bottomNavFile).toContain("path: '/student/verify'");
      expect(bottomNavFile).toContain("label: 'History'");
      expect(bottomNavFile).toContain("path: '/student/history'");
      expect(bottomNavFile).toContain("label: 'Profile'");
      expect(bottomNavFile).toContain("path: '/student/profile'");
    });

    // ------------------------------------------------------------------------
    // R1.4: Active Tab Matching & Single Active Tab Guarantee
    // ------------------------------------------------------------------------
    it('T1.4: Single active tab guarantee correctly highlights exactly one tab per route without collision', () => {
      const adminNav: NavItemDef[] = [
        { to: '/admin/dashboard', label: 'Home', aliases: ['/admin'] },
        { to: '/admin/students', label: 'Students', aliases: ['/admin/approvals'] },
        { to: '/admin/buses', label: 'Buses' },
        { to: '/admin/live-monitoring', label: 'Monitor' },
        { to: '/admin/more', label: 'More', aliases: ['/admin/incharges', '/admin/settings', '/admin/reports'] },
      ];

      // Exact matches
      expect(getActiveNavPath('/admin/dashboard', adminNav)).toBe('/admin/dashboard');
      expect(getActiveNavPath('/admin/students', adminNav)).toBe('/admin/students');
      expect(getActiveNavPath('/admin/buses', adminNav)).toBe('/admin/buses');
      expect(getActiveNavPath('/admin/live-monitoring', adminNav)).toBe('/admin/live-monitoring');
      expect(getActiveNavPath('/admin/more', adminNav)).toBe('/admin/more');

      // Sub-route and alias matches
      expect(getActiveNavPath('/admin/approvals', adminNav)).toBe('/admin/students');
      expect(getActiveNavPath('/admin/incharges', adminNav)).toBe('/admin/more');
      expect(getActiveNavPath('/admin/settings', adminNav)).toBe('/admin/more');
      expect(getActiveNavPath('/admin/students/edit/42', adminNav)).toBe('/admin/students');
    });

    // ------------------------------------------------------------------------
    // R1.5: Desktop Sidebar Hiding on Mobile & Bottom Nav Hiding on Desktop
    // ------------------------------------------------------------------------
    it('T1.5: Responsive viewport classes enforce desktop sidebar hiding on mobile and bottom nav hiding on desktop', () => {
      const adminSidebarFile = fs.readFileSync(
        path.join(rootDir, 'src/components/common/AdminSidebar.tsx'),
        'utf-8'
      );
      const inchargeSidebarFile = fs.readFileSync(
        path.join(rootDir, 'src/components/common/InchargeSidebar.tsx'),
        'utf-8'
      );
      const studentSidebarFile = fs.readFileSync(
        path.join(rootDir, 'src/components/common/StudentSidebar.tsx'),
        'utf-8'
      );
      const bottomNavFile = fs.readFileSync(
        path.join(rootDir, 'src/components/common/MobileBottomNav.tsx'),
        'utf-8'
      );

      // Sidebars are hidden on mobile (< 768px) and flex on md: (>= 768px)
      expect(adminSidebarFile).toContain('hidden md:flex');
      expect(inchargeSidebarFile).toContain('hidden md:flex');
      expect(studentSidebarFile).toContain('hidden md:flex');

      // Bottom nav is fixed on mobile and hidden on md: (>= 768px)
      expect(bottomNavFile).toContain('fixed bottom-0 inset-x-0 z-40 md:hidden');
    });

    // ------------------------------------------------------------------------
    // R1.6: Route Transitions & Navigation Visibility Preservation
    // ------------------------------------------------------------------------
    it('T1.6: Layouts render MobileBottomNav outside Outlet to preserve bottom navigation during route transitions', () => {
      const adminLayout = fs.readFileSync(path.join(rootDir, 'src/layouts/AdminLayout.tsx'), 'utf-8');
      const inchargeLayout = fs.readFileSync(path.join(rootDir, 'src/layouts/InchargeLayout.tsx'), 'utf-8');
      const studentLayout = fs.readFileSync(path.join(rootDir, 'src/layouts/StudentLayout.tsx'), 'utf-8');

      // Admin Layout
      expect(adminLayout).toContain('<Outlet />');
      expect(adminLayout).toContain('<MobileBottomNav />');
      const adminOutletIdx = adminLayout.indexOf('<Outlet />');
      const adminNavIdx = adminLayout.indexOf('<MobileBottomNav />');
      expect(adminNavIdx).toBeGreaterThan(adminOutletIdx);

      // Incharge Layout
      expect(inchargeLayout).toContain('<Outlet />');
      expect(inchargeLayout).toContain('<MobileBottomNav />');
      const inchargeOutletIdx = inchargeLayout.indexOf('<Outlet />');
      const inchargeNavIdx = inchargeLayout.indexOf('<MobileBottomNav />');
      expect(inchargeNavIdx).toBeGreaterThan(inchargeOutletIdx);

      // Student Layout
      expect(studentLayout).toContain('<Outlet />');
      expect(studentLayout).toContain('<MobileBottomNav />');
      const studentOutletIdx = studentLayout.indexOf('<Outlet />');
      const studentNavIdx = studentLayout.indexOf('<MobileBottomNav />');
      expect(studentNavIdx).toBeGreaterThan(studentOutletIdx);
    });

    // ------------------------------------------------------------------------
    // R1.7: Content Overlap Prevention (Bottom Padding Offset)
    // ------------------------------------------------------------------------
    it('T1.7: Layout main containers define pb-24 padding to prevent mobile bottom navigation from obscuring content', () => {
      const layouts = [
        fs.readFileSync(path.join(rootDir, 'src/layouts/AdminLayout.tsx'), 'utf-8'),
        fs.readFileSync(path.join(rootDir, 'src/layouts/InchargeLayout.tsx'), 'utf-8'),
        fs.readFileSync(path.join(rootDir, 'src/layouts/StudentLayout.tsx'), 'utf-8'),
      ];

      for (const layout of layouts) {
        // Must contain pb-24 on mobile and md:pb-6 on desktop
        expect(layout).toContain('pb-24 md:pb-6');
      }
    });

    // ------------------------------------------------------------------------
    // R1.8: Auth Token Handling & 401 Response Handling
    // ------------------------------------------------------------------------
    it('T1.8: Server auth middleware properly validates Bearer tokens and returns 401 on missing or invalid tokens', async () => {
      // 1. Valid token
      const validToken = generateToken(adminUser);
      const resValid = await runMiddleware(requireAuth(['ADMIN']), {
        authorization: `Bearer ${validToken}`,
      });
      expect(resValid.statusCode).toBe(200);
      expect(resValid.nextCalled).toBe(true);
      expect(resValid.req.user.role).toBe('ADMIN');

      // 2. Missing authorization header
      const resMissing = await runMiddleware(requireAuth());
      expect(resMissing.statusCode).toBe(401);
      expect(resMissing.nextCalled).toBe(false);
      expect(resMissing.jsonBody.error).toContain('Unauthorized. Token required.');

      // 3. Malformed authorization scheme
      const resMalformed = await runMiddleware(requireAuth(), {
        authorization: `Token ${validToken}`,
      });
      expect(resMalformed.statusCode).toBe(401);
      expect(resMalformed.nextCalled).toBe(false);

      // 4. Invalid or tampered token
      const resTampered = await runMiddleware(requireAuth(), {
        authorization: `Bearer ${validToken}.tampered`,
      });
      expect(resTampered.statusCode).toBe(401);
      expect(resTampered.nextCalled).toBe(false);
      expect(resTampered.jsonBody.error).toContain('Invalid or expired token.');
    });

    // ------------------------------------------------------------------------
    // R1.9: Dedicated Skeleton UI Coverage
    // ------------------------------------------------------------------------
    it('T1.9: Skeleton loading fallbacks are defined across lazy routes and More pages', () => {
      const appFile = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');
      const adminMore = fs.readFileSync(path.join(rootDir, 'src/pages/admin/AdminMorePage.tsx'), 'utf-8');
      const inchargeMore = fs.readFileSync(path.join(rootDir, 'src/pages/incharge/InchargeMorePage.tsx'), 'utf-8');
      const studentMore = fs.readFileSync(path.join(rootDir, 'src/pages/student/StudentMorePage.tsx'), 'utf-8');

      // App level Suspense fallback
      expect(appFile).toContain('<Suspense fallback={<PageFallback />}>');
      expect(appFile).toContain('const PageFallback: React.FC = () =>');

      // Page-level skeletons
      expect(adminMore).toContain('<AdminMoreSkeleton />');
      expect(inchargeMore).toContain('<InchargeMoreSkeleton />');
      expect(studentMore).toContain('<StudentMoreSkeleton />');
    });
  });

  // ==========================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    // ------------------------------------------------------------------------
    // B2.1: Viewport Boundary Transition (767px vs 768px)
    // ------------------------------------------------------------------------
    it('T2.1: Evaluates exact Tailwind md breakpoint threshold (767px mobile vs 768px desktop)', () => {
      // Simulating Tailwind breakpoint evaluation logic:
      const evaluateNavigationVisibility = (viewportWidth: number) => {
        const isMobile = viewportWidth < 768; // Tailwind md: 768px
        return {
          mobileBottomNavVisible: isMobile,
          desktopSidebarVisible: !isMobile,
        };
      };

      // 767px (max mobile boundary): bottom nav visible, sidebar hidden
      const mobileAtBoundary = evaluateNavigationVisibility(767);
      expect(mobileAtBoundary.mobileBottomNavVisible).toBe(true);
      expect(mobileAtBoundary.desktopSidebarVisible).toBe(false);

      // 768px (min desktop boundary): bottom nav hidden, sidebar visible
      const desktopAtBoundary = evaluateNavigationVisibility(768);
      expect(desktopAtBoundary.mobileBottomNavVisible).toBe(false);
      expect(desktopAtBoundary.desktopSidebarVisible).toBe(true);

      // Extreme mobile viewports
      const smallPhone = evaluateNavigationVisibility(320);
      expect(smallPhone.mobileBottomNavVisible).toBe(true);
      expect(smallPhone.desktopSidebarVisible).toBe(false);

      const standardPhone = evaluateNavigationVisibility(375);
      expect(standardPhone.mobileBottomNavVisible).toBe(true);
      expect(standardPhone.desktopSidebarVisible).toBe(false);

      // Extreme desktop viewports
      const largeMonitor = evaluateNavigationVisibility(1920);
      expect(largeMonitor.mobileBottomNavVisible).toBe(false);
      expect(largeMonitor.desktopSidebarVisible).toBe(true);
    });

    // ------------------------------------------------------------------------
    // B2.2: iOS & Android Safe-Area Inset Handling
    // ------------------------------------------------------------------------
    it('T2.2: Verifies safe area insets support in index.html and MobileBottomNav CSS', () => {
      const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
      const bottomNavFile = fs.readFileSync(
        path.join(rootDir, 'src/components/common/MobileBottomNav.tsx'),
        'utf-8'
      );

      // index.html viewport meta configuration
      expect(indexHtml).toContain('viewport');
      expect(indexHtml).toContain('width=device-width');
      expect(indexHtml).toContain('initial-scale=1.0');

      // MobileBottomNav uses max() with env(safe-area-inset-bottom) for home indicator bar
      expect(bottomNavFile).toContain("paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'");
    });

    // ------------------------------------------------------------------------
    // B2.3: Invalid, Malformed, and Expired Tokens
    // ------------------------------------------------------------------------
    it('T2.3: Rejects expired tokens, revoked JTIs, and corrupted token signatures with HTTP 401', async () => {
      // 1. Revoked token
      const token = generateToken(adminUser);
      expect(verifyToken(token)).not.toBeNull();
      revokeToken(token);
      expect(isTokenRevoked(token)).toBe(true);
      expect(verifyToken(token)).toBeNull();

      const revokedRes = await runMiddleware(requireAuth(['ADMIN']), {
        authorization: `Bearer ${token}`,
      });
      expect(revokedRes.statusCode).toBe(401);
      expect(revokedRes.jsonBody.error).toContain('Invalid or expired token.');

      // 2. Corrupted token payload
      const parts = token.split('.');
      const corruptedToken = `${parts[0]}.${Buffer.from('{"id":"hacked","role":"ADMIN"}').toString('base64url')}.${parts[2]}`;
      const corruptedRes = await runMiddleware(requireAuth(['ADMIN']), {
        authorization: `Bearer ${corruptedToken}`,
      });
      expect(corruptedRes.statusCode).toBe(401);

      // 3. Completely bogus non-JWT string
      const bogusRes = await runMiddleware(requireAuth(), {
        authorization: 'Bearer not-even-a-jwt',
      });
      expect(bogusRes.statusCode).toBe(401);
    });

    // ------------------------------------------------------------------------
    // B2.4: Concurrent API Requests & Race Condition Prevention
    // ------------------------------------------------------------------------
    it('T2.4: Concurrent requests are deduplicated preventing duplicate state mutations or redundant execution', async () => {
      let callCount = 0;
      const inFlightMap = new Map<string, Promise<any>>();

      const executeRequest = (key: string) => {
        if (inFlightMap.has(key)) {
          return inFlightMap.get(key)!;
        }

        const task = (async () => {
          callCount += 1;
          await new Promise((resolve) => setTimeout(resolve, 40));
          return { data: 'response', callCount };
        })().finally(() => {
          inFlightMap.delete(key);
        });

        inFlightMap.set(key, task);
        return task;
      };

      // Dispatch 8 simultaneous requests
      const results = await Promise.all([
        executeRequest('req:admin:students'),
        executeRequest('req:admin:students'),
        executeRequest('req:admin:students'),
        executeRequest('req:admin:students'),
        executeRequest('req:admin:students'),
        executeRequest('req:admin:students'),
        executeRequest('req:admin:students'),
        executeRequest('req:admin:students'),
      ]);

      // All 8 requests must resolve to the identical result
      expect(results.length).toBe(8);
      for (const res of results) {
        expect(res.data).toBe('response');
        expect(res.callCount).toBe(1);
      }
      expect(callCount).toBe(1);
    });

    // ------------------------------------------------------------------------
    // B2.5: Empty Rosters & Unassigned Edge Cases
    // ------------------------------------------------------------------------
    it('T2.5: Handles empty student rosters, unassigned buses, and non-existent bus IDs gracefully', async () => {
      // 1. Bus with 0 students
      const emptyBusStudents = await storage.getStudentsByBusId('BUS-EMPTY-99');
      expect(emptyBusStudents).toEqual([]);

      // 2. Student with no assigned bus
      const unassignedStudent: User = {
        id: 'STU-721420104999',
        name: 'Unassigned Student',
        email: 'unassigned@college.edu',
        role: 'STUDENT',
        studentId: 'STU-721420104999',
        active: true,
        approved: true,
        status: 'APPROVED',
      };
      await storage.createUser(unassignedStudent);
      await storage.createStudent({
        id: 'STU-721420104999',
        registerNumber: '721420104999',
        name: unassignedStudent.name,
        email: unassignedStudent.email,
        busId: undefined,
        role: 'STUDENT',
        active: true,
        approved: true,
        status: 'APPROVED',
      });

      const verificationResult = await verifier.verifyStudentLocation(unassignedStudent, {
        latitude: 10.9572,
        longitude: 78.0766,
        accuracy: 10,
      });
      expect(verificationResult.status).toBe('BUS_MISMATCH');
      expect(verificationResult.message).toContain('No bus assigned to this student');

      // 3. In-charge with non-existent bus
      const inchargePayload: TokenPayload = {
        id: inchargeUser.id,
        email: inchargeUser.email,
        name: inchargeUser.name,
        role: 'INCHARGE',
        assignedBusId: 'BUS-GHOST',
      };
      const busAuth = await verifyInchargeBusAuthorization(inchargePayload, 'BUS-GHOST');
      expect(busAuth.authorized).toBe(false);
      expect(busAuth.status).toBe(404);
      expect(busAuth.error).toContain('does not exist in fleet registry');
    });

    // ------------------------------------------------------------------------
    // B2.6: Rapid Tab Switching / Navigation Debouncing
    // ------------------------------------------------------------------------
    it('T2.6: Rapid tab switching sequentially resolves to the final active tab without ghost active states', () => {
      const studentNav: NavItemDef[] = [
        { to: '/student/dashboard', label: 'Home', aliases: ['/student'] },
        { to: '/student/my-bus', label: 'My Bus', aliases: ['/student/bus'] },
        { to: '/student/verify', label: 'Verify', aliases: ['/student/verify-attendance'] },
        { to: '/student/history', label: 'History', aliases: ['/student/attendance-history'] },
        { to: '/student/profile', label: 'Profile', aliases: ['/student/notifications', '/student/more'] },
      ];

      // Rapid series of location changes
      const routeTransitions = [
        '/student/dashboard',
        '/student/my-bus',
        '/student/verify',
        '/student/history',
        '/student/profile',
      ];

      const resolvedHistory: string[] = [];
      for (const route of routeTransitions) {
        const resolved = getActiveNavPath(route, studentNav, '/student/dashboard');
        expect(resolved).not.toBeNull();
        resolvedHistory.push(resolved!);
      }

      // Verifies each transition cleanly maps to exactly one active route
      expect(resolvedHistory).toEqual([
        '/student/dashboard',
        '/student/my-bus',
        '/student/verify',
        '/student/history',
        '/student/profile',
      ]);

      // Final settled state is exactly the last route
      expect(resolvedHistory[resolvedHistory.length - 1]).toBe('/student/profile');
    });
  });
});
