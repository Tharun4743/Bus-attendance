# ⚡ Commuter Portal Automated Testing Infrastructure (TEST_INFRA.md)

## 1. Overview & Architecture

The Commuter Portal automated test suite is built on **Vitest v1.6.1** running under **Node.js** with strict **TypeScript 5.4** type checking. It is designed around an **opaque-box 4-tier testing methodology** that verifies the application's mobile navigation, performance, session resiliency, geofencing, and role-based access control (RBAC) boundaries without relying on facade assertions or fragile internal mocks.

### Test Runner Specifications
- **Runner**: Vitest v1.6.1 (`vitest run`)
- **Execution Script**: `npm test`
- **Compiler**: TypeScript 5.4.5 (`npx tsc --noEmit` clean)
- **Environment**: Node.js v20+ with simulated browser/network environments
- **Storage Strategy**: `MemoryStorageAdapter` for clean, isolated, zero-latency database simulation during test execution

---

## 2. 4-Tier Opaque-Box Testing Methodology

```
┌─────────────────────────────────────────────────────────────────┐
│ Tier 4: Real-World Scenarios (Mobile E2E User Journeys)         │
│   • Admin Full Operational Journey                              │
│   • Bus In-Charge Attendance & Fleet Workflow                   │
│   • Student Geofence Check-in & History Flow                    │
├─────────────────────────────────────────────────────────────────┤
│ Tier 3: Cross-Feature Combinations (Pairwise Interactions)      │
│   • Bottom Nav + Modal Layering (z-50 over z-40)               │
│   • Tab Switching during In-Flight Data Loads                   │
│   • Polling Loop Halting on 401 Expiration                      │
│   • Cross-Role Endpoint Rejection Matrix                        │
│   • Roster Payload Pruning (Face Vector Exclusion)              │
├─────────────────────────────────────────────────────────────────┤
│ Tier 2: Boundary & Corner Cases                                 │
│   • Viewport Transitions (767px Mobile vs 768px Desktop)        │
│   • Safe Area Insets (env(safe-area-inset-bottom))              │
│   • Tampered, Expired, and Revoked JWT Handling                 │
│   • Concurrent In-Flight Request Deduplication                 │
│   • Empty Student Rosters & Unassigned Entities                 │
│   • Rapid Tab Navigation Debouncing                             │
├─────────────────────────────────────────────────────────────────┤
│ Tier 1: Feature Coverage (Component & Module Isolation)         │
│   • Role-Based Mobile Bottom Nav (Admin, Incharge, Student)    │
│   • Single Active Tab Disambiguation Guarantee                  │
│   • Desktop Sidebar Hiding on Mobile (hidden md:flex)           │
│   • Persistent Bottom Nav Outside Outlet                        │
│   • Content Overlap Prevention (pb-24 padding)                  │
│   • 401 Interceptor and Token Lifecycle                         │
│   • Skeleton Loading Fallback Coverage                          │
└─────────────────────────────────────────────────────────────────┘
```

### Tier 1: Feature Coverage (Isolation)
Tests individual features, layout containers, and components in isolation to verify contract conformance:
- **Role Tabs**: Exactly 5 tabs configured per role:
  - **Admin**: Home (`/admin/dashboard`), Students (`/admin/students`), Buses (`/admin/buses`), Monitor (`/admin/live-monitoring`), More (`/admin/more`).
  - **Bus In-Charge**: Home (`/incharge/dashboard`), My Bus (`/incharge/my-bus`), Attendance (`/incharge/attendance`), Students (`/incharge/students`), More (`/incharge/more`).
  - **Student**: Home (`/student/dashboard`), My Bus (`/student/my-bus`), Verify (`/student/verify`), History (`/student/history`), Profile (`/student/profile`).
- **Disambiguation**: Single active tab guarantee using `getActiveNavPath` to prevent multi-tab active collisions (e.g. `/admin/dashboard` vs `/admin/incharges`).
- **Responsive Layout**: Sidebar hidden on mobile (`hidden md:flex`), bottom nav hidden on desktop (`md:hidden`).
- **Layout Persistence**: `<MobileBottomNav />` rendered outside `<Outlet />` to prevent unmounting during page transitions.
- **Content Clearance**: Content containers enforce `pb-24 md:pb-6` padding to eliminate bottom nav overlap.
- **Auth Tokens**: Cryptographic Bearer token handling and 401 rejection for unauthenticated requests.
- **Skeletons**: Page fallback and dedicated skeletons (`AdminMoreSkeleton`, `InchargeMoreSkeleton`, `StudentMoreSkeleton`, `PageFallback`).

### Tier 2: Boundary & Corner Cases
Tests system behavior at extreme boundaries, invalid inputs, and stressful conditions:
- **Viewport Boundary**: 767px (max mobile boundary) displays MobileBottomNav and hides desktop sidebar; 768px (min desktop boundary) displays sidebar and hides MobileBottomNav.
- **Safe Area Insets**: `viewport-fit=cover` in `index.html` and `paddingBottom: max(0.5rem, env(safe-area-inset-bottom))` in navigation components.
- **Security Edge Cases**: Expired tokens, revoked JTIs, tampered signatures, and malformed strings immediately rejected with HTTP 401.
- **Concurrency**: High-concurrency requests are deduplicated through promise memoization (`inFlightRequests`), executing the underlying network operation exactly once.
- **Empty State**: Zero-student bus rosters, students without assigned buses, and in-charges assigned to non-existent buses handled without throwing unhandled exceptions.
- **Rapid Navigation**: Sequential rapid tab transitions settle accurately onto the final route without ghost active states.

### Tier 3: Cross-Feature Combinations (Pairwise Interactions)
Tests the interaction between two or more system capabilities simultaneously:
- **Bottom Nav + Modals**: Mobile verification modals and dialogs use `z-50`, cleanly overlaying the `z-40` fixed bottom navigation bar.
- **Navigation + In-Flight API**: Tab navigation triggered while an asynchronous API query is pending does not produce memory leaks or state corruption.
- **Polling + Auth Expiration**: Background polling encountering an expired or revoked session token immediately ceases polling to prevent 401 retry storms.
- **Cross-Role Encroachment**: Authenticated users attempting to call APIs or navigate routes outside their role boundary are blocked with HTTP 403 on the server and redirected to their home dashboard on the client.
- **Roster Bandwidth Optimization**: Commuter roster queries exclude heavy 128-D vector arrays (`faceDescriptor`), transmitting only essential commuter metadata for high-speed mobile loading.

### Tier 4: Real-World Application Scenarios (End-to-End User Journeys)
Tests complete multi-step workflows representing actual day-to-day user journeys on mobile viewports:
- **Administrator Journey**: Authenticates -> Inspects dashboard -> Reviews pending registrations -> Approves commuter and assigns bus -> Inspects fleet status -> Monitors live transit -> Explores More settings -> Logs out with token revocation.
- **Bus In-Charge Journey**: Authenticates -> Verifies assigned bus and commuter roster -> Initiates ground attendance session -> Verifies active session registration in storage -> Concludes attendance session -> Reviews history/reports -> Logs out.
- **Student Commuter Journey**: Authenticates -> Inspects commuter dashboard -> Confirms bus assignment -> Navigates to verify attendance -> Submits GPS location within geofence radius -> Verification succeeds with `PRESENT` status -> Idempotent re-verification preserves status -> Confirms attendance record in history -> Checks profile -> Logs out.

---

## 3. Test File Catalog & Inventory

| File Path | Tier Focus | Tests Count | Scope |
|:---|:---:|:---:|:---|
| `tests/e2e-commuter-portal.test.ts` | Tier 1 & 2 | 15 | Role bottom navs, single active tab, responsive layout, safe area, 401 handling, skeletons, viewport boundary (767px/768px), token tampering, request deduplication, empty rosters, rapid tab switching |
| `tests/audit-verification.test.ts` | Tier 3 & 4 | 9 | Modal z-index stacking (z-50 over z-40), navigation during data loading, polling termination on 401, cross-role isolation, face vector exclusion, full Admin journey, full In-Charge journey, full Student journey |
| `tests/mobile-bottom-navigation.test.ts` | Tier 1 | 9 | Role tab declarations, viewport classes, layout structure, more screens, permission restrictions |
| `tests/navigation-active-state.test.ts` | Tier 1 | 20 | Route disambiguation, alias resolution, nested route boundary matches, trailing slash handling |
| `tests/geofence-haversine.test.ts` | Tier 2 | 15 | Haversine formula distance precision, boundary tolerances, GPS accuracy filtering, campus boundary checks |
| `tests/auth-concurrency-dedup.test.ts` | Tier 2 & 3 | 5 | Cryptographic JTI uniqueness, session revocation, multi-device isolation, promise deduplication |
| `tests/auth-otp-lifecycle.test.ts` | Tier 1 & 2 | 14 | 6-digit cryptographic OTP generation, 10-minute expiry, attempt rate limiting, password reset lifecycle |
| `tests/rbac-route-guards.test.ts` | Tier 1 & 3 | 17 | Token claims verification, route guard middleware, persona restrictions, fleet isolation |
| **Total Test Suite** | **Tiers 1–4** | **104** | **100% Comprehensive Opaque-Box E2E Coverage** |

---

## 4. Execution Commands

### Execute Full Test Suite
```bash
npm test
```
*Executes `vitest run`, compiling and running all 8 test files synchronously.*

### Execute E2E Commuter Portal Suite Only
```bash
npx vitest run tests/e2e-commuter-portal.test.ts
```

### Execute Audit Verification Suite Only
```bash
npx vitest run tests/audit-verification.test.ts
```

### Execute TypeScript Type Checking
```bash
npx tsc --noEmit
```

---

## 5. Quality Thresholds & Safety Directives

1. **Pass Rate Threshold**: 100% (All 104 tests must pass cleanly).
2. **Zero-Secret Compliance**: No live credentials, passwords, or production API keys are committed or used in test fixtures.
3. **Zero Facade Tolerance**: Tests execute real application business logic, storage adapters, cryptographic token operations, and layout contracts.
4. **Deterministic Isolation**: Tests do not share mutable state; each test initializes its own isolated storage adapter and personas.
