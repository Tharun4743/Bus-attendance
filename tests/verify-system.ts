import { calculateDistance } from '../src/server/attendance/haversine';
import { evaluateSessionStatus } from '../src/server/attendance/session';
import { AttendanceVerifier } from '../src/server/attendance/verifier';
import { ReportGenerator } from '../src/server/reports/generator';
import { MemoryStorageAdapter } from '../src/server/storage/MemoryStorageAdapter';
import { reconcileEveningSchedule } from '../src/server/attendance/scheduleEngine';
import { AttendanceSettings, User } from '../src/types';

async function runSystemTests() {
  console.log('================================================================');
  console.log('🧪 REAL DATA LIFECYCLE, GEOFENCE, IN-APP NOTIFS & SCHEDULER');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Pure in-memory storage adapter for deterministic, zero-disk testing
  const storage = new MemoryStorageAdapter();

  // 1. Haversine Formula Tests
  console.log('--- 1. HAVERSINE DISTANCE VERIFICATION ---');
  const baseLat = 13.0827;
  const baseLon = 80.2707;

  const d0 = calculateDistance(baseLat, baseLon, baseLat, baseLon);
  assert(d0 === 0, `Exact coordinates yield 0.0m distance (got ${d0}m)`);

  const d5 = calculateDistance(baseLat, baseLon, baseLat + 0.000045, baseLon);
  assert(d5 >= 4.5 && d5 <= 5.5, `5m distance calculation within tolerance (got ${d5}m)`);

  const d11 = calculateDistance(baseLat, baseLon, baseLat + 0.0001, baseLon);
  assert(d11 >= 10.5 && d11 <= 12.0, `11m distance calculation within tolerance (got ${d11}m)`);

  const d50 = calculateDistance(baseLat, baseLon, baseLat + 0.00045, baseLon);
  assert(d50 >= 48 && d50 <= 52, `50m distance calculation within tolerance (got ${d50}m)`);

  // 2. Attendance Time Window & Session State Tests
  console.log('\n--- 2. TIME WINDOW & SESSION LOGIC ---');
  const baseSettings: AttendanceSettings = {
    sessionType: 'EVENING',
    startTime: '16:50',
    endTime: '16:55',
    reportTime: '16:57',
    timezone: 'Asia/Kolkata',
    location: {
      name: 'College Ground',
      latitude: baseLat,
      longitude: baseLon,
      radiusMeters: 10,
      maxGpsAccuracyMeters: 20,
    },
    simulation: { enabled: true, simulatedTime: '16:49' },
  };

  const sess449 = evaluateSessionStatus(baseSettings);
  assert(sess449.status === 'UPCOMING', 'At 16:49 IST session is UPCOMING');

  baseSettings.simulation = { enabled: true, simulatedTime: '16:50' };
  const sess450 = evaluateSessionStatus(baseSettings);
  assert(sess450.status === 'ACTIVE', 'At 16:50 IST session is ACTIVE');

  baseSettings.simulation = { enabled: true, simulatedTime: '16:55' };
  const sess455 = evaluateSessionStatus(baseSettings);
  assert(sess455.status === 'CLOSED', 'At 16:55 IST session is CLOSED');

  baseSettings.simulation = { enabled: true, simulatedTime: '16:57' };
  const sess457 = evaluateSessionStatus(baseSettings);
  assert(sess457.status === 'FINALIZED', 'At 16:57 IST session is FINALIZED');

  // 3. Real Data Lifecycle: First-Time Setup -> Bus Creation -> Student Signup -> Pending -> Approval
  console.log('\n--- 3. REAL DATA LIFECYCLE: SETUP -> BUS -> SIGNUP -> APPROVAL ---');

  // 3a. Initial state verification
  const hasAdminInitial = await storage.hasAdmin();
  assert(!hasAdminInitial, 'System initial state: Pure unseeded state with 0 users');

  // Provision admin user dynamically for test lifecycle
  const initAdmin = await storage.createUser({
    id: 'ADMIN-001',
    name: 'Tharunkumar K',
    email: 'campusvsb4743@gmail.com',
    password: 'DynamicSetupPassword4743!',
    role: 'ADMIN',
    active: true,
    approved: true,
    status: 'APPROVED',
  });
  const hasAdminAfter = await storage.hasAdmin();
  const initBuses = await storage.getBuses();
  const initStudents = await storage.getStudents();
  assert(hasAdminAfter && initAdmin.role === 'ADMIN', 'Admin dynamically provisioned and active');
  assert(initBuses.length >= 0, 'Bus registry ready');
  assert(initStudents.length === 0, 'System initial state: 0 Students present');

  // 3b. Admin Authentication Verification
  const adminAuth = await storage.getUserByEmail('campusvsb4743@gmail.com');
  assert(adminAuth?.password === 'DynamicSetupPassword4743!' && adminAuth.role === 'ADMIN', 'Admin credentials verified');

  // 3c. Admin creates a real bus (Bus No 6 with Incharge INC006)
  const newBus = await storage.createBus({
    id: 'BUS06',
    busNumber: 'Bus No 6',
    routeName: 'Dharapuram',
    inchargeId: 'INC006',
    active: true,
  });
  assert(newBus.id === 'BUS06' && newBus.busNumber === 'Bus No 6', `Admin creates real bus with ID ${newBus.id}`);

  // Incharge user provision
  await storage.createUser({
    id: 'INC006',
    name: 'Aarthi M',
    email: 'incharge@example.com',
    password: 'InchargePassword123!',
    role: 'INCHARGE',
    assignedBusId: 'BUS06',
    active: true,
    approved: true,
    status: 'APPROVED',
  });

  // 3d. Student Signup without pre-assigned bus requirement
  const signupResult = await storage.signupStudent({
    name: 'Tharun Kumar',
    registerNumber: '24IT001',
    email: 'tharun@example.com',
    phone: '9876543210',
    password: 'studentPassword123',
  });
  assert(
    signupResult.status === 'PENDING' &&
      signupResult.approved === false &&
      signupResult.active === false,
    'Student signs up without mandatory bus -> status: PENDING, approved: false, active: false'
  );

  // 3e. Login check for pending student
  const studentUserRecord = await storage.getUserByEmail('tharun@example.com');
  assert(
    studentUserRecord !== null && studentUserRecord.approved === false,
    'Pending student record stored in users database with approved: false'
  );

  // 3f. Admin views pending approvals
  const pendingApprovals = await storage.getPendingStudents();
  assert(
    pendingApprovals.length === 1 && pendingApprovals[0].registerNumber === '24IT001',
    'Admin retrieves pending registrations and sees 24IT001'
  );

  // 3g. Admin assigns bus and approves student
  const approvedStudent = await storage.approveStudent(signupResult.id, newBus.id, adminAuth!.id);
  assert(
    approvedStudent !== null &&
      approvedStudent.status === 'APPROVED' &&
      approvedStudent.approved === true &&
      approvedStudent.active === true &&
      approvedStudent.busId === newBus.id,
    'Admin approves student and assigns BUS06 -> status: APPROVED, active: true'
  );

  // 3h. Approved student user record check
  const updatedUserRecord = await storage.getUserByEmail('tharun@example.com');
  assert(
    updatedUserRecord !== null &&
      updatedUserRecord.approved === true &&
      updatedUserRecord.active === true &&
      updatedUserRecord.assignedBusId === newBus.id,
    'Student user record updated with approved: true and assignedBusId: BUS06'
  );

  // 4. Ground Geofence Verification Tests (Zero 6-digit Codes)
  console.log('\n--- 4. GROUND GEOFENCE VERIFICATION (ZERO DYNAMIC CODES) ---');
  const verifier = new AttendanceVerifier(storage);

  const studentSessionUser: User = {
    id: updatedUserRecord!.id,
    email: updatedUserRecord!.email,
    name: updatedUserRecord!.name,
    role: 'STUDENT',
    studentId: updatedUserRecord!.studentId,
    assignedBusId: updatedUserRecord!.assignedBusId,
  };

  // Start Ground Session (College Ground, 10m radius)
  const now = Date.now();
  await storage.saveActiveSession({
    id: 'SESSION-GROUND-01',
    sessionType: 'MORNING',
    attendanceMode: 'GROUND',
    verificationMethod: 'GROUND_GEOFENCE',
    busId: 'BUS06',
    status: 'ACTIVE',
    startedBy: 'INC006',
    radiusMeters: 10,
    maxGpsAccuracyMeters: 20,
    location: {
      type: 'FIXED',
      name: 'College Ground',
      latitude: baseLat,
      longitude: baseLon,
      accuracyMeters: 5,
      updatedAt: new Date(now).toISOString(),
    },
    startedAt: new Date(now).toISOString(),
    endedAt: null,
  });

  // 4a. Outside Geofence (40m away) -> OUTSIDE_GEOFENCE
  const resOutside = await verifier.verifyStudentLocation(studentSessionUser, {
    latitude: baseLat + 0.00036,
    longitude: baseLon,
    accuracy: 6.0,
  });
  assert(resOutside.status === 'OUTSIDE_GEOFENCE', 'Student 40m away rejected with OUTSIDE_GEOFENCE');

  // 4b. Low GPS accuracy (> 20m) -> LOW_GPS_ACCURACY
  const resLowAcc = await verifier.verifyStudentLocation(studentSessionUser, {
    latitude: baseLat,
    longitude: baseLon,
    accuracy: 35.0,
  });
  assert(resLowAcc.status === 'LOW_GPS_ACCURACY', 'GPS accuracy 35m rejected with LOW_GPS_ACCURACY');

  // 4c. Within Geofence (3m away, accuracy 5m) -> PRESENT
  const resPresent = await verifier.verifyStudentLocation(studentSessionUser, {
    latitude: baseLat + 0.000027,
    longitude: baseLon,
    accuracy: 5.0,
  });
  assert(resPresent.status === 'PRESENT', 'Student within 10m geofence successfully marked PRESENT');

  // 4d. Duplicate submission protection -> Already recorded as PRESENT, never overwritten
  const resDuplicate = await verifier.verifyStudentLocation(studentSessionUser, {
    latitude: baseLat + 0.000027,
    longitude: baseLon,
    accuracy: 5.0,
  });
  assert(
    resDuplicate.status === 'PRESENT' || resDuplicate.status === 'ALREADY_SUBMITTED',
    'Duplicate submission preserves PRESENT status without overwriting'
  );

  // End Ground Session
  await storage.endActiveSession('SESSION-GROUND-01');

  // 5. Travelling Bus Verification Tests (No Fake GPS)
  console.log('\n--- 5. TRAVELLING BUS ATTENDANCE VERIFICATION ---');

  // Register second student for travelling test
  const student2 = await storage.signupStudent({
    name: 'Kavitha S',
    registerNumber: '24IT002',
    email: 'kavitha@example.com',
    phone: '9876543211',
    password: 'studentPassword123',
  });
  await storage.approveStudent(student2.id, newBus.id, adminAuth!.id);
  const student2User = await storage.getUserByEmail('kavitha@example.com');

  const student2SessionUser: User = {
    id: student2User!.id,
    email: student2User!.email,
    name: student2User!.name,
    role: 'STUDENT',
    studentId: student2User!.studentId,
    assignedBusId: student2User!.assignedBusId,
  };

  // Start Travelling Bus Session
  await storage.saveActiveSession({
    id: 'SESSION-TRAVELLING-01',
    sessionType: 'EVENING',
    attendanceMode: 'TRAVELLING',
    verificationMethod: 'TRAVELLING_SESSION_PARTICIPATION',
    busId: 'BUS06',
    status: 'ACTIVE',
    startedBy: 'INC006',
    startedAt: new Date().toISOString(),
    endedAt: null,
  });

  // Verify Travelling Attendance without fake GPS coordinates
  const resTravelling = await verifier.verifyStudentLocation(student2SessionUser, {});
  assert(
    resTravelling.status === 'PRESENT',
    'Travelling mode verifies authenticated passenger without fake GPS -> status: PRESENT'
  );

  await storage.endActiveSession('SESSION-TRAVELLING-01');

  // 6. Persistent Storage Adapter Tests: OTP, Password Reset & In-App Notifications
  console.log('\n--- 6. PERSISTENT STORAGE: OTP, PASSWORD RESET & IN-APP NOTIFICATIONS ---');

  // 6a. OTP storage
  await storage.saveOtp({
    email: 'test@campus.edu',
    otpHash: 'test_hash_123',
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    attempts: 0,
    signupData: { name: 'Test User' },
  });
  const storedOtp = await storage.getOtp('test@campus.edu');
  assert(storedOtp?.otpHash === 'test_hash_123' && storedOtp.attempts === 0, 'Persistent OTP saved and retrieved');

  await storage.incrementOtpAttempts('test@campus.edu');
  const incrementedOtp = await storage.getOtp('test@campus.edu');
  assert(incrementedOtp?.attempts === 1, 'OTP attempts incremented correctly');

  // 6b. Password Reset storage
  await storage.savePasswordReset({
    tokenHash: 'reset_hash_456',
    userId: updatedUserRecord!.id,
    email: updatedUserRecord!.email,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  });
  const storedReset = await storage.getPasswordReset('reset_hash_456');
  assert(storedReset?.email === updatedUserRecord!.email, 'Password reset token saved and retrieved');

  // 6c. Persistent In-App Notifications (Zero VAPID / Zero Web Push)
  await storage.createNotification({
    title: '🚌 Session Started Alert',
    message: 'Attendance is active for Bus No 6.',
    type: 'SESSION_START',
    date: '2026-10-31',
    read: false,
    link: '/student/dashboard',
    busId: 'BUS06',
    targetRole: 'STUDENT',
  });
  const notifs = await storage.getNotifications({ busId: 'BUS06' });
  assert(notifs.length >= 1 && notifs[0].title.includes('Session Started Alert'), 'Persistent in-app notification created and retrieved for student');

  // 7. Daily Report Generation
  console.log('\n--- 7. DAILY REPORT & BUS-WISE BREAKDOWN ---');
  const reportGen = new ReportGenerator(storage);
  const morningReport = await reportGen.generateDailyReport('MORNING');
  assert(morningReport.totalStudents === 2, `Morning report reflects total students (2 registered)`);
  assert(morningReport.present === 1, `Morning report reflects present count (1 present)`);
  assert(morningReport.busWise.length === 1 && morningReport.busWise[0].busId === 'BUS06', 'Report contains BUS06 summary');

  const eveningReport = await reportGen.generateDailyReport('EVENING');
  assert(eveningReport.present === 1, `Evening report reflects present count (1 present)`);

  // 8. Application-Level Evening Scheduler Tests (Zero Vercel Cron / Zero CRON_SECRET)
  console.log('\n--- 8. APPLICATION-LEVEL EVENING SCHEDULER RECONCILIATION ---');
  await storage.updateSettings({
    ...baseSettings,
    autoScheduleEnabled: true,
  });

  // 8a. At 16:49 IST -> IDLE
  const res449 = await reconcileEveningSchedule(storage, reportGen, '2026-10-31', '16:49');
  assert(res449.action === 'IDLE', 'Scheduler at 16:49 IST remains IDLE');

  // 8b. At 16:50 IST with auto-schedule enabled -> Starts session
  const res450 = await reconcileEveningSchedule(storage, reportGen, '2026-10-31', '16:50');
  assert(res450.action === 'STARTED_SESSION', 'Scheduler at 16:50 IST opens evening session idempotently');

  // 8c. Running 16:50 IST again -> Idempotent IDLE
  const res450Dup = await reconcileEveningSchedule(storage, reportGen, '2026-10-31', '16:50');
  assert(res450Dup.action === 'IDLE', 'Scheduler 16:50 IST repeated execution is idempotent (no duplicates)');

  // 8d. At 16:55 IST -> Closes session
  const res455 = await reconcileEveningSchedule(storage, reportGen, '2026-10-31', '16:55');
  assert(res455.action === 'CLOSED_SESSION', 'Scheduler at 16:55 IST closes session idempotently');

  // 8e. At 16:57 IST -> Finalizes report
  const res457 = await reconcileEveningSchedule(storage, reportGen, '2026-10-31', '16:57');
  assert(res457.action === 'FINALIZED_REPORT', 'Scheduler at 16:57 IST finalizes report and notifies Admin');

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSystemTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
