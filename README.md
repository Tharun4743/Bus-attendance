<div align="center">

# 🚌 College Bus Attendance System — Real-Time Fleet Transit & Student Presence PWA
### *Progressive Web Application for Morning & Evening Transit Attendance Verification, Route Roster Tracking & Fleet Analytics*

[![Type](https://img.shields.io/badge/Type-PWA-FF6B6B?style=for-the-badge&logo=pwa&logoColor=white)](#) [![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=white)](#) [![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](#) [![Email](https://img.shields.io/badge/Mailer-Brevo%20Transactional%20API-0B996F?style=for-the-badge&logo=brevo&logoColor=white)](#) [![Storage](https://img.shields.io/badge/Media-Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](#) [![Deployment](https://img.shields.io/badge/Deployment-Render%20%2B%20Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](#)

<p align="center">
  <a href="https://github.com/Tharun4743/Bus-attendance">📦 <b>Official GitHub Repository</b></a>
  • <a href="https://bus-attendance.vercel.app/">🌐 <b>Production Live Demo</b></a>
</p>

</div>

---

## 1. 📌 Problem Statement & Context
Educational transport departments managing fleet logistics and thousands of student bus commuters face severe operational friction:

* 📋 **Fragile Paper Checklists:** Bus in-charges verify student boarding using physical paper rosters that tear, get soaked in rain, or are lost in transit.
* ❓ **Real-Time Safety Blind Spots:** Transport managers have zero live visibility into whether a student boarded the morning bus or missed their evening return route, generating immense parental anxiety.
* 📴 **Rural Cellular Dead Zones:** Campus bus routes frequently traverse remote rural highways where poor mobile connectivity breaks standard web applications.
* 💸 **Exorbitant RFID Terminal Costs:** Hardware card scanners require expensive on-bus equipment that frequently malfunctions due to mechanical vibration and dust.

---

## 2. 🔍 Existing Solutions & Critical Gaps
| Operational Dimension | Paper Rosters & WhatsApp | Expensive On-Bus RFID Terminals | 🚌 Bus Attendance PWA |
| :--- | :---: | :---: | :---: |
| **Hardware Equipment Cost** | ❌ None (Manual Paper) | 💸 High ($500+ per Bus) | ✅ Zero (Runs on Staff Smartphones) |
| **Offline Operation in Dead Zones**| ⚠️ Paper Works, Fails to Sync | ⚠️ Hardware Memory Bugs | ✅ Service Workers + IndexedDB Sync |
| **Real-Time Fleet Dashboard** | ❌ None | ⚠️ Delayed Batch Sync | ✅ Live Cloud Sync when Connected |
| **Session Tracking (Morning/Eve)**| ⚠️ Messy Double Columns | ⚠️ Rigid Hardware Mode | ✅ Rapid Morning/Evening Toggle |
| **Parental Safety Verification**| ❌ Hours of Phone Calls | ⚠️ SMS Gateway Costs | ✅ Instant Administrative Audit Portal |
| **Identity & Access Verification**| ❌ Zero Access Guards | ⚠️ Physical Badge Loss | ✅ Supabase RBAC + Brevo 6-Digit OTP |

---

## 3. 💡 Proposed Solution & Core Architectural Modules
**College Bus Attendance System** is an enterprise-grade Progressive Web App (PWA) and backend platform built for campus bus in-charges, students, and transport administrators:

* 📱 **Zero-Hardware Smartphone PWA:** Installs directly onto any staff or student smartphone via browser service workers with native-like UI, offline-first IndexedDB synchronization, and zero App Store dependencies.
* 🔐 **Role-Based Access Control (RBAC):** Granular authorization guards distinguishing `ADMIN`, `INCHARGE`, and `STUDENT` roles across UI views and backend REST APIs.
* ✉️ **Brevo Transactional Email Engine (`src/lib/brevo.ts`):** 
  - **Live 6-Digit OTP Student Registration:** Generates cryptographic 6-digit numeric OTPs with an exact 10-minute expiry window dispatched directly to student email addresses.
  - **Secure Cryptographic Password Recovery:** 64-character hex reset tokens stored in PostgreSQL with short expiration timestamps dispatched via Brevo reset emails.
* 🗄️ **Supabase PostgreSQL Relational Storage (`db/schema.sql`):**
  - Production PostgreSQL schema with Row-Level Security (RLS) policies.
  - Isolated database DDL script ready for 1-click execution in VS Code Database Client or Supabase SQL Editor.
  - Idempotent seed script (`db/seed.sql`) pre-populating geofence settings, fleet buses, and default role profiles.
* ☁️ **Cloudinary Media Pipeline (`src/lib/cloudinary.ts`):** Secure server-signed asset uploads for student ID card documents and profile photos, persisting only verified HTTPS URLs in PostgreSQL.
* 📍 **Geo-Fencing & Dynamic Rotating Code Verification:**
  - Haversine distance engine validating boarding within configurable campus geofence perimeters.
  - Dynamic 6-digit transit codes regenerating every 60 seconds to prevent fraudulent attendance logging.

---

## 4. ⚙️ System Architecture & Workflow

### 📐 High-Level Architectural Flowchart:
```mermaid
graph TD
    User["Student / In-charge / Admin"] --> PWA["PWA Client (React 19 + Vite + Tailwind)"]
    PWA --> Cache["Offline Cache Engine (IndexedDB + Service Worker)"]
    PWA --> API["Express Unified Gateway (server.ts / apiRouter)"]
    API --> Auth["RBAC Guard & JWT Session Engine"]
    API --> Brevo["Brevo API v3 (6-Digit OTP & Password Reset)"]
    API --> Cloudinary["Cloudinary API (Signed Media Uploads)"]
    API --> DB[("Supabase PostgreSQL (Tables, RLS, Idempotent DDL)")]
```

### 🔄 End-to-End Operational Lifecycle Workflow:
```mermaid
flowchart LR
    A["1. Real Email Signup"] --> B["2. Brevo 6-Digit OTP"]
    B --> C["3. Admin Roster Approval"]
    C --> D["4. Rotating Code + Geofence Verification"]
    D --> E["5. Real-Time Fleet Presence Analytics"]
```

1. **Student Registration:** Student registers with college email → Server generates 6-digit cryptographic OTP → Brevo dispatches email → Student enters OTP within 10 minutes to verify.
2. **Transit Session Start:** Bus In-charge launches session for assigned route (Morning/Evening) → Server activates dynamic 60-second rotating verification code.
3. **Boarding Verification:** Student submits active rotating code and GPS coordinates → System executes Haversine formula against campus geofence → Presence marked in PostgreSQL.
4. **Offline Resilience:** If cellular connectivity drops along remote transit highways, attendance records buffer locally in IndexedDB and automatically flush to PostgreSQL once signal resumes.

---

## 5. 🛡️ Security & Zero-Secret Architecture
This project enforces an uncompromising, automated **Zero-Secret Protocol**:

1. **Untracked Environment Isolation:**
   - All live secrets, API tokens, database connection strings, and private credentials reside strictly in untracked local `.env` files.
   - `.gitignore` rigorously excludes `.env`, `.env.local`, `.env.*.local`, `*.pem`, `*.key`, and credentials.
2. **No Committed Secrets or Plaintext Passwords:**
   - `tests/api-tests.http` uses VS Code REST Client environment references (`{{$dotenv ADMIN_PASSWORD}}`) and generic non-sensitive dummy placeholders.
   - `db/seed.sql` utilizes standard non-sensitive initial setup flags (`INIT_ADMIN_DEFAULT_PASS`), requiring password updates upon first login or via the Brevo reset circuit.
   - `.env.example` contains purely generic dummy labels with zero vendor prefixes or high-entropy tokens to prevent GitGuardian and GitHub Secret Scanning alerts.
3. **Automated Pre-Commit Diff Auditing:**
   - Pre-commit diffs (`git diff --cached`) are audited before every commit to ensure zero API keys or private credentials can be pushed to GitHub.

---

## 6. 🧪 REST Client Suite & Automated Test Circuits

### 📡 VS Code REST Client (`tests/api-tests.http`)
Compatible with the `humao.rest-client` extension. Contains pre-configured, secret-free HTTP test scenarios:
* `GET  /api/health` — Unified server health check.
* `POST /api/auth/login` — RBAC JWT session issuance.
* `POST /api/auth/signup/request-otp` — Brevo 6-digit OTP dispatch.
* `POST /api/auth/signup/verify-otp` — OTP token verification.
* `POST /api/auth/forgot-password` — Brevo password reset dispatch.
* `POST /api/auth/reset-password` — Cryptographic reset token validation.
* `GET  /api/media/signature` — Cloudinary signed upload generation.
* `POST /api/attendance/session/start` — Dynamic code session initialization.
* `POST /api/attendance/verify` — Geofence and rotating code boarding check.

### ⚡ Vitest Automated Regression Circuits (`tests/auth-brevo-flow.test.ts`)
Run the full 7-circuit automated test suite:
```bash
npx vitest run
```
* **Circuit 1:** Brevo 6-digit numeric OTP generation, 10-minute expiry validation, and high-entropy reset token tests.
* **Circuit 2:** Dynamic 6-digit attendance code rotation and campus coordinate Haversine distance calculations.
* **Circuit 3:** Cloudinary media pipeline initialization and signed payload generation.

---

## 7. 🔑 Environment Configuration Matrix

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Local backend Express port | `3001` |
| `NODE_ENV` | Runtime environment | `development` |
| `JWT_SECRET` | Secret key for JWT session tokens (min 32 chars) | `replace_with_your_jwt_secret_min_32_chars` |
| `SUPABASE_URL` | Supabase project REST URL | `https://your-project-id.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous public API key | `your-supabase-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend administrative operations) | `your-supabase-service-role-key` |
| `DATABASE_URL` | PostgreSQL direct connection string | `postgresql://postgres:your-db-pass@db.your-project.supabase.co:5432/postgres` |
| `BREVO_API_KEY` | Brevo v3 Transactional Email API Key | `your_brevo_api_key_v3_here` |
| `BREVO_SENDER_EMAIL` | Verified sender email address configured in Brevo | `transport@college.edu` |
| `BREVO_SENDER_NAME` | Transactional email sender display name | `"College Bus Transit System"` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud namespace | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Cloudinary public API key | `your-cloudinary-api-key` |
| `CLOUDINARY_API_SECRET` | Cloudinary private API secret | `your-cloudinary-api-secret` |
| `DEFAULT_CAMPUS_LAT` | Campus reference latitude for geofence validation | `10.9572` |
| `DEFAULT_CAMPUS_LNG` | Campus reference longitude for geofence validation | `78.0766` |
| `DEFAULT_GEOFENCE_RADIUS_METERS`| Permissible boarding distance radius in meters | `150` |
| `DEFAULT_CODE_ROTATION_SECONDS` | Code refresh interval in seconds | `60` |

---

## 8. 🚀 Cloud Deployment & Server Configuration

### 🌐 Deploying on Render (Web Service)
Deploy this repository as a **Node.js Web Service** on [Render](https://render.com/):

| Setting | Recommended Value | Notes |
| :--- | :--- | :--- |
| **Runtime / Environment** | `Node` | LTS Node.js environment |
| **Branch** | `main` | Production deployment branch |
| **Build Command** | `npm install && npm run build` | Compiles TypeScript and creates optimized Vite `dist/` bundle |
| **Start Command** | `npm start` *(or `npx tsx server.ts`)* | Launches Express server with both `/api` routes and static SPA hosting |
| **Health Check Path** | `/api/health` | Automated uptime health check endpoint |

> [!TIP]
> `server.ts` automatically detects the production `dist/` directory and serves the React SPA with full client-side route fallback alongside all `/api/*` transit endpoints on Render's assigned `$PORT`.

### ▲ Deploying on Vercel
The repository includes a pre-configured `vercel.json` for serverless environments:
* **Build Command:** `npm run build`
* **Output Directory:** `dist`
* **API Entry:** Handled via `api/index.ts` serverless route handler
* **Automated Cron Jobs:** Scheduled transit triggers for automated session open, close, and daily report generation.

---

## 9. 💻 Local Setup & Developer Quick Start

### 1-Click Windows Launcher (`run.bat`)
Run `run.bat` in the project root for the interactive control panel:
* `[1]` Start full application (Express API on port `3001` + Vite dev client on port `5173`)
* `[2]` Run automated verification circuits (Haversine distance, dynamic codes, geofence, and security)
* `[3]` Build production bundle (`tsc && vite build`)
* `[4]` Install / repair dependencies (`npm install`)

### CLI Commands
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Initialize Supabase Database (Execute db/schema.sql and db/seed.sql in Supabase SQL Editor)

# 4. Run development environment (Client + Server concurrently)
npm run dev

# 5. Run automated verification suite
npm test

# 6. Build production bundle
npm run build

# 7. Start unified production server
npm start
```

---

## 10. 👨‍💻 Engineering Author

<table border="0" itemscope itemtype="https://schema.org/Person">
  <tr>
    <td width="130" align="center" valign="middle">
      <img src="https://github.com/Tharun4743.png" width="105" style="border-radius: 6px;" alt="Tharunkumar K — Full Stack Developer & AI Systems Engineer at V.S.B. Engineering College" title="Tharunkumar K — V.S.B. Engineering College (VSBEC)" itemprop="image" />
    </td>
    <td>
      <h3 itemprop="name">Tharunkumar K</h3>
      <p>
        <b itemprop="jobTitle">Full Stack Developer & AI Systems Engineer</b> | <b>V.S.B. Engineering College (VSBEC)</b><br/>
        🎓 <b>B.Tech in Information Technology</b> — <b>V.S.B. Engineering College, Karur</b> (Batch 2024–2028)<br/>
        🏆 <b>2× Hackathon Winner</b> | 🥇 <b>CODE THUGS 2K26</b> | 🥉 <b>Neural Minds</b><br/>
        🇮🇳 <b>India Innovates 2026 & Odoo × NMIT 2026 Finalist</b> | 🚀 <b>SIH 2025 & 2026 Top 50</b><br/>
        🌟 Recognized for <b>Best GitHub Profile & Top Developer</b> @ <b>V.S.B. ENGINEERING COLLEGE</b>
      </p>
      <p>
        🚀 <b>Top Flagship Engineering Projects:</b><br/>
        • 🏛️ <b>TaskManager (VSBEC IT Vault)</b> — Institutional Task Governance & LeetCode/GitHub Sync &nbsp;<a href="https://github.com/Tharun4743/Taskmanager"><img src="https://img.shields.io/badge/Code-181717?style=flat-square&logo=github&logoColor=white" alt="Code" /></a>&nbsp;<a href="https://it-taskmanager.vercel.app/"><img src="https://img.shields.io/badge/Live_Demo-10B981?style=flat-square&logo=vercel&logoColor=white" alt="Live Demo" /></a><br/>
        • 🧠 <b>AURA</b> — Air-Gapped Local Multimodal RAG Engine & Offline AI Assistant &nbsp;<a href="https://github.com/Tharun4743/AURA"><img src="https://img.shields.io/badge/Code-181717?style=flat-square&logo=github&logoColor=white" alt="Code" /></a><br/>
        • 🪖 <b>Smart Helmet IoT</b> — SIH Top 50 Dual-Unit Motorcycle Accident Prevention System &nbsp;<a href="https://github.com/Tharun4743/AGILE-INNOVATORS-smart-helmet-"><img src="https://img.shields.io/badge/Code-181717?style=flat-square&logo=github&logoColor=white" alt="Code" /></a>
      </p>
      <p>
        <a href="https://tharunkumark4743.netlify.app/"><img src="https://img.shields.io/badge/Portfolio-0284c7?style=flat-square&logo=googlechrome&logoColor=white" alt="Portfolio" /></a>&nbsp;
        <a href="https://github.com/Tharun4743"><img src="https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub" /></a>&nbsp;
        <a href="https://www.linkedin.com/in/tharunkumark4743"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white" alt="LinkedIn" /></a>&nbsp;
        <a href="https://leetcode.com/u/Tharunkumar__K/"><img src="https://img.shields.io/badge/LeetCode-FFA116?style=flat-square&logo=leetcode&logoColor=white" alt="LeetCode" /></a>&nbsp;
        <a href="mailto:tharunkumark42007@gmail.com"><img src="https://img.shields.io/badge/Email-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email" /></a>
      </p>
    </td>
  </tr>
</table>

<!-- =========================================================================
   SEO & SEARCH ENGINE RECRUITER METADATA (CRAWLER INDEXING)
   Entity: Tharunkumar K (Tharun4743 / tharunkumark4743)
   Institution: V.S.B. Engineering College, Karur (VSBEC)
   Department: Information Technology (Batch 2024-2028)
   Distinctions: Best GitHub Profile VSBEC, Top Developer Karur, National Hackathon Winner
   Keywords: Tharunkumar K, Tharunkumar VSBEC, Tharun4743, VSB Engineering College Karur, VSBEC IT
   Canonical URL: https://github.com/Tharun4743/Bus-attendance
========================================================================= -->
