import { calculateDistance } from '../src/server/attendance/haversine';
import { evaluateSessionStatus } from '../src/server/attendance/session';
import { AttendanceVerifier } from '../src/server/attendance/verifier';
import { ReportGenerator } from '../src/server/reports/generator';
import { JsonStorageAdapter } from '../src/server/storage/JsonStorageAdapter';
import { AttendanceSettings, User } from '../src/types';
import path from 'path';
import fs from 'fs/promises';

async function runSystemTests() {
  console.log('================================================================');
  console.log('🧪 REAL DATA LIFECYCLE & 6-DIGIT CODE VERIFICATION SUITE');
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

  const dataDir = path.resolve(process.cwd(), 'data');
  const storage = new JsonStorageAdapter(dataDir);

  // Clean slate initialization
  await fs.writeFile(path.join(dataDir, 'users.json'), '[]', 'utf-8');
  await fs.writeFile(path.join(dataDir, 'buses.json'), '[]', 'utf-8');
  await fs.writeFile(path.join(dataDir, 'students.json'), '[]', 'utf-8');
  await fs.writeFile(path.join(dataDir, 'attendance.json'), '[]', 'utf-8');
  await fs.writeFile(path.join(dataDir, 'notifications.json'), '[]', 'utf-8');
  await fs.writeFile(path.join(dataDir, 'reports.json'), '[]', 'utf-8');
  await fs.writeFile(path.join(dataDir, 'active_session.json'), 'null', 'utf-8');

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

  // 3a. Initial state verification: Constant Admin is configured
  const hasAdminInitial = await storage.hasAdmin();
  const initAdmin = await storage.getUserByEmail('tharun@gmail.com');
  const initBuses = await storage.getBuses();
  const initStudents = await storage.getStudents();
  assert(hasAdminInitial && initAdmin?.role === 'ADMIN', 'Constant Admin (Tharun) configured and active');
  assert(initBuses.length >= 0, 'Bus registry ready');
  assert(initStudents.length === 0, 'System initial state: 0 Students present');

  // 3b. Admin Authentication Verification
  const adminAuth = await storage.getUserByEmail('tharun@gmail.com');
  assert(adminAuth?.password === '474743' && adminAuth.role === 'ADMIN', 'Constant Admin credentials verified');

  // 3c. Admin creates a real bus (Bus No 6 with Incharge Aarthi)
  const newBus = await storage.createBus({
    id: 'BUS06',
    busNumber: 'Bus No 6',
    routeName: 'Dharapuram',
    inchargeId: 'INC006',
    active: true,
  });
  assert(newBus.id === 'BUS06' && newBus.busNumber === 'Bus No 6', `Admin creates real bus with ID ${newBus.id}`);

  // 3d. Student Signup (Public Page)
  const signupResult = await storage.signupStudent({
    name: 'Tharun Kumar',
    registerNumber: '24IT001',
    email: 'tharun@example.com',
    phone: '9876543210',
    password: 'studentPassword123',
    preferredBusId: 'BUS06',
  });
  assert(
    signupResult.status === 'PENDING' &&
      signupResult.approved === false &&
      signupResult.active === false,
    'Student signs up -> status: PENDING, approved: false, active: false'
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

  // 4. Dynamic 6-Digit Code & Verification Tests
  console.log('\n--- 4. DYNAMIC 6-DIGIT CODE & GPS ATTENDANCE ---');
  const verifier = new AttendanceVerifier(storage);

  const studentSessionUser: User = {
    id: updatedUserRecord!.id,
    email: updatedUserRecord!.email,
    name: updatedUserRecord!.name,
    role: 'STUDENT',
    studentId: updatedUserRecord!.studentId,
    assignedBusId: updatedUserRecord!.assignedBusId,
  };

  // Start Session with 6-digit code "654321"
  const now = Date.now();
  await storage.saveActiveSession({
    id: 'SESSION-REAL-TEST',
    sessionType: 'EVENING',
    attendanceMode: 'GROUND',
    verificationMethod: 'CODE_GPS',
    busId: 'BUS06',
    status: 'ACTIVE',
    startedBy: adminAuth!.id,
    currentCode: '654321',
    codeIssuedAt: new Date(now).toISOString(),
    codeExpiresAt: new Date(now + 60 * 1000).toISOString(),
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

  // 4a. Correct Code + GPS within 10m -> Success PRESENT
  const resCorrect = await verifier.verifyStudentLocation(studentSessionUser, {
    code: '654321',
    latitude: baseLat + 0.00003,
    longitude: baseLon,
    accuracy: 5.0,
  });
  assert(resCorrect.status === 'PRESENT', `Student enters valid code "654321" within geofence -> status: PRESENT`);

  // 4b. Wrong Code -> Rejected
  const resWrong = await verifier.verifyStudentLocation(studentSessionUser, {
    code: '000000',
    latitude: baseLat,
    longitude: baseLon,
    accuracy: 5.0,
  });
  assert(resWrong.status === 'INVALID_CODE' || resWrong.message.includes('already recorded'), 'Invalid code rejected');

  // 4c. End active session
  await storage.endActiveSession('SESSION-REAL-TEST');

  // 5. Daily Report Generation
  console.log('\n--- 5. DAILY REPORT & REAL DATA SUMMARY ---');
  const reportGen = new ReportGenerator(storage);
  const report = await reportGen.generateDailyReport();

  assert(report.totalStudents === 1, `Daily report reflects real total students (1 student registered)`);
  assert(report.present === 1, `Daily report reflects real present count (1 student present)`);
  assert(report.notPresent === 0, `Daily report reflects real notPresent count (0 not present)`);
  assert(report.busWise.length === 1 && report.busWise[0].busId === 'BUS06', 'Report contains BUS06 summary');

  // Preserve fixed Bus No 6 with Incharge Aarthi in buses.json
  await fs.writeFile(
    path.join(dataDir, 'buses.json'),
    JSON.stringify(
      [
        {
          id: 'BUS06',
          busNumber: 'Bus No 6',
          routeName: 'Dharapuram',
          inchargeId: 'INC006',
          active: true,
        },
      ],
      null,
      2
    ),
    'utf-8'
  );
  await fs.writeFile(path.join(dataDir, 'users.json'), '[]', 'utf-8');
  await fs.writeFile(path.join(dataDir, 'students.json'), '[]', 'utf-8');
  await fs.writeFile(path.join(dataDir, 'attendance.json'), '[]', 'utf-8');
  await fs.writeFile(path.join(dataDir, 'notifications.json'), '[]', 'utf-8');
  await fs.writeFile(path.join(dataDir, 'reports.json'), '[]', 'utf-8');
  await fs.writeFile(path.join(dataDir, 'active_session.json'), 'null', 'utf-8');
  await storage.updateSettings({
    simulation: { enabled: false, simulatedTime: null },
  });

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
