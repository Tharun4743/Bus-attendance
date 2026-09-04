import {
  Student,
  Bus,
  AttendanceRecord,
  AttendanceSettings,
  Notification,
  FinalReport,
  User,
  ActiveSession,
  SessionType,
} from '../../types';

export interface StorageAdapter {
  // Users / Auth
  getUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  createUser(user: User): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  hasAdmin(): Promise<boolean>;

  // Students
  getStudents(filter?: {
    status?: string;
    busId?: string;
    search?: string;
    active?: boolean;
  }): Promise<Student[]>;
  getPendingStudents(): Promise<Student[]>;
  getStudentById(id: string): Promise<Student | null>;
  getStudentByRegisterNumber(regNo: string): Promise<Student | null>;
  getStudentsByBusId(busId: string): Promise<Student[]>;
  signupStudent(data: {
    name: string;
    registerNumber: string;
    email: string;
    phone: string;
    password?: string;
    preferredBusId?: string;
  }): Promise<Student>;
  createStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }): Promise<Student>;
  approveStudent(studentId: string, busId: string, approvedBy: string): Promise<Student | null>;
  rejectStudent(studentId: string, reason?: string): Promise<Student | null>;
  updateStudent(id: string, updates: Partial<Student>): Promise<Student | null>;
  deleteStudent(id: string): Promise<boolean>;

  // Buses
  getBuses(): Promise<Bus[]>;
  getBusById(id: string): Promise<Bus | null>;
  getBusByInchargeId(inchargeId: string): Promise<Bus | null>;
  createBus(bus: Omit<Bus, 'id'> & { id?: string }): Promise<Bus>;
  updateBus(id: string, updates: Partial<Bus>): Promise<Bus | null>;
  deleteBus(id: string): Promise<boolean>;

  // Attendance
  getAttendance(filter?: {
    date?: string;
    busId?: string;
    studentId?: string;
    sessionType?: SessionType | string;
  }): Promise<AttendanceRecord[]>;
  getAttendanceRecord(studentId: string, date: string, sessionType: SessionType | string): Promise<AttendanceRecord | null>;
  createAttendance(record: AttendanceRecord): Promise<AttendanceRecord>;
  updateAttendance(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | null>;

  // Active Dynamic Session (Morning / Travelling Bus)
  getActiveSession(busId?: string): Promise<ActiveSession | null>;
  saveActiveSession(session: ActiveSession): Promise<ActiveSession>;
  endActiveSession(sessionId?: string): Promise<boolean>;
  updateSessionLocation(
    sessionId: string,
    coords: { latitude: number; longitude: number; accuracyMeters?: number }
  ): Promise<ActiveSession | null>;

  // Settings
  getSettings(): Promise<AttendanceSettings>;
  updateSettings(settings: Partial<AttendanceSettings>): Promise<AttendanceSettings>;

  // Notifications
  getNotifications(filter?: { busId?: string; role?: string }): Promise<Notification[]>;
  createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<boolean>;
  markAllNotificationsAsRead(): Promise<boolean>;

  // Reports
  getReports(): Promise<FinalReport[]>;
  getReportByDate(date: string, sessionType: SessionType | string): Promise<FinalReport | null>;
  saveReport(report: FinalReport): Promise<FinalReport>;
}
