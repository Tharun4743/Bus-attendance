import fs from 'fs/promises';
import path from 'path';
import os from 'os';
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
} from '../../types';
import { generateDynamic6DigitCode } from '../attendance/codeGenerator';

export const CONSTANT_ADMIN: User = {
  id: 'ADMIN-1788560072628',
  name: 'Tharun',
  email: 'tharun@gmail.com',
  password: '474743',
  role: 'ADMIN',
  active: true,
  approved: true,
  status: 'APPROVED',
};

export const CONSTANT_INCHARGE: User = {
  id: 'INC006',
  name: 'Aarthi',
  email: 'aarthi@college.edu',
  password: 'aarthi123',
  role: 'INCHARGE',
  assignedBusId: 'BUS06',
  active: true,
  approved: true,
  status: 'APPROVED',
};

export class JsonStorageAdapter implements StorageAdapter {
  protected dataDir: string;
  protected writableDir: string;
  protected seedDir: string;
  protected cache: Map<string, any> = new Map();

  constructor(dataDir?: string) {
    this.seedDir = path.resolve(process.cwd(), 'data');
    const isServerlessOrProd = Boolean(
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NODE_ENV === 'production'
    );

    if (dataDir) {
      this.dataDir = dataDir;
      this.writableDir = dataDir;
    } else if (isServerlessOrProd) {
      this.dataDir = path.join(os.tmpdir(), 'bus_attendance_data');
      this.writableDir = this.dataDir;
    } else {
      this.dataDir = this.seedDir;
      this.writableDir = this.seedDir;
    }
  }

  private async readJson<T>(filename: string, defaultValue: T): Promise<T> {
    if (this.cache.has(filename)) {
      return this.cache.get(filename) as T;
    }

    // Try writable directory first (recent writes)
    try {
      const writablePath = path.join(this.writableDir, filename);
      const content = await fs.readFile(writablePath, 'utf-8');
      const parsed = JSON.parse(content);
      this.cache.set(filename, parsed);
      return parsed;
    } catch {
      // Not in writable dir or cannot read
    }

    // Try seed directory next
    try {
      const seedPath = path.join(this.seedDir, filename);
      const content = await fs.readFile(seedPath, 'utf-8');
      const parsed = JSON.parse(content);
      this.cache.set(filename, parsed);
      return parsed;
    } catch {
      // Not in seed dir either
    }

    // Fall back to defaultValue
    this.cache.set(filename, defaultValue);
    return defaultValue;
  }

  private async writeJson<T>(filename: string, data: T): Promise<void> {
    // 1. Update in-memory cache immediately
    this.cache.set(filename, data);

    // 2. Try writing to designated writable dir
    try {
      await fs.mkdir(this.writableDir, { recursive: true });
      await fs.writeFile(
        path.join(this.writableDir, filename),
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      return;
    } catch (err: any) {
      // If writing to original dir failed (e.g. EROFS / read-only filesystem), fallback to os.tmpdir()
      const fallbackDir = path.join(os.tmpdir(), 'bus_attendance_data');
      if (this.writableDir !== fallbackDir) {
        this.writableDir = fallbackDir;
        try {
          await fs.mkdir(fallbackDir, { recursive: true });
          await fs.writeFile(
            path.join(fallbackDir, filename),
            JSON.stringify(data, null, 2),
            'utf-8'
          );
          return;
        } catch (tmpErr) {
          console.warn(`[Storage] Warning: Failed to persist ${filename} to tmp disk:`, tmpErr);
        }
      } else {
        console.warn(`[Storage] Warning: Failed to persist ${filename} to disk:`, err);
      }
    }
  }

  // Users & Auth (Tharun is permanently fixed & unchangeable)
  async getUsers(): Promise<User[]> {
    let users = await this.readJson<User[]>('users.json', []);
    if (!Array.isArray(users)) users = [];

    // Ensure constant Admin is always present and unchangeable
    const adminIndex = users.findIndex((u) => u.id === CONSTANT_ADMIN.id || u.email.toLowerCase() === CONSTANT_ADMIN.email.toLowerCase());
    if (adminIndex === -1) {
      users.unshift(CONSTANT_ADMIN);
    } else {
      users[adminIndex] = { ...users[adminIndex], ...CONSTANT_ADMIN };
    }

    // Ensure constant Incharge is present
    const inchargeIndex = users.findIndex((u) => u.id === CONSTANT_INCHARGE.id || u.email.toLowerCase() === CONSTANT_INCHARGE.email.toLowerCase());
    if (inchargeIndex === -1) {
      users.push(CONSTANT_INCHARGE);
    } else {
      users[inchargeIndex] = { ...users[inchargeIndex], ...CONSTANT_INCHARGE };
    }

    return users;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const clean = email.trim().toLowerCase();
    if (clean === CONSTANT_ADMIN.email.toLowerCase() || clean === 'tharun' || clean === 'admin') {
      return CONSTANT_ADMIN;
    }
    if (clean === CONSTANT_INCHARGE.email.toLowerCase() || clean === 'aarthi' || clean === 'inc006') {
      return CONSTANT_INCHARGE;
    }

    const users = await this.getUsers();
    return users.find((u) => u.email.toLowerCase() === clean) || null;
  }

  async getUserById(id: string): Promise<User | null> {
    if (id === CONSTANT_ADMIN.id) return CONSTANT_ADMIN;
    if (id === CONSTANT_INCHARGE.id) return CONSTANT_INCHARGE;
    const users = await this.getUsers();
    return users.find((u) => u.id === id) || null;
  }

  async createUser(user: User): Promise<User> {
    const users = await this.getUsers();
    const existingIndex = users.findIndex(
      (u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase()
    );
    if (existingIndex !== -1) {
      users[existingIndex] = { ...users[existingIndex], ...user };
    } else {
      users.push(user);
    }
    await this.writeJson('users.json', users);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const users = await this.getUsers();
    const index = users.findIndex((u) => u.id === id || u.studentId === id);
    if (index === -1) return null;

    // Prevent overwriting immutable constant admin credentials
    if (users[index].id === CONSTANT_ADMIN.id) {
      return CONSTANT_ADMIN;
    }

    users[index] = { ...users[index], ...updates };
    await this.writeJson('users.json', users);
    return users[index];
  }

  async hasAdmin(): Promise<boolean> {
    return true; // Constant Admin Tharun is always present
  }

  // Students
  async getStudents(filter?: {
    status?: string;
    busId?: string;
    search?: string;
    active?: boolean;
  }): Promise<Student[]> {
    let students = await this.readJson<Student[]>('students.json', []);
    if (filter) {
      if (filter.status && filter.status !== 'ALL') {
        students = students.filter((s) => s.status === filter.status);
      }
      if (filter.busId && filter.busId !== 'ALL') {
        students = students.filter((s) => s.busId === filter.busId);
      }
      if (filter.active !== undefined) {
        students = students.filter((s) => s.active === filter.active);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        students = students.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.registerNumber.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            s.phone.includes(q)
        );
      }
    }
    return students;
  }

  async getPendingStudents(): Promise<Student[]> {
    const students = await this.getStudents();
    return students.filter((s) => s.status === 'PENDING' || (!s.approved && s.status !== 'REJECTED'));
  }

  async getStudentById(id: string): Promise<Student | null> {
    const students = await this.getStudents();
    return students.find((s) => s.id === id) || null;
  }

  async getStudentByRegisterNumber(regNo: string): Promise<Student | null> {
    const students = await this.getStudents();
    return students.find((s) => s.registerNumber.toLowerCase() === regNo.toLowerCase()) || null;
  }

  async getStudentsByBusId(busId: string): Promise<Student[]> {
    const students = await this.getStudents();
    return students.filter((s) => s.busId === busId && s.approved && s.active);
  }

  async signupStudent(data: {
    name: string;
    registerNumber: string;
    email: string;
    phone: string;
    password?: string;
    preferredBusId?: string;
  }): Promise<Student> {
    const students = await this.getStudents();
    const existingReg = students.find(
      (s) => s.registerNumber.toLowerCase() === data.registerNumber.trim().toLowerCase()
    );
    if (existingReg) {
      throw new Error(`Register Number ${data.registerNumber} is already registered.`);
    }

    const existingEmail = students.find(
      (s) => s.email.toLowerCase() === data.email.trim().toLowerCase()
    );
    if (existingEmail) {
      throw new Error(`Email ${data.email} is already registered.`);
    }

    const maxNumericId = students.reduce((max, s) => {
      const num = parseInt(s.id.replace(/\D/g, ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const newId = `STU${String(maxNumericId + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newStudent: Student = {
      id: newId,
      name: data.name.trim(),
      registerNumber: data.registerNumber.trim().toUpperCase(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      busId: '', // Unassigned until Admin approves
      preferredBusId: data.preferredBusId || '',
      role: 'STUDENT',
      status: 'PENDING',
      approved: false,
      active: false,
      createdAt: now,
      updatedAt: now,
    };

    students.push(newStudent);
    await this.writeJson('students.json', students);

    // Create user login record (disabled/pending)
    await this.createUser({
      id: newStudent.id,
      email: newStudent.email,
      password: data.password || 'student123',
      name: newStudent.name,
      role: 'STUDENT',
      studentId: newStudent.id,
      assignedBusId: '',
      status: 'PENDING',
      approved: false,
      active: false,
    });

    // Send admin notification
    await this.createNotification({
      title: '📋 New Student Registration',
      message: `${newStudent.name} (${newStudent.registerNumber}) registered and is awaiting approval.`,
      type: 'APPROVAL',
      date: now.split('T')[0],
      read: false,
      link: '/admin/approvals',
      targetRole: 'ADMIN',
      metadata: {
        studentId: newStudent.id,
        registerNumber: newStudent.registerNumber,
      },
    });

    return newStudent;
  }

  async createStudent(
    studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }
  ): Promise<Student> {
    const students = await this.getStudents();
    const maxNumericId = students.reduce((max, s) => {
      const num = parseInt(s.id.replace(/\D/g, ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const newId = `STU${String(maxNumericId + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newStudent: Student = {
      ...studentData,
      id: newId,
      status: studentData.status || 'APPROVED',
      approved: studentData.approved ?? true,
      active: studentData.active ?? true,
      createdAt: now,
      updatedAt: now,
    };

    students.push(newStudent);
    await this.writeJson('students.json', students);

    // Sync to users.json
    await this.createUser({
      id: newStudent.id,
      email: newStudent.email,
      password: studentData.password || 'student123',
      name: newStudent.name,
      role: 'STUDENT',
      studentId: newStudent.id,
      assignedBusId: newStudent.busId,
      status: newStudent.status,
      approved: newStudent.approved,
      active: newStudent.active,
    });

    return newStudent;
  }

  async approveStudent(studentId: string, busId: string, approvedBy: string): Promise<Student | null> {
    const students = await this.getStudents();
    const index = students.findIndex((s) => s.id === studentId);
    if (index === -1) return null;

    const now = new Date().toISOString();
    students[index] = {
      ...students[index],
      busId: busId,
      status: 'APPROVED',
      approved: true,
      active: true,
      approvedAt: now,
      approvedBy,
      updatedAt: now,
    };

    await this.writeJson('students.json', students);

    // Update user auth record
    await this.updateUser(studentId, {
      status: 'APPROVED',
      approved: true,
      active: true,
      assignedBusId: busId,
    });

    // Notify student
    await this.createNotification({
      title: '✅ Account Approved',
      message: `Your Bus Attendance account has been approved by ${approvedBy} and assigned to ${busId}. You can now login.`,
      type: 'APPROVAL',
      date: now.split('T')[0],
      read: false,
      busId,
      targetRole: 'STUDENT',
      metadata: {
        studentId,
        busId,
        status: 'APPROVED',
      },
    });

    return students[index];
  }

  async rejectStudent(studentId: string, reason?: string): Promise<Student | null> {
    const students = await this.getStudents();
    const index = students.findIndex((s) => s.id === studentId);
    if (index === -1) return null;

    const now = new Date().toISOString();
    students[index] = {
      ...students[index],
      status: 'REJECTED',
      approved: false,
      active: false,
      rejectionReason: reason || 'Registration was not approved by Admin.',
      updatedAt: now,
    };

    await this.writeJson('students.json', students);

    // Update user auth record
    await this.updateUser(studentId, {
      status: 'REJECTED',
      approved: false,
      active: false,
    });

    return students[index];
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student | null> {
    const students = await this.getStudents();
    const index = students.findIndex((s) => s.id === id);
    if (index === -1) return null;

    students[index] = {
      ...students[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.writeJson('students.json', students);

    // Sync auth details if applicable
    if (updates.email || updates.name || updates.busId || updates.active !== undefined || updates.status) {
      await this.updateUser(id, {
        email: updates.email,
        name: updates.name,
        assignedBusId: updates.busId,
        active: updates.active,
        status: updates.status,
        approved: updates.approved,
      });
    }

    return students[index];
  }

  async deleteStudent(id: string): Promise<boolean> {
    const students = await this.getStudents();
    const filtered = students.filter((s) => s.id !== id);
    if (filtered.length === students.length) return false;
    await this.writeJson('students.json', filtered);

    // Delete user from users.json as well
    const users = await this.getUsers();
    const filteredUsers = users.filter((u) => u.id !== id && u.studentId !== id);
    await this.writeJson('users.json', filteredUsers);
    return true;
  }

  // Buses
  async getBuses(): Promise<Bus[]> {
    return this.readJson<Bus[]>('buses.json', []);
  }

  async getBusById(id: string): Promise<Bus | null> {
    const buses = await this.getBuses();
    return buses.find((b) => b.id === id) || null;
  }

  async getBusByInchargeId(inchargeId: string): Promise<Bus | null> {
    const buses = await this.getBuses();
    return buses.find((b) => b.inchargeId === inchargeId) || null;
  }

  async createBus(busData: Omit<Bus, 'id'> & { id?: string }): Promise<Bus> {
    const buses = await this.getBuses();
    const maxNumericId = buses.reduce((max, b) => {
      const num = parseInt(b.id.replace(/\D/g, ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const newId = busData.id || `BUS${String(maxNumericId + 1).padStart(2, '0')}`;
    const newBus: Bus = {
      ...busData,
      id: newId,
    };
    buses.push(newBus);
    await this.writeJson('buses.json', buses);
    return newBus;
  }

  async updateBus(id: string, updates: Partial<Bus>): Promise<Bus | null> {
    const buses = await this.getBuses();
    const index = buses.findIndex((b) => b.id === id);
    if (index === -1) return null;

    buses[index] = {
      ...buses[index],
      ...updates,
    };
    await this.writeJson('buses.json', buses);
    return buses[index];
  }

  async deleteBus(id: string): Promise<boolean> {
    const buses = await this.getBuses();
    const filtered = buses.filter((b) => b.id !== id);
    if (filtered.length === buses.length) return false;
    await this.writeJson('buses.json', filtered);
    return true;
  }

  // Attendance Records
  async getAttendance(filter?: {
    date?: string;
    busId?: string;
    studentId?: string;
    sessionType?: SessionType | string;
  }): Promise<AttendanceRecord[]> {
    let records = await this.readJson<AttendanceRecord[]>('attendance.json', []);
    if (filter) {
      if (filter.date) {
        records = records.filter((r) => r.attendanceDate === filter.date);
      }
      if (filter.busId && filter.busId !== 'ALL') {
        records = records.filter((r) => r.busId === filter.busId);
      }
      if (filter.studentId && filter.studentId !== 'ALL') {
        records = records.filter((r) => r.studentId === filter.studentId);
      }
      if (filter.sessionType && filter.sessionType !== 'ALL') {
        records = records.filter((r) => r.sessionType === filter.sessionType);
      }
    }
    return records;
  }

  async getAttendanceRecord(
    studentId: string,
    date: string,
    sessionType: SessionType | string
  ): Promise<AttendanceRecord | null> {
    const records = await this.getAttendance({ studentId, date, sessionType });
    return records.length > 0 ? records[0] : null;
  }

  async createAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
    const records = await this.readJson<AttendanceRecord[]>('attendance.json', []);
    // Prevent duplicate records for same studentId + date + sessionType
    const existingIndex = records.findIndex(
      (r) =>
        r.studentId === record.studentId &&
        r.attendanceDate === record.attendanceDate &&
        r.sessionType === record.sessionType
    );

    if (existingIndex !== -1) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }
    await this.writeJson('attendance.json', records);
    return record;
  }

  async updateAttendance(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | null> {
    const records = await this.readJson<AttendanceRecord[]>('attendance.json', []);
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return null;

    records[index] = {
      ...records[index],
      ...updates,
    };
    await this.writeJson('attendance.json', records);
    return records[index];
  }

  // Active Dynamic Session (Morning / Evening, Ground / Travelling Bus with 6-digit code)
  async getActiveSession(busId?: string): Promise<ActiveSession | null> {
    const session = await this.readJson<ActiveSession | null>('active_session.json', null);
    if (!session || session.status !== 'ACTIVE') return null;

    // Check if dynamic code has expired (60s rotation)
    const now = Date.now();
    const expiry = session.codeExpiresAt ? new Date(session.codeExpiresAt).getTime() : 0;
    if (now >= expiry || !session.currentCode) {
      session.currentCode = generateDynamic6DigitCode();
      session.codeIssuedAt = new Date(now).toISOString();
      session.codeExpiresAt = new Date(now + 60 * 1000).toISOString();
      await this.writeJson('active_session.json', session);
    }

    if (busId && session.busId !== 'ALL' && session.busId !== busId) return null;
    return session;
  }

  async saveActiveSession(session: ActiveSession): Promise<ActiveSession> {
    if (!session.currentCode) {
      session.currentCode = generateDynamic6DigitCode();
      session.codeIssuedAt = new Date().toISOString();
      session.codeExpiresAt = new Date(Date.now() + 60 * 1000).toISOString();
    }
    await this.writeJson('active_session.json', session);
    return session;
  }

  async endActiveSession(_sessionId?: string): Promise<boolean> {
    const session = await this.readJson<ActiveSession | null>('active_session.json', null);
    if (!session) return false;
    session.status = 'CLOSED';
    session.currentCode = '';
    session.endedAt = new Date().toISOString();
    await this.writeJson('active_session.json', session);
    return true;
  }

  async updateSessionLocation(
    _sessionId: string,
    coords: { latitude: number; longitude: number; accuracyMeters?: number }
  ): Promise<ActiveSession | null> {
    const session = await this.readJson<ActiveSession | null>('active_session.json', null);
    if (!session || session.status !== 'ACTIVE') return null;

    session.location = {
      type: session.location?.type || 'ADMIN_DYNAMIC',
      name: session.location?.name,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracyMeters: coords.accuracyMeters ?? session.location?.accuracyMeters,
      updatedAt: new Date().toISOString(),
    };

    await this.writeJson('active_session.json', session);
    return session;
  }

  // Settings
  async getSettings(): Promise<AttendanceSettings> {
    const defaultSettings: AttendanceSettings = {
      sessionType: 'EVENING',
      startTime: '16:50',
      endTime: '16:55',
      reportTime: '16:57',
      timezone: 'Asia/Kolkata',
      location: {
        name: 'College Ground',
        latitude: 13.0827,
        longitude: 80.2707,
        radiusMeters: 10,
        maxGpsAccuracyMeters: 20,
      },
      simulation: {
        enabled: false,
        simulatedTime: null,
      },
    };
    return this.readJson<AttendanceSettings>('settings.json', defaultSettings);
  }

  async updateSettings(settings: Partial<AttendanceSettings>): Promise<AttendanceSettings> {
    const current = await this.getSettings();
    const updated: AttendanceSettings = {
      ...current,
      ...settings,
      location: {
        ...current.location,
        ...(settings.location || {}),
      },
      simulation: {
        enabled: settings.simulation?.enabled ?? current.simulation?.enabled ?? false,
        simulatedTime:
          settings.simulation?.simulatedTime !== undefined
            ? settings.simulation.simulatedTime
            : current.simulation?.simulatedTime ?? null,
      },
    };
    await this.writeJson('settings.json', updated);
    return updated;
  }

  // Notifications
  async getNotifications(filter?: { busId?: string; role?: string }): Promise<Notification[]> {
    let notifs = await this.readJson<Notification[]>('notifications.json', []);
    if (filter) {
      if (filter.busId) {
        notifs = notifs.filter((n) => !n.busId || n.busId === 'ALL' || n.busId === filter.busId);
      }
      if (filter.role) {
        notifs = notifs.filter((n) => !n.targetRole || n.targetRole === filter.role);
      }
    }
    return notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createNotification(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const notifications = await this.readJson<Notification[]>('notifications.json', []);
    const newNotif: Notification = {
      ...data,
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    notifications.unshift(newNotif);
    await this.writeJson('notifications.json', notifications);
    return newNotif;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const notifications = await this.readJson<Notification[]>('notifications.json', []);
    const notif = notifications.find((n) => n.id === id);
    if (!notif) return false;
    notif.read = true;
    await this.writeJson('notifications.json', notifications);
    return true;
  }

  async markAllNotificationsAsRead(): Promise<boolean> {
    const notifications = await this.readJson<Notification[]>('notifications.json', []);
    notifications.forEach((n) => (n.read = true));
    await this.writeJson('notifications.json', notifications);
    return true;
  }

  // Reports
  async getReports(): Promise<FinalReport[]> {
    const reports = await this.readJson<FinalReport[]>('reports.json', []);
    return reports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  async getReportByDate(date: string, sessionType: SessionType | string): Promise<FinalReport | null> {
    const reports = await this.getReports();
    return reports.find((r) => r.date === date && r.sessionType === sessionType) || null;
  }

  async saveReport(report: FinalReport): Promise<FinalReport> {
    const reports = await this.readJson<FinalReport[]>('reports.json', []);
    const existingIndex = reports.findIndex(
      (r) => r.date === report.date && r.sessionType === report.sessionType
    );
    if (existingIndex !== -1) {
      reports[existingIndex] = report;
    } else {
      reports.unshift(report);
    }
    await this.writeJson('reports.json', reports);
    return report;
  }
}
