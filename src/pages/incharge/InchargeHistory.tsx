import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { AttendanceRecord } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import {
  History,
  Calendar,
  Search,
  Download,
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
  Percent,
  Compass,
} from 'lucide-react';
import { formatISTTime } from '../../utils/time';

export const InchargeHistory: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSessionType, setSelectedSessionType] = useState<'ALL' | 'MORNING' | 'EVENING'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'NOT_PRESENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchHistory = async () => {
    try {
      const data = await api.getInchargeHistory({
        date: selectedDate || undefined,
        sessionType: selectedSessionType !== 'ALL' ? selectedSessionType : undefined,
      });
      setRecords(data || []);
    } catch (err: any) {
      console.error('Failed to load incharge history:', err);
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
  }, [selectedDate, selectedSessionType]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchHistory();
    setIsRefreshing(false);
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const name = (r as any).studentName || '';
      const reg = (r as any).registerNumber || '';
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reg.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'PRESENT'
          ? r.status === 'PRESENT'
          : r.status !== 'PRESENT';
      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r) => r.status === 'PRESENT').length;
    const notPresent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, notPresent, percentage };
  }, [filteredRecords]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ['Date', 'Session Type', 'Register Number', 'Student Name', 'Status', 'Method', 'Verified At (IST)', 'Distance (m)'];
    const rows = filteredRecords.map((r: any) => [
      r.attendanceDate,
      r.sessionType,
      r.registerNumber || r.studentId,
      `"${(r.studentName || '').replace(/"/g, '""')}"`,
      r.status,
      r.verificationMethod || 'N/A',
      r.verifiedAt ? formatISTTime(r.verifiedAt) : 'N/A',
      r.distanceMeters !== null && r.distanceMeters !== undefined ? r.distanceMeters : 'N/A',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `incharge_history_${selectedDate || 'all'}.csv`);
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
              Assigned Bus Attendance History
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Review verified sessions and student records scoped to your bus
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
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Logged"
          value={stats.total}
          icon={<Users className="w-5 h-5 text-white" />}
          subtitle="Filtered record entries"
          color="blue"
        />
        <StatCard
          title="Present Count"
          value={stats.present}
          icon={<CheckCircle className="w-5 h-5 text-white" />}
          subtitle="Verified check-ins"
          color="emerald"
        />
        <StatCard
          title="Absent Count"
          value={stats.notPresent}
          icon={<XCircle className="w-5 h-5 text-white" />}
          subtitle="Unverified commuters"
          color="rose"
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats.percentage}%`}
          icon={<Percent className="w-5 h-5 text-white" />}
          subtitle="Calculated turnout"
          color="indigo"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
              <Calendar className="w-4 h-4" />
              <span>Date:</span>
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

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block" />

            <div className="flex items-center gap-1">
              {(['ALL', 'MORNING', 'EVENING'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedSessionType(mode)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    selectedSessionType === mode
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-[#141418] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  {mode === 'ALL' ? 'All Sessions' : mode}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search student or register..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-[#141418] border border-zinc-200 dark:border-[#27272a] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-[#27272a]">
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

      {/* History Records Table */}
      <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/90 dark:border-[#27272a] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-sky-400" />
            <p className="text-xs font-medium text-zinc-500">Retrieving attendance archives...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-[#141418] border-b border-zinc-200 dark:border-[#27272a] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Session</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Register Number</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Verified At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-[#27272a]">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                      No attendance records found matching the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r: any) => (
                    <tr
                      key={r.id || `${r.studentId}-${r.attendanceDate}-${r.sessionType}`}
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
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        {r.studentName || r.studentId}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">
                        {r.registerNumber || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.status as any} />
                      </td>
                      <td className="py-3 px-4">
                        {r.status === 'PRESENT' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-sky-400">
                            <Compass className="w-3 h-3" />
                            {r.verificationMethod || 'GPS_GROUND'}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-500">
                        {r.verifiedAt ? formatISTTime(r.verifiedAt) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
