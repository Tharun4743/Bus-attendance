import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, SessionInfo, ActiveSession } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Bus as BusIcon,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  Percent,
  Camera,
  Fingerprint,
  Key,
  Square,
  Search,
  Download,
  MapPin,
  Clock,
  Radio,
  X,
} from 'lucide-react';
import { InchargeMapPickerModal } from '../../components/incharge/InchargeMapPickerModal';
import { formatISTTime, formatISTTime24 } from '../../utils/time';

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

  // Active Session & Controls
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [sessionType, setSessionType] = useState<'MORNING' | 'EVENING'>('MORNING');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'NOT_PRESENT'>('ALL');
  const [previewSelfie, setPreviewSelfie] = useState<{ url: string; name: string; reg: string; confidence?: number | null } | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Fetch Attendance Roster
  const fetchData = async () => {
    try {
      const res = await api.getInchargeAttendance();
      setData(res);
    } catch (err) {
      console.error('Failed to load incharge attendance:', err);
    }
  };

  // Fetch Session State
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
    await Promise.all([fetchData(), fetchSession()]);
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchData();
      fetchSession();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // End Live Session
  const handleEndSession = async () => {
    if (!activeSession) return;
    setIsEnding(true);
    try {
      const res = await fetch('/api/admin/attendance/end', {
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
    const rows = data.roster.map((r) => [
      r.registerNumber,
      `"${r.name}"`,
      r.status,
      r.verificationMethod || 'N/A',
      r.faceMatchConfidence ? `${r.faceMatchConfidence}%` : 'N/A',
      r.verifiedAt ? formatISTTime24(r.verifiedAt) : 'N/A',
      r.distanceMeters != null ? `${r.distanceMeters}m` : 'N/A',
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
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
  const filteredRoster = (data?.roster || []).filter((stu) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = stu.name.toLowerCase().includes(q) || stu.registerNumber.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PRESENT' && stu.status === 'PRESENT') ||
      (statusFilter === 'NOT_PRESENT' && stu.status !== 'PRESENT');
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Loading In-Charge Console...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200 dark:border-[#26262e] space-y-3">
        <BusIcon className="w-12 h-12 text-zinc-400 mx-auto" />
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">No Bus Assigned</h2>
        <p className="text-xs text-zinc-500">Your incharge account currently has no assigned bus. Contact administrator.</p>
      </div>
    );
  }

  const isCurrentBusSessionActive =
    activeSession && activeSession.status === 'ACTIVE' && (activeSession.busId === 'ALL' || activeSession.busId === data.bus.id);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. UNIFORM EXECUTIVE HEADER (Matching Admin Console Aesthetics)          */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="blue">BUS INCHARGE CONSOLE</Badge>
            <span className="text-xs font-mono font-bold text-zinc-400">ID: {data.bus.id}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>{data.bus.busNumber}</span>
            <span className="text-zinc-400 font-normal text-lg sm:text-xl">•</span>
            <span className="text-zinc-600 dark:text-zinc-300 text-lg sm:text-xl font-bold">{data.bus.routeName}</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1 flex items-center gap-2">
            <span>Real-time Smartphone Face Recognition & Geofenced Passenger Audit</span>
            <span>•</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{data.date}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
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
          <div className="p-5 bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-emerald-50/50 dark:from-emerald-950/20 dark:via-[#141418] dark:to-emerald-950/10 border-b border-emerald-200 dark:border-emerald-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-600 text-white shadow-xs">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-200" />
                    ATTENDANCE ACTIVE • {activeSession.sessionType}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-300/60 dark:border-emerald-800">
                    📸 Face & Biometric Check Open
                  </span>
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-3 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Geofence: <strong>{activeSession.radiusMeters || 100}m Radius</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
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
                  className="shadow-sm font-black"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>{isEnding ? 'Closing Session...' : 'Close Attendance Session'}</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* IDLE / CLOSED SESSION CARD */
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  SESSION CLOSED
                </span>
                <span className="text-xs text-zinc-500 font-medium">Students cannot mark attendance until you start transit.</span>
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Ready to begin boarding for {data.bus.busNumber}?
              </h3>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as 'MORNING' | 'EVENING')}
                className="text-xs font-bold bg-zinc-50 dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#2e2e38] rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option value="MORNING">Morning Transit</option>
                <option value="EVENING">Evening Transit</option>
              </select>

              <Button
                onClick={() => setIsMapModalOpen(true)}
                variant="primary"
                size="md"
                className="font-black bg-amber-500 hover:bg-amber-400 active:scale-95 text-white shadow-md shadow-amber-500/20"
              >
                <MapPin className="w-4 h-4 fill-current" />
                <span>Select Location on Map & Start</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. FOUR KPI STAT CARDS                                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
      {/* 4. STUDENT ATTENDANCE ROSTER (Sleek Task-Manager Table)                    */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden transition-all">
        {/* Table Filter Bar */}
        <div className="p-4 border-b border-zinc-200/90 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            <div className="flex bg-zinc-200/60 dark:bg-[#1c1c24] p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-white dark:bg-[#101014] text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
              >
                All ({data.stats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PRESENT')}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'PRESENT' ? 'bg-white dark:bg-[#101014] text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
              >
                Present ({data.stats.present})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('NOT_PRESENT')}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'NOT_PRESENT' ? 'bg-white dark:bg-[#101014] text-rose-600 dark:text-rose-400 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
              >
                Absent ({data.stats.notPresent})
              </button>
            </div>
          </div>
        </div>

        {/* Table Body */}
        {filteredRoster.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
            <p className="text-xs font-bold text-zinc-500">No students match current search filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
                {filteredRoster.map((stu) => (
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
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. AUDIT SELFIE MODAL PREVIEW                                             */}
      {/* ========================================================================= */}
      {previewSelfie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#141418] border border-zinc-200 dark:border-[#2e2e38] rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#23232a] pb-3">
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
      {/* 5. INTERACTIVE MAP LOCATION PICKER MODAL                                  */}
      {/* ========================================================================= */}
      {data?.bus && (
        <InchargeMapPickerModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          bus={data.bus}
          initialSessionType={sessionType}
          onSessionStarted={refreshAll}
        />
      )}
    </div>
  );
};
