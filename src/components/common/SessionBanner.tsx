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
    const interval = setInterval(fetchSession, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!sessionInfo) return null;

  return (
    <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] p-4 sm:p-5 shadow-xs transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Session Status & Timing */}
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={sessionInfo.status} size="lg" />
          <div className="h-6 w-[1px] bg-zinc-200 dark:bg-[#26262e] hidden sm:block" />
          <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-bold">
            <Clock className="w-4 h-4 text-sky-500" />
            <span>Evening Session: {sessionInfo.startTime} – {sessionInfo.endTime} IST</span>
          </div>
        </div>

        {/* Right: Server Clock & Location Badge */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-medium">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-[#1a1a20] rounded-xl text-zinc-900 dark:text-zinc-100 font-mono font-bold border border-zinc-200/80 dark:border-[#26262e]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Server IST: {serverTime}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-[#1a1a20] rounded-xl text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-[#26262e]">
            <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
            <span>{sessionInfo.locationName} ({sessionInfo.radiusMeters}m Geofence)</span>
          </div>

          {sessionInfo.isSimulated && (
            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-[#c084fc] dark:border-purple-500/40 text-[11px] font-bold rounded-xl border">
              Demo Simulation Active
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
