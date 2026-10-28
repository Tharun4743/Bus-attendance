import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AttendanceRecord, Bus, SessionInfo, Student } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  CheckCircle2,
  Lock,
  MapPin,
  Camera,
  Fingerprint,
  Calendar,
  Radio,
  RefreshCw,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { MobileVerificationModal } from '../../components/attendance/MobileVerificationModal';
import { FaceEnrollmentModal } from '../../components/attendance/FaceEnrollmentModal';
import { formatISTTime } from '../../utils/time';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [bus, setBus] = useState<Bus | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState<boolean>(false);

  const fetchStudentData = async () => {
    try {
      const res = await api.getMyStatus();
      setStudent(res.student);
      setBus(res.bus);
      setSessionInfo(res.sessionInfo);
      setTodayRecord(res.todayRecord);
      setHistory(res.history || []);
    } catch (err) {
      console.error('Failed to load student status:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Smart Polling: 25s background interval + instant revalidation on tab focus
  useEffect(() => {
    fetchStudentData();
    const interval = setInterval(fetchStudentData, 25000);

    const onFocus = () => {
      fetchStudentData();
    };

    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const [hasAutoOpenedModal, setHasAutoOpenedModal] = useState(false);

  const isFaceEnrolled = Boolean(
    student?.photoUrl &&
    student?.faceEnrolledAt
  );

  // Auto-prompt first-time biometric enrollment if profile has no face descriptor
  useEffect(() => {
    if (!isLoading && student && !isFaceEnrolled && !hasAutoOpenedModal) {
      setIsEnrollModalOpen(true);
      setHasAutoOpenedModal(true);
    }
  }, [isLoading, student, isFaceEnrolled, hasAutoOpenedModal]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStudentData();
  };

  const handleResetFace = async () => {
    if (!window.confirm('Are you sure you want to reset your registered Face ID? You will be prompted to capture a new baseline portrait.')) {
      return;
    }
    try {
      setIsRefreshing(true);
      await api.resetFace();
      await fetchStudentData();
      setIsEnrollModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to reset Face ID');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Loading Student Commuter Portal...</p>
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

  return (
    <div className="space-y-4 max-w-4xl mx-auto px-2 sm:px-4 pb-10">
      {/* ========================================================================= */}
      {/* 1. STUDENT EXECUTIVE CONSOLE HEADER                                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-4 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="emerald">STUDENT COMMUTER PORTAL</Badge>
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-sky-400">
              {student?.registerNumber || 'REG-PENDING'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {student?.name || user?.name}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1 flex items-center gap-2 flex-wrap">
            <span>Assigned: <strong>{bus?.busNumber || student?.busId || 'Unassigned'}</strong></span>
            {bus?.routeName && (
              <>
                <span>•</span>
                <span>{bus.routeName}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button onClick={handleRefresh} disabled={isRefreshing} variant="secondary" size="sm">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          {isFaceEnrolled ? (
            <button
              type="button"
              onClick={handleResetFace}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#1c1c24] transition cursor-pointer"
              title="Re-enroll facial descriptor portrait"
            >
              Reset Face ID
            </button>
          ) : (
            <Button onClick={() => setIsEnrollModalOpen(true)} variant="primary" size="sm" className="bg-amber-500 hover:bg-amber-400 text-white font-bold">
              <Camera className="w-3.5 h-3.5" />
              <span>Enroll Face ID</span>
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ATTENDANCE STATUS BOARDING CARD                                        */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden transition-all">
        {isPresent ? (
          /* ===================================================================== */
          /* VERIFIED PRESENT STATE (DIGITAL BOARDING PASS)                        */
          /* ===================================================================== */
          <div className="p-5 sm:p-8 space-y-4 sm:space-y-6 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  DIGITAL COMMUTER BOARDING PASS
                </span>
              </div>
              <StatusBadge status="PRESENT" size="md" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  Boarding Verification Successful
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  <span>Marked Present</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Your physical presence on <strong>{bus?.busNumber || 'Assigned Bus'}</strong> was verified via mobile camera & live GPS.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#181820] border border-zinc-200/80 dark:border-zinc-800 text-right space-y-1 self-start sm:self-auto min-w-[140px]">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">Boarding Timestamp</span>
                <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                  {todayRecord?.verifiedAt ? formatISTTime(todayRecord.verifiedAt) : 'Today'}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 block">
                  Method: {todayRecord?.verificationMethod || 'FACE_GPS'}
                </span>
              </div>
            </div>

            {/* Profile Proof & Geofence Confirmation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Biometric Identity Match</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Confidence: <strong>{todayRecord?.faceMatchConfidence ? `${todayRecord.faceMatchConfidence}%` : 'High (Enrolled Face)'}</strong>
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Live Geofence Proximity</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Proximity: <strong>{todayRecord?.distanceMeters != null ? `${Math.round(todayRecord.distanceMeters)}m from bus` : 'Inside Bus Geofence'}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : isSessionActive ? (
          /* ===================================================================== */
          /* ACTIVE BOARDING WINDOW (ACTION REQUIRED)                               */
          /* ===================================================================== */
          <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-200" />
                    TRANSIT BOARDING ACTIVE
                  </span>
                  <span className="text-xs text-zinc-500 font-mono font-bold">
                    Bus {bus?.busNumber || student?.busId || 'Assigned Bus'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                  Verify Your Physical Presence
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  The bus in-charge has initiated attendance for your route. Mark attendance on your smartphone using Face ID or Phone Biometrics.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#1e1e26] text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300 self-start sm:self-auto">
                <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  {activeSession?.attendanceMode === 'TRAVELLING'
                    ? `🚌 Highway Transit: ~${activeSession?.radiusMeters || 1000}m`
                    : `🛑 Stationary Bay: ~${activeSession?.radiusMeters || 35}m`}
                </span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!isFaceEnrolled) {
                    setIsEnrollModalOpen(true);
                  } else {
                    setIsMobileModalOpen(true);
                  }
                }}
                className={`flex items-center justify-center gap-3 py-3.5 sm:py-4 px-4 sm:px-5 rounded-2xl font-black text-sm shadow-lg transition-all cursor-pointer min-h-[52px] ${
                  isFaceEnrolled
                    ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-emerald-600/20'
                    : 'bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-white shadow-amber-500/20 animate-pulse'
                }`}
              >
                <Camera className="w-5 h-5 shrink-0" />
                <span className="text-center">{isFaceEnrolled ? '📸 VERIFY WITH MOBILE FACE & GPS' : '📸 FIRST-TIME FACE ID SCAN REQUIRED'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isFaceEnrolled) {
                    setIsEnrollModalOpen(true);
                  } else {
                    setIsMobileModalOpen(true);
                  }
                }}
                className={`flex items-center justify-center gap-3 py-3.5 sm:py-4 px-4 sm:px-5 rounded-2xl border font-bold text-sm shadow-xs transition-all cursor-pointer min-h-[52px] ${
                  isFaceEnrolled
                    ? 'bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1a1a22] dark:hover:bg-[#22222c] active:scale-[0.98] border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white'
                    : 'bg-zinc-50 dark:bg-zinc-900/40 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 cursor-pointer opacity-80'
                }`}
              >
                <Fingerprint className={`w-5 h-5 shrink-0 ${isFaceEnrolled ? 'text-emerald-500' : 'text-amber-500'}`} />
                <span className="text-center">{isFaceEnrolled ? '👆 Use Phone TouchID / Biometrics' : '🔒 Locked (Face ID Required First)'}</span>
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center">
              100% Smartphone Verification • Front camera selfie automatically verifies within seconds
            </p>
          </div>
        ) : (
          /* ===================================================================== */
          /* SESSION CLOSED / WAITING FOR IN-CHARGE                                */
          /* ===================================================================== */
          <div className="p-6 sm:p-12 text-center space-y-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-zinc-100 dark:bg-[#1e1e26] text-zinc-400 flex items-center justify-center border border-zinc-200 dark:border-[#2e2e38]">
              <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                ATTENDANCE CLOSED
              </span>
              <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                Transit Attendance Not Initiated
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                The bus in-charge has not opened transit attendance for {bus?.busNumber || student?.busId || 'your bus'} yet.
                This console will automatically unlock the moment boarding starts.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. COMMUTER ATTENDANCE HISTORY (Responsive Table + Mobile Cards)           */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden transition-all">
        <div className="p-3.5 sm:p-4 border-b border-zinc-200/90 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
              My Transit History
            </h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono font-bold">
            {history.length} Records
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 sm:p-10 text-center text-xs text-zinc-400 font-bold">
            No past attendance records found.
          </div>
        ) : (
          <>
            {/* Desktop Table (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Session</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Verification Mode</th>
                    <th className="px-5 py-3.5">Verified Time</th>
                    <th className="px-5 py-3.5">Distance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                  {history.map((rec) => (
                    <tr key={rec.id} className="hover:bg-zinc-50/70 dark:hover:bg-[#1a1a20]/60 transition">
                      <td className="px-5 py-3.5 font-bold font-mono text-zinc-900 dark:text-white">
                        {rec.attendanceDate}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 font-bold">
                        {rec.sessionType}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={rec.status} size="sm" />
                      </td>
                      <td className="px-5 py-3.5">
                        {rec.verificationMethod === 'FACE_GPS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                            <Camera className="w-3 h-3" />
                            Face + GPS
                          </span>
                        ) : rec.verificationMethod === 'PHONE_BIOMETRIC_GPS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                            <Fingerprint className="w-3 h-3" />
                            Phone Biometric
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-mono text-[11px]">Dynamic Code</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 font-mono">
                        {rec.verifiedAt ? formatISTTime(rec.verifiedAt) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 font-mono">
                        {rec.distanceMeters != null ? `${Math.round(rec.distanceMeters)}m` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (< 640px) */}
            <div className="block sm:hidden divide-y divide-zinc-100 dark:divide-[#24242e]">
              {history.map((rec) => (
                <div key={rec.id} className="p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-zinc-900 dark:text-white">
                      {rec.attendanceDate} • {rec.sessionType}
                    </span>
                    <StatusBadge status={rec.status} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      {rec.verifiedAt ? formatISTTime(rec.verifiedAt) : '—'}
                    </span>
                    {rec.distanceMeters != null && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {Math.round(rec.distanceMeters)}m
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL VIEWFINDER (Front Camera & Fingerprint Verification)             */}
      {/* ========================================================================= */}
      <MobileVerificationModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        busId={student?.busId || ''}
        onSuccess={() => {
          setIsMobileModalOpen(false);
          fetchStudentData();
        }}
      />

      {/* ========================================================================= */}
      {/* 5. MODAL FACIAL ENROLLMENT (One-Time Biometric Registration)               */}
      {/* ========================================================================= */}
      <FaceEnrollmentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        studentName={student?.name || user?.name}
        onSuccess={async (_photoUrl, updatedStudent) => {
          if (updatedStudent) {
            setStudent(updatedStudent);
          }
          setIsEnrollModalOpen(false);
          await fetchStudentData();
        }}
      />
    </div>
  );
};
