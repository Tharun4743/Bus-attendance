import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SessionInfo } from '../../types';
import { StatusBadge } from './StatusBadge';
import { Clock, MapPin } from 'lucide-react';

export const SessionBanner: React.FC<{ onSessionLoaded?: (info: SessionInfo) => void }> = ({
  onSessionLoaded,
}) => {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [serverTime, setServerTime] = useState<string>('');

  const fetchSession = async () => {
    try {
      const info = await api.getSessionInfo();
      setSessionInfo(info);
      setServerTime(info.currentTimeIST);
      if (onSessionLoaded) onSessionLoaded(info);
    } catch (err) {
      console.error('Failed to fetch session info:', err);
    }
  };

  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 5000); // Polling every 5s for authoritative server sync
    return () => clearInterval(interval);
  }, []);

  if (!sessionInfo) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Session Status & Timing */}
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={sessionInfo.status} size="lg" />
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2 text-slate-700 text-sm font-semibold">
            <Clock className="w-4 h-4 text-brand-600" />
            <span>Evening Session: {sessionInfo.startTime} – {sessionInfo.endTime} IST</span>
          </div>
        </div>

        {/* Right: Server Clock & Location Badge */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-slate-700 font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Server IST: {serverTime}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-brand-600" />
            <span>{sessionInfo.locationName} ({sessionInfo.radiusMeters}m Geofence)</span>
          </div>

          {sessionInfo.isSimulated && (
            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-[11px] font-bold rounded-xl border border-purple-200">
              Demo Simulation Active
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
