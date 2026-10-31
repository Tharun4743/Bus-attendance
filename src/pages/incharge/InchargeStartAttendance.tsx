import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Bus, ActiveSession } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { InchargeMapPickerModal } from '../../components/incharge/InchargeMapPickerModal';
import {
  PlayCircle,
  Radio,
  CheckCircle2,
  AlertCircle,
  Bus as BusIcon,
} from 'lucide-react';

export const InchargeStartAttendance: React.FC = () => {
  const navigate = useNavigate();
  const [busData, setBusData] = useState<{ bus: Bus; totalStudents: number } | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionType, setSessionType] = useState<'MORNING' | 'EVENING'>('MORNING');
  const [attendanceMode, setAttendanceMode] = useState<'GROUND' | 'TRAVELLING'>('GROUND');
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSessionData = async () => {
    try {
      const [busRes, sessRes] = await Promise.all([
        api.getInchargeMyBus(),
        api.getSessionInfo(),
      ]);
      setBusData(busRes);
      if (sessRes.activeSession && sessRes.activeSession.status === 'ACTIVE') {
        setActiveSession(sessRes.activeSession);
      } else {
        setActiveSession(null);
      }
    } catch (err: any) {
      console.error('Failed to load session details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, []);

  const handleSessionStarted = () => {
    setIsMapModalOpen(false);
    setFeedback({
      type: 'success',
      message: `${sessionType} attendance session started successfully! Redirecting to Live Console...`,
    });
    setTimeout(() => {
      navigate('/incharge/live-attendance');
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-500">Checking Active Transit Window...</p>
      </div>
    );
  }

  const isCurrentBusActive = activeSession && activeSession.busId === busData?.bus?.id;

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e]">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="emerald">TRANSIT DISPATCH</Badge>
          <span className="text-xs font-mono font-bold text-zinc-400">
            Bus {busData?.bus?.busNumber || 'Assigned'}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <PlayCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>Start Daily Bus Attendance</span>
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
          Open the real-time passenger verification window for your assigned bus.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-[#4ade80]'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-[#fb7185]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#4ade80]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-[#fb7185]" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {isCurrentBusActive ? (
        <div className="p-6 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-base font-black text-emerald-900 dark:text-emerald-200">
            Attendance Session Already Active!
          </h2>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-md mx-auto">
            A {activeSession.sessionType} session ({activeSession.attendanceMode} mode) is currently broadcasting for Bus {busData?.bus.busNumber}.
          </p>
          <div className="pt-2">
            <Button
              onClick={() => navigate('/incharge/live-attendance')}
              variant="primary"
              size="md"
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Go to Live Attendance Console →
            </Button>
          </div>
        </div>
      ) : (
        /* Configuration Form */
        <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] p-5 sm:p-6 shadow-xs space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Session Type */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                1. Transit Session Period *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSessionType('MORNING')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    sessionType === 'MORNING'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-black ring-1 ring-emerald-500'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#181820] text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <p className="text-xs font-bold">🌅 Morning Transit</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Inbound College Transit</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSessionType('EVENING')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    sessionType === 'EVENING'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-black ring-1 ring-emerald-500'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#181820] text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <p className="text-xs font-bold">🌆 Evening Transit</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Outbound Return Transit</p>
                </button>
              </div>
            </div>

            {/* Attendance Mode */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                2. Boarding Geofence Mode *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAttendanceMode('GROUND')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    attendanceMode === 'GROUND'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-black ring-1 ring-emerald-500'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#181820] text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <p className="text-xs font-bold">🛑 Ground Bay</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Strict ~10m perimeter</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendanceMode('TRAVELLING')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    attendanceMode === 'TRAVELLING'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-black ring-1 ring-emerald-500'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#181820] text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <p className="text-xs font-bold">🚌 Travelling Bus</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Dynamic motion tolerance</p>
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-[#181820] rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1">
            <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <BusIcon className="w-4 h-4 text-emerald-600" />
              <span>Assigned Vehicle: Bus {busData?.bus.busNumber} ({busData?.bus.routeName})</span>
            </p>
            <p className="text-zinc-500">
              {busData?.totalStudents} registered commuters will receive in-app notifications and real-time dashboard activation upon session dispatch.
            </p>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-[#26262e] flex items-center justify-end">
            <Button
              onClick={() => setIsMapModalOpen(true)}
              variant="primary"
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Activate Live Attendance Session</span>
            </Button>
          </div>
        </div>
      )}

      {/* Map Picker & GPS Modal */}
      {busData?.bus && (
        <InchargeMapPickerModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          onSessionStarted={handleSessionStarted}
          bus={busData.bus}
          initialSessionType={sessionType}
          initialAttendanceMode={attendanceMode}
        />
      )}
    </div>
  );
};
