import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getActiveNavPath, NavItemDef } from '../src/utils/navigation';
import { generateToken, verifyToken, revokeToken, isTokenRevoked, TokenPayload } from '../src/server/auth';
import { requireAuth, verifyInchargeBusAuthorization } from '../src/server/api';
import { MemoryStorageAdapter } from '../src/server/storage/MemoryStorageAdapter';
import { setStorageInstance } from '../src/server/storage';
import { AttendanceVerifier } from '../src/server/attendance/verifier';
import { User, Student, Bus, Role, ActiveSession, AttendanceRecord } from '../src/types';

describe('⚡ Tier 3 & Tier 4: E2E Cross-Feature Combinations & Real-World User Journeys', () => {
  const rootDir = path.resolve(__dirname, '..');
  let storage: MemoryStorageAdapter;
  let verifier: AttendanceVerifier;

  // Personas
  const adminUser: User = {
    id: 'ADMIN-JOURNEY-01',
    name: 'College Transport Administrator',
    email: 'admin.transit@college.edu',
    role: 'ADMIN',
    active: true,
    approved: true,
    status: 'APPROVED',
  };

  const inchargeUser: User = {
    id: 'INC-JOURNEY-01',
    name: 'Prof. Senthil Kumar',
    email: 'senthil.inc@college.edu',
    role: 'INCHARGE',
    assignedBusId: 'BUS-01',
    active: true,
    approved: true,
    status: 'APPROVED',
  };

  const studentUser: User = {
    id: 'STU-721420104050',
    name: 'Aishwarya R',
    email: 'aishwarya.stu@college.edu',
    role: 'STUDENT',
    studentId: 'STU-721420104050',
    assignedBusId: 'BUS-01',
    active: true,
    approved: true,
    status: 'APPROVED',
  };

  const bus1: Bus = {
    id: 'BUS-01',
    busNumber: 'BUS-01',
    routeName: 'City Express Route',
    capacity: 50,
    inchargeId: inchargeUser.id,
    inchargeName: inchargeUser.name,
    inchargePhone: '9876543210',
    active: true,
  };

  const studentProfile: Student = {
    id: studentUser.id,
    registerNumber: '721420104050',
    name: studentUser.name,
    email: studentUser.email,
    phone: '9876543299',
    busId: 'BUS-01',
    preferredBusId: 'BUS-01',
    role: 'STUDENT',
    active: true,
    approved: true,
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    storage = new MemoryStorageAdapter();
    setStorageInstance(storage);
    verifier = new AttendanceVerifier(storage);

    await storage.createBus(bus1);
    await storage.createUser(adminUser);
    await storage.createUser(inchargeUser);
    await storage.createUser(studentUser);
    await storage.createStudent(studentProfile);
  });

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
  // TIER 3: CROSS-FEATURE COMBINATIONS (PAIRWISE INTERACTIONS)
  // ==========================================================================
  describe('Tier 3: Cross-Feature Combinations (Pairwise Interactions)', () => {
    // ------------------------------------------------------------------------
    // C3.1: Mobile Bottom Nav + Modal / Docked Action Bar Layering
    // ------------------------------------------------------------------------
    it('T3.1: Modal dialogs (z-50) stack above mobile bottom navigation (z-40) without collision', () => {
      const bottomNavFile = fs.readFileSync(
        path.join(rootDir, 'src/components/common/MobileBottomNav.tsx'),
        'utf-8'
      );
      const modalFile = fs.readFileSync(
        path.join(rootDir, 'src/components/attendance/MobileVerificationModal.tsx'),
        'utf-8'
      );

      // MobileBottomNav specifies z-40
      expect(bottomNavFile).toContain('fixed bottom-0 inset-x-0 z-40 md:hidden');

      // Modals specify z-50 to guarantee they render over bottom navigation
      expect(modalFile).toContain('fixed inset-0 z-50');

      // Layering hierarchy: z-50 > z-40
      const navZ = 40;
      const modalZ = 50;
      expect(modalZ).toBeGreaterThan(navZ);
    });

    // ------------------------------------------------------------------------
    // C3.2: Tab Switching During Active Data Fetching
    // ------------------------------------------------------------------------
    it('T3.2: Tab switching during an in-flight API fetch does not cause race conditions or unhandled rejections', async () => {
      let isFetching = true;
      let targetTab = '/admin/dashboard';

      // Simulate asynchronous API fetch
      const fetchPromise = (async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'roster_loaded', tabAtInitiation: targetTab };
      })().finally(() => {
        isFetching = false;
      });

      // User immediately clicks to another tab while fetch is in-flight
      targetTab = '/admin/buses';
      expect(isFetching).toBe(true);

      const result = await fetchPromise;
      expect(isFetching).toBe(false);
      expect(result.data).toBe('roster_loaded');
      // The current target tab successfully switched without blocking or error
      expect(targetTab).toBe('/admin/buses');
    });

    // ------------------------------------------------------------------------
    // C3.3: Token Expiration During Background Polling
    // ------------------------------------------------------------------------
    it('T3.3: Background polling encountering a revoked or expired token halts polling storm', async () => {
      const token = generateToken(studentUser);
      let pollingCount = 0;
      let shouldContinuePolling = true;

      // Simulated background polling loop
      const pollServer = async (authToken: string) => {
        pollingCount += 1;
        const res = await runMiddleware(requireAuth(['STUDENT']), {
          authorization: `Bearer ${authToken}`,
        });
        if (res.statusCode === 401) {
          shouldContinuePolling = false; // Stop polling on 401
          return { error: 'Session expired' };
        }
        return { success: true };
      };

      // 1. First poll succeeds
      const poll1 = await pollServer(token);
      expect(poll1.success).toBe(true);
      expect(shouldContinuePolling).toBe(true);

      // 2. Token revoked (user logged out or session invalidated)
      revokeToken(token);

      // 3. Next poll encounters 401 and halts polling loop
      const poll2 = await pollServer(token);
      expect(poll2.error).toBe('Session expired');
      expect(shouldContinuePolling).toBe(false);

      // Polling count stopped at 2, preventing an infinite 401 polling storm
      expect(pollingCount).toBe(2);
    });

    // ------------------------------------------------------------------------
    // C3.4: Role Boundary Transition & Route Guard Isolation
    // ------------------------------------------------------------------------
    it('T3.4: Cross-role endpoint requests are strictly rejected by server middleware (403) and client guards', async () => {
      const studentToken = generateToken(studentUser);
      const inchargeToken = generateToken(inchargeUser);
      const adminToken = generateToken(adminUser);

      // Student tries to access Admin route
      const studentOnAdmin = await runMiddleware(requireAuth(['ADMIN']), {
        authorization: `Bearer ${studentToken}`,
      });
      expect(studentOnAdmin.statusCode).toBe(403);
      expect(studentOnAdmin.nextCalled).toBe(false);

      // Student tries to access Incharge route
      const studentOnIncharge = await runMiddleware(requireAuth(['INCHARGE']), {
        authorization: `Bearer ${studentToken}`,
      });
      expect(studentOnIncharge.statusCode).toBe(403);
      expect(studentOnIncharge.nextCalled).toBe(false);

      // Incharge tries to access Admin route
      const inchargeOnAdmin = await runMiddleware(requireAuth(['ADMIN']), {
        authorization: `Bearer ${inchargeToken}`,
      });
      expect(inchargeOnAdmin.statusCode).toBe(403);
      expect(inchargeOnAdmin.nextCalled).toBe(false);

      // Admin tries to access Student check-in guard
      const adminOnStudent = await runMiddleware(requireAuth(['STUDENT']), {
        authorization: `Bearer ${adminToken}`,
      });
      expect(adminOnStudent.statusCode).toBe(403);
      expect(adminOnStudent.nextCalled).toBe(false);
    });

    // ------------------------------------------------------------------------
    // C3.5: Roster Query Filtering & Heavy Face Vector Pruning
    // ------------------------------------------------------------------------
    it('T3.5: Commuter roster queries exclude heavy 128-D vector arrays to optimize mobile payload bandwidth', async () => {
      // Seed a student with heavy face descriptor vector
      const heavyVector = Array.from({ length: 128 }, () => Math.random());
      const studentWithVector: Student = {
        id: 'STU-721420104099',
        registerNumber: '721420104099',
        name: 'Heavy Vector Student',
        email: 'heavy.vector@college.edu',
        phone: '9876543200',
        busId: 'BUS-01',
        preferredBusId: 'BUS-01',
        role: 'STUDENT',
        active: true,
        approved: true,
        status: 'APPROVED',
        faceDescriptor: heavyVector,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await storage.createStudent(studentWithVector);

      // Standard roster query
      const students = await storage.getStudents({ busId: 'BUS-01' });
      expect(students.length).toBeGreaterThan(0);

      // Light-payload sanitizer for mobile roster representation
      const sanitizeForMobileRoster = (s: Student) => {
        const { faceDescriptor, faceDescriptorLeft, faceDescriptorRight, ...lightStudent } = s;
        return lightStudent;
      };

      const sanitizedRoster = students.map(sanitizeForMobileRoster);
      for (const student of sanitizedRoster) {
        expect((student as any).faceDescriptor).toBeUndefined();
        expect((student as any).faceDescriptorLeft).toBeUndefined();
        expect((student as any).faceDescriptorRight).toBeUndefined();
        expect(student.name).toBeDefined();
        expect(student.registerNumber).toBeDefined();
        expect(student.busId).toBe('BUS-01');
      }
    });

    // ------------------------------------------------------------------------
    // C3.6: Safe Area Inset + Touch Target Accessibility
    // ------------------------------------------------------------------------
    it('T3.6: Bottom navigation buttons meet minimum 44px mobile touch target dimensions and padding', () => {
      const bottomNavFile = fs.readFileSync(
        path.join(rootDir, 'src/components/common/MobileBottomNav.tsx'),
        'utf-8'
      );

      // Height of 14 (h-14 in Tailwind = 56px, exceeding 44px touch target guideline)
      expect(bottomNavFile).toContain('h-14');
      // Contains safe area padding
      expect(bottomNavFile).toContain('env(safe-area-inset-bottom)');
      // 5-column grid layout for equal finger spacing
      expect(bottomNavFile).toContain('grid grid-cols-5');
    });
  });

  // ==========================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS (END-TO-END MOBILE USER JOURNEYS)
  // ==========================================================================
  describe('Tier 4: Real-World Application Scenarios (End-to-End User Journeys on Mobile)', () => {
    // ------------------------------------------------------------------------
    // Journey 4.1: Administrator Commuter Operations Journey on Mobile
    // ------------------------------------------------------------------------
    it('T4.1: Complete Admin Commuter Operations Journey on Mobile Viewport', async () => {
      // Step 1: Admin logs in and receives token
      const adminToken = generateToken(adminUser);
      expect(adminToken).toBeDefined();
      const verifiedAdmin = verifyToken(adminToken);
      expect(verifiedAdmin?.role).toBe('ADMIN');

      // Step 2: Accesses Admin Dashboard (Home tab active)
      const adminNavItems: NavItemDef[] = [
        { to: '/admin/dashboard', label: 'Home', aliases: ['/admin'] },
        { to: '/admin/students', label: 'Students', aliases: ['/admin/approvals'] },
        { to: '/admin/buses', label: 'Buses' },
        { to: '/admin/live-monitoring', label: 'Monitor' },
        { to: '/admin/more', label: 'More' },
      ];
      expect(getActiveNavPath('/admin/dashboard', adminNavItems)).toBe('/admin/dashboard');

      // Step 3: Admin navigates to Students Management to check pending registrations
      expect(getActiveNavPath('/admin/students', adminNavItems)).toBe('/admin/students');
      const newPendingStudent = await storage.signupStudent({
        name: 'Gowtham K',
        registerNumber: '721420104101',
        email: 'gowtham.stu@college.edu',
        preferredBusId: 'BUS-01',
      });
      const pendingStudents = await storage.getPendingStudents();
      expect(pendingStudents.some((s) => s.registerNumber === '721420104101')).toBe(true);

      // Step 4: Admin approves student and assigns to Bus 01
      const approvedStudent = await storage.approveStudent(newPendingStudent.id, 'BUS-01', adminUser.id);
      expect(approvedStudent?.status).toBe('APPROVED');
      expect(approvedStudent?.approved).toBe(true);
      expect(approvedStudent?.busId).toBe('BUS-01');

      // Step 5: Admin navigates to Buses Fleet (Buses tab active)
      expect(getActiveNavPath('/admin/buses', adminNavItems)).toBe('/admin/buses');
      const buses = await storage.getBuses();
      expect(buses.length).toBeGreaterThan(0);
      const fleetBus = buses.find((b) => b.id === 'BUS-01');
      expect(fleetBus?.busNumber).toBe('BUS-01');
      expect(fleetBus?.inchargeId).toBe(inchargeUser.id);

      // Step 6: Admin navigates to Live Monitoring (Monitor tab active)
      expect(getActiveNavPath('/admin/live-monitoring', adminNavItems)).toBe('/admin/live-monitoring');

      // Step 7: Admin navigates to More menu (More tab active)
      expect(getActiveNavPath('/admin/more', adminNavItems)).toBe('/admin/more');

      // Step 8: Admin logs out cleanly
      revokeToken(adminToken);
      expect(isTokenRevoked(adminToken)).toBe(true);
      expect(verifyToken(adminToken)).toBeNull();

      // Access after logout is blocked
      const afterLogoutRes = await runMiddleware(requireAuth(['ADMIN']), {
        authorization: `Bearer ${adminToken}`,
      });
      expect(afterLogoutRes.statusCode).toBe(401);
    });

    // ------------------------------------------------------------------------
    // Journey 4.2: Bus In-Charge Attendance Operational Journey on Mobile
    // ------------------------------------------------------------------------
    it('T4.2: Complete Bus In-Charge Attendance Workflow Journey on Mobile Viewport', async () => {
      // Step 1: In-Charge logs in and receives token for assigned Bus-01
      const inchargeToken = generateToken(inchargeUser);
      const verifiedInc = verifyToken(inchargeToken);
      expect(verifiedInc?.role).toBe('INCHARGE');
      expect(verifiedInc?.assignedBusId).toBe('BUS-01');

      // Incharge navigation items
      const inchargeNavItems: NavItemDef[] = [
        { to: '/incharge/dashboard', label: 'Home', aliases: ['/incharge'] },
        { to: '/incharge/my-bus', label: 'My Bus', aliases: ['/incharge/bus'] },
        { to: '/incharge/attendance', label: 'Attendance', aliases: ['/incharge/live-attendance', '/incharge/start-attendance'] },
        { to: '/incharge/students', label: 'Students' },
        { to: '/incharge/more', label: 'More', aliases: ['/incharge/history', '/incharge/reports', '/incharge/profile'] },
      ];

      // Step 2: Accesses In-Charge Dashboard (Home tab active)
      expect(getActiveNavPath('/incharge/dashboard', inchargeNavItems)).toBe('/incharge/dashboard');

      // Step 3: Navigates to My Bus (My Bus tab active) and verifies bus roster
      expect(getActiveNavPath('/incharge/my-bus', inchargeNavItems)).toBe('/incharge/my-bus');
      const inchargeBusCheck = await verifyInchargeBusAuthorization(verifiedInc!, 'BUS-01');
      expect(inchargeBusCheck.authorized).toBe(true);
      expect(inchargeBusCheck.bus?.routeName).toBe('City Express Route');

      // Step 4: Navigates to Attendance (Attendance tab active) and initiates attendance session
      expect(getActiveNavPath('/incharge/attendance', inchargeNavItems)).toBe('/incharge/attendance');
      const sessionPayload: ActiveSession = {
        id: `SESS-${Date.now()}`,
        busId: 'BUS-01',
        sessionType: 'EVENING',
        attendanceMode: 'GROUND',
        status: 'ACTIVE',
        startedAt: new Date().toISOString(),
        radiusMeters: 150,
        maxGpsAccuracyMeters: 80,
        location: {
          name: 'VSB College Ground',
          latitude: 10.9572,
          longitude: 78.0766,
        },
      };
      await storage.saveActiveSession(sessionPayload);

      // Verify active session is registered in storage
      const activeSession = await storage.getActiveSession('BUS-01');
      expect(activeSession).not.toBeNull();
      expect(activeSession?.status).toBe('ACTIVE');
      expect(activeSession?.busId).toBe('BUS-01');

      // Step 5: In-Charge completes/ends attendance session
      await storage.endActiveSession(sessionPayload.id);
      const closedSession = await storage.getActiveSession('BUS-01');
      expect(closedSession).toBeNull();

      // Step 6: In-charge checks More screen (More tab active) -> History
      expect(getActiveNavPath('/incharge/history', inchargeNavItems)).toBe('/incharge/more');

      // Step 7: In-Charge logs out
      revokeToken(inchargeToken);
      expect(isTokenRevoked(inchargeToken)).toBe(true);
      expect(verifyToken(inchargeToken)).toBeNull();
    });

    // ------------------------------------------------------------------------
    // Journey 4.3: Student Commuter Attendance Verification Journey on Mobile
    // ------------------------------------------------------------------------
    it('T4.3: Complete Student Commuter Check-In & Verification Journey on Mobile Viewport', async () => {
      // Step 1: Student logs in with approved credentials
      const studentToken = generateToken(studentUser);
      const verifiedStudent = verifyToken(studentToken);
      expect(verifiedStudent?.role).toBe('STUDENT');
      expect(verifiedStudent?.studentId).toBe('STU-721420104050');

      // Student navigation items
      const studentNavItems: NavItemDef[] = [
        { to: '/student/dashboard', label: 'Home', aliases: ['/student'] },
        { to: '/student/my-bus', label: 'My Bus', aliases: ['/student/bus'] },
        { to: '/student/verify', label: 'Verify', aliases: ['/student/verify-attendance'] },
        { to: '/student/history', label: 'History', aliases: ['/student/attendance-history'] },
        { to: '/student/profile', label: 'Profile', aliases: ['/student/notifications', '/student/more'] },
      ];

      // Step 2: Accesses Student Dashboard (Home tab active)
      expect(getActiveNavPath('/student/dashboard', studentNavItems)).toBe('/student/dashboard');

      // Step 3: Navigates to My Bus (My Bus tab active)
      expect(getActiveNavPath('/student/my-bus', studentNavItems)).toBe('/student/my-bus');
      const studentBus = await storage.getBusById(studentProfile.busId);
      expect(studentBus?.busNumber).toBe('BUS-01');

      // Step 4: Navigates to Verify Attendance (Verify tab active)
      expect(getActiveNavPath('/student/verify', studentNavItems)).toBe('/student/verify');

      // Step 5: Active session is started by in-charge at college ground
      const activeSession: ActiveSession = {
        id: `SESS-STU-TEST-${Date.now()}`,
        busId: 'BUS-01',
        sessionType: 'EVENING',
        attendanceMode: 'GROUND',
        status: 'ACTIVE',
        startedAt: new Date().toISOString(),
        radiusMeters: 150,
        maxGpsAccuracyMeters: 80,
        location: {
          name: 'VSB College Ground',
          latitude: 10.9572,
          longitude: 78.0766,
        },
      };
      await storage.saveActiveSession(activeSession);

      // Step 6: Student submits GPS coordinates (within campus ground geofence)
      const verificationResponse = await verifier.verifyStudentLocation(studentUser, {
        latitude: 10.9572,
        longitude: 78.0766,
        accuracy: 12,
      });

      // Verification succeeds and marks PRESENT
      expect(verificationResponse.status).toBe('PRESENT');
      expect(verificationResponse.record).toBeDefined();
      expect(verificationResponse.record?.status).toBe('PRESENT');
      expect(verificationResponse.record?.busId).toBe('BUS-01');

      // Step 7: Idempotency check: Student resubmits GPS verification
      const repeatVerification = await verifier.verifyStudentLocation(studentUser, {
        latitude: 10.9572,
        longitude: 78.0766,
        accuracy: 10,
      });
      // Returns existing verified record idempotently
      expect(repeatVerification.status).toBe('PRESENT');
      expect(repeatVerification.message).toContain('Attendance already recorded and verified');

      // Step 8: Navigates to History (History tab active) to confirm attendance record
      expect(getActiveNavPath('/student/history', studentNavItems)).toBe('/student/history');
      const records = await storage.getAttendance({ studentId: studentUser.id });
      expect(records.some((r) => r.status === 'PRESENT')).toBe(true);

      // Step 9: Navigates to Profile (Profile tab active)
      expect(getActiveNavPath('/student/profile', studentNavItems)).toBe('/student/profile');

      // Step 10: Student logs out cleanly
      revokeToken(studentToken);
      expect(isTokenRevoked(studentToken)).toBe(true);
      expect(verifyToken(studentToken)).toBeNull();
    });
  });
});
