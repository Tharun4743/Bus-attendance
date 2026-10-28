import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('⚡ Responsive Layouts, Stat Cards, and Session Launcher Verification Suite', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('R1: Layout containers utilize widescreen displays with max-w-[1600px]', () => {
    const adminLayout = fs.readFileSync(path.join(rootDir, 'src/layouts/AdminLayout.tsx'), 'utf-8');
    const inchargeLayout = fs.readFileSync(path.join(rootDir, 'src/layouts/InchargeLayout.tsx'), 'utf-8');
    const studentLayout = fs.readFileSync(path.join(rootDir, 'src/layouts/StudentLayout.tsx'), 'utf-8');
    const navbar = fs.readFileSync(path.join(rootDir, 'src/components/common/Navbar.tsx'), 'utf-8');

    // Admin layout should be expanded from 1440px to 1600px
    expect(adminLayout).toContain('max-w-[1600px]');
    expect(adminLayout).not.toContain('max-w-[1440px]');

    // Incharge layout should NOT be cramped at max-w-4xl
    expect(inchargeLayout).toContain('max-w-[1600px]');
    expect(inchargeLayout).not.toContain('max-w-4xl');

    // Student layout should NOT be cramped at max-w-2xl
    expect(studentLayout).toContain('max-w-[1600px]');
    expect(studentLayout).not.toContain('max-w-2xl');

    // Navbar aligns with the 1600px layout width
    expect(navbar).toContain('max-w-[1600px]');
    expect(navbar).not.toContain('max-w-[1440px]');
  });

  it('R1: All dashboard and admin pages expand to utilize widescreen width effectively without narrow bottlenecks', () => {
    const inchargeDash = fs.readFileSync(path.join(rootDir, 'src/pages/incharge/InchargeDashboard.tsx'), 'utf-8');
    const adminDash = fs.readFileSync(path.join(rootDir, 'src/pages/admin/AdminDashboard.tsx'), 'utf-8');
    const attendanceHub = fs.readFileSync(path.join(rootDir, 'src/pages/admin/AttendanceHub.tsx'), 'utf-8');
    const studentDash = fs.readFileSync(path.join(rootDir, 'src/pages/student/StudentDashboard.tsx'), 'utf-8');
    const busesMgmt = fs.readFileSync(path.join(rootDir, 'src/pages/admin/BusesManagement.tsx'), 'utf-8');
    const studentApprovals = fs.readFileSync(path.join(rootDir, 'src/pages/admin/StudentApprovals.tsx'), 'utf-8');
    const studentsMgmt = fs.readFileSync(path.join(rootDir, 'src/pages/admin/StudentsManagement.tsx'), 'utf-8');
    const geofenceSettings = fs.readFileSync(path.join(rootDir, 'src/pages/admin/GeofenceSettings.tsx'), 'utf-8');
    const notificationsPage = fs.readFileSync(path.join(rootDir, 'src/pages/admin/NotificationsPage.tsx'), 'utf-8');

    expect(inchargeDash).toContain('max-w-[1600px]');
    expect(adminDash).toContain('max-w-[1600px]');
    expect(attendanceHub).toContain('max-w-[1600px]');
    expect(studentDash).toContain('max-w-[1600px]');
    expect(busesMgmt).toContain('max-w-[1600px]');
    expect(studentApprovals).toContain('max-w-[1600px]');
    expect(studentsMgmt).toContain('max-w-[1600px]');

    // Confirm GeofenceSettings and NotificationsPage were also expanded to eliminate 4xl bottlenecks
    expect(geofenceSettings).toContain('max-w-[1600px]');
    expect(geofenceSettings).not.toContain('max-w-4xl');
    expect(notificationsPage).toContain('max-w-[1600px]');
    expect(notificationsPage).not.toContain('max-w-4xl');
  });

  it('R2: KPI StatCard does not truncate titles or values with ellipsis', () => {
    const statCard = fs.readFileSync(path.join(rootDir, 'src/components/ui/StatCard.tsx'), 'utf-8');

    // Should NOT have truncate on the title
    expect(statCard).not.toContain('truncate');
    // Should have break-words and leading-snug for legibility
    expect(statCard).toContain('break-words');
    expect(statCard).toContain('leading-snug');
    expect(statCard).toContain('flex-1');
    // Numeric/stat values must not break mid-value
    expect(statCard).toContain('whitespace-nowrap');
    // Responsive tracking to prevent word breaking on ultra-narrow screens
    expect(statCard).toContain('tracking-tight sm:tracking-wider');
  });

  it('R2: Admin and AttendanceHub metrics grids use xl:grid-cols-4 to prevent sidebar squeeze on 1024px desktop', () => {
    const adminDash = fs.readFileSync(path.join(rootDir, 'src/pages/admin/AdminDashboard.tsx'), 'utf-8');
    const attendanceHub = fs.readFileSync(path.join(rootDir, 'src/pages/admin/AttendanceHub.tsx'), 'utf-8');

    // With 240px sidebar, 4 columns at 1024px squishes cards to 172px with only 72px for text.
    // Switching to 4 columns at xl: (1280px+) ensures generous card width on all desktop viewports.
    expect(adminDash).toContain('grid grid-cols-2 xl:grid-cols-4');
    expect(attendanceHub).toContain('grid grid-cols-2 xl:grid-cols-4');
  });

  it('R3: Session launcher toolbar in InchargeDashboard aligns in single row on desktop and wraps responsively on mobile', () => {
    const inchargeDash = fs.readFileSync(path.join(rootDir, 'src/pages/incharge/InchargeDashboard.tsx'), 'utf-8');

    // Idle session card flex layout provides full width for title on 1024px desktop and side-by-side on xl
    expect(inchargeDash).toContain('flex flex-col xl:flex-row xl:items-center justify-between gap-4');

    // Toolbar container supports clean wrapping on mobile and nowrap on desktop/tablet
    expect(inchargeDash).toContain('flex-wrap sm:flex-nowrap');
    expect(inchargeDash).toContain('shrink-0');

    // Select dropdown is full width on mobile, auto on desktop
    expect(inchargeDash).toContain('w-full sm:w-auto text-xs font-bold');

    // Mode action buttons have correct label content
    expect(inchargeDash).toContain('🛑 Stationary Bay (~35m)');
    expect(inchargeDash).toContain('🚌 Travelling Transit (~1000m)');

    // Action buttons adapt responsively: full-width on mobile to prevent clipping, and nowrap on desktop for single clean row
    expect(inchargeDash).toContain('w-full sm:w-auto');
    expect(inchargeDash).toContain('sm:whitespace-nowrap sm:shrink-0');
  });

  it('R4: Layouts contain responsive overflow protection', () => {
    const adminLayout = fs.readFileSync(path.join(rootDir, 'src/layouts/AdminLayout.tsx'), 'utf-8');
    const inchargeLayout = fs.readFileSync(path.join(rootDir, 'src/layouts/InchargeLayout.tsx'), 'utf-8');
    const studentLayout = fs.readFileSync(path.join(rootDir, 'src/layouts/StudentLayout.tsx'), 'utf-8');

    expect(adminLayout).toContain('overflow-x-hidden');
    expect(adminLayout).toContain('min-w-0');
    expect(inchargeLayout).toContain('overflow-x-hidden');
    expect(inchargeLayout).toContain('min-w-0');
    expect(studentLayout).toContain('overflow-x-hidden');
    expect(studentLayout).toContain('min-w-0');
  });

  it('R2 Deep Verification: StatCard renders full text for all KPI metrics without truncation', async () => {
    const { renderToString } = await import('react-dom/server');
    const React = await import('react');
    const { StatCard } = await import('../src/components/ui/StatCard');

    const testMetrics = [
      { title: 'ASSIGNED BUSES', value: 12, subtitle: 'Fleet in Service', color: 'indigo' as const },
      { title: 'ASSIGNED COMMUTERS', value: '1,250', subtitle: 'Registered to Bus', color: 'indigo' as const },
      { title: 'VERIFIED PRESENT', value: '1,180', subtitle: 'Face / Phone Verified', color: 'emerald' as const },
      { title: 'UNVERIFIED / ABSENT', value: 70, subtitle: 'Pending Boarding', color: 'rose' as const },
      { title: 'TURNOUT RATE', value: '94.4%', subtitle: "Today's Attendance Rate", color: 'blue' as const },
    ];

    for (const m of testMetrics) {
      const html = renderToString(
        React.createElement(StatCard, {
          title: m.title,
          value: m.value,
          icon: React.createElement('span', null, 'ICON'),
          color: m.color,
          subtitle: m.subtitle,
        })
      );

      // Verify complete title text is rendered without truncation
      expect(html).toContain(m.title);
      expect(html).toContain(String(m.value));
      expect(html).toContain(m.subtitle.replace(/'/g, '&#x27;'));
      // Verify truncation class is completely absent
      expect(html).not.toContain('truncate');
      // Verify critical responsiveness and wrapping classes
      expect(html).toContain('break-words');
      expect(html).toContain('whitespace-nowrap');
      expect(html).toContain('leading-snug');
    }
  });

  it('R2 Deep Verification: StatCard handles all color variants and edge cases', async () => {
    const { renderToString } = await import('react-dom/server');
    const React = await import('react');
    const { StatCard } = await import('../src/components/ui/StatCard');

    const colors = ['blue', 'emerald', 'amber', 'indigo', 'rose'] as const;
    for (const color of colors) {
      const html = renderToString(
        React.createElement(StatCard, {
          title: 'TEST METRIC',
          value: 0,
          icon: React.createElement('span', null, '★'),
          color,
        })
      );
      expect(html).toContain('TEST METRIC');
      expect(html).toContain('0');
      expect(html).not.toContain('truncate');
    }

    // Edge case: No subtitle
    const noSubHtml = renderToString(
      React.createElement(StatCard, {
        title: 'ZERO STATE',
        value: '0%',
        icon: React.createElement('span', null, '0'),
      })
    );
    expect(noSubHtml).toContain('ZERO STATE');
    expect(noSubHtml).toContain('0%');
    expect(noSubHtml).not.toContain('undefined');
  });
});
