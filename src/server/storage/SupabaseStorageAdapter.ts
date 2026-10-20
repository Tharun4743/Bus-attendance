import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

export class SupabaseStorageAdapter implements StorageAdapter {
  private client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://dprtzvoyeyrbioqzzlkx.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    this.client = createClient(url, key, {
      auth: { persistSession: false },
    });
    console.log('⚡ [SupabaseStorageAdapter] Active Primary Storage Engine connected to PostgreSQL via PostgREST');
  }

  // ==========================================================================
  // 1. USERS & AUTHENTICATION
  // ==========================================================================
  async getUsers(): Promise<User[]> {
    const { data, error } = await this.client.from('users').select('*').order('created_at', { ascending: true });
    if (error || !data) {
      console.error('Error fetching users from Supabase:', error);
      return [];
    }
    return data.map((u: any) => ({
      id: u.id,
      email: u.email,
      password: u.password_hash,
      name: u.name,
      role: u.role,
      assignedBusId: u.assigned_bus_id,
      studentId: u.student_id,
      status: u.status,
      active: u.active,
      approved: u.status === 'APPROVED',
    }));
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const clean = email.trim().toLowerCase();
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', clean)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email,
      password: data.password_hash,
      name: data.name,
      role: data.role,
      assignedBusId: data.assigned_bus_id,
      studentId: data.student_id,
      status: data.status,
      active: data.active,
      approved: data.status === 'APPROVED',
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.client.from('users').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email,
      password: data.password_hash,
      name: data.name,
      role: data.role,
      assignedBusId: data.assigned_bus_id,
      studentId: data.student_id,
      status: data.status,
      active: data.active,
      approved: data.status === 'APPROVED',
    };
  }

  async createUser(user: User): Promise<User> {
    const { data, error } = await this.client
      .from('users')
      .insert({
        email: user.email.toLowerCase(),
        password_hash: user.password || '',
        name: user.name,
        role: user.role,
        assigned_bus_id: user.assignedBusId,
        student_id: user.studentId,
        status: user.status || 'APPROVED',
        active: user.active ?? true,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create user in Supabase PostgreSQL: ${error?.message}`);
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      assignedBusId: data.assigned_bus_id,
      studentId: data.student_id,
      status: data.status,
      active: data.active,
    };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const mapped: any = { updated_at: new Date().toISOString() };
    if (updates.name) mapped.name = updates.name;
    if (updates.password) mapped.password_hash = updates.password;
    if (updates.status) mapped.status = updates.status;
    if (updates.active !== undefined) mapped.active = updates.active;
    if (updates.assignedBusId) mapped.assigned_bus_id = updates.assignedBusId;

    const { data, error } = await this.client
      .from('users')
      .update(mapped)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      assignedBusId: data.assigned_bus_id,
      studentId: data.student_id,
      status: data.status,
      active: data.active,
    };
  }

  async hasAdmin(): Promise<boolean> {
    const { count, error } = await this.client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'ADMIN');

    if (error || count === null) return false;
    return count > 0;
  }

  // ==========================================================================
  // 2. STUDENTS COMMUTER DIRECTORY & ROSTERS
  // ==========================================================================
  async getStudents(filter?: {
    status?: string;
    busId?: string;
    search?: string;
    active?: boolean;
  }): Promise<Student[]> {
    let query = this.client.from('students').select('*').order('created_at', { ascending: false });
    if (filter?.status) query = query.eq('status', filter.status);
    if (filter?.busId) query = query.eq('bus_id', filter.busId);
    if (filter?.active !== undefined) query = query.eq('active', filter.active);

    const { data, error } = await query;
    if (error || !data) return [];

    let list: Student[] = data.map((s: any) => ({
      id: s.id,
      registerNumber: s.register_number,
      name: s.name,
      email: s.email,
      phone: s.phone || '',
      busId: s.bus_id || '',
      preferredBusId: s.preferred_bus_id,
      role: 'STUDENT',
      status: s.status,
      approved: s.approved,
      active: s.active,
      rejectionReason: s.rejection_reason,
      approvedAt: s.approved_at,
      approvedBy: s.approved_by,
      profilePhotoUrl: s.profile_photo_url,
      profilePhotoPublicId: s.profile_photo_public_id,
      faceDescriptor: s.face_descriptor,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.registerNumber.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }
    return list;
  }

  async getPendingStudents(): Promise<Student[]> {
    return this.getStudents({ status: 'PENDING' });
  }

  async getStudentById(id: string): Promise<Student | null> {
    const clean = id.trim();
    const cleanNoPrefix = clean.replace(/^(usr-|stu-)/i, '');
    const { data, error } = await this.client
      .from('students')
      .select('*')
      .or(`id.eq.${clean},register_number.ilike.${clean},email.ilike.${clean},register_number.ilike.${cleanNoPrefix}`)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      registerNumber: data.register_number,
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      busId: data.bus_id || '',
      preferredBusId: data.preferred_bus_id,
      role: 'STUDENT',
      status: data.status,
      approved: data.approved,
      active: data.active,
      rejectionReason: data.rejection_reason,
      approvedAt: data.approved_at,
      approvedBy: data.approved_by,
      profilePhotoUrl: data.profile_photo_url,
      profilePhotoPublicId: data.profile_photo_public_id,
      faceDescriptor: data.face_descriptor,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getStudentByRegisterNumber(regNo: string): Promise<Student | null> {
    const { data, error } = await this.client
      .from('students')
      .select('*')
      .eq('register_number', regNo.toUpperCase())
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      registerNumber: data.register_number,
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      busId: data.bus_id || '',
      preferredBusId: data.preferred_bus_id,
      role: 'STUDENT',
      status: data.status,
      approved: data.approved,
      active: data.active,
      rejectionReason: data.rejection_reason,
      profilePhotoUrl: data.profile_photo_url,
      profilePhotoPublicId: data.profile_photo_public_id,
      faceDescriptor: data.face_descriptor,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getStudentsByBusId(busId: string): Promise<Student[]> {
    return this.getStudents({ busId, active: true });
  }

  async signupStudent(data: {
    name: string;
    registerNumber: string;
    email?: string;
    phone?: string;
    password?: string;
    preferredBusId?: string;
  }): Promise<Student> {
    const cleanReg = data.registerNumber.trim().toUpperCase();
    const cleanEmail = (data.email || `${cleanReg.toLowerCase()}@college.edu`).trim().toLowerCase();
    const studentId = `STU-${cleanReg}`;

    // 1. Create User account in PostgreSQL
    const createdUser = await this.createUser({
      id: studentId,
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password || 'student123',
      role: 'STUDENT',
      studentId,
      assignedBusId: '',
      status: 'PENDING',
      approved: false,
      active: false,
    });

    // 2. Create Student profile in PostgreSQL
    const { data: studentRecord, error } = await this.client
      .from('students')
      .insert({
        id: studentId,
        user_id: createdUser.id,
        register_number: cleanReg,
        name: data.name.trim(),
        email: cleanEmail,
        phone: data.phone?.trim() || '',
        bus_id: null,
        preferred_bus_id: data.preferredBusId || null,
        status: 'PENDING',
        approved: false,
        active: false,
      })
      .select()
      .single();

    if (error || !studentRecord) {
      throw new Error(`Failed to create student in PostgreSQL: ${error?.message}`);
    }

    // 3. Create Admin Notification
    await this.createNotification({
      title: '📋 New Student Registration',
      message: `${data.name} (${cleanReg}) registered and is awaiting administrator bus assignment.`,
      type: 'APPROVAL',
      date: new Date().toISOString(),
      read: false,
      targetRole: 'ADMIN',
    });

    return {
      id: studentRecord.id,
      registerNumber: studentRecord.register_number,
      name: studentRecord.name,
      email: studentRecord.email,
      phone: studentRecord.phone,
      busId: '',
      preferredBusId: studentRecord.preferred_bus_id,
      role: 'STUDENT',
      status: 'PENDING',
      approved: false,
      active: false,
      createdAt: studentRecord.created_at,
      updatedAt: studentRecord.updated_at,
    };
  }

  async createStudent(
    studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }
  ): Promise<Student> {
    const cleanReg = studentData.registerNumber.trim().toUpperCase();
    const studentId = `STU-${cleanReg}`;

    const { data, error } = await this.client
      .from('students')
      .insert({
        id: studentId,
        register_number: cleanReg,
        name: studentData.name,
        email: studentData.email,
        phone: studentData.phone,
        bus_id: studentData.busId || null,
        preferred_bus_id: studentData.preferredBusId || null,
        status: studentData.status || 'APPROVED',
        approved: studentData.approved ?? true,
        active: studentData.active ?? true,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create student: ${error?.message}`);
    }

    return {
      id: data.id,
      registerNumber: data.register_number,
      name: data.name,
      email: data.email,
      phone: data.phone,
      busId: data.bus_id || '',
      preferredBusId: data.preferred_bus_id,
      role: 'STUDENT',
      status: data.status,
      approved: data.approved,
      active: data.active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async approveStudent(studentId: string, busId: string, approvedBy: string): Promise<Student | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('students')
      .update({
        bus_id: busId,
        status: 'APPROVED',
        approved: true,
        active: true,
        approved_at: now,
        approved_by: approvedBy,
        updated_at: now,
      })
      .eq('id', studentId)
      .select()
      .maybeSingle();

    if (error || !data) return null;

    // Update corresponding user record
    await this.client
      .from('users')
      .update({
        assigned_bus_id: busId,
        status: 'APPROVED',
        active: true,
        updated_at: now,
      })
      .or(`student_id.eq.${studentId},id.eq.${studentId}`);

    return {
      id: data.id,
      registerNumber: data.register_number,
      name: data.name,
      email: data.email,
      phone: data.phone,
      busId: data.bus_id,
      preferredBusId: data.preferred_bus_id,
      role: 'STUDENT',
      status: 'APPROVED',
      approved: true,
      active: true,
      approvedAt: data.approved_at,
      approvedBy: data.approved_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async rejectStudent(studentId: string, reason?: string): Promise<Student | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('students')
      .update({
        status: 'REJECTED',
        approved: false,
        active: false,
        rejection_reason: reason || 'Registration was rejected by transport administrator.',
        updated_at: now,
      })
      .eq('id', studentId)
      .select()
      .maybeSingle();

    if (error || !data) return null;

    // Update user auth state
    await this.client
      .from('users')
      .update({
        status: 'REJECTED',
        active: false,
        updated_at: now,
      })
      .or(`student_id.eq.${studentId},id.eq.${studentId}`);

    return {
      id: data.id,
      registerNumber: data.register_number,
      name: data.name,
      email: data.email,
      phone: data.phone,
      busId: data.bus_id || '',
      preferredBusId: data.preferred_bus_id,
      role: 'STUDENT',
      status: 'REJECTED',
      approved: false,
      active: false,
      rejectionReason: data.rejection_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student | null> {
    const mapped: any = { updated_at: new Date().toISOString() };
    if (updates.name) mapped.name = updates.name;
    if (updates.phone !== undefined) mapped.phone = updates.phone;
    if (updates.busId !== undefined) mapped.bus_id = updates.busId;
    if (updates.active !== undefined) mapped.active = updates.active;
    if (updates.status) mapped.status = updates.status;
    if (updates.profilePhotoUrl !== undefined) mapped.profile_photo_url = updates.profilePhotoUrl;
    if (updates.profilePhotoPublicId !== undefined) mapped.profile_photo_public_id = updates.profilePhotoPublicId;
    if (updates.faceDescriptor !== undefined) mapped.face_descriptor = updates.faceDescriptor;

    const clean = id.trim();
    const cleanNoPrefix = clean.replace(/^(usr-|stu-)/i, '');
    const { data, error } = await this.client
      .from('students')
      .update(mapped)
      .or(`id.eq.${clean},register_number.ilike.${clean},email.ilike.${clean},register_number.ilike.${cleanNoPrefix}`)
      .select()
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      registerNumber: data.register_number,
      name: data.name,
      email: data.email,
      phone: data.phone,
      busId: data.bus_id || '',
      preferredBusId: data.preferred_bus_id,
      role: 'STUDENT',
      status: data.status,
      approved: data.approved,
      active: data.active,
      profilePhotoUrl: data.profile_photo_url,
      profilePhotoPublicId: data.profile_photo_public_id,
      faceDescriptor: data.face_descriptor,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async deleteStudent(id: string): Promise<boolean> {
    await this.client.from('students').delete().eq('id', id);
    await this.client.from('users').delete().or(`student_id.eq.${id},id.eq.${id}`);
    return true;
  }

  // ==========================================================================
  // 3. BUS FLEET & ROUTES
  // ==========================================================================
  async getBuses(): Promise<Bus[]> {
    const { data, error } = await this.client.from('buses').select('*').order('id', { ascending: true });
    if (error || !data) return [];
    return data.map((b: any) => ({
      id: b.id,
      busNumber: b.bus_number,
      routeName: b.route_name,
      inchargeId: b.incharge_id || '',
      active: b.active,
    }));
  }

  async getBusById(id: string): Promise<Bus | null> {
    const { data, error } = await this.client.from('buses').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      busNumber: data.bus_number,
      routeName: data.route_name,
      inchargeId: data.incharge_id || '',
      active: data.active,
    };
  }

  async getBusByInchargeId(inchargeId: string): Promise<Bus | null> {
    const { data, error } = await this.client.from('buses').select('*').eq('incharge_id', inchargeId).maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      busNumber: data.bus_number,
      routeName: data.route_name,
      inchargeId: data.incharge_id || '',
      active: data.active,
    };
  }

  async createBus(busData: Omit<Bus, 'id'> & { id?: string }): Promise<Bus> {
    const id = busData.id || `BUS${Date.now().toString().slice(-4)}`;
    const { data, error } = await this.client
      .from('buses')
      .insert({
        id,
        bus_number: busData.busNumber,
        route_name: busData.routeName,
        incharge_id: busData.inchargeId || null,
        active: busData.active ?? true,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create bus in PostgreSQL: ${error?.message}`);
    }

    return {
      id: data.id,
      busNumber: data.bus_number,
      routeName: data.route_name,
      inchargeId: data.incharge_id || '',
      active: data.active,
    };
  }

  async updateBus(id: string, updates: Partial<Bus>): Promise<Bus | null> {
    const mapped: any = { updated_at: new Date().toISOString() };
    if (updates.busNumber) mapped.bus_number = updates.busNumber;
    if (updates.routeName) mapped.route_name = updates.routeName;
    if (updates.inchargeId !== undefined) mapped.incharge_id = updates.inchargeId;
    if (updates.active !== undefined) mapped.active = updates.active;

    const { data, error } = await this.client.from('buses').update(mapped).eq('id', id).select().maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      busNumber: data.bus_number,
      routeName: data.route_name,
      inchargeId: data.incharge_id || '',
      active: data.active,
    };
  }

  async deleteBus(id: string): Promise<boolean> {
    const { error } = await this.client.from('buses').delete().eq('id', id);
    return !error;
  }

  // ==========================================================================
  // 4. ATTENDANCE LOGGING & GEOFENCE AUDIT
  // ==========================================================================
  async getAttendance(filter?: {
    date?: string;
    busId?: string;
    studentId?: string;
    sessionType?: SessionType | string;
  }): Promise<AttendanceRecord[]> {
    let query = this.client.from('attendance_records').select('*').order('captured_at', { ascending: false });
    if (filter?.date) query = query.eq('attendance_date', filter.date);
    if (filter?.busId) query = query.eq('bus_id', filter.busId);
    if (filter?.studentId) query = query.eq('student_id', filter.studentId);
    if (filter?.sessionType) query = query.eq('session_type', filter.sessionType);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      studentId: r.student_id,
      busId: r.bus_id,
      attendanceDate: r.attendance_date,
      sessionType: r.session_type,
      attendanceMode: r.attendance_mode,
      sessionId: r.session_id,
      status: r.status,
      codeUsed: r.code_used,
      latitude: r.latitude,
      longitude: r.longitude,
      accuracyMeters: r.accuracy_meters,
      distanceMeters: r.distance_meters,
      selfieImageUrl: r.selfie_image_url,
      selfiePublicId: r.selfie_public_id,
      faceMatchConfidence: r.face_match_confidence,
      deviceBiometricPassed: r.device_biometric_passed,
      capturedAt: r.captured_at,
      verifiedAt: r.verified_at,
      verificationMethod: r.verification_method,
      overrideReason: r.override_reason,
      overrideBy: r.override_by,
    }));
  }

  async getAttendanceRecord(
    studentId: string,
    date: string,
    sessionType: SessionType | string
  ): Promise<AttendanceRecord | null> {
    const { data, error } = await this.client
      .from('attendance_records')
      .select('*')
      .eq('student_id', studentId)
      .eq('attendance_date', date)
      .eq('session_type', sessionType)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      studentId: data.student_id,
      busId: data.bus_id,
      attendanceDate: data.attendance_date,
      sessionType: data.session_type,
      attendanceMode: data.attendance_mode,
      sessionId: data.session_id,
      status: data.status,
      codeUsed: data.code_used,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracyMeters: data.accuracy_meters,
      distanceMeters: data.distance_meters,
      selfieImageUrl: data.selfie_image_url,
      selfiePublicId: data.selfie_public_id,
      faceMatchConfidence: data.face_match_confidence,
      deviceBiometricPassed: data.device_biometric_passed,
      capturedAt: data.captured_at,
      verifiedAt: data.verified_at,
      verificationMethod: data.verification_method,
    };
  }

  async createAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
    const { data, error } = await this.client
      .from('attendance_records')
      .upsert(
        {
          student_id: record.studentId,
          bus_id: record.busId,
          attendance_date: record.attendanceDate,
          session_type: record.sessionType,
          attendance_mode: record.attendanceMode || 'GROUND',
          session_id: record.sessionId || null,
          status: record.status,
          code_used: record.codeUsed,
          latitude: record.latitude,
          longitude: record.longitude,
          accuracy_meters: record.accuracyMeters,
          distance_meters: record.distanceMeters,
          selfie_image_url: record.selfieImageUrl || null,
          selfie_public_id: record.selfiePublicId || null,
          face_match_confidence: record.faceMatchConfidence || null,
          device_biometric_passed: record.deviceBiometricPassed || false,
          captured_at: record.capturedAt,
          verified_at: record.verifiedAt,
          verification_method: record.verificationMethod,
          override_reason: record.overrideReason,
          override_by: record.overrideBy,
        },
        { onConflict: 'student_id,attendance_date,session_type' }
      )
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to log attendance in PostgreSQL: ${error?.message}`);
    }

    return {
      ...record,
      id: data.id,
    };
  }

  async updateAttendance(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | null> {
    const mapped: any = {};
    if (updates.status) mapped.status = updates.status;
    if (updates.overrideReason) mapped.override_reason = updates.overrideReason;
    if (updates.overrideBy) mapped.override_by = updates.overrideBy;

    const { data, error } = await this.client
      .from('attendance_records')
      .update(mapped)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      studentId: data.student_id,
      busId: data.bus_id,
      attendanceDate: data.attendance_date,
      sessionType: data.session_type,
      status: data.status,
      capturedAt: data.captured_at,
      verifiedAt: data.verified_at,
      verificationMethod: data.verification_method,
    } as AttendanceRecord;
  }

  // ==========================================================================
  // 5. ACTIVE DYNAMIC SESSION (DYNAMIC 6-DIGIT CODE ROTATION)
  // ==========================================================================
  async getActiveSession(busId?: string): Promise<ActiveSession | null> {
    let query = this.client
      .from('active_sessions')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('started_at', { ascending: false });

    if (busId && busId !== 'ALL') {
      query = query.or(`bus_id.eq.${busId},bus_id.eq.ALL`);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;

    return {
      id: data.id,
      sessionType: data.session_type,
      attendanceMode: data.attendance_mode,
      verificationMethod: data.verification_method,
      busId: data.bus_id,
      status: data.status,
      startedBy: data.started_by,
      currentCode: data.current_code,
      codeIssuedAt: data.code_issued_at,
      codeExpiresAt: data.code_expires_at,
      radiusMeters: Number(data.radius_meters),
      maxGpsAccuracyMeters: Number(data.max_gps_accuracy_meters),
      location: data.latitude
        ? {
            type: 'FIXED',
            name: data.location_name,
            latitude: data.latitude,
            longitude: data.longitude,
            updatedAt: data.started_at,
          }
        : undefined,
      startedAt: data.started_at,
      endedAt: data.ended_at,
    };
  }

  async saveActiveSession(session: ActiveSession): Promise<ActiveSession> {
    const { data, error } = await this.client
      .from('active_sessions')
      .upsert({
        id: session.id,
        session_type: session.sessionType,
        attendance_mode: session.attendanceMode,
        verification_method: session.verificationMethod,
        bus_id: session.busId,
        status: session.status,
        started_by: session.startedBy,
        current_code: session.currentCode,
        code_issued_at: session.codeIssuedAt,
        code_expires_at: session.codeExpiresAt,
        radius_meters: session.radiusMeters,
        max_gps_accuracy_meters: session.maxGpsAccuracyMeters,
        latitude: session.location?.latitude || null,
        longitude: session.location?.longitude || null,
        location_name: session.location?.name || null,
        started_at: session.startedAt,
        ended_at: session.endedAt || null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save active session: ${error?.message}`);
    }

    return session;
  }

  async endActiveSession(sessionId?: string): Promise<boolean> {
    const now = new Date().toISOString();
    let query = this.client
      .from('active_sessions')
      .update({ status: 'CLOSED', ended_at: now })
      .eq('status', 'ACTIVE');

    if (sessionId) {
      query = query.eq('id', sessionId);
    }

    const { error } = await query;
    return !error;
  }

  async updateSessionLocation(
    sessionId: string,
    coords: { latitude: number; longitude: number; accuracyMeters?: number }
  ): Promise<ActiveSession | null> {
    const { data, error } = await this.client
      .from('active_sessions')
      .update({
        latitude: coords.latitude,
        longitude: coords.longitude,
        max_gps_accuracy_meters: coords.accuracyMeters || 80,
      })
      .eq('id', sessionId)
      .select()
      .maybeSingle();

    if (error || !data) return null;
    return this.getActiveSession();
  }

  // ==========================================================================
  // 6. GEOFENCE & CODE ROTATION SETTINGS
  // ==========================================================================
  async getSettings(): Promise<AttendanceSettings> {
    const { data } = await this.client.from('geofence_settings').select('*').eq('id', 'default').maybeSingle();
    return {
      sessionType: 'MORNING',
      startTime: '07:30',
      endTime: '09:00',
      reportTime: '09:15',
      timezone: 'Asia/Kolkata',
      location: {
        name: process.env.CAMPUS_NAME || 'VSB Engineering College Campus',
        latitude: data?.campus_latitude ?? (process.env.DEFAULT_CAMPUS_LAT ? Number(process.env.DEFAULT_CAMPUS_LAT) : 10.9572),
        longitude: data?.campus_longitude ?? (process.env.DEFAULT_CAMPUS_LNG ? Number(process.env.DEFAULT_CAMPUS_LNG) : 78.0766),
        radiusMeters: Number(data?.radius_meters ?? (process.env.DEFAULT_GEOFENCE_RADIUS_METERS ? Number(process.env.DEFAULT_GEOFENCE_RADIUS_METERS) : 150)),
        maxGpsAccuracyMeters: Number(data?.max_gps_accuracy_meters ?? (process.env.MAX_GPS_ACCURACY_METERS ? Number(process.env.MAX_GPS_ACCURACY_METERS) : 80)),
      },
    };
  }

  async updateSettings(settings: Partial<AttendanceSettings>): Promise<AttendanceSettings> {
    const mapped: any = { updated_at: new Date().toISOString() };
    if (settings.location?.latitude) mapped.campus_latitude = settings.location.latitude;
    if (settings.location?.longitude) mapped.campus_longitude = settings.location.longitude;
    if (settings.location?.radiusMeters) mapped.radius_meters = settings.location.radiusMeters;
    if (settings.location?.maxGpsAccuracyMeters) mapped.max_gps_accuracy_meters = settings.location.maxGpsAccuracyMeters;

    await this.client.from('geofence_settings').upsert({ id: 'default', ...mapped });
    return this.getSettings();
  }

  // ==========================================================================
  // 7. NOTIFICATIONS
  // ==========================================================================
  async getNotifications(filter?: { busId?: string; role?: string }): Promise<Notification[]> {
    let query = this.client.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    if (filter?.role) query = query.or(`target_role.eq.${filter.role},target_role.is.null`);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: 'SYSTEM' as const,
      date: n.created_at,
      targetRole: n.target_role,
      busId: n.target_bus_id,
      read: n.read,
      createdAt: n.created_at,
    }));
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('notifications')
      .insert({
        title: notification.title,
        message: notification.message,
        target_role: notification.targetRole || null,
        target_bus_id: notification.busId || null,
        read: notification.read ?? false,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create notification: ${error?.message}`);
    }

    return {
      id: data.id,
      title: data.title,
      message: data.message,
      type: notification.type || 'SYSTEM',
      date: now,
      targetRole: data.target_role,
      busId: data.target_bus_id,
      read: data.read,
      createdAt: data.created_at,
    };
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const { error } = await this.client.from('notifications').update({ read: true }).eq('id', id);
    return !error;
  }

  async markAllNotificationsAsRead(): Promise<boolean> {
    const { error } = await this.client.from('notifications').update({ read: true }).eq('read', false);
    return !error;
  }

  // ==========================================================================
  // 8. FINAL TRANSIT REPORTS
  // ==========================================================================
  async getReports(): Promise<FinalReport[]> {
    const { data, error } = await this.client.from('daily_reports').select('*').order('date', { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      date: r.date,
      sessionType: r.session_type,
      totalStudents: r.total_students,
      present: r.present,
      notPresent: r.not_present,
      percentage: Number(r.percentage),
      busWise: r.bus_wise || [],
      studentWise: r.student_wise || [],
      generatedAt: r.generated_at,
    }));
  }

  async getReportByDate(date: string, sessionType: SessionType | string): Promise<FinalReport | null> {
    const { data, error } = await this.client
      .from('daily_reports')
      .select('*')
      .eq('date', date)
      .eq('session_type', sessionType)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      date: data.date,
      sessionType: data.session_type,
      totalStudents: data.total_students,
      present: data.present,
      notPresent: data.not_present,
      percentage: Number(data.percentage),
      busWise: data.bus_wise || [],
      studentWise: data.student_wise || [],
      generatedAt: data.generated_at,
    };
  }

  async saveReport(report: FinalReport): Promise<FinalReport> {
    const { data, error } = await this.client
      .from('daily_reports')
      .upsert(
        {
          id: report.id,
          date: report.date,
          session_type: report.sessionType,
          total_students: report.totalStudents,
          present: report.present,
          not_present: report.notPresent,
          percentage: report.percentage,
          bus_wise: report.busWise,
          student_wise: report.studentWise,
          generated_at: report.generatedAt,
        },
        { onConflict: 'date,session_type' }
      )
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save report in PostgreSQL: ${error?.message}`);
    }

    return report;
  }

  // ==========================================================================
  // 9. POSTGRESQL BREVO OTP & PASSWORD RESET TOKEN REPOSITORIES
  // ==========================================================================
  async saveOtp(email: string, otp: string, expiresAt: Date): Promise<void> {
    await this.client.from('otp_verifications').insert({
      email: email.toLowerCase(),
      otp_code: otp,
      expires_at: expiresAt.toISOString(),
      attempts: 0,
      verified: false,
    });
  }

  async verifyOtpRecord(email: string, otp: string): Promise<{ valid: boolean; error?: string }> {
    const { data, error } = await this.client
      .from('otp_verifications')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return { valid: false, error: 'No active OTP verification code found.' };
    }

    if (new Date() > new Date(data.expires_at)) {
      return { valid: false, error: 'Verification code has expired. Please request a new code.' };
    }

    if (data.attempts >= 5) {
      return { valid: false, error: 'Too many incorrect attempts. Please request a fresh code.' };
    }

    if (data.otp_code !== otp.trim()) {
      await this.client.from('otp_verifications').update({ attempts: data.attempts + 1 }).eq('id', data.id);
      return { valid: false, error: 'Invalid verification code.' };
    }

    await this.client.from('otp_verifications').update({ verified: true }).eq('id', data.id);
    return { valid: true };
  }

  async saveResetToken(email: string, token: string, expiresAt: Date): Promise<void> {
    await this.client.from('password_resets').insert({
      email: email.toLowerCase(),
      token,
      expires_at: expiresAt.toISOString(),
      used: false,
    });
  }

  async verifyAndConsumeResetToken(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
    const { data, error } = await this.client
      .from('password_resets')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .maybeSingle();

    if (error || !data) {
      return { valid: false, error: 'Invalid or expired password reset link.' };
    }

    if (new Date() > new Date(data.expires_at)) {
      return { valid: false, error: 'Reset link has expired. Please request a fresh link.' };
    }

    await this.client.from('password_resets').update({ used: true }).eq('id', data.id);
    return { valid: true, email: data.email };
  }
}
