import { StudentVerifyAttendanceSkeleton } from '../../components/skeleton/StudentSkeletons';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Bus, AttendanceRecord, ActiveSession, Student } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { MobileVerificationModal } from '../../components/attendance/MobileVerificationModal';
import {
  CheckCircle2,
  MapPin,
  Clock,
  RefreshCw,
  AlertCircle,
  Camera,
  Bus as BusIcon,
  Navigation,
} from 'lucide-react';
import { formatISTTime } from '../../utils/time';

export const StudentVerifyAttendance: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [bus, setBus] = useState<Bus | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [mobileModalTab, setMobileModalTab] = useState<'FACE' | 'BIOMETRIC'>('FACE');

  const [verificationNotice, setVerificationNotice] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    details?: string;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [res, sessRes] = await Promise.all([
        api.getMyStatus(),
        api.getSessionInfo(),
      ]);
      setStudent(res.student);
      setBus(res.bus);
      setTodayRecord(res.todayRecord);
      if (sessRes.activeSession && sessRes.activeSession.status === 'ACTIVE') {
        setActiveSession(sessRes.activeSession);
      } else {
        setActiveSession(null);
      }
    } catch (err: any) {
      console.error('Failed to load student status for verification:', err);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStatus();
    setIsRefreshing(false);
  };

  useEffect(() => {
    let isMounted = true;
    const initial = async () => {
      setIsLoading(true);
      await fetchStatus();
      if (isMounted) setIsLoading(false);
    };
    initial();

    // Auto-polling every 12 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    }, 12000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchStatus]);

  // GPS Ground Verification
  const handleVerifyGroundAttendance = () => {
    if (!navigator.geolocation) {
      setVerificationNotice({
        type: 'error',
        message: 'Geolocation Not Supported',
        details: 'Your device or browser does not support GPS location acquisition.',
      });
      return;
    }

    setIsVerifying(true);
    setVerificationNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude, accuracy } = pos.coords;
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
            await fetchStatus();
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
            await fetchStatus();
          } else if (result.status === 'SESSION_CLOSED' || result.status === 'SESSION_NOT_FOUND') {
            setVerificationNotice({
              type: 'error',
              message: 'Session No Longer Active',
              details: 'The attendance session has been closed by your bus in-charge.',
            });
            await fetchStatus();
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
            message: err?.message || 'Attendance verification request failed.',
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

  // Travelling Bus Verification
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
        await fetchStatus();
      } else if (result.status === 'ALREADY_SUBMITTED') {
        setVerificationNotice({
          type: 'success',
          message: 'Attendance Already Recorded',
          details: 'Your boarding attendance is already logged as PRESENT.',
        });
        await fetchStatus();
      } else if (result.status === 'SESSION_CLOSED' || result.status === 'SESSION_NOT_FOUND') {
        setVerificationNotice({
          type: 'error',
          message: 'Transit Session Closed',
          details: 'The travelling attendance window has been concluded by the in-charge.',
        });
        await fetchStatus();
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
        message: err?.message || 'Failed to verify travelling attendance.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading && !bus && !activeSession) {
    return <StudentVerifyAttendanceSkeleton />;
  }

  const isAlreadyVerified = todayRecord?.status === 'PRESENT';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-sky-950/40 text-blue-600 dark:text-sky-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Verify Attendance
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {bus ? `Bus ${bus.busNumber} • ${bus.routeName}` : 'Assigned Bus Transit Check-In'}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Verification Notice Banner */}
      {verificationNotice && (
        <div
          className={`p-4 rounded-xl border space-y-1 ${
            verificationNotice.type === 'success'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : verificationNotice.type === 'warning'
              ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
              : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">{verificationNotice.message}</span>
            <button
              onClick={() => setVerificationNotice(null)}
              className="text-xs font-bold uppercase underline hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
          {verificationNotice.details && (
            <p className="text-xs opacity-90">{verificationNotice.details}</p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-sky-400" />
          <p className="text-xs font-medium text-zinc-500">Checking active sessions...</p>
        </div>
      ) : !bus ? (
        <div className="p-8 bg-zinc-50 dark:bg-[#18181b] border border-dashed border-zinc-300 dark:border-[#27272a] rounded-2xl text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            No Bus Assigned
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Your student account is not assigned to a bus route. Please contact the administrator.
          </p>
        </div>
      ) : isAlreadyVerified ? (
        /* Student Already Verified State */
        <div className="p-8 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-black uppercase tracking-wider">
              Attendance Recorded • PRESENT
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">
              You're All Checked In!
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
              Your attendance has been officially verified for today's session on Bus {bus.busNumber}.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 bg-white dark:bg-[#18181b] rounded-xl border border-zinc-200/90 dark:border-[#27272a] text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-400">Verification Method:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {todayRecord.verificationMethod || 'GPS_GROUND'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Timestamp:</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">
                {todayRecord.verifiedAt ? formatISTTime(todayRecord.verifiedAt) : 'Today'}
              </span>
            </div>
            {todayRecord.distanceMeters !== null && todayRecord.distanceMeters !== undefined && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Distance to Ground Center:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {todayRecord.distanceMeters.toFixed(1)} meters
                </span>
              </div>
            )}
          </div>
        </div>
      ) : activeSession ? (
        /* Active Session Pending Verification */
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-[#27272a]">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <p className="text-[11px] font-black tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                    ACTIVE ATTENDANCE WINDOW OPEN
                  </p>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {activeSession.sessionType} SESSION &bull; Bus {bus.busNumber}
                  </h2>
                </div>
              </div>

              <Badge variant="emerald" className="text-xs">
                {activeSession.attendanceMode === 'GROUND' ? 'GROUND MODE' : 'TRAVELLING MODE'}
              </Badge>
            </div>

            {/* Mode Specific Description & Instructions */}
            {activeSession.attendanceMode === 'GROUND' ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50/50 dark:bg-sky-950/20 border border-blue-200/60 dark:border-sky-800/40 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-sky-200">
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                    <span>College Ground Geofence Verification</span>
                  </div>
                  <p className="text-blue-800/90 dark:text-sky-300 leading-relaxed">
                    You must be physically present at the College Ground. When you tap verify, your browser GPS will calculate the Haversine distance to the ground center. The geofence radius threshold is <strong>{activeSession.radiusMeters || 10} meters</strong>, and satellite accuracy must be within <strong>20 meters</strong>.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleVerifyGroundAttendance}
                    disabled={isVerifying}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-bold py-3"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Acquiring GPS & Verifying...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4" />
                        Verify Attendance with GPS
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setMobileModalTab('FACE');
                      setIsMobileModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 text-xs font-semibold"
                  >
                    <Camera className="w-4 h-4" />
                    Face Biometric
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-200">
                    <BusIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Travelling Bus Transit Attendance</span>
                  </div>
                  <p className="text-purple-800/90 dark:text-purple-300 leading-relaxed">
                    This session is operating in Travelling Bus Mode. If you are aboard Bus {bus.busNumber}, confirm your transit check-in below.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleVerifyTravellingAttendance}
                  disabled={isVerifying}
                  className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Registering Boarding Check-in...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm Boarding Attendance
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* No Session Active State */
        <div className="p-8 bg-zinc-50 dark:bg-[#18181b] border border-dashed border-zinc-300 dark:border-[#27272a] rounded-2xl text-center space-y-3">
          <Clock className="w-10 h-10 text-zinc-400 mx-auto" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            No Session Active for Bus {bus.busNumber}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Your bus in-charge has not yet initiated an attendance session. Please check back when morning or evening boarding begins.
          </p>
        </div>
      )}

      {/* Mobile / Face Verification Modal */}
      <MobileVerificationModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        busId={bus?.id || student?.busId || ''}
        studentId={student?.id || ''}
        studentName={student?.name || ''}
        initialTab={mobileModalTab}
        onSuccess={() => {
          setIsMobileModalOpen(false);
          setVerificationNotice({
            type: 'success',
            message: 'Biometric Attendance Verified!',
            details: 'Your face biometric and location have been successfully recorded.',
          });
          fetchStatus();
        }}
      />
    </div>
  );
};
