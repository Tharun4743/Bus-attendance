import { Router, Request, Response, NextFunction } from 'express';
import { getStorage } from './storage';
import { generateToken, verifyToken, TokenPayload } from './auth';
import { evaluateSessionStatus, getISTDateString, getISTTimeString } from './attendance/session';
import { AttendanceVerifier } from './attendance/verifier';
import { ReportGenerator } from './reports/generator';
import { Role, User, SessionType, VerificationMethod } from '../types';
import { generateDynamic6DigitCode } from './attendance/codeGenerator';

export const apiRouter = Router();
const storage = getStorage();
const verifier = new AttendanceVerifier(storage);
const reportGen = new ReportGenerator(storage);

// Helper for extracting authenticated user
export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export function requireAuth(roles?: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized. Token required.' });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    if (roles && !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }

    req.user = user;
    next();
  };
}

// ----------------------------------------------------------------------
// Auth Routes & First-Time Setup
// ----------------------------------------------------------------------
apiRouter.get('/auth/setup-status', async (_req: Request, res: Response) => {
  try {
    const hasAdmin = await storage.hasAdmin();
    return res.json({ needsSetup: !hasAdmin });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/setup', async (req: Request, res: Response) => {
  try {
    const hasAdmin = await storage.hasAdmin();
    if (hasAdmin) {
      return res.status(400).json({ error: 'Admin account has already been configured.' });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required for initial setup.' });
    }

    const adminUser: User = {
      id: `ADMIN-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: 'ADMIN',
      active: true,
      approved: true,
      status: 'APPROVED',
    };

    await storage.createUser(adminUser);
    const token = generateToken(adminUser);
    const { password: _, ...safeUser } = adminUser;
    return res.status(201).json({ token, user: safeUser, message: 'Admin account setup successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Setup failed.' });
  }
});

apiRouter.post('/auth/signup', async (req: Request, res: Response) => {
  try {
    const { name, registerNumber, email, phone, password, preferredBusId } = req.body;
    if (!name || !registerNumber || !email || !phone || !password) {
      return res.status(400).json({
        error: 'All fields (Full Name, Register Number, Email, Phone, Password) are required.',
      });
    }

    const student = await storage.signupStudent({
      name,
      registerNumber,
      email,
      phone,
      password,
      preferredBusId,
    });

    return res.status(201).json({
      message: 'Your registration has been submitted for Admin approval.',
      student: {
        id: student.id,
        name: student.name,
        registerNumber: student.registerNumber,
        email: student.email,
        status: student.status,
        approved: student.approved,
      },
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Signup failed.' });
  }
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email/Register Number and password are required.' });
    }

    const input = email.trim().toLowerCase();
    const users = await storage.getUsers();
    let user = users.find((u) => u.email.toLowerCase() === input);

    // Also support logging in with Register Number
    if (!user) {
      const student = await storage.getStudentByRegisterNumber(input);
      if (student) {
        user = users.find((u) => u.id === student.id || u.studentId === student.id || u.email.toLowerCase() === student.email.toLowerCase());
      }
    }

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email/register number or password.' });
    }

    // Role-based approval & active checks
    if (user.role === 'STUDENT') {
      const studentRecord = user.studentId ? await storage.getStudentById(user.studentId) : null;
      const status = studentRecord?.status || user.status || 'PENDING';
      const isApproved = studentRecord?.approved ?? user.approved ?? false;
      const isActive = studentRecord?.active ?? user.active ?? false;

      if (status === 'PENDING' || !isApproved) {
        return res.status(403).json({
          error: 'Your account is still waiting for Admin approval.',
          status: 'PENDING',
        });
      }

      if (status === 'REJECTED') {
        return res.status(403).json({
          error: 'Your registration was rejected by Admin.',
          status: 'REJECTED',
          reason: studentRecord?.rejectionReason,
        });
      }

      if (!isActive) {
        return res.status(403).json({
          error: 'Your account has been deactivated. Please contact your administrator.',
          status: 'INACTIVE',
        });
      }
    }

    const token = generateToken(user);
    const { password: _, ...safeUser } = user;
    return res.json({ token, user: safeUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

apiRouter.get('/auth/me', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const user = await storage.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const { password: _, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// Admin Student Approval Endpoints
// ----------------------------------------------------------------------
apiRouter.get('/admin/approvals', requireAuth(['ADMIN']), async (_req: Request, res: Response) => {
  try {
    const pending = await storage.getPendingStudents();
    return res.json(pending);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admin/approvals/:id/approve', requireAuth(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { busId } = req.body;

    if (!busId) {
      return res.status(400).json({ error: 'A valid bus must be assigned to the student before approval.' });
    }

    const bus = await storage.getBusById(busId);
    if (!bus) {
      return res.status(400).json({ error: `Bus ${busId} not found.` });
    }

    const approved = await storage.approveStudent(id, busId, req.user!.name);
    if (!approved) {
      return res.status(404).json({ error: 'Student registration not found.' });
    }

    return res.json({ message: 'Student registration approved successfully.', student: approved });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admin/approvals/:id/reject', requireAuth(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const rejected = await storage.rejectStudent(id, reason);
    if (!rejected) {
      return res.status(404).json({ error: 'Student registration not found.' });
    }

    return res.json({ message: 'Student registration rejected.', student: rejected });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// Attendance & Session Routes
// ----------------------------------------------------------------------
apiRouter.get('/attendance/session', async (req: Request, res: Response) => {
  try {
    const { busId } = req.query;
    const activeDynamic = await storage.getActiveSession(
      typeof busId === 'string' ? busId : undefined
    );

    if (activeDynamic && activeDynamic.status === 'ACTIVE') {
      const nowIST = getISTTimeString();
      const dateIST = getISTDateString();
      return res.json({
        sessionType: activeDynamic.sessionType,
        attendanceMode: activeDynamic.attendanceMode,
        status: 'ACTIVE',
        busId: activeDynamic.busId,
        startTime: activeDynamic.startedAt,
        endTime: 'Manual End',
        reportTime: 'On Close',
        timezone: 'Asia/Kolkata',
        currentTimeIST: nowIST,
        currentDateIST: dateIST,
        locationName:
          activeDynamic.attendanceMode === 'TRAVELLING'
            ? `Travelling Bus (${activeDynamic.busId})`
            : activeDynamic.location?.name || 'Campus Location',
        radiusMeters: activeDynamic.radiusMeters,
        maxGpsAccuracyMeters: activeDynamic.maxGpsAccuracyMeters,
        activeSession: activeDynamic,
      });
    }

    const settings = await storage.getSettings();
    const sessionInfo = evaluateSessionStatus(settings);
    return res.json({
      ...sessionInfo,
      attendanceMode: 'GROUND',
      activeSession: null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin / Incharge: Start Dynamic Attendance Session (Morning / Evening, Ground / Travelling Bus with 6-digit code)
const handleStartSession = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionType, attendanceMode, verificationMethod, busId, radiusMeters, maxGpsAccuracyMeters, latitude, longitude, accuracy } = req.body;

    if (!sessionType || !attendanceMode || !busId) {
      return res.status(400).json({
        error: 'Session type (MORNING/EVENING), attendance mode (GROUND/TRAVELLING), and busId are required.',
      });
    }

    // Role check: If INCHARGE, must match assigned bus
    if (req.user!.role === 'INCHARGE' && req.user!.assignedBusId && req.user!.assignedBusId !== busId) {
      return res.status(403).json({ error: `You are authorized to manage ${req.user!.assignedBusId} only.` });
    }

    const settings = await storage.getSettings();
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const sessionId = `SESSION-${now}-${busId}`;
    const chosenVerification: VerificationMethod = verificationMethod === 'CODE_ONLY' ? 'CODE_ONLY' : 'CODE_GPS';

    let locationLat = Number(latitude);
    let locationLon = Number(longitude);
    let locAccuracy = Number(accuracy) || 10;
    let locName = 'College Ground';

    if (attendanceMode === 'GROUND') {
      locationLat = isNaN(locationLat) || !latitude ? settings.location.latitude : locationLat;
      locationLon = isNaN(locationLon) || !longitude ? settings.location.longitude : locationLon;
      locName = settings.location.name;
    }

    const dynamicCode = generateDynamic6DigitCode();
    const codeExpiresAt = new Date(now + 60 * 1000).toISOString();

    const activeSession = await storage.saveActiveSession({
      id: sessionId,
      sessionType: sessionType as any,
      attendanceMode: attendanceMode as any,
      verificationMethod: chosenVerification,
      busId,
      status: 'ACTIVE',
      startedBy: req.user!.name,
      currentCode: dynamicCode,
      codeIssuedAt: nowIso,
      codeExpiresAt,
      radiusMeters: Number(radiusMeters) || settings.location.radiusMeters || 10,
      maxGpsAccuracyMeters: Number(maxGpsAccuracyMeters) || settings.location.maxGpsAccuracyMeters || 20,
      location: {
        type: attendanceMode === 'TRAVELLING' ? 'ADMIN_DYNAMIC' : 'FIXED',
        name: locName,
        latitude: locationLat,
        longitude: locationLon,
        accuracyMeters: locAccuracy,
        updatedAt: nowIso,
      },
      startedAt: nowIso,
      endedAt: null,
    });

    // Targeted Notification for students assigned to that bus
    const bus = await storage.getBusById(busId);
    const busLabel = bus ? bus.busNumber : busId;

    await storage.createNotification({
      title: `🚌 ${sessionType === 'MORNING' ? 'Morning' : 'Evening'} Bus Attendance Started`,
      message: `Bus: ${busLabel} • Attendance is active. Enter the current attendance code to verify.`,
      type: 'SESSION_START',
      date: getISTDateString(),
      read: false,
      link: '/student/dashboard',
      busId,
      targetRole: 'STUDENT',
      metadata: {
        sessionId: activeSession.id,
        sessionType,
        attendanceMode,
        verificationMethod: chosenVerification,
        busId,
      },
    });

    return res.status(201).json({
      message: `${sessionType} attendance session started for ${busId} (${attendanceMode} mode).`,
      session: activeSession,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

apiRouter.post('/attendance/session/start', requireAuth(['ADMIN', 'INCHARGE']), handleStartSession);
apiRouter.post('/admin/attendance/start', requireAuth(['ADMIN', 'INCHARGE']), handleStartSession);

// Admin / Incharge: End Active Session
const handleEndSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    await storage.endActiveSession(sessionId);

    await storage.createNotification({
      title: '🚌 Attendance Session Closed',
      message: 'Attendance session has been ended. Submissions are now closed.',
      type: 'SYSTEM',
      date: getISTDateString(),
      read: false,
    });

    return res.json({ message: 'Attendance session ended successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

apiRouter.post('/attendance/session/end', requireAuth(['ADMIN', 'INCHARGE']), handleEndSession);
apiRouter.post('/admin/attendance/end', requireAuth(['ADMIN', 'INCHARGE']), handleEndSession);

// Student: Verify Attendance (Dynamic 6-Digit Code + GPS when required)
const handleVerifyAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { code, latitude, longitude, accuracy, capturedAt, readings } = req.body;

    const user: User = {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      role: req.user!.role,
      studentId: req.user!.studentId,
      assignedBusId: req.user!.assignedBusId,
    };

    const result = await verifier.verifyStudentLocation(user, {
      code: code ? String(code).trim() : '',
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      accuracy: accuracy !== undefined ? Number(accuracy) : undefined,
      capturedAt,
      readings,
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      status: 'LOCATION_UNAVAILABLE',
      message: err.message || 'Attendance verification failed.',
    });
  }
};

apiRouter.post('/attendance/verify', requireAuth(['STUDENT']), handleVerifyAttendance);
apiRouter.post('/attendance/verify-location', requireAuth(['STUDENT']), handleVerifyAttendance);

apiRouter.get(
  '/attendance/my-status',
  requireAuth(['STUDENT']),
  async (req: AuthRequest, res: Response) => {
    try {
      const studentId = req.user!.studentId || req.user!.id;
      const student = await storage.getStudentById(studentId);
      const bus = student?.busId ? await storage.getBusById(student.busId) : null;
      const todayDate = getISTDateString();

      // Check active dynamic session first
      const activeDynamic = await storage.getActiveSession(student?.busId);
      const currentSessionType: SessionType = activeDynamic ? activeDynamic.sessionType : 'EVENING';

      const todayRecord = await storage.getAttendanceRecord(studentId, todayDate, currentSessionType);
      const history = await storage.getAttendance({ studentId });

      let sessionInfo: any;
      if (activeDynamic && activeDynamic.status === 'ACTIVE') {
        sessionInfo = {
          sessionType: activeDynamic.sessionType,
          attendanceMode: activeDynamic.attendanceMode,
          status: 'ACTIVE',
          busId: activeDynamic.busId,
          startTime: activeDynamic.startedAt,
          endTime: 'Manual',
          reportTime: 'On Close',
          timezone: 'Asia/Kolkata',
          currentTimeIST: getISTTimeString(),
          currentDateIST: todayDate,
          locationName:
            activeDynamic.attendanceMode === 'TRAVELLING'
              ? `Travelling Bus ${bus ? bus.busNumber : ''}`
              : activeDynamic.location?.name || 'Campus Attendance Point',
          radiusMeters: activeDynamic.radiusMeters,
          maxGpsAccuracyMeters: activeDynamic.maxGpsAccuracyMeters,
          activeSession: activeDynamic,
        };
      } else {
        const settings = await storage.getSettings();
        const baseSession = evaluateSessionStatus(settings);
        sessionInfo = {
          ...baseSession,
          attendanceMode: 'GROUND',
          activeSession: null,
        };
      }

      // Notifications targeted for student's bus
      const notifications = await storage.getNotifications({
        busId: student?.busId,
        role: 'STUDENT',
      });

      return res.json({
        todayRecord,
        student,
        bus,
        sessionInfo,
        notifications: notifications.slice(0, 5),
        history: history.sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate)),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ----------------------------------------------------------------------
// Admin: Students Management
// ----------------------------------------------------------------------
apiRouter.get(
  '/admin/students',
  requireAuth(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { search, busId, active } = req.query;
      let students = await storage.getStudents();

      if (busId && typeof busId === 'string' && busId !== 'ALL') {
        students = students.filter((s) => s.busId === busId);
      }

      if (active !== undefined && active !== 'ALL') {
        const isActive = active === 'true';
        students = students.filter((s) => s.active === isActive);
      }

      if (search && typeof search === 'string') {
        const q = search.toLowerCase();
        students = students.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.registerNumber.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q)
        );
      }

      const buses = await storage.getBuses();
      const busMap = new Map(buses.map((b) => [b.id, b]));

      const enriched = students.map((s) => ({
        ...s,
        bus: busMap.get(s.busId) || null,
      }));

      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

apiRouter.post(
  '/admin/students',
  requireAuth(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { registerNumber, name, email, phone, busId, active } = req.body;

      if (!registerNumber || !name || !busId) {
        return res.status(400).json({
          error: 'Register number, name, and assigned bus are required.',
        });
      }

      // Check unique register number
      const existing = await storage.getStudentByRegisterNumber(registerNumber);
      if (existing) {
        return res.status(400).json({
          error: `Student with register number ${registerNumber} already exists.`,
        });
      }

      const newStudent = await storage.createStudent({
        registerNumber: registerNumber.trim().toUpperCase(),
        name: name.trim(),
        email: email ? email.trim().toLowerCase() : `${registerNumber.toLowerCase()}@example.com`,
        phone: phone ? phone.trim() : '',
        busId,
        role: 'STUDENT',
        status: 'APPROVED',
        approved: true,
        active: active !== undefined ? Boolean(active) : true,
      });

      return res.status(201).json(newStudent);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

apiRouter.put(
  '/admin/students/:id',
  requireAuth(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (updates.registerNumber) {
        const existing = await storage.getStudentByRegisterNumber(updates.registerNumber);
        if (existing && existing.id !== id) {
          return res.status(400).json({
            error: `Register number ${updates.registerNumber} is already used by another student.`,
          });
        }
      }

      const updated = await storage.updateStudent(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

apiRouter.delete(
  '/admin/students/:id',
  requireAuth(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteStudent(id);
      if (!success) {
        return res.status(404).json({ error: 'Student not found.' });
      }
      return res.json({ message: 'Student removed successfully.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ----------------------------------------------------------------------
// Admin: Buses Management
// ----------------------------------------------------------------------
apiRouter.get('/admin/buses', requireAuth(['ADMIN']), async (_req: Request, res: Response) => {
  try {
    const buses = await storage.getBuses();
    const students = await storage.getStudents();
    const users = await storage.getUsers();

    const inchargeMap = new Map(users.filter((u) => u.role === 'INCHARGE').map((u) => [u.id, u]));

    const enriched = buses.map((bus) => {
      const busStudents = students.filter((s) => s.busId === bus.id && s.active);
      const incharge = inchargeMap.get(bus.inchargeId);
      return {
        ...bus,
        studentsCount: busStudents.length,
        inchargeName: incharge ? incharge.name : bus.inchargeId === 'INC006' ? 'Aarthi' : 'Unassigned',
      };
    });

    return res.json(enriched);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admin/buses', requireAuth(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { busNumber, routeName, inchargeId, active } = req.body;
    if (!busNumber || !routeName) {
      return res.status(400).json({ error: 'Bus number and route name are required.' });
    }

    const newBus = await storage.createBus({
      busNumber: busNumber.trim().toUpperCase(),
      routeName: routeName.trim(),
      inchargeId: inchargeId || '',
      active: active !== undefined ? Boolean(active) : true,
    });

    return res.status(201).json(newBus);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/admin/buses/:id', requireAuth(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await storage.updateBus(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Bus not found.' });
    }
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// Admin: Attendance & Live Dashboard
// ----------------------------------------------------------------------
apiRouter.get(
  '/admin/attendance/today',
  requireAuth(['ADMIN']),
  async (_req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      const sessionInfo = evaluateSessionStatus(settings);
      const date = sessionInfo.currentDateIST || getISTDateString();

      const students = await storage.getStudents();
      const activeStudents = students.filter((s) => s.active);
      const buses = await storage.getBuses();
      const busMap = new Map(buses.map((b) => [b.id, b]));

      const records = await storage.getAttendance({ date, sessionType: 'EVENING' });
      const recordMap = new Map(records.map((r) => [r.studentId, r]));

      const roster = activeStudents.map((s) => {
        const bus = busMap.get(s.busId);
        const record = recordMap.get(s.id);
        return {
          studentId: s.id,
          registerNumber: s.registerNumber,
          name: s.name,
          busId: s.busId,
          busNumber: bus ? bus.busNumber : 'Unassigned',
          routeName: bus ? bus.routeName : '',
          status: record ? record.status : 'NOT_PRESENT',
          distanceMeters: record?.distanceMeters ?? null,
          accuracyMeters: record?.accuracyMeters ?? null,
          verifiedAt: record?.verifiedAt ?? null,
          verificationMethod: record?.verificationMethod ?? null,
          overrideReason: record?.overrideReason ?? null,
          recordId: record?.id ?? null,
        };
      });

      const total = roster.length;
      const present = roster.filter((r) => r.status === 'PRESENT').length;
      const notPresent = total - present;
      const percentage = total > 0 ? Math.round((present / total) * 10000) / 100 : 0;

      return res.json({
        date,
        sessionInfo,
        stats: {
          total,
          present,
          notPresent,
          percentage,
        },
        roster,
        buses,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

apiRouter.get(
  '/admin/attendance/history',
  requireAuth(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { date, busId, studentId, status } = req.query;
      let records = await storage.getAttendance({
        date: typeof date === 'string' && date !== '' ? date : undefined,
        busId: typeof busId === 'string' && busId !== 'ALL' ? busId : undefined,
        studentId: typeof studentId === 'string' && studentId !== 'ALL' ? studentId : undefined,
        sessionType: 'EVENING',
      });

      if (status && typeof status === 'string' && status !== 'ALL') {
        records = records.filter((r) => r.status === status);
      }

      const students = await storage.getStudents();
      const buses = await storage.getBuses();
      const studentMap = new Map(students.map((s) => [s.id, s]));
      const busMap = new Map(buses.map((b) => [b.id, b]));

      const enriched = records.map((r) => {
        const s = studentMap.get(r.studentId);
        const b = busMap.get(r.busId);
        return {
          ...r,
          studentName: s ? s.name : 'Unknown',
          registerNumber: s ? s.registerNumber : 'Unknown',
          busNumber: b ? b.busNumber : 'Unknown',
          routeName: b ? b.routeName : '',
        };
      });

      return res.json(
        enriched.sort(
          (a, b) =>
            b.attendanceDate.localeCompare(a.attendanceDate) ||
            b.verifiedAt.localeCompare(a.verifiedAt)
        )
      );
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// Admin Manual Override
apiRouter.post(
  '/admin/override',
  requireAuth(['ADMIN']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { studentId, date, newStatus, reason } = req.body;
      if (!studentId || !newStatus || !reason) {
        return res.status(400).json({
          error: 'Student ID, new status, and override reason are required.',
        });
      }

      const student = await storage.getStudentById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      const targetDate = date || getISTDateString();
      const nowIso = new Date().toISOString();

      let record = await storage.getAttendanceRecord(studentId, targetDate, 'EVENING');

      if (record) {
        record = await storage.updateAttendance(record.id, {
          status: newStatus,
          verificationMethod: 'ADMIN_OVERRIDE',
          overrideReason: reason,
          overrideBy: req.user!.name,
          verifiedAt: nowIso,
        });
      } else {
        record = await storage.createAttendance({
          id: `ATT-${targetDate.replace(/-/g, '')}-${student.id}`,
          studentId: student.id,
          busId: student.busId,
          attendanceDate: targetDate,
          sessionType: 'EVENING',
          status: newStatus,
          latitude: null,
          longitude: null,
          accuracyMeters: null,
          distanceMeters: null,
          capturedAt: nowIso,
          verifiedAt: nowIso,
          verificationMethod: 'ADMIN_OVERRIDE',
          overrideReason: reason,
          overrideBy: req.user!.name,
        });
      }

      return res.json({ message: 'Override applied successfully.', record });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ----------------------------------------------------------------------
// Admin: Settings & Geofence
// ----------------------------------------------------------------------
apiRouter.get('/admin/settings', requireAuth(['ADMIN']), async (_req: Request, res: Response) => {
  try {
    const settings = await storage.getSettings();
    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/admin/settings', requireAuth(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const updated = await storage.updateSettings(updates);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// Admin: Reports & Notifications
// ----------------------------------------------------------------------
apiRouter.get('/admin/reports', requireAuth(['ADMIN']), async (_req: Request, res: Response) => {
  try {
    const reports = await storage.getReports();
    return res.json(reports);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/admin/reports/:date', requireAuth(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    let report = await storage.getReportByDate(date, 'EVENING');
    if (!report) {
      // Generate on the fly
      report = await reportGen.generateDailyReport(date);
    }
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/admin/notifications', requireAuth(['ADMIN']), async (_req: Request, res: Response) => {
  try {
    const notifs = await storage.getNotifications();
    const unreadCount = notifs.filter((n) => !n.read).length;
    return res.json({ notifications: notifs, unreadCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put(
  '/admin/notifications/:id/read',
  requireAuth(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

apiRouter.put(
  '/admin/notifications/read-all',
  requireAuth(['ADMIN']),
  async (_req: Request, res: Response) => {
    try {
      await storage.markAllNotificationsAsRead();
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ----------------------------------------------------------------------
// Bus Incharge: Attendance Roster (Assigned Bus Only)
// ----------------------------------------------------------------------
apiRouter.get(
  '/incharge/attendance',
  requireAuth(['INCHARGE']),
  async (req: AuthRequest, res: Response) => {
    try {
      const inchargeId = req.user!.id;
      const bus = await storage.getBusByInchargeId(inchargeId);

      if (!bus) {
        return res.status(404).json({ error: 'No bus assigned to your incharge account.' });
      }

      const settings = await storage.getSettings();
      const sessionInfo = evaluateSessionStatus(settings);
      const date = sessionInfo.currentDateIST || getISTDateString();

      const students = await storage.getStudentsByBusId(bus.id);
      const activeStudents = students.filter((s) => s.active);

      const records = await storage.getAttendance({ date, busId: bus.id, sessionType: 'EVENING' });
      const recordMap = new Map(records.map((r) => [r.studentId, r]));

      const roster = activeStudents.map((s) => {
        const record = recordMap.get(s.id);
        return {
          studentId: s.id,
          registerNumber: s.registerNumber,
          name: s.name,
          status: record ? record.status : 'NOT_PRESENT',
          distanceMeters: record?.distanceMeters ?? null,
          accuracyMeters: record?.accuracyMeters ?? null,
          verifiedAt: record?.verifiedAt ?? null,
          verificationMethod: record?.verificationMethod ?? null,
        };
      });

      const total = roster.length;
      const present = roster.filter((r) => r.status === 'PRESENT').length;
      const notPresent = total - present;
      const percentage = total > 0 ? Math.round((present / total) * 10000) / 100 : 0;

      return res.json({
        bus,
        date,
        sessionInfo,
        stats: {
          total,
          present,
          notPresent,
          percentage,
        },
        roster,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ----------------------------------------------------------------------
// Cron Endpoints (Protected by CRON_SECRET or Admin Bearer)
// ----------------------------------------------------------------------
function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const cronSecret = process.env.CRON_SECRET || 'bus-cron-secret-2026';
  const authHeader = req.headers.authorization;
  const cronHeader = req.headers['x-cron-secret'];

  if (cronHeader === cronSecret) return next();

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (user && user.role === 'ADMIN') return next();
  }

  return res.status(401).json({ error: 'Unauthorized cron request.' });
}

apiRouter.all('/cron/open-session', requireCronSecret, async (_req: Request, res: Response) => {
  const time = getISTTimeString();
  return res.json({ message: 'Session open cron executed.', timeIST: time, status: 'ACTIVE' });
});

apiRouter.all('/cron/close-session', requireCronSecret, async (_req: Request, res: Response) => {
  const time = getISTTimeString();
  return res.json({ message: 'Session close cron executed.', timeIST: time, status: 'CLOSED' });
});

apiRouter.all('/cron/generate-report', requireCronSecret, async (_req: Request, res: Response) => {
  try {
    const report = await reportGen.generateDailyReport();
    return res.json({
      message: 'Daily report and admin notification generated successfully.',
      reportId: report.id,
      date: report.date,
      totalStudents: report.totalStudents,
      present: report.present,
      percentage: report.percentage,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
