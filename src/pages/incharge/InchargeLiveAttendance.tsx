import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Bus, SessionInfo, ActiveSession } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import {
  Radio,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  PlayCircle,
  AlertCircle,
  Search,
  Compass,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { formatISTTime } from '../../utils/time';
import { subscribeToAttendanceChanges, subscribeToSessionChanges } from '../../lib/supabaseRealtime';

export const InchargeLiveAttendance: React.FC = () => {
  const navigate = useNavigate();

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
      selfieImageUrl?: string | null;
      faceMatchConfidence?: number | null;
      deviceBiometricPassed?: boolean | null;
    }>;
  } | null>(null);

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'NOT_PRESENT'>('ALL');
  const [isEnding, setIsEnding] = useState<boolean>(false);
  const [confirmEndModal, setConfirmEndModal] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchLiveData = useCallback(async () => {
    try {
      const [rosterRes, sessRes] = await Promise.all([
        api.getInchargeAttendance(),
        api.getSessionInfo(),
      ]);
      setData(rosterRes);
      if (sessRes.activeSession && sessRes.activeSession.status === 'ACTIVE') {
        setActiveSession(sessRes.activeSession);
      } else {
        setActiveSession(null);
      }
    } catch (err: any) {
      console.error('Failed to load live incharge attendance:', err);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLiveData();
    setIsRefreshing(false);
  };

  useEffect(() => {
    let isMounted = true;
    const initialLoad = async () => {
      setIsLoading(true);
      await fetchLiveData();
      if (isMounted) setIsLoading(false);
    };
    initialLoad();

    // Live auto-polling every 12 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLiveData();
      }
    }, 12000);

    // Instant Supabase Realtime synchronization
    const unsubAttendance = subscribeToAttendanceChanges(() => {
      fetchLiveData();
    });
    const unsubSession = subscribeToSessionChanges(() => {
      fetchLiveData();
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubAttendance();
      unsubSession();
    };
  }, [fetchLiveData]);

  const handleEndSession = async () => {
    if (!activeSession) return;
    setIsEnding(true);
    try {
      const res = await api.endAttendanceSession(activeSession.id);
      setActionMessage({
        type: 'success',
        text: res.message || 'Attendance session concluded successfully.',
      });
      setConfirmEndModal(false);
      await fetchLiveData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Failed to conclude session. Please try again.',
      });
    } finally {
      setIsEnding(false);
    }
  };

  const handleExportCSV = () => {
    if (!data || !data.roster) return;
    const headers = ['Register Number', 'Name', 'Status', 'Verification Method', 'Verified At (IST)', 'Distance (m)', 'Accuracy (m)'];
    const rows = data.roster.map((s) => [
      s.registerNumber,
      `"${s.name.replace(/"/g, '""')}"`,
      s.status,
      s.verificationMethod || 'N/A',
      s.verifiedAt ? formatISTTime(s.verifiedAt) : 'N/A',
      s.distanceMeters !== null && s.distanceMeters !== undefined ? s.distanceMeters : 'N/A',
      s.accuracyMeters !== null && s.accuracyMeters !== undefined ? s.accuracyMeters : 'N/A',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `live_attendance_${data.bus?.busNumber || 'bus'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRoster = useMemo(() => {
    if (!data?.roster) return [];
    return data.roster.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.registerNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'PRESENT'
          ? s.status === 'PRESENT'
          : s.status !== 'PRESENT';
      return matchesSearch && matchesStatus;
    });
  }, [data, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 dark:text-sky-400" />
        <p className="text-sm font-semibold text-zinc-500">Connecting to live attendance telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Session Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-sky-950/40 text-blue-600 dark:text-sky-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                Live Attendance Console
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Bus {data?.bus?.busNumber || '—'} &bull; {data?.bus?.routeName || 'Route'} &bull; Real-time participant verification
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {data && data.roster.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          )}

          {activeSession ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmEndModal(true)}
              disabled={isEnding}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <Clock className="w-3.5 h-3.5" />
              Conclude Session
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/incharge/start-attendance')}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Start Attendance
            </Button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span className="text-sm font-semibold">{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold uppercase underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Session Status Card */}
      {activeSession ? (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <p className="text-xs font-black tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                ACTIVE SESSION IN PROGRESS
              </p>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {activeSession.sessionType} SESSION &bull; {activeSession.attendanceMode === 'GROUND' ? 'GROUND GEOFENCE MODE' : 'TRAVELLING BUS MODE'}
              </p>
              <p className="text-xs text-zinc-500">
                Initiated at {formatISTTime(activeSession.startedAt)} &bull; Geofence threshold: {activeSession.radiusMeters || 10}m
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="emerald" className="text-xs px-2.5 py-1">
              Active & Receiving GPS
            </Badge>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-zinc-50 dark:bg-[#18181b] border border-dashed border-zinc-300 dark:border-[#27272a] rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              No Attendance Session Currently Active
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-0.5">
              Launch a MORNING or EVENING session to enable student GPS geolocation submissions for Bus {data?.bus?.busNumber || ''}.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/incharge/start-attendance')}
            className="inline-flex items-center gap-1.5"
          >
            Launch Attendance Session
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Real-time KPI Stats Grid */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Assigned"
            value={data.stats.total}
            icon={<Users className="w-5 h-5 text-white" />}
            subtitle="Enrolled bus commuters"
            color="blue"
          />
          <StatCard
            title="Verified Present"
            value={data.stats.present}
            icon={<CheckCircle className="w-5 h-5 text-white" />}
            subtitle="Geofence verified"
            color="emerald"
          />
          <StatCard
            title="Absent / Pending"
            value={data.stats.notPresent}
            icon={<XCircle className="w-5 h-5 text-white" />}
            subtitle="Awaiting check-in"
            color="rose"
          />
          <StatCard
            title="Live Turnout"
            value={`${data.stats.percentage}%`}
            icon={<CheckCircle2 className="w-5 h-5 text-white" />}
            subtitle="Current session rate"
            color="indigo"
          />
        </div>
      )}

      {/* Roster Controls: Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-[#18181b] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            All Students ({data?.roster?.length || 0})
          </button>
          <button
            onClick={() => setStatusFilter('PRESENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'PRESENT'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-[#18181b] text-zinc-600 dark:text-zinc-400 hover:text-emerald-600'
            }`}
          >
            Present ({data?.stats?.present || 0})
          </button>
          <button
            onClick={() => setStatusFilter('NOT_PRESENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'NOT_PRESENT'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-zinc-100 dark:bg-[#18181b] text-zinc-600 dark:text-zinc-400 hover:text-rose-600'
            }`}
          >
            Absent ({data?.stats?.notPresent || 0})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search register or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-sky-500 text-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Live Roster Table */}
      <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[640px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-[#141418] border-b border-zinc-200 dark:border-[#27272a] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Register Number</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Verification Method</th>
                <th className="py-3 px-4">GPS Accuracy / Dist</th>
                <th className="py-3 px-4">Timestamp (IST)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-[#27272a]">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                    No students match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((student) => {
                  const isPresent = student.status === 'PRESENT';
                  return (
                    <tr
                      key={student.studentId}
                      className="hover:bg-zinc-50 dark:hover:bg-[#1e1e24] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {student.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-zinc-600 dark:text-zinc-400">
                        {student.registerNumber}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={student.status as any} />
                      </td>
                      <td className="py-3 px-4">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-sky-950/40 text-blue-700 dark:text-sky-300 font-medium">
                            <Compass className="w-3 h-3" />
                            {student.verificationMethod || 'GPS_GROUND'}
                          </span>
                        ) : (
                          <span className="text-zinc-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-500">
                        {student.distanceMeters !== null && student.distanceMeters !== undefined ? (
                          <span>
                            {student.distanceMeters.toFixed(1)}m
                            {student.accuracyMeters ? ` (±${student.accuracyMeters.toFixed(0)}m)` : ''}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-500">
                        {student.verifiedAt ? formatISTTime(student.verifiedAt) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal to Conclude Session */}
      {confirmEndModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Conclude Attendance Session?
              </h3>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Ending this session will finalize today's attendance roster for Bus {data?.bus?.busNumber}.
              All remaining unverified students will be marked absent. A daily report will be archived, and notification sent to students.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmEndModal(false)}
                disabled={isEnding}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleEndSession}
                disabled={isEnding}
                className="flex items-center gap-1.5"
              >
                {isEnding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  'Yes, Conclude & Finalize'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
