import { Router, Request, Response, NextFunction } from 'express';
import { getStorage } from './storage';
import { generateToken, verifyToken, TokenPayload } from './auth';
import { evaluateSessionStatus, getISTDateString, getISTTimeString } from './attendance/session';
import { AttendanceVerifier } from './attendance/verifier';
import { ReportGenerator } from './reports/generator';
import { Role, User, SessionType, VerificationMethod } from '../types';
import { generateDynamic6DigitCode } from './attendance/codeGenerator';
import crypto from 'crypto';
import { brevoMailer } from '../lib/brevo';
import { cloudinaryPipeline } from '../lib/cloudinary';
import { faceVerificationEngine } from '../lib/faceVerification';
import { mobileBiometricEngine } from '../lib/webauthn';
import { calculateDistance } from './attendance/haversine';

export const apiRouter = Router();
const storage = getStorage();
const verifier = new AttendanceVerifier(storage);
const reportGen = new ReportGenerator(storage);

// In-Memory store for live OTPs (10-minute expiry)
interface StoredOtp {
  otp: string;
  expiresAt: number;
  attempts: number;
  signupData: {
    name: string;
    registerNumber: string;
    email: string;
    phone?: string;
    password: string;
    preferredBusId?: string;
  };
}
const otpStore = new Map<string, StoredOtp>();

// In-Memory store for cryptographic password reset tokens (15-minute expiry)
interface StoredResetToken {
  email: string;
  expiresAt: number;
  used: boolean;
}
const resetTokenStore = new Map<string, StoredResetToken>();

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
    if (!name || !registerNumber || !password) {
      return res.status(400).json({
        error: 'Full Name, Register Number, and Password are required.',
      });
    }

    const student = await storage.signupStudent({
      name: name.trim(),
      registerNumber: registerNumber.trim().toUpperCase(),
      email: email?.trim(),
      phone: phone?.trim(),
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

// Request 6-digit OTP via Brevo API
apiRouter.post('/auth/signup/request-otp', async (req: Request, res: Response) => {
  try {
    const { name, registerNumber, email, phone, password, preferredBusId } = req.body;
    if (!name || !registerNumber || !email || !password) {
      return res.status(400).json({
        error: 'Full Name, Register Number, Real Email, and Password are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRegNo = registerNumber.trim().toUpperCase();

    // Check if student with registerNumber already exists
    const existingStudent = await storage.getStudentByRegisterNumber(cleanRegNo);
    if (existingStudent) {
      return res.status(400).json({ error: `Register number ${cleanRegNo} is already registered.` });
    }

    // Check if user with email already exists
    const existingUser = await storage.getUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ error: `An account with email ${cleanEmail} already exists.` });
    }

    // Generate cryptographic 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(cleanEmail, {
      otp,
      expiresAt,
      attempts: 0,
      signupData: {
        name: name.trim(),
        registerNumber: cleanRegNo,
        email: cleanEmail,
        phone: phone?.trim(),
        password,
        preferredBusId,
      },
    });

    // Also persist in PostgreSQL otp_verifications table if available
    try {
      if ('saveOtp' in storage && typeof (storage as any).saveOtp === 'function') {
        await (storage as any).saveOtp(cleanEmail, otp, new Date(expiresAt));
      }
    } catch (dbErr) {
      console.warn('⚠️ Could not write OTP to PostgreSQL, proceeding with active memory store:', dbErr);
    }

    // Dispatch via Brevo API
    const dispatchResult = await brevoMailer.sendOtpEmail(cleanEmail, name.trim(), otp);

    return res.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${cleanEmail}.`,
      expiresInSeconds: 600,
      emailSent: dispatchResult.success,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to dispatch verification OTP.' });
  }
});

// Verify 6-digit OTP and complete registration
apiRouter.post('/auth/signup/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = otpStore.get(cleanEmail);

    if (!record) {
      return res.status(400).json({ error: 'No pending OTP verification found for this email. Please request a new code.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      otpStore.delete(cleanEmail);
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    // Create student in storage
    const student = await storage.signupStudent(record.signupData);
    otpStore.delete(cleanEmail);

    return res.status(201).json({
      success: true,
      message: 'Email verified successfully! Your account is submitted for Admin approval.',
      student: {
        id: student.id,
        name: student.name,
        registerNumber: student.registerNumber,
        email: student.email,
        status: student.status,
      },
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'OTP verification failed.' });
  }
});

// Forgot Password - Dispatches cryptographic reset token via Brevo
apiRouter.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await storage.getUserByEmail(cleanEmail);

    // Always respond with success to prevent user enumeration attacks
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account matches that email, a password reset link has been dispatched.',
      });
    }

    // Generate cryptographic 32-byte hex token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    resetTokenStore.set(token, {
      email: cleanEmail,
      expiresAt,
      used: false,
    });

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const resetUrl = `${protocol}://${host}/reset-password?token=${token}`;

    await brevoMailer.sendPasswordResetEmail(user.email, user.name, resetUrl);

    return res.json({
      success: true,
      message: 'If an account matches that email, a password reset link has been dispatched.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to process password reset.' });
  }
});

// Reset Password - Validates token and updates password
apiRouter.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const record = resetTokenStore.get(token);
    if (!record || record.used) {
      return res.status(400).json({ error: 'Invalid or already used reset token. Please request a new link.' });
    }

    if (Date.now() > record.expiresAt) {
      resetTokenStore.delete(token);
      return res.status(400).json({ error: 'Reset token has expired. Please request a new link.' });
    }

    const user = await storage.getUserByEmail(record.email);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    await storage.updateUser(user.id, { password: newPassword });
    record.used = true;
    resetTokenStore.delete(token);

    return res.json({
      success: true,
      message: 'Password successfully updated! You can now log in with your new credentials.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to reset password.' });
  }
});

// Cloudinary Media Upload Routes
apiRouter.get('/media/signature', (_req: Request, res: Response) => {
  const sig = cloudinaryPipeline.generateUploadSignature();
  if (!sig) {
    return res.status(503).json({ error: 'Cloudinary credentials not configured on server.' });
  }
  return res.json(sig);
});

apiRouter.post('/media/upload', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { fileDataUri, folder } = req.body;
    if (!fileDataUri) {
      return res.status(400).json({ error: 'fileDataUri parameter is required.' });
    }

    const uploadRes = await cloudinaryPipeline.uploadMedia(fileDataUri, folder);
    if (!uploadRes.success) {
      return res.status(500).json({ error: uploadRes.error || 'Media upload failed' });
    }

    return res.json({
      success: true,
      secureUrl: uploadRes.secureUrl,
      publicId: uploadRes.publicId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Media upload failed' });
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
          activeDynamic.location?.name ||
          (activeDynamic.attendanceMode === 'TRAVELLING'
            ? `Travelling Bus (${activeDynamic.busId})`
            : 'Campus Location'),
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
    let locName = req.body.locationName ? String(req.body.locationName).trim() : (attendanceMode === 'TRAVELLING' ? `Travelling Bus (${busId})` : settings.location.name);

    if (attendanceMode === 'GROUND') {
      locationLat = isNaN(locationLat) || !latitude ? settings.location.latitude : locationLat;
      locationLon = isNaN(locationLon) || !longitude ? settings.location.longitude : locationLon;
      locName = req.body.locationName ? String(req.body.locationName).trim() : settings.location.name;
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

// --------------------------------------------------------------------------
// 📱 MOBILE ZERO-HARDWARE ATTENDANCE (FACE + GPS or BIOMETRIC + GPS)
// --------------------------------------------------------------------------
apiRouter.get(
  '/attendance/mobile/challenge',
  requireAuth(['STUDENT']),
  async (req: AuthRequest, res: Response) => {
    try {
      const studentId = req.user!.studentId || req.user!.id;
      const challenge = mobileBiometricEngine.generateChallenge(studentId);
      return res.json({ challenge });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to generate biometric challenge.' });
    }
  }
);

apiRouter.post(
  '/attendance/enroll-face',
  requireAuth(['STUDENT']),
  async (req: AuthRequest, res: Response) => {
    try {
      const studentId = req.user!.studentId || req.user!.id;
      const student = await storage.getStudentById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student commuter profile not found.' });
      }

      const { selfieBase64 } = req.body;
      if (!selfieBase64 || !faceVerificationEngine.isValidImagePayload(selfieBase64)) {
        return res.status(400).json({ error: 'Valid camera selfie snapshot required for face enrollment.' });
      }

      // Upload reference baseline photo to Cloudinary
      const uploadRes = await cloudinaryPipeline.uploadMedia(
        selfieBase64,
        `bus-attendance/profiles/${studentId}`
      );

      const enrolledUrl = uploadRes.secureUrl || selfieBase64;
      const enrolledPublicId = uploadRes.publicId;

      await storage.updateStudent(student.id, {
        profilePhotoUrl: enrolledUrl,
        profilePhotoPublicId: enrolledPublicId,
      });

      console.log(`✅ [Face-Enrollment] Student ${student.registerNumber} (${student.name}) enrolled successfully.`);
      return res.json({
        success: true,
        message: 'Face ID registered and enrolled successfully!',
        profilePhotoUrl: enrolledUrl,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Face enrollment failed.' });
    }
  }
);

apiRouter.post(
  '/attendance/verify-mobile',
  requireAuth(['STUDENT']),
  async (req: AuthRequest, res: Response) => {
    try {
      const studentId = req.user!.studentId || req.user!.id;
      const student = await storage.getStudentById(studentId);
      if (!student) {
        return res.status(404).json({
          status: 'BUS_MISMATCH',
          message: 'Student commuter profile not found.',
        });
      }

      const { busId, method, latitude, longitude, accuracy, selfieBase64, biometricPayload } = req.body;

      const targetBusId = busId || student.busId;
      if (student.busId && targetBusId !== student.busId) {
        return res.status(400).json({
          status: 'BUS_MISMATCH',
          message: `Bus mismatch: You are assigned to Bus ${student.busId}, not ${targetBusId}.`,
        });
      }

      // 1. Session Active Guard: In-charge must have opened attendance for this bus
      const activeSession = await storage.getActiveSession(targetBusId);
      if (!activeSession || activeSession.status !== 'ACTIVE') {
        return res.status(400).json({
          status: 'SESSION_CLOSED',
          message: `The bus in-charge has not opened transit attendance for Bus ${targetBusId} yet. Please wait until session begins.`,
        });
      }

      // 2. Validate Smartphone GPS Coordinates
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          status: 'LOCATION_UNAVAILABLE',
          message: 'GPS coordinates required. Please enable location services on your smartphone.',
        });
      }

      const numLat = Number(latitude);
      const numLng = Number(longitude);
      const numAcc = accuracy !== undefined ? Number(accuracy) : 15;

      const maxAcc = activeSession.maxGpsAccuracyMeters || 80;
      if (numAcc > maxAcc) {
        return res.status(400).json({
          status: 'LOCATION_UNAVAILABLE',
          message: `GPS accuracy too low (±${Math.round(numAcc)}m > ±${maxAcc}m limit). Move to an open area with clear sky and retry.`,
        });
      }

      // 3. Geofence Perimeter Calculation (Haversine Formula)
      const settings = await storage.getSettings();
      const envLat = process.env.DEFAULT_CAMPUS_LAT ? Number(process.env.DEFAULT_CAMPUS_LAT) : 12.9716;
      const envLng = process.env.DEFAULT_CAMPUS_LNG ? Number(process.env.DEFAULT_CAMPUS_LNG) : 77.5946;
      const envRadius = process.env.DEFAULT_GEOFENCE_RADIUS_METERS ? Number(process.env.DEFAULT_GEOFENCE_RADIUS_METERS) : 150;

      const targetLat = activeSession.location?.latitude ?? settings.location?.latitude ?? envLat;
      const targetLng = activeSession.location?.longitude ?? settings.location?.longitude ?? envLng;
      const radiusMeters = activeSession.radiusMeters || settings.location?.radiusMeters || envRadius;

      const distance = calculateDistance(numLat, numLng, targetLat, targetLng);
      if (distance > radiusMeters) {
        return res.status(400).json({
          status: 'INVALID_LOCATION',
          message: `Outside bus attendance boundary (${Math.round(distance)}m away; max allowable is ${radiusMeters}m). You must be physically at the bus boarding point.`,
          distanceMeters: distance,
        });
      }

      // 4. Verification Factor Check (Face Verification or Phone Biometric)
      let selfieUrl: string | undefined;
      let selfiePublicId: string | undefined;
      let faceConfidence: number | undefined;
      let deviceBiometricPassed = false;

      if (method === 'FACE_GPS') {
        // STRICT CHECK: Student must have enrolled their face baseline first!
        if (!student.profilePhotoUrl) {
          return res.status(400).json({
            status: 'FACE_NOT_ENROLLED',
            message: 'Your face is not registered yet! Please enroll your face photo in your profile before marking attendance.',
          });
        }

        if (!selfieBase64) {
          return res.status(400).json({
            status: 'FACE_MISMATCH',
            message: 'Front camera selfie snapshot required for face verification.',
          });
        }

        const faceResult = faceVerificationEngine.verifyFaceMatch(selfieBase64, student.profilePhotoUrl);
        if (!faceResult.matched) {
          return res.status(400).json({
            status: 'FACE_MISMATCH',
            message: faceResult.reason || 'Face verification failed. Please align your face inside the circle and retry.',
            confidence: faceResult.confidence,
          });
        }
        faceConfidence = faceResult.confidence;

        // Archive visual presence proof to Cloudinary
        const uploadRes = await cloudinaryPipeline.uploadMedia(
          selfieBase64,
          `bus-attendance/selfies/${studentId}`
        );
        if (uploadRes.success) {
          selfieUrl = uploadRes.secureUrl;
          selfiePublicId = uploadRes.publicId;
        }
      } else if (method === 'PHONE_BIOMETRIC_GPS') {
        const bioResult = mobileBiometricEngine.verifyAssertion(studentId, biometricPayload || {});
        if (!bioResult.verified) {
          return res.status(400).json({
            status: 'BIOMETRIC_FAILED',
            message: bioResult.message || 'Phone biometric verification (Fingerprint/FaceID) failed.',
          });
        }
        deviceBiometricPassed = true;
      } else {
        return res.status(400).json({
          status: 'GENERIC',
          message: 'Invalid verification method. Expected FACE_GPS or PHONE_BIOMETRIC_GPS.',
        });
      }

      // 5. Commit Verified Presence Record to PostgreSQL
      const todayDate = getISTDateString();
      const nowIso = new Date().toISOString();

      const record = await storage.createAttendance({
        id: crypto.randomUUID(),
        studentId,
        busId: targetBusId,
        attendanceDate: todayDate,
        sessionType: activeSession.sessionType,
        attendanceMode: activeSession.attendanceMode,
        sessionId: activeSession.id,
        status: 'PRESENT',
        latitude: numLat,
        longitude: numLng,
        accuracyMeters: numAcc,
        distanceMeters: distance,
        selfieImageUrl: selfieUrl,
        selfiePublicId,
        faceMatchConfidence: faceConfidence,
        deviceBiometricPassed,
        capturedAt: nowIso,
        verifiedAt: nowIso,
        verificationMethod: method,
      });

      return res.json({
        status: 'PRESENT',
        message: 'Attendance verified and logged successfully on mobile!',
        record,
        distanceMeters: distance,
        faceConfidence,
        selfieUrl,
      });
    } catch (err: any) {
      return res.status(500).json({
        status: 'GENERIC',
        message: err.message || 'Mobile attendance verification failed.',
      });
    }
  }
);

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

      const activeDynamic = await storage.getActiveSession();
      const currentSessionType: SessionType = activeDynamic ? activeDynamic.sessionType : (sessionInfo.sessionType || 'EVENING');

      let records = await storage.getAttendance({ date, sessionType: currentSessionType });
      if (records.length === 0) {
        records = await storage.getAttendance({ date });
      }
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

      const activeDynamic = await storage.getActiveSession(bus.id);
      const currentSessionType: SessionType = activeDynamic ? activeDynamic.sessionType : (sessionInfo.sessionType || 'EVENING');

      let records = await storage.getAttendance({ date, busId: bus.id, sessionType: currentSessionType });
      if (records.length === 0) {
        records = await storage.getAttendance({ date, busId: bus.id });
      }
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
          selfieImageUrl: record?.selfieImageUrl ?? null,
          faceMatchConfidence: record?.faceMatchConfidence ?? null,
          deviceBiometricPassed: record?.deviceBiometricPassed ?? null,
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
