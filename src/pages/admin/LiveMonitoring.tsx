import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, SessionInfo, ActiveSession } from '../../types';
import { formatISTTime, formatISTTime24, getISTDateString } from '../../utils/time';
import { subscribeToAttendanceChanges, subscribeToSessionChanges } from '../../lib/supabaseRealtime';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  RefreshCw,
  Download,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  Percent,
  MapPin,
  Clock,
} from 'lucide-react';

export const LiveMonitoring: React.FC = () => {
  const [data, setData] = useState<{
    date: string;
    sessionInfo: SessionInfo;
    stats: { total: number; present: number; notPresent: number; percentage: number };
    roster: Array<{
      studentId: string;
      registerNumber: string;
      name: string;
      busId: string;
      busNumber: string;
      routeName: string;
      status: string;
      distanceMeters: number | null;
      accuracyMeters: number | null;
      verifiedAt: string | null;
      verificationMethod: string | null;
    }>;
    buses: Bus[];
  } | null>(null);

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [busFilter, setBusFilter] = useState<string>('ALL');

  const fetchAttendance = async () => {
    try {
      const res = await api.getTodayAttendance();
      setData(res);
    } catch (err) {
      console.error('Failed to load live monitoring attendance:', err);
    }
  };

  const fetchSession = async () => {
    try {
      const sess = await api.getSessionInfo();
      if (sess.activeSession && sess.activeSession.status === 'ACTIVE') {
        setActiveSession(sess.activeSession);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Failed to load session info:', err);
    }
  };

  const refreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchAttendance(), fetchSession()]);
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchAttendance();
      fetchSession();
    }, 25000);
    const onFocus = () => {
      fetchAttendance();
      fetchSession();
    };
    window.addEventListener('focus', onFocus);

    const unsubAttendance = subscribeToAttendanceChanges(() => {
      fetchAttendance();
    });
    const unsubSession = subscribeToSessionChanges(() => {
      fetchSession();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      unsubAttendance();
      unsubSession();
    };
  }, []);

  const handleExportCSV = () => {
    if (!data) return;
    const headers = [
      'Register Number',
      'Student Name',
      'Bus Number',
      'Route',
      'Status',
      'Verified Time',
      'Distance (meters)',
      'Verification Method',
    ];

    const rows = filteredRoster.map((r) => [
      `"${r.registerNumber}"`,
      `"${r.name}"`,
      `"${r.busNumber}"`,
      `"${r.routeName}"`,
      `"${r.status}"`,
      `"${r.verifiedAt ? formatISTTime24(r.verifiedAt) : ''}"`,
      `"${r.distanceMeters ?? ''}"`,
      `"${r.verificationMethod || 'GROUND_GEOFENCE'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `live_monitoring_${data.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRoster = (data?.roster || []).filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.name.toLowerCase().includes(q) || r.registerNumber.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesBus = busFilter === 'ALL' || r.busId === busFilter;
    return matchesSearch && matchesStatus && matchesBus;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-500">Loading Live Telemetry Monitoring...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="emerald">READ-ONLY TELEMETRY</Badge>
            <span className="text-xs font-mono font-bold text-zinc-400">
              Date: {data?.date || getISTDateString()}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Live Attendance Monitoring
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Real-time multi-bus telemetry stream. Daily operations are managed by assigned in-charges.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button onClick={refreshAll} disabled={isRefreshing} variant="secondary" size="sm">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button onClick={handleExportCSV} variant="secondary" size="sm">
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Active Session Telemetry Card */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs overflow-hidden">
        {activeSession && activeSession.status === 'ACTIVE' ? (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-emerald-50/50 dark:from-emerald-950/20 dark:via-[#141418] dark:to-emerald-950/10 border-b border-emerald-200 dark:border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-600 text-white shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  LIVE SESSION ACTIVE
                </span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase bg-white dark:bg-[#1a1a20] px-2.5 py-0.5 rounded-md border border-zinc-200 dark:border-[#26262e]">
                  {activeSession.sessionType} • {activeSession.attendanceMode} MODE
                </span>
                <span className="text-xs font-mono font-bold text-purple-700 dark:text-[#c084fc] bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md">
                  Bus: {activeSession.busId}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-2 pt-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Radius: {activeSession.radiusMeters}m</span>
                <span>•</span>
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Started: {formatISTTime(activeSession.startedAt)}</span>
              </p>
            </div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Operated by {activeSession.startedBy}
            </span>
          </div>
        ) : (
          <div className="p-4 sm:p-5 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
              <span className="font-bold">No active attendance session in progress across fleets.</span>
            </div>
            <span>Scheduled window: 16:50 – 16:55 IST</span>
          </div>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Eligible Students"
          value={data?.stats.total || 0}
          icon={<Users className="w-5 h-5" />}
          color="indigo"
          subtitle="Registered Active Commuters"
        />
        <StatCard
          title="Verified Present"
          value={data?.stats.present || 0}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
          subtitle="Boarded & Verified"
        />
        <StatCard
          title="Unverified / Absent"
          value={data?.stats.notPresent || 0}
          icon={<XCircle className="w-5 h-5" />}
          color="rose"
          subtitle="Remaining Commuters"
        />
        <StatCard
          title="Live Attendance Turnout"
          value={`${data?.stats.percentage || 0}%`}
          icon={<Percent className="w-5 h-5" />}
          color="blue"
          subtitle="Overall Fleet Participation"
        />
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-200 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name or register number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#16161c] border border-zinc-200 dark:border-[#2a2a34] rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bus Filter */}
            <select
              value={busFilter}
              onChange={(e) => setBusFilter(e.target.value)}
              className="h-8 px-2.5 text-xs font-bold rounded-lg border border-zinc-200 dark:border-[#2a2a34] bg-white dark:bg-[#16161c] text-zinc-800 dark:text-zinc-200 outline-none"
            >
              <option value="ALL">All Fleet Buses</option>
              {(data?.buses || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.busNumber}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 text-xs font-bold rounded-lg border border-zinc-200 dark:border-[#2a2a34] bg-white dark:bg-[#16161c] text-zinc-800 dark:text-zinc-200 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Verified Present</option>
              <option value="NOT_PRESENT">Absent / Unverified</option>
            </select>
          </div>
        </div>

        {filteredRoster.length === 0 ? (
          <EmptyState
            title="No Attendance Records"
            description="No commuter attendance records match current filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                <tr>
                  <th className="px-5 py-3.5">Register No</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Assigned Bus</th>
                  <th className="px-5 py-3.5">Attendance Status</th>
                  <th className="px-5 py-3.5">GPS Distance</th>
                  <th className="px-5 py-3.5">Accuracy</th>
                  <th className="px-5 py-3.5">Verified Time</th>
                  <th className="px-5 py-3.5 text-right">Verification Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                {filteredRoster.map((stu) => (
                  <tr key={stu.studentId} className="hover:bg-zinc-50/60 dark:hover:bg-[#181820] transition">
                    <td className="px-5 py-3 font-mono font-bold text-blue-600 dark:text-sky-400">
                      {stu.registerNumber}
                    </td>
                    <td className="px-5 py-3 font-bold text-zinc-900 dark:text-white">
                      {stu.name}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-bold text-purple-700 dark:text-[#c084fc]">{stu.busNumber}</span>
                      <p className="text-[10px] text-zinc-400">{stu.routeName}</p>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={stu.status} size="sm" />
                    </td>
                    <td className="px-5 py-3 font-mono text-zinc-600 dark:text-zinc-300">
                      {stu.distanceMeters != null ? `${stu.distanceMeters}m` : '—'}
                    </td>
                    <td className="px-5 py-3 font-mono text-zinc-600 dark:text-zinc-300">
                      {stu.accuracyMeters != null ? `${stu.accuracyMeters}m` : '—'}
                    </td>
                    <td className="px-5 py-3 font-mono text-zinc-500">
                      {stu.verifiedAt ? formatISTTime(stu.verifiedAt, { second: '2-digit' }) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-zinc-500 text-[11px]">
                      {stu.verificationMethod || '—'}
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
