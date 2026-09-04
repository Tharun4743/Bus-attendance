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
        message: 'Student record not found.',
      };
    }

    // 2. Check student active
    if (!student.active) {
      return {
        status: 'NOT_PRESENT',
        message: 'Student account is inactive. Please contact your administrator.',
      };
    }

    // 3. Check assigned bus
    if (!student.busId) {
      return {
        status: 'LOCATION_UNAVAILABLE',
        message: 'No bus assigned to this student.',
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

    // 4. Resolve Active Session
    const activeDynamicSession = await this.storage.getActiveSession();
    let sessionType: SessionType = 'EVENING';
    let targetLat: number = settings.location.latitude;
    let targetLon: number = settings.location.longitude;
    let targetRadius: number = settings.location.radiusMeters || 10;
    let maxAccuracy: number = settings.location.maxGpsAccuracyMeters || 20;
    let targetName: string = settings.location.name;
    let isGroundMode = true;
    let requiresGps = true;
    let sessionId: string | undefined = undefined;

    if (activeDynamicSession && activeDynamicSession.status === 'ACTIVE') {
      sessionId = activeDynamicSession.id;
      sessionType = activeDynamicSession.sessionType;
      isGroundMode = activeDynamicSession.attendanceMode === 'GROUND';
      requiresGps = activeDynamicSession.verificationMethod === 'CODE_GPS' && isGroundMode;
      targetRadius = activeDynamicSession.radiusMeters || 10;
      maxAccuracy = activeDynamicSession.maxGpsAccuracyMeters || 20;

      // 4a. Validate 6-digit dynamic code
      const submittedCode = (req.code || '').toString().trim();
      const activeCode = (activeDynamicSession.currentCode || '').toString().trim();

      if (!submittedCode || submittedCode !== activeCode) {
        return {
          status: 'INVALID_CODE',
          message: 'The attendance code is incorrect or has expired.',
        };
      }

      // 4b. Code expiration check
      if (activeDynamicSession.codeExpiresAt) {
        const now = Date.now();
        const expiry = new Date(activeDynamicSession.codeExpiresAt).getTime();
        if (now > expiry) {
          return {
            status: 'INVALID_CODE',
            message: 'The attendance code is incorrect or has expired.',
          };
        }
      }

      // 4c. Bus Isolation Security check: Student must belong to the active session bus
      if (activeDynamicSession.busId !== 'ALL' && activeDynamicSession.busId !== student.busId) {
        return {
          status: 'BUS_MISMATCH',
          message: 'You are not assigned to this bus.',
        };
      }

      if (activeDynamicSession.location) {
        targetLat = activeDynamicSession.location.latitude;
        targetLon = activeDynamicSession.location.longitude;
        targetName = activeDynamicSession.location.name || targetName;
      }
    } else {
      // Default Ground Evening Scheduled window
      const sessionInfo = evaluateSessionStatus(settings);
      if (sessionInfo.status !== 'ACTIVE') {
        if (sessionInfo.status === 'UPCOMING') {
          return {
            status: 'NOT_PRESENT',
            message: `Attendance is currently inactive. Scheduled evening window opens at ${settings.startTime} IST.`,
          };
        }
        return {
          status: 'NOT_PRESENT',
          message: `Attendance session is no longer active.`,
        };
      }
      sessionType = 'EVENING';
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
        message: 'Attendance already recorded for this session.',
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

    // 6. Handle Verification Method: Code Only or Travelling Bus Mode
    if (!requiresGps) {
      const presentRecord: AttendanceRecord = {
        id: `ATT-${todayDate.replace(/-/g, '')}-${sessionType}-${student.id}`,
        studentId: student.id,
        busId: student.busId,
        attendanceDate: todayDate,
        sessionType,
        attendanceMode: activeDynamicSession?.attendanceMode || 'TRAVELLING',
        sessionId,
        status: 'PRESENT',
        codeUsed: req.code?.trim(),
        latitude: typeof req.latitude === 'number' ? req.latitude : null,
        longitude: typeof req.longitude === 'number' ? req.longitude : null,
        accuracyMeters: typeof req.accuracy === 'number' ? req.accuracy : null,
        distanceMeters: null,
        capturedAt: req.capturedAt || nowIso,
        verifiedAt: nowIso,
        verificationMethod: 'DYNAMIC_CODE',
      };

      await this.storage.createAttendance(presentRecord);

      return {
        status: 'PRESENT',
        message: 'Attendance verified successfully.',
        verifiedAt: nowIso,
        record: presentRecord,
        studentName: student.name,
        registerNumber: student.registerNumber,
        busId: student.busId,
      };
    }

    // 7. Ground Mode with GPS Geofencing Validation
    let readings: GpsReading[] = [];
    if (req.readings && Array.isArray(req.readings) && req.readings.length > 0) {
      readings = req.readings;
    } else if (
      typeof req.latitude === 'number' &&
      typeof req.longitude === 'number' &&
      typeof req.accuracy === 'number'
    ) {
      readings = [
        {
          latitude: req.latitude,
          longitude: req.longitude,
          accuracy: req.accuracy,
          timestamp: req.capturedAt || nowIso,
        },
      ];
    } else {
      return {
        status: 'LOCATION_UNAVAILABLE',
        message: 'Location access required. Enable location in Chrome and try again.',
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
          message: 'Invalid GPS coordinates detected.',
        };
      }

      if (typeof r.accuracy !== 'number' || isNaN(r.accuracy) || r.accuracy < 0) {
        return {
          status: 'LOCATION_UNAVAILABLE',
          message: 'Invalid GPS accuracy received.',
        };
      }

      if (r.accuracy > maxAccuracy) {
        return {
          status: 'LOCATION_UNAVAILABLE',
          message: `Location accuracy (${Math.round(r.accuracy)}m) is insufficient. Move to an open area and try again.`,
          accuracyMeters: r.accuracy,
        };
      }

      const dist = calculateDistance(r.latitude, r.longitude, targetLat, targetLon);
      calculatedDistances.push(dist);
      accuracies.push(r.accuracy);
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
        status: 'LOCATION_UNAVAILABLE',
        message: 'Your current location cannot be verified accurately. Move to an open area and try again.',
        distanceMeters: avgDistance,
        accuracyMeters: avgAccuracy,
      };
    }

    // Geofence check
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
        codeUsed: req.code?.trim(),
        latitude: readings[0].latitude,
        longitude: readings[0].longitude,
        accuracyMeters: avgAccuracy,
        distanceMeters: avgDistance,
        capturedAt: req.capturedAt || nowIso,
        verifiedAt: nowIso,
        verificationMethod: 'DYNAMIC_CODE_GPS',
      };

      await this.storage.createAttendance(presentRecord);

      return {
        status: 'PRESENT',
        message: `Verified at ${targetName} (${avgDistance}m).`,
        distanceMeters: avgDistance,
        accuracyMeters: avgAccuracy,
        verifiedAt: nowIso,
        record: presentRecord,
        studentName: student.name,
        registerNumber: student.registerNumber,
        busId: student.busId,
      };
    } else {
      return {
        status: 'INVALID_LOCATION',
        message: `Outside attendance boundary (${avgDistance}m away). Stay within ${targetRadius}m of ${targetName}.`,
        distanceMeters: avgDistance,
        accuracyMeters: avgAccuracy,
      };
    }
  }
}
