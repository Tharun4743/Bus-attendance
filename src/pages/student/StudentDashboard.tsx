import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AttendanceRecord, Bus, SessionInfo, Student } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PwaNotificationPrompt } from '../../components/common/PwaNotificationPrompt';
import { showPwaNotification } from '../../utils/pwaNotifications';
import { Badge } from '../../components/ui/Badge';
import {
  Bus as BusIcon,
  Clock,
  CheckCircle2,
  Calendar,
  Lock,
  Check,
  XCircle,
  MapPin,
  Navigation,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [bus, setBus] = useState<Bus | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const lastNotifiedSessionRef = useRef<string | null>(null);

  // Verification State
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<{
    type: 'LOCATION_UNAVAILABLE' | 'INVALID_LOCATION' | 'BUS_MISMATCH' | 'CLOSED' | 'GENERIC';
    message: string;
  } | null>(null);

  const fetchStudentData = async () => {
    try {
      const res = await api.getMyStatus();
      setStudent(res.student);
      setBus(res.bus);
      setSessionInfo(res.sessionInfo);
      setTodayRecord(res.todayRecord);
      setHistory(res.history);

      const active = res.sessionInfo?.activeSession;
      if (
        active &&
        active.status === 'ACTIVE' &&
        res.todayRecord?.status !== 'PRESENT' &&
        lastNotifiedSessionRef.current !== active.id
      ) {
        lastNotifiedSessionRef.current = active.id;
        showPwaNotification({
          title: `🚌 ${active.sessionType} Attendance Started!`,
          body: `Attendance is now active for ${active.busId}. Verify your location to mark attendance.`,
          url: '/',
          tag: `session-${active.id}`,
        });
      }
    } catch (err) {
      console.error('Failed to load student status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
    const interval = setInterval(fetchStudentData, 5000);
    return () => clearInterval(interval);
  }, []);

  // 1-Tap Pure Location Verification
  const handleVerifyLocation = async () => {
    setVerificationError(null);
    setIsVerifying(true);

    try {
      if (!navigator.geolocation) {
        throw {
          type: 'LOCATION_UNAVAILABLE',
          message: 'GPS Geolocation is not supported by your browser.',
        };
      }

      // Capture GPS location
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      }).catch((geoErr: any) => {
        if (geoErr.code === 1) {
          throw {
            type: 'LOCATION_UNAVAILABLE',
            message: 'Please allow location permission in your browser to verify attendance.',
          };
        }
        throw {
          type: 'LOCATION_UNAVAILABLE',
          message: 'Unable to get GPS location. Please ensure GPS is turned on and try again.',
        };
      });

      // Submit location to backend
      const result = await api.verifyLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        capturedAt: new Date().toISOString(),
      });

      if (result.status === 'PRESENT') {
        setVerificationError(null);
        await fetchStudentData();
      } else if (result.status === 'BUS_MISMATCH') {
        setVerificationError({
          type: 'BUS_MISMATCH',
          message: result.message || 'You are not assigned to the active route.',
        });
      } else if (result.status === 'INVALID_LOCATION') {
        setVerificationError({
          type: 'INVALID_LOCATION',
          message: result.message || 'Outside attendance boundary. Make sure you are at the bus/campus point.',
        });
      } else {
        setVerificationError({
          type: 'GENERIC',
          message: result.message || 'Location verification could not be completed.',
        });
      }
    } catch (err: any) {
      setVerificationError({
        type: err.type || 'GENERIC',
        message: err.message || 'Location verification failed. Please try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Loading student profile...</p>
      </div>
    );
  }

  const isPresent = todayRecord?.status === 'PRESENT';
  const activeSession = sessionInfo?.activeSession;
  const isTargetBusActive =
    activeSession &&
    activeSession.status === 'ACTIVE' &&
    (activeSession.busId === 'ALL' || activeSession.busId === student?.busId);

  const isSessionActive = sessionInfo?.status === 'ACTIVE' || isTargetBusActive;
  const isUpcoming = sessionInfo?.status === 'UPCOMING' && !isTargetBusActive;

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-8">
      {/* PWA Device Push Notification Permission Prompt */}
      <PwaNotificationPrompt />

      {/* Header Container */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Badge variant="emerald" className="mb-2">
              STUDENT PORTAL
            </Badge>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              {student?.name || user?.name}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
              Register No: <strong className="text-blue-600 dark:text-sky-400 font-mono">{student?.registerNumber}</strong>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-[#1a1a20] text-emerald-600 dark:text-[#4ade80] flex items-center justify-center border border-zinc-200 dark:border-[#26262e] shrink-0 shadow-xs">
            <BusIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Bus Assignment Box */}
        <div className="mt-4 p-3.5 bg-zinc-50 dark:bg-[#1a1a20] rounded-xl border border-zinc-200/80 dark:border-[#26262e] flex items-center justify-between text-xs">
          <div>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Assigned Route</p>
            <p className="font-bold text-zinc-900 dark:text-white text-sm">{bus?.busNumber || 'Bus No 6'}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{bus?.routeName || 'Dharapuram'}</p>
          </div>
          <Badge variant="blue">
            {bus?.id || student?.busId || 'BUS06'}
          </Badge>
        </div>
      </div>

      {/* Main Attendance Card */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] space-y-4 transition-all">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#26262e] pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-[#4ade80]" />
            <h3 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
              {activeSession ? `${activeSession.sessionType} Attendance` : "Today's Attendance"}
            </h3>
          </div>
          <StatusBadge status={isPresent ? 'PRESENT' : isSessionActive ? 'ACTIVE' : sessionInfo?.status || 'UPCOMING'} size="sm" />
        </div>

        {/* Dynamic Verification Content according to status */}
        {isPresent ? (
          /* PRESENT STATE */
          <div className="p-5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-center space-y-3.5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <Badge variant="emerald" className="mb-1.5">
                VERIFIED ATTENDANCE
              </Badge>
              <h4 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                PRESENT
              </h4>
              <p className="text-xs text-emerald-700 dark:text-[#4ade80] font-medium mt-0.5">
                {todayRecord.sessionType} attendance verified via GPS location.
              </p>
            </div>

            {/* Verification Details */}
            <div className="bg-white/80 dark:bg-[#141418]/90 p-4 rounded-xl border border-emerald-200/70 dark:border-emerald-500/30 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Student:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{student?.name || user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Register No:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-sky-400">{student?.registerNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Bus:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{student?.busId} ({bus?.busNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Verified at:</span>
                <span className="font-bold text-emerald-600 dark:text-[#4ade80]">
                  {todayRecord.verifiedAt
                    ? new Date(todayRecord.verifiedAt).toLocaleTimeString('en-US', {
                        timeZone: 'Asia/Kolkata',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'Verified'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-500/20 text-xs text-emerald-700 dark:text-[#4ade80] font-bold space-y-1 text-left">
              <p className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-[#4ade80]" /> GPS Location verified</p>
              <p className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 dark:text-[#4ade80]" /> Bus route confirmed</p>
            </div>
          </div>
        ) : isSessionActive ? (
          /* ACTIVE SESSION */
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1a1a20] border border-zinc-200 dark:border-[#26262e] text-left space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-blue-700 dark:text-sky-400 bg-blue-50 dark:bg-sky-500/15 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-sky-500/30">
                  🚌 {activeSession?.sessionType || 'SESSION'} ATTENDANCE
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-[#4ade80] animate-pulse">
                  ● ACTIVE
                </span>
              </div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white pt-1">
                Route: <span className="text-blue-600 dark:text-sky-400">{student?.busId || 'BUS06'}</span> • {bus?.routeName || 'Dharapuram'}
              </p>
            </div>

            {/* Error Banner States */}
            {verificationError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-left space-y-1">
                <div className="flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-[#fb7185] shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase">
                      {verificationError.type === 'LOCATION_UNAVAILABLE' && '📍 Location Access Needed'}
                      {verificationError.type === 'INVALID_LOCATION' && '📍 Outside Boundary'}
                      {verificationError.type === 'BUS_MISMATCH' && '❌ Bus Route Mismatch'}
                      {verificationError.type === 'GENERIC' && 'Verification Notice'}
                    </h5>
                    <p className="text-xs text-rose-700 dark:text-[#fb7185] leading-relaxed">
                      {verificationError.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 1-Tap Location Verification Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleVerifyLocation}
                disabled={isVerifying}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer min-h-[48px]"
              >
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Detecting GPS Location...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 fill-white" />
                    <span>VERIFY LOCATION & MARK PRESENT</span>
                  </>
                )}
              </button>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                Tap button to verify your GPS location within the bus route boundary.
              </p>
            </div>
          </div>
        ) : isUpcoming ? (
          /* UPCOMING STATE */
          <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-[#1a1a20] border border-zinc-200/90 dark:border-[#26262e] text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-[#fde047] flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">SESSION UPCOMING</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
              Attendance opens when dispatched by Administrator or Bus Incharge.
            </p>
          </div>
        ) : (
          /* CLOSED STATE */
          <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-[#1a1a20] border border-zinc-200/90 dark:border-[#26262e] text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center border border-zinc-300 dark:border-zinc-700">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">ATTENDANCE CLOSED</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
              No active attendance session at this time.
            </p>
          </div>
        )}
      </div>

      {/* Attendance History */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl p-5 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Attendance History
          </h3>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-6">No past attendance records found.</p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-[#26262e]">
            {history.slice(0, 5).map((rec) => (
              <div key={rec.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-zinc-900 dark:text-white">{rec.attendanceDate}</span>
                  <span className="text-zinc-400 text-xs ml-2 font-mono">({rec.sessionType})</span>
                </div>
                <StatusBadge status={rec.status} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
