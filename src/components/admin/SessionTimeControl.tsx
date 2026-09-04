import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AttendanceSettings, SessionInfo } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  Clock,
  Play,
  Square,
  PlusCircle,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface SessionTimeControlProps {
  onUpdated?: () => void;
}

export const SessionTimeControl: React.FC<SessionTimeControlProps> = ({
  onUpdated,
}) => {
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [startTime, setStartTime] = useState<string>('16:50');
  const [endTime, setEndTime] = useState<string>('16:55');
  const [reportTime, setReportTime] = useState<string>('16:57');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSessionAndSettings = async () => {
    try {
      const [sett, sess] = await Promise.all([api.getSettings(), api.getSessionInfo()]);
      setSettings(sett);
      setSessionInfo(sess);
      setStartTime(sett.startTime);
      setEndTime(sett.endTime);
      setReportTime(sett.reportTime || '16:57');
    } catch (err) {
      console.error('Failed to load session settings:', err);
    }
  };

  useEffect(() => {
    fetchSessionAndSettings();
    const interval = setInterval(fetchSessionAndSettings, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveManualTimes = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsUpdating(true);
    setFeedback(null);

    try {
      await api.updateSettings({
        startTime,
        endTime,
        reportTime,
      });
      setFeedback({
        type: 'success',
        message: `Attendance time updated manually: ${startTime} – ${endTime} IST`,
      });
      await fetchSessionAndSettings();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update attendance time.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper to get formatted IST time string
  const getNowISTMinutes = () => {
    const now = new Date();
    const istString = now.toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    const [h, m] = istString.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTimeString = (mins: number) => {
    const wrapped = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(wrapped / 60);
    const m = wrapped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Quick Action: Start session right now for X minutes
  const handleStartSessionNow = async (durationMinutes: number) => {
    setIsUpdating(true);
    setFeedback(null);

    try {
      const nowMinutes = getNowISTMinutes();
      const newStart = minutesToTimeString(nowMinutes);
      const newEnd = minutesToTimeString(nowMinutes + durationMinutes);
      const newReport = minutesToTimeString(nowMinutes + durationMinutes + 2);

      setStartTime(newStart);
      setEndTime(newEnd);
      setReportTime(newReport);

      await api.updateSettings({
        startTime: newStart,
        endTime: newEnd,
        reportTime: newReport,
        simulation: { enabled: false, simulatedTime: null },
      });

      setFeedback({
        type: 'success',
        message: `Session ACTIVATED NOW for ${durationMinutes} minutes (${newStart} – ${newEnd} IST)`,
      });
      await fetchSessionAndSettings();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to activate session.' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Quick Action: Extend current session by 5 minutes
  const handleExtendSession = async (extendByMinutes: number = 5) => {
    if (!settings) return;
    setIsUpdating(true);
    setFeedback(null);

    try {
      const [endH, endM] = settings.endTime.split(':').map(Number);
      const currentEndMinutes = endH * 60 + endM;
      const newEnd = minutesToTimeString(currentEndMinutes + extendByMinutes);
      const newReport = minutesToTimeString(currentEndMinutes + extendByMinutes + 2);

      setEndTime(newEnd);
      setReportTime(newReport);

      await api.updateSettings({
        endTime: newEnd,
        reportTime: newReport,
      });

      setFeedback({
        type: 'success',
        message: `Session extended by ${extendByMinutes} minutes until ${newEnd} IST`,
      });
      await fetchSessionAndSettings();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to extend session.' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Quick Action: Close session now
  const handleCloseSessionNow = async () => {
    setIsUpdating(true);
    setFeedback(null);

    try {
      const nowMinutes = getNowISTMinutes();
      const newEnd = minutesToTimeString(nowMinutes);
      const newReport = minutesToTimeString(nowMinutes + 2);

      setEndTime(newEnd);
      setReportTime(newReport);

      await api.updateSettings({
        endTime: newEnd,
        reportTime: newReport,
      });

      setFeedback({
        type: 'success',
        message: `Attendance session CLOSED immediately.`,
      });
      await fetchSessionAndSettings();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to close session.' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Reset to default official 4:50 PM - 4:55 PM
  const handleResetToOfficialTime = async () => {
    setIsUpdating(true);
    setFeedback(null);

    try {
      setStartTime('16:50');
      setEndTime('16:55');
      setReportTime('16:57');

      await api.updateSettings({
        startTime: '16:50',
        endTime: '16:55',
        reportTime: '16:57',
        simulation: { enabled: false, simulatedTime: null },
      });

      setFeedback({
        type: 'success',
        message: 'Reset to standard official time (4:50 PM – 4:55 PM IST).',
      });
      await fetchSessionAndSettings();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reset time.' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-5">
      {/* Title & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-brand-100 text-brand-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Manual Attendance Time Control
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Admin can manually set the daily start & end time or activate a session immediately.
            </p>
          </div>
        </div>

        {sessionInfo && (
          <div className="flex items-center gap-2">
            <StatusBadge status={sessionInfo.status} size="md" />
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Quick 1-Click Action Buttons */}
      <div>
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Instant Session Actions (1-Click)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleStartSessionNow(5)}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Open Now (5m)</span>
          </button>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleStartSessionNow(15)}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Open Now (15m)</span>
          </button>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleExtendSession(5)}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs transition disabled:opacity-50"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Extend (+5m)</span>
          </button>

          <button
            type="button"
            disabled={isUpdating}
            onClick={handleCloseSessionNow}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs transition disabled:opacity-50"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Close Session</span>
          </button>
        </div>
      </div>

      {/* Manual Time Picker Inputs */}
      <form onSubmit={handleSaveManualTimes} className="space-y-4 pt-2 border-t border-slate-100">
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Custom Time Setting (IST / 24-Hour)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Start Time (IST)
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              End Time (IST)
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Report Generation Time (IST)
            </label>
            <input
              type="time"
              required
              value={reportTime}
              onChange={(e) => setReportTime(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={handleResetToOfficialTime}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-semibold text-xs hover:bg-slate-100 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Official (4:50 – 4:55 PM)</span>
          </button>

          <button
            type="submit"
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition shadow-sm disabled:opacity-70"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isUpdating ? 'Saving Times...' : 'Save Custom Attendance Time'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
