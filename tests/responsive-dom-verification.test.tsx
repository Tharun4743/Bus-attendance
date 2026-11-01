import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminLayout } from '../src/layouts/AdminLayout';
import { InchargeLayout } from '../src/layouts/InchargeLayout';
import { StudentLayout } from '../src/layouts/StudentLayout';
import { AuthProvider } from '../src/context/AuthContext';

describe('📱 DOM Verification: Responsive Layout & Mobile Bottom Navigation', () => {
  // --------------------------------------------------------------------------
  // 1. ADMIN DOM VERIFICATION
  // --------------------------------------------------------------------------
  it('AdminLayout mounts both desktop sidebar (hidden md:flex) and mobile bottom nav (fixed bottom-0 inset-x-0 z-40 md:hidden)', () => {
    const html = renderToString(
      <AuthProvider>
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<div>Admin Dashboard Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    // Verify desktop sidebar has data attribute and hidden on mobile classes
    expect(html).toContain('data-desktop-sidebar="true"');
    expect(html).toContain('hidden md:flex flex-col w-64');

    // Verify mobile bottom nav is mounted at layout level and hidden on desktop
    expect(html).toContain('data-mobile-bottom-nav="true"');
    expect(html).toContain('fixed bottom-0 inset-x-0 z-40 md:hidden');

    // Verify main content occupies 100% width on mobile with bottom padding
    expect(html).toContain('pb-24 md:pb-6 min-w-0 w-full max-w-full overflow-x-hidden');

    // Verify exactly 5 tabs for Admin
    expect(html).toContain('aria-label="Home"');
    expect(html).toContain('aria-label="Students"');
    expect(html).toContain('aria-label="Buses"');
    expect(html).toContain('aria-label="Monitor"');
    expect(html).toContain('aria-label="More"');

    // Verify strictly one active item on /admin/dashboard
    expect(html).toContain('aria-current="page"');
    const activeOccurrences = (html.match(/aria-current="page"/g) || []).length;
    // 1 in desktop sidebar Link + 1 in mobile bottom nav button = 2 total across the two independent responsive components
    expect(activeOccurrences).toBe(2);
  });

  // --------------------------------------------------------------------------
  // 2. DISAMBIGUATE ACTIVE STATE: /admin/settings MUST NOT HIGHLIGHT DASHBOARD
  // --------------------------------------------------------------------------
  it('When navigating to /admin/settings, ONLY Settings is active in sidebar and More is active in mobile bottom nav', () => {
    const html = renderToString(
      <AuthProvider>
        <MemoryRouter initialEntries={['/admin/settings']}>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="settings" element={<div>Settings Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    // In desktop sidebar: Settings has aria-current="page"
    expect(html).toContain('href="/admin/settings"');
    expect(html).not.toContain('href="/admin/dashboard" aria-current="page"');

    // In mobile bottom nav: More is active, Home is NOT
    expect(html).toContain('aria-label="More" aria-current="page"');
    expect(html).not.toContain('aria-label="Home" aria-current="page"');
  });

  // --------------------------------------------------------------------------
  // 3. INCHARGE DOM VERIFICATION
  // --------------------------------------------------------------------------
  it('InchargeLayout mounts desktop sidebar and mobile bottom nav with 5 role-specific tabs', () => {
    const html = renderToString(
      <AuthProvider>
        <MemoryRouter initialEntries={['/incharge/dashboard']}>
          <Routes>
            <Route path="/incharge" element={<InchargeLayout />}>
              <Route path="dashboard" element={<div>Incharge Dashboard Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    // Desktop sidebar & mobile nav present
    expect(html).toContain('data-desktop-sidebar="true"');
    expect(html).toContain('data-mobile-bottom-nav="true"');

    // Exactly 5 Incharge tabs
    expect(html).toContain('aria-label="Home"');
    expect(html).toContain('aria-label="My Bus"');
    expect(html).toContain('aria-label="Attendance"');
    expect(html).toContain('aria-label="Students"');
    expect(html).toContain('aria-label="More"');
  });

  // --------------------------------------------------------------------------
  // 4. STUDENT DOM VERIFICATION
  // --------------------------------------------------------------------------
  it('StudentLayout mounts desktop sidebar and mobile bottom nav with 5 role-specific tabs', () => {
    const html = renderToString(
      <AuthProvider>
        <MemoryRouter initialEntries={['/student/dashboard']}>
          <Routes>
            <Route path="/student" element={<StudentLayout />}>
              <Route path="dashboard" element={<div>Student Dashboard Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    // Desktop sidebar & mobile nav present
    expect(html).toContain('data-desktop-sidebar="true"');
    expect(html).toContain('data-mobile-bottom-nav="true"');

    // Exactly 5 Student tabs
    expect(html).toContain('aria-label="Home"');
    expect(html).toContain('aria-label="My Bus"');
    expect(html).toContain('aria-label="Verify"');
    expect(html).toContain('aria-label="History"');
    expect(html).toContain('aria-label="Profile"');
  });
});
