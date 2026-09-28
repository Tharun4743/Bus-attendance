import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AttendanceRecord, Bus, SessionInfo, Student } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PwaNotificationPrompt } from '../../components/common/PwaNotificationPrompt';
import { showPwaNotification } from '../../utils/pwaNotifications';
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
      <div className="flex flex-col items-center justify-center py-20 space-y-2">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500">Loading student profile...</p>
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
    <div className="space-y-3 sm:space-y-4 max-w-2xl mx-auto pb-6">
      {/* PWA Device Push Notification Permission Prompt */}
      <PwaNotificationPrompt />

      {/* Uniform Header Container */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#EAE2D2]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full border border-amber-200 inline-block">
              STUDENT PORTAL
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {student?.name || user?.name}
            </h1>
            <p className="text-xs text-amber-900/70 font-medium mt-0.5">
              Register No: <strong className="text-slate-900 font-mono">{student?.registerNumber}</strong>
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-200/60 shrink-0 shadow-xs">
            <BusIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Bus Assignment Box */}
        <div className="mt-3 p-3 bg-[#FAF7F0] rounded-xl border border-[#EAE2D2] flex items-center justify-between text-xs">
          <div>
            <p className="text-[9px] text-amber-900/60 font-black uppercase tracking-wider">Assigned Route</p>
            <p className="font-bold text-slate-800 text-xs sm:text-sm">{bus?.busNumber || 'Bus No 6'}</p>
            <p className="text-[11px] text-slate-500">{bus?.routeName || 'Dharapuram'}</p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
            {bus?.id || student?.busId || 'BUS06'}
          </span>
        </div>
      </div>

      {/* Main Attendance Card */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xs border border-[#EAE2D2] space-y-3">
        <div className="flex items-center justify-between border-b border-[#EAE2D2] pb-2.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-brand-600" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              {activeSession ? `${activeSession.sessionType} Attendance` : "Today's Attendance"}
            </h3>
          </div>
          <StatusBadge status={isPresent ? 'PRESENT' : isSessionActive ? 'ACTIVE' : sessionInfo?.status || 'UPCOMING'} size="sm" />
        </div>

        {/* Dynamic Verification Content according to status */}
        {isPresent ? (
          /* PRESENT STATE (Clean Success Screen) */
          <div className="p-4 sm:p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/60 px-2.5 py-0.5 rounded-full">
                VERIFIED ATTENDANCE
              </span>
              <h4 className="text-xl font-black text-emerald-950 mt-1">
                ✅ PRESENT
              </h4>
              <p className="text-xs text-emerald-800 font-medium">
                {todayRecord.sessionType} attendance verified via GPS location.
              </p>
            </div>

            {/* Verification Details */}
            <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 text-xs text-left space-y-1.5 font-sans">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-slate-800">{student?.name || user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Register No:</span>
                <span className="font-mono font-bold text-slate-800">{student?.registerNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bus:</span>
                <span className="font-bold text-slate-800">{student?.busId} ({bus?.busNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Verified at:</span>
                <span className="font-bold text-emerald-700">
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

            <div className="pt-2 border-t border-emerald-200/60 text-xs text-emerald-800 font-bold space-y-1 text-left">
              <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> GPS Location verified</p>
              <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Bus route confirmed</p>
            </div>
          </div>
        ) : isSessionActive ? (
          /* ACTIVE SESSION - PURE LOCATION VERIFY BUTTON (NO CODE INPUT) */
          <div className="space-y-3 text-center">
            <div className="p-3 rounded-xl bg-brand-50 border border-brand-200/80 text-left space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">
                  🚌 {activeSession?.sessionType || 'SESSION'} ATTENDANCE
                </span>
                <span className="text-xs font-black text-emerald-600 animate-pulse">
                  ● ACTIVE
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 pt-1">
                Route: <span className="text-brand-700">{student?.busId || 'BUS06'}</span> • {bus?.routeName || 'Dharapuram'}
              </p>
            </div>

            {/* Error Banner States */}
            {verificationError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-left space-y-1">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[11px] font-bold text-rose-900 uppercase">
                      {verificationError.type === 'LOCATION_UNAVAILABLE' && '📍 Location Access Needed'}
                      {verificationError.type === 'INVALID_LOCATION' && '📍 Outside Boundary'}
                      {verificationError.type === 'BUS_MISMATCH' && '❌ Bus Route Mismatch'}
                      {verificationError.type === 'GENERIC' && 'Verification Notice'}
                    </h5>
                    <p className="text-xs text-rose-700 leading-tight">
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
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-sm shadow-md shadow-brand-600/25 transition disabled:opacity-60 cursor-pointer min-h-[46px]"
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
              <p className="text-[11px] text-slate-400 mt-2">
                Tap button to verify your GPS location within the bus route boundary.
              </p>
            </div>
          </div>
        ) : isUpcoming ? (
          /* UPCOMING STATE */
          <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#EAE2D2] text-center space-y-1">
            <div className="w-8 h-8 mx-auto rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">SESSION UPCOMING</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Attendance opens when dispatched by Administrator or Bus Incharge.
            </p>
          </div>
        ) : (
          /* CLOSED STATE */
          <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#EAE2D2] text-center space-y-1">
            <div className="w-8 h-8 mx-auto rounded-lg bg-stone-200 text-stone-600 flex items-center justify-center border border-stone-300">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-stone-800">ATTENDANCE CLOSED</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              No active attendance session at this time.
            </p>
          </div>
        )}
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-xs border border-[#EAE2D2]">
        <div className="flex items-center gap-1.5 mb-2">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Attendance History
          </h3>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No past attendance records found.</p>
        ) : (
          <div className="divide-y divide-[#EAE2D2]/60">
            {history.slice(0, 5).map((rec) => (
              <div key={rec.id} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800">{rec.attendanceDate}</span>
                  <span className="text-slate-400 text-[11px] ml-1.5">({rec.sessionType})</span>
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
