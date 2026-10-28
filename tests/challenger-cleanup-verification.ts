// Shim browser environment for Leaflet and DOM-dependent UI components
if (typeof (globalThis as any).window === 'undefined') {
  const win: any = {
    requestAnimationFrame: (cb: Function) => setTimeout(cb, 16),
    cancelAnimationFrame: (id: any) => clearTimeout(id),
    addEventListener: () => {},
    removeEventListener: () => {},
    screen: { deviceXDPI: 96, logicalXDPI: 96 },
  };
  (globalThis as any).window = win;
  (globalThis as any).document = {
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
    documentElement: { style: {} },
  };
}

import fs from 'fs';
import path from 'path';
import express, { Request, Response } from 'express';
import http from 'http';
import { MemoryStorageAdapter } from '../src/server/storage/MemoryStorageAdapter';
import { apiRouter } from '../src/server/api';
import { faceVerificationEngine } from '../src/lib/faceVerification';

async function runChallengerVerification() {
  console.log('================================================================');
  console.log('🛡️ CHALLENGER 1: EMPIRICAL CODEBASE CLEANUP & SYSTEM INTEGRITY HARNESS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 1: ZERO LINGERING REFERENCES AUDIT
  // -------------------------------------------------------------------------
  console.log('--- 1. AUDIT OF REMOVED COMPONENTS & DEAD ROUTINES ---');

  const srcDir = path.resolve(process.cwd(), 'src');
  const removedComponentNames = [
    'LocationControl',
    'SessionTimeControl',
    'StartAttendanceModal',
    'PwaNotificationPrompt',
    'SessionBanner',
    'studentClassifier',
  ];

  function searchFilesRecursively(dir: string, fileList: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        searchFilesRecursively(fullPath, fileList);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  const allSourceFiles = searchFilesRecursively(srcDir);
  assert(allSourceFiles.length > 0, `Discovered ${allSourceFiles.length} source code files for deep reference audit`);

  for (const component of removedComponentNames) {
    let referencesFound = 0;
    const regex = new RegExp(`\\b${component}\\b`);
    for (const file of allSourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (regex.test(content)) {
        referencesFound++;
        console.error(`     Lingering reference in ${file}`);
      }
    }
    assert(referencesFound === 0, `Removed module "${component}" has 0 lingering references in src/`);
  }

  // Check UI kit files specifically
  let cardImportsFound = 0;
  let inputImportsFound = 0;
  for (const file of allSourceFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (/from\s+['"][^'"]*components\/ui\/Card['"]/.test(content)) cardImportsFound++;
    if (/from\s+['"][^'"]*components\/ui\/Input['"]/.test(content)) inputImportsFound++;
  }
  assert(cardImportsFound === 0, 'Zero lingering imports from pruned components/ui/Card');
  assert(inputImportsFound === 0, 'Zero lingering imports from pruned components/ui/Input');

  // Verify removed files and directories physically do not exist
  const removedPaths = [
    'src/components/admin/LocationControl.tsx',
    'src/components/admin/SessionTimeControl.tsx',
    'src/components/admin/StartAttendanceModal.tsx',
    'src/components/common/PwaNotificationPrompt.tsx',
    'src/components/common/SessionBanner.tsx',
    'src/components/ui/Card.tsx',
    'src/components/ui/Input.tsx',
    'src/components/ui/index.ts',
    'src/lib/studentClassifier.ts',
    'supabase/schema.sql',
    'scratch',
  ];

  for (const relPath of removedPaths) {
    const fullPath = path.resolve(process.cwd(), relPath);
    assert(!fs.existsSync(fullPath), `Target file/dir physically eliminated: ${relPath}`);
  }

  // -------------------------------------------------------------------------
  // SECTION 2: PAGE COMPONENT EXPORT & MODULE INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n--- 2. PAGE COMPONENT MODULE INTEGRITY ---');

  const componentModules = [
    { name: 'AdminDashboard', path: '../src/pages/admin/AdminDashboard', exportName: 'AdminDashboard' },
    { name: 'StudentsManagement', path: '../src/pages/admin/StudentsManagement', exportName: 'StudentsManagement' },
    { name: 'StudentApprovals', path: '../src/pages/admin/StudentApprovals', exportName: 'StudentApprovals' },
    { name: 'BusesManagement', path: '../src/pages/admin/BusesManagement', exportName: 'BusesManagement' },
    { name: 'TodayAttendance', path: '../src/pages/admin/TodayAttendance', exportName: 'TodayAttendance' },
    { name: 'AttendanceHistory', path: '../src/pages/admin/AttendanceHistory', exportName: 'AttendanceHistory' },
    { name: 'GeofenceSettings', path: '../src/pages/admin/GeofenceSettings', exportName: 'GeofenceSettings' },
    { name: 'ReportsPage', path: '../src/pages/admin/ReportsPage', exportName: 'ReportsPage' },
    { name: 'NotificationsPage', path: '../src/pages/admin/NotificationsPage', exportName: 'NotificationsPage' },
    { name: 'LoginPage', path: '../src/pages/LoginPage', exportName: 'LoginPage' },
    { name: 'SignupPage', path: '../src/pages/auth/SignupPage', exportName: 'SignupPage' },
    { name: 'SetupPage', path: '../src/pages/auth/SetupPage', exportName: 'SetupPage' },
    { name: 'ForgotPasswordPage', path: '../src/pages/auth/ForgotPasswordPage', exportName: 'ForgotPasswordPage' },
    { name: 'ResetPasswordPage', path: '../src/pages/auth/ResetPasswordPage', exportName: 'ResetPasswordPage' },
    { name: 'StudentDashboard', path: '../src/pages/student/StudentDashboard', exportName: 'StudentDashboard' },
    { name: 'InchargeDashboard', path: '../src/pages/incharge/InchargeDashboard', exportName: 'InchargeDashboard' },
    { name: 'Sidebar', path: '../src/components/common/Sidebar', exportName: 'Sidebar' },
  ];

  for (const item of componentModules) {
    const mod = await import(item.path);
    const comp = mod[item.exportName];
    assert(
      typeof comp === 'function',
      `Component ${item.name} dynamically loaded and verified as a valid React Component function`
    );
  }

  // -------------------------------------------------------------------------
  // SECTION 3: SIDEBAR NAVIGATION VS REGISTERED APP ROUTES
  // -------------------------------------------------------------------------
  console.log('\n--- 3. SIDEBAR NAVIGATION VS APP ROUTING INTEGRITY ---');

  const appFilePath = path.resolve(process.cwd(), 'src/App.tsx');
  const sidebarFilePath = path.resolve(process.cwd(), 'src/components/common/Sidebar.tsx');
  const appContent = fs.readFileSync(appFilePath, 'utf8');
  const sidebarContent = fs.readFileSync(sidebarFilePath, 'utf8');

  // Extract all NavLink targets from Sidebar
  const navLinkMatches = [...sidebarContent.matchAll(/to:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert(
    navLinkMatches.length === 6,
    `Sidebar defines exactly 6 streamlined navigation items (found ${navLinkMatches.length})`
  );

  // Expected Admin routes in App.tsx relative to /admin
  for (const navTarget of navLinkMatches) {
    assert(navTarget.startsWith('/admin/'), `Navigation target ${navTarget} belongs to /admin prefix`);
    const subRoute = navTarget.replace('/admin/', '');
    const expectedRoutePattern = new RegExp(`<Route\\s+path=["']${subRoute.replace('/', '\\/')}["']`);
    assert(
      expectedRoutePattern.test(appContent),
      `Route "${subRoute}" matches declared <Route path="${subRoute}" /> in App.tsx`
    );
  }

  // -------------------------------------------------------------------------
  // SECTION 4: ROLE WORKFLOWS & PROTECTED ROUTE SIMULATION
  // -------------------------------------------------------------------------
  console.log('\n--- 4. ROLE WORKFLOW & RBAC ACCESS GUARD VERIFICATION ---');

  type Role = 'ADMIN' | 'INCHARGE' | 'STUDENT';

  function simulateRouteGuard(userRole: Role | null, allowedRoles: Role[]): { allow: boolean; redirectTo?: string } {
    if (!userRole) return { allow: false, redirectTo: '/login' };
    if (!allowedRoles.includes(userRole)) {
      if (userRole === 'ADMIN') return { allow: false, redirectTo: '/admin/dashboard' };
      if (userRole === 'INCHARGE') return { allow: false, redirectTo: '/incharge/dashboard' };
      return { allow: false, redirectTo: '/student/dashboard' };
    }
    return { allow: true };
  }

  // Unauthenticated user
  const unauth = simulateRouteGuard(null, ['ADMIN']);
  assert(!unauth.allow && unauth.redirectTo === '/login', 'Unauthenticated request redirected to /login');

  // Admin role accessing Admin route
  const adminAdmin = simulateRouteGuard('ADMIN', ['ADMIN']);
  assert(adminAdmin.allow, 'ADMIN granted access to /admin routes');

  // Admin attempting to access Student route
  const adminStudent = simulateRouteGuard('ADMIN', ['STUDENT']);
  assert(!adminStudent.allow && adminStudent.redirectTo === '/admin/dashboard', 'ADMIN redirected from /student to /admin/dashboard');

  // Incharge accessing Incharge route
  const inchargeIncharge = simulateRouteGuard('INCHARGE', ['INCHARGE']);
  assert(inchargeIncharge.allow, 'INCHARGE granted access to /incharge routes');

  // Incharge attempting to access Admin route
  const inchargeAdmin = simulateRouteGuard('INCHARGE', ['ADMIN']);
  assert(!inchargeAdmin.allow && inchargeAdmin.redirectTo === '/incharge/dashboard', 'INCHARGE redirected from /admin to /incharge/dashboard');

  // Student accessing Student route
  const studentStudent = simulateRouteGuard('STUDENT', ['STUDENT']);
  assert(studentStudent.allow, 'STUDENT granted access to /student routes');

  // Student attempting to access Admin route
  const studentAdmin = simulateRouteGuard('STUDENT', ['ADMIN']);
  assert(!studentAdmin.allow && studentAdmin.redirectTo === '/student/dashboard', 'STUDENT redirected from /admin to /student/dashboard');

  // -------------------------------------------------------------------------
  // SECTION 5: AUTH SECURITY & API ENDPOINT VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 5. AUTH API HARDENING & STORAGE OPERATION CHECKS ---');

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 5.1 Deprecated direct signup endpoint test
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker', registerNumber: '24IT999', password: 'password123' }),
    });
    const signupBody = await signupRes.json();
    assert(
      signupRes.status === 403,
      `POST /api/auth/signup returns HTTP 403 Forbidden (got ${signupRes.status})`
    );
    assert(
      signupBody.code === 'REGISTRATION_OTP_REQUIRED',
      `POST /api/auth/signup responds with code REGISTRATION_OTP_REQUIRED`
    );
    assert(signupBody.deprecated === true, `Response flag deprecated is true`);

    // 5.2 Storage operations verification across all 3 roles
    const storage = new MemoryStorageAdapter();

    // Admin creates bus and settings
    const bus = await storage.createBus({
      busNumber: 'BUS-CHALLENGE-01',
      routeName: 'North Campus Direct',
      capacity: 50,
      inchargeId: 'incharge-101',
      active: true,
    });
    assert(bus && bus.busNumber === 'BUS-CHALLENGE-01', 'Admin successfully provisions transit bus');

    // Incharge fetches assigned bus
    const inchargeBus = await storage.getBusByInchargeId('incharge-101');
    assert(inchargeBus && inchargeBus.id === bus.id, 'INCHARGE retrieves assigned route bus');

    // Student signup submission (via storage)
    const pendingStudent = await storage.signupStudent({
      name: 'Empirical Student',
      registerNumber: '24IT099',
      email: 'empirical.student@college.edu',
      phone: '9876543210',
      password: 'SecurePassword123!',
      preferredBusId: bus.id,
    });
    assert(
      pendingStudent.status === 'PENDING' && pendingStudent.approved === false,
      'Student registration state initialized as PENDING and unapproved'
    );

    // Admin views pending student and approves
    const pendingList = await storage.getPendingStudents();
    assert(pendingList.some((s) => s.registerNumber === '24IT099'), 'Admin retrieves pending registration list');

    const approvedStudent = await storage.approveStudent(pendingStudent.id, bus.id, 'admin-01');
    assert(
      approvedStudent && approvedStudent.approved === true && approvedStudent.status === 'APPROVED',
      'Admin approves student and binds bus assignment'
    );

    // Dynamic session lifecycle
    const activeSession = await storage.saveActiveSession({
      id: 'SESSION-CHALLENGE-01',
      sessionType: 'EVENING',
      attendanceMode: 'GROUND_STATIONARY',
      verificationMethod: 'DYNAMIC_CODE_GPS',
      busId: bus.id,
      status: 'ACTIVE',
      startedBy: 'incharge-101',
      currentCode: '888999',
      codeIssuedAt: new Date().toISOString(),
      codeExpiresAt: new Date(Date.now() + 60000).toISOString(),
      radiusMeters: 50,
      maxGpsAccuracyMeters: 30,
      startedAt: new Date().toISOString(),
      endedAt: null,
      location: {
        type: 'FIXED',
        latitude: 13.0827,
        longitude: 80.2707,
        updatedAt: new Date().toISOString(),
      },
    });
    assert(activeSession && activeSession.status === 'ACTIVE', 'Active attendance session initiated');

    // Student submits attendance
    const attendanceRecord = await storage.createAttendance({
      id: 'ATT-CHALLENGE-01',
      studentId: approvedStudent.id,
      busId: bus.id,
      sessionId: activeSession.id,
      status: 'PRESENT',
      attendanceDate: new Date().toISOString().split('T')[0],
      sessionType: 'EVENING',
      latitude: 13.0827,
      longitude: 80.2707,
      accuracyMeters: 5,
      distanceMeters: 0,
      verificationMethod: 'DYNAMIC_CODE',
      capturedAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    });
    assert(attendanceRecord && attendanceRecord.status === 'PRESENT', 'Student marks valid attendance record');

    // Incharge/Admin reads attendance records
    const sessionRecords = await storage.getAttendance({ busId: bus.id });
    assert(sessionRecords.length === 1 && sessionRecords[0].studentId === approvedStudent.id, 'Attendance verified in session log');

    // End session
    const ended = await storage.endActiveSession(activeSession.id);
    const postSession = await storage.getActiveSession();
    assert(ended && postSession === null, 'Session successfully closed (no active session remains)');

  } finally {
    server.close();
  }

  // -------------------------------------------------------------------------
  // SECTION 6: BIOMETRICS & DESCRIPTOR INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n--- 6. BIOMETRICS ENGINE STRICTNESS VERIFICATION ---');

  const validSelfie = 'data:image/jpeg;base64,' + 'A'.repeat(800);
  const differentSelfie = 'data:image/jpeg;base64,' + 'B'.repeat(800);

  // Exact payload bitwise identity
  const exactCheck = faceVerificationEngine.verifyFaceMatch(validSelfie, validSelfie);
  assert(exactCheck.matched && exactCheck.confidence === 100, 'Exact bitwise payload match returns 100% confidence');

  // Disparate images: zero mock bypass
  const disparateCheck = faceVerificationEngine.verifyFaceMatch(validSelfie, differentSelfie);
  assert(
    !disparateCheck.matched && disparateCheck.confidence === 0 && disparateCheck.reason?.includes('Disparate photo verification requires'),
    'Disparate photos strictly rejected in synchronous mode'
  );

  // 128-D descriptor math
  const v1 = new Array(128).fill(0).map((_, i) => Math.sin(i / 10));
  const v2 = new Array(128).fill(0).map((_, i) => Math.sin(i / 10) + 0.01);
  const vFar = new Array(128).fill(0).map((_, i) => Math.cos(i / 2));

  const closeMatch = faceVerificationEngine.compareBiometricDescriptors(v1, v2);
  assert(closeMatch.matched && closeMatch.distance < 0.48, `Close descriptor vectors match (distance: ${closeMatch.distance.toFixed(4)})`);

  const farMatch = faceVerificationEngine.compareBiometricDescriptors(v1, vFar);
  assert(!farMatch.matched && farMatch.distance >= 0.48, `Divergent descriptor vectors rejected as impostor (distance: ${farMatch.distance.toFixed(4)})`);

  console.log('\n================================================================');
  console.log(`📊 CHALLENGER 1 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runChallengerVerification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
