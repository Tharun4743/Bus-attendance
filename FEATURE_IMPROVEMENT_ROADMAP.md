# Essential Feature Improvement Roadmap
**Project:** Smart College Bus Attendance System  
**Document Version:** 1.0.0 (Production Architecture Roadmap)  
**Target Stack:** React 18, TypeScript, Vite, Tailwind CSS, Express Backend, Supabase PostgreSQL, Brevo API v3, Cloudinary, Gemini 2.5 Flash / Groq Qwen 27B Vision  
**Publication Date:** October 2026  

---

## 1. Executive Summary & Architectural Principles

The **Smart College Bus Attendance System** is an enterprise-grade, zero-hardware presence management platform designed for higher education institutional transit fleets. By leveraging commuters' and vehicle operators' smartphones, the system replaces manual paper roll calls and costly, tamper-prone RFID card hardware with cryptographic dynamic sessions, GPS geofencing, and biometric verification.

Following the comprehensive architectural audit and codebase cleanup, this roadmap establishes the definitive strategic and technical trajectory for scaling the system from single-bus operation to an institutional fleet deployment managing 50+ transit corridors and 5,000+ daily commuter check-ins.

### Core Engineering Directives (Claude-Pro Standard)
1. **Zero Mock Users or Synthetic Fixtures**: All entities, verification states, and session records operate against live database structures and authenticated user profiles.
2. **Absolute Zero-Secret Isolation**: Credentials, private keys, JWT secrets, and API tokens (Brevo, Supabase, Cloudinary) strictly reside in untracked local environment variables; never staged or committed to Git.
3. **Strict Role-Based Access Control (RBAC)**: Enforced boundary separation across `SUPERADMIN`, `ADMIN`, `INCHARGE`, `STUDENT`, and `PARENT` personas.
4. **Supabase PostgreSQL as Authoritative Relational Core**: Schema integrity, foreign keys, and Row-Level Security (RLS) policies centralized in `db/schema.sql`.
5. **Brevo Transactional Reliability**: Mission-critical alerts (6-digit OTP, password resets, boarding confirmations, emergency alerts) dispatched via the official Brevo v3 REST API.
6. **Task-Manager Aesthetic (Linear / Raycast Inspired)**: Focused, distraction-free neutral UI with dark/light mode responsiveness, razor-thin borders, subtle glassmorphism, dedicated user logo slots, and 100% wired controls.

---

## 2. Domain-by-Domain Architectural Evaluation

```
+----------------------------------------------------------------------------------------------------+
|                                    COLLEGE BUS ATTENDANCE SYSTEM                                   |
+---------------------------------+----------------------------------+-------------------------------+
|       MOBILE CLIENT (PWA)       |       SERVERLESS API (NODE)      |       PERSISTENCE & CLOUD     |
| - Biometric Capture             | - Dynamic Session Orchestration  | - Supabase PostgreSQL (RLS)   |
| - GPS Telemetry & Jitter Filter | - 128-D Vector Match (<1ms)      | - Brevo API v3 (Emails & SMS) |
| - Dynamic QR Scanner            | - Dual-Cloud AI (Gemini / Groq)  | - Cloudinary (Audit Photos)   |
| - IndexedDB Offline Queue       | - Geofence Haversine Engine      | - Service Worker Push Network |
+---------------------------------+----------------------------------+-------------------------------+
```

### 2.1 Geofencing & Transit Reliability
- **Current State**: Uses Haversine distance calculations (`haversine.ts`) with a 3-tier reading jitter filter (`jitterSpread > 25m`) and dual radius configuration (`GROUND`: 35m default, `TRAVELLING`: 1,000m default).
- **Identified Deficiencies**:
  - Susceptible to mock location provider applications on rooted/developer Android devices.
  - Requires uninterrupted cellular connectivity; verification immediately fails in rural transit dead zones.
- **Roadmap Resolution**:
  - Implement client-side `position.coords.isMock` inspection and telemetry velocity sanity checks ($\Delta d / \Delta t > 120\text{ km/h}$).
  - Cross-reference device accelerometer data (`DeviceMotionEvent`) to detect physical transit vibration.
  - Deploy an IndexedDB offline store-and-forward queue with cryptographically signed local hashes synchronized via Service Worker Background Sync (`sw.js`).

### 2.2 Facial Biometrics & Authentication
- **Current State**: Dual-cloud multimodal LLM verification via Google Gemini 2.5 Flash Vision and Groq Cloud Qwen 27B Vision, backed by Cloudinary photo uploads.
- **Identified Deficiencies**:
  - External cloud AI round-trips consume 3.5s to 7.0s per student.
  - Gemini free tier limits throughput to 15 RPM, creating bottleneck queues during peak boarding (40-60 students boarding within 10 minutes).
  - Current `webauthn.ts` is an assertion stub without asymmetric public-key signature verification.
- **Roadmap Resolution**:
  - Transition to a **hybrid fast-vector architecture**: store 128-D normalized face embeddings in PostgreSQL, performing $<1\text{ ms}$ vector distance calculations on the server (`compareBiometricDescriptors`) with Euclidean distance $< 0.48$ and Cosine similarity $\ge 0.65$.
  - Reserve Gemini/Groq Vision for onboarding verification, low-confidence boundaries ($0.48 \le d \le 0.55$), and spoofing audit.
  - Implement full FIDO2 asymmetric public-key cryptography via `@simplewebauthn` for smartphone-native biometric verification.

### 2.3 Dynamic Sessions & Code Rotation
- **Current State**: Generates random 6-digit numeric codes with a 60-second expiration.
- **Identified Deficiencies**:
  - Codes are displayed in modals or admin tools, but the active operator dashboard (`InchargeDashboard.tsx`) lacks a live rolling code display.
  - No QR code generation or camera scanning libraries are installed.
- **Roadmap Resolution**:
  - Integrate dynamic rotating QR codes (SVG generated via `qrcode.react`) with a 30-to-60-second TOTP lifecycle.
  - Mount a high-contrast rolling code card and QR projection container on `InchargeDashboard.tsx`.
  - Provide a zero-tap camera scanner modal on the student interface using `@zxing/browser` to instantly ingest signed session payloads.

### 2.4 Route Checkpoints & Fleet Telemetry
- **Current State**: Database defines an isolated `public.checkpoints` table with latitude and longitude coordinates.
- **Identified Deficiencies**:
  - Checkpoints have no foreign key relationship to buses (`buses.id`), no sequenced stop order, and no scheduled arrival timetable.
  - No streaming telemetry endpoint exists for tracking live vehicle locations along a route.
- **Roadmap Resolution**:
  - Create `public.route_waypoints` linking buses to ordered stops with scheduled arrival times and perimeter radii.
  - Expose `POST /api/fleet/telemetry/ping` for bus in-charge devices to stream GPS coordinates every 20 seconds.
  - Compute dynamic passenger arrival ETAs and render live vehicle positions on interactive Leaflet route polylines.

### 2.5 Notifications & Parent Engagement
- **Current State**: Brevo REST API v3 delivers signup OTPs and password reset emails.
- **Identified Deficiencies**:
  - Parents receive no real-time status alerts when their child boards the bus or is absent.
  - No automated emergency broadcast channel exists for vehicle breakdowns or route delays.
- **Roadmap Resolution**:
  - Extend student records with parent contact metadata (`parent_name`, `parent_email`, `parent_phone`).
  - Configure automated Brevo transactional triggers for immediate boarding confirmation and absentee notices.
  - Implement one-touch Emergency SOS broadcast functionality on the In-Charge console, notifying transport administrators, campus security, and affected parents.

### 2.6 Daily Attendance Reports & Analytics
- **Current State**: `ReportGenerator.ts` compiles daily statistics and exports CSV files, but hardcodes `sessionType: 'EVENING'`.
- **Identified Deficiencies**:
  - Morning transit runs cannot generate daily attendance reports.
  - Reports lack automated PDF rendering and scheduled email delivery to department heads.
- **Roadmap Resolution**:
  - Refactor `generateDailyReport` to accept dynamic session types (`MORNING` and `EVENING`).
  - Introduce server-side PDF generation with institutional headers, route summaries, and biometric audit logs.
  - Integrate automated anomaly detection flagging buses with attendance $>20\%$ below rolling averages or localized rejection spikes.

### 2.7 Stateless Serverless Scalability
- **Current State**: Active OTPs (`otpStore`) and password reset tokens (`resetTokenStore`) reside in Node.js memory maps in `src/server/api.ts`.
- **Identified Deficiencies**:
  - In cloud serverless environments (e.g. Vercel) or multi-container autoscaling clusters, requests from the same user hit different ephemeral worker processes, resulting in failed OTP validations.
- **Roadmap Resolution**:
  - Wire existing schema tables `public.otp_verifications` and `public.password_resets` into `PostgresStorageAdapter.ts`.
  - Implement atomic database transactions with single-use invalidation (`used = true`) and maximum 5-attempt rate-limiting.

---

## 3. Executive Roadmap Matrix

| ID | Feature Name | Domain | Priority | Architectural Impact | Est. Effort | Target Phase |
| :---: | :--- | :--- | :---: | :--- | :---: | :---: |
| **F-01** | **PostgreSQL Persistence for OTP & Password Resets** | Auth & Scalability | **P0** | Eliminates serverless state leakage; multi-instance ready | 3 Days | Phase 1 (Near-Term) |
| **F-02** | **Dynamic Rotating QR Code & In-Charge Screen Display** | Dynamic Sessions | **P0** | Real-time QR rotation every 30-60s on operator UI | 4 Days | Phase 1 (Near-Term) |
| **F-03** | **Morning & Evening Unified Session Report Generator** | Reports & Analytics | **P1** | Eliminates evening-only hardcode; supports morning transit | 2 Days | Phase 1 (Near-Term) |
| **F-04** | **Route-Based Frontend Bundle Optimization** | Performance / UX | **P1** | Splits 1.07 MB bundle into lazy chunks; sub-second mobile load | 2 Days | Phase 1 (Near-Term) |
| **F-05** | **Hybrid Fast-Vector Face Verification Pipeline** | Biometrics & AI | **P1** | Replaces 7s LLM round-trip with <1ms 128-D vector matching | 1.5 Weeks | Phase 2 (Mid-Term) |
| **F-06** | **Automated Brevo Parent Boarding & Absentee Alerts** | Notifications | **P1** | Real-time email/SMS to parents when student boards bus | 1 Week | Phase 2 (Mid-Term) |
| **F-07** | **Genuine FIDO2 WebAuthn Asymmetric Verification** | Biometrics & Security | **P2** | Elliptic curve signature verification via `@simplewebauthn` | 1 Week | Phase 2 (Mid-Term) |
| **F-08** | **Offline-First Attendance PWA Queue (IndexedDB)** | Geofence & Transit | **P2** | Enables offline attendance verification in cellular dead zones | 2 Weeks | Phase 2 (Mid-Term) |
| **F-09** | **GPS Anti-Spoofing & Mock Location Shield** | Geofence & Security | **P2** | Detects developer mock location apps and virtual sensors | 1 Week | Phase 2 (Mid-Term) |
| **F-10** | **Route Checkpoint Waypoints & Live Telemetry Ingestion** | Checkpoints & Fleet | **P2** | Sequenced bus stops with background GPS ping ingestion | 2 Weeks | Phase 3 (Long-Term) |
| **F-11** | **Real-Time Passenger ETA & Live Fleet Map** | Checkpoints & Tracking| **P2** | Dynamic arrival estimates on interactive Leaflet route maps | 2 Weeks | Phase 3 (Long-Term) |
| **F-12** | **One-Touch SOS & Emergency Fleet Dispatch** | Notifications | **P2** | Emergency broadcast to admin, in-charges, and route parents | 1 Week | Phase 3 (Long-Term) |
| **F-13** | **Automated PDF Report Dispatch & Anomaly Detection** | Analytics & Audit | **P3** | Daily PDF digest to HODs + statistical turnout anomaly flags | 1.5 Weeks | Phase 3 (Long-Term) |

---

## 4. Detailed Phased Implementation Roadmap

```
+----------------------------------------------------------------------------------------------------+
|                                    PHASED EXECUTION TIMELINE                                       |
+------------------------------------+-----------------------------------+---------------------------+
| PHASE 1: NEAR-TERM (Weeks 1 to 4)  | PHASE 2: MID-TERM (Months 2 to 3) | PHASE 3: LONG-TERM (M 4-6)|
| - F-01: Postgres OTP/Reset State   | - F-05: Fast-Vector Biometrics    | - F-10: Route Waypoints   |
| - F-02: Dynamic QR Rotation        | - F-06: Parent Boarding Alerts    | - F-11: Live Telemetry/ETA|
| - F-03: Morning Reports Generator  | - F-07: FIDO2 WebAuthn Signatures | - F-12: Emergency SOS     |
| - F-04: Route Bundle Splitting     | - F-08: Offline IndexedDB Queue   | - F-13: PDF Audit & ML    |
|                                    | - F-09: GPS Anti-Spoof Shield     |                           |
+------------------------------------+-----------------------------------+---------------------------+
```

---

### 🟢 Phase 1: Near-Term (Stabilization, Security & Critical UI — Weeks 1 to 4)

#### F-01: Supabase PostgreSQL Persistence for OTP & Password Resets
- **Architectural Rationale**: Serverless lambda workers on platforms such as Vercel do not share in-memory state. Storing OTPs in memory maps breaks signups whenever the verification request hits an alternate instance.
- **Technical Scope**:
  - Implement `saveOtp`, `verifyOtp`, `saveResetToken`, and `getResetToken` in `src/server/storage/PostgresStorageAdapter.ts`.
  - Wire `otp_verifications` and `password_resets` tables from `db/schema.sql` into the active storage layer.
  - Implement atomic single-use invalidation (`used = true`) and maximum 5-attempt rate-limiting in SQL.
- **Verification Milestone**: Vitest test simulating concurrent serverless lambda instances verifying an OTP against PostgreSQL with zero state mismatch.

#### F-02: Dynamic Rotating QR Code & In-Charge Screen Display
- **Architectural Rationale**: Students stepping onto the bus require a frictionless, zero-touch verification mechanism. Projecting an auto-rotating QR code onto the operator's smartphone allows instant scanning without manual code entry.
- **Technical Scope**:
  - Install `qrcode.react` for dynamic SVG QR rendering.
  - Mount high-contrast QR display card on `InchargeDashboard.tsx` with a 60-second visual countdown circle.
  - Encode signed payload into QR: `JSON.stringify({ sessionId, busId, code, issuedAt, expiresAt })`.
  - Implement camera QR scanner modal on student dashboard using `@zxing/browser`.
- **Verification Milestone**: Operator console rotates QR every 60 seconds; student device scans QR and completes geofenced check-in in under 2 seconds.

#### F-03: Morning & Evening Unified Session Report Generator
- **Architectural Rationale**: Transport administrators require comprehensive daily rosters spanning both commute legs. Currently, `ReportGenerator.ts:15` hardcodes `sessionType: 'EVENING'`.
- **Technical Scope**:
  - Refactor `generateDailyReport(sessionType: SessionType, customDate?: string)` to accept dynamic session parameters.
  - Update `db/schema.sql` unique constraint on `daily_reports` to `(date, session_type)`.
  - Update `ReportsPage.tsx` with session tab filters (`Morning Transit` vs `Evening Transit`).
- **Verification Milestone**: Execute `generateDailyReport('MORNING')` and confirm correct compilation and storage in Supabase PostgreSQL.

#### F-04: Route-Based Frontend Bundle Optimization
- **Architectural Rationale**: The initial production JavaScript bundle is 1,069 kB. Commuters on mobile 3G/4G connections experience unacceptable initial load latency.
- **Technical Scope**:
  - Implement `React.lazy` and `Suspense` across route boundaries in `src/App.tsx`:
    - Admin modules (`AdminDashboard`, `BusesManagement`, `ReportsPage`, `GeofenceSettings`, `StudentsManagement`)
    - In-Charge console (`InchargeDashboard`)
    - Student portal (`StudentDashboard`)
    - Authentication routes (`LoginPage`, `SignupPage`, `ForgotPasswordPage`, `ResetPasswordPage`)
  - Configure Rollup `manualChunks` in `vite.config.ts` isolating `leaflet`, `lucide-react`, and `date-fns`.
- **Verification Milestone**: Production build client chunk drops below 250 kB initial payload with zero Vite chunk-size warnings.

---

### 🟡 Phase 2: Mid-Term (Performance, Biometrics & Parent Engagement — Months 2 to 3)

#### F-05: Hybrid Fast-Vector Face Verification Pipeline
- **Architectural Rationale**: Multimodal cloud LLM calls (Gemini/Groq) take 3.5s to 7.0s per check-in and are rate-limited to 15 RPM. In-memory/PostgreSQL 128-D vector comparisons take $<1\text{ ms}$, scaling seamlessly to thousands of students.
- **Technical Scope**:
  - Extract and store 128-D normalized face embeddings upon profile photo enrollment (`students.face_descriptor`).
  - During check-in, compute live 128-D vector and execute dual-metric comparison (`compareBiometricDescriptors`) using Euclidean distance ($< 0.48$) and Cosine similarity ($\ge 0.65$).
  - Reserve Gemini 2.5 Flash / Groq Vision strictly as a fallback tier for edge cases ($0.48 \le d \le 0.55$) and enrollment quality audits.
  - Asynchronously queue presence audit photos to Cloudinary in the background without blocking the check-in response.
- **Verification Milestone**: 50-student concurrent load benchmark completes with average verification response time under 300 ms.

#### F-06: Automated Brevo Parent Boarding & Absentee Alerts
- **Architectural Rationale**: Higher education transit safety mandates prompt parent notification regarding commuter transit status.
- **Technical Scope**:
  - Add parent contact fields to `public.students` (`parent_name`, `parent_email`, `parent_phone`).
  - Configure transactional Brevo email templates:
    1. **Boarding Alert**: *"Your child [Name] boarded Bus [Number] at [Time IST] near [Location]."*
    2. **Absentee Notice**: *"Your child [Name] was marked absent for the [Morning/Evening] bus transit on [Date]."*
  - Implement an asynchronous event-driven worker in Express triggering dispatch immediately upon record creation.
- **Verification Milestone**: Mark student present; verify Brevo API receives dispatch payload and returns valid `messageId` within 10 seconds.

#### F-07: Genuine FIDO2 WebAuthn Asymmetric Verification
- **Architectural Rationale**: Elevate smartphone biometric check-in from format assertions to genuine hardware-backed non-repudiation.
- **Technical Scope**:
  - Install `@simplewebauthn/server` and `@simplewebauthn/browser`.
  - Add `public.webauthn_credentials` table in PostgreSQL storing public keys, credential IDs, and signature counters.
  - Implement registration challenge generation and verification.
  - Enforce authentication challenge response validation checking cryptographic elliptic curve signatures against stored public keys.
- **Verification Milestone**: Authenticate using native device biometric sensor; verify cryptographic signature validates successfully in backend.

#### F-08: Offline-First Attendance PWA Queue (IndexedDB)
- **Architectural Rationale**: Transit highways frequently pass through cellular dead zones. Attendance verification must continue uninterrupted offline.
- **Technical Scope**:
  - Implement client-side IndexedDB persistence using `idb`.
  - When offline: capture GPS coordinates, selfie hash, dynamic code, and timestamp; generate a cryptographically signed HMAC token using student session key.
  - Register `sync` event in Service Worker (`sw.js`).
  - Automatically flush queued records to `/api/attendance/sync-offline` upon network restoration.
- **Verification Milestone**: Simulate offline network in browser DevTools; verify attendance locally queued; re-enable network; verify automatic batch sync to Supabase PostgreSQL.

#### F-09: GPS Anti-Spoofing & Mock Location Shield
- **Architectural Rationale**: Prevent students from using location spoofing applications to mark attendance remotely.
- **Technical Scope**:
  - Inspect `position.coords.isMock` (supported on Android Chrome).
  - Telemetry sanity checks: Calculate velocity between consecutive pings ($v = \Delta d / \Delta t$). If $v > 120\text{ km/h}$, flag as suspicious.
  - Device motion cross-check: Check `window.DeviceMotionEvent` to confirm physical bus vibration/acceleration when claiming travelling transit mode.
  - Log spoofing attempts in `attendance_records.override_reason` with status `INVALID_LOCATION`.
- **Verification Milestone**: Submit simulated GPS jump exceeding $500\text{ km/h}$; verify check-in rejected with `MOCK_LOCATION_DETECTED`.

---

### 🟣 Phase 3: Long-Term (Fleet Telemetry, Waypoints & Predictive Analytics — Months 4 to 6)

#### F-10: Route Checkpoint Waypoints & Live Telemetry Ingestion
- **Architectural Rationale**: Institutional fleet managers require fine-grained visibility into vehicle progress along predefined routes.
- **Technical Scope**:
  - Create `public.route_waypoints` table linking buses to ordered stops, scheduled arrival times, and geofence radii.
  - Expose endpoint `POST /api/fleet/telemetry/ping` allowing in-charge devices to stream GPS coordinates every 20 seconds.
  - Automated stop detection: When vehicle coordinates enter waypoint radius, system auto-logs waypoint arrival timestamp.
- **Verification Milestone**: Ingest series of simulated vehicle coordinates; verify stops automatically marked as reached in sequence.

#### F-11: Real-Time Passenger ETA & Live Fleet Map
- **Architectural Rationale**: Commuters waiting at roadside stops need real-time awareness of vehicle position and estimated arrival time.
- **Technical Scope**:
  - Embed dynamic Leaflet map on Student and Parent dashboards displaying vehicle icon along the route polyline.
  - Calculate dynamic ETA to student's assigned stop based on distance and current vehicle velocity.
  - Dispatch push notification when vehicle is 2 stops away (~10 minutes).
- **Verification Milestone**: Live vehicle ping moves marker on client map; student dashboard displays accurate, updating countdown ETA.

#### F-12: One-Touch SOS & Fleet Incident Dispatch Engine
- **Architectural Rationale**: Vehicle breakdowns, traffic delays, or accidents require immediate coordinated communication.
- **Technical Scope**:
  - Add prominent `Emergency SOS` action on In-Charge Console with incident categories: `BREAKDOWN`, `ACCIDENT`, `TRAFFIC_DELAY`, `MEDICAL`.
  - Multi-channel instant dispatch:
    - High-priority SMS/Email via Brevo to Transport Director and Campus Security.
    - Push notification to all students and parents assigned to that bus route with delay estimate.
    - Live incident banner rendered on Admin Dashboard.
- **Verification Milestone**: Trigger incident from In-Charge console; verify immediate notification received across admin, parent, and student channels.

#### F-13: Automated PDF Report Dispatch & Anomaly Detection
- **Architectural Rationale**: Institutional accreditation and transport compliance require certified, printable PDF rosters.
- **Technical Scope**:
  - Server-side PDF generation using `pdfkit` or `@react-pdf/renderer` with institutional letterhead, route breakdown, and biometric audit verification logs.
  - Scheduled cron dispatch: At session close (`16:57 IST`), auto-email PDF report to institutional administrators via Brevo.
  - Statistical anomaly detection engine flagging:
    - Buses with turnout $> 20\%$ below 30-day rolling average.
    - Repeated location failures or biometric rejections concentrated at a specific stop.
- **Verification Milestone**: Scheduled cron runs at session close; verify valid PDF generated and dispatched via Brevo.

---

## 5. Database Schema Evolution Blueprint

The following idempotent DDL migrations are prepared for addition to `db/schema.sql` to support the roadmap:

```sql
-- ============================================================================
-- SCHEMA EXTENSION: ROUTE WAYPOINTS, LIVE TELEMETRY, WEBAUTHN & INCIDENTS
-- ============================================================================

-- 1. Route Waypoints Table (Ordered stop sequences per bus)
CREATE TABLE IF NOT EXISTS public.route_waypoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id TEXT NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
    stop_name TEXT NOT NULL,
    stop_sequence INTEGER NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    scheduled_time TIME NOT NULL,
    radius_meters NUMERIC NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_bus_stop_sequence UNIQUE (bus_id, stop_sequence)
);

-- 2. Bus Fleet Live Telemetry (Ingests real-time vehicle pings)
CREATE TABLE IF NOT EXISTS public.bus_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id TEXT NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed_kmh NUMERIC DEFAULT 0,
    heading_degrees NUMERIC,
    accuracy_meters NUMERIC,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_telemetry_bus_time ON public.bus_telemetry(bus_id, recorded_at DESC);

-- 3. FIDO2 WebAuthn Cryptographic Credentials
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    device_name TEXT,
    transports TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Parent Contacts on Students Table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS parent_name TEXT,
ADD COLUMN IF NOT EXISTS parent_email TEXT,
ADD COLUMN IF NOT EXISTS parent_phone TEXT;

-- 5. Emergency SOS Incidents Table
CREATE TABLE IF NOT EXISTS public.transit_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id TEXT NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
    incharge_id TEXT NOT NULL,
    incident_type TEXT NOT NULL, -- 'BREAKDOWN', 'ACCIDENT', 'TRAFFIC_DELAY', 'MEDICAL'
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'RESOLVED'
    reported_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ
);
```

---

## 6. Success Metrics & Verification Gateways

| Objective | Baseline Metric | Target Metric | Verification Method |
| :--- | :---: | :---: | :--- |
| **Attendance Verification Latency** | 3,500 – 7,000 ms | **$< 350\text{ ms}$** | 50-student load test via Vitest |
| **Frontend Initial Bundle Size** | 1,069 kB (single JS) | **$< 250\text{ kB}$ initial** | `npm run build:client` bundle analyzer |
| **Verification Concurrency Capacity** | 15 req/min (Gemini cap) | **300+ req/min** | Fast vector distance in PostgreSQL |
| **Serverless State Robustness** | In-memory Maps | **100% PostgreSQL** | Multi-replica OTP signup integration test |
| **Parent Notification Timeliness** | 0% (No alerts) | **$< 15\text{ s}$ from boarding** | Brevo webhook timestamp inspection |
| **Transit Offline Resilience** | 0% (Immediate failure) | **100% local queue** | Offline DevTools network cut test |
| **Code Type-Safety & Tests** | 0 errors, 38 vitest | **0 errors, 50+ vitest** | `npx tsc --noEmit && npx vitest run` |

---

*Authored by Principal Architecture Team | Smart College Bus Attendance System*
