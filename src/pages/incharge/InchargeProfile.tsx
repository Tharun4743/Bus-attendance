import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Bus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  User,
  Bus as BusIcon,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  AlertCircle,
  LogOut,
  RefreshCw,
} from 'lucide-react';

export const InchargeProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const [busData, setBusData] = useState<{
    bus: Bus;
    totalStudents: number;
    capacity: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProfileData = async () => {
      try {
        const res = await api.getInchargeMyBus();
        if (isMounted) {
          setBusData({
            bus: res.bus,
            totalStudents: res.totalStudents,
            capacity: res.capacity,
          });
        }
      } catch (err: any) {
        console.error('Failed to load incharge bus details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchProfileData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-sky-950/40 text-blue-600 dark:text-sky-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              In-Charge Profile & Credentials
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Transportation operator account and vehicle assignment
            </p>
          </div>
        </div>

        <Badge variant="emerald" className="text-xs px-3 py-1 self-start sm:self-auto">
          Active Operator
        </Badge>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-sky-400" />
          <p className="text-xs font-medium text-zinc-500">Loading operator details...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="p-6 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-[#27272a]">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Operator Account
              </h2>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-zinc-400 font-medium block">Full Name</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
                  {user?.name || 'Bus In-Charge'}
                </span>
              </div>

              <div>
                <span className="text-zinc-400 font-medium block">Email Address</span>
                <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-medium mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{user?.email || '—'}</span>
                </div>
              </div>

              <div>
                <span className="text-zinc-400 font-medium block">System Role</span>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-blue-50 dark:bg-sky-950/40 text-blue-700 dark:text-sky-300 font-bold uppercase text-[11px]">
                  {user?.role || 'INCHARGE'}
                </span>
              </div>

              <div>
                <span className="text-zinc-400 font-medium block">Contact Phone</span>
                <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-medium mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{user?.phone || 'Not configured'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Bus Details */}
          <div className="p-6 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-[#27272a]">
              <BusIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Designated Vehicle
              </h2>
            </div>

            {busData?.bus ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-zinc-400 font-medium block">Bus Fleet Identification</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-bold text-base">
                    Bus {busData.bus.busNumber}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 font-medium block">Transit Route</span>
                  <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-semibold mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{busData.bus.routeName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-zinc-50 dark:bg-[#141418] rounded-xl border border-zinc-100 dark:border-[#27272a]">
                    <span className="text-[11px] text-zinc-500 block">Enrolled Commuters</span>
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {busData.totalStudents}
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-[#141418] rounded-xl border border-zinc-100 dark:border-[#27272a]">
                    <span className="text-[11px] text-zinc-500 block">Seating Capacity</span>
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {busData.capacity}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  No vehicle assignment found
                </p>
                <p className="text-[11px] text-zinc-500">
                  Contact the transportation administrator to link your account to a bus fleet.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Operational Protocol Card */}
      <div className="p-6 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          Standard Operating Procedures
        </h3>
        <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Morning & Evening Shifts:</strong> Launch the session via <em>Start Attendance</em> before boarding begins. Ensure mode (Ground vs Travelling) matches your vehicle status.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Geofence Threshold:</strong> In Ground mode, students must be physically within the college ground boundary (10m geofence radius) with GPS accuracy &le; 20m.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Finalize Attendance:</strong> When boarding ends, click <em>Conclude Session</em> in Live Attendance. All remaining students will be recorded absent and an archive report is automatically compiled.
            </span>
          </li>
        </ul>
      </div>

      {/* Logout Action */}
      <div className="flex justify-end pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out of Portal
        </Button>
      </div>
    </div>
  );
};
