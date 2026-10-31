import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Bus, Student, SessionInfo, ActiveSession, User } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Users,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Bus as BusIcon,
  CalendarCheck,
  Clock,
  Bell,
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

  // Active Session State
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  // Pending Approvals & Notifications
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [pendingIncharges, setPendingIncharges] = useState<User[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
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

  // Fetch Pending Student & Incharge Approvals + Notifications
  const fetchPendingApprovals = async () => {
    try {
      const [pending, incRes, notifsRes] = await Promise.all([
        api.getPendingApprovals(),
        api.getPendingIncharges(),
        api.getNotifications().catch(() => ({ unreadCount: 0 })),
      ]);
      setPendingStudents(pending || []);
      setPendingIncharges(incRes?.incharges || []);
      setUnreadNotifsCount((notifsRes as any)?.unreadCount || 0);
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Loading Dashboard...</p>
      </div>
    );
  }

  // Attendance Lifecycle State
  const isActive = Boolean(activeSession && activeSession.status === 'ACTIVE');
  const isCompleted = Boolean(
    data?.sessionInfo?.status === 'CLOSED' ||
    data?.sessionInfo?.status === 'FINALIZED' ||
    (!isActive && (data?.stats.present ?? 0) > 0)
  );
  const isNotStarted = !isActive && !isCompleted;

  // Counts and metrics based on live database values
  const totalStudentsCount = allStudents.length > 0 ? allStudents.length : (data?.stats.total ?? 0);
  const totalBusesCount = allBuses.length > 0 ? allBuses.length : (data?.buses.length ?? 0);
  const totalInchargesCount = allIncharges.length;
  const pendingApprovalsCount = pendingStudents.length + pendingIncharges.length;

  const presentCount = isNotStarted ? 0 : (data?.stats.present ?? 0);
  const pendingOrAbsentCount = isNotStarted
    ? totalStudentsCount
    : isActive
    ? Math.max(0, totalStudentsCount - presentCount)
    : Math.max(0, totalStudentsCount - presentCount);

  const turnoutPercentage = isNotStarted
    ? null
    : totalStudentsCount > 0
    ? Math.round((presentCount / totalStudentsCount) * 10000) / 100
    : 0;

  return (
    <div className="space-y-5 w-full mx-auto pb-8">
      {/* ========================================================================= */}
      {/* 1. CLEAN DASHBOARD HEADER                                                 */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Overview of students, transit fleet buses, and daily attendance summaries.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button onClick={refreshAll} disabled={isRefreshing} variant="secondary" size="sm">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
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

      {/* Unread Notifications Alert (when applicable) */}
      {unreadNotifsCount > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40 text-xs">
          <div className="flex items-center gap-2.5 text-purple-900 dark:text-purple-200 font-medium">
            <Bell className="w-4 h-4 text-purple-600 dark:text-[#c084fc] shrink-0" />
            <span>You have <strong>{unreadNotifsCount} unread notification{unreadNotifsCount > 1 ? 's' : ''}</strong> requiring review.</span>
          </div>
          <Link
            to="/admin/notifications"
            className="text-xs font-bold text-purple-700 dark:text-[#c084fc] hover:underline shrink-0 ml-2"
          >
            View Alerts →
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STATISTIC CARDS (4 Balanced KPI Metrics)                               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Students"
          value={totalStudentsCount}
          icon={<Users className="w-5 h-5" />}
          color="indigo"
          subtitle="Enrolled Commuters"
        />
        <StatCard
          title="Total Buses"
          value={totalBusesCount}
          icon={<BusIcon className="w-5 h-5" />}
          color="blue"
          subtitle="Transit Fleet Vehicles"
        />
        <StatCard
          title="Total In-charges"
          value={totalInchargesCount}
          icon={<UserCheck className="w-5 h-5" />}
          color="emerald"
          subtitle="Assigned Operators"
        />
        <StatCard
          title="Pending Approvals"
          value={pendingApprovalsCount}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
          subtitle={pendingApprovalsCount > 0 ? "Awaiting Review" : "All Caught Up"}
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. TODAY'S ATTENDANCE SUMMARY PANEL                                       */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-[#26262e]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800 shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900 dark:text-white tracking-tight">
                Today's Attendance Summary
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Consolidated overview across all active college bus routes for today
              </p>
            </div>
          </div>

          {/* Single Authoritative Session Status Indicator */}
          <div className="self-start sm:self-auto">
            {isActive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-[#4ade80] border border-emerald-200 dark:border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active ({activeSession?.sessionType || 'Session'})
              </span>
            ) : isCompleted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-sky-500/15 dark:text-[#38bdf8] border border-blue-200 dark:border-sky-500/30">
                Completed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                Not Started
              </span>
            )}
          </div>
        </div>

        {/* 4 Attendance Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1: Total Enrolled */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1a1a20] border border-zinc-200/80 dark:border-[#26262e]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Total Enrolled
            </span>
            <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-white mt-1 block">
              {totalStudentsCount} Commuters
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              Assigned to active fleet
            </span>
          </div>

          {/* Card 2: Present Today */}
          <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Present Today
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
              {presentCount} Commuters
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              {isNotStarted ? 'Awaiting session start' : 'Verified on-board'}
            </span>
          </div>

          {/* Card 3: Pending vs Absent (Terminology strictly aligned with session state) */}
          <div className={`p-3.5 rounded-xl border ${
            isCompleted
              ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/40'
              : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40'
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${
              isCompleted ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {isCompleted ? 'Absent Today' : 'Pending Verification'}
            </span>
            <span className={`text-base sm:text-lg font-black font-mono mt-1 block ${
              isCompleted ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {pendingOrAbsentCount} Commuters
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              {isCompleted
                ? 'Unverified after session close'
                : isNotStarted
                ? 'Scheduled for upcoming shifts'
                : 'Boarding in progress'}
            </span>
          </div>

          {/* Card 4: Turnout */}
          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
              {isCompleted ? 'Final Turnout' : isActive ? 'Boarding Progress' : 'Turnout'}
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">
              {turnoutPercentage != null ? `${turnoutPercentage}%` : '—'}
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              {isNotStarted
                ? 'Session not started'
                : `${presentCount} of ${totalStudentsCount} checked in`}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
          * Attendance sessions and verifications are managed by assigned Bus In-Charges. Administrator access is strictly read-only.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 4. SIMPLE BUS-WISE ATTENDANCE OVERVIEW TABLE                              */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BusIcon className="w-4 h-4 text-purple-600 dark:text-[#c084fc]" />
            <h3 className="text-sm font-black text-zinc-900 dark:text-white">
              Bus-Wise Attendance Overview
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-400">
            {allBuses.length || data?.buses.length || 0} Routes Configured
          </span>
        </div>

        {(!allBuses || allBuses.length === 0) && (!data?.buses || data.buses.length === 0) ? (
          <div className="p-6">
            <EmptyState
              icon={BusIcon}
              title="No Transit Buses Found"
              description="No fleet buses have been configured yet. Add transit routes in the Buses management section."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                <tr>
                  <th className="px-5 py-3.5">Bus & Route</th>
                  <th className="px-5 py-3.5">Assigned In-Charge</th>
                  <th className="px-5 py-3.5">Assigned Students</th>
                  <th className="px-5 py-3.5">Present</th>
                  <th className="px-5 py-3.5">
                    {isCompleted ? 'Absent' : 'Pending'}
                  </th>
                  <th className="px-5 py-3.5">
                    {isCompleted ? 'Turnout %' : 'Status'}
                  </th>
                  <th className="px-5 py-3.5 text-right">Reports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                {(allBuses.length > 0 ? allBuses : data?.buses || []).map((bus) => {
                  const busRoster = (data?.roster || []).filter((r) => r.busId === bus.id);
                  const busStudentsCount =
                    (bus as any).studentsCount ??
                    allStudents.filter((s) => s.busId === bus.id && s.active).length;
                  const busPresentCount = isNotStarted ? 0 : busRoster.filter((r) => r.status === 'PRESENT').length;
                  const busPendingOrAbsentCount = isNotStarted
                    ? busStudentsCount
                    : Math.max(0, busStudentsCount - busPresentCount);

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
                      <td className="px-5 py-3.5 font-bold font-mono">
                        {isCompleted ? (
                          <span className="text-rose-500">{busPendingOrAbsentCount} Absent</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">{busPendingOrAbsentCount} Pending</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-black font-mono">
                        {isNotStarted ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            Not Started
                          </span>
                        ) : isActive ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-[#4ade80]">
                            {busPresentCount}/{busStudentsCount} Verified
                          </span>
                        ) : (
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
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to="/admin/reports"
                          className="px-2.5 py-1 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition"
                        >
                          View Reports →
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
    </div>
  );
};
