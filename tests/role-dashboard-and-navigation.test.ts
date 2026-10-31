import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StatusBadge } from '../src/components/common/StatusBadge';
import express, { Express } from 'express';
import http from 'http';
import { apiRouter } from '../src/server/api';
import { generateToken } from '../src/server/auth';
import { MemoryStorageAdapter } from '../src/server/storage/MemoryStorageAdapter';
import { setStorageInstance } from '../src/server/storage';
import { User, Bus } from '../src/types';

describe('⚡ Role Navigation, Dashboard Layout & Bus Authorization Test Suite', () => {
  const rootDir = path.resolve(__dirname, '..');

  // --------------------------------------------------------------------------
  // 1. ADMIN SIDEBAR (8 ITEMS IN EXACT ORDER)
  // --------------------------------------------------------------------------
  it('R1: AdminSidebar renders exactly 8 items in the required canonical order', () => {
    const adminSidebar = fs.readFileSync(path.join(rootDir, 'src/components/common/AdminSidebar.tsx'), 'utf-8');

    // Expected 8 items in order
    const expected = [
      { to: '/admin', label: 'Dashboard' },
      { to: '/admin/students', label: 'Students' },
      { to: '/admin/buses', label: 'Buses' },
      { to: '/admin/incharges', label: 'In-Charges' },
      { to: '/admin/reports', label: 'Attendance Reports' },
      { to: '/admin/settings', label: 'Settings' },
      { to: '/admin/profile', label: 'Profile' },
      { label: 'Logout' },
    ];

    for (const item of expected) {
      if (item.to) {
        expect(adminSidebar).toContain(item.to);
      }
      expect(adminSidebar).toContain(item.label);
    }

    // Verify ordering sequence in file
    const idxDashboard = adminSidebar.indexOf("to: '/admin'");
    const idxStudents = adminSidebar.indexOf("to: '/admin/students'");
    const idxBuses = adminSidebar.indexOf("to: '/admin/buses'");
    const idxIncharges = adminSidebar.indexOf("to: '/admin/incharges'");
    const idxReports = adminSidebar.indexOf("to: '/admin/reports'");
    const idxSettings = adminSidebar.indexOf("to: '/admin/settings'");
    const idxProfile = adminSidebar.indexOf("to: '/admin/profile'");
    const idxLogout = adminSidebar.indexOf('>Logout<');

    expect(idxDashboard).toBeGreaterThan(0);
    expect(idxStudents).toBeGreaterThan(idxDashboard);
    expect(idxBuses).toBeGreaterThan(idxStudents);
    expect(idxIncharges).toBeGreaterThan(idxBuses);
    expect(idxReports).toBeGreaterThan(idxIncharges);
    expect(idxSettings).toBeGreaterThan(idxReports);
    expect(idxProfile).toBeGreaterThan(idxSettings);
    expect(idxLogout).toBeGreaterThan(idxProfile);
  });

  // --------------------------------------------------------------------------
  // 2. INCHARGE SIDEBAR (7 ITEMS IN EXACT ORDER)
  // --------------------------------------------------------------------------
  it('R2: InchargeSidebar renders exactly 7 items in the required canonical order', () => {
    const inchargeSidebar = fs.readFileSync(path.join(rootDir, 'src/components/common/InchargeSidebar.tsx'), 'utf-8');

    const expected = [
      { to: '/incharge', label: 'Dashboard' },
      { to: '/incharge/bus', label: 'My Bus' },
      { to: '/incharge/students', label: 'Students' },
      { to: '/incharge/attendance', label: 'Attendance' },
      { to: '/incharge/history', label: 'Attendance History' },
      { to: '/incharge/profile', label: 'Profile' },
      { label: 'Logout' },
    ];

    for (const item of expected) {
      if (item.to) {
        expect(inchargeSidebar).toContain(item.to);
      }
      expect(inchargeSidebar).toContain(item.label);
    }

    const idxDashboard = inchargeSidebar.indexOf("to: '/incharge'");
    const idxBus = inchargeSidebar.indexOf("to: '/incharge/bus'");
    const idxStudents = inchargeSidebar.indexOf("to: '/incharge/students'");
    const idxAttendance = inchargeSidebar.indexOf("to: '/incharge/attendance'");
    const idxHistory = inchargeSidebar.indexOf("to: '/incharge/history'");
    const idxProfile = inchargeSidebar.indexOf("to: '/incharge/profile'");
    const idxLogout = inchargeSidebar.indexOf('>Logout<');

    expect(idxDashboard).toBeGreaterThan(0);
    expect(idxBus).toBeGreaterThan(idxDashboard);
    expect(idxStudents).toBeGreaterThan(idxBus);
    expect(idxAttendance).toBeGreaterThan(idxStudents);
    expect(idxHistory).toBeGreaterThan(idxAttendance);
    expect(idxProfile).toBeGreaterThan(idxHistory);
    expect(idxLogout).toBeGreaterThan(idxProfile);
  });

  // --------------------------------------------------------------------------
  // 3. STUDENT SIDEBAR (7 ITEMS IN EXACT ORDER)
  // --------------------------------------------------------------------------
  it('R3: StudentSidebar renders exactly 7 items in the required canonical order', () => {
    const studentSidebar = fs.readFileSync(path.join(rootDir, 'src/components/common/StudentSidebar.tsx'), 'utf-8');

    const expected = [
      { to: '/student', label: 'Dashboard' },
      { to: '/student/profile', label: 'My Profile' },
      { to: '/student/bus', label: 'My Bus' },
      { to: '/student/verify', label: 'Verify Attendance' },
      { to: '/student/history', label: 'Attendance History' },
      { to: '/student/notifications', label: 'Notifications' },
      { label: 'Logout' },
    ];

    for (const item of expected) {
      if (item.to) {
        expect(studentSidebar).toContain(item.to);
      }
      expect(studentSidebar).toContain(item.label);
    }

    const idxDashboard = studentSidebar.indexOf("to: '/student'");
    const idxProfile = studentSidebar.indexOf("to: '/student/profile'");
    const idxBus = studentSidebar.indexOf("to: '/student/bus'");
    const idxVerify = studentSidebar.indexOf("to: '/student/verify'");
    const idxHistory = studentSidebar.indexOf("to: '/student/history'");
    const idxNotifications = studentSidebar.indexOf("to: '/student/notifications'");
    const idxLogout = studentSidebar.indexOf('>Logout<');

    expect(idxDashboard).toBeGreaterThan(0);
    expect(idxProfile).toBeGreaterThan(idxDashboard);
    expect(idxBus).toBeGreaterThan(idxProfile);
    expect(idxVerify).toBeGreaterThan(idxBus);
    expect(idxHistory).toBeGreaterThan(idxVerify);
    expect(idxNotifications).toBeGreaterThan(idxHistory);
    expect(idxLogout).toBeGreaterThan(idxNotifications);
  });

  // --------------------------------------------------------------------------
  // 4. STATUS BADGE CANONICAL STATES
  // --------------------------------------------------------------------------
  it('R4: StatusBadge correctly renders canonical states: Pending, Approved, Present, Absent, Active, Completed', () => {
    const states = [
      { status: 'Pending', label: 'Pending' },
      { status: 'PENDING', label: 'Pending' },
      { status: 'Approved', label: 'Approved' },
      { status: 'APPROVED', label: 'Approved' },
      { status: 'Present', label: 'Present' },
      { status: 'PRESENT', label: 'Present' },
      { status: 'Absent', label: 'Absent' },
      { status: 'ABSENT', label: 'Absent' },
      { status: 'Active', label: 'Active' },
      { status: 'ACTIVE', label: 'Active' },
      { status: 'Completed', label: 'Completed' },
      { status: 'COMPLETED', label: 'Completed' },
    ];

    for (const s of states) {
      const html = renderToString(React.createElement(StatusBadge, { status: s.status }));
      expect(html).toContain(s.label);
    }
  });

  // --------------------------------------------------------------------------
  // 5. ADMIN DASHBOARD SPECIFICATIONS
  // --------------------------------------------------------------------------
  it('R1: AdminDashboard displays 4 primary KPI cards in grid grid-cols-2 xl:grid-cols-4 and read-only summary', () => {
    const adminDash = fs.readFileSync(path.join(rootDir, 'src/pages/admin/AdminDashboard.tsx'), 'utf-8');

    // 4 primary KPI cards
    expect(adminDash).toContain('Total Students');
    expect(adminDash).toContain('Total Buses');
    expect(adminDash).toContain('Total In-charges');
    expect(adminDash).toContain('Pending Approvals');
    expect(adminDash).toContain('grid grid-cols-2 xl:grid-cols-4');

    // Attendance summary panel and bus overview table
    expect(adminDash).toContain("Today's Attendance Summary");
    expect(adminDash).toContain('Bus-Wise Attendance Overview');

    // Zero manual student marking controls
    expect(adminDash).not.toContain('handleQuickApproveStudent');
  });

  // --------------------------------------------------------------------------
  // 6. IN-CHARGE DASHBOARD SPECIFICATIONS
  // --------------------------------------------------------------------------
  it('R2: InchargeDashboard displays assigned bus KPI, primary attendance action, and no duplicate morning/evening cards', () => {
    const inchargeDash = fs.readFileSync(path.join(rootDir, 'src/pages/incharge/InchargeDashboard.tsx'), 'utf-8');

    // Primary KPI metrics
    expect(inchargeDash).toContain('Assigned Bus');
    expect(inchargeDash).toContain('Total Assigned Students');
    expect(inchargeDash).toContain('Present Today');
    expect(inchargeDash).toContain('Absent Today');
    expect(inchargeDash).toContain('Current Session Status');

    // Primary attendance controls directly accessible
    expect(inchargeDash).toContain('Start Live Attendance');
    expect(inchargeDash).toContain('Close Attendance Session');

    // Duplicate morning/evening cards removed
    expect(inchargeDash).not.toContain('Morning Turnout Overview');
    expect(inchargeDash).not.toContain('Evening Turnout Overview');
  });

  // --------------------------------------------------------------------------
  // 7. STUDENT DASHBOARD SPECIFICATIONS
  // --------------------------------------------------------------------------
  it('R3: StudentDashboard displays Welcome greeting, Assigned Bus, Morning/Evening status, and has no attendance session controls', () => {
    const studentDash = fs.readFileSync(path.join(rootDir, 'src/pages/student/StudentDashboard.tsx'), 'utf-8');

    // Welcome greeting
    expect(studentDash).toContain('Welcome, ');

    // Primary statuses
    expect(studentDash).toContain('Assigned Bus');
    expect(studentDash).toContain('Morning Session');
    expect(studentDash).toContain('Evening Session');
    expect(studentDash).toContain('DIGITAL COMMUTER BOARDING PASS');

    // Zero session creation / control buttons
    expect(studentDash).not.toContain('Start Live Attendance');
    expect(studentDash).not.toContain('Close Attendance Session');
  });

  // --------------------------------------------------------------------------
  // 8. APP ROUTING SPECIFICATIONS
  // --------------------------------------------------------------------------
  it('Routing: App.tsx has canonical routes for admin, incharge, and student', () => {
    const appTsx = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');

    // Admin canonical routes
    expect(appTsx).toContain('path="settings"');
    expect(appTsx).toContain('path="reports"');

    // In-charge canonical routes
    expect(appTsx).toContain('path="bus"');
    expect(appTsx).toContain('path="attendance"');
    expect(appTsx).toContain('path="history"');

    // Student canonical routes
    expect(appTsx).toContain('path="bus"');
    expect(appTsx).toContain('path="verify"');
    expect(appTsx).toContain('path="history"');
  });

  // --------------------------------------------------------------------------
  // 9. BACKEND BUS AUTHORIZATION HARDENING
  // --------------------------------------------------------------------------
  describe('Backend Bus Authorization Scoping (HTTP 403 enforcement)', () => {
    let app: Express;
    let server: http.Server;
    let baseUrl: string;

    let storage: MemoryStorageAdapter;
    let inchargeUserA: User;
    let inchargeUserB: User;
    let busA: Bus;
    let busB: Bus;

    let tokenA: string;
    let tokenB: string;

    beforeAll(async () => {
      process.env.NODE_ENV = 'test';
      process.env.ALLOW_MEMORY_STORAGE = 'true';

      storage = new MemoryStorageAdapter();
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

      // Bus A and In-Charge A
      busA = await storage.createBus({
        busNumber: 'BUS-SCOPE-01',
        routeName: 'Route Alpha',
        inchargeId: 'incharge-user-A',
        capacity: 50,
        active: true,
      });

      inchargeUserA = {
        id: 'incharge-user-A',
        name: 'Incharge Alpha',
        email: 'alpha@college.edu',
        role: 'INCHARGE',
        assignedBusId: busA.id,
        busNumber: busA.busNumber,
        status: 'APPROVED',
        active: true,
        approved: true,
      };
      (storage as any).users.push(inchargeUserA);
      tokenA = generateToken(inchargeUserA);

      // Bus B and In-Charge B
      busB = await storage.createBus({
        busNumber: 'BUS-SCOPE-02',
        routeName: 'Route Beta',
        inchargeId: 'incharge-user-B',
        capacity: 50,
        active: true,
      });

      inchargeUserB = {
        id: 'incharge-user-B',
        name: 'Incharge Beta',
        email: 'beta@college.edu',
        role: 'INCHARGE',
        assignedBusId: busB.id,
        busNumber: busB.busNumber,
        status: 'APPROVED',
        active: true,
        approved: true,
      };
      (storage as any).users.push(inchargeUserB);
      tokenB = generateToken(inchargeUserB);
    });

    afterAll(async () => {
      if (server) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('In-Charge A cannot start attendance for Bus B (HTTP 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/attendance/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          busId: busB.id,
          sessionType: 'MORNING',
          attendanceMode: 'GROUND',
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Access Denied');
    });

    it('In-Charge A can start attendance for Bus A (HTTP 201 Created)', async () => {
      const res = await fetch(`${baseUrl}/api/attendance/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          busId: busA.id,
          sessionType: 'MORNING',
          attendanceMode: 'GROUND',
        }),
      });

      expect([200, 201]).toContain(res.status);
      const data = await res.json();
      expect(data.session).toBeDefined();
      expect(data.session.busId).toBe(busA.id);

      // Incharge B cannot end Incharge A's session
      const endResUnauthorized = await fetch(`${baseUrl}/api/attendance/session/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          sessionId: data.session.id,
        }),
      });
      expect(endResUnauthorized.status).toBe(403);

      // Incharge A can end their own session
      const endResAuthorized = await fetch(`${baseUrl}/api/attendance/session/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          sessionId: data.session.id,
        }),
      });
      expect(endResAuthorized.status).toBe(200);
    });

    it('Ending attendance with an invalid/missing sessionId is rejected with 400/404, not unconstrained session fallback', async () => {
      const missingRes = await fetch(`${baseUrl}/api/attendance/session/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({}),
      });
      expect(missingRes.status).toBe(400);

      const invalidRes = await fetch(`${baseUrl}/api/attendance/session/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ sessionId: 'NON-EXISTENT-SESSION-XYZ' }),
      });
      expect(invalidRes.status).toBe(404);
    });
  });
});
