-- ============================================================================
-- 🚌 COLLEGE BUS ATTENDANCE MANAGEMENT SYSTEM — SEED DATA
-- Idempotent PostgreSQL Seed File for Supabase SQL Editor & VSCode DB Client
-- Strictly Real Verified Email Identifiers (Zero Fake Mocks)
-- ============================================================================

-- 1. SEED DEFAULT GEOFENCE & TRANSIT PARAMETERS (VSB Engineering College)
INSERT INTO public.geofence_settings (
    id,
    campus_latitude,
    campus_longitude,
    radius_meters,
    code_rotation_seconds,
    max_gps_accuracy_meters,
    enforce_gps,
    updated_at
)
VALUES (
    'default',
    10.9572,
    78.0766,
    150,
    60,
    80,
    true,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    campus_latitude = EXCLUDED.campus_latitude,
    campus_longitude = EXCLUDED.campus_longitude,
    radius_meters = EXCLUDED.radius_meters,
    code_rotation_seconds = EXCLUDED.code_rotation_seconds,
    updated_at = NOW();

-- 2. SEED INITIAL FLEET BUSES
INSERT INTO public.buses (id, bus_number, route_name, incharge_id, capacity, active)
VALUES 
    ('BUS06', 'Bus No 6', 'Dharapuram Route', 'INC006', 60, true),
    ('BUS01', 'Bus No 1', 'Karur Central', 'INC001', 60, true),
    ('BUS02', 'Bus No 2', 'Erode Express', 'INC002', 60, true)
ON CONFLICT (id) DO UPDATE SET
    bus_number = EXCLUDED.bus_number,
    route_name = EXCLUDED.route_name,
    incharge_id = EXCLUDED.incharge_id,
    active = EXCLUDED.active;

-- 3. SEED CORE ACCOUNTS (Real Verified Emails)
-- 3a. Primary Transport Administrator (Supabase Project Owner: Tharunkumar K)
INSERT INTO public.users (id, email, password_hash, name, role, status, active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'tharunkumark4743@gmail.com',
    'INIT_ADMIN_DEFAULT_PASS',
    'Tharunkumar K (SuperAdmin)',
    'ADMIN',
    'APPROVED',
    true
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    active = EXCLUDED.active;

-- 3b. VSB Transit System Coordinator Admin (campusvsb4743@gmail.com)
INSERT INTO public.users (id, email, password_hash, name, role, assigned_bus_id, status, active)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'campusvsb4743@gmail.com',
    'INIT_COORDINATOR_DEFAULT_PASS',
    'VSB Transit Coordinator',
    'ADMIN',
    'BUS06',
    'APPROVED',
    true
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    active = EXCLUDED.active;

-- 3c. Bus Incharge Coordinator (Aarthi - BUS06 Dharapuram)
INSERT INTO public.users (id, email, password_hash, name, role, assigned_bus_id, status, active)
VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'vsbecitc2428@gmail.com',
    'INIT_INCHARGE_DEFAULT_PASS',
    'Aarthi (Bus Incharge)',
    'INCHARGE',
    'BUS06',
    'APPROVED',
    true
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    assigned_bus_id = EXCLUDED.assigned_bus_id,
    status = EXCLUDED.status,
    active = EXCLUDED.active;

-- 3d. Sample Approved Student Commuter (24IT001 - Tharun K Commuter)
INSERT INTO public.users (id, email, password_hash, name, role, student_id, assigned_bus_id, status, active)
VALUES (
    'c0000000-0000-0000-0000-000000000004',
    'tharunkumark42007@gmail.com',
    'INIT_STUDENT_DEFAULT_PASS',
    'Tharunkumar K (Student)',
    'STUDENT',
    'STU-24IT001',
    'BUS06',
    'APPROVED',
    true
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    student_id = EXCLUDED.student_id,
    assigned_bus_id = EXCLUDED.assigned_bus_id,
    status = EXCLUDED.status,
    active = EXCLUDED.active;

-- 4. SEED STUDENT COMMUTER PROFILE
INSERT INTO public.students (
    id,
    user_id,
    register_number,
    name,
    email,
    phone,
    bus_id,
    preferred_bus_id,
    status,
    approved,
    active,
    approved_at,
    approved_by
)
VALUES (
    'STU-24IT001',
    'c0000000-0000-0000-0000-000000000004',
    '24IT001',
    'Tharunkumar K (Student)',
    'tharunkumark42007@gmail.com',
    '+91 9876543210',
    'BUS06',
    'BUS06',
    'APPROVED',
    true,
    true,
    NOW(),
    'Tharunkumar K (SuperAdmin)'
)
ON CONFLICT (register_number) DO UPDATE SET
    bus_id = EXCLUDED.bus_id,
    status = EXCLUDED.status,
    approved = EXCLUDED.approved,
    active = EXCLUDED.active;
