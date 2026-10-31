import { Pool, types } from 'pg';
import crypto from 'crypto';
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
  OtpRecord,
  PasswordResetRecord,
} from '../../types';
import { getISTDateString } from '../attendance/session';

// Configure node-pg to return DATE (OID 1082) as raw YYYY-MM-DD string without timezone shifting
types.setTypeParser(1082, (val: string) => val);

export class PostgresStorageAdapter implements StorageAdapter {
  private pool: Pool;
  private isInitialized = false;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is missing in environment variables');
    }

    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.pool.on('error', (err) => {
      console.error('⚠️ [PostgresStorageAdapter Pool Error]:', err);
    });

    console.log('⚡ [PostgresStorageAdapter] Connected to live Supabase PostgreSQL Pooler');
  }

  private async ensureSchema(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await this.pool.query(`
        ALTER TABLE public.geofence_settings 
          ADD COLUMN IF NOT EXISTS location_name TEXT NOT NULL DEFAULT 'VSB Engineering College Campus',
          ADD COLUMN IF NOT EXISTS start_time TEXT NOT NULL DEFAULT '16:50',
          ADD COLUMN IF NOT EXISTS end_time TEXT NOT NULL DEFAULT '16:55',
          ADD COLUMN IF NOT EXISTS report_time TEXT NOT NULL DEFAULT '16:57',
          ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
          ADD COLUMN IF NOT EXISTS simulation_enabled BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS simulated_time TEXT;

        CREATE TABLE IF NOT EXISTS public.checkpoints (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          radius_meters NUMERIC NOT NULL DEFAULT 15,
          description TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        );

        CREATE TABLE IF NOT EXISTS public.otp_verifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT NOT NULL,
          otp_code VARCHAR(6),
          otp_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          verified BOOLEAN NOT NULL DEFAULT false,
          signup_data JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        );

        ALTER TABLE public.otp_verifications
          ADD COLUMN IF NOT EXISTS otp_hash TEXT,
          ADD COLUMN IF NOT EXISTS signup_data JSONB;

        CREATE TABLE IF NOT EXISTS public.password_resets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT NOT NULL,
          token TEXT,
          token_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        );

        ALTER TABLE public.password_resets
          ADD COLUMN IF NOT EXISTS token_hash TEXT;
      `);

      this.isInitialized = true;
    } catch (err) {
      console.error('Error ensuring schema in PostgresStorageAdapter:', err);
    }
  }

  // ==========================================================================
  // 1. USERS & AUTHENTICATION
  // ==========================================================================
  async getUsers(): Promise<User[]> {
    const res = await this.pool.query(
      `SELECT id, email, password_hash, name, role, assigned_bus_id, student_id, status, active, created_at
       FROM public.users ORDER BY created_at ASC;`
    );
    return res.rows.map((u) => ({
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
    const res = await this.pool.query(
      `SELECT id, email, password_hash, name, role, assigned_bus_id, student_id, status, active
       FROM public.users WHERE LOWER(email) = LOWER($1) LIMIT 1;`,
      [clean]
    );
    if (res.rows.length === 0) return null;
    const u = res.rows[0];
    return {
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
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const res = await this.pool.query(
      `SELECT id, email, password_hash, name, role, assigned_bus_id, student_id, status, active
       FROM public.users WHERE id::text = $1 OR student_id = $1 LIMIT 1;`,
      [id.trim()]
    );
    if (res.rows.length === 0) return null;
    const u = res.rows[0];
    return {
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
    };
  }

  async createUser(user: User): Promise<User> {
    const res = await this.pool.query(
      `INSERT INTO public.users (email, password_hash, name, role, assigned_bus_id, student_id, status, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, name, role, assigned_bus_id, student_id, status, active;`,
      [
        user.email.toLowerCase(),
        user.password || '',
        user.name,
        user.role,
        user.assignedBusId || null,
        user.studentId || null,
        user.status || 'APPROVED',
        user.active ?? true,
      ]
    );
    const u = res.rows[0];
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      assignedBusId: u.assigned_bus_id,
      studentId: u.student_id,
      status: u.status,
      active: u.active,
    };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(updates.name);
    }
    if (updates.password !== undefined) {
      fields.push(`password_hash = $${idx++}`);
      values.push(updates.password);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
    }
    if (updates.active !== undefined) {
      fields.push(`active = $${idx++}`);
      values.push(updates.active);
    }
    if (updates.assignedBusId !== undefined) {
      fields.push(`assigned_bus_id = $${idx++}`);
      values.push(updates.assignedBusId);
    }

    if (fields.length === 0) {
      return this.getUserById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id.trim());

    const res = await this.pool.query(
      `UPDATE public.users SET ${fields.join(', ')}
       WHERE id::text = $${idx} OR student_id = $${idx}
       RETURNING id, email, name, role, assigned_bus_id, student_id, status, active;`,
      values
    );

    if (res.rows.length === 0) return null;
    const u = res.rows[0];
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      assignedBusId: u.assigned_bus_id,
      studentId: u.student_id,
      status: u.status,
      active: u.active,
    };
  }

  async hasAdmin(): Promise<boolean> {
    try {
      const res = await this.pool.query(`SELECT 1 FROM public.users WHERE role = 'ADMIN' LIMIT 1;`);
      return res.rows.length > 0;
    } catch (err: any) {
      console.warn('⚠️ [PostgresStorageAdapter] hasAdmin query failed or database not ready, defaulting to false:', err?.message || err);
      return false;
    }
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
    const routeName = data.routeName?.trim() || `${rawBusNo} Route`;

    // 1. Upsert bus in public.buses
    await this.pool.query(
      `INSERT INTO public.buses (id, bus_number, route_name, capacity, active)
       VALUES ($1, $2, $3, 60, true)
       ON CONFLICT (id) DO UPDATE SET bus_number = EXCLUDED.bus_number, route_name = EXCLUDED.route_name;`,
      [busId, rawBusNo, routeName]
    );

    // 2. Insert In-Charge user with PENDING approval and active = false
    const res = await this.pool.query(
      `INSERT INTO public.users (email, password_hash, name, phone, role, assigned_bus_id, status, active)
       VALUES ($1, $2, $3, $4, 'INCHARGE', $5, 'PENDING', false)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         phone = EXCLUDED.phone,
         password_hash = EXCLUDED.password_hash,
         role = 'INCHARGE',
         assigned_bus_id = EXCLUDED.assigned_bus_id,
         status = 'PENDING',
         active = false
       RETURNING id, email, name, phone, role, assigned_bus_id, status, active, created_at;`,
      [email, data.password || crypto.randomUUID(), data.name.trim(), data.phone?.trim() || null, busId]
    );

    const u = res.rows[0];
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      role: u.role,
      assignedBusId: u.assigned_bus_id,
      busNumber: rawBusNo,
      routeName,
      status: u.status,
      active: u.active,
      approved: false,
      createdAt: u.created_at?.toISOString?.() || u.created_at,
    };
  }

  async getPendingIncharges(): Promise<User[]> {
    const res = await this.pool.query(
      `SELECT u.id, u.email, u.name, u.phone, u.role, u.assigned_bus_id, u.status, u.active, u.created_at, b.bus_number, b.route_name
       FROM public.users u
       LEFT JOIN public.buses b ON b.id = u.assigned_bus_id
       WHERE u.role = 'INCHARGE' AND u.status = 'PENDING'
       ORDER BY u.created_at DESC;`
    );
    return res.rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      role: u.role,
      assignedBusId: u.assigned_bus_id,
      busNumber: u.bus_number || u.assigned_bus_id,
      routeName: u.route_name || '',
      status: u.status,
      active: u.active,
      approved: false,
      createdAt: u.created_at?.toISOString?.() || u.created_at,
    }));
  }

  async approveIncharge(userId: string, busNumber?: string): Promise<User | null> {
    const cleanId = userId.trim();
    const userRes = await this.pool.query(
      `SELECT * FROM public.users WHERE id::text = $1 OR email ILIKE $1 LIMIT 1;`,
      [cleanId]
    );
    if (userRes.rows.length === 0) return null;
    const user = userRes.rows[0];
    const busId = busNumber
      ? (busNumber.toUpperCase().startsWith('BUS') ? busNumber.toUpperCase() : `BUS-${busNumber.toUpperCase()}`)
      : user.assigned_bus_id;

    // Approve Incharge User
    const updatedRes = await this.pool.query(
      `UPDATE public.users
       SET status = 'APPROVED', active = true, assigned_bus_id = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, name, role, assigned_bus_id, status, active;`,
      [user.id, busId]
    );

    // Link In-charge to bus
    if (busId) {
      await this.pool.query(
        `UPDATE public.buses SET incharge_id = $1, active = true WHERE id = $2 OR bus_number ILIKE $2;`,
        [user.id, busId]
      );
    }

    const u = updatedRes.rows[0];
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      assignedBusId: u.assigned_bus_id,
      status: u.status,
      active: u.active,
      approved: true,
    };
  }

  async rejectIncharge(userId: string): Promise<boolean> {
    const cleanId = userId.trim();
    const res = await this.pool.query(
      `UPDATE public.users SET status = 'REJECTED', active = false, updated_at = NOW()
       WHERE id::text = $1 OR email ILIKE $1
       RETURNING id;`,
      [cleanId]
    );
    return res.rows.length > 0;
  }

  // ==========================================================================
  // 2. STUDENTS ROSTER & VERIFICATION
  // ==========================================================================
  private mapStudent(s: any): Student {
    return {
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
      idCardUrl: s.id_card_url,
      idCardPublicId: s.id_card_public_id,
      photoUrl: s.photo_url,
      profilePhotoUrl: s.photo_url,
      photoPublicId: s.photo_public_id,
      profilePhotoPublicId: s.photo_public_id,
      faceDescriptor: s.face_descriptor ? (typeof s.face_descriptor === 'string' ? JSON.parse(s.face_descriptor) : s.face_descriptor) : undefined,
      faceDescriptorLeft: s.face_descriptor_left ? (typeof s.face_descriptor_left === 'string' ? JSON.parse(s.face_descriptor_left) : s.face_descriptor_left) : undefined,
      faceDescriptorRight: s.face_descriptor_right ? (typeof s.face_descriptor_right === 'string' ? JSON.parse(s.face_descriptor_right) : s.face_descriptor_right) : undefined,
      faceEnrolledAt: s.face_enrolled_at,
      faceEnrollmentQuality: s.face_enrollment_quality ? Number(s.face_enrollment_quality) : undefined,
      approvedAt: s.approved_at,
      approvedBy: s.approved_by,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    };
  }

  async getStudents(filter?: {
    status?: string;
    busId?: string;
    search?: string;
    active?: boolean;
  }): Promise<Student[]> {
    let sql = `SELECT * FROM public.students WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (filter?.status) {
      sql += ` AND status = $${idx++}`;
      params.push(filter.status);
    }
    if (filter?.busId) {
      sql += ` AND (bus_id = $${idx++} OR preferred_bus_id = $${idx - 1})`;
      params.push(filter.busId);
    }
    if (filter?.active !== undefined) {
      sql += ` AND active = $${idx++}`;
      params.push(filter.active);
    }
    if (filter?.search) {
      sql += ` AND (name ILIKE $${idx} OR register_number ILIKE $${idx} OR email ILIKE $${idx})`;
      params.push(`%${filter.search}%`);
      idx++;
    }

    sql += ` ORDER BY created_at DESC;`;
    const res = await this.pool.query(sql, params);
    return res.rows.map(this.mapStudent);
  }

  async getPendingStudents(): Promise<Student[]> {
    return this.getStudents({ status: 'PENDING' });
  }

  async getStudentById(id: string): Promise<Student | null> {
    const clean = id.trim();
    const cleanNoPrefix = clean.replace(/^(usr-|stu-)/i, '');
    const res = await this.pool.query(
      `SELECT * FROM public.students 
       WHERE id = $1 
          OR register_number ILIKE $1 
          OR email ILIKE $1 
          OR register_number ILIKE $2
          OR user_id::text = $1
       LIMIT 1;`,
      [clean, cleanNoPrefix]
    );
    if (res.rows.length === 0) return null;
    return this.mapStudent(res.rows[0]);
  }

  async getStudentByRegisterNumber(regNo: string): Promise<Student | null> {
    const clean = regNo.trim().toLowerCase();
    const res = await this.pool.query(
      `SELECT * FROM public.students WHERE LOWER(register_number) = $1 LIMIT 1;`,
      [clean]
    );
    if (res.rows.length === 0) return null;
    return this.mapStudent(res.rows[0]);
  }

  private async linkUserAndStudent(userId: string, studentId: string): Promise<void> {
    try {
      if (userId && studentId) {
        await this.pool.query(
          `UPDATE public.students SET user_id = $1 WHERE id = $2 AND (user_id IS NULL OR user_id::text != $1);`,
          [userId, studentId]
        );
        await this.pool.query(
          `UPDATE public.users SET student_id = $1 WHERE id::text = $2 AND (student_id IS NULL OR student_id != $1);`,
          [studentId, userId]
        );
      }
    } catch (err: any) {
      console.warn('⚠️ [PostgresStorageAdapter] linkUserAndStudent notice:', err?.message || err);
    }
  }

  async getStudentForUser(user: { id: string; email: string; name?: string; studentId?: string }): Promise<Student | null> {
    // 1. Try by studentId if present
    if (user.studentId) {
      const byId = await this.getStudentById(user.studentId);
      if (byId) return byId;
    }
    // 2. Try by user.id (which matches user_id column)
    if (user.id) {
      const byUserId = await this.getStudentById(user.id);
      if (byUserId) return byUserId;
    }
    // 3. Try by exact / normalized email
    if (user.email) {
      const cleanEmail = user.email.trim().toLowerCase();
      const res = await this.pool.query(
        `SELECT * FROM public.students 
         WHERE LOWER(TRIM(email)) = $1 
            OR email ILIKE $2
         ORDER BY created_at DESC LIMIT 1;`,
        [cleanEmail, `%${cleanEmail}%`]
      );
      if (res.rows.length > 0) {
        const student = this.mapStudent(res.rows[0]);
        if (user.id) {
          await this.linkUserAndStudent(user.id, student.id);
        }
        return student;
      }
    }
    // 4. Try by name match (exact case-insensitive)
    if (user.name) {
      const cleanName = user.name.trim().toLowerCase();
      const res = await this.pool.query(
        `SELECT * FROM public.students 
         WHERE LOWER(TRIM(name)) = $1 
         ORDER BY created_at DESC LIMIT 1;`,
        [cleanName]
      );
      if (res.rows.length > 0) {
        const student = this.mapStudent(res.rows[0]);
        if (user.id) {
          await this.linkUserAndStudent(user.id, student.id);
        }
        return student;
      }
    }
    return null;
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
    const regNo = data.registerNumber.trim().toLowerCase();
    const existing = await this.getStudentByRegisterNumber(regNo);
    if (existing) {
      throw new Error(`Student with register number ${regNo.toUpperCase()} already exists.`);
    }

    const email = data.email ? data.email.trim().toLowerCase() : `${regNo}@college.edu`;
    const studentId = `STU-${regNo.toUpperCase()}`;
    const password = data.password || crypto.randomUUID();

    // 1. Insert user
    await this.pool.query(
      `INSERT INTO public.users (email, password_hash, name, role, student_id, status, active)
       VALUES ($1, $2, $3, 'STUDENT', $4, 'PENDING', true)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;`,
      [email, password, data.name.trim(), studentId]
    );

    // 2. Insert student
    const res = await this.pool.query(
      `INSERT INTO public.students (
         id, register_number, name, email, phone, preferred_bus_id, bus_id, status, approved, active
       )
       VALUES ($1, $2, $3, $4, $5, $6, NULL, 'PENDING', false, true)
       RETURNING *;`,
      [studentId, regNo, data.name.trim(), email, data.phone || null, data.preferredBusId || null]
    );

    return this.mapStudent(res.rows[0]);
  }

  async createStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }): Promise<Student> {
    const regNo = student.registerNumber.trim().toLowerCase();
    const studentId = `STU-${regNo.toUpperCase()}`;
    const email = student.email ? student.email.trim().toLowerCase() : `${regNo}@college.edu`;

    await this.pool.query(
      `INSERT INTO public.users (email, password_hash, name, role, student_id, status, active)
       VALUES ($1, $2, $3, 'STUDENT', $4, $5, true)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;`,
      [email, student.password || crypto.randomUUID(), student.name, studentId, student.status || 'APPROVED']
    );

    const res = await this.pool.query(
      `INSERT INTO public.students (
         id, register_number, name, email, phone, bus_id, preferred_bus_id, status, approved, active,
         photo_url, photo_public_id, face_descriptor, face_descriptor_left, face_descriptor_right
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         bus_id = EXCLUDED.bus_id,
         photo_url = EXCLUDED.photo_url,
         face_descriptor = EXCLUDED.face_descriptor
       RETURNING *;`,
      [
        studentId,
        regNo,
        student.name,
        email,
        student.phone || null,
        student.busId || null,
        student.preferredBusId || null,
        student.status || 'APPROVED',
        student.approved ?? true,
        student.active ?? true,
        student.photoUrl || null,
        student.photoPublicId || null,
        student.faceDescriptor ? JSON.stringify(student.faceDescriptor) : null,
        student.faceDescriptorLeft ? JSON.stringify(student.faceDescriptorLeft) : null,
        student.faceDescriptorRight ? JSON.stringify(student.faceDescriptorRight) : null,
      ]
    );

    return this.mapStudent(res.rows[0]);
  }

  async approveStudent(studentId: string, busId: string, approvedBy: string): Promise<Student | null> {
    const res = await this.pool.query(
      `UPDATE public.students
       SET status = 'APPROVED', approved = true, bus_id = $2, approved_by = $3, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1 OR register_number ILIKE $1
       RETURNING *;`,
      [studentId.trim(), busId, approvedBy]
    );
    if (res.rows.length === 0) return null;
    const s = res.rows[0];
    await this.pool.query(
      `UPDATE public.users
       SET status = 'APPROVED', active = true, assigned_bus_id = $2, updated_at = NOW()
       WHERE student_id = $1 OR email = $3;`,
      [s.id, busId, s.email]
    );
    return this.mapStudent(s);
  }

  async rejectStudent(studentId: string, reason?: string): Promise<Student | null> {
    const res = await this.pool.query(
      `UPDATE public.students
       SET status = 'REJECTED', approved = false, rejection_reason = $2, updated_at = NOW()
       WHERE id = $1 OR register_number ILIKE $1
       RETURNING *;`,
      [studentId.trim(), reason || 'Registration rejected']
    );
    if (res.rows.length === 0) return null;
    const s = res.rows[0];
    await this.pool.query(
      `UPDATE public.users
       SET status = 'REJECTED', updated_at = NOW()
       WHERE student_id = $1 OR email = $2;`,
      [s.id, s.email]
    );
    return this.mapStudent(s);
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(updates.email.toLowerCase());
    }
    if (updates.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(updates.phone);
    }
    if (updates.busId !== undefined) {
      fields.push(`bus_id = $${idx++}`);
      values.push(updates.busId);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
    }
    if (updates.approved !== undefined) {
      fields.push(`approved = $${idx++}`);
      values.push(updates.approved);
    }
    if (updates.active !== undefined) {
      fields.push(`active = $${idx++}`);
      values.push(updates.active);
    }
    if (updates.photoUrl !== undefined) {
      fields.push(`photo_url = $${idx++}`);
      values.push(updates.photoUrl);
    }
    if (updates.photoPublicId !== undefined) {
      fields.push(`photo_public_id = $${idx++}`);
      values.push(updates.photoPublicId);
    }
    if (updates.faceDescriptor !== undefined) {
      fields.push(`face_descriptor = $${idx++}`);
      values.push(updates.faceDescriptor ? JSON.stringify(updates.faceDescriptor) : null);
    }
    if (updates.faceDescriptorLeft !== undefined) {
      fields.push(`face_descriptor_left = $${idx++}`);
      values.push(updates.faceDescriptorLeft ? JSON.stringify(updates.faceDescriptorLeft) : null);
    }
    if (updates.faceDescriptorRight !== undefined) {
      fields.push(`face_descriptor_right = $${idx++}`);
      values.push(updates.faceDescriptorRight ? JSON.stringify(updates.faceDescriptorRight) : null);
    }
    if (updates.faceEnrolledAt !== undefined) {
      fields.push(`face_enrolled_at = $${idx++}`);
      values.push(updates.faceEnrolledAt);
    }
    if (updates.faceEnrollmentQuality !== undefined) {
      fields.push(`face_enrollment_quality = $${idx++}`);
      values.push(updates.faceEnrollmentQuality);
    }

    if (fields.length === 0) {
      return this.getStudentById(id);
    }

    fields.push(`updated_at = NOW()`);
    const clean = id.trim();
    const cleanNoPrefix = clean.replace(/^(usr-|stu-)/i, '');
    values.push(clean, cleanNoPrefix);

    const res = await this.pool.query(
      `UPDATE public.students SET ${fields.join(', ')}
       WHERE id = $${idx} OR register_number ILIKE $${idx} OR email ILIKE $${idx} OR register_number ILIKE $${idx + 1}
       RETURNING *;`,
      values
    );

    if (res.rows.length === 0) return null;
    const s = res.rows[0];

    const userFields: string[] = [];
    const userVals: any[] = [];
    let uIdx = 1;
    if (updates.name !== undefined) {
      userFields.push(`name = $${uIdx++}`);
      userVals.push(updates.name);
    }
    if (updates.status !== undefined) {
      userFields.push(`status = $${uIdx++}`);
      userVals.push(updates.status);
    }
    if (updates.busId !== undefined) {
      userFields.push(`assigned_bus_id = $${uIdx++}`);
      userVals.push(updates.busId);
    }
    if (updates.active !== undefined) {
      userFields.push(`active = $${uIdx++}`);
      userVals.push(updates.active);
    }
    if (userFields.length > 0) {
      userFields.push(`updated_at = NOW()`);
      userVals.push(s.id, s.email);
      await this.pool.query(
        `UPDATE public.users SET ${userFields.join(', ')} WHERE student_id = $${uIdx} OR email = $${uIdx + 1};`,
        userVals
      ).catch((err) => console.warn('[PostgresStorageAdapter] user sync warning:', err.message));
    }

    return this.mapStudent(s);
  }

  async deleteStudent(id: string): Promise<boolean> {
    await this.pool.query(`DELETE FROM public.students WHERE id = $1;`, [id]);
    await this.pool.query(`DELETE FROM public.users WHERE student_id = $1 OR id::text = $1;`, [id]);
    return true;
  }

  // ==========================================================================
  // 3. BUS FLEET & ROUTES
  // ==========================================================================
  async getBuses(): Promise<Bus[]> {
    const res = await this.pool.query(`SELECT * FROM public.buses ORDER BY id ASC;`);
    return res.rows.map((b) => ({
      id: b.id,
      busNumber: b.bus_number,
      routeName: b.route_name,
      inchargeId: b.incharge_id || '',
      capacity: b.capacity,
      active: b.active,
    }));
  }

  async getBusById(id: string): Promise<Bus | null> {
    const res = await this.pool.query(`SELECT * FROM public.buses WHERE id = $1 LIMIT 1;`, [id]);
    if (res.rows.length === 0) return null;
    const b = res.rows[0];
    return {
      id: b.id,
      busNumber: b.bus_number,
      routeName: b.route_name,
      inchargeId: b.incharge_id || '',
      capacity: b.capacity,
      active: b.active,
    };
  }

  async getBusByInchargeId(inchargeId: string): Promise<Bus | null> {
    // 1. Direct match on buses.incharge_id
    let res = await this.pool.query(`SELECT * FROM public.buses WHERE incharge_id = $1 LIMIT 1;`, [inchargeId]);

    // 2. Relational match via public.users where assigned_bus_id is set
    if (res.rows.length === 0) {
      res = await this.pool.query(
        `SELECT b.* FROM public.buses b
         JOIN public.users u ON u.assigned_bus_id = b.id
         WHERE u.id::text = $1 OR u.email = $1 OR b.incharge_id = u.email OR b.incharge_id = u.id::text
         LIMIT 1;`,
        [inchargeId]
      );
    }

    // 3. Fallback: match by bus ID directly if inchargeId is a bus ID
    if (res.rows.length === 0) {
      res = await this.pool.query(`SELECT * FROM public.buses WHERE id = $1 LIMIT 1;`, [inchargeId]);
    }

    if (res.rows.length === 0) return null;
    const b = res.rows[0];
    return {
      id: b.id,
      busNumber: b.bus_number,
      routeName: b.route_name,
      inchargeId: b.incharge_id || '',
      capacity: b.capacity,
      active: b.active,
    };
  }

  async createBus(bus: Omit<Bus, 'id'> & { id?: string }): Promise<Bus> {
    const cleanBusNo = bus.busNumber.trim().toUpperCase();
    const id = bus.id || (cleanBusNo.startsWith('BUS') ? cleanBusNo : `BUS-${cleanBusNo}`);
    const res = await this.pool.query(
      `INSERT INTO public.buses (id, bus_number, route_name, incharge_id, capacity, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         bus_number = EXCLUDED.bus_number,
         route_name = EXCLUDED.route_name,
         incharge_id = COALESCE(EXCLUDED.incharge_id, public.buses.incharge_id),
         capacity = EXCLUDED.capacity,
         active = EXCLUDED.active,
         updated_at = NOW()
       RETURNING *;`,
      [id, cleanBusNo, bus.routeName.trim(), bus.inchargeId || null, bus.capacity || 60, bus.active ?? true]
    );
    const b = res.rows[0];

    if (bus.inchargeId) {
      await this.pool.query(
        `UPDATE public.users SET assigned_bus_id = $1 WHERE id::text = $2;`,
        [id, bus.inchargeId]
      );
    }

    return {
      id: b.id,
      busNumber: b.bus_number,
      routeName: b.route_name,
      inchargeId: b.incharge_id || '',
      capacity: b.capacity,
      active: b.active,
    };
  }

  async updateBus(id: string, updates: Partial<Bus>): Promise<Bus | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.busNumber !== undefined) {
      fields.push(`bus_number = $${idx++}`);
      values.push(updates.busNumber);
    }
    if (updates.routeName !== undefined) {
      fields.push(`route_name = $${idx++}`);
      values.push(updates.routeName);
    }
    if (updates.inchargeId !== undefined) {
      fields.push(`incharge_id = $${idx++}`);
      values.push(updates.inchargeId);
    }
    if (updates.active !== undefined) {
      fields.push(`active = $${idx++}`);
      values.push(updates.active);
    }

    if (fields.length === 0) return this.getBusById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const res = await this.pool.query(
      `UPDATE public.buses SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *;`,
      values
    );
    if (res.rows.length === 0) return null;
    const b = res.rows[0];
    return {
      id: b.id,
      busNumber: b.bus_number,
      routeName: b.route_name,
      inchargeId: b.incharge_id || '',
      capacity: b.capacity,
      active: b.active,
    };
  }

  async deleteBus(id: string): Promise<boolean> {
    await this.pool.query(`DELETE FROM public.buses WHERE id = $1;`, [id]);
    return true;
  }

  // ==========================================================================
  // 4. ATTENDANCE LOGGING & PROOFS
  // ==========================================================================
  private mapAttendance(r: any): AttendanceRecord {
    let attendanceDate: string;
    if (r.attendance_date instanceof Date) {
      attendanceDate = getISTDateString(r.attendance_date);
    } else if (typeof r.attendance_date === 'string') {
      attendanceDate = r.attendance_date.split('T')[0].trim();
    } else {
      attendanceDate = r.attendance_date ? String(r.attendance_date) : '';
    }

    let verifiedAt: string;
    if (r.verified_at instanceof Date) {
      verifiedAt = r.verified_at.toISOString();
    } else if (r.verified_at) {
      verifiedAt = String(r.verified_at);
    } else {
      verifiedAt = '';
    }

    let capturedAt: string = verifiedAt;
    if (r.captured_at instanceof Date) {
      capturedAt = r.captured_at.toISOString();
    } else if (r.captured_at) {
      capturedAt = String(r.captured_at);
    }

    return {
      id: r.id,
      sessionId: r.session_id,
      studentId: r.student_id,
      busId: r.bus_id,
      attendanceDate,
      sessionType: r.session_type,
      attendanceMode: r.attendance_mode || 'GROUND',
      status: r.status,
      latitude: r.latitude != null ? Number(r.latitude) : null,
      longitude: r.longitude != null ? Number(r.longitude) : null,
      accuracyMeters: r.accuracy_meters != null ? Number(r.accuracy_meters) : null,
      distanceMeters: r.distance_meters != null ? Number(r.distance_meters) : null,
      selfieImageUrl: r.selfie_image_url,
      selfiePublicId: r.selfie_public_id,
      faceMatchConfidence: r.face_match_confidence ? Number(r.face_match_confidence) : undefined,
      deviceBiometricPassed: r.device_biometric_passed,
      capturedAt,
      verifiedAt,
      verificationMethod: r.verification_method,
      overrideReason: r.override_reason,
      overrideBy: r.override_by,
    };
  }

  async getAttendance(filter?: {
    date?: string;
    busId?: string;
    studentId?: string;
    sessionType?: SessionType | string;
  }): Promise<AttendanceRecord[]> {
    let sql = `SELECT * FROM public.attendance_records WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (filter?.date) {
      sql += ` AND attendance_date = $${idx++}`;
      params.push(filter.date);
    }
    if (filter?.busId && filter.busId !== 'ALL') {
      sql += ` AND bus_id = $${idx++}`;
      params.push(filter.busId);
    }
    if (filter?.studentId) {
      sql += ` AND student_id = $${idx++}`;
      params.push(filter.studentId);
    }
    if (filter?.sessionType) {
      sql += ` AND session_type = $${idx++}`;
      params.push(filter.sessionType);
    }

    sql += ` ORDER BY verified_at DESC;`;
    const res = await this.pool.query(sql, params);
    return res.rows.map(this.mapAttendance);
  }

  async getAttendanceRecord(
    studentId: string,
    date: string,
    sessionType: SessionType | string
  ): Promise<AttendanceRecord | null> {
    const res = await this.pool.query(
      `SELECT * FROM public.attendance_records
       WHERE student_id = $1 AND attendance_date = $2 AND session_type = $3
       LIMIT 1;`,
      [studentId, date, sessionType]
    );
    if (res.rows.length === 0) return null;
    return this.mapAttendance(res.rows[0]);
  }

  async createAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
    const res = await this.pool.query(
      `INSERT INTO public.attendance_records (
         session_id, student_id, bus_id, attendance_date, session_type, attendance_mode,
         status, code_used, latitude, longitude, accuracy_meters, distance_meters,
         selfie_image_url, selfie_public_id, face_match_confidence, device_biometric_passed,
         verification_method, override_reason, override_by, verified_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
       ON CONFLICT (student_id, attendance_date, session_type) DO UPDATE SET
         session_id = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.session_id ELSE EXCLUDED.session_id END,
         bus_id = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.bus_id ELSE EXCLUDED.bus_id END,
         status = CASE WHEN public.attendance_records.status = 'PRESENT' THEN 'PRESENT' ELSE EXCLUDED.status END,
         code_used = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.code_used ELSE EXCLUDED.code_used END,
         latitude = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.latitude ELSE EXCLUDED.latitude END,
         longitude = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.longitude ELSE EXCLUDED.longitude END,
         accuracy_meters = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.accuracy_meters ELSE EXCLUDED.accuracy_meters END,
         distance_meters = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.distance_meters ELSE EXCLUDED.distance_meters END,
         selfie_image_url = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.selfie_image_url ELSE EXCLUDED.selfie_image_url END,
         selfie_public_id = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.selfie_public_id ELSE EXCLUDED.selfie_public_id END,
         face_match_confidence = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.face_match_confidence ELSE EXCLUDED.face_match_confidence END,
         device_biometric_passed = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.device_biometric_passed ELSE EXCLUDED.device_biometric_passed END,
         verification_method = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.verification_method ELSE EXCLUDED.verification_method END,
         override_reason = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.override_reason ELSE EXCLUDED.override_reason END,
         override_by = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.override_by ELSE EXCLUDED.override_by END,
         verified_at = CASE WHEN public.attendance_records.status = 'PRESENT' THEN public.attendance_records.verified_at ELSE NOW() END
       RETURNING *;`,
      [
        record.sessionId || null,
        record.studentId,
        record.busId,
        record.attendanceDate,
        record.sessionType,
        record.attendanceMode || 'GROUND',
        record.status,
        record.codeUsed || null,
        record.latitude || null,
        record.longitude || null,
        record.accuracyMeters || null,
        record.distanceMeters || null,
        record.selfieImageUrl || null,
        record.selfiePublicId || null,
        record.faceMatchConfidence || null,
        record.deviceBiometricPassed || false,
        record.verificationMethod || 'FACE_GPS',
        record.overrideReason || null,
        record.overrideBy || null,
      ]
    );

    return this.mapAttendance(res.rows[0]);
  }

  async updateAttendance(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
    }
    if (updates.overrideReason !== undefined) {
      fields.push(`override_reason = $${idx++}`);
      values.push(updates.overrideReason);
    }
    if (updates.overrideBy !== undefined) {
      fields.push(`override_by = $${idx++}`);
      values.push(updates.overrideBy);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const res = await this.pool.query(
      `UPDATE public.attendance_records SET ${fields.join(', ')} WHERE id::text = $${idx} RETURNING *;`,
      values
    );
    if (res.rows.length === 0) return null;
    return this.mapAttendance(res.rows[0]);
  }

  // ==========================================================================
  // 5. ACTIVE DYNAMIC SESSION (DYNAMIC 6-DIGIT CODE ROTATION)
  // ==========================================================================
  async getActiveSession(busId?: string): Promise<ActiveSession | null> {
    let sql = `SELECT * FROM public.active_sessions WHERE status = 'ACTIVE'`;
    const params: any[] = [];

    if (busId && busId !== 'ALL') {
      const cleanBus = busId.trim().toUpperCase();
      const withPrefix = cleanBus.startsWith('BUS-') ? cleanBus : `BUS-${cleanBus}`;
      const withoutPrefix = cleanBus.replace(/^BUS-/i, '');

      sql += ` AND (
        bus_id = $1 
        OR bus_id = $2 
        OR bus_id = $3 
        OR bus_id = 'ALL' 
        OR REPLACE(UPPER(bus_id), 'BUS-', '') = $3
      )`;
      params.push(cleanBus, withPrefix, withoutPrefix);
    }

    sql += ` ORDER BY started_at DESC LIMIT 1;`;
    const res = await this.pool.query(sql, params);
    if (res.rows.length === 0) return null;
    const data = res.rows[0];

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

  async getSessionById(sessionId: string): Promise<ActiveSession | null> {
    const res = await this.pool.query(
      `SELECT * FROM public.active_sessions WHERE id::text = $1 LIMIT 1;`,
      [sessionId]
    );
    if (res.rows.length === 0) return null;
    const data = res.rows[0];

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
    const res = await this.pool.query(
      `INSERT INTO public.active_sessions (
         id, session_type, attendance_mode, verification_method, bus_id, status,
         started_by, current_code, code_issued_at, code_expires_at,
         radius_meters, max_gps_accuracy_meters, latitude, longitude, location_name,
         started_at, ended_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (id) DO UPDATE SET
         current_code = EXCLUDED.current_code,
         code_issued_at = EXCLUDED.code_issued_at,
         code_expires_at = EXCLUDED.code_expires_at,
         status = EXCLUDED.status,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         location_name = EXCLUDED.location_name,
         ended_at = EXCLUDED.ended_at
       RETURNING *;`,
      [
        session.id,
        session.sessionType,
        session.attendanceMode,
        session.verificationMethod,
        session.busId,
        session.status,
        session.startedBy,
        session.currentCode,
        session.codeIssuedAt,
        session.codeExpiresAt,
        session.radiusMeters,
        session.maxGpsAccuracyMeters,
        session.location?.latitude || null,
        session.location?.longitude || null,
        session.location?.name || null,
        session.startedAt,
        session.endedAt || null,
      ]
    );

    const data = res.rows[0];
    return {
      ...session,
      id: data.id,
    };
  }

  async endActiveSession(sessionId?: string): Promise<boolean> {
    if (sessionId) {
      await this.pool.query(
        `UPDATE public.active_sessions SET status = 'CLOSED', ended_at = NOW() WHERE id::text = $1;`,
        [sessionId]
      );
    } else {
      await this.pool.query(
        `UPDATE public.active_sessions SET status = 'CLOSED', ended_at = NOW() WHERE status = 'ACTIVE';`
      );
    }
    return true;
  }

  async updateSessionLocation(
    sessionId: string,
    coords: { latitude: number; longitude: number; accuracyMeters?: number }
  ): Promise<ActiveSession | null> {
    const res = await this.pool.query(
      `UPDATE public.active_sessions
       SET latitude = $1, longitude = $2, max_gps_accuracy_meters = COALESCE($3, max_gps_accuracy_meters)
       WHERE id::text = $4
       RETURNING *;`,
      [coords.latitude, coords.longitude, coords.accuracyMeters || null, sessionId]
    );
    if (res.rows.length === 0) return null;
    return this.getActiveSession();
  }

  // ==========================================================================
  // 6. GEOFENCE SETTINGS & CAMPUS CHECKPOINTS
  // ==========================================================================
  async getSettings(): Promise<AttendanceSettings> {
    await this.ensureSchema();
    const res = await this.pool.query(`SELECT * FROM public.geofence_settings WHERE id = 'default' LIMIT 1;`);
    if (res.rows.length === 0) {
      await this.pool.query(`
        INSERT INTO public.geofence_settings 
          (id, location_name, campus_latitude, campus_longitude, radius_meters, max_gps_accuracy_meters, start_time, end_time, report_time, timezone, simulation_enabled, simulated_time)
        VALUES 
          ('default', 'VSB Engineering College Campus', 10.9572, 78.0766, 150, 80, '16:50', '16:55', '16:57', 'Asia/Kolkata', false, null)
        ON CONFLICT (id) DO NOTHING;
      `);
      return {
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
    }

    const s = res.rows[0];
    return {
      sessionType: 'EVENING',
      startTime: s.start_time || '16:50',
      endTime: s.end_time || '16:55',
      reportTime: s.report_time || '16:57',
      timezone: s.timezone || 'Asia/Kolkata',
      location: {
        name: s.location_name || 'VSB Engineering College Campus',
        latitude: Number(s.campus_latitude),
        longitude: Number(s.campus_longitude),
        radiusMeters: Number(s.radius_meters),
        maxGpsAccuracyMeters: Number(s.max_gps_accuracy_meters),
      },
      simulation: {
        enabled: Boolean(s.simulation_enabled),
        simulatedTime: s.simulated_time || null,
      },
    };
  }

  async updateSettings(settings: Partial<AttendanceSettings>): Promise<AttendanceSettings> {
    await this.ensureSchema();
    const current = await this.getSettings();

    const name = settings.location?.name ?? current.location.name;
    const lat = settings.location?.latitude ?? current.location.latitude;
    const lng = settings.location?.longitude ?? current.location.longitude;
    const rad = settings.location?.radiusMeters ?? current.location.radiusMeters;
    const acc = settings.location?.maxGpsAccuracyMeters ?? current.location.maxGpsAccuracyMeters;
    const startTime = settings.startTime ?? current.startTime;
    const endTime = settings.endTime ?? current.endTime;
    const reportTime = settings.reportTime ?? current.reportTime;
    const timezone = settings.timezone ?? current.timezone;
    const simEnabled = settings.simulation?.enabled ?? current.simulation?.enabled ?? false;
    const simTime = settings.simulation?.simulatedTime !== undefined ? settings.simulation.simulatedTime : (current.simulation?.simulatedTime ?? null);

    await this.pool.query(
      `INSERT INTO public.geofence_settings 
        (id, location_name, campus_latitude, campus_longitude, radius_meters, max_gps_accuracy_meters, start_time, end_time, report_time, timezone, simulation_enabled, simulated_time, enforce_gps, updated_at)
       VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())
       ON CONFLICT (id) DO UPDATE SET
         location_name = EXCLUDED.location_name,
         campus_latitude = EXCLUDED.campus_latitude,
         campus_longitude = EXCLUDED.campus_longitude,
         radius_meters = EXCLUDED.radius_meters,
         max_gps_accuracy_meters = EXCLUDED.max_gps_accuracy_meters,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         report_time = EXCLUDED.report_time,
         timezone = EXCLUDED.timezone,
         simulation_enabled = EXCLUDED.simulation_enabled,
         simulated_time = EXCLUDED.simulated_time,
         updated_at = NOW();`,
      [name, lat, lng, rad, acc, startTime, endTime, reportTime, timezone, simEnabled, simTime]
    );

    return this.getSettings();
  }

  async getCheckpoints(): Promise<CampusCheckpoint[]> {
    await this.ensureSchema();
    const res = await this.pool.query(`SELECT * FROM public.checkpoints ORDER BY created_at ASC;`);
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      radiusMeters: Number(r.radius_meters),
      description: r.description || undefined,
      createdAt: r.created_at,
    }));
  }

  async createCheckpoint(cp: Omit<CampusCheckpoint, 'id' | 'createdAt'>): Promise<CampusCheckpoint> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `INSERT INTO public.checkpoints (name, latitude, longitude, radius_meters, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [cp.name.trim(), cp.latitude, cp.longitude, cp.radiusMeters, cp.description?.trim() || null]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      radiusMeters: Number(r.radius_meters),
      description: r.description || undefined,
      createdAt: r.created_at,
    };
  }

  async deleteCheckpoint(id: string): Promise<boolean> {
    await this.ensureSchema();
    const res = await this.pool.query(`DELETE FROM public.checkpoints WHERE id = $1;`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // ==========================================================================
  // 7. NOTIFICATIONS
  // ==========================================================================
  async getNotifications(filter?: { busId?: string; role?: string }): Promise<Notification[]> {
    let sql = `SELECT * FROM public.notifications WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (filter?.role) {
      sql += ` AND (target_role = $${idx++} OR target_role IS NULL)`;
      params.push(filter.role);
    }
    if (filter?.busId) {
      sql += ` AND (target_bus_id = $${idx++} OR target_bus_id IS NULL)`;
      params.push(filter.busId);
    }

    sql += ` ORDER BY created_at DESC LIMIT 50;`;
    const res = await this.pool.query(sql, params);
    return res.rows.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: 'SYSTEM' as const,
      date: n.created_at,
      createdAt: n.created_at,
      read: n.read,
      busId: n.target_bus_id || undefined,
      targetRole: n.target_role || undefined,
    }));
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const res = await this.pool.query(
      `INSERT INTO public.notifications (target_role, target_bus_id, title, message, read, created_at)
       VALUES ($1, $2, $3, $4, false, NOW())
       RETURNING *;`,
      [notification.targetRole || null, notification.busId || null, notification.title, notification.message]
    );
    const n = res.rows[0];
    return {
      id: n.id,
      title: n.title,
      message: n.message,
      type: notification.type || 'SYSTEM',
      date: n.created_at,
      createdAt: n.created_at,
      read: n.read,
      busId: n.target_bus_id || undefined,
      targetRole: n.target_role || undefined,
    };
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    await this.pool.query(`UPDATE public.notifications SET read = true WHERE id::text = $1;`, [id]);
    return true;
  }

  async markAllNotificationsAsRead(): Promise<boolean> {
    await this.pool.query(`UPDATE public.notifications SET read = true;`);
    return true;
  }

  async clearAllNotifications(): Promise<boolean> {
    await this.pool.query(`DELETE FROM public.notifications;`);
    return true;
  }

  async deleteNotification(id: string): Promise<boolean> {
    await this.pool.query(`DELETE FROM public.notifications WHERE id::text = $1;`, [id]);
    return true;
  }

  // ==========================================================================
  // 8. FINAL REPORTS
  // ==========================================================================
  async getReports(): Promise<FinalReport[]> {
    const res = await this.pool.query(`SELECT * FROM public.daily_reports ORDER BY date DESC, generated_at DESC;`);
    return res.rows.map((r) => ({
      id: r.id || `${r.date}_${r.session_type}`,
      date: r.date,
      sessionType: r.session_type,
      totalStudents: r.total_students,
      present: r.present,
      notPresent: r.not_present,
      percentage: Number(r.percentage),
      busWise: typeof r.bus_wise === 'string' ? JSON.parse(r.bus_wise) : r.bus_wise,
      studentWise: typeof r.student_wise === 'string' ? JSON.parse(r.student_wise) : r.student_wise,
      generatedAt: r.generated_at,
    }));
  }

  async getReportByDate(date: string, sessionType: SessionType | string): Promise<FinalReport | null> {
    const res = await this.pool.query(
      `SELECT * FROM public.daily_reports WHERE date = $1 AND session_type = $2 LIMIT 1;`,
      [date, sessionType]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id || `${r.date}_${r.session_type}`,
      date: r.date,
      sessionType: r.session_type,
      totalStudents: r.total_students,
      present: r.present,
      notPresent: r.not_present,
      percentage: Number(r.percentage),
      busWise: typeof r.bus_wise === 'string' ? JSON.parse(r.bus_wise) : r.bus_wise,
      studentWise: typeof r.student_wise === 'string' ? JSON.parse(r.student_wise) : r.student_wise,
      generatedAt: r.generated_at,
    };
  }

  async saveReport(report: FinalReport): Promise<FinalReport> {
    const id = `${report.date}_${report.sessionType}`;
    await this.pool.query(
      `INSERT INTO public.daily_reports (
         id, date, session_type, total_students, present, not_present, percentage, bus_wise, student_wise, generated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (id) DO UPDATE SET
         total_students = EXCLUDED.total_students,
         present = EXCLUDED.present,
         not_present = EXCLUDED.not_present,
         percentage = EXCLUDED.percentage,
         bus_wise = EXCLUDED.bus_wise,
         student_wise = EXCLUDED.student_wise,
         generated_at = NOW();`,
      [
        id,
        report.date,
        report.sessionType,
        report.totalStudents,
        report.present,
        report.notPresent,
        report.percentage,
        JSON.stringify(report.busWise || []),
        JSON.stringify(report.studentWise || []),
      ]
    );
    return report;
  }

  // ==========================================================================
  // PERSISTENT OTP & PASSWORD RESET METHODS (SUPABASE POSTGRESQL)
  // ==========================================================================
  async saveOtp(record: OtpRecord): Promise<void> {
    await this.ensureSchema();
    await this.pool.query(
      `INSERT INTO public.otp_verifications (id, email, otp_hash, expires_at, attempts, verified, signup_data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO UPDATE SET
         otp_hash = EXCLUDED.otp_hash,
         expires_at = EXCLUDED.expires_at,
         attempts = EXCLUDED.attempts,
         verified = EXCLUDED.verified,
         signup_data = EXCLUDED.signup_data;`,
      [
        record.id || crypto.randomUUID(),
        record.email.trim().toLowerCase(),
        record.otpHash,
        record.expiresAt,
        record.attempts || 0,
        record.verified || false,
        record.signupData ? JSON.stringify(record.signupData) : null,
      ]
    );
  }

  async getOtp(email: string): Promise<OtpRecord | null> {
    await this.ensureSchema();
    const clean = email.trim().toLowerCase();
    const res = await this.pool.query(
      `SELECT * FROM public.otp_verifications
       WHERE LOWER(email) = LOWER($1) AND verified = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1;`,
      [clean]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      email: r.email,
      otpHash: r.otp_hash || r.otp_code,
      expiresAt: r.expires_at,
      attempts: r.attempts || 0,
      verified: r.verified || false,
      signupData: typeof r.signup_data === 'string' ? JSON.parse(r.signup_data) : r.signup_data,
      createdAt: r.created_at,
    };
  }

  async incrementOtpAttempts(idOrEmail: string): Promise<number> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `UPDATE public.otp_verifications
       SET attempts = attempts + 1
       WHERE id = $1 OR LOWER(email) = LOWER($1)
       RETURNING attempts;`,
      [idOrEmail]
    );
    return res.rows[0]?.attempts || 0;
  }

  async markOtpVerified(idOrEmail: string): Promise<void> {
    await this.ensureSchema();
    await this.pool.query(
      `UPDATE public.otp_verifications
       SET verified = true
       WHERE id = $1 OR LOWER(email) = LOWER($1);`,
      [idOrEmail]
    );
  }

  async deleteExpiredOtps(): Promise<number> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `DELETE FROM public.otp_verifications
       WHERE expires_at < NOW() - INTERVAL '1 day';`
    );
    return res.rowCount || 0;
  }

  async savePasswordReset(record: PasswordResetRecord): Promise<void> {
    await this.ensureSchema();
    await this.pool.query(
      `INSERT INTO public.password_resets (id, email, token_hash, expires_at, used, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET
         token_hash = EXCLUDED.token_hash,
         expires_at = EXCLUDED.expires_at,
         used = EXCLUDED.used;`,
      [
        record.id || crypto.randomUUID(),
        record.email.trim().toLowerCase(),
        record.tokenHash,
        record.expiresAt,
        record.used || false,
      ]
    );
  }

  async getPasswordReset(tokenHash: string): Promise<PasswordResetRecord | null> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT * FROM public.password_resets
       WHERE (token_hash = $1 OR token = $1) AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1;`,
      [tokenHash]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      email: r.email,
      tokenHash: r.token_hash || r.token,
      expiresAt: r.expires_at,
      used: r.used || false,
      createdAt: r.created_at,
    };
  }

  async markPasswordResetUsed(id: string): Promise<void> {
    await this.ensureSchema();
    await this.pool.query(
      `UPDATE public.password_resets
       SET used = true
       WHERE id = $1;`,
      [id]
    );
  }
}
