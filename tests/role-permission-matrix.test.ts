import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { Express } from 'express';
import http from 'http';
import { apiRouter } from '../src/server/api';
import { generateToken } from '../src/server/auth';
import { MemoryStorageAdapter } from '../src/server/storage/MemoryStorageAdapter';
import { setStorageInstance } from '../src/server/storage';
import { User, Bus, Student } from '../src/types';

describe('⚡ Role-Based Access Control (RBAC) Permission Matrix Suite', () => {
  let app: Express;
  let server: http.Server;
  let baseUrl: string;

  let adminUser: User;
  let inchargeUser: User;
  let studentUser: User;
  let testBus: Bus;
  let anotherBus: Bus;
  let testStudent: Student;

  let adminToken: string;
  let inchargeToken: string;
  let studentToken: string;

  beforeAll(async () => {
    // Force test environment with in-memory storage adapter
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_MEMORY_STORAGE = 'true';

    const storage = new MemoryStorageAdapter();
    setStorageInstance(storage);

    app = express();
    app.use(express.json());
    app.use('/api', apiRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Provision admin
    adminUser = {
      id: 'admin-matrix-01',
      name: 'System Admin',
      email: 'admin.matrix@college.edu',
      role: 'ADMIN',
      status: 'APPROVED',
      active: true,
      approved: true,
    };
    (storage as any).users.push(adminUser);
    adminToken = generateToken(adminUser);

    // Provision buses
    testBus = await storage.createBus({
      busNumber: 'BUS-MATRIX-99',
      routeName: 'Matrix Route',
      inchargeId: 'incharge-matrix-01',
      capacity: 50,
      active: true,
    });

    anotherBus = await storage.createBus({
      busNumber: 'BUS-OTHER-01',
      routeName: 'Other Route',
      inchargeId: 'other-incharge-999',
      capacity: 40,
      active: true,
    });

    // Provision incharge
    inchargeUser = {
      id: 'incharge-matrix-01',
      name: 'Test Incharge',
      email: 'incharge.matrix@college.edu',
      role: 'INCHARGE',
      assignedBusId: testBus.id,
      busNumber: testBus.busNumber,
      status: 'APPROVED',
      active: true,
      approved: true,
    };
    (storage as any).users.push(inchargeUser);
    inchargeToken = generateToken(inchargeUser);

    // Provision student
    testStudent = await storage.signupStudent({
      name: 'Commuter Student',
      registerNumber: '24IT999',
      email: 'student.matrix@college.edu',
      phone: '9988776655',
      password: 'SafePassword123!',
      preferredBusId: testBus.id,
    });
    await storage.approveStudent(testStudent.id, testBus.id, adminUser.id);

    studentUser = {
      id: testStudent.id,
      name: testStudent.name,
      email: testStudent.email,
      role: 'STUDENT',
      studentId: testStudent.id,
      assignedBusId: testBus.id,
      status: 'APPROVED',
      active: true,
      approved: true,
    };
    (storage as any).users.push(studentUser);
    studentToken = generateToken(studentUser);
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // --------------------------------------------------------------------------
  // UNAUTHENTICATED RESTRICTIONS
  // --------------------------------------------------------------------------
  it('Unauthenticated requests are strictly rejected with 401 across protected routes', async () => {
    const endpoints = [
      '/api/admin/assignments',
      '/api/admin/students',
      '/api/incharge/my-bus',
      '/api/incharge/history',
      '/api/student/my-bus',
      '/api/student/attendance-history',
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep}`);
      expect(res.status).toBe(401);
    }
  });

  // --------------------------------------------------------------------------
  // ADMIN RESTRICTIONS & ALLOWANCES
  // --------------------------------------------------------------------------
  it('Admin is strictly prohibited from starting attendance sessions (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/attendance/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        busId: testBus.id,
        sessionType: 'MORNING',
        attendanceMode: 'GROUND',
      }),
    });
    expect(res.status).toBe(403);
  });

  it('Admin is strictly prohibited from ending attendance sessions (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/attendance/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ sessionId: 'session-123' }),
    });
    expect(res.status).toBe(403);
  });

  it('Admin is strictly prohibited from manually overriding attendance directly (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/override`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        studentId: testStudent.id,
        busId: testBus.id,
        sessionType: 'MORNING',
        status: 'PRESENT',
      }),
    });
    expect(res.status).toBe(403);
  });

  it('Admin is authorized to view assignments, pending approvals, and configure geofence settings', async () => {
    const assignmentsRes = await fetch(`${baseUrl}/api/admin/assignments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(assignmentsRes.status).toBe(200);

    const pendingRes = await fetch(`${baseUrl}/api/admin/approvals`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(pendingRes.status).toBe(200);

    const settingsRes = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        location: {
          name: 'Main Ground',
          latitude: 13.0827,
          longitude: 80.2707,
          radiusMeters: 10,
          maxGpsAccuracyMeters: 20,
        },
      }),
    });
    expect(settingsRes.status).toBe(200);
  });

  // --------------------------------------------------------------------------
  // INCHARGE RESTRICTIONS & ALLOWANCES
  // --------------------------------------------------------------------------
  it('In-Charge is strictly prohibited from managing student approvals or updating admin settings (403)', async () => {
    const approveRes = await fetch(`${baseUrl}/api/admin/approvals/${testStudent.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${inchargeToken}`,
      },
      body: JSON.stringify({ busId: testBus.id }),
    });
    expect(approveRes.status).toBe(403);

    const settingsRes = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${inchargeToken}`,
      },
      body: JSON.stringify({
        location: {
          name: 'Unauthorized',
          latitude: 13.08,
          longitude: 80.27,
        },
      }),
    });
    expect(settingsRes.status).toBe(403);
  });

  it('In-Charge is strictly forbidden from starting attendance for an unassigned bus (403)', async () => {
    const res = await fetch(`${baseUrl}/api/attendance/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${inchargeToken}`,
      },
      body: JSON.stringify({
        busId: anotherBus.id,
        sessionType: 'MORNING',
        attendanceMode: 'GROUND',
      }),
    });
    expect(res.status).toBe(403);
  });

  it('In-Charge is authorized to view assigned bus details, students, history and reports', async () => {
    const myBusRes = await fetch(`${baseUrl}/api/incharge/my-bus`, {
      headers: { Authorization: `Bearer ${inchargeToken}` },
    });
    expect(myBusRes.status).toBe(200);

    const historyRes = await fetch(`${baseUrl}/api/incharge/history`, {
      headers: { Authorization: `Bearer ${inchargeToken}` },
    });
    expect(historyRes.status).toBe(200);

    const reportsRes = await fetch(`${baseUrl}/api/incharge/reports`, {
      headers: { Authorization: `Bearer ${inchargeToken}` },
    });
    expect(reportsRes.status).toBe(200);
  });

  // --------------------------------------------------------------------------
  // STUDENT RESTRICTIONS & ALLOWANCES
  // --------------------------------------------------------------------------
  it('Student is strictly prohibited from starting or ending attendance (403)', async () => {
    const startRes = await fetch(`${baseUrl}/api/attendance/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ busId: testBus.id, sessionType: 'MORNING', attendanceMode: 'GROUND' }),
    });
    expect(startRes.status).toBe(403);

    const endRes = await fetch(`${baseUrl}/api/attendance/session/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ sessionId: 'dummy-session' }),
    });
    expect(endRes.status).toBe(403);
  });

  it('Student is strictly prohibited from accessing Admin and In-Charge operations (403)', async () => {
    const adminRes = await fetch(`${baseUrl}/api/admin/students`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(adminRes.status).toBe(403);

    const inchargeRes = await fetch(`${baseUrl}/api/incharge/my-bus`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(inchargeRes.status).toBe(403);
  });

  it('Student is authorized to view personal assigned bus and attendance history', async () => {
    const myBusRes = await fetch(`${baseUrl}/api/student/my-bus`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(myBusRes.status).toBe(200);

    const historyRes = await fetch(`${baseUrl}/api/student/attendance-history`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(historyRes.status).toBe(200);
  });

  // --------------------------------------------------------------------------
  // NEW AUDIT TESTS: ADMIN INDIVIDUAL HISTORY & DIRECT IN-CHARGE REGISTRATION
  // --------------------------------------------------------------------------
  it('Admin can view individual student attendance history via GET /api/admin/students/:id/attendance', async () => {
    const res = await fetch(`${baseUrl}/api/admin/students/${testStudent.id}/attendance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.student).toBeDefined();
    expect(body.student.id).toBe(testStudent.id);
    expect(Array.isArray(body.records)).toBe(true);
  });

  it('Admin can directly create and register an In-Charge via POST /api/admin/incharges', async () => {
    const newEmail = `incharge.direct.${Date.now()}@college.edu`;
    const res = await fetch(`${baseUrl}/api/admin/incharges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Direct Created Incharge',
        email: newEmail,
        password: 'DirectPassword123!',
        phone: '9876500000',
        assignedBusId: testBus.id,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe(newEmail);
    expect(body.user.role).toBe('INCHARGE');
  });

  it('Admin history query correctly handles sessionType parameter (MORNING and EVENING)', async () => {
    const morningRes = await fetch(`${baseUrl}/api/admin/attendance/history?sessionType=MORNING`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(morningRes.status).toBe(200);
    const morningData = await morningRes.json();
    expect(Array.isArray(morningData)).toBe(true);

    const eveningRes = await fetch(`${baseUrl}/api/admin/attendance/history?sessionType=EVENING`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(eveningRes.status).toBe(200);
    const eveningData = await eveningRes.json();
    expect(Array.isArray(eveningData)).toBe(true);
  });
});
