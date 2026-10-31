import { StudentApprovalsSkeleton } from '../../components/skeleton/AdminSkeletons';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, Student, User } from '../../types';
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
  GraduationCap,
  Compass,
  Calendar,
} from 'lucide-react';

export const StudentApprovals: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'INCHARGES' | 'STUDENTS'>('INCHARGES');
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [pendingIncharges, setPendingIncharges] = useState<User[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBuses, setSelectedBuses] = useState<Record<string, string>>({});
  const [inchargeBusNumbers, setInchargeBusNumbers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    try {
      const [pendingStuList, inchargeRes, busList] = await Promise.all([
        api.getPendingApprovals(),
        api.getPendingIncharges(),
        api.getBuses(),
      ]);

      const stuList = pendingStuList || [];
      const incList = inchargeRes?.incharges || [];
      const allBuses = busList || [];

      setPendingStudents(stuList);
      setPendingIncharges(incList);
      setBuses(allBuses);

      // Initialize student bus selector defaults
      const busMap: Record<string, string> = {};
      stuList.forEach((stu) => {
        if (stu.preferredBusId && allBuses.some((b) => b.id === stu.preferredBusId)) {
          busMap[stu.id] = stu.preferredBusId;
        } else if (allBuses.length > 0) {
          busMap[stu.id] = allBuses[0].id;
        }
      });
      setSelectedBuses(busMap);

      // Initialize in-charge bus inputs
      const incMap: Record<string, string> = {};
      incList.forEach((inc) => {
        incMap[inc.id] = inc.busNumber || inc.assignedBusId || '';
      });
      setInchargeBusNumbers(incMap);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Approve Bus In-Charge
  const handleApproveIncharge = async (userId: string) => {
    const busNo = inchargeBusNumbers[userId]?.trim();
    if (!busNo) {
      setFeedback({
        type: 'error',
        message: 'A valid Bus Number is required to approve the Bus In-Charge.',
      });
      return;
    }

    setProcessingId(userId);
    setFeedback(null);

    try {
      const res = await api.approveIncharge(userId, busNo);
      setFeedback({
        type: 'success',
        message: `Bus In-Charge ${res.user.name} approved successfully for Bus ${busNo.toUpperCase()}.`,
      });
      await fetchData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to approve Bus In-Charge.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Reject Bus In-Charge
  const handleRejectIncharge = async (userId: string) => {
    if (!window.confirm('Are you sure you want to reject this Bus In-Charge registration?')) {
      return;
    }

    setProcessingId(userId);
    setFeedback(null);

    try {
      await api.rejectIncharge(userId);
      setFeedback({
        type: 'success',
        message: 'Bus In-Charge registration rejected successfully.',
      });
      await fetchData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to reject Bus In-Charge.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Approve Student
  const handleApproveStudent = async (studentId: string) => {
    const busId = selectedBuses[studentId];
    if (!busId) {
      setFeedback({
        type: 'error',
        message: 'Please assign an operational bus to the student before approval.',
      });
      return;
    }

    setProcessingId(studentId);
    setFeedback(null);

    try {
      const res = await api.approveStudent(studentId, busId);
      setFeedback({
        type: 'success',
        message: `Student ${res.student.name} approved and assigned to Bus ${busId}.`,
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

  // Reject Student
  const handleRejectStudent = async (studentId: string) => {
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

  if (isLoading && pendingStudents.length === 0 && pendingIncharges.length === 0) {
    return <StudentApprovalsSkeleton />;
  }

  return (
    <div className="space-y-4 w-full mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <Badge variant="amber" className="mb-2">
            ADMINISTRATIVE REVIEW CENTER
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Role Registration Approvals
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Review pending Bus In-Charge and Student Commuter registrations verified via Brevo 6-digit OTP.
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

      {/* Tabs Switcher: In-Charges vs Students */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-[#26262e] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('INCHARGES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'INCHARGES'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-[#1a1a20]'
          }`}
        >
          <BusIcon className="w-3.5 h-3.5" />
          <span>Pending Bus In-Charges</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'INCHARGES'
                ? 'bg-amber-500 text-white'
                : 'bg-zinc-200 dark:bg-[#2e2e38] text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {pendingIncharges.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('STUDENTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'STUDENTS'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-[#1a1a20]'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Pending Students</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'STUDENTS'
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-200 dark:bg-[#2e2e38] text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {pendingStudents.length}
          </span>
        </button>
      </div>

      {/* TAB 1: BUS IN-CHARGES */}
      {activeTab === 'INCHARGES' && (
        <>
          {pendingIncharges.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No Pending Bus In-Charges"
              description="All Bus In-Charge registrations have been reviewed. When new in-charges sign up with their bus number, they will appear here for administrative approval."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingIncharges.map((inc) => {
                const isProcessing = processingId === inc.id;
                const currentBusNumber = inchargeBusNumbers[inc.id] || inc.busNumber || inc.assignedBusId || '';

                return (
                  <div
                    key={inc.id}
                    className="bg-white dark:bg-[#141418] rounded-2xl p-5 shadow-xs border border-zinc-200/90 dark:border-[#26262e] space-y-3.5 flex flex-col justify-between transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white">
                            {inc.name}
                          </h3>
                          <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            Requested Bus: {inc.busNumber || inc.assignedBusId || 'Unassigned'}
                          </p>
                        </div>
                        <Badge variant="amber">
                          <Clock className="w-3 h-3" />
                          PENDING APPROVAL
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-zinc-50 dark:bg-[#1a1a20] p-3 rounded-xl border border-zinc-200/80 dark:border-[#26262e] text-zinc-600 dark:text-zinc-300">
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{inc.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{inc.phone || 'No phone'}</span>
                        </div>
                      </div>

                      {inc.routeName && (
                        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                          <Compass className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Route Name: <strong className="text-zinc-800 dark:text-zinc-200">{inc.routeName}</strong></span>
                        </div>
                      )}

                      {inc.createdAt && (
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Registered: {new Date(inc.createdAt).toLocaleString()}</span>
                        </div>
                      )}

                      {/* Confirm/Edit Bus Number before approval */}
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                          Assigned Bus Number <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={currentBusNumber}
                            onChange={(e) =>
                              setInchargeBusNumbers({
                                ...inchargeBusNumbers,
                                [inc.id]: e.target.value.toUpperCase(),
                              })
                            }
                            className="w-full h-10 px-3 text-xs font-bold font-mono uppercase rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#1a1a20] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
                          >
                            <option value="">-- Select Assigned Fleet Bus ({buses.length} Fleet Options) --</option>
                            {buses.map((b) => (
                              <option key={b.id} value={b.busNumber}>
                                {b.busNumber} — {b.routeName}
                              </option>
                            ))}
                            {currentBusNumber && !buses.some((b) => b.busNumber.toUpperCase() === currentBusNumber.toUpperCase()) && (
                              <option value={currentBusNumber}>
                                {currentBusNumber} (Custom / New Route)
                              </option>
                            )}
                          </select>
                        </div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                          Dynamically assigns this In-Charge to an operational fleet bus in PostgreSQL.
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-zinc-100 dark:border-[#26262e]">
                      <button
                        type="button"
                        onClick={() => handleRejectIncharge(inc.id)}
                        disabled={isProcessing}
                        className="flex items-center justify-center gap-1.5 h-10 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>REJECT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApproveIncharge(inc.id)}
                        disabled={isProcessing || !currentBusNumber}
                        className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>APPROVE IN-CHARGE</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: STUDENTS */}
      {activeTab === 'STUDENTS' && (
        <>
          {/* Warning if no buses exist */}
          {buses.length === 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-[#fde047] text-xs font-medium flex items-center gap-3">
              <BusIcon className="w-5 h-5 text-amber-600 dark:text-[#fde047] shrink-0" />
              <div>
                <p className="font-bold">No operational buses found!</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Approve a Bus In-Charge or create buses in Fleet Management before approving students.
                </p>
              </div>
            </div>
          )}

          {pendingStudents.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No Pending Students"
              description="All student registrations have been reviewed. When new students sign up for an in-charge bus, they will appear here."
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
                          Requested In-Charge Bus: <strong className="text-zinc-800 dark:text-zinc-200">{stu.preferredBusId}</strong>
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
                          <option value="">-- Choose Bus ({buses.length} Fleet Buses) --</option>
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
                        onClick={() => handleRejectStudent(stu.id)}
                        disabled={isProcessing}
                        className="flex items-center justify-center gap-1.5 h-10 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>REJECT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApproveStudent(stu.id)}
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
        </>
      )}
    </div>
  );
};
