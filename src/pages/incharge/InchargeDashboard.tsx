import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, SessionInfo, ActiveSession } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import {
  Users,
  CheckCircle,
  XCircle,
  Percent,
  Search,
  Radio,
  Clock,
  MapPin,
  RefreshCw,
  Download,
  Camera,
  Fingerprint,
  Key,
  X,
  Square,
} from 'lucide-react';
import { formatISTTime, formatISTTime24 } from '../../utils/time';
import { InchargeMapPickerModal } from '../../components/incharge/InchargeMapPickerModal';

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
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);
  const [sessionType, setSessionType] = useState<'MORNING' | 'EVENING'>('MORNING');
  const [selectedModeForModal, setSelectedModeForModal] = useState<'GROUND' | 'TRAVELLING'>('GROUND');
  const [isEnding, setIsEnding] = useState<boolean>(false);

  // Selfie Modal
  const [previewSelfie, setPreviewSelfie] = useState<{
    url: string;
    name: string;
    reg: string;
    confidence?: number | null;
  } | null>(null);

  // Fetch Live Bus Roster
  const fetchData = async () => {
    try {
      const res = await api.getInchargeAttendance();
      setData(res);
    } catch (err) {
      console.error('Failed to load incharge attendance:', err);
    }
  };

  // Fetch Active Dynamic Attendance Session
  const [todayHistory, setTodayHistory] = useState<any[]>([]);

  const fetchSession = async () => {
    try {
      const sess = await api.getSessionInfo();
      if (sess.activeSession && sess.activeSession.status === 'ACTIVE') {
        setActiveSession(sess.activeSession);
      } else {
        setActiveSession(null);
      }
      if (sess.sessionType) {
        setSessionType(sess.sessionType);
      }
    } catch (err) {
      console.error('Failed to load session info:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const history = await api.getInchargeHistory();
      setTodayHistory(history || []);
    } catch (err) {
      console.error('Failed to load incharge history:', err);
    }
  };

  const refreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchData(), fetchSession(), fetchHistory()]);
    setIsLoading(false);
    setIsRefreshing(false);
  };

  // Smart Polling: 25s background interval + instant revalidation on tab focus
  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchData();
      fetchSession();
      fetchHistory();
    }, 25000);

    const onFocus = () => {
      fetchData();
      fetchSession();
      fetchHistory();
    };

    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // End Live Session
  const handleEndSession = async () => {
    if (!activeSession) return;
    if (!window.confirm(`Are you sure you want to end the ${activeSession.sessionType} attendance session for Bus ${data?.bus.busNumber}? This will finalize the session report.`)) {
      return;
    }
    setIsEnding(true);
    try {
      const res = await fetch('/api/attendance/session/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bus_token')}`,
        },
        body: JSON.stringify({ sessionId: activeSession.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to close session.');
      }

      await refreshAll();
    } catch (err: any) {
      alert(err.message || 'Error closing session.');
    } finally {
      setIsEnding(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!data || !data.roster.length) return;
    const headers = ['Register Number', 'Student Name', 'Status', 'Verification Method', 'Confidence', 'Verified Time', 'Distance'];
    const rows = data.roster.map((r: any) => [
      r.registerNumber,
      `"${r.name}"`,
      r.status,
      r.verificationMethod || 'N/A',
      r.faceMatchConfidence ? `${r.faceMatchConfidence}%` : 'N/A',
      r.verifiedAt ? formatISTTime24(r.verifiedAt) : 'N/A',
      r.distanceMeters != null ? `${r.distanceMeters}m` : 'N/A',
    ]);
    const csvContent = [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${data.bus.busNumber}_attendance_${data.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Roster
  const filteredRoster = (data?.roster || []).filter((stu: any) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = stu.name.toLowerCase().includes(q) || stu.registerNumber.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PRESENT' && stu.status === 'PRESENT') ||
      (statusFilter === 'NOT_PRESENT' && stu.status === 'NOT_PRESENT');
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-zinc-500 font-bold">Synchronizing Live Fleet Status...</p>
      </div>
    );
  }

  if (!data || !data.bus) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center font-bold text-xl">
          ⚠️
        </div>
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">No Bus Route Assigned</h2>
        <p className="text-xs text-zinc-500">
          Your incharge profile currently has no assigned bus. Contact administrator to link your vehicle number.
        </p>
      </div>
    );
  }

  const isCurrentBusSessionActive = activeSession && activeSession.busId === data.bus.id;

  return (
    <div className="space-y-4 sm:space-y-5 w-full mx-auto pb-8">
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION                                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#141418] p-3.5 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
            <span>Bus {data.bus.busNumber}</span>
            <span className="text-zinc-400 font-normal">•</span>
            <span className="text-zinc-600 dark:text-zinc-300 font-bold">{data.bus.routeName}</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1 flex items-center gap-2 flex-wrap">
            <span>Live Biometric & GPS Geofence Console</span>
            <span>•</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{data.date}</span>
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

      {/* ========================================================================= */}
      {/* 2. ATTENDANCE SESSION CONTROLLER                                          */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs overflow-hidden transition-all">
        {isCurrentBusSessionActive ? (
          /* ACTIVE SESSION CARD */
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-emerald-50/50 dark:from-emerald-950/20 dark:via-[#141418] dark:to-emerald-950/10 border-b border-emerald-200 dark:border-emerald-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-600 text-white shadow-xs">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-200" />
                    ATTENDANCE ACTIVE • {activeSession.sessionType}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-300/60 dark:border-amber-800">
                    {activeSession.attendanceMode === 'TRAVELLING' ? '🚌 Travelling Highway Mode' : '🛑 Stationary Bus Bay Mode'}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-300/60 dark:border-emerald-800">
                    📸 Face & Biometric Check Open
                  </span>
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-3 pt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Geofence: <strong>{activeSession.radiusMeters || (activeSession.attendanceMode === 'TRAVELLING' ? 1000 : 35)}m Radius</strong>
                    <span className="text-zinc-400 font-normal">
                      {activeSession.attendanceMode === 'TRAVELLING' ? '(Extended Motion Tolerance)' : '(Strict Boarding Perimeter)'}
                    </span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Started: {activeSession.startedAt ? formatISTTime(activeSession.startedAt) : 'Live'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleEndSession}
                  disabled={isEnding}
                  variant="danger"
                  size="md"
                  className="shadow-sm font-black w-full sm:w-auto"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>{isEnding ? 'Closing Session...' : 'Close Attendance Session'}</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* IDLE / CLOSED SESSION CARD WITH DUAL-MODE DISPATCH */
          <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  SESSION CLOSED
                </span>
                <span className="text-xs text-zinc-500 font-medium">Auto-fetches device live GPS. Select your starting mode:</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                Ready to begin passenger boarding for {data.bus.busNumber}?
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
              {/* Session Type (Morning vs Evening) */}
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as 'MORNING' | 'EVENING')}
                className="w-full sm:w-auto text-xs font-bold bg-zinc-50 dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#2e2e38] rounded-xl px-3 py-2 sm:py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shrink-0"
              >
                <option value="MORNING">🌅 Morning Transit (Inbound)</option>
                <option value="EVENING">🌆 Evening Transit (Return)</option>
              </select>

              {/* Transit Starting Mode (Stationary Bay vs Travelling) */}
              <select
                value={selectedModeForModal}
                onChange={(e) => setSelectedModeForModal(e.target.value as 'GROUND' | 'TRAVELLING')}
                className="w-full sm:w-auto text-xs font-bold bg-zinc-50 dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#2e2e38] rounded-xl px-3 py-2 sm:py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shrink-0"
              >
                <option value="GROUND">🛑 Stationary Bus Bay (~35m Radius)</option>
                <option value="TRAVELLING">🚌 Travelling Transit (~1000m Radius)</option>
              </select>

              {/* Unified Start Live Attendance Button */}
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/25 active:scale-95 shrink-0 whitespace-nowrap"
                title="Auto-detects live bus GPS and starts attendance session"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Start Live Attendance</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. FOUR KPI STAT CARDS                                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Assigned Commuters"
          value={data.stats.total}
          icon={<Users className="w-5 h-5" />}
          color="indigo"
          subtitle="Registered to Bus"
        />

        <StatCard
          title="Verified Present"
          value={data.stats.present}
          icon={<CheckCircle className="w-5 h-5" />}
          color="emerald"
          subtitle="Face / Phone Verified"
        />

        <StatCard
          title="Unverified / Absent"
          value={data.stats.notPresent}
          icon={<XCircle className="w-5 h-5" />}
          color="rose"
          subtitle="Pending Boarding"
        />

        <StatCard
          title="Turnout Rate"
          value={`${data.stats.percentage}%`}
          icon={<Percent className="w-5 h-5" />}
          color="blue"
          subtitle="Live Bus Capacity"
        />
      </div>

      {/* ========================================================================= */}
      {/* 3.5 MORNING & EVENING ATTENDANCE OVERVIEW CARDS                           */}
      {/* ========================================================================= */}
      {(() => {
        const currentDate = data.date;
        const morningRecords = todayHistory.filter((r) => r.attendanceDate === currentDate && r.sessionType === 'MORNING');
        const morningPresent = morningRecords.filter((r) => r.status === 'PRESENT').length;
        const morningTotal = data.stats.total;
        const morningPct = morningTotal > 0 ? Math.round((morningPresent / morningTotal) * 10000) / 100 : 0;

        const eveningRecords = todayHistory.filter((r) => r.attendanceDate === currentDate && r.sessionType === 'EVENING');
        const eveningPresent = eveningRecords.filter((r) => r.status === 'PRESENT').length;
        const eveningTotal = data.stats.total;
        const eveningPct = eveningTotal > 0 ? Math.round((eveningPresent / eveningTotal) * 10000) / 100 : 0;

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Morning Attendance Overview Card */}
            <div className="p-4 sm:p-5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🌅</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                    Morning Attendance Overview
                  </h4>
                </div>
                <Badge variant="blue">{morningPct}% Turnout</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#1a1a20]">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Commuters</span>
                  <span className="text-sm font-black font-mono text-zinc-900 dark:text-white">{morningTotal}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">Present</span>
                  <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">{morningPresent}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30">
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase block">Absent</span>
                  <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">{Math.max(0, morningTotal - morningPresent)}</span>
                </div>
              </div>
            </div>

            {/* Evening Attendance Overview Card */}
            <div className="p-4 sm:p-5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🌆</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                    Evening Attendance Overview
                  </h4>
                </div>
                <Badge variant="indigo">{eveningPct}% Turnout</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#1a1a20]">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Commuters</span>
                  <span className="text-sm font-black font-mono text-zinc-900 dark:text-white">{eveningTotal}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">Present</span>
                  <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">{eveningPresent}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30">
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase block">Absent</span>
                  <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">{Math.max(0, eveningTotal - eveningPresent)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 4. STUDENT ATTENDANCE ROSTER (Responsive Table + Mobile Cards)            */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden transition-all">
        {/* Table Filter Bar */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-200/90 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name or register number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#16161c] border border-zinc-200 dark:border-[#2a2a34] rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-200/60 dark:bg-[#1c1c24] p-0.5 rounded-xl text-xs font-bold w-full sm:w-auto justify-between">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 sm:flex-none px-3 py-1 rounded-lg transition-all text-center ${statusFilter === 'ALL' ? 'bg-white dark:bg-[#101014] text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
              >
                All ({data.stats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PRESENT')}
                className={`flex-1 sm:flex-none px-3 py-1 rounded-lg transition-all text-center ${statusFilter === 'PRESENT' ? 'bg-white dark:bg-[#101014] text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
              >
                Present ({data.stats.present})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('NOT_PRESENT')}
                className={`flex-1 sm:flex-none px-3 py-1 rounded-lg transition-all text-center ${statusFilter === 'NOT_PRESENT' ? 'bg-white dark:bg-[#101014] text-rose-600 dark:text-rose-400 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
              >
                Absent ({data.stats.notPresent})
              </button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredRoster.length === 0 ? (
          <div className="p-8 sm:p-10 text-center space-y-2">
            <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
            <p className="text-xs font-bold text-zinc-500">No students match current search filter.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                  <tr>
                    <th className="px-5 py-3.5">Reg Number</th>
                    <th className="px-5 py-3.5">Student Name</th>
                    <th className="px-5 py-3.5">Attendance Status</th>
                    <th className="px-5 py-3.5">Verification Mode</th>
                    <th className="px-5 py-3.5">Boarding Time</th>
                    <th className="px-5 py-3.5">Distance</th>
                    <th className="px-5 py-3.5 text-right">Selfie Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                  {filteredRoster.map((stu: any) => (
                    <tr key={stu.studentId} className="hover:bg-zinc-50/70 dark:hover:bg-[#1a1a20]/60 transition">
                      <td className="px-5 py-3.5 font-bold font-mono text-blue-600 dark:text-sky-400">
                        {stu.registerNumber}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-zinc-900 dark:text-white">
                        {stu.name}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={stu.status} size="sm" />
                      </td>
                      <td className="px-5 py-3.5">
                        {stu.verificationMethod === 'FACE_GPS' ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                              <Camera className="w-3 h-3" />
                              Face + GPS
                            </span>
                            {stu.faceMatchConfidence != null && (
                              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                                ({stu.faceMatchConfidence}%)
                              </span>
                            )}
                          </div>
                        ) : stu.verificationMethod === 'PHONE_BIOMETRIC_GPS' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                            <Fingerprint className="w-3 h-3" />
                            Phone Biometric
                          </span>
                        ) : stu.verificationMethod === 'DYNAMIC_CODE_GPS' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                            <Key className="w-3 h-3" />
                            Code + GPS
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-mono">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 font-mono">
                        {stu.verifiedAt ? formatISTTime(stu.verifiedAt) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 font-mono">
                        {stu.distanceMeters != null ? `${Math.round(stu.distanceMeters)}m` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {stu.selfieImageUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewSelfie({ url: stu.selfieImageUrl!, name: stu.name, reg: stu.registerNumber, confidence: stu.faceMatchConfidence })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-[#202028] dark:hover:bg-[#282834] text-[11px] font-bold text-sky-600 dark:text-sky-400 transition cursor-pointer"
                          >
                            <Camera className="w-3 h-3" />
                            <span>View Selfie</span>
                          </button>
                        ) : (
                          <span className="text-zinc-400 font-mono text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch Cards View (< 640px) */}
            <div className="block sm:hidden divide-y divide-zinc-100 dark:divide-[#24242e]">
              {filteredRoster.map((stu: any) => (
                <div key={stu.studentId} className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-zinc-900 dark:text-white leading-tight">{stu.name}</h4>
                      <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-sky-400">{stu.registerNumber}</span>
                    </div>
                    <StatusBadge status={stu.status} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      {stu.verifiedAt ? formatISTTime(stu.verifiedAt) : 'Pending'}
                    </span>
                    {stu.distanceMeters != null && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <MapPin className="w-3 h-3" />
                        {Math.round(stu.distanceMeters)}m
                      </span>
                    )}
                  </div>

                  {stu.selfieImageUrl && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewSelfie({ url: stu.selfieImageUrl!, name: stu.name, reg: stu.registerNumber, confidence: stu.faceMatchConfidence })}
                        className="w-full py-1.5 px-3 rounded-lg bg-zinc-100 dark:bg-[#1e1e26] text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>View Verified Face Selfie</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. AUDIT SELFIE MODAL PREVIEW                                             */}
      {/* ========================================================================= */}
      {previewSelfie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#141418] border border-zinc-200 dark:border-[#2e2e38] rounded-2xl shadow-2xl overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#23232a] pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{previewSelfie.name}</h3>
                <p className="text-xs text-blue-600 dark:text-sky-400 font-mono font-bold">{previewSelfie.reg}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSelfie(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-[#2e2e38] bg-zinc-950 flex items-center justify-center">
              <img
                src={previewSelfie.url}
                alt="Student Verification Selfie"
                className="w-full h-full object-cover"
              />
              {previewSelfie.confidence != null && (
                <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center justify-between">
                  <span>Match Confidence:</span>
                  <span className="font-bold text-emerald-400">{previewSelfie.confidence}%</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button onClick={() => setPreviewSelfie(null)} variant="secondary" size="sm">
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. INTERACTIVE MAP LOCATION PICKER MODAL                                  */}
      {/* ========================================================================= */}
      {data?.bus && (
        <InchargeMapPickerModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          bus={data.bus}
          initialSessionType={sessionType}
          initialAttendanceMode={selectedModeForModal}
          onSessionStarted={refreshAll}
        />
      )}
    </div>
  );
};
