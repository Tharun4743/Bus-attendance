import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Student, Bus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { FaceEnrollmentModal } from '../../components/attendance/FaceEnrollmentModal';
import {
  User,
  GraduationCap,
  Mail,
  Phone,
  Bus as BusIcon,
  Camera,
  RefreshCw,
  LogOut,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react';

export const StudentProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [bus, setBus] = useState<Bus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState<boolean>(false);
  const [isResettingFace, setIsResettingFace] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await api.getMyStatus();
      setStudent(res.student);
      setBus(res.bus);
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
    if (!window.confirm('Are you sure you want to reset your registered Face biometric? You will need to re-enroll.')) {
      return;
    }
    setIsResettingFace(true);
    try {
      await api.resetFace();
      setMessage({ type: 'success', text: 'Face profile successfully reset.' });
      await fetchProfile();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to reset face biometric.' });
    } finally {
      setIsResettingFace(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
            className="text-xs font-bold uppercase underline hover:opacity-80"
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

      {/* Face Biometric Security Section */}
      <div className="p-6 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-[#27272a]">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Facial Biometric Security
            </h2>
          </div>
          {student?.faceEnrolledAt ? (
            <Badge variant="emerald" className="text-xs">
              Biometric Enrolled
            </Badge>
          ) : (
            <Badge variant="amber" className="text-xs">
              Not Enrolled
            </Badge>
          )}
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Enrolling your face enables anti-proxy verification during campus bus attendance.
          Face scans are converted into cryptographic feature descriptors and matched on-device or against secure cloud descriptors.
        </p>

        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEnrollModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <Camera className="w-3.5 h-3.5" />
            {student?.faceEnrolledAt ? 'Re-enroll Face' : 'Enroll Face Biometric'}
          </Button>

          {student?.faceEnrolledAt && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFace}
              disabled={isResettingFace}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Face Profile
            </Button>
          )}
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
    </div>
  );
};
