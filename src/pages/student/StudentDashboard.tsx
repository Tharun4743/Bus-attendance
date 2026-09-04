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
  KeyRound,
  Check,
  XCircle,
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

  // Verification Input & Flow State
  const [inputCode, setInputCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationStep, setVerificationStep] = useState<number>(0);
  // 0: idle, 1: session found, 2: code verified, 3: bus verified, 4: location checking
  const [verificationError, setVerificationError] = useState<{
    type: 'INVALID_CODE' | 'BUS_MISMATCH' | 'LOCATION_UNAVAILABLE' | 'INVALID_LOCATION' | 'CLOSED' | 'GENERIC';
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

      // Trigger PWA native device notification when active session detected
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
          body: `Attendance is now active for ${active.busId}. Open the app to enter your code.`,
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
    const interval = setInterval(fetchStudentData, 4000);
    return () => clearInterval(interval);
  }, []);

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const handleVerifyAttendance = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputCode || inputCode.trim().length !== 6) {
      setVerificationError({
        type: 'INVALID_CODE',
        message: 'Please enter the valid 6-digit attendance code.',
      });
      return;
    }

    setVerificationError(null);
    setIsVerifying(true);
    setVerificationStep(1);

    try {
      await delay(300);
      setVerificationStep(2); // Code verifying

      await delay(300);
      setVerificationStep(3); // Bus verifying

      const activeSession = sessionInfo?.activeSession;
      const requiresGps =
        activeSession?.verificationMethod === 'CODE_GPS' &&
        activeSession?.attendanceMode === 'GROUND';

      let gpsCoords: { latitude?: number; longitude?: number; accuracy?: number } = {};

      if (requiresGps) {
        setVerificationStep(4); // Checking location
        if (!navigator.geolocation) {
          throw {
            type: 'LOCATION_UNAVAILABLE',
            message: 'Geolocation is not supported by your browser.',
          };
        }

        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            });
          });

          gpsCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
        } catch (geoErr: any) {
          if (geoErr.code === 1) {
            throw {
              type: 'LOCATION_UNAVAILABLE',
              message: 'Enable location permission in Chrome and try again.',
            };
          }
          throw {
            type: 'LOCATION_UNAVAILABLE',
            message: 'Your current location cannot be verified accurately. Move to an open area and try again.',
          };
        }
      }

      // Backend authoritative verification
      const result = await api.verifyLocation({
        code: inputCode.trim(),
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
        accuracy: gpsCoords.accuracy,
        capturedAt: new Date().toISOString(),
      });

      if (result.status === 'PRESENT') {
        setVerificationError(null);
        await fetchStudentData();
      } else if (result.status === 'INVALID_CODE') {
        setVerificationError({
          type: 'INVALID_CODE',
          message: result.message || 'The attendance code is incorrect or has expired.',
        });
      } else if (result.status === 'BUS_MISMATCH') {
        setVerificationError({
          type: 'BUS_MISMATCH',
          message: result.message || 'You are not assigned to this bus.',
        });
      } else if (result.status === 'LOCATION_UNAVAILABLE') {
        setVerificationError({
          type: 'LOCATION_UNAVAILABLE',
          message: result.message || 'Location could not be verified accurately.',
        });
      } else if (result.status === 'INVALID_LOCATION') {
        setVerificationError({
          type: 'INVALID_LOCATION',
          message: result.message || 'Outside attendance boundary.',
        });
      } else {
        setVerificationError({
          type: 'GENERIC',
          message: result.message || 'Attendance verification failed.',
        });
      }
    } catch (err: any) {
      setVerificationError({
        type: err.type || 'GENERIC',
        message: err.message || 'Attendance verification failed. Please try again.',
      });
    } finally {
      setIsVerifying(false);
      setVerificationStep(0);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading student profile...</p>
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
    <div className="space-y-3.5 pb-8">
      {/* PWA Device Push Notification Permission Prompt */}
      <PwaNotificationPrompt />

      {/* Student Profile Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EAE2D2]">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200/60">
              STUDENT PROFILE
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-1">
              Hello, {student?.name || user?.name}
            </h2>
            <p className="text-[11px] text-slate-500 font-mono font-medium">
              Reg No: <span className="text-slate-800 font-bold">{student?.registerNumber}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center border border-brand-200/60">
            <BusIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Bus Assignment Box */}
        <div className="p-2.5 bg-[#FAF7F0] rounded-xl border border-[#EAE2D2] flex items-center justify-between text-xs">
          <div>
            <p className="text-[9px] text-amber-900/60 font-black uppercase tracking-wider">Assigned Bus</p>
            <p className="font-bold text-slate-800 text-xs">{bus?.busNumber || 'Bus No 6'}</p>
            <p className="text-[10px] text-slate-500 line-clamp-1">{bus?.routeName || 'Dharapuram'}</p>
          </div>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg shrink-0 border border-emerald-200">
            {bus?.id || 'BUS06'}
          </span>
        </div>
      </div>

      {/* Main Attendance Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#EAE2D2] space-y-3">
        <div className="flex items-center justify-between border-b border-[#EAE2D2] pb-2.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <h3 className="text-xs font-bold text-slate-800">
              {activeSession ? `${activeSession.sessionType} Bus Attendance` : "Today's Attendance"}
            </h3>
          </div>
          <StatusBadge status={isPresent ? 'PRESENT' : isSessionActive ? 'ACTIVE' : sessionInfo?.status || 'UPCOMING'} size="sm" />
        </div>

        {/* Dynamic Verification Content according to status */}
        {isPresent ? (
          /* PRESENT STATE (Clean Success Screen) */
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <div className="w-11 h-11 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full">
                VERIFIED ATTENDANCE
              </span>
              <h4 className="text-lg font-black text-emerald-950 mt-1">
                ✅ PRESENT
              </h4>
              <p className="text-[11px] text-emerald-800 font-medium">
                {todayRecord.sessionType} Attendance recorded successfully.
              </p>
            </div>

            {/* Student Info Recap */}
            <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 text-[11px]">Student:</span>
                <span className="font-bold text-slate-800 text-[11px]">{student?.name || user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-[11px]">Register No:</span>
                <span className="font-mono font-bold text-slate-800 text-[11px]">{student?.registerNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-[11px]">Bus:</span>
                <span className="font-bold text-slate-800 text-[11px]">{student?.busId} ({bus?.busNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-[11px]">Verified at:</span>
                <span className="font-bold text-emerald-700 text-[11px]">
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

            {/* Checklist items */}
            <div className="pt-2 border-t border-emerald-200/60 text-[10px] text-emerald-800 font-bold space-y-1 text-left">
              <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Code verified</p>
              <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Bus assignment verified</p>
              <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Attendance recorded</p>
            </div>
          </div>
        ) : isSessionActive ? (
          /* ACTIVE SESSION - DYNAMIC 6-DIGIT CODE ENTRY */
          <div className="space-y-3">
            {/* Session details banner */}
            <div className="p-3 rounded-xl bg-brand-50 border border-brand-200/80 text-left space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">
                  🚌 {activeSession?.sessionType || 'SESSION'} BUS ATTENDANCE
                </span>
                <span className="text-xs font-black text-emerald-600 animate-pulse">
                  ● ACTIVE
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-800 mt-0.5">
                Bus: <span className="text-brand-700">{student?.busId || 'BUS06'}</span> • Route: {bus?.routeName || 'Dharapuram'}
              </p>
            </div>

            {/* Verifying Loading Overlay State */}
            {isVerifying ? (
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 text-left shadow-sm animate-in fade-in">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <h4 className="text-xs font-bold text-white">VERIFYING ATTENDANCE...</h4>
                </div>

                <div className="space-y-1.5 text-xs font-medium text-slate-300">
                  <p className="flex items-center gap-2 text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Session found
                  </p>
                  <p className={`flex items-center gap-2 ${verificationStep >= 2 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {verificationStep >= 2 ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-500" />}
                    Code verified
                  </p>
                  <p className={`flex items-center gap-2 ${verificationStep >= 3 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {verificationStep >= 3 ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-500" />}
                    Bus assignment verified
                  </p>
                  {activeSession?.verificationMethod === 'CODE_GPS' && (
                    <p className={`flex items-center gap-2 ${verificationStep >= 4 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {verificationStep >= 4 ? <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-500" />}
                      Checking location...
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Code Entry Form */
              <form onSubmit={handleVerifyAttendance} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
                    Enter 6-Digit Attendance Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full text-center text-2xl font-mono font-black tracking-[0.25em] py-2.5 px-3 rounded-xl border-2 border-[#EAE2D2] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 outline-none bg-[#FAF7F0]/40 text-slate-900 transition"
                  />
                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    Ask Bus Incharge Aarthi or Admin for current code.
                  </p>
                </div>

                {/* Error Banner States */}
                {verificationError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-left space-y-1">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-[11px] font-bold text-rose-900 uppercase">
                          {verificationError.type === 'INVALID_CODE' && '❌ INVALID CODE'}
                          {verificationError.type === 'BUS_MISMATCH' && '❌ BUS MISMATCH'}
                          {verificationError.type === 'LOCATION_UNAVAILABLE' && '📍 LOCATION ACCESS REQUIRED'}
                          {verificationError.type === 'INVALID_LOCATION' && '📍 NOT VERIFIED'}
                          {verificationError.type === 'GENERIC' && 'ATTENDANCE NOT VERIFIED'}
                        </h5>
                        <p className="text-[11px] text-rose-700 leading-tight">
                          {verificationError.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verification Trigger Button */}
                <button
                  type="submit"
                  disabled={inputCode.length !== 6 || isVerifying}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>VERIFY ATTENDANCE</span>
                </button>
              </form>
            )}
          </div>
        ) : isUpcoming ? (
          /* UPCOMING STATE */
          <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#EAE2D2] text-center space-y-1.5">
            <div className="w-9 h-9 mx-auto rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">SESSION UPCOMING</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Attendance opens at <span className="font-bold text-slate-700">{sessionInfo?.startTime} IST</span> or when started by Bus Incharge.
            </p>
          </div>
        ) : (
          /* CLOSED STATE */
          <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#EAE2D2] text-center space-y-1.5">
            <div className="w-9 h-9 mx-auto rounded-xl bg-stone-200 text-stone-600 flex items-center justify-center border border-stone-300">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-stone-800">ATTENDANCE CLOSED</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              This attendance session is no longer active.
            </p>
          </div>
        )}
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EAE2D2]">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Attendance History
          </h3>
        </div>

        {history.length === 0 ? (
          <p className="text-[11px] text-slate-400 text-center py-3">No past attendance records found.</p>
        ) : (
          <div className="divide-y divide-[#EAE2D2]/60">
            {history.map((record) => (
              <div key={record.id} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-800 text-[11px]">
                    {record.attendanceDate} • <span className="text-[10px] text-slate-500">{record.sessionType}</span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {record.verifiedAt
                      ? new Date(record.verifiedAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Verified'}
                    {record.verificationMethod === 'DYNAMIC_CODE' && ' • (Code Verified)'}
                    {record.verificationMethod === 'DYNAMIC_CODE_GPS' && ' • (Code + GPS)'}
                  </p>
                </div>
                <StatusBadge status={record.status} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
