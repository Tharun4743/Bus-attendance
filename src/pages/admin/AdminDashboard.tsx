import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Bus, Student, SessionInfo, ActiveSession, User } from '../../types';
import { formatISTTime } from '../../utils/time';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Users,
  CheckCircle2,
  XCircle,
  Percent,
  Play,
  Square,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Sun,
  Moon,
  CheckCheck,
  MapPin,
  Compass,
  Bus as BusIcon,
  CalendarCheck,
  ArrowRight,
  Clock,
  Radio,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  // Main Dashboard Data
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

  // Active Session & Live Dispatcher
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [selectedBusId, setSelectedBusId] = useState<string>('ALL');
  const [sessionType, setSessionType] = useState<'MORNING' | 'EVENING'>('MORNING');
  const [attendanceMode, setAttendanceMode] = useState<'GROUND' | 'TRAVELLING'>('GROUND');
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isEnding, setIsEnding] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pending Approvals List
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [pendingIncharges, setPendingIncharges] = useState<User[]>([]);
  const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Fetch Attendance Roster & Bus Data
  const fetchDashboardData = async () => {
    try {
      const res = await api.getTodayAttendance();
      setData(res);

      if (res.buses && res.buses.length > 0 && selectedBusId === 'ALL') {
        setSelectedBusId(res.buses[0].id);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  // Fetch Session State
  const fetchSessionData = async () => {
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

  // Fetch Pending Student & Incharge Approvals
  const fetchPendingApprovals = async () => {
    try {
      const [pending, incRes] = await Promise.all([
        api.getPendingApprovals(),
        api.getPendingIncharges(),
      ]);
      setPendingStudents(pending || []);
      setPendingIncharges(incRes?.incharges || []);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
    }
  };

  // Combined Refresh
  const refreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchSessionData(), fetchPendingApprovals()]);
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchSessionData();
      fetchPendingApprovals();
    }, 25000);
    const onFocus = () => {
      fetchDashboardData();
      fetchSessionData();
      fetchPendingApprovals();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // 1-Click Start Attendance (Location Geofence Mode)
  const handleStartAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStarting(true);
    setFeedback(null);

    try {
      let lat = undefined;
      let lon = undefined;
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<any>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 6000 });
          });
          lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
          lon = Math.round(pos.coords.longitude * 1000000) / 1000000;
        } catch {
          // Continue if permission denied
        }
      }

      const res = await fetch('/api/admin/attendance/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bus_token')}`,
        },
        body: JSON.stringify({
          sessionType,
          attendanceMode,
          verificationMethod: 'CODE_GPS',
          busId: selectedBusId,
          latitude: lat,
          longitude: lon,
          radiusMeters: attendanceMode === 'TRAVELLING' ? 1000 : 35,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to start session');

      setActiveSession(json.session);
      setFeedback({
        type: 'success',
        message: `Location attendance active for ${selectedBusId === 'ALL' ? 'All Buses' : selectedBusId}.`,
      });
      await refreshAll();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to start attendance.' });
    } finally {
      setIsStarting(false);
    }
  };

  // 1-Click End Attendance
  const handleEndAttendance = async () => {
    if (!activeSession) return;
    setIsEnding(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/attendance/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bus_token')}`,
        },
        body: JSON.stringify({ sessionId: activeSession.id }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to end session');

      setActiveSession(null);
      setFeedback({
        type: 'success',
        message: 'Attendance session ended.',
      });
      await refreshAll();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to end attendance.' });
    } finally {
      setIsEnding(false);
    }
  };

  // 1-Click Quick Approval from dashboard snapshot
  const handleQuickApproveStudent = async (studentId: string, preferredBusId?: string | null) => {
    const busId = preferredBusId || data?.buses[0]?.id;
    if (!busId) {
      alert('Please configure at least one bus before approving student registrations.');
      return;
    }
    setIsProcessingApproval(studentId);
    try {
      await api.approveStudent(studentId, busId);
      await Promise.all([fetchPendingApprovals(), fetchDashboardData()]);
    } catch (err: any) {
      alert(err.message || 'Failed to approve student.');
    } finally {
      setIsProcessingApproval(null);
    }
  };

  // Recent verified check-ins (latest 6 students)
  const recentCheckIns = (data?.roster || [])
    .filter((stu) => stu.status === 'PRESENT' && stu.verifiedAt)
    .sort((a, b) => new Date(b.verifiedAt!).getTime() - new Date(a.verifiedAt!).getTime())
    .slice(0, 6);

  const totalPending = pendingStudents.length + pendingIncharges.length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Loading Command Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1600px] w-full mx-auto">
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE COMMAND HEADER                                               */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="emerald">ADMIN COMMAND CENTER</Badge>
            <span className="text-[11px] font-mono text-zinc-400 font-bold">
              IST {data?.date || new Date().toISOString().split('T')[0]}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Transport Operations Overview
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Real-time transit fleet status, active GPS telemetry, and pending administrative actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button onClick={refreshAll} disabled={isRefreshing} variant="secondary" size="sm">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Link
            to="/admin/attendance"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs hover:opacity-90 transition active:scale-95"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Attendance Hub →</span>
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 sm:p-4 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-[#4ade80]'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-[#fb7185]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#4ade80] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-[#fb7185] shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[10px] font-bold uppercase text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ATTENDANCE SESSION CONTROLLER                                          */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs overflow-hidden transition-all">
        {activeSession && activeSession.status === 'ACTIVE' ? (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-emerald-50/50 dark:from-emerald-950/20 dark:via-[#141418] dark:to-emerald-950/10 border-b border-emerald-200 dark:border-emerald-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-600 text-white shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LIVE SESSION BROADCASTING
                  </span>
                  <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase bg-white dark:bg-[#1a1a20] px-2.5 py-0.5 rounded-md border border-zinc-200 dark:border-[#26262e]">
                    {activeSession.sessionType}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-[#4ade80] shrink-0" />
                  <span>
                    Route: <strong className="text-emerald-700 dark:text-[#4ade80]">{activeSession.busId === 'ALL' ? 'All Buses' : activeSession.busId}</strong>
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Live session active with {data?.stats.present || 0} students verified present today.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  to="/admin/attendance"
                  className="px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-[#4ade80] bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-300/60 dark:border-emerald-800 rounded-xl hover:bg-emerald-200/60 transition"
                >
                  Live Roster →
                </Link>
                <Button
                  onClick={handleEndAttendance}
                  disabled={isEnding}
                  variant="danger"
                  size="md"
                >
                  {isEnding ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Square className="w-3.5 h-3.5 fill-white" />
                  )}
                  <span>END SESSION</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleStartAttendance} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-[#1a1a20] text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-[#26262e]">
                <Compass className="w-5 h-5 text-emerald-600 dark:text-[#4ade80]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white tracking-tight">
                  Launch Attendance Session
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Broadcast verified smartphone geofence attendance for transit buses
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex-1 sm:flex-initial min-w-[150px]">
                <select
                  value={selectedBusId}
                  onChange={(e) => setSelectedBusId(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#26262e] bg-zinc-50 dark:bg-[#1a1a20] text-zinc-900 dark:text-white outline-none"
                >
                  <option value="ALL">All Buses</option>
                  {(data?.buses || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.busNumber} — {b.routeName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-[#1a1a20] p-1 rounded-xl border border-zinc-200 dark:border-[#26262e]">
                <button
                  type="button"
                  onClick={() => setAttendanceMode('GROUND')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    attendanceMode === 'GROUND'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  title="Stationary Bay (~35m radius)"
                >
                  <span>🛑 Bay (~35m)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceMode('TRAVELLING')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    attendanceMode === 'TRAVELLING'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  title="Highway Transit (~1000m radius)"
                >
                  <span>🚌 Transit (~1000m)</span>
                </button>
              </div>

              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-[#1a1a20] p-1 rounded-xl border border-zinc-200 dark:border-[#26262e]">
                <button
                  type="button"
                  onClick={() => setSessionType('MORNING')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    sessionType === 'MORNING'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Morning</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSessionType('EVENING')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    sessionType === 'EVENING'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Evening</span>
                </button>
              </div>

              <Button
                type="submit"
                disabled={isStarting}
                variant="emerald"
                size="md"
              >
                {isStarting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white" />
                )}
                <span>START ATTENDANCE</span>
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. OPERATIONAL METRICS (4 KPI Cards)                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Students"
          value={data?.stats.total ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="indigo"
          subtitle="Enrolled Commuters"
        />

        <StatCard
          title="Present Today"
          value={data?.stats.present ?? 0}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
          subtitle="Location Verified"
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
          subtitle="Today's Attendance Rate"
        />
      </div>

      {/* ========================================================================= */}
      {/* 4. ESSENTIAL OPERATIONS WORKSPACE GRID                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Attendance Hub Card */}
        <Link
          to="/admin/attendance"
          className="group p-4 sm:p-5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs hover:border-emerald-500/50 hover:shadow-sm transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                <CalendarCheck className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                {activeSession ? 'Session Active' : 'Idle'}
              </span>
            </div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Attendance Hub
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Live roster, daily reports, historical logs, and status overrides.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span>Open Attendance Hub</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Student Approvals Card */}
        <Link
          to="/admin/approvals"
          className="group p-4 sm:p-5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs hover:border-purple-500/50 hover:shadow-sm transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800">
                <UserCheck className="w-4.5 h-4.5" />
              </div>
              {totalPending > 0 ? (
                <span className="text-[10px] font-black text-white bg-rose-600 px-2 py-0.5 rounded-full animate-pulse">
                  {totalPending} Action{totalPending === 1 ? '' : 's'}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                  Up to Date
                </span>
              )}
            </div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              Approvals Queue
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Review {pendingStudents.length} student and {pendingIncharges.length} in-charge registrations.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-[#c084fc]">
            <span>Review Approvals</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Bus Fleet & Routes Card */}
        <Link
          to="/admin/buses"
          className="group p-4 sm:p-5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs hover:border-blue-500/50 hover:shadow-sm transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
                <BusIcon className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-bold text-blue-700 dark:text-sky-400 bg-blue-50 dark:bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/30">
                {data?.buses.length || 0} Buses
              </span>
            </div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
              Bus Fleet & Routes
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Configure fleet inventory, routes, in-charge assignments, and stop schedules.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-sky-400">
            <span>Manage Fleet</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Geofence Settings Card */}
        <Link
          to="/admin/settings/geofence"
          className="group p-4 sm:p-5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs hover:border-amber-500/50 hover:shadow-sm transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                <MapPin className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/30">
                {data?.sessionInfo.radiusMeters || 50}m Radius
              </span>
            </div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Geofence Settings
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Configure campus GPS coordinates, perimeter radius, and tolerance boundaries.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <span>Configure Boundary</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 5. DUAL SNAPSHOT: RECENT CHECK-INS & PENDING REVIEW                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Recent Check-in Activity */}
        <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-[#26262e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">
                Recent Verified Check-Ins (Today)
              </h2>
            </div>
            <Link
              to="/admin/attendance"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View Roster →
            </Link>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-[#26262e]">
            {recentCheckIns.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 space-y-1">
                <Radio className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600" />
                <p className="text-xs font-bold">No verified check-ins yet today.</p>
                <p className="text-[11px] text-zinc-400">Student check-ins will appear here in real-time once a session starts.</p>
              </div>
            ) : (
              recentCheckIns.map((stu) => (
                <div key={stu.studentId} className="p-3.5 sm:px-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-[#1a1a20]/60 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">{stu.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {stu.registerNumber} • {stu.busNumber}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 block">
                      {stu.verifiedAt ? formatISTTime(stu.verifiedAt) : 'Verified'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/30">
                      {stu.distanceMeters != null ? `${stu.distanceMeters}m` : 'Present'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Approvals Attention Queue */}
        <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-[#26262e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-600 dark:text-[#c084fc]" />
              <h2 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">
                Pending Approvals Queue
              </h2>
            </div>
            <Link
              to="/admin/approvals"
              className="text-xs font-bold text-purple-600 dark:text-[#c084fc] hover:underline"
            >
              Full Approvals ({totalPending}) →
            </Link>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-[#26262e]">
            {totalPending === 0 ? (
              <div className="py-12 text-center text-zinc-400 space-y-1">
                <CheckCheck className="w-8 h-8 mx-auto text-emerald-500" />
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">All Registrations Approved</p>
                <p className="text-[11px] text-zinc-400">Zero pending student or in-charge accounts waiting in queue.</p>
              </div>
            ) : (
              <>
                {pendingStudents.slice(0, 4).map((stu) => (
                  <div key={stu.id} className="p-3.5 sm:px-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-[#1a1a20]/60 transition">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">{stu.name}</span>
                        <span className="text-[9px] font-bold uppercase bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-sky-400 px-1.5 py-0.2 rounded">
                          Student
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {stu.registerNumber} • Preferred: {stu.preferredBusId || 'Any Bus'}
                      </p>
                    </div>

                    <Button
                      onClick={() => handleQuickApproveStudent(stu.id, stu.preferredBusId)}
                      disabled={isProcessingApproval === stu.id}
                      variant="primary"
                      size="sm"
                    >
                      {isProcessingApproval === stu.id ? 'Approving...' : 'Approve'}
                    </Button>
                  </div>
                ))}

                {pendingIncharges.slice(0, 2).map((inc) => (
                  <div key={inc.id} className="p-3.5 sm:px-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-[#1a1a20]/60 transition bg-purple-50/20 dark:bg-purple-950/10">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">{inc.name}</span>
                        <span className="text-[9px] font-bold uppercase bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-[#c084fc] px-1.5 py-0.2 rounded">
                          In-Charge
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400">{inc.email}</p>
                    </div>

                    <Link
                      to="/admin/approvals"
                      className="px-3 py-1 text-xs font-bold text-purple-700 dark:text-[#c084fc] bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 rounded-xl transition border border-purple-200 dark:border-purple-800"
                    >
                      Assign Bus →
                    </Link>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
