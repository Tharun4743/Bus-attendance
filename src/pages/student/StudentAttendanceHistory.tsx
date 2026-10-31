import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { AttendanceRecord } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import {
  History,
  Calendar,
  CheckCircle,
  XCircle,
  Percent,
  Download,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { formatISTTime } from '../../utils/time';

export const StudentAttendanceHistory: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSessionType, setSelectedSessionType] = useState<'ALL' | 'MORNING' | 'EVENING'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'NOT_PRESENT'>('ALL');

  const fetchHistory = async () => {
    try {
      const data = await api.getStudentAttendanceHistory();
      setRecords(data || []);
    } catch (err: any) {
      console.error('Failed to load student attendance history:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      await fetchHistory();
      if (isMounted) setIsLoading(false);
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchHistory();
    setIsRefreshing(false);
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesDate = selectedDate ? r.attendanceDate === selectedDate : true;
      const matchesSession =
        selectedSessionType === 'ALL' ? true : r.sessionType === selectedSessionType;
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'PRESENT'
          ? r.status === 'PRESENT'
          : r.status !== 'PRESENT';
      return matchesDate && matchesSession && matchesStatus;
    });
  }, [records, selectedDate, selectedSessionType, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r) => r.status === 'PRESENT').length;
    const notPresent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, notPresent, percentage };
  }, [filteredRecords]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ['Date', 'Session Type', 'Status', 'Verification Method', 'Verified At (IST)', 'Distance (m)', 'Accuracy (m)'];
    const rows = filteredRecords.map((r) => [
      r.attendanceDate,
      r.sessionType,
      r.status,
      r.verificationMethod || 'N/A',
      r.verifiedAt ? formatISTTime(r.verifiedAt) : 'N/A',
      r.distanceMeters !== null && r.distanceMeters !== undefined ? r.distanceMeters : 'N/A',
      r.accuracyMeters !== null && r.accuracyMeters !== undefined ? r.accuracyMeters : 'N/A',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `my_attendance_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-sky-950/40 text-blue-600 dark:text-sky-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Personal Attendance History
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Audit log of your daily morning and evening bus check-ins
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {filteredRecords.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              Export My Log
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Logged"
          value={stats.total}
          icon={<Calendar className="w-5 h-5 text-white" />}
          subtitle="Archived session slots"
          color="blue"
        />
        <StatCard
          title="Attended"
          value={stats.present}
          icon={<CheckCircle className="w-5 h-5 text-white" />}
          subtitle="Present check-ins"
          color="emerald"
        />
        <StatCard
          title="Missed"
          value={stats.notPresent}
          icon={<XCircle className="w-5 h-5 text-white" />}
          subtitle="Unmarked / Absent"
          color="rose"
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats.percentage}%`}
          icon={<Percent className="w-5 h-5 text-white" />}
          subtitle="Personal turnout"
          color="indigo"
        />
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
              <Calendar className="w-4 h-4" />
              <span>Select Date:</span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-[#27272a] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 font-medium"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="text-xs text-blue-600 dark:text-sky-400 font-medium hover:underline"
              >
                Clear Date
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {(['ALL', 'MORNING', 'EVENING'] as const).map((shift) => (
              <button
                key={shift}
                onClick={() => setSelectedSessionType(shift)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedSessionType === shift
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                    : 'bg-zinc-100 dark:bg-[#141418] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                {shift === 'ALL' ? 'All Sessions' : shift}
              </button>
            ))}
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-[#27272a]">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">Status:</span>
          {(['ALL', 'PRESENT', 'NOT_PRESENT'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-blue-100 dark:bg-sky-950/60 text-blue-700 dark:text-sky-300 font-bold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              {st === 'ALL' ? 'All Records' : st === 'PRESENT' ? 'Present' : 'Absent'}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-sky-400" />
            <p className="text-xs font-medium text-zinc-500">Loading your attendance log...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[640px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-[#141418] border-b border-zinc-200 dark:border-[#27272a] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Session</th>
                  <th className="py-3 px-4">Attendance Status</th>
                  <th className="py-3 px-4">Verification Method</th>
                  <th className="py-3 px-4">Distance / Accuracy</th>
                  <th className="py-3 px-4">Timestamp (IST)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-[#27272a]">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                      No attendance records found matching the active criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const isPresent = r.status === 'PRESENT';
                    return (
                      <tr
                        key={r.id || `${r.attendanceDate}-${r.sessionType}`}
                        className="hover:bg-zinc-50 dark:hover:bg-[#1e1e24] transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                          {r.attendanceDate}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                            {r.sessionType}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={r.status as any} />
                        </td>
                        <td className="py-3 px-4">
                          {isPresent ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-sky-400">
                              <Compass className="w-3 h-3" />
                              {r.verificationMethod || 'GPS_GROUND'}
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-zinc-500">
                          {r.distanceMeters !== null && r.distanceMeters !== undefined ? (
                            <span>
                              {r.distanceMeters.toFixed(1)}m
                              {r.accuracyMeters ? ` (±${r.accuracyMeters.toFixed(0)}m)` : ''}
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-500">
                          {r.verifiedAt ? formatISTTime(r.verifiedAt) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
