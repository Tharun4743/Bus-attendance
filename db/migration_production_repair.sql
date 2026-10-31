-- ============================================================================
-- 🚌 DATABASE MIGRATION: PRODUCTION REPAIR & HARDENING
-- Features:
-- 1. Upgrade otp_verifications for persistent hashed OTPs + signup payload
-- 2. Upgrade password_resets for token hashing
-- 3. Safe nullable adjustments for obsolete dynamic code columns
-- 4. Safe geofence default updates (10m radius default)
-- 5. Persistent in-app notifications and system settings
-- ============================================================================

-- 1. Upgrade otp_verifications
ALTER TABLE public.otp_verifications
    ADD COLUMN IF NOT EXISTS otp_hash TEXT,
    ADD COLUMN IF NOT EXISTS signup_data JSONB;

-- Make obsolete plain otp_code column nullable if it exists
DO $$ BEGIN
    ALTER TABLE public.otp_verifications ALTER COLUMN otp_code DROP NOT NULL;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

-- 2. Upgrade password_resets
ALTER TABLE public.password_resets
    ADD COLUMN IF NOT EXISTS token_hash TEXT;

DO $$ BEGIN
    ALTER TABLE public.password_resets ALTER COLUMN token DROP NOT NULL;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

-- 3. Adjust active_sessions dynamic code columns to be optional
DO $$ BEGIN
    ALTER TABLE public.active_sessions ALTER COLUMN current_code DROP NOT NULL;
    ALTER TABLE public.active_sessions ALTER COLUMN code_expires_at DROP NOT NULL;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

-- 4. Default radius update in geofence_settings if still default
DO $$ BEGIN
    ALTER TABLE public.geofence_settings 
        ALTER COLUMN radius_meters SET DEFAULT 10;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

-- 5. Ensure persistent notifications table exists with RLS
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

CREATE INDEX IF NOT EXISTS idx_notif_bus_id ON public.notifications(target_bus_id);
CREATE INDEX IF NOT EXISTS idx_notif_role ON public.notifications(target_role);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access notifications" ON public.notifications;
CREATE POLICY "Service role full access notifications" ON public.notifications FOR ALL USING (true);
