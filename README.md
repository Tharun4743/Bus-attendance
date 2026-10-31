<div align="center">

# 🚌 College Bus Attendance System — Production Transit & Geofence PWA
### *Progressive Web Application for Morning & Evening Transit Attendance Verification, Ground GPS Geofencing (10m Radius), Travelling Bus Participation, Persistent In-App Notifications, Supabase Realtime, Supabase PostgreSQL, Brevo Transactional Email & Strict 3-Role RBAC*

[![Type](https://img.shields.io/badge/Type-PWA-FF6B6B?style=for-the-badge&logo=pwa&logoColor=white)](#) [![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=white)](#) [![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](#) [![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](#) [![Email](https://img.shields.io/badge/Mailer-Brevo%20Transactional%20API-0B996F?style=for-the-badge&logo=brevo&logoColor=white)](#) [![Realtime](https://img.shields.io/badge/Realtime-Supabase%20Realtime-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](#) [![Timezone](https://img.shields.io/badge/Timezone-Asia%2FKolkata%20(IST)-4B0082?style=for-the-badge)](#)

<p align="center">
  <a href="https://github.com/Tharun4743/Bus-attendance">📦 <b>Official GitHub Repository: Tharun4743/Bus-attendance</b></a>
</p>

</div>

---

## 1. 📌 Institutional Problem Statement & Objectives
Educational transport departments managing fleet logistics and hundreds of student bus commuters face critical daily operational friction:
* 📋 **Fragile Paper Rosters:** Bus in-charges verify student boarding using paper rosters that tear, get soaked in rain, or are easily misplaced in transit.
* ❓ **Real-Time Safety Blind Spots:** Transport managers have zero live visibility into whether a student boarded the morning bus or missed their evening return route.
* 👥 **Proxy Attendance & Buddy Punching:** Traditional roll calls allow peers to answer on behalf of absent friends.
* 💸 **Expensive Hardware Terminals:** Fixed on-bus RFID scanners require high initial investments ($500+ per vehicle) and frequently break down due to vehicle vibrations, heat, and dust.

The **Bus Attendance System** provides a lightweight, resilient Progressive Web App that runs on standard smartphone and desktop browsers, featuring high-accuracy GPS geofencing at the college grounds (10m radius), authenticated travelling bus boarding participation, application-level evening scheduling, persistent in-app notifications with Supabase Realtime, and strict 3-tier Role-Based Access Control.

---

## 2. 👥 Strict Three-Tier Role-Based Access Control (RBAC)

The system enforces exactly three primary user roles with strict separation of concerns across both frontend route guards and backend API authorization middlewares:

### A. ADMIN — Overall Fleet & System Management
* **Student Management:** View all registered commuters, review pending registrations, approve or reject registrations, assign commuters to fleet buses during approval, edit student details, and deactivate students.
* **Bus Fleet Management:** Create buses, configure routes, assign Bus In-Charges, view assigned student counts, and deactivate buses.
* **In-Charge Management:** View all in-charges, assign in-charges to buses, change bus assignments, and deactivate in-charges.
* **Attendance Monitoring:** View real-time attendance summaries across all buses, bus-wise statistics, historical morning and evening reports, attendance percentages, monitor active sessions, and export reports.
* **Ground Settings:** Configure College Ground latitude, longitude, and geofence radius.
* **Strict Admin Restrictions:**
  - 🚫 Admin must **NOT** start attendance sessions.
  - 🚫 Admin must **NOT** end attendance sessions.
  - 🚫 Admin must **NOT** operate daily attendance marking.
  - 🚫 Admin must **NOT** directly mark students present through attendance operations.
  - ✅ Admin has strictly **read-only** access to attendance sessions and records.
  - 🔒 Backend APIs enforce this restriction by rejecting any Admin request attempting to start or end attendance sessions with HTTP `403 Forbidden`.

### B. INCHARGE — Daily Bus Attendance Operator
* Authorized attendance operator for assigned fleet buses.
* **Permissions:**
  - Login and view assigned bus or buses.
  - View commuter rosters assigned to those buses.
  - Start daily attendance sessions with session type (`MORNING` or `EVENING`) and mode (`GROUND` or `TRAVELLING`).
  - End active attendance sessions, finalizing summaries and triggering report generation.
  - View live attendance telemetry (present, absent, and total counts).
  - View assigned bus reports and historical attendance records.
* **Strict Security Restrictions:**
  - In-Charge can access **only assigned buses** (backend ownership validation on every session API).
  - In-Charge cannot manage students, approve registrations, assign buses, or alter administrative settings.

### C. STUDENT — Attendance Verification
* **Permissions:**
  - Sign up without requiring a pre-assigned bus (Admin assigns bus upon review & approval).
  - Login after email OTP verification and Admin approval.
  - View persistent in-app notifications and real-time alerts when an attendance session starts for their assigned bus.
  - Open active attendance sessions and verify attendance using **Ground Geofence** (browser GPS within 10m) or **Travelling Bus Boarding** (active transit confirmation).
  - View personal commuter boarding pass and transit history.
* **Strict Student Restrictions:**
  - Cannot start or end attendance sessions.
  - Cannot change bus assignments or modify attendance records.
  - Notification delivery never marks attendance automatically; explicit verification is required.

---

## 3. 📍 Attendance Verification Modes (Zero Dynamic Codes)

Dynamic 6-digit codes and rotating OTP mechanisms have been completely removed from attendance verification in favor of cryptographic and physical presence verification:

### 1. Ground Attendance Verification (Fixed College Ground Geofence)
* Uses the fixed **College Ground** coordinates configured by Admin (Default: `10.9572° N, 78.0766° E`).
* **Default Geofence Radius:** **10 metres**.
* **Verification Workflow:**
  1. Student opens dashboard during an active `GROUND` session.
  2. Student taps **📍 VERIFY GROUND ATTENDANCE (GPS)**.
  3. Browser requests location permission with `enableHighAccuracy: true`.
  4. Frontend captures high-precision GPS coordinates (`latitude`, `longitude`, `accuracy`).
  5. Backend calculates exact Haversine distance from College Ground.
  6. Backend validates GPS accuracy ($\le 20\text{m}$) and distance ($\le 10\text{m}$).
  7. Backend logs attendance as `PRESENT` with `GROUND_GEOFENCE` method.
* **Explicit Failure Statuses:**
  - `PRESENT`: Marked present inside 10m geofence.
  - `OUTSIDE_GEOFENCE`: Commuter is beyond 10m from College Ground.
  - `LOW_GPS_ACCURACY`: GPS accuracy uncertainty $> 20\text{m}$.
  - `LOCATION_PERMISSION_DENIED`: Browser or OS location access denied.
  - `SESSION_CLOSED`: In-charge has concluded attendance.
  - `SESSION_NOT_FOUND`: No active session exists.

### 2. Travelling Bus Attendance Verification (En-Route Transit)
* Operates while the bus is on the road; ground geofencing does not apply.
* **Zero Fake GPS:** Does not generate or require synthetic GPS coordinates.
* **Verification Workflow:**
  1. In-charge starts attendance in `TRAVELLING` mode.
  2. Commuter taps **🚌 CONFIRM BUS BOARDING**.
  3. Backend verifies student identity, confirms student belongs to the active session bus, and marks status as `PRESENT` with `TRAVELLING_SESSION_PARTICIPATION`.

---

## 4. ✉️ Authentication, Brevo Email & Persistent PostgreSQL Storage

All authentication and token management operations are 100% persistent in Supabase PostgreSQL (zero module-level in-memory maps):

* **Email OTP Verification:**
  - 6-digit numeric OTP with 10-minute validity.
  - Stored in `public.otp_verifications` as cryptographic SHA-256 hashes with attempt rate-limiting.
  - Dispatched via the official **Brevo Transactional Email API v3**.
* **Cryptographic Password Reset:**
  - Random 64-character hex tokens stored in `public.password_resets`.
  - Dispatched via Brevo actionable reset email.
  - Reset route `/reset-password?token=...` verifies expiration and updates hashed passwords with bcrypt.
* **Password Hashing:**
  - All user passwords are encrypted using `bcryptjs` with salt rounds ($\ge 10$).
  - Plaintext password comparisons are completely eliminated.

---

## 5. 🔔 Notification System (Zero VAPID / Zero Web Push Dependency)

To maximize reliability across all devices without requiring paid services, external push gateways, or complex VAPID key pairs:
* **No VAPID / No Web Push Requirement:** No `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, or `web-push` dependencies.
* **Persistent In-App Notifications:**
  - Notifications are stored persistently in Supabase PostgreSQL (`public.notifications`) with `user_id`, `title`, `message`, `type`, `is_read`, and `metadata`.
  - When In-Charge starts attendance on a bus, the backend creates persistent in-app notifications for all approved students assigned to that bus.
  - When attendance ends, session closure notifications are automatically dispatched.
* **Instant Delivery via Supabase Realtime:**
  - Frontend connects to Supabase Realtime websocket channel on table `notifications` filtering by `user_id=eq.{userId}`.
  - When attendance opens, open tabs receive real-time alerts within milliseconds without page reload.
* **Focus & Visibility Revalidation:**
  - Automatic notification refresh triggers whenever the student opens, focuses, or returns to the application tab (`visibilitychange` and `window.focus`).
* **Zero Automatic Marking:**
  - Notification delivery **never** marks attendance automatically. Commuters must explicitly verify their attendance via Ground GPS or Travelling Boarding confirmation.
* **Actionable Routing:**
  - Clicking any attendance notification immediately navigates to the active attendance verification screen.

---

## 6. ⏰ Indian Standard Time & Application-Level Evening Scheduler (Zero Vercel Cron)

* **IST Standardization:** All operational schedules evaluate strictly against Indian Standard Time (`Asia/Kolkata`, UTC+5:30).
* **Zero External Cron Dependency:** No Vercel Cron, no `CRON_SECRET`, and no external third-party paid scheduling services.
* **Schedule Specification:**
  | Time (IST) | Action | Behavior |
  | :--- | :--- | :--- |
  | **4:50 PM** | Start Evening Attendance | Opens evening session for buses when `autoScheduleEnabled` is true |
  | **4:55 PM** | Close Evening Attendance | Concludes evening attendance session and marks unverified students as absent |
  | **4:57 PM** | Finalize Report & Notify Admin | Generates immutable daily report and dispatches persistent Admin notifications |
* **PostgreSQL-Backed Idempotent State Engine (`scheduleEngine.ts`):**
  - All schedule state transitions are recorded with server-generated timestamps.
  - Operations are strictly idempotent: running multiple reconciliation cycles will never create duplicate sessions or overwrite verified student attendance.
  - **Self-Healing Recovery:** If the backend is idle between 4:50 PM and 4:55 PM, the next request automatically reconciles the schedule, closing dangling sessions and generating missed reports.
* **Serverless Execution Architecture & In-Charge Manual Fallback:**
  - In a standard serverless deployment (such as Vercel Functions), Node processes suspend when there are no incoming HTTP requests. The application-level scheduler reconciles on every incoming API interaction.
  - **Manual In-Charge Authority:** Bus In-Charges retain full manual control from their dashboard to open and close sessions at any time as the primary operational workflow.

---

## 7. 🗄️ Database Setup & Migration Guide

### Applying the Schema and Migration:
Run the standalone migration files in the Supabase SQL Editor:
```sql
-- 1. Full database schema (tables, constraints, triggers, RLS)
\i db/schema.sql

-- 2. Production repair migration (idempotent update)
\i db/migration_production_repair.sql
```

The database structure includes:
1. `public.users` — Profile, role (`ADMIN`, `INCHARGE`, `STUDENT`), approval status, and bus assignment.
2. `public.buses` — Bus number, route name, capacity, and active status.
3. `public.bus_assignments` — Many-to-many In-Charge bus assignments.
4. `public.active_sessions` — Real-time attendance sessions with session type, mode, and start/end timestamps.
5. `public.attendance_records` — Immutable commuter attendance verifications with verification method and GPS distance.
6. `public.daily_reports` — Aggregated daily bus attendance reports with present/absent counts.
7. `public.notifications` — Persistent in-app notifications with RLS policies ensuring users only view their own notifications.
8. `public.otp_verifications` — SHA-256 hashed 6-digit OTPs with rate limiting and expiration.
9. `public.password_resets` — SHA-256 hashed password reset tokens with 1-hour expiration.
10. `public.system_settings` — Ground GPS coordinates, geofence radius, and auto-scheduling toggles.

---

## 8. 🛠️ Environment Variables Matrix

Create a local untracked `.env` file (never commit real secrets to Git):

| Variable | Description | Example / Safe Placeholder |
| :--- | :--- | :--- |
| `PORT` | Local backend HTTP port | `3001` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `JWT_SECRET` | Secret key for signing JWTs (min 32 chars) | `replace_with_your_jwt_secret_min_32_chars` |
| `AUTH_SECRET` | Session authentication secret | `replace_with_your_auth_secret_min_32_chars` |
| `DATABASE_URL` | Supabase PostgreSQL pooled connection URI | `postgresql://postgres:password@db.id.supabase.co:5432/postgres` |
| `VITE_SUPABASE_URL` | Supabase Project URL for client and realtime | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Public Key | `your_supabase_anon_key_here` |
| `BREVO_API_KEY` | Brevo Transactional Email REST API v3 Key | `your_brevo_api_key_v3_here` |
| `BREVO_SENDER_EMAIL` | Verified sender email address | `transport@college.edu` |
| `BREVO_SENDER_NAME` | Display name for outgoing emails | `"College Transit System"` |
| `DEFAULT_CAMPUS_LAT` | College Ground Latitude | `10.9572` |
| `DEFAULT_CAMPUS_LNG` | College Ground Longitude | `78.0766` |
| `DEFAULT_GEOFENCE_RADIUS_METERS` | College Ground Geofence Radius | `10` |

> [!NOTE]
> No VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) or Cron secrets (`CRON_SECRET`) are required.

---

## 9. 🧪 Testing & Verification Suite

The repository includes a comprehensive, deterministic test harness covering all critical circuits:

```bash
# 1. Run full system verification suite (37 assertions covering RBAC, Geofencing, Travelling Mode, Reports, Storage, Realtime Notifications, and Scheduler Engine)
npm test

# 2. Run unit & integration test runner (Vitest - 61 unit tests)
npx vitest run

# 3. Build production client and serverless API bundle
npm run build
```

---

## 10. 👨‍💻 Engineering Author

<table border="0" itemscope itemtype="https://schema.org/Person">
  <tr>
    <td width="130" align="center" valign="middle">
      <img src="https://github.com/Tharun4743.png" width="105" style="border-radius: 6px;" alt="Tharunkumar K" title="Tharunkumar K" itemprop="image" />
    </td>
    <td>
      <h3 itemprop="name">Tharunkumar K</h3>
      <p>
        <b itemprop="jobTitle">Full Stack Developer & AI Systems Engineer</b><br/>
        🎓 <b>B.Tech in Information Technology</b> — V.S.B. Engineering College, Karur (Batch 2024–2028)<br/>
        🏆 <b>2× Hackathon Winner</b> | 🥇 <b>CODE THUGS 2K26</b> | 🥉 <b>Neural Minds</b><br/>
        🇮🇳 <b>India Innovates 2026 & Odoo × NMIT 2026 Finalist</b> | 🚀 <b>SIH 2025 & 2026 Top 50</b>
      </p>
      <p>
        <a href="https://github.com/Tharun4743"><img src="https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub" /></a>&nbsp;
        <a href="https://www.linkedin.com/in/tharunkumark4743"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white" alt="LinkedIn" /></a>&nbsp;
        <a href="mailto:tharunkumark42007@gmail.com"><img src="https://img.shields.io/badge/Email-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email" /></a>
      </p>
    </td>
  </tr>
</table>
