import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, Student } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
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

      // Pre-select preferred bus if exists, or first available bus
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
    if (reason === null) return; // Cancelled

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
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading pending student approvals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#EAE2D2]">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200">
            STUDENT APPROVALS
          </span>
          <h1 className="text-xl font-black text-slate-900 mt-1">
            Pending Student Registrations
          </h1>
          <p className="text-[11px] text-amber-900/70 font-medium">
            Review student registration submissions, assign authoritative bus, and approve or reject.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F0] hover:bg-stone-200/50 text-slate-700 font-bold rounded-xl text-xs transition border border-[#EAE2D2] self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-start gap-2 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Warning if no buses exist */}
      {buses.length === 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-3">
          <BusIcon className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">No buses created yet!</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {pendingStudents.map((stu) => {
            const isProcessing = processingId === stu.id;
            const currentSelectedBus = selectedBuses[stu.id] || '';

            return (
              <div
                key={stu.id}
                className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#EAE2D2] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {stu.name}
                      </h3>
                      <p className="text-xs font-mono font-bold text-brand-700">
                        Reg No: {stu.registerNumber}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-extrabold border border-amber-200">
                      <Clock className="w-3 h-3" />
                      PENDING
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#FAF7F0] p-2.5 rounded-xl border border-[#EAE2D2] text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{stu.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{stu.phone}</span>
                    </div>
                  </div>

                  {stu.preferredBusId && (
                    <p className="text-[11px] text-slate-500">
                      Requested Preferred Bus: <strong className="text-slate-700">{stu.preferredBusId}</strong>
                    </p>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Authoritative Bus Assignment <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={currentSelectedBus}
                      onChange={(e) =>
                        setSelectedBuses({ ...selectedBuses, [stu.id]: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0]/50 font-bold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
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
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EAE2D2]">
                  <button
                    type="button"
                    onClick={() => handleReject(stu.id)}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>REJECT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(stu.id)}
                    disabled={isProcessing || !currentSelectedBus}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
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
