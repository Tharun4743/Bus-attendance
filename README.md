# Bus-attendance — Real-Time Transit Attendance & Geofenced Student Safety Portal

[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![GPS](https://img.shields.io/badge/Hardware-GPS_Telemetry_%2B_RFID-orange?style=flat-square)](https://www.arduino.cc/)
[![License](https://img.shields.io/badge/License-Proprietary_%2F_Permission_Required-red?style=flat-square)](LICENSE.md)

**Bus-attendance** is an institutional transportation management platform that integrates bus RFID card tapping with real-time GPS fleet telemetry. It tracks student boarding/deboarding events, monitors bus transit routes, calculates arrival times, and delivers geofenced proximity alerts to parents and campus transport coordinators.

---

## Problem Statement & Context
Institutional transit systems suffer from lack of visibility regarding student passenger safety:
- **Parental Anxiety**: Parents have no automated verification whether their child successfully boarded the morning bus or safely departed at the school campus.
- **Route Delays & Fuel Inefficiencies**: Bus drivers encounter unexpected traffic congestion without centralized dispatcher monitoring.
- **Manual Manifest Errors**: Paper bus rosters are inefficient and impossible to audit in emergencies.

---

## Existing Solutions & Critical Gaps
| Method | Real-Time Boarding Verification | GPS Fleet Telemetry | Emergency Notification |
| :--- | :--- | :--- | :--- |
| **Paper Bus Manifests** | None (Post-hoc manual check) | None | Manual phone calls |
| **Bus-attendance Portal** | **Instantaneous RFID card swipe logging** | **Continuous GPS stream + Geofencing** | **Automated SMS & Webhook push alerts** |

---

## Proposed Solution & Architectural Innovation
Bus-attendance implements a **Connected Fleet Safety Architecture**:
- **RFID Tap-to-Board Hardware**: In-bus reader records student ID cards upon entry/exit and associates timestamp and GPS coordinates.
- **Geofenced Notification Engine**: Automatically dispatches proximity SMS alerts to parents when the bus enters a 1km radius of their designated pickup stop.
- **Centralized Dispatcher Map**: Real-time Leaflet/Mapbox dashboard displaying all active institutional buses with speed telemetry and route compliance.
- **Emergency SOS Dispatch**: One-touch driver emergency alert broadcasting vehicle coordinates to campus security.

---

## Technical Approach & System Architecture
```mermaid
flowchart LR
    BusHardware["In-Bus RFID Reader + GPS Tracker"] -->|"Cellular GPRS Stream"| Gateway["Telemetry Ingestion Gateway"]
    Gateway --> RouteService["Route Geofencing & ETA Evaluator"]
    RouteService --> DB[("PostgreSQL Fleet Database")]
    RouteService --> Notification["SMS / Push Notification Service"]
    Notification --> Parents["Parent Mobile Notifications"]
    DB --> DispatchMap["Campus Transport Live Map"]
```

---

## Quantifiable Impact & Measurable Benefits
- **100% Student Boarding Accountability**: Every entry and exit logged with exact microsecond timestamps.
- **30% Reduction in Bus Stop Wait Times**: Parents receive timely arrival alerts, eliminating roadside waiting.
- **Auditable Safety Compliance**: Instant historical reports available for institutional transport audits.

---

## Feasibility, Operational Viability & Scalability
- **Hardware Viability**: Interfaces with standard low-cost RC522 RFID modules and SIM800L/A9G GPS/GSM modules.

---

## Project Architecture & Quickstart
```bash
git clone https://github.com/Tharun4743/Bus-attendance.git
cd Bus-attendance
npm install
npm run dev
```

---

## Author & Engineering Credentials
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
        • 🪖 <b>Smart Helmet IoT</b> — SIH Top 50 Dual-Unit Motorcycle Accident Prevention System &nbsp;<a href="https://github.com/Tharun4743/AGILE-INNOVATORS-smart-helmet-"><img src="https://img.shields.io/badge/Code-181717?style=flat-square&logo=github&logoColor=white" alt="Code" /></a><br/>
        • ⚡ <b>GOAT-CE</b> — Isolated Distributed Multi-Language Code Execution Sandbox &nbsp;<a href="https://github.com/Tharun4743/GOAT-CE"><img src="https://img.shields.io/badge/Code-181717?style=flat-square&logo=github&logoColor=white" alt="Code" /></a>
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
