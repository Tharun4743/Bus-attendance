import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Bus, Student, SessionInfo, ActiveSession, User } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Users,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Bus as BusIcon,
  CalendarCheck,
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
            to="/admin/reports"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs hover:opacity-90 transition active:scale-95"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Attendance Reports →</span>
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
      {/* 2. OPERATIONAL METRICS (4 Primary KPI Cards)                              */}
      {/* ========================================================================= */}
      {(() => {
        const totalStudentsCount = allStudents.length > 0 ? allStudents.length : (data?.stats.total ?? 0);
        const totalBusesCount = allBuses.length > 0 ? allBuses.length : (data?.buses.length ?? 0);
        const totalInchargesCount = allIncharges.length;
        const pendingApprovalsCount = pendingStudents.length + pendingIncharges.length;

        const presentTodayCount = data?.stats.present ?? 0;
        const totalEligibleCount = data?.stats.total ?? totalStudentsCount;
        const absentTodayCount = Math.max(0, totalEligibleCount - presentTodayCount);
        const turnoutPercentage = data?.stats.percentage ?? 0;

        return (
          <>
            {/* 4 Primary KPI Cards in 4 columns on desktop */}
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
                color="indigo"
                subtitle="Assigned Bus Operators"
              />
              <StatCard
                title="Pending Approvals"
                value={pendingApprovalsCount}
                icon={<Clock className="w-5 h-5" />}
                color="amber"
                subtitle="Awaiting Verification"
              />
            </div>

            {/* ========================================================================= */}
            {/* 3. TODAY'S ATTENDANCE SUMMARY PANEL                                       */}
            {/* ========================================================================= */}
            <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-[#26262e]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800">
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

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {activeSession && activeSession.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      LIVE SESSION BROADCASTING
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                      <Radio className="w-3.5 h-3.5" />
                      Transit Fleet Idle
                    </span>
                  )}
                  <Link
                    to="/admin/reports"
                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-[#c084fc] hover:underline"
                  >
                    <span>Full Reports →</span>
                  </Link>
                </div>
              </div>

              {/* Summary Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1a1a20] border border-zinc-200/80 dark:border-[#26262e]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Session Status
                  </span>
                  <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-white mt-1 block">
                    {activeSession ? `${activeSession.sessionType} Active` : 'No Active Session'}
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">
                    {activeSession ? `${activeSession.busId === 'ALL' ? 'All Buses' : activeSession.busId}` : 'Fleet on Standby'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Present Today
                  </span>
                  <span className="text-sm sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {presentTodayCount} Commuters
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">
                    Verified On-Board
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                    Absent / Remaining
                  </span>
                  <span className="text-sm sm:text-base font-black font-mono text-rose-600 dark:text-rose-400 mt-1 block">
                    {absentTodayCount} Commuters
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">
                    Unverified / Absent
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    Overall Turnout
                  </span>
                  <span className="text-sm sm:text-base font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">
                    {turnoutPercentage}%
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">
                    of {totalEligibleCount} Total Registered
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                * Note: Daily attendance sessions and student verifications are operated strictly by assigned Bus In-Charges. Administrator access is read-only.
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
                <div className="p-8 text-center text-xs font-bold text-zinc-400">
                  No transit buses configured yet. Add buses in Bus Management.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[640px]">
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
                                to="/admin/reports"
                                className="px-2.5 py-1 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition"
                              >
                                Reports →
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
          </>
        );
      })()}
    </div>
  );
};
