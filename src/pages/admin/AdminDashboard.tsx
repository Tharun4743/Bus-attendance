import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, Student, SessionInfo, ActiveSession } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
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
      <div className="flex flex-col items-center justify-center py-20 space-y-2">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto">
      {/* Uniform Header Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#EAE2D2]">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full border border-amber-200 inline-block">
            LIVE MONITORING
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
            Bus Attendance Console
          </h1>
          <p className="text-xs text-amber-900/70 font-medium mt-0.5">
            Real-time GPS location attendance tracking and live student roster.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={refreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F0] hover:bg-stone-200/50 text-slate-700 font-bold rounded-xl text-xs transition border border-[#EAE2D2] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F0] hover:bg-stone-200/50 text-slate-700 font-bold rounded-xl text-xs transition border border-[#EAE2D2] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-2.5 sm:p-3 rounded-xl border text-xs font-semibold flex items-center justify-between animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[10px] font-bold uppercase text-slate-500 hover:text-slate-800 px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📍 ATTENDANCE SESSION CONTROLLER (PURE LOCATION - NO CODE)                 */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#EAE2D2] shadow-xs overflow-hidden">
        {activeSession && activeSession.status === 'ACTIVE' ? (
          /* Active Location Session Card */
          <div className="p-3.5 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/40 border-b border-emerald-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black tracking-wider uppercase bg-emerald-600 text-white shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LOCATION ATTENDANCE ACTIVE
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 uppercase bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200">
                    {activeSession.sessionType}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800">
                  <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    Route: <strong className="text-emerald-900">{activeSession.busId === 'ALL' ? 'All Buses' : activeSession.busId}</strong>
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Students mark attendance on their device via GPS location.
                </p>
              </div>

              <div>
                <button
                  onClick={handleEndAttendance}
                  disabled={isEnding}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-70"
                >
                  {isEnding ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Square className="w-3.5 h-3.5 fill-white" />
                  )}
                  <span>END SESSION</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Inactive Launcher Form */
          <form onSubmit={handleStartAttendance} className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 border border-brand-200">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900">
                  Start Location Attendance
                </h2>
                <p className="text-[11px] text-slate-500">
                  Verify students present within the route geofence
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Route Selector */}
              <div className="flex-1 sm:flex-initial min-w-[140px]">
                <select
                  value={selectedBusId}
                  onChange={(e) => setSelectedBusId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-[#EAE2D2] bg-[#FAF7F0] text-slate-900 focus:bg-white outline-none"
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
              <div className="flex items-center gap-0.5 bg-[#FAF7F0] p-0.5 rounded-lg border border-[#EAE2D2]">
                <button
                  type="button"
                  onClick={() => setSessionType('MORNING')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    sessionType === 'MORNING'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sun className="w-3 h-3" />
                  <span>Morning</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSessionType('EVENING')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    sessionType === 'EVENING'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Moon className="w-3 h-3" />
                  <span>Evening</span>
                </button>
              </div>

              {/* Start Button */}
              <button
                type="submit"
                disabled={isStarting}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-xs transition cursor-pointer disabled:opacity-70"
              >
                {isStarting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-3 h-3 fill-white" />
                )}
                <span>START ATTENDANCE</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 📊 SUMMARY METRICS                                                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#EAE2D2] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              TOTAL
            </span>
            <div className="p-1 rounded-md bg-[#FAF7F0] text-slate-600 border border-[#EAE2D2]">
              <Users className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
            {data?.stats.total ?? 0}
          </p>
          <p className="text-[10px] text-slate-500">Registered Students</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#EAE2D2] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              PRESENT
            </span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/60">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">
            {data?.stats.present ?? 0}
          </p>
          <p className="text-[10px] text-emerald-600">Location Verified</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#EAE2D2] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
              NOT PRESENT
            </span>
            <div className="p-1 rounded-md bg-rose-50 text-rose-600 border border-rose-200/60">
              <XCircle className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5">
            {data?.stats.notPresent ?? 0}
          </p>
          <p className="text-[10px] text-rose-500">Unverified</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#EAE2D2] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">
              ATTENDANCE %
            </span>
            <div className="p-1 rounded-md bg-brand-50 text-brand-700 border border-brand-200/60">
              <Percent className="w-3 h-3" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-brand-700 mt-0.5">
            {data?.stats.percentage ?? 0}%
          </p>
          <p className="text-[10px] text-slate-500">Turnout Rate</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📑 TABS: LIVE ROSTER vs PENDING APPROVALS                                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#EAE2D2] shadow-xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="p-2.5 sm:p-3 border-b border-[#EAE2D2] bg-[#FAF7F0]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#EAE2D2] self-start">
            <button
              onClick={() => setActiveTab('roster')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                activeTab === 'roster'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Live Roster</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'roster' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {filteredRoster.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                activeTab === 'approvals'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Approvals</span>
              {pendingStudents.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                  {pendingStudents.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'roster' && (
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Search Box */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name / reg no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-44 pl-8 pr-2.5 py-1.5 text-xs rounded-lg bg-white border border-[#EAE2D2] text-slate-900 placeholder:text-slate-400 outline-none"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#EAE2D2] text-slate-700 outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="PRESENT">Present</option>
                <option value="NOT_PRESENT">Not Present</option>
              </select>

              {/* Bus Filter */}
              <select
                value={busFilter}
                onChange={(e) => setBusFilter(e.target.value)}
                className="px-2 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#EAE2D2] text-slate-700 outline-none"
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
              <div className="text-center py-12 px-4 space-y-1.5">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No students match current filters.</p>
              </div>
            ) : (
              <>
                {/* Desktop & Laptop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FAF7F0] border-b border-[#EAE2D2] text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <th className="py-2 px-3">Student</th>
                        <th className="py-2 px-3">Reg No</th>
                        <th className="py-2 px-3">Bus Route</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Location Distance</th>
                        <th className="py-2 px-3">Time</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE2D2]/60">
                      {filteredRoster.map((stu) => {
                        const isPresent = stu.status === 'PRESENT';
                        return (
                          <tr key={stu.studentId} className="hover:bg-slate-50/80 transition">
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {stu.name}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-brand-700">
                              {stu.registerNumber}
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-medium">
                              {stu.busNumber || stu.busId}
                            </td>
                            <td className="py-2 px-3">
                              <StatusBadge status={stu.status} />
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-600">
                              {stu.distanceMeters !== null ? (
                                <span className="font-mono text-emerald-700 font-semibold">{stu.distanceMeters}m from bus</span>
                              ) : isPresent ? (
                                <span className="text-emerald-700 font-semibold">Location Verified</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-500 font-mono">
                              {stu.verifiedAt ? (
                                new Date(stu.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => handleToggleStudentStatus(stu.studentId, stu.status)}
                                className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                                  isPresent
                                    ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
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

                {/* Mobile Responsive Card List (No clipping on small screens!) */}
                <div className="md:hidden divide-y divide-[#EAE2D2]/60">
                  {filteredRoster.map((stu) => {
                    const isPresent = stu.status === 'PRESENT';
                    return (
                      <div key={stu.studentId} className="p-3 flex items-center justify-between gap-2.5">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-900">{stu.name}</p>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-mono font-bold text-brand-700">{stu.registerNumber}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600">{stu.busNumber}</span>
                          </div>
                          {stu.verifiedAt && (
                            <p className="text-[10px] text-emerald-700 font-mono">
                              Verified {new Date(stu.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <StatusBadge status={stu.status} size="sm" />
                          <button
                            onClick={() => handleToggleStudentStatus(stu.studentId, stu.status)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                              isPresent
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
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
          <div className="p-3 sm:p-5 space-y-3">
            {pendingStudents.length === 0 ? (
              <div className="text-center py-10 space-y-1.5">
                <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                <h3 className="text-xs font-bold text-slate-800">No Pending Approvals</h3>
                <p className="text-[11px] text-slate-400">All registered students have been assigned routes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pendingStudents.map((stu) => {
                  const currentBus =
                    selectedBusesForApproval[stu.id] ||
                    stu.preferredBusId ||
                    data?.buses[0]?.id ||
                    'BUS06';

                  return (
                    <div
                      key={stu.id}
                      className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-black text-slate-900">{stu.name}</h4>
                          <p className="text-[11px] font-mono font-bold text-brand-700">{stu.registerNumber}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      </div>

                      <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2">
                        <select
                          value={currentBus}
                          onChange={(e) =>
                            setSelectedBusesForApproval({
                              ...selectedBusesForApproval,
                              [stu.id]: e.target.value,
                            })
                          }
                          className="flex-1 px-2 py-1 text-xs font-bold rounded-md border border-[#EAE2D2] bg-white text-slate-900 outline-none"
                        >
                          {(data?.buses || []).map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.busNumber}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRejectStudent(stu.id)}
                            disabled={isProcessingApproval === stu.id}
                            className="px-2 py-1 rounded-md text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveStudent(stu.id)}
                            disabled={isProcessingApproval === stu.id}
                            className="px-2.5 py-1 rounded-md text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer"
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
