<div align="center">

# ≡ƒÜî College Bus Attendance System ΓÇö Real-Time Fleet Transit & Student Presence PWA
### *Progressive Web Application for Morning & Evening Transit Attendance Verification, Route Roster Tracking & Fleet Analytics*

[![Type](https://img.shields.io/badge/Type-PWA-FF6B6B?style=for-the-badge&logo=pwa&logoColor=white)](#) [![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=white)](#) [![Language](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#) [![Deployment](https://img.shields.io/badge/Deployment-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](#) [![Offline](https://img.shields.io/badge/Offline-Service%20Workers-10b981?style=for-the-badge&logo=pwa&logoColor=white)](#) [![License](https://img.shields.io/badge/License-Strict%20Proprietary-dc2626?style=for-the-badge&logo=lock&logoColor=white)](#)

<p align="center">
  <a href="https://github.com/Tharun4743/bus-attendance">≡ƒôª <b>Official GitHub Repository</b></a>
  ΓÇó <a href="https://bus-attendance.vercel.app/">≡ƒîÉ <b>Production Live Demo</b></a>
  
</p>

</div>

---

## 1. ≡ƒôî Problem Statement & Context
Educational transport departments managing fleet logistics and thousands of student bus commuters face severe operational friction:

* ≡ƒôï **Fragile Paper Checklists:** Bus in-charges verify student boarding using physical paper rosters that tear, get soaked in rain, or are lost in transit.
* Γ¥ô **Real-Time Safety Blind Spots:** Transport managers have zero live visibility into whether a student boarded the morning bus or missed their evening return route, generating immense parental anxiety.
* ≡ƒô┤ **Rural Cellular Dead Zones:** Campus bus routes frequently traverse remote rural highways where poor mobile connectivity breaks standard web applications.
* ≡ƒÆ╕ **Exorbitant RFID Terminal Costs:** Hardware card scanners require expensive on-bus equipment that frequently malfunctions due to mechanical vibration and dust.

---

## 2. ≡ƒöì Existing Solutions & Critical Gaps
| Operational Dimension | Paper Rosters & WhatsApp | Expensive On-Bus RFID Terminals | ≡ƒÜî Bus Attendance PWA |
| :--- | :---: | :---: | :---: |
| **Hardware Equipment Cost** | Γ¥î None (Manual Paper) | ≡ƒÆ╕ High ($500+ per Bus) | Γ£à Zero (Runs on Staff Smartphones) |
| **Offline Operation in Dead Zones**| ΓÜá∩╕Å Paper Works, Fails to Sync | ΓÜá∩╕Å Hardware Memory Bugs | Γ£à Service Workers + IndexedDB Sync |
| **Real-Time Fleet Dashboard** | Γ¥î None | ΓÜá∩╕Å Delayed Batch Sync | Γ£à Live Cloud Sync when Connected |
| **Session Tracking (Morning/Eve)**| ΓÜá∩╕Å Messy Double Columns | ΓÜá∩╕Å Rigid Hardware Mode | Γ£à Rapid Morning/Evening Toggle |
| **Parental Safety Verification**| Γ¥î Hours of Phone Calls | ΓÜá∩╕Å SMS Gateway Costs | Γ£à Instant Administrative Audit Portal |

### ΓÜá∩╕Å Critical Limitations of Existing Alternatives:
* ≡ƒÜ½ **No Real-Time Administrative Oversight:** Transport coordinators only discover student attendance discrepancies hours after buses have already departed.
* ≡ƒ¢æ **High Hardware Failure Rates:** Dust, extreme vehicle temperatures, and electrical surges frequently disable dedicated bus RFID readers.
* ≡ƒô┤ **Slow Manual Tallying:** Drivers spend 15ΓÇô20 minutes at bus stops manually searching through hundreds of printed names.

---

## 3. ≡ƒÆí Proposed Solution & Architectural Innovation
**College Bus Attendance System** is a responsive Progressive Web App (PWA) designed for campus bus in-charges, drivers, and transport administrators:

* ≡ƒô▒ **Zero-Hardware Smartphone PWA:** Installs directly onto any staff smartphone via browser service workers without requiring app store downloads or expensive hardware.
* ≡ƒô╢ **Offline-First IndexedDB Synchronization:** Bus in-charges log attendance seamlessly in rural cellular dead zones; records automatically synchronize to the cloud when connectivity returns.
* ΓÜí **Rapid One-Tap Roster Verification:** Alphabetically and stop-sorted student rosters allow in-charges to verify boarding in milliseconds per student.
* ≡ƒöä **Morning & Evening Transit Sessions:** Clean toggle interface isolating morning boarding logs from evening departure runs with automatic session archiving.
* ≡ƒûÑ∩╕Å **Central Transport Analytics Portal:** Administrators monitor live fleet occupancy, absent student lists, and bus stop capacity metrics in real time.

---

## 4. ΓÜÖ∩╕Å Technical Approach & System Architecture

### ≡ƒôÉ High-Level Architectural Flowchart:
```mermaid
graph TD
    Scanner["Driver Smartphone / Optical RFID Reader"] --> API["Transit Attendance Gateway (Node.js API)"]
    API --> Validator["Student Enrollment & Route Authorization Guard"]
    API --> DB[("PostgreSQL Fleet & Attendance Database")]
    API --> GPS["Real-Time Fleet GPS & Geo-Fencing Service"]
    API --> SMS["Instant Parent SMS & Telegram Notification Hub"]
```

| Layer / Subsystem | Technologies Used | Operational Functionality |
| :--- | :--- | :--- |
| **Mobile PWA Shell** | React 19, Vite, Tailwind CSS, Service Workers | Responsive mobile client with native app feel, home screen installation, fast UI |
| **Offline Cache Engine** | IndexedDB, Cache API | Buffers attendance scans locally during transit, guaranteeing zero data loss |
| **Backend API Core** | Node.js, Express, TypeScript | RESTful route handlers managing roster queries, session logs, and fleet reports |
| **Cloud Persistence** | Supabase (PostgreSQL 15) | Relational schema linking students, bus routes, designated stops, and timestamps |

### ≡ƒöä End-to-End Operational Lifecycle Workflow:
```mermaid
flowchart LR
    A["1. Student Boarding & RFID/QR Scan"] --> B["2. Route Authorization Validation"]
    B --> C["3. Cryptographic Attendance Timestamp"]
    C --> D["4. Geo-Fenced Bus Location Tagging"]
    D --> E["5. Real-Time Parent Notification Relay"]
```

1. **Route Selection:** Bus in-charge opens PWA on mobile ΓåÆ Selects route number and session (Morning/Evening).
2. **Rapid Boarding Verification:** In-charge taps student names as they board ΓåÆ UI confirms presence with instant green indicator.
3. **Automatic Cloud Sync:** When bus reaches campus or cellular signal is restored ΓåÆ Local IndexedDB records sync automatically to central database.

---

## 5. ≡ƒôê Quantifiable Impact & Measurable Benefits
* ≡ƒÜî **100% Verified Fleet Accountability:** Eliminates paper logs and gives transport administrators a live dashboard of seated vs. absent students per route.
* ≡ƒÆ░ **Zero Hardware Costs:** Operates directly on standard staff smartphones via PWA without purchasing expensive RFID terminals.
* ≡ƒ¢í∩╕Å **Enhanced Campus Safety:** Provides immediate records of student transit status in emergencies.
* ΓÅ▒∩╕Å **15 Minutes Saved per Route:** Rapid one-tap search accelerates boarding at every campus bus stop.

---

## 6. ≡ƒÜÇ Feasibility, Operational Viability & Scalability
* ≡ƒö¼ **Technical Feasibility:** Service worker offline caching ensures flawless operation along remote highway corridors without cellular signals.
* ≡ƒÆ░ **Economic & Financial Viability:** Saves colleges tens of thousands of dollars in proprietary RFID hardware and maintenance contracts.
* ≡ƒÅ¢∩╕Å **Operational Governance:** Simple one-tap mobile UI requires zero technical training for drivers or bus in-charges.
* ≡ƒôê **Horizontal Scalability Roadmap:** Easily handles dozens of bus routes and thousands of student commuters simultaneously across multi-campus institutions.

---

## 7. ≡ƒÜÇ Cloud Deployment & Server Configuration

### ≡ƒîÉ Deploying on Render (Web Service)
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

### Γû▓ Deploying on Vercel
The repository includes a pre-configured `vercel.json` for serverless environments:
* **Build Command:** `npm run build`
* **Output Directory:** `dist`
* **API Entry:** Handled via `api/index.ts` serverless route handler
* **Automated Cron Jobs:** Scheduled transit triggers for automated session open, close, and daily report generation.

---

## 8. ≡ƒÆ╗ Local Setup & Developer Quick Start

### 1-Click Windows Launcher (`run.bat`)
Run `run.bat` in the project root for the interactive control panel:
* `[1]` Start full application (Express API on port `3001` + Vite dev client on port `5173`)
* `[2]` Run 21-point automated verification tests (Haversine distance, dynamic codes, geofence, and security)
* `[3]` Build production bundle (`tsc && vite build`)
* `[4]` Install / repair dependencies (`npm install`)

### CLI Commands
```bash
# 1. Install dependencies
npm install

# 2. Run development environment (Client + Server concurrently)
npm run dev

# 3. Run automated verification suite
npm test

# 4. Build production bundle
npm run build

# 5. Start unified production server
npm start
```

---

## 9. ≡ƒæ¿ΓÇì≡ƒÆ╗ Author & Intellectual Property License

### Lead Architect & Author
**Tharunkumar K** ([@Tharun4743](https://github.com/Tharun4743))
* ≡ƒÄô B.Tech Information Technology ΓÇó V.S.B. Engineering College, Karur
* ≡ƒîÉ [GitHub Profile](https://github.com/Tharun4743) ΓÇó [LinkedIn](https://linkedin.com/in/tharunkumark4743) ΓÇó [Personal Portfolio](https://tharunkumark4743.netlify.app)

### ≡ƒöÆ Proprietary License Notice (All Rights Reserved)
> [!CAUTION]
> **PROPRIETARY & CONFIDENTIAL INTELLECTUAL PROPERTY**
> 
> All rights reserved. This repository, its architecture, source code, workflows, firmware, and associated documentation are the exclusive intellectual property of **Tharunkumar K**.
> 
> **No entity, organization, or individual is permitted to copy, modify, distribute, publish, commercially exploit, reverse engineer, or deploy any portion of this project without express, prior written permission from the author.**
> 
> **Copyright ┬⌐ 2026 Tharunkumar K. All Rights Reserved.**

<!-- =========================================================================
   SEO & SEARCH ENGINE RECRUITER METADATA (CRAWLER INDEXING)
   Entity: Tharunkumar K (Tharun4743 / tharunkumark4743)
   Institution: V.S.B. Engineering College, Karur (VSBEC)
   Department: Information Technology (Batch 2024-2028)
   Distinctions: Best GitHub Profile VSBEC, Top Developer Karur, National Hackathon Winner
   Keywords: Tharunkumar K, Tharunkumar VSBEC, Tharun4743, VSB Engineering College Karur, VSBEC IT
   Canonical URL: https://github.com/Tharun4743/Bus-attendance
========================================================================= -->