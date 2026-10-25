import { describe, it, expect, afterAll } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import { getStorage } from '../src/server/storage';
import { calculateDistance } from '../src/server/attendance/haversine';
import { AttendanceVerifier } from '../src/server/attendance/verifier';
import { User } from '../src/types';

describe('⚡ Dynamic Dual-Radius Attendance Architecture Circuit', () => {
  const storage = getStorage();
  const verifier = new AttendanceVerifier(storage);
  const testStudentId = 'STU-TESTDUAL01';
  const testEmail = 'dualtest@college.edu';

  afterAll(async () => {
    try {
      if ('pool' in (storage as any)) {
        await (storage as any).pool.query("DELETE FROM public.attendance_records WHERE student_id = $1", [testStudentId]);
        await (storage as any).pool.query("DELETE FROM public.students WHERE id = $1", [testStudentId]);
        await (storage as any).pool.query("DELETE FROM public.users WHERE email = $1", [testEmail]);
        await (storage as any).pool.query("DELETE FROM public.active_sessions WHERE started_by = 'Test Dual Runner'");
      } else {
        if ('attendance' in (storage as any)) {
          (storage as any).attendance = (storage as any).attendance.filter((a: any) => a.studentId !== testStudentId);
        }
        if ('students' in (storage as any)) {
          (storage as any).students = (storage as any).students.filter((s: any) => s.id !== testStudentId);
        }
        if ('users' in (storage as any)) {
          (storage as any).users = (storage as any).users.filter((u: any) => u.email !== testEmail);
        }
      }
    } catch {
      // Ignore cleanup error
    }
  });

  it('Circuit 1: Stationary / Ground Mode establishes strict ~35m perimeter', async () => {
    // Campus reference anchor (VSB Engineering College Campus: 10.9572, 78.0766)
    const baseLat = 10.9572;
    const baseLon = 78.0766;

    // Point A: ~20m away (Approx 0.00018 degrees)
    const insideBayLat = 10.95735;
    const insideBayLon = 78.0766;
    const distInside = calculateDistance(insideBayLat, insideBayLon, baseLat, baseLon);
    expect(distInside).toBeLessThanOrEqual(35);

    // Point B: ~75m away (Outside the 35m strict bay limit)
    const outsideBayLat = 10.9579;
    const outsideBayLon = 78.0766;
    const distOutside = calculateDistance(outsideBayLat, outsideBayLon, baseLat, baseLon);
    expect(distOutside).toBeGreaterThan(35);
  });

  it('Circuit 2: Travelling Highway Mode accommodates extended ~1000m motion radius', async () => {
    const transitAnchorLat = 10.9572;
    const transitAnchorLon = 78.0766;

    // Moving commuter on bus: ~450m away from initial anchor
    const inMotionLat = 10.9610;
    const inMotionLon = 78.0766;
    const distInMotion = calculateDistance(inMotionLat, inMotionLon, transitAnchorLat, transitAnchorLon);
    expect(distInMotion).toBeLessThanOrEqual(1000);
    expect(distInMotion).toBeGreaterThan(100);

    // Off-route commuter: ~1600m away
    const farLat = 10.9720;
    const farLon = 78.0766;
    const distFar = calculateDistance(farLat, farLon, transitAnchorLat, transitAnchorLon);
    expect(distFar).toBeGreaterThan(1000);
  });

  it('Circuit 3: AttendanceVerifier applies mode-specific radius and boundary enforcement', async () => {
    // 0. Ensure assigned bus exists and is active
    let bus = await storage.getBusById('BUS06');
    if (!bus) {
      await storage.createBus({
        busNumber: 'BUS06',
        routeName: 'Karur - Campus Transit',
        inchargeId: '',
        capacity: 50,
        active: true,
      });
    }

    // 1. Ensure test student exists
    let student = await storage.getStudentById(testStudentId);
    if (!student) {
      student = await storage.createStudent({
        name: 'Dual Mode Commuter',
        registerNumber: 'TESTDUAL01',
        email: testEmail,
        phone: '+91 9876543210',
        busId: 'BUS06',
        role: 'STUDENT',
        status: 'APPROVED',
        approved: true,
        active: true,
      });
    }

    const testUser: User = {
      id: student.id,
      email: student.email,
      name: student.name,
      role: 'STUDENT',
      studentId: student.id,
      assignedBusId: 'BUS06',
    };

    // 2. Start Stationary Ground Session (Radius 35m)
    const stationarySession = await storage.saveActiveSession({
      id: `SESSION-TEST-STATIONARY-${Date.now()}`,
      sessionType: 'EVENING',
      attendanceMode: 'GROUND',
      verificationMethod: 'CODE_GPS',
      busId: 'BUS06',
      status: 'ACTIVE',
      startedBy: 'Test Dual Runner',
      currentCode: '998877',
      codeIssuedAt: new Date().toISOString(),
      codeExpiresAt: new Date(Date.now() + 60000).toISOString(),
      radiusMeters: 35,
      maxGpsAccuracyMeters: 60,
      location: {
        type: 'FIXED',
        name: 'Campus Bus Bay',
        latitude: 10.9572,
        longitude: 78.0766,
        accuracyMeters: 10,
        updatedAt: new Date().toISOString(),
      },
      startedAt: new Date().toISOString(),
      endedAt: null,
    });

    expect(stationarySession.attendanceMode).toBe('GROUND');
    expect(stationarySession.radiusMeters).toBe(35);

    // 3. Test verification outside stationary perimeter (~75m away)
    const groundOutsideResult = await verifier.verifyStudentLocation(testUser, {
      code: '998877',
      latitude: 10.9579,
      longitude: 78.0766,
      accuracy: 10,
    });
    expect(groundOutsideResult.status).toBe('INVALID_LOCATION');
    expect(groundOutsideResult.message).toContain('Outside stationary bus bay boundary');

    // 3b. Test verification INSIDE stationary perimeter (~15m away)
    const groundInsideResult = await verifier.verifyStudentLocation(testUser, {
      code: '998877',
      latitude: 10.9573,
      longitude: 78.0766,
      accuracy: 5,
    });
    expect(groundInsideResult.status).toBe('PRESENT');
    expect(groundInsideResult.record?.attendanceMode).toBe('GROUND');

    // 4. Close stationary session and start Travelling Session (Radius 1000m)
    await storage.endActiveSession(stationarySession.id);

    // Delete today's attendance record for re-test with travelling session
    if ('pool' in (storage as any)) {
      await (storage as any).pool.query("DELETE FROM public.attendance_records WHERE student_id = $1", [testStudentId]);
    } else if ('attendance' in (storage as any)) {
      (storage as any).attendance = (storage as any).attendance.filter((a: any) => a.studentId !== testStudentId);
    }

    const travellingSession = await storage.saveActiveSession({
      id: `SESSION-TEST-TRAVELLING-${Date.now()}`,
      sessionType: 'EVENING',
      attendanceMode: 'TRAVELLING',
      verificationMethod: 'CODE_GPS',
      busId: 'BUS06',
      status: 'ACTIVE',
      startedBy: 'Test Dual Runner',
      currentCode: '112233',
      codeIssuedAt: new Date().toISOString(),
      codeExpiresAt: new Date(Date.now() + 60000).toISOString(),
      radiusMeters: 1000,
      maxGpsAccuracyMeters: 1500,
      location: {
        type: 'ADMIN_DYNAMIC',
        name: 'Dharapuram Highway Transit',
        latitude: 10.9572,
        longitude: 78.0766,
        accuracyMeters: 15,
        updatedAt: new Date().toISOString(),
      },
      startedAt: new Date().toISOString(),
      endedAt: null,
    });

    expect(travellingSession.attendanceMode).toBe('TRAVELLING');
    expect(travellingSession.radiusMeters).toBe(1000);

    // 5. Test verification outside travelling perimeter (~1600m away)
    const travellingOutsideResult = await verifier.verifyStudentLocation(testUser, {
      code: '112233',
      latitude: 10.9720,
      longitude: 78.0766,
      accuracy: 25,
    });
    expect(travellingOutsideResult.status).toBe('INVALID_LOCATION');
    expect(travellingOutsideResult.message).toContain('Outside travelling transit boundary');

    // 5b. Test verification INSIDE travelling perimeter (~450m away in motion)
    const travellingInsideResult = await verifier.verifyStudentLocation(testUser, {
      code: '112233',
      latitude: 10.9610,
      longitude: 78.0766,
      accuracy: 20,
    });
    expect(travellingInsideResult.status).toBe('PRESENT');
    expect(travellingInsideResult.record?.attendanceMode).toBe('TRAVELLING');

    // Clean up travelling session
    await storage.endActiveSession(travellingSession.id);
  }, 15000);
});
