import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Bus, Student } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Attendance History
          </h1>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Audit trail of verified bus attendance records.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={history.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition shadow-sm self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export History CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-[#EAE2D2] shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Date Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Date
          </label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] font-medium text-slate-700 outline-none"
          />
        </div>

        {/* Bus Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Bus
          </label>
          <select
            value={filterBus}
            onChange={(e) => setFilterBus(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] font-medium text-slate-700 outline-none"
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
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Student
          </label>
          <select
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] font-medium text-slate-700 outline-none"
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
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#EAE2D2] bg-[#FAF7F0] font-medium text-slate-700 outline-none"
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
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE2D2] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-7 h-7 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Loading attendance history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={History}
              title="No attendance records found"
              description="There are no attendance records matching the selected date or filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#FAF7F0]/60 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-[#EAE2D2]">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Register No</th>
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">Bus</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Verified Time</th>
                  <th className="px-4 py-2.5">Distance</th>
                  <th className="px-4 py-2.5">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE2D2]/40">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-[#FAF7F0]/70 transition">
                    <td className="px-4 py-2.5 font-bold font-mono text-slate-800">
                      {record.attendanceDate}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{record.registerNumber}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      {record.studentName}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{record.busNumber}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge status={record.status} size="sm" />
                        {record.verificationMethod === 'ADMIN_OVERRIDE' && (
                          <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-bold border border-purple-200">
                            Admin Override
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono">
                      {record.verifiedAt
                        ? new Date(record.verifiedAt).toLocaleTimeString('en-US', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600">
                      {record.distanceMeters != null ? `${record.distanceMeters}m` : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600">
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
