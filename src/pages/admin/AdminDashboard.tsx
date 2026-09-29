import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, Student, SessionInfo, ActiveSession } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
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
  Search,
  Download,
  UserCheck,
  AlertCircle,
  Sun,
  Moon,
  CheckCheck,
  MapPin,
  Compass,
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
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isEnding, setIsEnding] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pending Approvals List
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [selectedBusesForApproval, setSelectedBusesForApproval] = useState<Record<string, string>>({});
  const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);

  // UI Navigation & Filters
  const [activeTab, setActiveTab] = useState<'roster' | 'approvals'>('roster');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [busFilter, setBusFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
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

  // Fetch Pending Student Approvals
  const fetchPendingApprovals = async () => {
    try {
      const pending = await api.getPendingApprovals();
      setPendingStudents(pending || []);
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
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 1-Click Start Attendance (Location Geofence Mode)
  const handleStartAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStarting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/attendance/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bus_token')}`,
        },
        body: JSON.stringify({
          sessionType,
          attendanceMode: 'GROUND',
          verificationMethod: 'CODE_GPS',
          busId: selectedBusId,
          radiusMeters: 50,
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

  // Fast 1-Click Override (Mark Present / Absent)
  const handleToggleStudentStatus = async (studentId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'PRESENT' ? 'NOT_PRESENT' : 'PRESENT';
      await api.adminOverride({
        studentId,
        date: data?.date,
        newStatus,
        reason: 'Direct Admin override',
      });
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to update attendance.');
    }
  };

  // 1-Click Student Approval
  const handleApproveStudent = async (studentId: string) => {
    const busId = selectedBusesForApproval[studentId] || data?.buses[0]?.id || 'BUS06';
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

  // 1-Click Student Rejection
  const handleRejectStudent = async (studentId: string) => {
    if (!confirm('Reject this student registration?')) return;
    setIsProcessingApproval(studentId);
    try {
      await api.rejectStudent(studentId, 'Rejected by Administrator');
      await fetchPendingApprovals();
    } catch (err: any) {
      alert(err.message || 'Failed to reject student.');
    } finally {
      setIsProcessingApproval(null);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!data || !data.roster.length) return;
    const headers = ['Register Number', 'Full Name', 'Bus Number', 'Route', 'Status', 'Verified Time'];
    const rows = data.roster.map((r) => [
      r.registerNumber,
      `"${r.name}"`,
      r.busNumber,
      `"${r.routeName}"`,
      r.status,
      r.verifiedAt || 'N/A',
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bus_attendance_${data.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Roster
  const filteredRoster = (data?.roster || []).filter((stu) => {
    const matchesSearch =
      stu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stu.registerNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBus = busFilter === 'ALL' || stu.busId === busFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PRESENT' && stu.status === 'PRESENT') ||
      (statusFilter === 'NOT_PRESENT' && stu.status !== 'PRESENT');
    return matchesSearch && matchesBus && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Uniform Header Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <Badge variant="emerald" className="mb-2">
            LIVE MONITORING
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Bus Attendance Console
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Real-time GPS location attendance tracking and live student roster.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            onClick={refreshAll}
            disabled={isRefreshing}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="secondary"
            size="sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
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
      {/* 📍 ATTENDANCE SESSION CONTROLLER                                          */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs overflow-hidden transition-all">
        {activeSession && activeSession.status === 'ACTIVE' ? (
          /* Active Location Session Card */
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-emerald-50/50 dark:from-emerald-950/20 dark:via-[#141418] dark:to-emerald-950/10 border-b border-emerald-200 dark:border-emerald-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-600 text-white shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LOCATION ATTENDANCE ACTIVE
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
                  Students mark attendance on their personal device via verified GPS geofence.
                </p>
              </div>

              <div>
                <Button
                  onClick={handleEndAttendance}
                  disabled={isEnding}
                  variant="danger"
                  size="md"
                  className="w-full sm:w-auto"
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
          /* Inactive Launcher Form */
          <form onSubmit={handleStartAttendance} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-[#1a1a20] text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-[#26262e]">
                <Compass className="w-5 h-5 text-emerald-600 dark:text-[#4ade80]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white tracking-tight">
                  Start Location Attendance
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Verify students present within the route geofence
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Route Selector */}
              <div className="flex-1 sm:flex-initial min-w-[150px]">
                <select
                  value={selectedBusId}
                  onChange={(e) => setSelectedBusId(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#26262e] bg-zinc-50 dark:bg-[#1a1a20] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
                >
                  <option value="ALL">All Buses</option>
                  {(data?.buses || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.busNumber} — {b.routeName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Session Type */}
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

              {/* Start Button */}
              <Button
                type="submit"
                disabled={isStarting}
                variant="emerald"
                size="md"
                className="w-full sm:w-auto"
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
      {/* 📊 SUMMARY METRICS                                                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total"
          value={data?.stats.total ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="indigo"
          subtitle="Registered Students"
        />

        <StatCard
          title="Present"
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
          subtitle="Unverified"
        />

        <StatCard
          title="Turnout Rate"
          value={`${data?.stats.percentage ?? 0}%`}
          icon={<Percent className="w-5 h-5" />}
          color="blue"
          subtitle="Attendance Rate"
        />
      </div>

      {/* ========================================================================= */}
      {/* 📑 TABS: LIVE ROSTER vs PENDING APPROVALS                                  */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs overflow-hidden transition-all">
        {/* Navigation Tabs Header */}
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#1a1a20] p-1 rounded-xl border border-zinc-200 dark:border-[#26262e] self-start">
            <button
              onClick={() => setActiveTab('roster')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 ${
                activeTab === 'roster'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Live Roster</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'roster' 
                  ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
              }`}>
                {filteredRoster.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 ${
                activeTab === 'approvals'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Approvals</span>
              {pendingStudents.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                  {pendingStudents.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'roster' && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Box */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search name / reg no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-48 pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#2e2e38] text-zinc-700 dark:text-zinc-300 outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="PRESENT">Present</option>
                <option value="NOT_PRESENT">Not Present</option>
              </select>

              {/* Bus Filter */}
              <select
                value={busFilter}
                onChange={(e) => setBusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#2e2e38] text-zinc-700 dark:text-zinc-300 outline-none"
              >
                <option value="ALL">All Buses</option>
                {(data?.buses || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.busNumber}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: LIVE ATTENDANCE ROSTER */}
        {activeTab === 'roster' && (
          <div>
            {filteredRoster.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-2">
                <Users className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto" />
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No students match current filters.</p>
                <p className="text-xs text-zinc-500">Try adjusting your search query or route filter.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-50/80 dark:bg-[#101014] border-b border-zinc-200 dark:border-[#26262e] text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Reg No</th>
                        <th className="py-3 px-4">Bus Route</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Location Distance</th>
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                      {filteredRoster.map((stu) => {
                        const isPresent = stu.status === 'PRESENT';
                        return (
                          <tr key={stu.studentId} className="hover:bg-zinc-50/80 dark:hover:bg-[#1a1a20]/60 transition">
                            <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white">
                              {stu.name}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-sky-400">
                              {stu.registerNumber}
                            </td>
                            <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300 font-medium">
                              {stu.busNumber || stu.busId}
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status={stu.status} />
                            </td>
                            <td className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-300">
                              {stu.distanceMeters !== null ? (
                                <span className="font-mono text-emerald-600 dark:text-[#4ade80] font-bold">{stu.distanceMeters}m from bus</span>
                              ) : isPresent ? (
                                <span className="text-emerald-600 dark:text-[#4ade80] font-semibold">Location Verified</span>
                              ) : (
                                <span className="text-zinc-300 dark:text-zinc-600">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                              {stu.verifiedAt ? (
                                new Date(stu.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleToggleStudentStatus(stu.studentId, stu.status)}
                                className={`px-3 py-1 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                                  isPresent
                                    ? 'bg-zinc-100 hover:bg-rose-50 dark:bg-zinc-800 dark:hover:bg-rose-950/40 text-zinc-700 dark:text-zinc-300 hover:text-rose-700 dark:hover:text-rose-300 border border-zinc-200 dark:border-zinc-700'
                                    : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-[#4ade80] border border-emerald-200 dark:border-emerald-500/40'
                                }`}
                              >
                                {isPresent ? 'Mark Absent' : 'Mark Present'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Card List */}
                <div className="md:hidden divide-y divide-zinc-100 dark:divide-[#26262e]">
                  {filteredRoster.map((stu) => {
                    const isPresent = stu.status === 'PRESENT';
                    return (
                      <div key={stu.studentId} className="p-3.5 flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">{stu.name}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-blue-600 dark:text-sky-400">{stu.registerNumber}</span>
                            <span className="text-zinc-400">•</span>
                            <span className="text-zinc-600 dark:text-zinc-400">{stu.busNumber}</span>
                          </div>
                          {stu.verifiedAt && (
                            <p className="text-[10px] text-emerald-600 dark:text-[#4ade80] font-mono">
                              Verified {new Date(stu.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <StatusBadge status={stu.status} size="sm" />
                          <button
                            onClick={() => handleToggleStudentStatus(stu.studentId, stu.status)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition active:scale-95 cursor-pointer ${
                              isPresent
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {isPresent ? 'Mark Absent' : 'Mark Present'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: PENDING APPROVALS */}
        {activeTab === 'approvals' && (
          <div className="p-4 sm:p-6 space-y-3">
            {pendingStudents.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <CheckCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Pending Approvals</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">All registered students have been assigned routes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pendingStudents.map((stu) => {
                  const currentBus =
                    selectedBusesForApproval[stu.id] ||
                    stu.preferredBusId ||
                    data?.buses[0]?.id ||
                    'BUS06';

                  return (
                    <div
                      key={stu.id}
                      className="p-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/40 dark:bg-[#1a1a20] flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">{stu.name}</h4>
                          <p className="text-xs font-mono font-bold text-blue-600 dark:text-sky-400">{stu.registerNumber}</p>
                        </div>
                        <Badge variant="amber">
                          Pending
                        </Badge>
                      </div>

                      <div className="pt-3 border-t border-amber-200/60 dark:border-[#26262e] flex items-center justify-between gap-2">
                        <select
                          value={currentBus}
                          onChange={(e) =>
                            setSelectedBusesForApproval({
                              ...selectedBusesForApproval,
                              [stu.id]: e.target.value,
                            })
                          }
                          className="flex-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-white dark:bg-[#141418] text-zinc-900 dark:text-white outline-none"
                        >
                          {(data?.buses || []).map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.busNumber}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRejectStudent(stu.id)}
                            disabled={isProcessingApproval === stu.id}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 transition cursor-pointer active:scale-95"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveStudent(stu.id)}
                            disabled={isProcessingApproval === stu.id}
                            className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer active:scale-95 shadow-xs"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
