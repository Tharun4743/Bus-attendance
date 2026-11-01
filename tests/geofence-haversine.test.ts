import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDistance,
  calculateVelocity,
  isVelocitySpoofed,
  calculateJitterSpread,
  isJitterExcessive,
  isWithinGeofence,
} from '../src/server/attendance/haversine';
import { AttendanceVerifier } from '../src/server/attendance/verifier';
import { MemoryStorageAdapter } from '../src/server/storage/MemoryStorageAdapter';
import { setStorageInstance } from '../src/server/storage';
import { getISTDateString } from '../src/server/attendance/session';
import { User, Student, Bus, ActiveSession } from '../src/types';

describe('⚡ Circuit 3: Geofence, Haversine, Velocity Anti-Spoofing & Jitter Regression Suite', () => {
  let storage: MemoryStorageAdapter;
  let verifier: AttendanceVerifier;

  // Campus Ground Reference: VSB Engineering College
  const CAMPUS_GROUND_LAT = 10.9572;
  const CAMPUS_GROUND_LON = 78.0766;

  const testStudentUser: User = {
    id: 'STU-721420104050',
    name: 'Ananya R',
    email: 'ananya.geo@college.edu',
    role: 'STUDENT',
    studentId: 'STU-721420104050',
    assignedBusId: 'BUS-GEO-1',
    active: true,
    approved: true,
    status: 'APPROVED',
  };

  const testStudentProfile: Student = {
    id: 'STU-721420104050',
    registerNumber: '721420104050',
    name: 'Ananya R',
    email: 'ananya.geo@college.edu',
    busId: 'BUS-GEO-1',
    active: true,
    approved: true,
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
  };

  const testBus: Bus = {
    id: 'BUS-GEO-1',
    busNumber: 'BUS-GEO-1',
    routeName: 'Campus Transit Express',
    capacity: 50,
    active: true,
  };

  beforeEach(async () => {
    storage = new MemoryStorageAdapter();
    setStorageInstance(storage);
    verifier = new AttendanceVerifier(storage);

    await storage.createBus(testBus);
    await storage.createUser(testStudentUser);
    await storage.createStudent(testStudentProfile);

    // Configure system settings with 10m campus ground radius
    await storage.updateSettings({
      location: {
        name: 'College Ground Bay 5',
        latitude: CAMPUS_GROUND_LAT,
        longitude: CAMPUS_GROUND_LON,
        radiusMeters: 10,
        maxGpsAccuracyMeters: 20,
      },
    });
  });

  // --------------------------------------------------------------------------
  // 1. HAVERSINE DISTANCE CALCULATIONS AGAINST PRECISE GPS COORDINATES
  // --------------------------------------------------------------------------
  describe('1. Haversine Distance Calculations against Precise GPS Coordinates', () => {
    it('1.1: Distance between identical points is exactly 0.00 meters', () => {
      const dist = calculateDistance(CAMPUS_GROUND_LAT, CAMPUS_GROUND_LON, CAMPUS_GROUND_LAT, CAMPUS_GROUND_LON);
      expect(dist).toBe(0);
    });

    it('1.2: Calculates 1 degree latitude displacement with high spherical accuracy (~111,195 m)', () => {
      const dist = calculateDistance(0, 0, 1, 0);
      // Theoretical spherical Earth 1 degree of meridian arc = 6371000 * (PI / 180) = 111194.93m
      expect(dist).toBeGreaterThan(111190);
      expect(dist).toBeLessThan(111200);
      expect(dist).toBe(111194.93);
    });

    it('1.3: Calculation is symmetric (d(A, B) === d(B, A))', () => {
      const latA = 10.9572;
      const lonA = 78.0766;
      const latB = 10.9578;
      const lonB = 78.0772;

      const distAB = calculateDistance(latA, lonA, latB, lonB);
      const distBA = calculateDistance(latB, lonB, latA, lonA);

      expect(distAB).toBe(distBA);
      expect(distAB).toBeGreaterThan(0);
    });

    it('1.4: Accurate metric evaluation for micro-distances within campus ground scale (5m to 50m)', () => {
      // Offset of ~0.0000458 degrees longitude at 10.9572 deg latitude is approximately 5.0 meters
      const lonOffset5m = CAMPUS_GROUND_LON + 0.0000458;
      const dist5m = calculateDistance(CAMPUS_GROUND_LAT, CAMPUS_GROUND_LON, CAMPUS_GROUND_LAT, lonOffset5m);
      expect(dist5m).toBeGreaterThanOrEqual(4.9);
      expect(dist5m).toBeLessThanOrEqual(5.1);

      // Offset of ~0.0000898 degrees latitude is approximately 10.0 meters
      const latOffset10m = CAMPUS_GROUND_LAT + 0.0000898;
      const dist10m = calculateDistance(CAMPUS_GROUND_LAT, CAMPUS_GROUND_LON, latOffset10m, CAMPUS_GROUND_LON);
      expect(dist10m).toBeGreaterThanOrEqual(9.9);
      expect(dist10m).toBeLessThanOrEqual(10.1);
    });

    it('1.5: Handles antipodal and hemisphere crossover coordinates without NaN errors', () => {
      const northPole = { lat: 90, lon: 0 };
      const southPole = { lat: -90, lon: 0 };
      const polarDist = calculateDistance(northPole.lat, northPole.lon, southPole.lat, southPole.lon);

      // Half Earth circumference = PI * R = 3.14159265 * 6371000 = 20,015,087m
      expect(polarDist).toBeGreaterThan(20000000);
      expect(polarDist).toBeLessThan(20030000);
      expect(isNaN(polarDist)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 2. 10m COLLEGE GROUND RADIUS THRESHOLD & TRAVELLING TRANSIT THRESHOLD
  // --------------------------------------------------------------------------
  describe('2. 10m College Ground Radius & Travelling Transit Thresholds', () => {
    it('2.1: isWithinGeofence evaluates true within 10m threshold and false outside', () => {
      const targetLat = CAMPUS_GROUND_LAT;
      const targetLon = CAMPUS_GROUND_LON;
      const radiusMeters = 10;

      // Point at 4.5m distance -> within 10m
      const nearLon = targetLon + 0.000041;
      expect(isWithinGeofence(targetLat, nearLon, targetLat, targetLon, radiusMeters)).toBe(true);

      // Point at 9.8m distance -> within 10m
      const boundaryLat = targetLat + 0.000088;
      expect(isWithinGeofence(boundaryLat, targetLon, targetLat, targetLon, radiusMeters)).toBe(true);

      // Point at 25.0m distance -> outside 10m
      const outsideLat = targetLat + 0.000225;
      expect(isWithinGeofence(outsideLat, targetLon, targetLat, targetLon, radiusMeters)).toBe(false);
    });

    it('2.2: Verifier grants PRESENT status when student is within 10m College Ground geofence', async () => {
      const today = getISTDateString();
      const activeGroundSession: ActiveSession = {
        id: `SESSION-${Date.now()}-BUS-GEO-1`,
        sessionType: 'EVENING',
        attendanceMode: 'GROUND',
        status: 'ACTIVE',
        busId: testBus.id,
        startTime: '16:50',
        endTime: '17:15',
        date: today,
        radiusMeters: 10,
        maxGpsAccuracyMeters: 20,
        location: {
          name: 'College Ground Bay 5',
          latitude: CAMPUS_GROUND_LAT,
          longitude: CAMPUS_GROUND_LON,
          radiusMeters: 10,
        },
      };
      await storage.saveActiveSession(activeGroundSession);

      // Student is at 4 meters distance from College Ground center
      const studentLat = CAMPUS_GROUND_LAT + 0.000035;
      const studentLon = CAMPUS_GROUND_LON;

      const res = await verifier.verifyStudentLocation(testStudentUser, {
        latitude: studentLat,
        longitude: studentLon,
        accuracy: 6,
      });

      expect(res.status).toBe('PRESENT');
      expect(res.verificationMethod).toBeUndefined(); // Verifier returns response object with record
      expect(res.record?.verificationMethod).toBe('GROUND_GEOFENCE');
      expect(res.record?.attendanceMode).toBe('GROUND');
      expect(res.distanceMeters).toBeLessThanOrEqual(10);
      expect(res.message).toContain('Verified at College Ground Bay 5');
    });

    it('2.3: Verifier returns OUTSIDE_GEOFENCE when student is beyond the 10m College Ground boundary', async () => {
      const today = getISTDateString();
      const activeGroundSession: ActiveSession = {
        id: `SESSION-GROUND-${Date.now()}`,
        sessionType: 'EVENING',
        attendanceMode: 'GROUND',
        status: 'ACTIVE',
        busId: testBus.id,
        startTime: '16:50',
        endTime: '17:15',
        date: today,
        radiusMeters: 10,
        maxGpsAccuracyMeters: 20,
        location: {
          name: 'College Ground Bay 5',
          latitude: CAMPUS_GROUND_LAT,
          longitude: CAMPUS_GROUND_LON,
          radiusMeters: 10,
        },
      };
      await storage.saveActiveSession(activeGroundSession);

      // Student is at 35 meters distance from College Ground
      const studentLat = CAMPUS_GROUND_LAT + 0.000315;
      const studentLon = CAMPUS_GROUND_LON;

      const res = await verifier.verifyStudentLocation(testStudentUser, {
        latitude: studentLat,
        longitude: studentLon,
        accuracy: 8,
      });

      expect(res.status).toBe('OUTSIDE_GEOFENCE');
      expect(res.distanceMeters).toBeGreaterThan(10);
      expect(res.message).toContain('Outside College Ground geofence');
      expect(res.message).toContain('You must be within 10m');
    });

    it('2.4: Travelling Transit mode allows en-route participation across transit corridor', async () => {
      const today = getISTDateString();
      const activeTransitSession: ActiveSession = {
        id: `SESSION-TRANSIT-${Date.now()}`,
        sessionType: 'EVENING',
        attendanceMode: 'TRAVELLING',
        status: 'ACTIVE',
        busId: testBus.id,
        startTime: '17:00',
        endTime: '17:45',
        date: today,
        radiusMeters: 1000,
        maxGpsAccuracyMeters: 1500,
        location: {
          name: 'Highway Transit Corridor',
          latitude: CAMPUS_GROUND_LAT + 0.05, // 5.5 km away from college ground
          longitude: CAMPUS_GROUND_LON + 0.05,
          radiusMeters: 1000,
        },
      };
      await storage.saveActiveSession(activeTransitSession);

      // Student participates while bus is in transit, kilometers away from college ground
      const transitLat = CAMPUS_GROUND_LAT + 0.045;
      const transitLon = CAMPUS_GROUND_LON + 0.045;

      const res = await verifier.verifyStudentLocation(testStudentUser, {
        latitude: transitLat,
        longitude: transitLon,
        accuracy: 15,
      });

      expect(res.status).toBe('PRESENT');
      expect(res.record?.attendanceMode).toBe('TRAVELLING');
      expect(res.record?.verificationMethod).toBe('TRAVELLING_SESSION_PARTICIPATION');
      expect(res.message).toContain('Travelling bus participation verified');
    });
  });

  // --------------------------------------------------------------------------
  // 3. GPS VELOCITY & ANTI-SPOOFING CHECK (>120 KM/H MOCK JUMP DETECTION)
  // --------------------------------------------------------------------------
  describe('3. GPS Velocity / Anti-Spoofing Check (>120 km/h Mock Jump Detection)', () => {
    it('3.1: Calculates velocity accurately from distance and elapsed time', () => {
      const baseTime = Date.now();

      // Normal walking: 20 meters in 15 seconds (1.33 m/s = 4.8 km/h)
      const walkP1 = {
        latitude: CAMPUS_GROUND_LAT,
        longitude: CAMPUS_GROUND_LON,
        timestamp: new Date(baseTime).toISOString(),
      };
      const walkP2 = {
        latitude: CAMPUS_GROUND_LAT + 0.00018, // ~20 meters
        longitude: CAMPUS_GROUND_LON,
        timestamp: new Date(baseTime + 15000).toISOString(),
      };

      const walkSpeed = calculateVelocity(walkP1, walkP2);
      expect(walkSpeed).toBeGreaterThan(4.0);
      expect(walkSpeed).toBeLessThan(6.0);
      expect(isVelocitySpoofed(walkP1, walkP2, 120)).toBe(false);

      // Normal bus speed: 500 meters in 30 seconds (16.67 m/s = 60.0 km/h)
      const busP1 = {
        latitude: CAMPUS_GROUND_LAT,
        longitude: CAMPUS_GROUND_LON,
        timestamp: new Date(baseTime).toISOString(),
      };
      const busP2 = {
        latitude: CAMPUS_GROUND_LAT + 0.0045, // ~500 meters
        longitude: CAMPUS_GROUND_LON,
        timestamp: new Date(baseTime + 30000).toISOString(),
      };

      const busSpeed = calculateVelocity(busP1, busP2);
      expect(busSpeed).toBeGreaterThan(55.0);
      expect(busSpeed).toBeLessThan(65.0);
      expect(isVelocitySpoofed(busP1, busP2, 120)).toBe(false);
    });

    it('3.2: Detects mock location teleportation jumps (>120 km/h) as spoofed', () => {
      const baseTime = Date.now();

      // Impossible mock jump: 1200 meters in 3 seconds (400 m/s = 1440 km/h)
      const spoofP1 = {
        latitude: CAMPUS_GROUND_LAT,
        longitude: CAMPUS_GROUND_LON,
        timestamp: new Date(baseTime).toISOString(),
      };
      const spoofP2 = {
        latitude: CAMPUS_GROUND_LAT + 0.0108, // ~1200 meters
        longitude: CAMPUS_GROUND_LON,
        timestamp: new Date(baseTime + 3000).toISOString(),
      };

      const spoofSpeed = calculateVelocity(spoofP1, spoofP2);
      expect(spoofSpeed).toBeGreaterThan(1000); // ~1440 km/h
      expect(isVelocitySpoofed(spoofP1, spoofP2, 120)).toBe(true);
    });

    it('3.3: AttendanceVerifier rejects submissions with mock jumps >120 km/h with INVALID_LOCATION', async () => {
      const today = getISTDateString();
      const activeGroundSession: ActiveSession = {
        id: `SESSION-SPOOF-TEST-${Date.now()}`,
        sessionType: 'EVENING',
        attendanceMode: 'GROUND',
        status: 'ACTIVE',
        busId: testBus.id,
        startTime: '16:50',
        endTime: '17:15',
        date: today,
        radiusMeters: 10,
        maxGpsAccuracyMeters: 20,
        location: {
          name: 'College Ground Bay 5',
          latitude: CAMPUS_GROUND_LAT,
          longitude: CAMPUS_GROUND_LON,
          radiusMeters: 10,
        },
      };
      await storage.saveActiveSession(activeGroundSession);

      const baseTime = Date.now();
      // Provide consecutive pings with an anomalous jump (>120 km/h)
      // Reading 1: at college ground
      // Reading 2: 800m away, only 2 seconds later (~1440 km/h)
      const res = await verifier.verifyStudentLocation(testStudentUser, {
        readings: [
          {
            latitude: CAMPUS_GROUND_LAT,
            longitude: CAMPUS_GROUND_LON,
            accuracy: 5,
            timestamp: new Date(baseTime).toISOString(),
          },
          {
            latitude: CAMPUS_GROUND_LAT + 0.0072, // ~800 meters jump
            longitude: CAMPUS_GROUND_LON,
            accuracy: 5,
            timestamp: new Date(baseTime + 2000).toISOString(),
          },
        ],
      });

      expect(res.status).toBe('INVALID_LOCATION');
      expect(res.message).toContain('High velocity anomaly detected');
      expect(res.message).toContain('Mock location jump rejected');
    });
  });

  // --------------------------------------------------------------------------
  // 4. GPS JITTER FILTER THRESHOLD
  // --------------------------------------------------------------------------
  describe('4. GPS Jitter Filter Threshold', () => {
    it('4.1: Calculates jitter spread accurately across coordinate clusters', () => {
      const readings = [
        { latitude: CAMPUS_GROUND_LAT, longitude: CAMPUS_GROUND_LON }, // dist = 0m
        { latitude: CAMPUS_GROUND_LAT + 0.000045, longitude: CAMPUS_GROUND_LON }, // dist = ~5.0m
        { latitude: CAMPUS_GROUND_LAT + 0.000072, longitude: CAMPUS_GROUND_LON }, // dist = ~8.0m
      ];

      const spread = calculateJitterSpread(readings, CAMPUS_GROUND_LAT, CAMPUS_GROUND_LON);
      expect(spread).toBeGreaterThanOrEqual(7.9);
      expect(spread).toBeLessThanOrEqual(8.1);
      expect(isJitterExcessive(spread, 25)).toBe(false);
    });

    it('4.2: Flags excessive jitter when spread exceeds 25 meter threshold', () => {
      const excessiveReadings = [
        { latitude: CAMPUS_GROUND_LAT, longitude: CAMPUS_GROUND_LON }, // dist = 0m
        { latitude: CAMPUS_GROUND_LAT + 0.000300, longitude: CAMPUS_GROUND_LON }, // dist = ~33.3m
      ];

      const spread = calculateJitterSpread(excessiveReadings, CAMPUS_GROUND_LAT, CAMPUS_GROUND_LON);
      expect(spread).toBeGreaterThan(25);
      expect(isJitterExcessive(spread, 25)).toBe(true);
    });

    it('4.3: AttendanceVerifier rejects high GPS jitter (>25m) with LOW_GPS_ACCURACY', async () => {
      const today = getISTDateString();
      const activeGroundSession: ActiveSession = {
        id: `SESSION-JITTER-${Date.now()}`,
        sessionType: 'EVENING',
        attendanceMode: 'GROUND',
        status: 'ACTIVE',
        busId: testBus.id,
        startTime: '16:50',
        endTime: '17:15',
        date: today,
        radiusMeters: 10,
        maxGpsAccuracyMeters: 20,
        location: {
          name: 'College Ground Bay 5',
          latitude: CAMPUS_GROUND_LAT,
          longitude: CAMPUS_GROUND_LON,
          radiusMeters: 10,
        },
      };
      await storage.saveActiveSession(activeGroundSession);

      const baseTime = Date.now();
      // Consecutive readings with high spatial divergence (>25m spread) but within acceptable speed
      // Reading 1: 0m
      // Reading 2: 30m away over 10 seconds (3 m/s = 10.8 km/h, reasonable speed, but jitter spread = 30m > 25m)
      const res = await verifier.verifyStudentLocation(testStudentUser, {
        readings: [
          {
            latitude: CAMPUS_GROUND_LAT,
            longitude: CAMPUS_GROUND_LON,
            accuracy: 6,
            timestamp: new Date(baseTime).toISOString(),
          },
          {
            latitude: CAMPUS_GROUND_LAT + 0.00027, // ~30m away
            longitude: CAMPUS_GROUND_LON,
            accuracy: 8,
            timestamp: new Date(baseTime + 10000).toISOString(),
          },
        ],
      });

      expect(res.status).toBe('LOW_GPS_ACCURACY');
      expect(res.message).toContain('High GPS jitter detected');
      expect(res.message).toContain('Move to an open area with clear sky view');
    });
  });
});
