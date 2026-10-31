import { AdminReportsSkeleton } from '../../components/skeleton/AdminSkeletons';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Bus, Student, SessionInfo, FinalReport, ActiveSession } from '../../types';
import { formatISTTime, formatISTTime24, getISTDateString } from '../../utils/time';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  CalendarCheck,
  FileSpreadsheet,
  History,
  Radio,
  RefreshCw,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Users,
  Percent,
  AlertCircle,
  MapPin,
} from 'lucide-react';

export type AttendanceTab = 'today' | 'reports' | 'history';

interface AttendanceHubProps {
  initialTab?: AttendanceTab;
}

export const AttendanceHub: React.FC<AttendanceHubProps> = ({ initialTab }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParams = useParams<{ date?: string }>();

  // Determine active tab from URL query param, route prop, or default to 'today'
  const tabFromQuery = searchParams.get('tab') as AttendanceTab | null;
  const resolvedInitialTab: AttendanceTab =
    tabFromQuery && ['today', 'reports', 'history'].includes(tabFromQuery)
      ? tabFromQuery
      : initialTab || 'today';

  const [activeTab, setActiveTab] = useState<AttendanceTab>(resolvedInitialTab);

  // Synchronize when initialTab or query param changes
  useEffect(() => {
    if (tabFromQuery && ['today', 'reports', 'history'].includes(tabFromQuery)) {
      setActiveTab(tabFromQuery);
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, tabFromQuery]);

  const handleTabChange = (newTab: AttendanceTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  return (
    <div className="space-y-4 w-full mx-auto pb-8">
      {/* ========================================================================= */}
      {/* 1. UNIFIED EXECUTIVE HEADER                                               */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="emerald">OPERATIONS COMMAND</Badge>
            <span className="text-[11px] font-mono text-zinc-400">IST {new Date().toLocaleDateString('en-GB')}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Attendance Operations Hub</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Centralized transit telemetry: real-time live session, finalized daily analytics, and complete audit history.
          </p>
        </div>

        {/* Clean Task-Manager Tab Switcher */}
        <div className="flex items-center bg-zinc-100 dark:bg-[#1a1a20] p-1 rounded-xl border border-zinc-200 dark:border-[#26262e] self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => handleTabChange('today')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap ${
              activeTab === 'today'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${activeTab === 'today' ? 'text-emerald-400 dark:text-emerald-600 animate-pulse' : ''}`} />
            <span>Live Session</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('reports')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Daily Reports</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History & Logs</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-VIEW PANELS                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'today' && <TodayLiveSessionView />}
      {activeTab === 'reports' && <DailyReportsView preselectedDate={routeParams.date} />}
      {activeTab === 'history' && <AttendanceHistoryView />}
    </div>
  );
};

// =============================================================================
// SUB-VIEW 1: TODAY'S LIVE ATTENDANCE SESSION
// =============================================================================
export const TodayLiveSessionView: React.FC = () => {
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
      overrideReason: string | null;
      recordId: string | null;
    }>;
    buses: Bus[];
  } | null>(null);

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [busFilter, setBusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Session Feedback State
  const [sessionFeedback, setSessionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);


  const fetchAttendance = async () => {
    try {
      const res = await api.getTodayAttendance();
      setData(res);
    } catch (err) {
      console.error('Failed to load today attendance:', err);
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
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);


  // CSV Export
  const handleExportCSV = () => {
    if (!data) return;
    const headers = [
      'Register Number',
      'Student Name',
      'Bus Number',
      'Route',
      'Attendance Status',
      'Verified Time',
      'Distance (meters)',
      'GPS Accuracy (meters)',
      'Verification Method',
      'Override Reason',
    ];

    const rows = filteredRoster.map((r) => [
      `"${r.registerNumber}"`,
      `"${r.name}"`,
      `"${r.busNumber}"`,
      `"${r.routeName}"`,
      `"${r.status}"`,
      `"${r.verifiedAt ? formatISTTime24(r.verifiedAt) : ''}"`,
      `"${r.distanceMeters ?? ''}"`,
      `"${r.accuracyMeters ?? ''}"`,
      `"${r.verificationMethod || 'GPS_GEOFENCE'}"`,
      `"${r.overrideReason || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bus_attendance_${data.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Export
  const handleExportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bus_attendance_${data.date}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRoster = (data?.roster || []).filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.name.toLowerCase().includes(q) || r.registerNumber.toLowerCase().includes(q);

    let matchesStatus = true;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'LOCATION_ISSUES') {
        matchesStatus = r.status === 'LOCATION_UNAVAILABLE' || r.status === 'INVALID_LOCATION';
      } else {
        matchesStatus = r.status === statusFilter;
      }
    }

    const matchesBus = busFilter === 'ALL' || r.busId === busFilter;
    return matchesSearch && matchesStatus && matchesBus;
  });

  if (isLoading && !data) {
    return <AdminReportsSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Session Feedback Alert */}
      {sessionFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
            sessionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-[#4ade80]'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-[#fb7185]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {sessionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#4ade80] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-[#fb7185] shrink-0" />
            )}
            <span>{sessionFeedback.message}</span>
          </div>
          <button
            onClick={() => setSessionFeedback(null)}
            className="text-[10px] font-bold uppercase text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Live Session Telemetry Card (Read-Only) */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs overflow-hidden transition-all">
        {activeSession && activeSession.status === 'ACTIVE' ? (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-emerald-50/50 dark:from-emerald-950/20 dark:via-[#141418] dark:to-emerald-950/10 border-b border-emerald-200 dark:border-emerald-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-600 text-white shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LIVE SESSION BROADCASTING (READ-ONLY)
                  </span>
                  <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase bg-white dark:bg-[#1a1a20] px-2.5 py-0.5 rounded-md border border-zinc-200 dark:border-[#26262e]">
                    {activeSession.sessionType} • {activeSession.attendanceMode} MODE
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-[#4ade80] shrink-0" />
                  <span>
                    Route:{' '}
                    <strong className="text-emerald-700 dark:text-[#4ade80]">
                      {activeSession.busId === 'ALL' ? 'All Transit Buses' : activeSession.busId}
                    </strong>{' '}
                    • In-Charge: <strong>{activeSession.startedBy || 'Assigned In-Charge'}</strong>
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {data?.date} • Geofence Radius: {activeSession.radiusMeters || 10}m
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Button onClick={refreshAll} disabled={isRefreshing} variant="secondary" size="sm">
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh Telemetry</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-[#1a1a20] text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-[#26262e]">
                <Radio className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white tracking-tight">
                  Attendance Monitoring (Read-Only)
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Daily attendance sessions are initiated and operated by designated Bus In-Charges. Admin views remain read-only.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button onClick={refreshAll} disabled={isRefreshing} variant="secondary" size="sm">
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Students"
          value={data?.stats.total ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="indigo"
          subtitle="Enrolled Roster"
        />
        <StatCard
          title="Present"
          value={data?.stats.present ?? 0}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
          subtitle="Verified Check-in"
        />
        <StatCard
          title="Not Present"
          value={data?.stats.notPresent ?? 0}
          icon={<XCircle className="w-5 h-5" />}
          color="rose"
          subtitle="Unverified / Absent"
        />
        <StatCard
          title="Turnout Rate"
          value={`${data?.stats.percentage ?? 0}%`}
          icon={<Percent className="w-5 h-5" />}
          color="blue"
          subtitle="Current Session Turnout"
        />
      </div>

      {/* Roster Table Container */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden transition-all">
        {/* Table Filters & Actions Header */}
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search name / reg no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#2e2e38] text-zinc-700 dark:text-zinc-300 outline-none"
            >
              <option value="ALL">All Statuses ({data?.roster.length || 0})</option>
              <option value="PRESENT">
                Present Only ({(data?.roster || []).filter((r) => r.status === 'PRESENT').length})
              </option>
              <option value="NOT_PRESENT">
                Not Present ({(data?.roster || []).filter((r) => r.status === 'NOT_PRESENT').length})
              </option>
              <option value="LOCATION_ISSUES">
                Location Issues ({(data?.roster || []).filter((r) => r.status === 'LOCATION_UNAVAILABLE' || r.status === 'INVALID_LOCATION').length})
              </option>
            </select>

            {/* Bus Filter */}
            <select
              value={busFilter}
              onChange={(e) => setBusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#2e2e38] text-zinc-700 dark:text-zinc-300 outline-none"
            >
              <option value="ALL">All Buses ({data?.buses?.length || 0})</option>
              {(data?.buses || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.busNumber} — {b.routeName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={refreshAll} disabled={isRefreshing} variant="secondary" size="sm">
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={handleExportCSV} variant="secondary" size="sm">
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-[#4ade80]" />
              <span>CSV</span>
            </Button>
            <Button onClick={handleExportJSON} variant="secondary" size="sm">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span>JSON</span>
            </Button>
          </div>
        </div>

        {/* Roster Table (Desktop) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
              <tr>
                <th className="px-5 py-3.5">Register No</th>
                <th className="px-5 py-3.5">Student Name</th>
                <th className="px-5 py-3.5">Bus & Route</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Distance</th>
                <th className="px-5 py-3.5">Accuracy</th>
                <th className="px-5 py-3.5">Verified Time</th>
                <th className="px-5 py-3.5 text-right">Verification Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-zinc-400">
                    No matching student records found for current filters.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((stu) => (
                  <tr key={stu.studentId} className="hover:bg-zinc-50/70 dark:hover:bg-[#1a1a20]/60 transition">
                    <td className="px-5 py-4 font-bold font-mono text-blue-600 dark:text-sky-400">
                      {stu.registerNumber}
                    </td>
                    <td className="px-5 py-4 font-bold text-zinc-900 dark:text-white">{stu.name}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-zinc-800 dark:text-zinc-200">{stu.busNumber}</p>
                      <p className="text-[10px] text-zinc-400 line-clamp-1">{stu.routeName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge status={stu.status} size="sm" />
                        {stu.verificationMethod === 'ADMIN_OVERRIDE' && (
                          <span className="text-[10px] text-purple-700 dark:text-[#c084fc] bg-purple-50 dark:bg-purple-500/15 px-2 py-0.5 rounded-full font-bold border border-purple-200 dark:border-purple-500/30">
                            Admin Override
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-zinc-600 dark:text-zinc-300">
                      {stu.distanceMeters != null ? `${stu.distanceMeters}m` : '—'}
                    </td>
                    <td className="px-5 py-4 font-mono text-zinc-600 dark:text-zinc-300">
                      {stu.accuracyMeters != null ? `${stu.accuracyMeters}m` : '—'}
                    </td>
                    <td className="px-5 py-4 text-zinc-500 dark:text-zinc-400 font-mono">
                      {stu.verifiedAt ? formatISTTime(stu.verifiedAt, { second: '2-digit' }) : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        {stu.verificationMethod || '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Roster Mobile Cards (< 640px) */}
        <div className="block sm:hidden divide-y divide-zinc-100 dark:divide-[#24242e]">
          {filteredRoster.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              No matching student records found.
            </div>
          ) : (
            filteredRoster.map((stu) => (
              <div key={stu.studentId} className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-zinc-900 dark:text-white leading-tight">{stu.name}</h4>
                    <p className="text-[11px] font-mono font-bold text-blue-600 dark:text-sky-400">{stu.registerNumber}</p>
                    <p className="text-[10px] text-zinc-400">{stu.busNumber} • {stu.routeName}</p>
                  </div>
                  <StatusBadge status={stu.status} size="sm" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-1">
                  <span>{stu.verifiedAt ? formatISTTime(stu.verifiedAt) : 'Unverified'}</span>
                  {stu.distanceMeters != null && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {stu.distanceMeters}m
                    </span>
                  )}
                </div>
                {stu.verificationMethod && (
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Method: {stu.verificationMethod}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-VIEW 2: FINALIZED DAILY REPORTS
// =============================================================================
export const DailyReportsView: React.FC<{ preselectedDate?: string }> = ({ preselectedDate }) => {
  const [reports, setReports] = useState<FinalReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<FinalReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [studentSearch, setStudentSearch] = useState<string>('');

  const fetchReports = async () => {
    try {
      const data = await api.getReports();
      setReports(data);
      if (data.length > 0) {
        if (preselectedDate) {
          const match = data.find((r) => r.date === preselectedDate);
          setSelectedReport(match || data[0]);
        } else if (!selectedReport) {
          setSelectedReport(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [preselectedDate]);

  const handleGenerateToday = async () => {
    setIsGenerating(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.getReportByDate(today);
      const data = await api.getReports();
      setReports(data);
      if (data.length > 0) {
        setSelectedReport(data[0]);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = (report: FinalReport) => {
    const headers = ['Register Number', 'Student Name', 'Bus Number', 'Attendance Status', 'Verified Time', 'Distance (m)'];
    const rows = report.studentWise.map((s) => [
      `"${s.registerNumber}"`,
      `"${s.name}"`,
      `"${s.busNumber}"`,
      `"${s.status}"`,
      `"${s.verifiedAt ? formatISTTime24(s.verifiedAt) : ''}"`,
      `"${s.distanceMeters ?? ''}"`,
    ]);

    const summaryRows = [
      ['=== BUS ATTENDANCE FINAL REPORT ==='],
      [`Date: ${report.date}`],
      [`Total Active Students: ${report.totalStudents}`],
      [`Present: ${report.present}`],
      [`Not Present: ${report.notPresent}`],
      [`Attendance Turnout: ${report.percentage}%`],
      [''],
      ['=== BUS-WISE BREAKDOWN ==='],
      ...report.busWise.map((b) => [
        `Bus: ${b.busNumber} (${b.routeName}) | Total: ${b.total} | Present: ${b.present} | Absent: ${b.notPresent} | Rate: ${b.percentage}%`,
      ]),
      [''],
      ['=== STUDENT DETAILS ==='],
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ];

    const csvContent = summaryRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bus_attendance_report_${report.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = (selectedReport?.studentWise || []).filter((s) => {
    const q = studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.registerNumber.toLowerCase().includes(q) || s.busNumber.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Sub-Header & Generate Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Daily Finalized Attendance Reports</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Automated session closing summaries, bus-wise attendance breakdown, and downloadable archives.
          </p>
        </div>

        <Button onClick={handleGenerateToday} disabled={isGenerating} variant="primary" size="sm">
          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Generating...' : "Generate Today's Report"}</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-500 font-medium">Loading reports archive...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white dark:bg-[#141418] rounded-2xl p-6 sm:p-8 border border-zinc-200/90 dark:border-[#26262e] shadow-xs">
          <EmptyState
            icon={FileSpreadsheet}
            title="No reports generated yet"
            description="Daily reports are automatically archived when sessions conclude. Click generate to create today's report."
            actionText="Generate Today's Report"
            onAction={handleGenerateToday}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Column: Report List */}
          <div className="bg-white dark:bg-[#141418] rounded-2xl p-4 shadow-xs border border-zinc-200/90 dark:border-[#26262e] space-y-2.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1 mb-1">
              Archived Reports ({reports.length})
            </h3>
            <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
              {reports.map((rep) => (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReport(rep)}
                  className={`w-full p-3 rounded-xl text-left transition flex items-center justify-between cursor-pointer active:scale-95 ${
                    selectedReport?.id === rep.id
                      ? 'bg-zinc-100 dark:bg-[#202028] border border-zinc-300 dark:border-[#2e2e38] text-zinc-900 dark:text-white'
                      : 'hover:bg-zinc-50 dark:hover:bg-[#1a1a20] text-zinc-700 dark:text-zinc-300 border border-transparent'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">{rep.date}</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {rep.present} / {rep.totalStudents} Present
                    </p>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-[#4ade80] bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-lg">
                    {rep.percentage}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Selected Report Viewer */}
          {selectedReport && (
            <div className="lg:col-span-3 space-y-4">
              {/* Report Header & Export */}
              <div className="bg-white dark:bg-[#141418] rounded-2xl p-4 sm:p-5 shadow-xs border border-zinc-200/90 dark:border-[#26262e] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <Badge variant="blue" className="mb-1.5">
                    ATTENDANCE ARCHIVE
                  </Badge>
                  <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
                    Report Date: {selectedReport.date}
                  </h2>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Archived at {formatISTTime(selectedReport.generatedAt)} IST
                  </p>
                </div>

                <Button onClick={() => handleExportCSV(selectedReport)} variant="primary" size="sm">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report CSV</span>
                </Button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <StatCard title="Total Students" value={selectedReport.totalStudents} icon={<Users className="w-4.5 h-4.5" />} color="indigo" />
                <StatCard title="Present" value={selectedReport.present} icon={<CheckCircle2 className="w-4.5 h-4.5" />} color="emerald" />
                <StatCard title="Not Present" value={selectedReport.notPresent} icon={<XCircle className="w-4.5 h-4.5" />} color="rose" />
                <StatCard title="Turnout Rate" value={`${selectedReport.percentage}%`} icon={<Percent className="w-4.5 h-4.5" />} color="blue" />
              </div>

              {/* Bus-Wise Breakdown */}
              <div className="bg-white dark:bg-[#141418] rounded-2xl p-4 sm:p-5 shadow-xs border border-zinc-200/90 dark:border-[#26262e] space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Bus Fleet Breakdown ({selectedReport.busWise.length} Routes)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedReport.busWise.map((b) => (
                    <div
                      key={b.busId}
                      className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1a1a20] border border-zinc-200/80 dark:border-[#26262e] flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-black text-zinc-900 dark:text-white">{b.busNumber}</p>
                        <p className="text-[10px] text-zinc-400 line-clamp-1">{b.routeName}</p>
                        <p className="text-[10px] text-zinc-600 dark:text-zinc-300 mt-1">
                          Present: <strong className="text-emerald-600 dark:text-[#4ade80]">{b.present}</strong> / Absent:{' '}
                          <strong className="text-rose-600 dark:text-[#fb7185]">{b.notPresent}</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-blue-600 dark:text-sky-400">{b.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Details Roster Table */}
              <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden">
                <div className="p-3.5 sm:p-4 border-b border-zinc-200 dark:border-[#26262e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Individual Passenger Status ({filteredStudents.length} / {selectedReport.studentWise.length})
                  </h3>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Filter student..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-48 pl-9 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left text-xs min-w-[600px]">
                    <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e] sticky top-0">
                      <tr>
                        <th className="px-5 py-3">Reg No</th>
                        <th className="px-5 py-3">Student Name</th>
                        <th className="px-5 py-3">Bus</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Verified Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                      {filteredStudents.map((stu) => (
                        <tr key={stu.studentId} className="hover:bg-zinc-50/70 dark:hover:bg-[#1a1a20]/60 transition">
                          <td className="px-5 py-3 font-bold font-mono text-blue-600 dark:text-sky-400">
                            {stu.registerNumber}
                          </td>
                          <td className="px-5 py-3 font-bold text-zinc-900 dark:text-white">{stu.name}</td>
                          <td className="px-5 py-3 font-mono text-zinc-600 dark:text-zinc-300">{stu.busNumber}</td>
                          <td className="px-5 py-3">
                            <StatusBadge status={stu.status} size="sm" />
                          </td>
                          <td className="px-5 py-3 text-zinc-400 font-mono">
                            {stu.verifiedAt ? formatISTTime(stu.verifiedAt) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUB-VIEW 3: HISTORICAL AUDIT LOGS
// =============================================================================
export const AttendanceHistoryView: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterBus, setFilterBus] = useState<string>('ALL');
  const [filterStudent, setFilterStudent] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fetchHistory = async () => {
    try {
      const [histRes, busRes, stuRes] = await Promise.all([
        api.getAttendanceHistory({
          date: filterDate,
          busId: filterBus,
          studentId: filterStudent,
          status: filterStatus,
        }),
        api.getBuses(),
        api.getStudents(),
      ]);
      setHistory(histRes);
      setBuses(busRes);
      setStudents(stuRes);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filterDate, filterBus, filterStudent, filterStatus]);

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = [
      'Attendance Date',
      'Register Number',
      'Student Name',
      'Bus Number',
      'Status',
      'Verified Time',
      'Distance (m)',
      'GPS Accuracy (m)',
      'Method',
      'Override Reason',
    ];

    const rows = history.map((r) => [
      `"${r.attendanceDate}"`,
      `"${r.registerNumber}"`,
      `"${r.studentName}"`,
      `"${r.busNumber}"`,
      `"${r.status}"`,
      `"${r.verifiedAt ? formatISTTime24(r.verifiedAt) : ''}"`,
      `"${r.distanceMeters ?? ''}"`,
      `"${r.accuracyMeters ?? ''}"`,
      `"${r.verificationMethod || 'GPS_GEOFENCE'}"`,
      `"${r.overrideReason || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bus_attendance_history_${getISTDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Sub-Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Historical Attendance Audit Trail</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Query past attendance records by calendar date, route bus, student, or verification status.
          </p>
        </div>

        <Button onClick={handleExportCSV} disabled={history.length === 0} variant="primary" size="sm">
          <Download className="w-3.5 h-3.5" />
          <span>Export History CSV</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#141418] p-4 rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Date
          </label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full h-9 px-3 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Bus Route
          </label>
          <select
            value={filterBus}
            onChange={(e) => setFilterBus(e.target.value)}
            className="w-full h-9 px-3 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white outline-none"
          >
            <option value="ALL">All Buses ({buses.length})</option>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.busNumber} — {b.routeName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Student
          </label>
          <select
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
            className="w-full h-9 px-3 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white outline-none"
          >
            <option value="ALL">All Students ({students.length})</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.registerNumber} - {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Attendance Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full h-9 px-3 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white outline-none"
          >
            <option value="ALL">All Statuses ({history.length})</option>
            <option value="PRESENT">
              Present Only ({history.filter((h) => h.status === 'PRESENT').length})
            </option>
            <option value="NOT_PRESENT">
              Not Present ({history.filter((h) => h.status === 'NOT_PRESENT').length})
            </option>
            <option value="LOCATION_UNAVAILABLE">
              Location Unavailable ({history.filter((h) => h.status === 'LOCATION_UNAVAILABLE').length})
            </option>
            <option value="INVALID_LOCATION">
              Invalid Location ({history.filter((h) => h.status === 'INVALID_LOCATION').length})
            </option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-2">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-500 font-medium">Loading attendance history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-6 sm:p-8">
            <EmptyState
              icon={History}
              title="No attendance records found"
              description="There are no attendance records matching the selected date or filters."
            />
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[720px]">
              <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Register No</th>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Bus</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Verified Time</th>
                  <th className="px-5 py-3.5">Distance</th>
                  <th className="px-5 py-3.5">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-50/70 dark:hover:bg-[#1a1a20]/60 transition">
                    <td className="px-5 py-4 font-bold font-mono text-zinc-900 dark:text-white">
                      {record.attendanceDate}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-blue-600 dark:text-sky-400">{record.registerNumber}</td>
                    <td className="px-5 py-4 font-bold text-zinc-900 dark:text-white">{record.studentName}</td>
                    <td className="px-5 py-4 font-mono text-zinc-700 dark:text-zinc-300">{record.busNumber}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge status={record.status} size="sm" />
                        {record.verificationMethod === 'ADMIN_OVERRIDE' && (
                          <span className="text-[10px] text-purple-700 dark:text-[#c084fc] bg-purple-50 dark:bg-purple-500/15 px-2 py-0.5 rounded-full font-bold border border-purple-200 dark:border-purple-500/30">
                            Admin Override
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-500 dark:text-zinc-400 font-mono">
                      {record.verifiedAt ? formatISTTime(record.verifiedAt, { second: '2-digit' }) : '—'}
                    </td>
                    <td className="px-5 py-4 font-mono text-zinc-600 dark:text-zinc-300">
                      {record.distanceMeters != null ? `${record.distanceMeters}m` : '—'}
                    </td>
                    <td className="px-5 py-4 font-mono text-zinc-600 dark:text-zinc-300">
                      {record.accuracyMeters != null ? `${record.accuracyMeters}m` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* History Mobile Cards */}
          <div className="block sm:hidden divide-y divide-zinc-100 dark:divide-[#24242e]">
            {history.map((record) => (
              <div key={record.id} className="p-3.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-zinc-900 dark:text-white leading-tight">{record.studentName}</h4>
                    <p className="text-[11px] font-mono font-bold text-blue-600 dark:text-sky-400">{record.registerNumber}</p>
                    <p className="text-[10px] text-zinc-400">{record.busNumber} • {record.attendanceDate}</p>
                  </div>
                  <StatusBadge status={record.status} size="sm" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-1">
                  <span>{record.verifiedAt ? formatISTTime(record.verifiedAt) : '—'}</span>
                  {record.distanceMeters != null && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {record.distanceMeters}m
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
    </div>
  );
};
