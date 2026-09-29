import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, Student } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { History, Download } from 'lucide-react';

export const AttendanceHistory: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterBus, setFilterBus] = useState<string>('ALL');
  const [filterStudent, setFilterStudent] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fetchHistory = async () => {
    try {
      const [histRes, busRes, stuRes] = await Promise.all([
        api.getAttendanceHistory({
          date: filterDate,
          busId: filterBus,
          studentId: filterStudent,
          status: filterStatus,
        }),
        api.getBuses(),
        api.getStudents(),
      ]);
      setHistory(histRes);
      setBuses(busRes);
      setStudents(stuRes);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filterDate, filterBus, filterStudent, filterStatus]);

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = [
      'Attendance Date',
      'Register Number',
      'Student Name',
      'Bus Number',
      'Status',
      'Verified Time',
      'Distance (m)',
      'GPS Accuracy (m)',
      'Method',
      'Override Reason',
    ];

    const rows = history.map((r) => [
      `"${r.attendanceDate}"`,
      `"${r.registerNumber}"`,
      `"${r.studentName}"`,
      `"${r.busNumber}"`,
      `"${r.status}"`,
      `"${r.verifiedAt ? new Date(r.verifiedAt).toLocaleTimeString() : ''}"`,
      `"${r.distanceMeters ?? ''}"`,
      `"${r.accuracyMeters ?? ''}"`,
      `"${r.verificationMethod || 'GPS_GEOFENCE'}"`,
      `"${r.overrideReason || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bus_attendance_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] rounded-2xl p-5 sm:p-6 shadow-xs border border-zinc-200/90 dark:border-[#26262e] transition-all">
        <div>
          <Badge variant="blue" className="mb-2">
            AUDIT TRAIL
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Attendance History
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Audit trail of verified bus attendance records.
          </p>
        </div>

        <Button
          onClick={handleExportCSV}
          disabled={history.length === 0}
          variant="primary"
          size="md"
          className="self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export History CSV</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#141418] p-4 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-[#26262e] shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 transition-all">
        {/* Date Filter */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            Date
          </label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full h-10 px-3 text-xs rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
          />
        </div>

        {/* Bus Filter */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            Bus
          </label>
          <select
            value={filterBus}
            onChange={(e) => setFilterBus(e.target.value)}
            className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
          >
            <option value="ALL">All Buses</option>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.busNumber}
              </option>
            ))}
          </select>
        </div>

        {/* Student Filter */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            Student
          </label>
          <select
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
            className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
          >
            <option value="ALL">All Students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.registerNumber} - {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
            Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-zinc-200 dark:border-[#2e2e38] bg-zinc-50 dark:bg-[#101014] text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-[#141418] outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present Only</option>
            <option value="NOT_PRESENT">Not Present</option>
            <option value="LOCATION_UNAVAILABLE">Location Unavailable</option>
            <option value="INVALID_LOCATION">Invalid Location</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-[#141418] rounded-2xl shadow-xs border border-zinc-200/90 dark:border-[#26262e] overflow-hidden transition-all">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-2">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Loading attendance history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-6 sm:p-8">
            <EmptyState
              icon={History}
              title="No attendance records found"
              description="There are no attendance records matching the selected date or filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 dark:bg-[#101014] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#26262e]">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Register No</th>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Bus</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Verified Time</th>
                  <th className="px-5 py-3.5">Distance</th>
                  <th className="px-5 py-3.5">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#26262e]">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-50/70 dark:hover:bg-[#1a1a20]/60 transition">
                    <td className="px-5 py-4 font-bold font-mono text-zinc-900 dark:text-white">
                      {record.attendanceDate}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-blue-600 dark:text-sky-400">{record.registerNumber}</td>
                    <td className="px-5 py-4 font-bold text-zinc-900 dark:text-white">
                      {record.studentName}
                    </td>
                    <td className="px-5 py-4 font-mono text-zinc-700 dark:text-zinc-300">{record.busNumber}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge status={record.status} size="sm" />
                        {record.verificationMethod === 'ADMIN_OVERRIDE' && (
                          <span className="text-[10px] text-purple-700 dark:text-[#c084fc] bg-purple-50 dark:bg-purple-500/15 px-2 py-0.5 rounded-full font-bold border border-purple-200 dark:border-purple-500/30">
                            Admin Override
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-500 dark:text-zinc-400 font-mono">
                      {record.verifiedAt
                        ? new Date(record.verifiedAt).toLocaleTimeString('en-US', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-5 py-4 font-mono text-zinc-600 dark:text-zinc-300">
                      {record.distanceMeters != null ? `${record.distanceMeters}m` : '—'}
                    </td>
                    <td className="px-5 py-4 font-mono text-zinc-600 dark:text-zinc-300">
                      {record.accuracyMeters != null ? `${record.accuracyMeters}m` : '—'}
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
