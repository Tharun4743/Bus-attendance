import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Users,
  Bus,
  Activity,
  Menu,
  ClipboardCheck,
  Clock,
  User,
} from 'lucide-react';

export interface MobileNavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPaths: string[];
}

/**
 * MobileBottomNav: Role-aware bottom navigation bar for mobile devices (< 768px).
 * Fixed to the viewport with Android and iOS safe-area inset support.
 * Guarantees that strictly ONE tab is active at any time.
 */
export const MobileBottomNav: React.FC = () => {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Define mobile navigation items strictly by role
  const navItems = useMemo<MobileNavItem[]>(() => {
    switch (role) {
      case 'ADMIN':
        return [
          {
            id: 'home',
            label: 'Home',
            path: '/admin/dashboard',
            icon: Home,
            matchPaths: ['/admin', '/admin/dashboard'],
          },
          {
            id: 'students',
            label: 'Students',
            path: '/admin/students',
            icon: Users,
            matchPaths: ['/admin/students', '/admin/approvals'],
          },
          {
            id: 'buses',
            label: 'Buses',
            path: '/admin/buses',
            icon: Bus,
            matchPaths: ['/admin/buses'],
          },
          {
            id: 'monitor',
            label: 'Monitor',
            path: '/admin/live-monitoring',
            icon: Activity,
            matchPaths: ['/admin/live-monitoring'],
          },
          {
            id: 'more',
            label: 'More',
            path: '/admin/more',
            icon: Menu,
            matchPaths: [
              '/admin/more',
              '/admin/incharges',
              '/admin/assignments',
              '/admin/settings',
              '/admin/ground-settings',
              '/admin/settings/geofence',
              '/admin/reports',
              '/admin/attendance',
              '/admin/attendance/history',
              '/admin/attendance-history',
              '/admin/notifications',
              '/admin/profile',
            ],
          },
        ];

      case 'INCHARGE':
        return [
          {
            id: 'home',
            label: 'Home',
            path: '/incharge/dashboard',
            icon: Home,
            matchPaths: ['/incharge', '/incharge/dashboard'],
          },
          {
            id: 'bus',
            label: 'My Bus',
            path: '/incharge/my-bus',
            icon: Bus,
            matchPaths: ['/incharge/my-bus', '/incharge/bus'],
          },
          {
            id: 'attendance',
            label: 'Attendance',
            path: '/incharge/attendance',
            icon: ClipboardCheck,
            matchPaths: [
              '/incharge/attendance',
              '/incharge/live-attendance',
              '/incharge/start-attendance',
            ],
          },
          {
            id: 'students',
            label: 'Students',
            path: '/incharge/students',
            icon: Users,
            matchPaths: ['/incharge/students'],
          },
          {
            id: 'more',
            label: 'More',
            path: '/incharge/more',
            icon: Menu,
            matchPaths: [
              '/incharge/more',
              '/incharge/history',
              '/incharge/reports',
              '/incharge/notifications',
              '/incharge/profile',
            ],
          },
        ];

      case 'STUDENT':
        return [
          {
            id: 'home',
            label: 'Home',
            path: '/student/dashboard',
            icon: Home,
            matchPaths: ['/student', '/student/dashboard'],
          },
          {
            id: 'bus',
            label: 'My Bus',
            path: '/student/my-bus',
            icon: Bus,
            matchPaths: ['/student/my-bus', '/student/bus'],
          },
          {
            id: 'verify',
            label: 'Verify',
            path: '/student/verify',
            icon: ClipboardCheck,
            matchPaths: ['/student/verify', '/student/verify-attendance'],
          },
          {
            id: 'history',
            label: 'History',
            path: '/student/history',
            icon: Clock,
            matchPaths: ['/student/history', '/student/attendance-history'],
          },
          {
            id: 'profile',
            label: 'Profile',
            path: '/student/profile',
            icon: User,
            matchPaths: ['/student/profile', '/student/notifications', '/student/more'],
          },
        ];

      default:
        return [];
    }
  }, [role]);

  // Determine active tab: Guarantee strictly ONE active tab by matching in priority order
  const activeTabId = useMemo<string | null>(() => {
    const currentPath = location.pathname.toLowerCase().replace(/\/$/, '');

    // 1. Exact match on item path
    for (const item of navItems) {
      const cleanItemPath = item.path.toLowerCase().replace(/\/$/, '');
      if (currentPath === cleanItemPath) {
        return item.id;
      }
    }

    // 2. Exact match in matchPaths
    for (const item of navItems) {
      for (const m of item.matchPaths) {
        const cleanM = m.toLowerCase().replace(/\/$/, '');
        if (currentPath === cleanM) {
          return item.id;
        }
      }
    }

    // 3. Prefix match in matchPaths (excluding root prefix '/admin', '/incharge', '/student')
    for (const item of navItems) {
      for (const m of item.matchPaths) {
        const cleanM = m.toLowerCase().replace(/\/$/, '');
        if (cleanM !== '/admin' && cleanM !== '/incharge' && cleanM !== '/student') {
          if (currentPath.startsWith(cleanM)) {
            return item.id;
          }
        }
      }
    }

    // Default fallback to 'home' if inside current role's root route
    if (role === 'ADMIN' && currentPath.startsWith('/admin')) return 'home';
    if (role === 'INCHARGE' && currentPath.startsWith('/incharge')) return 'home';
    if (role === 'STUDENT' && currentPath.startsWith('/student')) return 'home';

    return null;
  }, [location.pathname, navItems, role]);

  if (!role || navItems.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md border-t border-zinc-200/90 dark:border-[#26262e] shadow-lg select-none transition-colors duration-200"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="grid grid-cols-5 h-14 max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const isActive = activeTabId === item.id;
          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-1 px-1 transition-all duration-150 relative group ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active top accent pill indicator */}
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-in fade-in zoom-in-75 duration-200" />
              )}

              <div
                className={`p-1 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'scale-105'
                    : 'group-active:scale-95'
                }`}
              >
                <IconComponent className="w-5 h-5 stroke-[2.1]" />
              </div>

              <span
                className={`text-[10.5px] leading-tight truncate tracking-tight transition-colors duration-150 ${
                  isActive ? 'text-emerald-600 dark:text-emerald-400' : ''
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
