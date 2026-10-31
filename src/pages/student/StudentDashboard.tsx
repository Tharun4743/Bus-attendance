import { StudentDashboardSkeleton } from '../../components/skeleton/StudentSkeletons';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Radio,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Navigation,
  Compass,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { MobileVerificationModal } from '../../components/attendance/MobileVerificationModal';
import { FaceEnrollmentModal } from '../../components/attendance/FaceEnrollmentModal';
import { formatISTTime } from '../../utils/time';
import { subscribeToNotifications, subscribeToSessionChanges } from '../../lib/supabaseRealtime';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [bus, setBus] = useState<Bus | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [morningRecord, setMorningRecord] = useState<AttendanceRecord | null>(null);
  const [eveningRecord, setEveningRecord] = useState<AttendanceRecord | null>(null);
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationNotice, setVerificationNotice] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    details?: string;
  } | null>(null);

  // Modals for optional Face / Biometric verification
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [mobileModalTab, setMobileModalTab] = useState<'FACE' | 'BIOMETRIC'>('FACE');
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStudentData = async () => {
    try {
      const [res, notifsRes] = await Promise.all([
        api.getMyStatus(),
        api.getNotifications().catch(() => ({ notifications: [] })),
      ]);
      setStudent(res.student);
      setBus(res.bus);
      setSessionInfo(res.sessionInfo);
      setTodayRecord(res.todayRecord);
      setMorningRecord((res as any).morningRecord || null);
      setEveningRecord((res as any).eveningRecord || null);
      setRecentNotifs((notifsRes as any)?.notifications?.slice(0, 3) || []);
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Failed to load student status:', err);
      setErrorMessage(err?.message || 'Failed to connect to commuter portal. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Live Auto-Refresh: 20s interval + window focus + visibility change + Supabase Realtime
  useEffect(() => {
    fetchStudentData();
    const interval = setInterval(fetchStudentData, 20000);

    const onFocus = () => {
      fetchStudentData();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStudentData();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Supabase Realtime instant sync
    const unsubNotif = subscribeToNotifications(() => {
      fetchStudentData();
    });
    const unsubSession = subscribeToSessionChanges(() => {
      fetchStudentData();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      unsubNotif();
      unsubSession();
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStudentData();
  };

  // Direct Ground Geofence Verification (Browser Geolocation + Haversine Formula)
  const handleVerifyGroundAttendance = () => {
    if (!('geolocation' in navigator)) {
      setVerificationNotice({
        type: 'error',
        message: 'Geolocation is not supported by your browser.',
        details: 'Please use a modern smartphone browser with GPS location services enabled.',
      });
      return;
    }

    setIsVerifying(true);
    setVerificationNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;
          const capturedAt = new Date().toISOString();

          const result = await api.verifyLocation({
            latitude,
            longitude,
            accuracy,
            capturedAt,
          });

          if (result.status === 'PRESENT') {
            setVerificationNotice({
              type: 'success',
              message: 'Attendance Verified Successfully!',
              details: `Marked PRESENT at College Ground (${result.distanceMeters != null ? Math.round(result.distanceMeters) : 0}m from center, GPS accuracy ±${Math.round(accuracy)}m).`,
            });
            await fetchStudentData();
          } else if (result.status === 'OUTSIDE_GEOFENCE') {
            setVerificationNotice({
              type: 'error',
              message: 'Outside College Ground Geofence',
              details: `You are approximately ${result.distanceMeters != null ? Math.round(result.distanceMeters) : '?'}m away from College Ground. The maximum permitted radius is 10m. You must be physically at the College Ground to mark ground attendance.`,
            });
          } else if (result.status === 'LOW_GPS_ACCURACY') {
            setVerificationNotice({
              type: 'warning',
              message: 'Low GPS Accuracy Detected',
              details: `Your current GPS accuracy is ±${Math.round(accuracy)}m, but maximum allowed uncertainty is 20m. Please move outdoors away from tall concrete structures to improve satellite lock.`,
            });
          } else if (result.status === 'ALREADY_SUBMITTED') {
            setVerificationNotice({
              type: 'success',
              message: 'Attendance Already Recorded',
              details: 'You have already marked your attendance for this active session.',
            });
            await fetchStudentData();
          } else if (result.status === 'SESSION_CLOSED' || result.status === 'SESSION_NOT_FOUND') {
            setVerificationNotice({
              type: 'error',
              message: 'Session No Longer Active',
              details: 'The attendance session has been closed by your bus in-charge.',
            });
            await fetchStudentData();
          } else {
            setVerificationNotice({
              type: 'error',
              message: result.message || 'Verification could not be completed.',
              details: `Status: ${result.status}`,
            });
          }
        } catch (err: any) {
          setVerificationNotice({
            type: 'error',
            message: err.message || 'Attendance verification request failed.',
          });
        } finally {
          setIsVerifying(false);
        }
      },
      (geoError) => {
        setIsVerifying(false);
        let errorDetail = 'Could not acquire your current GPS coordinates.';
        if (geoError.code === geoError.PERMISSION_DENIED) {
          errorDetail = 'Location permission was denied. Please allow location access in your device and browser settings.';
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          errorDetail = 'GPS satellite position unavailable. Please ensure Location/GPS is turned ON on your phone.';
        } else if (geoError.code === geoError.TIMEOUT) {
          errorDetail = 'Location request timed out. Please try again with clear view of the sky.';
        }
        setVerificationNotice({
          type: 'error',
          message: 'Location Access Error',
          details: errorDetail,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  // Direct Travelling Bus Attendance Verification (Authenticated Session Participation)
  const handleVerifyTravellingAttendance = async () => {
    setIsVerifying(true);
    setVerificationNotice(null);

    try {
      const result = await api.verifyLocation({
        capturedAt: new Date().toISOString(),
      });

      if (result.status === 'PRESENT') {
        setVerificationNotice({
          type: 'success',
          message: 'Travelling Attendance Verified!',
          details: 'Your boarding participation on the moving transit bus has been confirmed.',
        });
        await fetchStudentData();
      } else if (result.status === 'ALREADY_SUBMITTED') {
        setVerificationNotice({
          type: 'success',
          message: 'Attendance Already Recorded',
          details: 'Your boarding attendance is already logged as PRESENT.',
        });
        await fetchStudentData();
      } else if (result.status === 'SESSION_CLOSED' || result.status === 'SESSION_NOT_FOUND') {
        setVerificationNotice({
          type: 'error',
          message: 'Transit Session Closed',
          details: 'The travelling attendance window has been concluded by the in-charge.',
        });
        await fetchStudentData();
      } else {
        setVerificationNotice({
          type: 'error',
          message: result.message || 'Travelling verification failed.',
          details: `Status: ${result.status}`,
        });
      }
    } catch (err: any) {
      setVerificationNotice({
        type: 'error',
        message: err.message || 'Failed to verify travelling attendance.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const isFaceEnrolled = Boolean(student?.photoUrl && student?.faceEnrolledAt);

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

  if (isLoading && !student) {
    return <StudentDashboardSkeleton />;
  }

  const isPresent = todayRecord?.status === 'PRESENT';

  const normalizeBus = (b?: string | null): string => {
    if (!b) return '';
    return b.trim().toUpperCase().replace(/^BUS-/i, '');
  };

  const activeSession = sessionInfo?.activeSession;
  const isTargetBusActive = Boolean(
    activeSession &&
    activeSession.status === 'ACTIVE' &&
    (activeSession.busId === 'ALL' ||
      !student?.busId ||
      normalizeBus(activeSession.busId) === normalizeBus(student?.busId))
  );

  const isSessionActive = Boolean(
    (sessionInfo?.status === 'ACTIVE' && activeSession) ||
    isTargetBusActive
  );

  const isGroundMode = activeSession?.attendanceMode === 'GROUND' || !activeSession?.attendanceMode;

  return (
    <div className="space-y-4 w-full mx-auto pb-8">
      {/* Network / Sync Error Notice */}
      {errorMessage && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Portal Sync Notice</p>
              <p className="text-xs sm:text-sm font-medium text-rose-700 dark:text-rose-300">{errorMessage}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Retry Connection</span>
          </Button>
        </div>
      )}

      {/* Verification Action Feedback Alert */}
      {verificationNotice && (
        <div
          className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-4 rounded-2xl border shadow-xs transition-all ${
            verificationNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : verificationNotice.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-100'
          }`}
        >
          <div className="flex items-start gap-3">
            {verificationNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : verificationNotice.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <h4 className="text-xs font-black uppercase tracking-wider">
                {verificationNotice.message}
              </h4>
              {verificationNotice.details && (
                <p className="text-xs font-medium opacity-90">
                  {verificationNotice.details}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVerificationNotice(null)}
            className="text-xs font-bold underline opacity-70 hover:opacity-100 self-start sm:self-auto shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. STUDENT EXECUTIVE CONSOLE HEADER                                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-4 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="emerald">STUDENT COMMUTER PORTAL</Badge>
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-sky-400">
              {student?.registerNumber || user?.studentId || 'ACTIVE COMMUTER'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Welcome, {student?.name || user?.name || 'Student'}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1 flex items-center gap-2 flex-wrap">
            <span>
              Assigned:{' '}
              <strong>
                {bus?.busNumber || student?.busId || (activeSession?.busId ? `Bus ${activeSession.busId}` : 'Assigned Fleet Bus')}
              </strong>
            </span>
            {(bus?.routeName || activeSession?.location?.name || sessionInfo?.locationName) && (
              <>
                <span>•</span>
                <span>{bus?.routeName || activeSession?.location?.name || sessionInfo?.locationName}</span>
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
            <Button
              onClick={() => setIsEnrollModalOpen(true)}
              variant="primary"
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-white font-bold"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Enroll Face ID</span>
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1.5 TODAY'S SESSIONS: MORNING & EVENING ATTENDANCE STATUS                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Morning Session Card */}
        <div className="p-4 sm:p-5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🌅</span>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Morning Attendance Status
              </h3>
            </div>
            <StatusBadge status={morningRecord?.status || 'NOT_PRESENT'} size="sm" />
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#181820] space-y-1 text-xs">
            <div className="flex items-center justify-between text-zinc-500">
              <span>Verification Status</span>
              <span className="font-bold text-zinc-900 dark:text-white font-mono">
                {morningRecord?.status === 'PRESENT' ? 'Verified Present' : 'Not Recorded / Absent'}
              </span>
            </div>
            {morningRecord?.verifiedAt && (
              <div className="flex items-center justify-between text-zinc-500">
                <span>Verified Time</span>
                <span className="font-bold text-emerald-600 dark:text-[#4ade80] font-mono">
                  {formatISTTime(morningRecord.verifiedAt)}
                </span>
              </div>
            )}
            {morningRecord?.verificationMethod && (
              <div className="flex items-center justify-between text-zinc-500">
                <span>Method</span>
                <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                  {morningRecord.verificationMethod}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Evening Session Card */}
        <div className="p-4 sm:p-5 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🌆</span>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Evening Attendance Status
              </h3>
            </div>
            <StatusBadge status={eveningRecord?.status || 'NOT_PRESENT'} size="sm" />
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#181820] space-y-1 text-xs">
            <div className="flex items-center justify-between text-zinc-500">
              <span>Verification Status</span>
              <span className="font-bold text-zinc-900 dark:text-white font-mono">
                {eveningRecord?.status === 'PRESENT' ? 'Verified Present' : 'Not Recorded / Absent'}
              </span>
            </div>
            {eveningRecord?.verifiedAt && (
              <div className="flex items-center justify-between text-zinc-500">
                <span>Verified Time</span>
                <span className="font-bold text-emerald-600 dark:text-[#4ade80] font-mono">
                  {formatISTTime(eveningRecord.verifiedAt)}
                </span>
              </div>
            )}
            {eveningRecord?.verificationMethod && (
              <div className="flex items-center justify-between text-zinc-500">
                <span>Method</span>
                <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                  {eveningRecord.verificationMethod}
                </span>
              </div>
            )}
          </div>
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
                  Your attendance on <strong>{bus?.busNumber || 'Assigned Bus'}</strong> is officially verified and recorded.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#181820] border border-zinc-200/80 dark:border-zinc-800 text-right space-y-1 self-start sm:self-auto min-w-[150px]">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">Boarding Timestamp</span>
                <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                  {todayRecord?.verifiedAt ? formatISTTime(todayRecord.verifiedAt) : 'Today'}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 block">
                  Method: {todayRecord?.verificationMethod || 'GROUND_GEOFENCE'}
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
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Session Status</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Mode: <strong>{todayRecord?.verificationMethod === 'TRAVELLING_SESSION_PARTICIPATION' ? 'Travelling Bus' : 'Ground Geofence'}</strong>
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Proximity / Location</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Proximity:{' '}
                    <strong>
                      {todayRecord?.distanceMeters != null
                        ? `${Math.round(todayRecord.distanceMeters)}m from center`
                        : todayRecord?.verificationMethod === 'TRAVELLING_SESSION_PARTICIPATION'
                        ? 'Travelling Transit Verified'
                        : 'Inside College Ground'}
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : isSessionActive ? (
          /* ===================================================================== */
          /* ACTIVE ATTENDANCE SESSION WINDOW (ACTION REQUIRED)                   */
          /* ===================================================================== */
          <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-200" />
                    {activeSession?.sessionType || 'SESSION'} ACTIVE
                  </span>
                  <span className="text-xs text-zinc-500 font-mono font-bold">
                    Bus {bus?.busNumber || student?.busId || 'Assigned Bus'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {isGroundMode ? 'Verify Ground Attendance' : 'Confirm Travelling Bus Attendance'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {isGroundMode
                    ? 'The bus in-charge has initiated Ground Attendance. Verify your location using high-accuracy GPS at the College Ground (10m geofence).'
                    : 'The bus in-charge has initiated Travelling Bus Attendance. Confirm your transit participation on the moving bus.'}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#1e1e26] text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300 self-start sm:self-auto">
                <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  {isGroundMode
                    ? `College Ground (10m Radius)`
                    : `Travelling Transit Session`}
                </span>
              </div>
            </div>

            {/* Primary Action Button (Zero Fake GPS, Zero 6-digit Codes) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {isGroundMode ? (
                <button
                  type="button"
                  onClick={handleVerifyGroundAttendance}
                  disabled={isVerifying}
                  className="flex items-center justify-center gap-3 py-3.5 sm:py-4 px-4 sm:px-5 rounded-2xl font-black text-sm shadow-lg transition-all cursor-pointer min-h-[52px] bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-emerald-600/20 disabled:opacity-60"
                >
                  <Navigation className={`w-5 h-5 shrink-0 ${isVerifying ? 'animate-spin' : ''}`} />
                  <span className="text-center">
                    {isVerifying ? 'ACQUIRING GPS & VERIFYING...' : '📍 VERIFY GROUND ATTENDANCE (GPS)'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleVerifyTravellingAttendance}
                  disabled={isVerifying}
                  className="flex items-center justify-center gap-3 py-3.5 sm:py-4 px-4 sm:px-5 rounded-2xl font-black text-sm shadow-lg transition-all cursor-pointer min-h-[52px] bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white shadow-sky-600/20 disabled:opacity-60"
                >
                  <Compass className={`w-5 h-5 shrink-0 ${isVerifying ? 'animate-spin' : ''}`} />
                  <span className="text-center">
                    {isVerifying ? 'CONFIRMING BOARDING...' : '🚌 CONFIRM BUS BOARDING'}
                  </span>
                </button>
              )}

              {/* Secondary Biometric / Face option */}
              <button
                type="button"
                onClick={() => {
                  if (!isFaceEnrolled) {
                    setIsEnrollModalOpen(true);
                  } else {
                    setMobileModalTab('FACE');
                    setIsMobileModalOpen(true);
                  }
                }}
                className="flex items-center justify-center gap-3 py-3.5 sm:py-4 px-4 sm:px-5 rounded-2xl border font-bold text-sm shadow-xs transition-all cursor-pointer min-h-[52px] bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1a1a22] dark:hover:bg-[#22222c] active:scale-[0.98] border-zinc-200 dark:border-[#2e2e38] text-zinc-900 dark:text-white"
              >
                <Camera className="w-5 h-5 shrink-0 text-emerald-500" />
                <span className="text-center">
                  {isFaceEnrolled ? '📸 Optional Face ID Scan' : '📸 Enroll Face Portrait'}
                </span>
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center">
              {isGroundMode
                ? 'Ground Attendance: Verified via smartphone GPS against College Ground 10-metre geofence.'
                : 'Travelling Attendance: Verified via authenticated active session participation.'}
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
                No Active Attendance Session
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                The bus in-charge has not opened transit attendance for {bus?.busNumber || student?.busId || 'your bus'} yet.
                This screen will automatically unlock the moment attendance starts.
              </p>
            </div>
          </div>
        )}
      </div>


      {/* ========================================================================= */}
      {/* 2.8 RECENT IN-APP NOTIFICATIONS                                           */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
              Recent Notifications
            </h3>
          </div>
          <Link
            to="/student/notifications"
            className="text-xs font-bold text-emerald-600 dark:text-[#4ade80] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentNotifs.length === 0 ? (
          <p className="text-xs text-zinc-400 font-medium py-2">
            No recent transit announcements or alerts.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-[#24242e]">
            {recentNotifs.map((n) => (
              <div key={n.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-zinc-900 dark:text-white">{n.title}</p>
                  <p className="text-zinc-500 text-[11px] mt-0.5">{n.message}</p>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                  {n.createdAt ? formatISTTime(n.createdAt) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. ATTENDANCE HISTORY NAVIGATION CARD                                      */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
            Looking for detailed past attendance logs?
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            View complete date-wise logs, GPS verification proof, and export your attendance records.
          </p>
        </div>
        <Link
          to="/student/history"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs hover:opacity-90 transition active:scale-95 shrink-0 self-start sm:self-auto"
        >
          <span>Attendance History →</span>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL VIEWFINDER (Optional Face ID & Biometric Viewfinder)               */}
      {/* ========================================================================= */}
      <MobileVerificationModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        busId={student?.busId || ''}
        studentId={student?.id || user?.studentId || user?.id || ''}
        studentName={student?.name || user?.name || ''}
        initialTab={mobileModalTab}
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