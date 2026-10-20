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
} from 'lucide-react';
import { MobileVerificationModal } from '../../components/attendance/MobileVerificationModal';
import { FaceEnrollmentModal } from '../../components/attendance/FaceEnrollmentModal';

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

  useEffect(() => {
    fetchStudentData();
    const interval = setInterval(fetchStudentData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStudentData();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Loading Student Commuter Portal...</p>
      </div>
    );
  }

  const isPresent = todayRecord?.status === 'PRESENT';
  const userKey = student?.id || user?.id || user?.studentId || '';
  const cachedEnrollment = userKey ? localStorage.getItem(`face_enrolled_${userKey}`) === 'true' : false;
  const isFaceEnrolled = Boolean(student?.profilePhotoUrl || cachedEnrollment);

  useEffect(() => {
    if (student?.profilePhotoUrl && userKey) {
      localStorage.setItem(`face_enrolled_${userKey}`, 'true');
    }
  }, [student?.profilePhotoUrl, userKey]);

  const activeSession = sessionInfo?.activeSession;
  const isTargetBusActive =
    activeSession &&
    activeSession.status === 'ACTIVE' &&
    (activeSession.busId === 'ALL' || activeSession.busId === student?.busId);

  const isSessionActive = sessionInfo?.status === 'ACTIVE' || isTargetBusActive;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-10">
      {/* ========================================================================= */}
      {/* 1. STUDENT EXECUTIVE CONSOLE HEADER                                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="emerald">STUDENT COMMUTER PORTAL</Badge>
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-sky-400">
              {student?.registerNumber || 'REG-PENDING'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {student?.name || user?.name}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1 flex items-center gap-2">
            <span>Assigned: <strong>{bus?.busNumber || 'Bus No 6'}</strong></span>
            <span>•</span>
            <span>Route: <strong>{bus?.routeName || 'Campus Transit'}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Face ID Status Badge or Registration Trigger */}
          {isFaceEnrolled ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Face ID Registered</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEnrollModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Register Face ID</span>
            </button>
          )}

          <Button onClick={handleRefresh} disabled={isRefreshing} variant="secondary" size="sm">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1.5 MANDATORY FACE REGISTRATION GATE (Shown if student hasn't enrolled)   */}
      {/* ========================================================================= */}
      {!isFaceEnrolled && !isPresent && (
        <div className="p-5 sm:p-6 rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white">
                  ACTION REQUIRED
                </span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  Face ID Not Registered
                </span>
              </div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white mt-1">
                Register Your Baseline Face Photo First
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 max-w-xl">
                You cannot mark bus attendance without enrolling your face. Take a one-time selfie to register your biometric portrait.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEnrollModalOpen(true)}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer shrink-0"
          >
            📸 Register Face ID Now
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. REAL-TIME BOARDING PASS & VERIFICATION SUITE                           */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs overflow-hidden transition-all">
        {isPresent ? (
          /* ===================================================================== */
          /* VERIFIED BOARDING PASS (GREEN STATE)                                   */
          /* ===================================================================== */
          <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-b border-emerald-500/20 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                      VERIFIED PASS
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold font-mono">
                      {todayRecord.attendanceDate}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight mt-1">
                    Boarding Attendance Confirmed
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Your physical presence has been verified and registered on the bus roster.
                  </p>
                </div>
              </div>

              {todayRecord.selfieImageUrl && (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-emerald-500 shrink-0 shadow-sm self-start sm:self-auto">
                  <img
                    src={todayRecord.selfieImageUrl}
                    alt="Selfie"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/10" />
                </div>
              )}
            </div>

            {/* Receipt Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/90 dark:bg-[#181820]/90 p-4 rounded-xl border border-emerald-200/70 dark:border-emerald-500/20 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400">Verification Mode</span>
                <p className="font-bold text-zinc-900 dark:text-white mt-0.5 flex items-center gap-1">
                  {todayRecord.verificationMethod === 'FACE_GPS' ? (
                    <>
                      <Camera className="w-3.5 h-3.5 text-purple-600" />
                      Face + GPS ({todayRecord.faceMatchConfidence || 92}%)
                    </>
                  ) : todayRecord.verificationMethod === 'PHONE_BIOMETRIC_GPS' ? (
                    <>
                      <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
                      Phone Biometric
                    </>
                  ) : (
                    'Dynamic Code + GPS'
                  )}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400">Boarding Time</span>
                <p className="font-bold font-mono text-zinc-900 dark:text-white mt-0.5">
                  {todayRecord.verifiedAt
                    ? new Date(todayRecord.verifiedAt).toLocaleTimeString('en-US', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Registered'}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400">Distance to Bus</span>
                <p className="font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {todayRecord.distanceMeters != null ? `${Math.round(todayRecord.distanceMeters)} meters` : 'At Bus'}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400">Assigned Bus</span>
                <p className="font-bold text-zinc-900 dark:text-white mt-0.5">
                  {bus?.busNumber || 'Bus 06'}
                </p>
              </div>
            </div>
          </div>
        ) : isSessionActive ? (
          /* ===================================================================== */
          /* ACTIVE BOARDING WINDOW (ACTION REQUIRED)                               */
          /* ===================================================================== */
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-200" />
                    TRANSIT BOARDING ACTIVE
                  </span>
                  <span className="text-xs text-zinc-500 font-mono font-bold">
                    Bus {student?.busId || 'BUS06'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                  Verify Your Physical Presence
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  The bus in-charge has initiated attendance for your route. Mark attendance on your smartphone using Face ID or Phone Biometrics.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#1e1e26] text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>Geofenced Boundary: 100m</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => setIsMobileModalOpen(true)}
                className="flex items-center justify-center gap-3 py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-sm shadow-lg shadow-emerald-600/20 transition-all cursor-pointer min-h-[56px]"
              >
                <Camera className="w-5 h-5" />
                <span>📸 VERIFY WITH MOBILE FACE & GPS</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMobileModalOpen(true)}
                className="flex items-center justify-center gap-3 py-4 px-5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1a1a22] dark:hover:bg-[#22222c] active:scale-[0.98] border border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white font-bold text-sm shadow-xs transition-all cursor-pointer min-h-[56px]"
              >
                <Fingerprint className="w-5 h-5 text-emerald-500" />
                <span>👆 Use Phone TouchID / Biometrics</span>
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center">
              100% Smartphone Verification • Front camera selfie automatically enrolls and verifies within seconds
            </p>
          </div>
        ) : (
          /* ===================================================================== */
          /* SESSION CLOSED / WAITING FOR IN-CHARGE                                */
          /* ===================================================================== */
          <div className="p-8 sm:p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-100 dark:bg-[#1e1e26] text-zinc-400 flex items-center justify-center border border-zinc-200 dark:border-[#2e2e38]">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                ATTENDANCE CLOSED
              </span>
              <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                Transit Attendance Not Initiated
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                The bus in-charge has not opened transit attendance for Bus {student?.busId || '06'} yet.
                This console will automatically unlock the moment boarding starts.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. COMMUTER ATTENDANCE HISTORY TABLE                                      */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden transition-all">
        <div className="p-4 border-b border-zinc-200/90 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex items-center justify-between">
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
          <div className="p-10 text-center text-xs text-zinc-400 font-bold">
            No past attendance records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                      {rec.verifiedAt
                        ? new Date(rec.verifiedAt).toLocaleTimeString('en-US', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 font-mono">
                      {rec.distanceMeters != null ? `${Math.round(rec.distanceMeters)}m` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL VIEWFINDER (Front Camera & Fingerprint Verification)             */}
      {/* ========================================================================= */}
      <MobileVerificationModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        busId={student?.busId || 'BUS06'}
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
        registerNumber={student?.registerNumber || user?.studentId || ''}
        onSuccess={(photoUrl) => {
          if (userKey) localStorage.setItem(`face_enrolled_${userKey}`, 'true');
          setStudent((prev) => (prev ? { ...prev, profilePhotoUrl: photoUrl } : prev));
          setIsEnrollModalOpen(false);
          fetchStudentData();
        }}
      />
    </div>
  );
};
