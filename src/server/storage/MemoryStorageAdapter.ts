import { StorageAdapter } from './StorageAdapter';
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
  CampusCheckpoint,
} from '../../types';

export class MemoryStorageAdapter implements StorageAdapter {
  private users: User[] = [];
  private students: Student[] = [];
  private buses: Bus[] = [];
  private attendance: AttendanceRecord[] = [];
  private activeSession: ActiveSession | null = null;
  private notifications: Notification[] = [];
  private reports: FinalReport[] = [];
  private checkpoints: CampusCheckpoint[] = [];
  private settings: AttendanceSettings = {
    sessionType: 'EVENING',
    startTime: '16:50',
    endTime: '16:55',
    reportTime: '16:57',
    timezone: 'Asia/Kolkata',
    location: {
      name: 'VSB Engineering College Campus',
      latitude: 10.9572,
      longitude: 78.0766,
      radiusMeters: 150,
      maxGpsAccuracyMeters: 80,
    },
    simulation: { enabled: false, simulatedTime: null },
  };

  constructor() {
    // Pure empty initial memory state - zero hardcoded constant users or passwords
  }

  // Users
  async getUsers(): Promise<User[]> {
    return [...this.users];
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const clean = email.trim().toLowerCase();
    return this.users.find((u) => u.email.toLowerCase() === clean) || null;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id || u.studentId === id) || null;
  }

  async createUser(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const idx = this.users.findIndex((u) => u.id === id || u.studentId === id);
    if (idx === -1) return null;
    this.users[idx] = { ...this.users[idx], ...updates };
    return this.users[idx];
  }

  async hasAdmin(): Promise<boolean> {
    return this.users.some((u) => u.role === 'ADMIN');
  }

  async signupIncharge(data: {
    name: string;
    email: string;
    phone?: string;
    password?: string;
    busNumber: string;
    routeName?: string;
  }): Promise<User> {
    const email = data.email.trim().toLowerCase();
    const rawBusNo = data.busNumber.trim();
    const busId = rawBusNo.toUpperCase().startsWith('BUS') ? rawBusNo.toUpperCase() : `BUS-${rawBusNo.toUpperCase()}`;

    // Ensure bus exists in memory
    const existingBus = this.buses.find((b) => b.id === busId || b.busNumber.toLowerCase() === rawBusNo.toLowerCase());
    if (!existingBus) {
      this.buses.push({
        id: busId,
        busNumber: rawBusNo,
        routeName: data.routeName || `${rawBusNo} Route`,
        inchargeId: '',
        capacity: 60,
        active: true,
      });
    }

    const inchargeUser: User = {
      id: `USR-${Date.now()}`,
      email,
      name: data.name.trim(),
      phone: data.phone?.trim(),
      password: data.password || '',
      role: 'INCHARGE',
      assignedBusId: busId,
      busNumber: rawBusNo,
      routeName: data.routeName || `${rawBusNo} Route`,
      status: 'PENDING',
      active: false,
      approved: false,
      createdAt: new Date().toISOString(),
    };

    const existingIdx = this.users.findIndex((u) => u.email.toLowerCase() === email);
    if (existingIdx !== -1) {
      this.users[existingIdx] = inchargeUser;
    } else {
      this.users.push(inchargeUser);
    }

    return inchargeUser;
  }

  async getPendingIncharges(): Promise<User[]> {
    return this.users.filter((u) => u.role === 'INCHARGE' && u.status === 'PENDING');
  }

  async approveIncharge(userId: string, busNumber?: string): Promise<User | null> {
    const cleanId = userId.trim().toLowerCase();
    const user = this.users.find((u) => u.id.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId);
    if (!user) return null;

    const busId = busNumber
      ? (busNumber.toUpperCase().startsWith('BUS') ? busNumber.toUpperCase() : `BUS-${busNumber.toUpperCase()}`)
      : user.assignedBusId;

    user.status = 'APPROVED';
    user.active = true;
    user.approved = true;
    if (busId) user.assignedBusId = busId;

    if (busId) {
      const bus = this.buses.find((b) => b.id === busId || b.busNumber.toLowerCase() === busId.toLowerCase());
      if (bus) {
        bus.inchargeId = user.id;
        bus.active = true;
      }
    }

    return user;
  }

  async rejectIncharge(userId: string): Promise<boolean> {
    const cleanId = userId.trim().toLowerCase();
    const user = this.users.find((u) => u.id.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId);
    if (!user) return false;
    user.status = 'REJECTED';
    user.active = false;
    user.approved = false;
    return true;
  }

  // Students
  async getStudents(filter?: {
    status?: string;
    busId?: string;
    search?: string;
    active?: boolean;
  }): Promise<Student[]> {
    return this.students.filter((s) => {
      if (filter?.status && s.status !== filter.status) return false;
      if (filter?.busId && s.busId !== filter.busId && s.preferredBusId !== filter.busId) return false;
      if (filter?.active !== undefined && s.active !== filter.active) return false;
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.registerNumber.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }

  async getPendingStudents(): Promise<Student[]> {
    return this.getStudents({ status: 'PENDING' });
  }

  async getStudentById(id: string): Promise<Student | null> {
    const clean = id.trim().toLowerCase();
    const cleanNoPrefix = clean.replace(/^(usr-|stu-)/i, '');
    return (
      this.students.find(
        (s) =>
          s.id.toLowerCase() === clean ||
          s.registerNumber.toLowerCase() === clean ||
          s.email.toLowerCase() === clean ||
          s.registerNumber.toLowerCase() === cleanNoPrefix
      ) || null
    );
  }

  async getStudentByRegisterNumber(regNo: string): Promise<Student | null> {
    const clean = regNo.trim().toLowerCase();
    return this.students.find((s) => s.registerNumber.toLowerCase() === clean) || null;
  }

  async getStudentsByBusId(busId: string): Promise<Student[]> {
    return this.getStudents({ busId, status: 'APPROVED' });
  }

  async signupStudent(data: {
    name: string;
    registerNumber: string;
    email?: string;
    phone?: string;
    password?: string;
    preferredBusId?: string;
  }): Promise<Student> {
    const regNo = data.registerNumber.trim();
    const studentId = `STU-${regNo.toUpperCase()}`;
    const email = data.email || `${regNo.toLowerCase()}@college.edu`;

    const newStudent: Student = {
      id: studentId,
      registerNumber: regNo,
      name: data.name,
      email,
      phone: data.phone || '',
      busId: '',
      preferredBusId: data.preferredBusId,
      role: 'STUDENT',
      status: 'PENDING',
      approved: false,
      active: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.students.push(newStudent);
    this.users.push({
      id: `USR-${regNo.toUpperCase()}`,
      studentId,
      name: data.name,
      email,
      password: data.password || '',
      role: 'STUDENT',
      assignedBusId: data.preferredBusId,
      status: 'PENDING',
      approved: false,
      active: false,
    });

    return newStudent;
  }

  async createStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }): Promise<Student> {
    const regNo = student.registerNumber.trim();
    const studentId = `STU-${regNo.toUpperCase()}`;
    const newStudent: Student = {
      ...student,
      id: studentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.students.push(newStudent);
    return newStudent;
  }

  async approveStudent(studentId: string, busId: string, approvedBy: string): Promise<Student | null> {
    const student = await this.getStudentById(studentId);
    if (!student) return null;
    student.status = 'APPROVED';
    student.approved = true;
    student.active = true;
    student.busId = busId;
    student.approvedBy = approvedBy;
    student.approvedAt = new Date().toISOString();

    const user = await this.getUserByEmail(student.email);
    if (user) {
      user.approved = true;
      user.active = true;
      user.status = 'APPROVED';
      user.assignedBusId = busId;
    }
    return student;
  }

  async rejectStudent(studentId: string, reason?: string): Promise<Student | null> {
    const student = await this.getStudentById(studentId);
    if (!student) return null;
    student.status = 'REJECTED';
    student.approved = false;
    student.rejectionReason = reason;

    const user = await this.getUserByEmail(student.email);
    if (user) {
      user.approved = false;
      user.status = 'REJECTED';
    }
    return student;
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student | null> {
    const student = await this.getStudentById(id);
    if (!student) return null;
    Object.assign(student, updates, { updatedAt: new Date().toISOString() });
    return student;
  }

  async deleteStudent(id: string): Promise<boolean> {
    this.students = this.students.filter((s) => s.id !== id);
    this.users = this.users.filter((u) => u.id !== id && u.studentId !== id);
    return true;
  }

  // Buses
  async getBuses(): Promise<Bus[]> {
    return [...this.buses];
  }

  async getBusById(id: string): Promise<Bus | null> {
    return this.buses.find((b) => b.id === id) || null;
  }

  async getBusByInchargeId(inchargeId: string): Promise<Bus | null> {
    const user = this.users.find((u) => u.id === inchargeId || u.email === inchargeId);
    let bus = this.buses.find((b) => b.inchargeId === inchargeId);
    if (!bus && user?.assignedBusId) {
      bus = this.buses.find((b) => b.id === user.assignedBusId);
    }
    if (!bus) {
      bus = this.buses.find((b) => b.id === inchargeId);
    }
    return bus || null;
  }

  async createBus(bus: Omit<Bus, 'id'> & { id?: string }): Promise<Bus> {
    const cleanBusNo = bus.busNumber.trim();
    const cleanId = cleanBusNo.toUpperCase();
    const id = bus.id || (cleanId.startsWith('BUS') ? cleanId : `BUS-${cleanId}`);
    const existingIdx = this.buses.findIndex((b) => b.id === id || b.busNumber.toLowerCase() === cleanBusNo.toLowerCase());
    const newBus: Bus = {
      id,
      busNumber: cleanBusNo,
      routeName: bus.routeName.trim(),
      inchargeId: bus.inchargeId || '',
      capacity: bus.capacity || 60,
      active: bus.active ?? true,
    };
    if (existingIdx !== -1) {
      this.buses[existingIdx] = newBus;
    } else {
      this.buses.push(newBus);
    }
    if (bus.inchargeId) {
      const u = this.users.find((user) => user.id === bus.inchargeId);
      if (u) u.assignedBusId = id;
    }
    return newBus;
  }

  async updateBus(id: string, updates: Partial<Bus>): Promise<Bus | null> {
    const bus = await this.getBusById(id);
    if (!bus) return null;
    Object.assign(bus, updates);
    return bus;
  }

  async deleteBus(id: string): Promise<boolean> {
    this.buses = this.buses.filter((b) => b.id !== id);
    return true;
  }

  // Attendance
  async getAttendance(filter?: {
    date?: string;
    busId?: string;
    studentId?: string;
    sessionType?: SessionType | string;
  }): Promise<AttendanceRecord[]> {
    return this.attendance.filter((a) => {
      if (filter?.date && a.attendanceDate !== filter.date) return false;
      if (filter?.busId && filter.busId !== 'ALL' && a.busId !== filter.busId) return false;
      if (filter?.studentId && a.studentId !== filter.studentId) return false;
      if (filter?.sessionType && a.sessionType !== filter.sessionType) return false;
      return true;
    });
  }

  async getAttendanceRecord(
    studentId: string,
    date: string,
    sessionType: SessionType | string
  ): Promise<AttendanceRecord | null> {
    return (
      this.attendance.find(
        (a) => a.studentId === studentId && a.attendanceDate === date && a.sessionType === sessionType
      ) || null
    );
  }

  async createAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
    const idx = this.attendance.findIndex(
      (a) =>
        a.studentId === record.studentId &&
        a.attendanceDate === record.attendanceDate &&
        a.sessionType === record.sessionType
    );
    if (idx !== -1) {
      this.attendance[idx] = record;
    } else {
      this.attendance.push(record);
    }
    return record;
  }

  async updateAttendance(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | null> {
    const idx = this.attendance.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    this.attendance[idx] = { ...this.attendance[idx], ...updates };
    return this.attendance[idx];
  }

  // Active Session
  async getActiveSession(busId?: string): Promise<ActiveSession | null> {
    if (!this.activeSession || this.activeSession.status !== 'ACTIVE') return null;
    if (busId && busId !== 'ALL' && this.activeSession.busId !== busId && this.activeSession.busId !== 'ALL') {
      return null;
    }
    return this.activeSession;
  }

  async saveActiveSession(session: ActiveSession): Promise<ActiveSession> {
    this.activeSession = session;
    return session;
  }

  async endActiveSession(_sessionId?: string): Promise<boolean> {
    if (this.activeSession) {
      this.activeSession.status = 'CLOSED';
      this.activeSession.endedAt = new Date().toISOString();
    }
    return true;
  }

  async updateSessionLocation(
    _sessionId: string,
    coords: { latitude: number; longitude: number; accuracyMeters?: number }
  ): Promise<ActiveSession | null> {
    if (!this.activeSession) return null;
    this.activeSession.location = {
      type: 'FIXED',
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracyMeters: coords.accuracyMeters,
      updatedAt: new Date().toISOString(),
    };
    return this.activeSession;
  }

  // Settings
  async getSettings(): Promise<AttendanceSettings> {
    return { ...this.settings };
  }

  async updateSettings(settings: Partial<AttendanceSettings>): Promise<AttendanceSettings> {
    if (settings.location) {
      this.settings.location = { ...this.settings.location, ...settings.location };
    }
    if (settings.simulation) {
      this.settings.simulation = { ...this.settings.simulation, ...settings.simulation };
    }
    Object.assign(this.settings, {
      startTime: settings.startTime ?? this.settings.startTime,
      endTime: settings.endTime ?? this.settings.endTime,
      reportTime: settings.reportTime ?? this.settings.reportTime,
      timezone: settings.timezone ?? this.settings.timezone,
    });
    return this.getSettings();
  }

  // Campus Checkpoints
  async getCheckpoints(): Promise<CampusCheckpoint[]> {
    return [...this.checkpoints];
  }

  async createCheckpoint(checkpoint: Omit<CampusCheckpoint, 'id' | 'createdAt'>): Promise<CampusCheckpoint> {
    const cp: CampusCheckpoint = {
      ...checkpoint,
      id: `CP-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.checkpoints.push(cp);
    return cp;
  }

  async deleteCheckpoint(id: string): Promise<boolean> {
    const idx = this.checkpoints.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.checkpoints.splice(idx, 1);
      return true;
    }
    return false;
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return [...this.notifications];
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const notif: Notification = {
      ...notification,
      id: `NOTIF-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.notifications.push(notif);
    return notif;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) notif.read = true;
    return true;
  }

  async markAllNotificationsAsRead(): Promise<boolean> {
    this.notifications.forEach((n) => (n.read = true));
    return true;
  }

  // Reports
  async getReports(): Promise<FinalReport[]> {
    return [...this.reports];
  }

  async getReportByDate(date: string, sessionType: SessionType | string): Promise<FinalReport | null> {
    return this.reports.find((r) => r.date === date && r.sessionType === sessionType) || null;
  }

  async saveReport(report: FinalReport): Promise<FinalReport> {
    const idx = this.reports.findIndex((r) => r.date === report.date && r.sessionType === report.sessionType);
    if (idx !== -1) {
      this.reports[idx] = report;
    } else {
      this.reports.push(report);
    }
    return report;
  }
}
