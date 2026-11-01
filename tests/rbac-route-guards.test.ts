import { describe, it, expect, beforeEach } from 'vitest';
import { requireAuth, verifyInchargeBusAuthorization } from '../src/server/api';
import { generateToken, verifyToken, TokenPayload } from '../src/server/auth';
import { AttendanceVerifier } from '../src/server/attendance/verifier';
import { MemoryStorageAdapter } from '../src/server/storage/MemoryStorageAdapter';
import { setStorageInstance } from '../src/server/storage';
import { User, Student, Bus, Role } from '../src/types';

describe('⚡ Circuit 2: Role-Based Access Control (RBAC) & Route Guards Regression Suite', () => {
  let storage: MemoryStorageAdapter;
  let verifier: AttendanceVerifier;

  // Standard Test Personas
  const adminUser: User = {
    id: 'ADMIN-001',
    name: 'College Transport Administrator',
    email: 'admin.transport@college.edu',
    role: 'ADMIN',
    active: true,
    approved: true,
    status: 'APPROVED',
  };

  const inchargeBus1User: User = {
    id: 'INC-001',
    name: 'Prof. Ramesh (Bus 01)',
    email: 'ramesh.inc@college.edu',
    role: 'INCHARGE',
    assignedBusId: 'BUS-01',
    active: true,
    approved: true,
    status: 'APPROVED',
  };

  const inchargeBus2User: User = {
    id: 'INC-002',
    name: 'Prof. Suresh (Bus 02)',
    email: 'suresh.inc@college.edu',
    role: 'INCHARGE',
    assignedBusId: 'BUS-02',
    active: true,
    approved: true,
    status: 'APPROVED',
  };

  const studentUser: User = {
    id: 'STU-001',
    name: 'Kavitha S',
    email: 'kavitha.stu@college.edu',
    role: 'STUDENT',
    studentId: 'STU-001',
    assignedBusId: 'BUS-01',
    active: true,
    approved: true,
    status: 'APPROVED',
  };

  // Helper for mock HTTP requests against Express middleware
  const executeMiddleware = async (
    middleware: any,
    reqHeaders: Record<string, string> = {}
  ) => {
    const req: any = { headers: reqHeaders };
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

  beforeEach(async () => {
    storage = new MemoryStorageAdapter();
    setStorageInstance(storage);
    verifier = new AttendanceVerifier(storage);

    // Seed Fleet Buses
    const bus1: Bus = {
      id: 'BUS-01',
      busNumber: 'BUS-01',
      routeName: 'City Center Route',
      capacity: 50,
      inchargeId: inchargeBus1User.id,
      inchargeName: inchargeBus1User.name,
      inchargePhone: '9876543210',
      active: true,
    };
    const bus2: Bus = {
      id: 'BUS-02',
      busNumber: 'BUS-02',
      routeName: 'North Campus Route',
      capacity: 45,
      inchargeId: inchargeBus2User.id,
      inchargeName: inchargeBus2User.name,
      inchargePhone: '9876543211',
      active: true,
    };

    await storage.createBus(bus1);
    await storage.createBus(bus2);

    // Seed Users in Storage
    await storage.createUser(adminUser);
    await storage.createUser(inchargeBus1User);
    await storage.createUser(inchargeBus2User);
    await storage.createUser(studentUser);

    // Seed Student Commuter Profile
    const studentProfile: Student = {
      id: studentUser.id,
      registerNumber: '721420104001',
      name: studentUser.name,
      email: studentUser.email,
      busId: 'BUS-01',
      preferredBusId: 'BUS-01',
      active: true,
      approved: true,
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
    };
    await storage.createStudent(studentProfile);
  });

  // --------------------------------------------------------------------------
  // 1. RBAC ACCESS CONTROL MATRIX ACROSS ALL PERSONAS
  // --------------------------------------------------------------------------
  describe('1. RBAC Access Control Matrix Across ADMIN, INCHARGE, and STUDENT', () => {
    it('1.1: Generates and cryptographically verifies JWT tokens with proper role claims', () => {
      const adminToken = generateToken(adminUser);
      const inchargeToken = generateToken(inchargeBus1User);
      const studentToken = generateToken(studentUser);

      const parsedAdmin = verifyToken(adminToken);
      const parsedIncharge = verifyToken(inchargeToken);
      const parsedStudent = verifyToken(studentToken);

      expect(parsedAdmin?.role).toBe('ADMIN');
      expect(parsedIncharge?.role).toBe('INCHARGE');
      expect(parsedIncharge?.assignedBusId).toBe('BUS-01');
      expect(parsedStudent?.role).toBe('STUDENT');
      expect(parsedStudent?.studentId).toBe('STU-001');
    });

    it('1.2: Middleware rejects requests lacking Bearer Authorization header with 401', async () => {
      const resultNoHeader = await executeMiddleware(requireAuth());
      expect(resultNoHeader.statusCode).toBe(401);
      expect(resultNoHeader.nextCalled).toBe(false);
      expect(resultNoHeader.jsonBody.error).toContain('Unauthorized. Token required.');

      const resultInvalidFormat = await executeMiddleware(requireAuth(), {
        authorization: 'Basic dXNlcjpwYXNz',
      });
      expect(resultInvalidFormat.statusCode).toBe(401);
      expect(resultInvalidFormat.nextCalled).toBe(false);
    });

    it('1.3: Middleware rejects tampered or expired tokens with 401', async () => {
      const result = await executeMiddleware(requireAuth(), {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature',
      });
      expect(result.statusCode).toBe(401);
      expect(result.nextCalled).toBe(false);
      expect(result.jsonBody.error).toContain('Invalid or expired token.');
    });

    it('1.4: ADMIN route guard permits ADMIN and strictly rejects INCHARGE and STUDENT with 403', async () => {
      const adminGuard = requireAuth(['ADMIN']);

      const adminRes = await executeMiddleware(adminGuard, {
        authorization: `Bearer ${generateToken(adminUser)}`,
      });
      expect(adminRes.statusCode).toBe(200);
      expect(adminRes.nextCalled).toBe(true);
      expect(adminRes.req.user.role).toBe('ADMIN');

      const inchargeRes = await executeMiddleware(adminGuard, {
        authorization: `Bearer ${generateToken(inchargeBus1User)}`,
      });
      expect(inchargeRes.statusCode).toBe(403);
      expect(inchargeRes.nextCalled).toBe(false);
      expect(inchargeRes.jsonBody.error).toContain('Forbidden. Insufficient permissions.');

      const studentRes = await executeMiddleware(adminGuard, {
        authorization: `Bearer ${generateToken(studentUser)}`,
      });
      expect(studentRes.statusCode).toBe(403);
      expect(studentRes.nextCalled).toBe(false);
      expect(studentRes.jsonBody.error).toContain('Forbidden. Insufficient permissions.');
    });

    it('1.5: INCHARGE route guard permits INCHARGE and rejects ADMIN and STUDENT with 403', async () => {
      const inchargeGuard = requireAuth(['INCHARGE']);

      const inchargeRes = await executeMiddleware(inchargeGuard, {
        authorization: `Bearer ${generateToken(inchargeBus1User)}`,
      });
      expect(inchargeRes.statusCode).toBe(200);
      expect(inchargeRes.nextCalled).toBe(true);

      const adminRes = await executeMiddleware(inchargeGuard, {
        authorization: `Bearer ${generateToken(adminUser)}`,
      });
      expect(adminRes.statusCode).toBe(403);
      expect(adminRes.nextCalled).toBe(false);

      const studentRes = await executeMiddleware(inchargeGuard, {
        authorization: `Bearer ${generateToken(studentUser)}`,
      });
      expect(studentRes.statusCode).toBe(403);
      expect(studentRes.nextCalled).toBe(false);
    });

    it('1.6: STUDENT route guard permits STUDENT and rejects ADMIN and INCHARGE with 403', async () => {
      const studentGuard = requireAuth(['STUDENT']);

      const studentRes = await executeMiddleware(studentGuard, {
        authorization: `Bearer ${generateToken(studentUser)}`,
      });
      expect(studentRes.statusCode).toBe(200);
      expect(studentRes.nextCalled).toBe(true);

      const adminRes = await executeMiddleware(studentGuard, {
        authorization: `Bearer ${generateToken(adminUser)}`,
      });
      expect(adminRes.statusCode).toBe(403);
      expect(adminRes.nextCalled).toBe(false);

      const inchargeRes = await executeMiddleware(studentGuard, {
        authorization: `Bearer ${generateToken(inchargeBus1User)}`,
      });
      expect(inchargeRes.statusCode).toBe(403);
      expect(inchargeRes.nextCalled).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 2. ADMIN RESTRICTIONS: CANNOT PERFORM STUDENT CHECK-IN WITHOUT COMMUTER PROFILE
  // --------------------------------------------------------------------------
  describe('2. ADMIN Persona Check-In Restrictions', () => {
    it('2.1: Attendance check-in route guard rejects ADMIN with HTTP 403', async () => {
      const checkinRouteGuard = requireAuth(['STUDENT']);
      const res = await executeMiddleware(checkinRouteGuard, {
        authorization: `Bearer ${generateToken(adminUser)}`,
      });

      expect(res.statusCode).toBe(403);
      expect(res.nextCalled).toBe(false);
      expect(res.jsonBody.error).toBe('Forbidden. Insufficient permissions.');
    });

    it('2.2: AttendanceVerifier rejects non-STUDENT (ADMIN) with LOCATION_UNAVAILABLE', async () => {
      const verificationResult = await verifier.verifyStudentLocation(adminUser, {
        latitude: 10.9572,
        longitude: 78.0766,
        accuracy: 5,
      });

      expect(verificationResult.status).toBe('LOCATION_UNAVAILABLE');
      expect(verificationResult.message).toContain('Only registered students can submit attendance.');
    });

    it('2.3: AttendanceVerifier rejects user claiming STUDENT role if no commuter profile exists in roster', async () => {
      const rogueStudent: User = {
        id: 'GHOST-STU-999',
        name: 'Ghost Student',
        email: 'ghost@college.edu',
        role: 'STUDENT',
        active: true,
        approved: true,
        status: 'APPROVED',
      };

      const result = await verifier.verifyStudentLocation(rogueStudent, {
        latitude: 10.9572,
        longitude: 78.0766,
        accuracy: 5,
      });

      expect(result.status).toBe('LOCATION_UNAVAILABLE');
      expect(result.message).toContain('Student record not found in registered commuter roster.');
    });

    it('2.4: AttendanceVerifier rejects student without an assigned bus with BUS_MISMATCH', async () => {
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

      const profile: Student = {
        id: 'STU-721420104999',
        registerNumber: '721420104999',
        name: unassignedStudent.name,
        email: unassignedStudent.email,
        busId: undefined, // No bus assigned by admin yet
        active: true,
        approved: true,
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
      };
      await storage.createUser(unassignedStudent);
      await storage.createStudent(profile);

      const result = await verifier.verifyStudentLocation(unassignedStudent, {
        latitude: 10.9572,
        longitude: 78.0766,
        accuracy: 5,
      });

      expect(result.status).toBe('BUS_MISMATCH');
      expect(result.message).toContain('No bus assigned to this student.');
    });
  });

  // --------------------------------------------------------------------------
  // 3. STUDENT ROUTE ISOLATION: CANNOT ACCESS ADMIN OR INCHARGE CONTROLS
  // --------------------------------------------------------------------------
  describe('3. STUDENT Route Isolation & Client-Side Route Guards', () => {
    it('3.1: Student is forbidden from accessing Admin management endpoints', async () => {
      const adminEndpoints = [
        requireAuth(['ADMIN']), // /admin/buses
        requireAuth(['ADMIN']), // /admin/incharges
        requireAuth(['ADMIN']), // /admin/assignments
        requireAuth(['ADMIN']), // /admin/approvals
      ];

      const studentAuthHeader = { authorization: `Bearer ${generateToken(studentUser)}` };

      for (const guard of adminEndpoints) {
        const res = await executeMiddleware(guard, studentAuthHeader);
        expect(res.statusCode).toBe(403);
        expect(res.nextCalled).toBe(false);
      }
    });

    it('3.2: Student is forbidden from accessing In-Charge session controls', async () => {
      const inchargeSessionGuard = requireAuth(['INCHARGE']);
      const studentAuthHeader = { authorization: `Bearer ${generateToken(studentUser)}` };

      const res = await executeMiddleware(inchargeSessionGuard, studentAuthHeader);
      expect(res.statusCode).toBe(403);
      expect(res.nextCalled).toBe(false);
      expect(res.jsonBody.error).toBe('Forbidden. Insufficient permissions.');
    });

    it('3.3: Client-side ProtectedRoute guard evaluates correct redirect targets per role', () => {
      // Simulating App.tsx ProtectedRoute behavior:
      const evaluateClientRouteGuard = (
        currentUser: { role: Role } | null,
        allowedRoles: Role[]
      ): { allowed: boolean; redirectPath?: string } => {
        if (!currentUser) return { allowed: false, redirectPath: '/login' };
        if (!allowedRoles.includes(currentUser.role)) {
          if (currentUser.role === 'ADMIN') return { allowed: false, redirectPath: '/admin/dashboard' };
          if (currentUser.role === 'INCHARGE') return { allowed: false, redirectPath: '/incharge/dashboard' };
          return { allowed: false, redirectPath: '/student/dashboard' };
        }
        return { allowed: true };
      };

      // Unauthenticated -> /login
      expect(evaluateClientRouteGuard(null, ['ADMIN']).redirectPath).toBe('/login');

      // Student trying to access /admin/* -> /student/dashboard
      expect(evaluateClientRouteGuard({ role: 'STUDENT' }, ['ADMIN'])).toEqual({
        allowed: false,
        redirectPath: '/student/dashboard',
      });

      // Student trying to access /incharge/* -> /student/dashboard
      expect(evaluateClientRouteGuard({ role: 'STUDENT' }, ['INCHARGE'])).toEqual({
        allowed: false,
        redirectPath: '/student/dashboard',
      });

      // Incharge trying to access /admin/* -> /incharge/dashboard
      expect(evaluateClientRouteGuard({ role: 'INCHARGE' }, ['ADMIN'])).toEqual({
        allowed: false,
        redirectPath: '/incharge/dashboard',
      });

      // Admin trying to access /student/* -> /admin/dashboard
      expect(evaluateClientRouteGuard({ role: 'ADMIN' }, ['STUDENT'])).toEqual({
        allowed: false,
        redirectPath: '/admin/dashboard',
      });

      // Legitimate accesses
      expect(evaluateClientRouteGuard({ role: 'ADMIN' }, ['ADMIN']).allowed).toBe(true);
      expect(evaluateClientRouteGuard({ role: 'INCHARGE' }, ['INCHARGE']).allowed).toBe(true);
      expect(evaluateClientRouteGuard({ role: 'STUDENT' }, ['STUDENT']).allowed).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 4. INCHARGE FLEET BOUNDARY ISOLATION
  // --------------------------------------------------------------------------
  describe('4. INCHARGE Bus & Session Management Boundary Isolation', () => {
    it('4.1: In-Charge is authorized to manage their assigned bus (BUS-01)', async () => {
      const payload: TokenPayload = {
        id: inchargeBus1User.id,
        email: inchargeBus1User.email,
        name: inchargeBus1User.name,
        role: 'INCHARGE',
        assignedBusId: 'BUS-01',
      };

      const authCheck = await verifyInchargeBusAuthorization(payload, 'BUS-01');
      expect(authCheck.authorized).toBe(true);
      expect(authCheck.bus?.id).toBe('BUS-01');
    });

    it('4.2: In-Charge is strictly prohibited from managing another in-charge bus (BUS-02)', async () => {
      const payloadBus1: TokenPayload = {
        id: inchargeBus1User.id,
        email: inchargeBus1User.email,
        name: inchargeBus1User.name,
        role: 'INCHARGE',
        assignedBusId: 'BUS-01',
      };

      // Attempting to manage Bus 02
      const authCheck = await verifyInchargeBusAuthorization(payloadBus1, 'BUS-02');
      expect(authCheck.authorized).toBe(false);
      expect(authCheck.status).toBe(403);
      expect(authCheck.error).toContain('Access Denied: You are not authorized for Bus BUS-02');
    });

    it('4.3: In-Charge requesting non-existent bus returns 404', async () => {
      const payload: TokenPayload = {
        id: inchargeBus1User.id,
        email: inchargeBus1User.email,
        name: inchargeBus1User.name,
        role: 'INCHARGE',
        assignedBusId: 'BUS-01',
      };

      const authCheck = await verifyInchargeBusAuthorization(payload, 'BUS-UNKNOWN-999');
      expect(authCheck.authorized).toBe(false);
      expect(authCheck.status).toBe(404);
      expect(authCheck.error).toContain('does not exist in fleet registry');
    });

    it('4.4: Inactive or unapproved In-Charge is rejected with 403', async () => {
      const pendingIncharge: User = {
        id: 'INC-PENDING',
        name: 'Pending Incharge',
        email: 'pending.inc@college.edu',
        role: 'INCHARGE',
        assignedBusId: 'BUS-01',
        active: false,
        approved: false,
        status: 'PENDING',
      };
      await storage.createUser(pendingIncharge);

      const payload: TokenPayload = {
        id: pendingIncharge.id,
        email: pendingIncharge.email,
        name: pendingIncharge.name,
        role: 'INCHARGE',
        assignedBusId: 'BUS-01',
      };

      const authCheck = await verifyInchargeBusAuthorization(payload, 'BUS-01');
      expect(authCheck.authorized).toBe(false);
      expect(authCheck.status).toBe(403);
      expect(authCheck.error).toContain('In-Charge account is inactive or pending approval');
    });
  });
});
