import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ActiveSession, Bus, SessionType, AttendanceMode, VerificationMethod } from '../../types';
import {
  Play,
  Square,
  Navigation,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Sun,
  Moon,
  Radio,
  Copy,
  Check,
  Clock,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

interface StartAttendanceModalProps {
  buses: Bus[];
  onSessionChanged?: () => void;
}

export const StartAttendanceModal: React.FC<StartAttendanceModalProps> = ({
  buses,
  onSessionChanged,
}) => {
  const [sessionType, setSessionType] = useState<SessionType>('MORNING');
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>('TRAVELLING');
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('CODE_GPS');
  const [selectedBusId, setSelectedBusId] = useState<string>(buses[0]?.id || 'BUS06');
  const [radiusMeters, setRadiusMeters] = useState<number>(10);

  useEffect(() => {
    if (buses.length > 0 && (!selectedBusId || !buses.some((b) => b.id === selectedBusId))) {
      setSelectedBusId(buses[0].id);
    }
  }, [buses]);

  // Active Session State
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionStats, setSessionStats] = useState<{ total: number; present: number; notPresent: number } | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isEnding, setIsEnding] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(60);

  const fetchActiveSession = async () => {
    try {
      const sess = await api.getSessionInfo();
      if (sess.activeSession && sess.activeSession.status === 'ACTIVE') {
        setActiveSession(sess.activeSession);
        // Fetch live roster stats
        const todayData = await api.getTodayAttendance();
        const busRoster = todayData.roster.filter((r) =>
          sess.activeSession?.busId === 'ALL' ? true : r.busId === sess.activeSession?.busId
        );
        const present = busRoster.filter((r) => r.status === 'PRESENT').length;
        setSessionStats({
          total: busRoster.length,
          present,
          notPresent: busRoster.length - present,
        });
      } else {
        setActiveSession(null);
        setSessionStats(null);
      }
    } catch (err) {
      console.error('Failed to fetch active session:', err);
    }
  };

  useEffect(() => {
    fetchActiveSession();
    const interval = setInterval(fetchActiveSession, 4000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for 60s dynamic code expiration
  useEffect(() => {
    if (!activeSession || !activeSession.codeExpiresAt) return;

    const updateTimer = () => {
      const remainingMs = new Date(activeSession.codeExpiresAt).getTime() - Date.now();
      const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
      setTimeLeftSec(remainingSec);
      if (remainingSec === 0) {
        // Refetch to pick up newly rotated server code
        fetchActiveSession();
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [activeSession]);

  const handleCopyCode = () => {
    if (!activeSession?.currentCode) return;
    navigator.clipboard.writeText(activeSession.currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          attendanceMode,
          verificationMethod,
          busId: selectedBusId,
          radiusMeters,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start attendance session.');

      setActiveSession(data.session);
      setFeedback({
        type: 'success',
        message: `Attendance active! 6-digit code generated for ${selectedBusId}. Students notified!`,
      });
      await fetchActiveSession();
      if (onSessionChanged) onSessionChanged();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to start session.' });
    } finally {
      setIsStarting(false);
    }
  };

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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to end attendance session.');

      setActiveSession(null);
      setSessionStats(null);
      setFeedback({
        type: 'success',
        message: 'Attendance session ended. Dynamic code invalidated and session closed.',
      });
      await fetchActiveSession();
      if (onSessionChanged) onSessionChanged();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to end session.' });
    } finally {
      setIsEnding(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#EAE2D2] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#EAE2D2]/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-600 text-white shadow-sm">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Attendance Session Controller
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Start attendance with dynamic 6-digit verification code & bus security.
            </p>
          </div>
        </div>

        {activeSession ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            ATTENDANCE ACTIVE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF7F0] text-slate-600 text-[11px] font-bold border border-[#EAE2D2]">
            IDLE / READY TO START
          </span>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-start gap-2 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Active Session Live Controller View */}
      {activeSession ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                🚌 ACTIVE • {activeSession.sessionType}
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                Bus {activeSession.busId} • {activeSession.attendanceMode === 'TRAVELLING' ? 'Travelling Bus' : 'College Ground'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Verification: <strong className="text-slate-200">{activeSession.verificationMethod === 'CODE_ONLY' ? 'Dynamic Code Only' : 'Dynamic Code + GPS'}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={handleEndAttendance}
              disabled={isEnding}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition shadow-sm disabled:opacity-70 self-start sm:self-auto cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{isEnding ? 'Closing...' : 'END ATTENDANCE'}</span>
            </button>
          </div>

          {/* DYNAMIC 6-DIGIT CODE DISPLAY */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 text-center space-y-2 relative overflow-hidden">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              TEMPORARY ATTENDANCE CODE
            </span>

            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-[0.25em] text-white select-all">
                {activeSession.currentCode || '------'}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition border border-slate-600/60"
                title="Copy code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-300 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Expires in: <strong className="text-amber-400 font-bold">{formatTimer(timeLeftSec)}</strong></span>
            </div>

            <p className="text-[10px] text-slate-400">
              Code automatically refreshes every 60 seconds. Students enter this code on their dashboard.
            </p>
          </div>

          {/* Live Roster Metrics Counter */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Total Roster</span>
              <p className="text-xl font-black text-white mt-0.5">{sessionStats?.total ?? 0}</p>
            </div>
            <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-700/60 text-center">
              <span className="text-[9px] font-bold text-emerald-400 uppercase">Present</span>
              <p className="text-xl font-black text-emerald-400 mt-0.5">{sessionStats?.present ?? 0}</p>
            </div>
            <div className="bg-rose-950/60 p-2.5 rounded-xl border border-rose-700/60 text-center">
              <span className="text-[9px] font-bold text-rose-400 uppercase">Not Verified</span>
              <p className="text-xl font-black text-rose-400 mt-0.5">{sessionStats?.notPresent ?? 0}</p>
            </div>
          </div>
        </div>
      ) : (
        /* Start Attendance Dispatcher Form */
        <form onSubmit={handleStartAttendance} className="space-y-4">
          {/* Step 1: Session Selector (Morning vs Evening) */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              1. Session
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSessionType('MORNING')}
                className={`p-2.5 sm:p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  sessionType === 'MORNING'
                    ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500/30 shadow-sm'
                    : 'border-[#EAE2D2] hover:bg-[#FAF7F0]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                    <Sun className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Morning</p>
                    <p className="text-[10px] text-slate-500">Pickup session</p>
                  </div>
                </div>
                {sessionType === 'MORNING' && <span className="h-2 w-2 rounded-full bg-amber-600" />}
              </button>

              <button
                type="button"
                onClick={() => setSessionType('EVENING')}
                className={`p-2.5 sm:p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  sessionType === 'EVENING'
                    ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500/30 shadow-sm'
                    : 'border-[#EAE2D2] hover:bg-[#FAF7F0]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                    <Moon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Evening</p>
                    <p className="text-[10px] text-slate-500">Departure session</p>
                  </div>
                </div>
                {sessionType === 'EVENING' && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
              </button>
            </div>
          </div>

          {/* Step 2: Attendance Mode (College Ground vs Travelling Bus) */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              2. Attendance Mode
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setAttendanceMode('TRAVELLING')}
                className={`p-2.5 sm:p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  attendanceMode === 'TRAVELLING'
                    ? 'border-brand-500 bg-brand-50/70 ring-1 ring-brand-500/30 shadow-sm'
                    : 'border-[#EAE2D2] hover:bg-[#FAF7F0]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-brand-100 text-brand-700">
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Travelling Bus</p>
                    <p className="text-[10px] text-slate-500">Dynamic 6-digit code</p>
                  </div>
                </div>
                {attendanceMode === 'TRAVELLING' && <span className="h-2 w-2 rounded-full bg-brand-600" />}
              </button>

              <button
                type="button"
                onClick={() => setAttendanceMode('GROUND')}
                className={`p-2.5 sm:p-3 rounded-xl border text-left transition flex items-center justify-between ${
                  attendanceMode === 'GROUND'
                    ? 'border-slate-800 bg-slate-100 ring-1 ring-slate-800/30 shadow-sm'
                    : 'border-[#EAE2D2] hover:bg-[#FAF7F0]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-200 text-slate-700">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">College Ground</p>
                    <p className="text-[10px] text-slate-500">Campus ground geofence</p>
                  </div>
                </div>
                {attendanceMode === 'GROUND' && <span className="h-2 w-2 rounded-full bg-slate-800" />}
              </button>
            </div>
          </div>

          {/* Step 3: Verification Method */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              3. Verification Requirement
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setVerificationMethod('CODE_GPS')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                  verificationMethod === 'CODE_GPS'
                    ? 'border-brand-500 bg-brand-50/70 ring-1 ring-brand-500/30'
                    : 'border-[#EAE2D2] hover:bg-[#FAF7F0]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Code + GPS</p>
                    <p className="text-[10px] text-slate-500">Code & location check</p>
                  </div>
                </div>
                {verificationMethod === 'CODE_GPS' && <span className="h-2 w-2 rounded-full bg-brand-600" />}
              </button>

              <button
                type="button"
                onClick={() => setVerificationMethod('CODE_ONLY')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                  verificationMethod === 'CODE_ONLY'
                    ? 'border-brand-500 bg-brand-50/70 ring-1 ring-brand-500/30'
                    : 'border-[#EAE2D2] hover:bg-[#FAF7F0]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Dynamic Code Only</p>
                    <p className="text-[10px] text-slate-500">Fast 6-digit code entry</p>
                  </div>
                </div>
                {verificationMethod === 'CODE_ONLY' && <span className="h-2 w-2 rounded-full bg-brand-600" />}
              </button>
            </div>
          </div>

          {/* Step 4: Bus & Radius Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Bus
              </label>
              <select
                value={selectedBusId}
                onChange={(e) => setSelectedBusId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none"
              >
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id} — {b.busNumber} ({b.routeName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Radius (Metres)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="3"
                  max="100"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none"
                />
                <span className="text-[11px] font-bold text-slate-500">Meters</span>
              </div>
            </div>
          </div>

          {/* Start Action Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isStarting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs transition shadow-sm disabled:opacity-75 cursor-pointer"
            >
              {isStarting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Starting Session...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>START ATTENDANCE</span>
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-1.5">
              Only students assigned to <strong className="text-slate-600">{selectedBusId}</strong> will receive attendance notifications.
            </p>
          </div>
        </form>
      )}
    </div>
  );
};
