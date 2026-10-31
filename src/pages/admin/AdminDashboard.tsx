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
  RefreshCw,
  UserCheck,
  AlertCircle,
  CheckCheck,
  MapPin,
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

  // Fleet & Directory Counts
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allBuses, setAllBuses] = useState<(Bus & { studentsCount: number; inchargeName: string })[]>([]);
  const [allIncharges, setAllIncharges] = useState<User[]>([]);

  // Active Session Telemetry
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  // Pending Approvals List
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [pendingIncharges, setPendingIncharges] = useState<User[]>([]);
  const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Fetch Attendance Roster & Bus Data
  const fetchDashboardData = async () => {
    try {
      const res = await api.getTodayAttendance();
      setData(res);
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

  // Fetch Complete Fleet Roster for Counts & Bus-Wise Overview
  const fetchFleetStats = async () => {
    try {
      const [students, buses, incharges] = await Promise.all([
        api.getStudents(),
        api.getBuses(),
        api.getIncharges().catch(() => []),
      ]);
      setAllStudents(students || []);
      setAllBuses(buses || []);
      setAllIncharges(incharges || []);
    } catch (err) {
      console.error('Failed to load fleet stats:', err);
    }
  };

  // Combined Refresh
  const refreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchDashboardData(),
      fetchSessionData(),
      fetchPendingApprovals(),
      fetchFleetStats(),
    ]);
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchSessionData();
      fetchPendingApprovals();
      fetchFleetStats();
    }, 25000);
    const onFocus = () => {
      fetchDashboardData();
      fetchSessionData();
      fetchPendingApprovals();
      fetchFleetStats();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // 1-Click Quick Approval from dashboard snapshot
  const handleQuickApproveStudent = async (studentId: string, preferredBusId?: string | null) => {
    const matchingBus = (data?.buses || []).find(
      (b) => b.id === preferredBusId || b.busNumber.toUpperCase() === (preferredBusId || '').toUpperCase()
    );
    const busId = matchingBus?.id || preferredBusId || data?.buses[0]?.id;
    if (!busId) {
      alert('Please configure at least one bus before approving student registrations.');
      return;
    }
    setIsProcessingApproval(studentId);
    try {
      await api.approveStudent(studentId, busId);
      setFeedback({
        type: 'success',
        message: 'Student registration approved successfully.',
      });
      await Promise.all([fetchPendingApprovals(), fetchDashboardData()]);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to approve student.',
      });
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
    <div className="space-y-4 w-full mx-auto pb-8">
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
      {/* 2. FLEET TELEMETRY & ATTENDANCE STATUS BAR                                */}
      {/* ========================================================================= */}
      {activeSession && activeSession.status === 'ACTIVE' ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 dark:from-emerald-950/30 dark:via-[#141418] dark:to-emerald-950/20 border border-emerald-500/30 dark:border-emerald-500/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-600 text-white shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                LIVE SESSION BROADCASTING
              </span>
              <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase bg-white dark:bg-[#1a1a20] px-2.5 py-0.5 rounded-md border border-zinc-200 dark:border-[#26262e]">
                {activeSession.sessionType} TRANSIT
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-900 dark:text-white pt-0.5">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-[#4ade80] shrink-0" />
              <span>
                Active Route: <strong className="text-emerald-700 dark:text-[#4ade80]">{activeSession.busId === 'ALL' ? 'All Transit Buses' : activeSession.busId}</strong> • {data?.stats.present || 0} students verified present
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Live smartphone geofence & biometric telemetry is active. Full live roster and session controls are in Attendance Hub.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/admin/attendance?tab=today"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl transition shadow-xs active:scale-95"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Monitor Live Telemetry →</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#141418] border border-zinc-200/90 dark:border-[#26262e] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-[#1a1a20] flex items-center justify-center text-zinc-500 dark:text-zinc-400">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-zinc-900 dark:text-white">
                Transit Fleet Idle • No Active Attendance Broadcast
              </p>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                Attendance sessions are initiated by route in-charges. Admin views provide read-only monitoring.
              </p>
            </div>
          </div>
          <Link
            to="/admin/attendance?tab=today"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-[#4ade80] hover:underline self-start sm:self-auto"
          >
            <span>View Attendance Hub →</span>
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. OPERATIONAL METRICS (Exhaustive Admin KPI Matrix)                       */}
      {/* ========================================================================= */}
      {(() => {
        const totalStudentsCount = allStudents.length > 0 ? allStudents.length : (data?.stats.total ?? 0);
        const approvedStudentsCount = allStudents.filter((s) => s.status === 'APPROVED' || s.approved).length;
        const pendingRegistrationsCount = pendingStudents.length + pendingIncharges.length;
        const rejectedStudentsCount = allStudents.filter((s) => s.status === 'REJECTED').length;
        const totalBusesCount = allBuses.length > 0 ? allBuses.length : (data?.buses.length ?? 0);
        const totalInchargesCount = allIncharges.length;
        const activeSessionsCount = activeSession ? 1 : 0;

        return (
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                title="Total Students"
                value={totalStudentsCount}
                icon={<Users className="w-5 h-5" />}
                color="indigo"
                subtitle="Enrolled Commuters"
              />
              <StatCard
                title="Approved Students"
                value={approvedStudentsCount}
                icon={<CheckCircle2 className="w-5 h-5" />}
                color="emerald"
                subtitle="Active Transport Access"
              />
              <StatCard
                title="Pending Registrations"
                value={pendingRegistrationsCount}
                icon={<Clock className="w-5 h-5" />}
                color="amber"
                subtitle="Awaiting Verification"
              />
              <StatCard
                title="Rejected Students"
                value={rejectedStudentsCount}
                icon={<XCircle className="w-5 h-5" />}
                color="rose"
                subtitle="Declined Requests"
              />
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                title="Total Buses"
                value={totalBusesCount}
                icon={<BusIcon className="w-5 h-5" />}
                color="blue"
                subtitle="Transit Fleet Vehicles"
              />
              <StatCard
                title="Total In-Charges"
                value={totalInchargesCount}
                icon={<UserCheck className="w-5 h-5" />}
                color="indigo"
                subtitle="Assigned Bus Operators"
              />
              <StatCard
                title="Active Sessions"
                value={activeSessionsCount}
                icon={<Radio className="w-5 h-5" />}
                color={activeSessionsCount > 0 ? 'emerald' : 'amber'}
                subtitle={activeSessionsCount > 0 ? 'Broadcasting Now' : 'Fleet Standby'}
              />
              <StatCard
                title="Overall Turnout"
                value={`${data?.stats.percentage ?? 0}%`}
                icon={<Percent className="w-5 h-5" />}
                color="emerald"
                subtitle={`${data?.stats.present ?? 0} Present Today`}
              />
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 3.5 BUS-WISE ATTENDANCE OVERVIEW                                          */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BusIcon className="w-4 h-4 text-emerald-600 dark:text-[#4ade80]" />
            <h3 className="text-sm font-black text-zinc-900 dark:text-white">
              Bus-Wise Attendance Overview
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-400">
            {allBuses.length || data?.buses.length || 0} Routes Tracked
          </span>
        </div>

        {(!allBuses || allBuses.length === 0) && (!data?.buses || data.buses.length === 0) ? (
          <div className="p-8 text-center text-xs font-bold text-zinc-400">
            No transit buses configured yet. Add buses in Bus Management.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                <tr>
                  <th className="px-5 py-3.5">Bus & Route</th>
                  <th className="px-5 py-3.5">Assigned In-Charge</th>
                  <th className="px-5 py-3.5">Assigned Students</th>
                  <th className="px-5 py-3.5">Present Today</th>
                  <th className="px-5 py-3.5">Absent / Remaining</th>
                  <th className="px-5 py-3.5">Turnout %</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                {(allBuses.length > 0 ? allBuses : data?.buses || []).map((bus) => {
                  const busRoster = (data?.roster || []).filter((r) => r.busId === bus.id);
                  const busStudentsCount =
                    (bus as any).studentsCount ??
                    allStudents.filter((s) => s.busId === bus.id && s.active).length;
                  const busPresentCount = busRoster.filter((r) => r.status === 'PRESENT').length;
                  const busAbsentCount = Math.max(0, busStudentsCount - busPresentCount);
                  const busPercentage =
                    busStudentsCount > 0
                      ? Math.round((busPresentCount / busStudentsCount) * 10000) / 100
                      : 0;
                  const inchargeName = (bus as any).inchargeName || 'Unassigned';

                  return (
                    <tr key={bus.id} className="hover:bg-zinc-50/60 dark:hover:bg-[#181820] transition">
                      <td className="px-5 py-3.5">
                        <span className="font-black text-zinc-900 dark:text-white font-mono">
                          {bus.busNumber}
                        </span>
                        <p className="text-[11px] text-zinc-500">{bus.routeName}</p>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300 font-medium">
                        {inchargeName}
                      </td>
                      <td className="px-5 py-3.5 font-bold font-mono text-zinc-700 dark:text-zinc-300">
                        {busStudentsCount} Commuters
                      </td>
                      <td className="px-5 py-3.5 font-bold font-mono text-emerald-600 dark:text-[#4ade80]">
                        {busPresentCount} Present
                      </td>
                      <td className="px-5 py-3.5 font-bold font-mono text-rose-500">
                        {busAbsentCount} Absent
                      </td>
                      <td className="px-5 py-3.5 font-black font-mono">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${
                            busPercentage >= 75
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-[#4ade80]'
                              : busPercentage >= 50
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                              : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}
                        >
                          {busPercentage}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/admin/live-monitoring`}
                          className="px-2.5 py-1 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition"
                        >
                          Telemetry →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. ESSENTIAL OPERATIONS WORKSPACE GRID                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
