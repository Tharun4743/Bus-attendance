import { StorageAdapter } from '../storage/StorageAdapter';
import { calculateDistance } from './haversine';
import { evaluateSessionStatus, getISTDateString } from './session';
import {
  AttendanceRecord,
  GpsReading,
  LocationVerificationRequest,
  LocationVerificationResponse,
  SessionType,
  User,
} from '../../types';

export class AttendanceVerifier {
  constructor(private storage: StorageAdapter) {}

  public async verifyStudentLocation(
    authUser: User,
    req: LocationVerificationRequest
  ): Promise<LocationVerificationResponse> {
    // 1. Authenticate and identify student
    if (authUser.role !== 'STUDENT') {
      return {
        status: 'LOCATION_UNAVAILABLE',
        message: 'Only registered students can submit attendance.',
      };
    }

    const studentId = authUser.studentId || authUser.id;
    const student = await this.storage.getStudentById(studentId);

    if (!student) {
      return {
        status: 'LOCATION_UNAVAILABLE',
        message: 'Student record not found in registered commuter roster.',
      };
    }

    // 2. Check student active and approved
    if (!student.active || !student.approved || student.status !== 'APPROVED') {
      return {
        status: 'NOT_PRESENT',
        message: 'Student account is pending approval or inactive. Please contact your administrator.',
      };
    }

    // 3. Check assigned bus
    if (!student.busId) {
      return {
        status: 'BUS_MISMATCH',
        message: 'No bus assigned to this student. Please wait for administrator bus assignment.',
      };
    }

    const bus = await this.storage.getBusById(student.busId);
    if (!bus || !bus.active) {
      return {
        status: 'LOCATION_UNAVAILABLE',
        message: 'Assigned bus is currently inactive or not found.',
      };
    }

    const settings = await this.storage.getSettings();
    const todayDate = getISTDateString();

    // 4. Resolve Active Session for student's bus
    const activeDynamicSession = await this.storage.getActiveSession(student.busId);
    let sessionType: SessionType = 'EVENING';
    let targetLat: number = settings.location.latitude;
    let targetLon: number = settings.location.longitude;
    let targetRadius: number = settings.location.radiusMeters || 10;
    let maxAccuracy: number = settings.location.maxGpsAccuracyMeters || 20;
    let targetName: string = settings.location.name || 'College Ground';
    let isGroundMode = true;
    let sessionId: string | undefined = undefined;

    if (activeDynamicSession && activeDynamicSession.status === 'ACTIVE') {
      sessionId = activeDynamicSession.id;
      sessionType = activeDynamicSession.sessionType;
      isGroundMode = activeDynamicSession.attendanceMode === 'GROUND';
      targetRadius = activeDynamicSession.radiusMeters || (isGroundMode ? (settings.location.radiusMeters || 10) : 1000);
      maxAccuracy = activeDynamicSession.maxGpsAccuracyMeters || (isGroundMode ? (settings.location.maxGpsAccuracyMeters || 20) : 1500);

      // Bus Isolation Security check: Student must belong to the active session bus
      if (activeDynamicSession.busId !== 'ALL' && activeDynamicSession.busId !== student.busId) {
        return {
          status: 'BUS_MISMATCH',
          message: `Active session is for Bus ${activeDynamicSession.busId}. You are assigned to Bus ${student.busId}.`,
        };
      }

      if (activeDynamicSession.location) {
        targetLat = activeDynamicSession.location.latitude;
        targetLon = activeDynamicSession.location.longitude;
        targetName = activeDynamicSession.location.name || targetName;
      }
    } else {
      // Check scheduled evening session if automatic scheduling is active
      const sessionInfo = evaluateSessionStatus(settings);
      if (sessionInfo.status === 'ACTIVE') {
        sessionType = 'EVENING';
        isGroundMode = true;
      } else if (sessionInfo.status === 'UPCOMING') {
        return {
          status: 'SESSION_NOT_FOUND',
          message: `No active attendance session found. Scheduled evening window opens at ${settings.startTime} IST.`,
        };
      } else {
        return {
          status: 'SESSION_CLOSED',
          message: 'The attendance session is currently closed or not started by the bus in-charge.',
        };
      }
    }

    // 5. Check duplicate attendance for today + sessionType
    const existingRecord = await this.storage.getAttendanceRecord(
      student.id,
      todayDate,
      sessionType
    );

    if (existingRecord && existingRecord.status === 'PRESENT') {
      return {
        status: 'PRESENT',
        message: 'Attendance already recorded and verified for this session.',
        distanceMeters: existingRecord.distanceMeters ?? undefined,
        accuracyMeters: existingRecord.accuracyMeters ?? undefined,
        verifiedAt: existingRecord.verifiedAt,
        record: existingRecord,
        studentName: student.name,
        registerNumber: student.registerNumber,
        busId: student.busId,
      };
    }

    const nowIso = new Date().toISOString();

    // 6. TRAVELLING BUS ATTENDANCE MODE (Part 9)
    // Non-code, non-mock session participation for en-route transit
    if (!isGroundMode) {
      const travellingRecord: AttendanceRecord = {
        id: `ATT-${todayDate.replace(/-/g, '')}-${sessionType}-${student.id}`,
        studentId: student.id,
        busId: student.busId,
        attendanceDate: todayDate,
        sessionType,
        attendanceMode: 'TRAVELLING',
        sessionId,
        status: 'PRESENT',
        latitude: typeof req.latitude === 'number' ? req.latitude : null,
        longitude: typeof req.longitude === 'number' ? req.longitude : null,
        accuracyMeters: typeof req.accuracy === 'number' ? req.accuracy : null,
        distanceMeters: null,
        capturedAt: req.capturedAt || nowIso,
        verifiedAt: nowIso,
        verificationMethod: 'TRAVELLING_SESSION_PARTICIPATION',
      };

      const saved = await this.storage.createAttendance(travellingRecord);

      return {
        status: 'PRESENT',
        message: `Travelling bus participation verified for Bus ${bus.busNumber}.`,
        verifiedAt: nowIso,
        record: saved,
        studentName: student.name,
        registerNumber: student.registerNumber,
        busId: student.busId,
      };
    }

    // 7. GROUND ATTENDANCE GEOFENCE VERIFICATION (Part 8)
    // Browser Geolocation coordinates independently evaluated using Haversine against College Ground
    let readings: GpsReading[] = [];
    if (req.readings && Array.isArray(req.readings) && req.readings.length > 0) {
      readings = req.readings;
    } else if (
      typeof req.latitude === 'number' &&
      typeof req.longitude === 'number'
    ) {
      readings = [
        {
          latitude: req.latitude,
          longitude: req.longitude,
          accuracy: typeof req.accuracy === 'number' ? req.accuracy : 5,
          timestamp: req.capturedAt || nowIso,
        },
      ];
    } else {
      return {
        status: 'LOCATION_PERMISSION_DENIED',
        message: 'Location access is required for ground verification. Please allow GPS permissions in your browser and retry.',
      };
    }

    // Validate coordinate ranges & accuracy for each reading
    const calculatedDistances: number[] = [];
    const accuracies: number[] = [];

    for (const r of readings) {
      if (
        typeof r.latitude !== 'number' ||
        isNaN(r.latitude) ||
        r.latitude < -90 ||
        r.latitude > 90 ||
        typeof r.longitude !== 'number' ||
        isNaN(r.longitude) ||
        r.longitude < -180 ||
        r.longitude > 180
      ) {
        return {
          status: 'INVALID_LOCATION',
          message: 'Invalid GPS coordinates detected from mobile device.',
        };
      }

      const acc = typeof r.accuracy === 'number' && !isNaN(r.accuracy) ? r.accuracy : 10;

      if (acc > maxAccuracy) {
        return {
          status: 'LOW_GPS_ACCURACY',
          message: `Location accuracy (${Math.round(acc)}m) is insufficient. Acceptable tolerance is within ${maxAccuracy}m. Move to an open area away from tall obstacles and retry.`,
          accuracyMeters: acc,
        };
      }

      const dist = calculateDistance(r.latitude, r.longitude, targetLat, targetLon);
      calculatedDistances.push(dist);
      accuracies.push(acc);
    }

    const avgDistance =
      Math.round(
        (calculatedDistances.reduce((a, b) => a + b, 0) / calculatedDistances.length) * 100
      ) / 100;
    const avgAccuracy =
      Math.round((accuracies.reduce((a, b) => a + b, 0) / accuracies.length) * 10) / 10;
    const maxDist = Math.max(...calculatedDistances);
    const minDist = Math.min(...calculatedDistances);
    const jitterSpread = Math.round((maxDist - minDist) * 100) / 100;

    if (readings.length >= 2 && jitterSpread > 25) {
      return {
        status: 'LOW_GPS_ACCURACY',
        message: 'High GPS jitter detected. Move to an open area with clear sky view and retry.',
        distanceMeters: avgDistance,
        accuracyMeters: avgAccuracy,
      };
    }

    // Geofence enforcement: Must be within target radius (default 10 metres)
    if (avgDistance <= targetRadius || (maxDist <= targetRadius + 0.5 && avgDistance <= targetRadius)) {
      const presentRecord: AttendanceRecord = {
        id: `ATT-${todayDate.replace(/-/g, '')}-${sessionType}-${student.id}`,
        studentId: student.id,
        busId: student.busId,
        attendanceDate: todayDate,
        sessionType,
        attendanceMode: 'GROUND',
        sessionId,
        status: 'PRESENT',
        latitude: readings[0].latitude,
        longitude: readings[0].longitude,
        accuracyMeters: avgAccuracy,
        distanceMeters: avgDistance,
        capturedAt: req.capturedAt || nowIso,
        verifiedAt: nowIso,
        verificationMethod: 'GROUND_GEOFENCE',
      };

      const saved = await this.storage.createAttendance(presentRecord);

      return {
        status: 'PRESENT',
        message: `Verified at ${targetName} (${avgDistance}m from bay, geofence radius: ${targetRadius}m).`,
        distanceMeters: avgDistance,
        accuracyMeters: avgAccuracy,
        verifiedAt: nowIso,
        record: saved,
        studentName: student.name,
        registerNumber: student.registerNumber,
        busId: student.busId,
      };
    } else {
      return {
        status: 'OUTSIDE_GEOFENCE',
        message: `Outside College Ground geofence (${avgDistance}m away). You must be within ${targetRadius}m of ${targetName}.`,
        distanceMeters: avgDistance,
        accuracyMeters: avgAccuracy,
      };
    }
  }
}
