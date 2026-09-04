export type Role = 'ADMIN' | 'INCHARGE' | 'STUDENT';
export type SessionType = 'MORNING' | 'EVENING';
export type AttendanceMode = 'GROUND' | 'TRAVELLING';
export type VerificationMethod = 'CODE_ONLY' | 'CODE_GPS';
export type StudentApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: Role;
  assignedBusId?: string;
  studentId?: string;
  status?: StudentApprovalStatus;
  approved?: boolean;
  active?: boolean;
}

export interface Student {
  id: string;
  registerNumber: string;
  name: string;
  email: string;
  phone: string;
  busId: string; // authoritative assigned bus ID
  preferredBusId?: string; // requested bus at signup
  role: 'STUDENT';
  status: StudentApprovalStatus; // PENDING | APPROVED | REJECTED
  approved: boolean;
  active: boolean;
  rejectionReason?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bus {
  id: string;
  busNumber: string;
  routeName: string;
  inchargeId: string;
  active: boolean;
}

export type AttendanceStatus =
  | 'PRESENT'
  | 'NOT_PRESENT'
  | 'LOCATION_UNAVAILABLE'
  | 'INVALID_LOCATION'
  | 'INVALID_CODE'
  | 'BUS_MISMATCH';

export type SessionStatus = 'UPCOMING' | 'ACTIVE' | 'CLOSED' | 'FINALIZED';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  busId: string;
  attendanceDate: string; // YYYY-MM-DD
  sessionType: SessionType;
  attendanceMode?: AttendanceMode;
  sessionId?: string;
  status: AttendanceStatus;
  codeUsed?: string;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  distanceMeters: number | null;
  capturedAt: string;
  verifiedAt: string;
  verificationMethod: 'DYNAMIC_CODE' | 'DYNAMIC_CODE_GPS' | 'GPS_GEOFENCE' | 'ADMIN_OVERRIDE' | 'TRAVELLING_BUS_GPS';
  overrideReason?: string;
  overrideBy?: string;
}

export interface ActiveSession {
  id: string;
  sessionType: SessionType;
  attendanceMode: AttendanceMode;
  verificationMethod: VerificationMethod;
  busId: string; // "BUS01", "BUS02" or "ALL"
  status: SessionStatus;
  startedBy: string;
  currentCode: string; // Dynamic 6-digit code (e.g. "583214")
  codeIssuedAt: string;
  codeExpiresAt: string; // Code rotates every 60 seconds
  radiusMeters: number;
  maxGpsAccuracyMeters: number;
  location?: {
    type: 'FIXED' | 'ADMIN_DYNAMIC';
    name?: string;
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    updatedAt: string;
  };
  startedAt: string;
  endedAt: string | null;
}

export interface AttendanceSettings {
  sessionType: SessionType;
  startTime: string; // "16:50"
  endTime: string; // "16:55"
  reportTime: string; // "16:57"
  timezone: string; // "Asia/Kolkata"
  location: {
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    maxGpsAccuracyMeters: number;
  };
  simulation?: {
    enabled: boolean;
    simulatedTime: string | null;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'REPORT' | 'SYSTEM' | 'ALERT' | 'SESSION_START' | 'APPROVAL';
  date: string;
  read: boolean;
  link?: string;
  busId?: string;
  targetRole?: Role;
  metadata?: {
    totalStudents?: number;
    present?: number;
    notPresent?: number;
    percentage?: number;
    reportId?: string;
    sessionId?: string;
    sessionType?: SessionType;
    attendanceMode?: AttendanceMode;
    verificationMethod?: VerificationMethod;
    busId?: string;
    studentId?: string;
    status?: StudentApprovalStatus;
    [key: string]: any;
  };
  createdAt: string;
}

export interface BusReportSummary {
  busId: string;
  busNumber: string;
  routeName: string;
  total: number;
  present: number;
  notPresent: number;
  percentage: number;
}

export interface StudentReportSummary {
  studentId: string;
  registerNumber: string;
  name: string;
  busId: string;
  busNumber: string;
  status: AttendanceStatus;
  verifiedAt?: string;
  distanceMeters?: number | null;
  accuracyMeters?: number | null;
  codeUsed?: string;
}

export interface FinalReport {
  id: string;
  date: string;
  sessionType: SessionType;
  totalStudents: number;
  present: number;
  notPresent: number;
  percentage: number;
  busWise: BusReportSummary[];
  studentWise: StudentReportSummary[];
  generatedAt: string;
}

export interface SessionInfo {
  sessionType: SessionType;
  attendanceMode: AttendanceMode;
  verificationMethod?: VerificationMethod;
  status: SessionStatus;
  busId?: string;
  startTime: string;
  endTime: string;
  reportTime: string;
  timezone: string;
  currentTimeIST: string;
  currentDateIST: string;
  locationName: string;
  radiusMeters: number;
  maxGpsAccuracyMeters: number;
  isSimulated?: boolean;
  activeSession?: ActiveSession | null;
}

export interface GpsReading {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp?: number | string;
}

export interface LocationVerificationRequest {
  code: string; // 6-digit dynamic code
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  capturedAt?: string;
  readings?: GpsReading[];
  busId?: string;
}

export interface LocationVerificationResponse {
  status: AttendanceStatus;
  message: string;
  distanceMeters?: number;
  accuracyMeters?: number;
  verifiedAt?: string;
  record?: AttendanceRecord;
  readingsCount?: number;
  consistencyScore?: number;
  studentName?: string;
  registerNumber?: string;
  busId?: string;
}
