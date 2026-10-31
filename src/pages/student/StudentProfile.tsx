import { StudentProfileSkeleton } from '../../components/skeleton/StudentSkeletons';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Student, Bus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { FaceEnrollmentModal } from '../../components/attendance/FaceEnrollmentModal';
import { MobileVerificationModal } from '../../components/attendance/MobileVerificationModal';
import {
  User,
  GraduationCap,
  Mail,
  Phone,
  Bus as BusIcon,
  Camera,
  Fingerprint,
  RefreshCw,
  LogOut,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ShieldCheck,
} from 'lucide-react';

export const StudentProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [bus, setBus] = useState<Bus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState<boolean>(false);
  const [isResettingFace, setIsResettingFace] = useState<boolean>(false);
  const [isDeviceBiometricEnrolled, setIsDeviceBiometricEnrolled] = useState<boolean>(false);
  const [isResettingBiometric, setIsResettingBiometric] = useState<boolean>(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [mobileModalTab, setMobileModalTab] = useState<'FACE' | 'BIOMETRIC'>('BIOMETRIC');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await api.getMyStatus();
      const stu = res.student;
      setStudent(stu);
      setBus(res.bus);

      if (stu) {
        const studentId = stu.id || user?.studentId || user?.id || '';
        const localCred =
          localStorage.getItem(`bus_biometric_cred_${studentId}`) ||
          localStorage.getItem('bus_biometric_cred_default');

        if (stu.biometricEnrolledAt || localCred) {
          setIsDeviceBiometricEnrolled(true);
        } else {
          try {
            const bio = await api.getMobileBiometricCredential();
            setIsDeviceBiometricEnrolled(Boolean(bio.credential?.credentialId));
          } catch {
            setIsDeviceBiometricEnrolled(false);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load student profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleResetFace = async () => {
    if (!window.confirm('Are you sure you want to reset your registered Face biometric? You will need to re-enroll your facial portrait.')) {
      return;
    }
    setIsResettingFace(true);
    try {
      await api.resetFace();
      setMessage({ type: 'success', text: 'Face profile successfully reset. You can now re-enroll.' });
      await fetchProfile();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to reset face biometric.' });
    } finally {
      setIsResettingFace(false);
    }
  };

  const handleResetBiometric = async () => {
    if (!window.confirm('Are you sure you want to reset your registered phone biometric (fingerprint/sensor) credential? You will need to re-register.')) {
      return;
    }
    setIsResettingBiometric(true);
    try {
      const studentId = student?.id || user?.studentId || user?.id || '';
      localStorage.removeItem(`bus_biometric_cred_${studentId}`);
      localStorage.removeItem(`bus_biometric_cred_${studentId}_raw`);
      localStorage.removeItem(`bus_biometric_cred_${studentId}_transports`);
      localStorage.removeItem('bus_biometric_cred_default');
      localStorage.removeItem('bus_biometric_cred_default_raw');
      localStorage.removeItem('bus_biometric_cred_default_transports');

      await Promise.allSettled([
        api.unregisterMobileBiometric(),
        api.resetBiometric(studentId),
      ]);
      setIsDeviceBiometricEnrolled(false);
      setMessage({ type: 'success', text: 'Phone biometric credential reset successfully. You can now enroll afresh.' });
      await fetchProfile();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to reset device biometric.' });
    } finally {
      setIsResettingBiometric(false);
    }
  };

  if (isLoading && !student) {
    return <StudentProfileSkeleton />;
  }

  const isFaceEnrolled = Boolean(student?.photoUrl && student?.faceEnrolledAt);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-sky-950/40 text-blue-600 dark:text-sky-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Student Profile & Bus Pass
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Official institutional identification and commuter profile
            </p>
          </div>
        </div>

        {student && (
          <div className="self-start sm:self-auto">
            <StatusBadge status={student.status || 'APPROVED'} />
          </div>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span className="text-xs font-semibold">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xs font-bold uppercase underline hover:opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-sky-400" />
          <p className="text-xs font-medium text-zinc-500">Retrieving student records...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Academic Details */}
          <div className="p-6 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-[#27272a]">
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Academic Credentials
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-400 font-medium block">Full Legal Name</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-bold text-sm">
                  {student?.name || user?.name || '—'}
                </span>
              </div>

              <div>
                <span className="text-zinc-400 font-medium block">Register / Roll Number</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-mono font-semibold">
                  {student?.registerNumber || '—'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-zinc-400 font-medium block">Department</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
                    {(student as any)?.department || 'General'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 font-medium block">Academic Year</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
                    {(student as any)?.year ? `Year ${(student as any).year}` : '—'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-[#27272a] space-y-2">
                <div>
                  <span className="text-zinc-400 font-medium block">College Email</span>
                  <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-medium">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{student?.email || user?.email || '—'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-zinc-400 font-medium block">Registered Phone</span>
                  <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-medium">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{student?.phone || 'Not configured'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Transit Bus */}
          <div className="p-6 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-[#27272a]">
              <BusIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Assigned Bus Pass
              </h2>
            </div>

            {bus ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-zinc-400 font-medium block">Assigned Fleet</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-black text-lg">
                    Bus {bus.busNumber}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 font-medium block">Transit Route</span>
                  <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-semibold mt-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{bus.routeName}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Official Bus Pass Active</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                    You are eligible for GPS attendance verification on Bus {bus.busNumber}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  No Bus Fleet Assigned
                </p>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Your registration is awaiting transportation admin fleet allocation. Once assigned, you can verify attendance.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Biometric Security Row: Face Biometrics & Phone Fingerprint */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Facial Biometric Security */}
        <div className="p-6 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-[#27272a]">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Facial Biometric Security
                </h2>
              </div>
              {isFaceEnrolled ? (
                <Badge variant="emerald" className="text-xs">
                  Face ID Enrolled
                </Badge>
              ) : (
                <Badge variant="amber" className="text-xs">
                  Not Enrolled
                </Badge>
              )}
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Enrolling your face enables anti-proxy presence verification during transit. Reference portraits are stored in cloud storage with 128-D vector matching.
            </p>
          </div>

          <div className="flex items-center gap-2.5 pt-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEnrollModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <Camera className="w-3.5 h-3.5" />
              {isFaceEnrolled ? 'Re-enroll Face' : 'Enroll Face ID'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFace}
              disabled={isResettingFace}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Face ID
            </Button>
          </div>
        </div>

        {/* Card 2: Phone Biometric Security (Fingerprint / WebAuthn) */}
        <div className="p-6 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-[#27272a]">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Phone Fingerprint Sensor
                </h2>
              </div>
              {isDeviceBiometricEnrolled ? (
                <Badge variant="emerald" className="text-xs flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Fingerprint Ready
                </Badge>
              ) : (
                <Badge variant="amber" className="text-xs">
                  Not Configured
                </Badge>
              )}
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Use your phone's native in-display or side-mounted fingerprint sensor (or TouchID/FaceID) for instantaneous, 1-tap bus boarding check-in alongside GPS.
            </p>
          </div>

          <div className="flex items-center gap-2.5 pt-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMobileModalTab('BIOMETRIC');
                setIsMobileModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
            >
              <Fingerprint className="w-3.5 h-3.5" />
              {isDeviceBiometricEnrolled ? 'Re-enroll Fingerprint' : 'Register Phone Biometric'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleResetBiometric}
              disabled={isResettingBiometric}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Biometric
            </Button>
          </div>
        </div>
      </div>

      {/* Logout Action */}
      <div className="flex justify-end pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out of Student Portal
        </Button>
      </div>

      {/* Face Enrollment Modal */}
      <FaceEnrollmentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        onSuccess={() => {
          setIsEnrollModalOpen(false);
          setMessage({ type: 'success', text: 'Face biometric successfully enrolled and verified.' });
          fetchProfile();
        }}
        studentName={student?.name || user?.name}
        registerNumber={student?.registerNumber}
      />

      {/* Phone Biometric Modal */}
      <MobileVerificationModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        busId={bus?.id || student?.busId || ''}
        studentId={student?.id || user?.studentId || user?.id || ''}
        studentName={student?.name || user?.name || ''}
        initialTab={mobileModalTab}
        onSuccess={() => {
          setIsMobileModalOpen(false);
          setMessage({ type: 'success', text: 'Phone biometric verified successfully!' });
          fetchProfile();
        }}
      />
    </div>
  );
};
