-- ============================================================================
-- 🚌 COLLEGE BUS ATTENDANCE MANAGEMENT SYSTEM — SUPABASE POSTGRESQL SCHEMA
-- Target Engine: PostgreSQL 15+ / Supabase Studio
-- Features: 3-Tier RBAC, Dynamic Codes, GPS Geofencing, Cloudinary Media URLs, RLS
-- Ready for 1-Click Execution in Supabase SQL Editor & VSCode Database Client
-- ============================================================================

-- Enable required cryptographic and UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUMS & DOMAINS
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'INCHARGE', 'STUDENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_type AS ENUM ('MORNING', 'EVENING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('UPCOMING', 'ACTIVE', 'CLOSED', 'FINALIZED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM (
        'PRESENT',
        'NOT_PRESENT',
        'LOCATION_UNAVAILABLE',
        'INVALID_LOCATION',
        'INVALID_CODE',
        'BUS_MISMATCH'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. USERS TABLE (Core RBAC Authentication Entity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'STUDENT',
    assigned_bus_id TEXT,
    student_id TEXT,
    status approval_status NOT NULL DEFAULT 'APPROVED',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 3. BUSES TABLE (Campus Transit Fleet & Routes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.buses (
    id TEXT PRIMARY KEY,
    bus_number TEXT NOT NULL UNIQUE,
    route_name TEXT NOT NULL,
    incharge_id TEXT,
    capacity INTEGER NOT NULL DEFAULT 60,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 4. STUDENTS TABLE (Commuter Roster & Cloudinary Face ID Profile)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    register_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    bus_id TEXT REFERENCES public.buses(id) ON DELETE SET NULL,
    preferred_bus_id TEXT,
    status approval_status NOT NULL DEFAULT 'PENDING',
    approved BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    rejection_reason TEXT,
    id_card_url TEXT,
    id_card_public_id TEXT,
    photo_url TEXT,
    photo_public_id TEXT,
    face_descriptor JSONB,
    face_descriptor_left JSONB,
    face_descriptor_right JSONB,
    face_enrolled_at TIMESTAMPTZ,
    face_enrollment_quality NUMERIC,
    biometric_credential JSONB,
    biometric_enrolled_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Idempotent column migrations for students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS biometric_credential JSONB;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS biometric_enrolled_at TIMESTAMPTZ;

-- ============================================================================
-- 5. CHECKPOINTS TABLE (Campus Transit Stops & Hubs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters NUMERIC NOT NULL DEFAULT 15,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 6. GEOFENCE_SETTINGS TABLE (Transit Geofence & Session Timers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.geofence_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    location_name TEXT NOT NULL DEFAULT 'VSB Engineering College Campus',
    campus_latitude DOUBLE PRECISION NOT NULL DEFAULT 10.9572,
    campus_longitude DOUBLE PRECISION NOT NULL DEFAULT 78.0766,
    radius_meters NUMERIC NOT NULL DEFAULT 150,
    max_gps_accuracy_meters NUMERIC NOT NULL DEFAULT 80,
    start_time TEXT NOT NULL DEFAULT '16:50',
    end_time TEXT NOT NULL DEFAULT '16:55',
    report_time TEXT NOT NULL DEFAULT '16:57',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    code_rotation_seconds INTEGER NOT NULL DEFAULT 60,
    enforce_gps BOOLEAN NOT NULL DEFAULT true,
    simulation_enabled BOOLEAN NOT NULL DEFAULT false,
    simulated_time TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 7. ACTIVE_SESSIONS TABLE (Live Transit Windows & Rotating Dynamic Codes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_type session_type NOT NULL,
    attendance_mode TEXT NOT NULL DEFAULT 'GROUND',
    verification_method TEXT NOT NULL DEFAULT 'CODE_GPS',
    bus_id TEXT NOT NULL,
    status session_status NOT NULL DEFAULT 'ACTIVE',
    started_by TEXT NOT NULL,
    current_code VARCHAR(10) NOT NULL,
    code_issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    code_expires_at TIMESTAMPTZ NOT NULL,
    radius_meters NUMERIC NOT NULL DEFAULT 150,
    max_gps_accuracy_meters NUMERIC NOT NULL DEFAULT 80,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_name TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 8. ATTENDANCE_RECORDS TABLE (Verified Transit Check-ins & Cloudinary Proofs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT REFERENCES public.active_sessions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    bus_id TEXT NOT NULL,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    session_type session_type NOT NULL,
    attendance_mode TEXT DEFAULT 'GROUND',
    status attendance_status NOT NULL DEFAULT 'PRESENT',
    code_used VARCHAR(10),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy_meters NUMERIC,
    distance_meters NUMERIC,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    verification_method TEXT NOT NULL DEFAULT 'FACE_GPS',
    selfie_image_url TEXT,
    selfie_public_id TEXT,
    face_match_confidence NUMERIC,
    device_biometric_passed BOOLEAN DEFAULT false,
    override_reason TEXT,
    override_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_student_session_attendance UNIQUE (student_id, attendance_date, session_type)
);

-- ============================================================================
-- 9. OTP_VERIFICATIONS TABLE (Brevo 6-Digit Email OTP Storage)
-- ============================================================================
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

-- ============================================================================
-- 10. PASSWORD_RESETS TABLE (Cryptographic Token Password Recovery)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    token TEXT,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 11. NOTIFICATIONS TABLE (Transit Broadcasts & Student Alerts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_role user_role,
    target_bus_id TEXT,
    target_student_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 12. DAILY_REPORTS TABLE (Archived Presence Analytics in IST)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_reports (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    session_type session_type NOT NULL,
    total_students INTEGER NOT NULL DEFAULT 0,
    present INTEGER NOT NULL DEFAULT 0,
    not_present INTEGER NOT NULL DEFAULT 0,
    percentage NUMERIC NOT NULL DEFAULT 0,
    bus_wise JSONB NOT NULL DEFAULT '[]'::jsonb,
    student_wise JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_daily_report_date_session UNIQUE (date, session_type)
);

-- ============================================================================
-- 13. INDEXES FOR HIGH-THROUGHPUT REAL-TIME QUERIES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_students_reg_no ON public.students(register_number);
CREATE INDEX IF NOT EXISTS idx_students_bus_id ON public.students(bus_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_attendance_date_bus ON public.attendance_records(attendance_date, bus_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status_bus ON public.active_sessions(status, bus_id);
CREATE INDEX IF NOT EXISTS idx_otp_email ON public.otp_verifications(email, expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON public.password_resets(token_hash);

-- ============================================================================
-- 14. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- Service Role Full Access (API Server Backend Worker)
DROP POLICY IF EXISTS "Service role full access users" ON public.users;
CREATE POLICY "Service role full access users" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access students" ON public.students;
CREATE POLICY "Service role full access students" ON public.students FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access buses" ON public.buses;
CREATE POLICY "Service role full access buses" ON public.buses FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access active_sessions" ON public.active_sessions;
CREATE POLICY "Service role full access active_sessions" ON public.active_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access attendance_records" ON public.attendance_records;
CREATE POLICY "Service role full access attendance_records" ON public.attendance_records FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access geofence_settings" ON public.geofence_settings;
CREATE POLICY "Service role full access geofence_settings" ON public.geofence_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access checkpoints" ON public.checkpoints;
CREATE POLICY "Service role full access checkpoints" ON public.checkpoints FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access otp_verifications" ON public.otp_verifications;
CREATE POLICY "Service role full access otp_verifications" ON public.otp_verifications FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access password_resets" ON public.password_resets;
CREATE POLICY "Service role full access password_resets" ON public.password_resets FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access notifications" ON public.notifications;
CREATE POLICY "Service role full access notifications" ON public.notifications FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access daily_reports" ON public.daily_reports;
CREATE POLICY "Service role full access daily_reports" ON public.daily_reports FOR ALL USING (true);

-- User Authenticated Read Access
DROP POLICY IF EXISTS "Authenticated users view buses" ON public.buses;
CREATE POLICY "Authenticated users view buses" ON public.buses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users view checkpoints" ON public.checkpoints;
CREATE POLICY "Authenticated users view checkpoints" ON public.checkpoints FOR SELECT TO authenticated USING (true);
