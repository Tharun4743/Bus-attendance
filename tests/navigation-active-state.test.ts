import { describe, it, expect } from 'vitest';
import { getActiveNavPath, NavPathItem } from '../src/utils/navigation';

describe('⚡ Navigation Active-State Resolver (Single Active Navigation Guarantee)', () => {
  const adminNavItems: NavPathItem[] = [
    { to: '/admin/dashboard', aliases: ['/admin'] },
    { to: '/admin/students', aliases: ['/admin/approvals'] },
    { to: '/admin/buses', aliases: ['/admin/assignments'] },
    { to: '/admin/incharges' },
    { to: '/admin/live-monitoring' },
    { to: '/admin/reports', aliases: ['/admin/attendance', '/admin/attendance/history', '/admin/attendance-history'] },
    { to: '/admin/settings', aliases: ['/admin/ground-settings', '/admin/settings/geofence'] },
  ];

  const inchargeNavItems: NavPathItem[] = [
    { to: '/incharge/dashboard', aliases: ['/incharge'] },
    { to: '/incharge/my-bus', aliases: ['/incharge/bus'] },
    { to: '/incharge/live-attendance', aliases: ['/incharge/attendance'] },
    { to: '/incharge/start-attendance' },
    { to: '/incharge/students' },
    { to: '/incharge/history' },
    { to: '/incharge/reports' },
    { to: '/incharge/profile' },
  ];

  const studentNavItems: NavPathItem[] = [
    { to: '/student/dashboard', aliases: ['/student'] },
    { to: '/student/my-bus', aliases: ['/student/bus'] },
    { to: '/student/verify', aliases: ['/student/verify-attendance'] },
    { to: '/student/history', aliases: ['/student/attendance-history'] },
    { to: '/student/profile' },
    { to: '/student/notifications' },
  ];

  // --------------------------------------------------------------------------
  // 1. ADMIN DISAMBIGUATION (Fixing Dashboard + In-Charges simultaneous active bug)
  // --------------------------------------------------------------------------
  describe('Admin Portal Route Disambiguation', () => {
    it('accurately resolves /admin/incharges to ONLY /admin/incharges, never /admin/dashboard', () => {
      const active = getActiveNavPath('/admin/incharges', adminNavItems, '/admin/dashboard');
      expect(active).toBe('/admin/incharges');
      expect(active).not.toBe('/admin/dashboard');
    });

    it('accurately resolves /admin/dashboard to ONLY /admin/dashboard', () => {
      const active = getActiveNavPath('/admin/dashboard', adminNavItems, '/admin/dashboard');
      expect(active).toBe('/admin/dashboard');
    });

    it('resolves bare /admin root path to /admin/dashboard via alias', () => {
      const active = getActiveNavPath('/admin', adminNavItems, '/admin/dashboard');
      expect(active).toBe('/admin/dashboard');
    });

    it('resolves /admin/buses to ONLY /admin/buses', () => {
      const active = getActiveNavPath('/admin/buses', adminNavItems, '/admin/dashboard');
      expect(active).toBe('/admin/buses');
    });

    it('resolves nested /admin/students/edit/42 to /admin/students via slash boundary', () => {
      const active = getActiveNavPath('/admin/students/edit/42', adminNavItems, '/admin/dashboard');
      expect(active).toBe('/admin/students');
    });

    it('resolves /admin/ground-settings alias to /admin/settings', () => {
      const active = getActiveNavPath('/admin/ground-settings', adminNavItems, '/admin/dashboard');
      expect(active).toBe('/admin/settings');
    });

    it('resolves /admin/attendance-history alias to /admin/reports', () => {
      const active = getActiveNavPath('/admin/attendance-history', adminNavItems, '/admin/dashboard');
      expect(active).toBe('/admin/reports');
    });

    it('handles trailing slashes cleanly: /admin/incharges/', () => {
      const active = getActiveNavPath('/admin/incharges/', adminNavItems, '/admin/dashboard');
      expect(active).toBe('/admin/incharges');
    });
  });

  // --------------------------------------------------------------------------
  // 2. IN-CHARGE ROUTE RESOLUTION
  // --------------------------------------------------------------------------
  describe('Bus In-charge Route Disambiguation', () => {
    it('resolves /incharge to /incharge/dashboard', () => {
      const active = getActiveNavPath('/incharge', inchargeNavItems, '/incharge/dashboard');
      expect(active).toBe('/incharge/dashboard');
    });

    it('resolves /incharge/live-attendance to /incharge/live-attendance', () => {
      const active = getActiveNavPath('/incharge/live-attendance', inchargeNavItems, '/incharge/dashboard');
      expect(active).toBe('/incharge/live-attendance');
    });

    it('resolves /incharge/start-attendance to /incharge/start-attendance (NOT live-attendance)', () => {
      const active = getActiveNavPath('/incharge/start-attendance', inchargeNavItems, '/incharge/dashboard');
      expect(active).toBe('/incharge/start-attendance');
    });

    it('resolves /incharge/reports to /incharge/reports', () => {
      const active = getActiveNavPath('/incharge/reports', inchargeNavItems, '/incharge/dashboard');
      expect(active).toBe('/incharge/reports');
    });

    it('resolves /incharge/profile to /incharge/profile', () => {
      const active = getActiveNavPath('/incharge/profile', inchargeNavItems, '/incharge/dashboard');
      expect(active).toBe('/incharge/profile');
    });
  });

  // --------------------------------------------------------------------------
  // 3. STUDENT ROUTE RESOLUTION
  // --------------------------------------------------------------------------
  describe('Student Route Disambiguation', () => {
    it('resolves /student to /student/dashboard', () => {
      const active = getActiveNavPath('/student', studentNavItems, '/student/dashboard');
      expect(active).toBe('/student/dashboard');
    });

    it('resolves /student/verify-attendance to /student/verify via alias', () => {
      const active = getActiveNavPath('/student/verify-attendance', studentNavItems, '/student/dashboard');
      expect(active).toBe('/student/verify');
    });

    it('resolves /student/history to /student/history', () => {
      const active = getActiveNavPath('/student/history', studentNavItems, '/student/dashboard');
      expect(active).toBe('/student/history');
    });

    it('resolves /student/notifications to /student/notifications', () => {
      const active = getActiveNavPath('/student/notifications', studentNavItems, '/student/dashboard');
      expect(active).toBe('/student/notifications');
    });
  });

  // --------------------------------------------------------------------------
  // 4. FALLBACK & ROBUSTNESS GUARANTEES
  // --------------------------------------------------------------------------
  describe('Fallback and Safety Guarantees', () => {
    it('falls back to defaultPath when route matches nothing', () => {
      const active = getActiveNavPath('/unknown/unmapped/page', adminNavItems, '/admin/dashboard');
      expect(active).toBe('/admin/dashboard');
    });

    it('handles empty path by falling back to defaultPath', () => {
      const active = getActiveNavPath('', adminNavItems, '/admin/dashboard');
      expect(active).toBe('/admin/dashboard');
    });

    it('is case-insensitive for robust URL matching', () => {
      const active = getActiveNavPath('/ADMIN/INCHARGES', adminNavItems, '/admin/dashboard');
      expect(active).toBe('/admin/incharges');
    });
  });
});
