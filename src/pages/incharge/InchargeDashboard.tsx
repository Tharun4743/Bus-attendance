import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, SessionInfo } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SessionBanner } from '../../components/common/SessionBanner';
import { EmptyState } from '../../components/common/EmptyState';
import { StartAttendanceModal } from '../../components/admin/StartAttendanceModal';
import { PwaNotificationPrompt } from '../../components/common/PwaNotificationPrompt';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Bus as BusIcon, Users, CheckCircle, XCircle, RefreshCw, Percent } from 'lucide-react';

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
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Loading bus roster...</p>
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
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* PWA Device Notification Permission Banner */}
      <PwaNotificationPrompt />

      {/* Top Banner with authoritative server session info */}
      <SessionBanner />

      {/* Start Live Attendance (Morning / Travelling Bus) for Incharge Bus */}
      <StartAttendanceModal buses={[data.bus]} onSessionChanged={fetchData} />

      {/* Header Container */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
        <div>
          <Badge variant="blue" className="mb-2">
            BUS INCHARGE PORTAL
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {data.bus.busNumber}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">Route: {data.bus.routeName}</p>
        </div>

        <Button
          onClick={handleRefresh}
          variant="secondary"
          size="sm"
          className="self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Roster</span>
        </Button>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Assigned"
          value={data.stats.total}
          icon={<Users className="w-5 h-5" />}
          color="indigo"
          subtitle="Active Students"
        />

        <StatCard
          title="Present"
          value={data.stats.present}
          icon={<CheckCircle className="w-5 h-5" />}
          color="emerald"
          subtitle="Verified Location"
        />

        <StatCard
          title="Not Present"
          value={data.stats.notPresent}
          icon={<XCircle className="w-5 h-5" />}
          color="rose"
          subtitle="Unverified / Absent"
        />

        <StatCard
          title="Turnout"
          value={`${data.stats.percentage}%`}
          icon={<Percent className="w-5 h-5" />}
          color="blue"
          subtitle="Bus Attendance Rate"
        />
      </div>

      {/* Bus Student Roster Table */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden transition-all">
        <div className="p-4 border-b border-zinc-200 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
            Student Attendance Roster ({data.date})
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono font-bold">
            {data.stats.present} of {data.stats.total} Present
          </span>
        </div>

        {data.roster.length === 0 ? (
          <div className="p-6 sm:p-8">
            <EmptyState
              icon={Users}
              title="No students assigned yet"
              description="There are currently no students registered to this bus."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                <tr>
                  <th className="px-5 py-3.5">Reg Number</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Verified Time</th>
                  <th className="px-5 py-3.5">Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                {data.roster.map((stu) => (
                  <tr key={stu.studentId} className="hover:bg-zinc-50/70 dark:hover:bg-[#1a1a20]/60 transition">
                    <td className="px-5 py-4 font-bold font-mono text-blue-600 dark:text-sky-400">
                      {stu.registerNumber}
                    </td>
                    <td className="px-5 py-4 font-bold text-zinc-900 dark:text-white">{stu.name}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={stu.status} size="sm" />
                    </td>
                    <td className="px-5 py-4 text-zinc-500 dark:text-zinc-400 font-mono">
                      {stu.verifiedAt
                        ? new Date(stu.verifiedAt).toLocaleTimeString('en-US', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-5 py-4 text-zinc-500 dark:text-zinc-400 font-mono">
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
