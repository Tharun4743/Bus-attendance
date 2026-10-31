import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Student } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Search,
  RefreshCw,
  Mail,
  Phone,
  CheckCircle2,
} from 'lucide-react';

export const InchargeStudents: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchStudents = async () => {
    try {
      const res = await api.getInchargeStudents();
      setStudents(res || []);
    } catch (err: any) {
      console.error('Failed to load incharge students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filtered = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.registerNumber.toLowerCase().includes(q);
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-500">Loading Student Directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="blue">ASSIGNED COMMUTERS</Badge>
            <span className="text-xs font-mono font-bold text-zinc-400">
              {students.length} Total Enrolled
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Assigned Bus Commuters
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Student commuters registered and approved to travel on your designated fleet bus.
          </p>
        </div>

        <Button onClick={fetchStudents} variant="secondary" size="sm">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Directory Table */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl border border-zinc-200/90 dark:border-[#26262e] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-200 dark:border-[#26262e] bg-zinc-50/70 dark:bg-[#101014] flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name or register number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#16161c] border border-zinc-200 dark:border-[#2a2a34] rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No Students Found"
            description="No assigned commuters match your current search query."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                <tr>
                  <th className="px-5 py-3.5">Register No</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Face ID Enrollment</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                {filtered.map((stu) => (
                  <tr key={stu.id} className="hover:bg-zinc-50/60 dark:hover:bg-[#181820] transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-600 dark:text-sky-400">
                      {stu.registerNumber}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-zinc-900 dark:text-white">
                      {stu.name}
                    </td>
                    <td className="px-5 py-3.5 space-y-0.5 text-zinc-500">
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-zinc-400" />
                        <span>{stu.email}</span>
                      </p>
                      {stu.phone && (
                        <p className="flex items-center gap-1.5 text-[11px]">
                          <Phone className="w-3 h-3 text-zinc-400" />
                          <span>{stu.phone}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {stu.photoUrl ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-[11px]">Not Enrolled</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-[#4ade80]">
                        Approved
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
