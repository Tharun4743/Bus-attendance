import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, Student, User } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const BusAssignments: React.FC = () => {
  const [data, setData] = useState<{
    buses: Array<Bus & { assignedCount: number; incharge: { id: string; name: string; email: string; phone?: string } | null }>;
    incharges: User[];
    unassignedStudentsCount: number;
    unassignedStudents: Student[];
    allStudents: Student[];
    totalStudents: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Student Assignment Modal
  const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [targetBusId, setTargetBusId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const res = await api.getAssignments();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load assignments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAssignStudent = (student: Student) => {
    setSelectedStudent(student);
    setTargetBusId(student.busId || data?.buses[0]?.id || '');
    setIsStudentModalOpen(true);
  };

  const handleSaveStudentAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !targetBusId) return;
    setIsSubmitting(true);
    try {
      await api.assignStudent(selectedStudent.id, targetBusId);
      setFeedback({ type: 'success', message: 'Student bus assignment updated successfully.' });
      setIsStudentModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Assignment failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = (data?.allStudents || []).filter((s) => {
    const q = searchQuery.toLowerCase();
    const bus = data?.buses.find((b) => b.id === s.busId);
    return (
      s.name.toLowerCase().includes(q) ||
      s.registerNumber.toLowerCase().includes(q) ||
      (bus && bus.busNumber.toLowerCase().includes(q))
    );
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-500">Loading Bus Assignments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="indigo">FLEET ALLOCATION</Badge>
            <span className="text-xs font-mono font-bold text-zinc-400">
              {data?.buses.length || 0} Fleet Routes
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Bus Assignments & Allocations
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Map students and transport coordinators to designated bus fleets with real-time capacity tracking.
          </p>
        </div>

        <Button onClick={fetchData} variant="secondary" size="sm">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-[#4ade80]'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-[#fb7185]'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#4ade80]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-[#fb7185]" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold uppercase opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Fleet Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data?.buses || []).map((bus) => (
          <div
            key={bus.id}
            className="p-4 bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-purple-600 dark:text-purple-400">
                  {bus.id}
                </span>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white leading-tight">
                  {bus.busNumber}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">{bus.routeName}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-[#c084fc] border border-purple-200 dark:border-purple-800">
                {bus.assignedCount} / {bus.capacity || 60} Seats
              </span>
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-[#26262e] text-xs space-y-1">
              <p className="text-zinc-400 text-[11px] font-bold uppercase">Assigned In-Charge</p>
              <p className="font-bold text-zinc-800 dark:text-zinc-200">
                {bus.incharge ? bus.incharge.name : '— No Incharge Assigned —'}
              </p>
              {bus.incharge && (
                <p className="text-zinc-500 text-[11px] font-mono">{bus.incharge.email}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Student Bus Assignment Directory */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-200 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
              Student Commuter Bus Allocations
            </h2>
            <p className="text-[10px] text-zinc-400">
              {data?.unassignedStudentsCount || 0} students pending route assignment
            </p>
          </div>

          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student or bus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#16161c] border border-zinc-200 dark:border-[#2a2a34] rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <EmptyState
            title="No Students Found"
            description="No student commuters match your search query."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                <tr>
                  <th className="px-5 py-3.5">Register No</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Current Assigned Bus</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                {filteredStudents.map((stu) => {
                  const bus = data?.buses.find((b) => b.id === stu.busId);
                  return (
                    <tr key={stu.id} className="hover:bg-zinc-50/60 dark:hover:bg-[#181820] transition">
                      <td className="px-5 py-3 font-mono font-bold text-blue-600 dark:text-sky-400">
                        {stu.registerNumber}
                      </td>
                      <td className="px-5 py-3 font-bold text-zinc-900 dark:text-white">
                        {stu.name}
                      </td>
                      <td className="px-5 py-3">
                        {bus ? (
                          <div>
                            <span className="font-bold text-purple-700 dark:text-[#c084fc]">
                              {bus.busNumber}
                            </span>
                            <span className="text-zinc-400 text-[11px] ml-1.5">• {bus.routeName}</span>
                          </div>
                        ) : (
                          <span className="text-rose-600 font-bold text-[11px] bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenAssignStudent(stu)}
                          className="px-3 py-1 text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 hover:bg-purple-50 hover:text-purple-700 dark:bg-zinc-800 dark:hover:bg-purple-950/40 rounded-xl transition border border-zinc-200 dark:border-zinc-700"
                        >
                          Change Bus
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Change Assignment Modal */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        title="Assign Student to Bus"
      >
        <form onSubmit={handleSaveStudentAssignment} className="space-y-4">
          <div className="p-3 bg-zinc-50 dark:bg-[#181820] rounded-xl text-xs space-y-1">
            <p className="font-bold text-zinc-900 dark:text-white">
              {selectedStudent?.name} ({selectedStudent?.registerNumber})
            </p>
            <p className="text-zinc-500">{selectedStudent?.email}</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
              Select Fleet Bus *
            </label>
            <select
              required
              value={targetBusId}
              onChange={(e) => setTargetBusId(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-white dark:bg-[#101014] text-zinc-900 dark:text-white outline-none font-bold"
            >
              <option value="">-- Choose Bus --</option>
              {(data?.buses || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.busNumber} — {b.routeName} ({b.assignedCount} assigned)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-[#26262e]">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsStudentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !targetBusId} variant="primary" size="sm">
              {isSubmitting ? 'Saving...' : 'Save Bus Assignment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
