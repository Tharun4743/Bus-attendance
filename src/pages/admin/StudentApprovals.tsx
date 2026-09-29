import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, Student } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  Bus as BusIcon,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export const StudentApprovals: React.FC = () => {
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBuses, setSelectedBuses] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    try {
      const [pendingList, busList] = await Promise.all([
        api.getPendingApprovals(),
        api.getBuses(),
      ]);
      setPendingStudents(pendingList || []);
      setBuses(busList || []);

      const busMap: Record<string, string> = {};
      pendingList?.forEach((stu) => {
        if (stu.preferredBusId && busList.some((b) => b.id === stu.preferredBusId)) {
          busMap[stu.id] = stu.preferredBusId;
        } else if (busList.length > 0) {
          busMap[stu.id] = busList[0].id;
        }
      });
      setSelectedBuses(busMap);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (studentId: string) => {
    const busId = selectedBuses[studentId];
    if (!busId) {
      setFeedback({
        type: 'error',
        message: 'Please assign a bus to the student before approval.',
      });
      return;
    }

    setProcessingId(studentId);
    setFeedback(null);

    try {
      const res = await api.approveStudent(studentId, busId);
      setFeedback({
        type: 'success',
        message: `Student ${res.student.name} approved and assigned to ${busId}.`,
      });
      await fetchData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to approve student.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (studentId: string) => {
    const reason = window.prompt('Enter rejection reason (optional):', 'Registration not approved');
    if (reason === null) return;

    setProcessingId(studentId);
    setFeedback(null);

    try {
      const res = await api.rejectStudent(studentId, reason);
      setFeedback({
        type: 'success',
        message: `Registration for ${res.student.name} was rejected.`,
      });
      await fetchData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to reject student.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Loading pending student approvals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <Badge variant="amber" className="mb-2">
            STUDENT APPROVALS
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Pending Student Registrations
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Review student registration submissions, assign authoritative bus, and approve or reject.
          </p>
        </div>

        <Button
          onClick={fetchData}
          variant="secondary"
          size="sm"
          className="self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {feedback && (
        <div
          className={`p-3 sm:p-4 rounded-xl border flex items-start gap-2.5 text-xs font-semibold transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-[#4ade80]'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-[#fb7185]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-[#4ade80]" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-[#fb7185]" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Warning if no buses exist */}
      {buses.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-[#fde047] text-xs font-medium flex items-center gap-3">
          <BusIcon className="w-5 h-5 text-amber-600 dark:text-[#fde047] shrink-0" />
          <div>
            <p className="font-bold">No buses created yet!</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
              Please create at least one bus in <strong>Fleet Management</strong> before approving students.
            </p>
          </div>
        </div>
      )}

      {/* List of Pending Registrations */}
      {pendingStudents.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No Pending Approvals"
          description="All student registrations have been reviewed. When new students sign up, they will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingStudents.map((stu) => {
            const isProcessing = processingId === stu.id;
            const currentSelectedBus = selectedBuses[stu.id] || '';

            return (
              <div
                key={stu.id}
                className="bg-white dark:bg-[#141418] rounded-2xl p-5 shadow-xs border border-zinc-200/90 dark:border-[#26262e] space-y-3.5 flex flex-col justify-between transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                        {stu.name}
                      </h3>
                      <p className="text-xs font-mono font-bold text-blue-600 dark:text-sky-400">
                        Reg No: {stu.registerNumber}
                      </p>
                    </div>
                    <Badge variant="amber">
                      <Clock className="w-3 h-3" />
                      PENDING
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-zinc-50 dark:bg-[#1a1a20] p-3 rounded-xl border border-zinc-200/80 dark:border-[#26262e] text-zinc-600 dark:text-zinc-300">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{stu.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{stu.phone || 'No phone'}</span>
                    </div>
                  </div>

                  {stu.preferredBusId && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Requested Preferred Bus: <strong className="text-zinc-800 dark:text-zinc-200">{stu.preferredBusId}</strong>
                    </p>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                      Authoritative Bus Assignment <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={currentSelectedBus}
                      onChange={(e) =>
                        setSelectedBuses({ ...selectedBuses, [stu.id]: e.target.value })
                      }
                      className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#1a1a20] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
                    >
                      <option value="">-- Choose Bus --</option>
                      {buses.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.busNumber} — {b.routeName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-zinc-100 dark:border-[#26262e]">
                  <button
                    type="button"
                    onClick={() => handleReject(stu.id)}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-1.5 h-10 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>REJECT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(stu.id)}
                    disabled={isProcessing || !currentSelectedBus}
                    className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>APPROVE</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
