# 🚌 College Bus Attendance System — Real-Time Fleet Transit & Student Presence PWA
### *Progressive Web Application for Morning & Evening Transit Attendance Verification, Route Roster Tracking & Fleet Analytics*

<p align="center">
  <a href="https://github.com/Tharun4743/bus-attendance"><b>📦 GitHub Repository</b></a>
  • <a href="https://bus-attendance.vercel.app/"><b>🌐 Live Demo</b></a>
</p>

---

## 1. 📌 Problem Statement
College transport departments manage hundreds of daily student bus commuters using manual paper logbooks or scattered WhatsApp messages. Bus in-charges struggle to verify whether students boarded their designated morning/evening routes, leading to safety blind spots and parental anxiety.

---

## 2. 🔍 Existing Solutions & Critical Gaps
Hardware RFID card systems require expensive on-bus physical scanners that break down frequently, while manual paper checklists cannot provide transport administrators with live route occupancy data.

---

## 3. 💡 Proposed Solution
A responsive Web Application and Progressive Web App (PWA) designed for campus bus in-charges and transport administrators. Features rapid one-tap student boarding verification, morning/evening session toggling, route-scoped student rosters, and instant cloud synchronization.

---

## 4. ⚙️ Technical Approach & System Architecture
* **Frontend & PWA:** TypeScript, React, Vite, Tailwind CSS, Service Workers for offline-capable PWA installation on driver/staff mobile phones.
* **Backend & Database:** Node.js, Express, PostgreSQL / Supabase for real-time attendance logs and route allocation tables.
* **Offline Capabilities:** IndexedDB caching allowing attendance logging even in cellular dead zones, syncing automatically when connectivity resumes.

---

## 5. 📈 Impact & Measurable Benefits
* **100% Verified Fleet Accountability:** Eliminates paper logs and gives transport administrators a live dashboard of seated vs. absent students per route.
* **Zero Hardware Costs:** Operates directly on standard staff smartphones via PWA without purchasing expensive RFID terminals.
* **Enhanced Campus Safety:** Provides immediate records of student transit status in emergencies.

---

## 6. 🚀 Feasibility & Viability Analysis
* **Technical:** Service worker offline caching ensures flawless operation along remote highway corridors.
* **Economic:** Extremely cheap to operate for colleges compared to dedicated IoT transit hardware.
* **Scalability:** Easily handles dozens of bus routes and thousands of student commuters simultaneously.

---

## 7. 👨‍💻 Author & Intellectual Property License

### Lead Architect & Author
**Tharunkumar K** ([@Tharun4743](https://github.com/Tharun4743))
* B.Tech Information Technology • V.S.B. Engineering College, Karur
* [GitHub Profile](https://github.com/Tharun4743) • [LinkedIn](https://linkedin.com/in/tharunkumark4743) • [Portfolio](https://tharunkumark4743.netlify.app)

### 🔒 Proprietary License Notice (All Rights Reserved)
> [!CAUTION]
> **PROPRIETARY & CONFIDENTIAL INTELLECTUAL PROPERTY**
> 
> All rights reserved. This repository, its architecture, source code, workflows, firmware, and associated documentation are the exclusive intellectual property of **Tharunkumar K**.
> 
> **No entity, organization, or individual is permitted to copy, modify, distribute, publish, commercially exploit, reverse engineer, or deploy any portion of this project without express, prior written permission from the author.**
> 
> **Copyright © 2026 Tharunkumar K. All Rights Reserved.**
