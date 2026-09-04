import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, SessionInfo } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SessionBanner } from '../../components/common/SessionBanner';
import { EmptyState } from '../../components/common/EmptyState';
import { StartAttendanceModal } from '../../components/admin/StartAttendanceModal';
import { PwaNotificationPrompt } from '../../components/common/PwaNotificationPrompt';
import { Bus as BusIcon, Users, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export const InchargeDashboard: React.FC = () => {
  const [data, setData] = useState<{
    bus: Bus;
    date: string;
    sessionInfo: SessionInfo;
    stats: { total: number; present: number; notPresent: number; percentage: number };
    roster: Array<{
      studentId: string;
      registerNumber: string;
      name: string;
      status: string;
      distanceMeters: number | null;
      accuracyMeters: number | null;
      verifiedAt: string | null;
      verificationMethod: string | null;
    }>;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const res = await api.getInchargeAttendance();
      setData(res);
    } catch (err) {
      console.error('Failed to load incharge attendance:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000); // Poll during session
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading bus roster...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={BusIcon}
        title="No Bus Assigned"
        description="Your incharge account currently has no assigned bus. Please contact the administrator."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* PWA Device Notification Permission Banner */}
      <PwaNotificationPrompt />

      {/* Top Banner with authoritative server session info */}
      <SessionBanner />

      {/* Start Live Attendance (Morning / Travelling Bus) for Incharge Bus */}
      <StartAttendanceModal buses={[data.bus]} onSessionChanged={fetchData} />

      {/* Header Info & Bus Details */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EAE2D2] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
            BUS INCHARGE PORTAL
          </span>
          <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">
            {data.bus.busNumber}
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">{data.bus.routeName}</p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F0] hover:bg-[#F4EFE4] text-slate-700 font-semibold rounded-xl text-xs transition border border-[#EAE2D2] self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Roster</span>
        </button>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE2D2] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1">
            {data.stats.total}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">Active Students</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE2D2] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">Present</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">
            {data.stats.present}
          </p>
          <p className="text-[10px] text-emerald-600 font-medium">Verified Location</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE2D2] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-500 uppercase">Not Present</span>
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-rose-700 mt-1">
            {data.stats.notPresent}
          </p>
          <p className="text-[10px] text-rose-500 font-medium">Unverified / Absent</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE2D2] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-600 uppercase">Turnout</span>
            <span className="text-[10px] font-bold text-brand-600">%</span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-brand-700 mt-1">
            {data.stats.percentage}%
          </p>
          <p className="text-[10px] text-slate-500 font-medium">Bus Attendance Rate</p>
        </div>
      </div>

      {/* Bus Student Roster Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE2D2] overflow-hidden">
        <div className="p-3.5 border-b border-[#EAE2D2]/60 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800">
            Student Attendance Roster ({data.date})
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {data.stats.present} of {data.stats.total} Present
          </span>
        </div>

        {data.roster.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="No students assigned yet"
              description="There are currently no students registered to this bus."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#FAF7F0]/60 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-[#EAE2D2]">
                <tr>
                  <th className="px-4 py-2.5">Reg Number</th>
                  <th className="px-4 py-2.5">Student Name</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Verified Time</th>
                  <th className="px-4 py-2.5">Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE2D2]/40">
                {data.roster.map((stu) => (
                  <tr key={stu.studentId} className="hover:bg-[#FAF7F0]/70 transition">
                    <td className="px-4 py-2.5 font-bold font-mono text-slate-800">
                      {stu.registerNumber}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{stu.name}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={stu.status} size="sm" />
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono">
                      {stu.verifiedAt
                        ? new Date(stu.verifiedAt).toLocaleTimeString('en-US', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono">
                      {stu.distanceMeters != null ? `${stu.distanceMeters}m` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
